import { fullCrop, resizeGeometry, cropFromSelection, selectionFromCrop } from './geometry.js';

export class CropEditor {
  constructor({ source, video, geometry, preview }) {
    this.source = source;
    this.video = video;
    this.draft = { ...geometry, crop: { ...geometry.crop } };
    this.preview = preview;
    this.controller = new AbortController();
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'crop-dialog';
    this.dialog.setAttribute('aria-labelledby', 'crop-title');
    this.dialog.innerHTML = `
      <h2 id="crop-title">Crop &amp; resize</h2>
      <p id="crop-instructions">Drag the edges or corners to crop; drag inside to move.</p>
      <p class="crop-status" role="status">Opening preview…</p>
      <div class="crop-viewport" hidden></div>
      <form>
        <fieldset disabled>
          <legend>Output dimensions</legend>
          <div class="crop-dimensions">
            <label>Width (pixels)<br><input name="width" type="number" min="1" step="1" inputmode="numeric" required></label>
            <label>Height (pixels)<br><input name="height" type="number" min="1" step="1" inputmode="numeric" required></label>
          </div>
          <p class="crop-output" aria-live="polite" hidden></p>
        </fieldset>
        <div class="crop-actions">
          <button type="button" class="crop-reset" disabled>Reset</button>
          <button type="button" class="crop-cancel" autofocus>Cancel</button>
          <button type="submit" class="crop-apply" disabled>Apply</button>
        </div>
      </form>`;
    const find = selector => this.dialog.querySelector(selector);
    this.viewport = find('.crop-viewport');
    this.status = find('.crop-status');
    this.output = find('.crop-output');
    this.form = find('form');
    this.fields = find('fieldset');
    this.widthInput = this.form.elements.width;
    this.heightInput = this.form.elements.height;
    this.applyButton = find('.crop-apply');
    this.resetButton = find('.crop-reset');
    find('.crop-cancel').addEventListener('click', () => this.close());
    this.dialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.close();
    });
    this.dialog.addEventListener('close', () => this.close());
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      if (this.ready && this.form.reportValidity()) this.close(this.draft);
    });
    this.resetButton.addEventListener('click', () => {
      this.draft = resizeGeometry(this.source, fullCrop(this.source), 1, this.video);
      this.placeSelection();
      this.renderDimensions();
    });
    for (const axis of ['width', 'height']) {
      this.form.elements[axis].addEventListener('input', () => this.resize(axis));
      this.form.elements[axis].addEventListener('change', () => {
        if (this.form.checkValidity()) this.renderDimensions();
      });
    }
  }

  open() {
    this.previousFocus = document.activeElement;
    const promise = new Promise(resolve => { this.resolve = resolve; });
    document.body.append(this.dialog);
    this.dialog.showModal();
    this.load().catch(error => {
      if (!this.closed) this.status.textContent = error.message || 'The crop editor could not be opened.';
    });
    return promise;
  }

  async load() {
    await import('./vendor/cropper/cropper.min.js');
    if (this.closed) return;
    const preview = await this.preview(this.controller.signal);
    if (this.closed) return;
    const url = typeof preview === 'string' ? preview : (this.previewURL = URL.createObjectURL(preview));
    this.viewport.innerHTML = `
      <cropper-canvas background>
        <cropper-image alt="Source to crop"></cropper-image>
        <cropper-shade></cropper-shade>
        <cropper-selection movable resizable precise outlined
          aria-label="Crop rectangle" aria-describedby="crop-instructions">
          <cropper-handle action="move" plain></cropper-handle>
          <cropper-handle action="n-resize"></cropper-handle>
          <cropper-handle action="e-resize"></cropper-handle>
          <cropper-handle action="s-resize"></cropper-handle>
          <cropper-handle action="w-resize"></cropper-handle>
          <cropper-handle action="ne-resize"></cropper-handle>
          <cropper-handle action="nw-resize"></cropper-handle>
          <cropper-handle action="se-resize"></cropper-handle>
          <cropper-handle action="sw-resize"></cropper-handle>
        </cropper-selection>
      </cropper-canvas>`;
    this.canvas = this.viewport.querySelector('cropper-canvas');
    this.image = this.viewport.querySelector('cropper-image');
    this.selection = this.viewport.querySelector('cropper-selection');
    this.image.src = url;
    this.nativeImage = await this.image.$ready();
    if (this.closed) return;
    this.viewport.hidden = false;
    this.selection.addEventListener('change', event => this.cropChanged(event));
    this.ready = true;
    this.fields.disabled = this.resetButton.disabled = false;
    this.layout();
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(this.viewport);
    this.onWindowResize = () => this.layout();
    window.addEventListener('resize', this.onWindowResize);
    this.renderDimensions();
    this.status.textContent = '';
  }

  layout() {
    if (!this.ready || this.closed) return;
    const scale = Math.min(this.viewport.clientWidth / this.source.width,
      Math.min(500, window.innerHeight * 0.5) / this.source.height);
    if (!(scale > 0)) return;
    this.bounds = { width: this.source.width * scale, height: this.source.height * scale };
    this.canvas.style.width = `${this.bounds.width}px`;
    this.canvas.style.height = `${this.bounds.height}px`;
    // base image cannot be transformed by user
    this.image.style.transformOrigin = '0 0';
    this.image.style.left = this.image.style.top = '0';
    this.image.scalable = true;
    this.image.$setTransform(this.bounds.width / this.nativeImage.naturalWidth, 0, 0,
      this.bounds.height / this.nativeImage.naturalHeight, 0, 0);
    this.image.scalable = false;
    this.placeSelection();
  }

  placeSelection() {
    if (!this.bounds) return;
    const { x, y, width, height } = selectionFromCrop(this.source, this.draft.crop, this.bounds);
    this.placing = true;
    try {
      this.selection.$change(x, y, width, height);
    } finally {
      this.placing = false;
    }
  }

  cropChanged(event) {
    if (this.placing || !this.ready || event.target !== this.selection) return;
    const { x, y, width, height } = event.detail;
    const minimum = this.video ? 2 : 1;
    if (x < -0.01 || y < -0.01 || x + width > this.bounds.width + 0.01
      || y + height > this.bounds.height + 0.01
      || width < minimum / this.source.width * this.bounds.width
      || height < minimum / this.source.height * this.bounds.height) {
      event.preventDefault();
      return;
    }
    const crop = cropFromSelection(this.source, event.detail, this.bounds, this.video);
    this.draft = resizeGeometry(this.source, crop, this.draft.scale, this.video);
    this.renderDimensions();
  }

  resize(axis) {
    const input = this.form.elements[axis];
    if (!input.validity.valid) {
      this.applyButton.disabled = true;
      this.renderOutput('Invalid dimensions, they must be positive integer values.');
      return;
    }
    this.draft = resizeGeometry(this.source, this.draft.crop,
      input.valueAsNumber / this.draft.crop[axis], this.video);
    const other = axis === 'width' ? 'height' : 'width';
    this.form.elements[other].value = String(this.draft[other]);
    this.applyButton.disabled = !this.form.checkValidity();
    this.renderOutput();
  }

  renderDimensions() {
    const { crop, width, height } = this.draft;
    const minimum = this.video ? 2 : 1;
    this.widthInput.min = this.heightInput.min = String(minimum);
    this.widthInput.max = String(crop.width);
    this.heightInput.max = String(crop.height);
    this.widthInput.value = String(width);
    this.heightInput.value = String(height);
    this.applyButton.disabled = false;
    this.renderOutput();
  }

  renderOutput(error = '') {
    this.output.hidden = !error;
    this.output.textContent = error;
  }

  close(value = null) {
    if (this.closed) return;
    this.closed = true;
    this.controller.abort();
    this.observer?.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    this.dialog.close();
    this.dialog.remove();
    if (this.previewURL) URL.revokeObjectURL(this.previewURL);
    this.previousFocus?.focus({ preventScroll: true });
    this.resolve?.(value);
  }
}
