export class ImageProcessor {
  constructor() {
    this.worker = new Worker(new URL('./image-worker.js', import.meta.url), { type: 'module' });
    this.pendingRequests = new Map();
    this.nextRequestId = 0;
    this.worker.onmessage = ({ data }) => {
      const request = this.pendingRequests.get(data.id);
      if (!request) {
        return;
      }

      this.pendingRequests.delete(data.id);
      if (data.error) {
        request.reject(new Error(data.error));
      } else {
        request.resolve(data);
      }
    };
    this.worker.onerror = () => this.dispose(new Error('The image could not be processed on this device.'));
  }

  request(action, values) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('The image processor was closed.'));
        return;
      }
      const id = ++this.nextRequestId;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, action, ...values });
    });
  }

  load(file) {
    return this.request('load', { file });
  }

  encode(settings) {
    return this.request('encode', settings);
  }

  dispose(error = new DOMException('Cancelled', 'AbortError')) {
    this.worker?.terminate();
    this.worker = null;
    for (const request of this.pendingRequests.values()) {
      request.reject(error);
    }
    this.pendingRequests.clear();
  }
}
