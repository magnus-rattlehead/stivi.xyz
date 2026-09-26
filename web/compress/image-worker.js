import encode from './vendor/avif/encode.js';

let bitmap;

self.onmessage = async ({ data }) => {
  const { id, action } = data;
  try {
    if (action === 'load') {
      bitmap?.close();
      try {
        bitmap = await createImageBitmap(data.file, { imageOrientation: 'from-image' });
      } catch {
        const header = new Uint8Array(await data.file.slice(0, 64).arrayBuffer());
        const brands = new TextDecoder().decode(header);
        const heic = /hei[cfx]|hev[cx]|mif1|msf1/.test(brands)
          || /\.(heic|heif)$/i.test(data.file.name);
        if (!heic) throw new Error('This image could not be opened.');
        const { heicTo } = await import('./vendor/heic-to/heic-to.js');
        bitmap = await heicTo({ blob: data.file, type: 'bitmap' });
      }
      // small original preview avoids keeping a second full-size decoded image in the UI.
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
      canvas.getContext('2d', { colorSpace: 'srgb' }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const preview = await canvas.convertToBlob({ type: 'image/png' });
      canvas.width = canvas.height = 1;
      self.postMessage({ id, width: bitmap.width, height: bitmap.height, preview });
    } else if (action === 'encode') {
      if (!bitmap) throw new Error('Choose an image first.');
      const scale = data.maxDimension ? Math.min(1, data.maxDimension / Math.max(bitmap.width, bitmap.height)) : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      try {
        const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, width, height);
        const bytes = await encode(context.getImageData(0, 0, width, height), {
          quality: data.quality, speed: 6, bitDepth: 8,
        });
        self.postMessage({ id, bytes, width, height }, [bytes]);
      } finally {
        canvas.width = canvas.height = 1;
      }
    }
  } catch (error) {
    self.postMessage({ id, error: error.message || 'The image could not be processed.' });
  }
};
