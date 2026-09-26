import { ImageProcessor } from './image.js';

const IMAGE_UPDATE_DELAY_MS = 500;
const CODEC_SELECTION_DELAY_MS = 250;
const VIDEO_PAYLOAD_FRACTION = 0.95; // Allow approximately 5% for container overhead.

const ids = [
  'file', 'target', 'unit', 'source-info', 'image-controls', 'video-controls',
  'quality', 'quality-value', 'image-edge', 'video-edge', 'compatibility', 'codec', 'bitrate',
  'fps', 'audio', 'audio-bitrate', 'size', 'distance', 'sample', 'compress', 'cancel',
  'progress', 'status', 'download', 'share', 'original-section', 'original-image',
  'original-video', 'sample-help', 'output-section', 'output-heading', 'output-info',
  'output-image', 'output-video',
];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const codecNames = { av1: 'AV1', hevc: 'HEVC', avc: 'H.264' };

let file;
let mediaType;
let metadata;
let imageProcessor;
let videoProcessor;
let result;
let originalURL;
let outputURL;
let activeJob;

// Async results must belong to both the selected file and its current settings.
let fileVersion = 0;
let settingsVersion = 0;
let codecRequestId = 0;
let ready = false;
let pendingImage = false;
let imageTimer;
let codecTimer;
let imageReadyAt = 0;

function formatBytes(bytes) {
  const exact = `${Math.round(bytes).toLocaleString()} bytes`;
  if (bytes < 1000) {
    return exact;
  }

  const unit = bytes >= 1000000 ? 'MB' : 'KB';
  const divisor = unit === 'MB' ? 1000000 : 1000;
  const amount = (bytes / divisor).toLocaleString(undefined, { maximumFractionDigits: 3 });
  return `${amount} ${unit} (${exact})`;
}

function readTargetBytes() {
  const bytes = Math.floor(ui.target.valueAsNumber * Number(ui.unit.value));
  if (!ui.target.validity.valid || !Number.isSafeInteger(bytes) || bytes <= 0) {
    return null;
  }
  return bytes;
}

function readSettings() {
  const dimensionInput = mediaType === 'image' ? ui['image-edge'] : ui['video-edge'];
  if (!dimensionInput.validity.valid) {
    return null;
  }

  const maxDimension = dimensionInput.value === '' ? null : dimensionInput.valueAsNumber;
  if (mediaType === 'image') {
    return { maxDimension, quality: Number(ui.quality.value) };
  }

  const bitrate = ui.bitrate.valueAsNumber * 1000;
  if (!ui.bitrate.validity.valid || !Number.isFinite(bitrate) || bitrate <= 0) {
    return null;
  }

  return {
    maxDimension,
    bitrate: Math.round(bitrate),
    fps: Number(ui.fps.value),
    audio: ui.audio.checked && !!metadata?.hasAudio,
    audioBitrate: Number(ui['audio-bitrate'].value),
    compatibility: ui.compatibility.checked,
  };
}

function estimateVideoBytes() {
  const values = readSettings();
  if (mediaType !== 'video' || !metadata || !values) {
    return null;
  }

  const audioBitrate = values.audio ? values.audioBitrate : 0;
  const payloadBytes = metadata.duration * (values.bitrate + audioBitrate) / 8;
  return Math.ceil(payloadBytes / VIDEO_PAYLOAD_FRACTION);
}

function hasCurrentOutput() {
  return Boolean(result && result.settingsVersion === settingsVersion && !result.sample);
}

function canSaveOutput() {
  const target = readTargetBytes();
  return hasCurrentOutput() && target !== null && result.blob.size <= target && !activeJob;
}

function isCurrentJob(job) {
  return job.fileVersion === fileVersion && job.settingsVersion === settingsVersion;
}

function createOutputFile() {
  const basename = file.name.replace(/\.[^.]+$/, '') || 'media';
  const extension = mediaType === 'image' ? 'avif' : 'mp4';
  return new File([result.blob], `${basename}-compressed.${extension}`, {
    type: result.blob.type,
  });
}

function render() {
  renderSize();
  renderControls();
  renderOutputDetails();
}

function renderSize() {
  const target = readTargetBytes();
  const actual = hasCurrentOutput();
  const size = actual ? result.blob.size : estimateVideoBytes();
  const hasSize = size !== null && size !== undefined;
  const parts = [file ? `Original: ${formatBytes(file.size)}.` : 'Choose a file.'];

  if (hasSize) {
    const label = actual ? 'Actual output' : 'Estimated full video';
    parts.push(`${label}: ${formatBytes(size)}.`);
  } else if (mediaType === 'image' && (pendingImage || activeJob)) {
    parts.push('Updating size…');
  } else if (ready && mediaType === 'image') {
    parts.push('Adjust settings or update the image to measure its size.');
  }

  if (mediaType === 'image' && result && !actual) {
    parts.push(`Previous output (outdated): ${formatBytes(result.blob.size)}.`);
  }

  parts.push(target ? `Target: ${formatBytes(target)}.` : 'Enter a positive target size.');
  ui.size.textContent = parts.join(' ');
  ui.distance.textContent = '';

  if (!target || !hasSize) {
    return;
  }

  const difference = size - target;
  const percentage = (size / target * 100).toLocaleString(undefined, { maximumFractionDigits: 1 });
  let comparison = 'exactly at target.';
  if (difference !== 0) {
    const direction = difference > 0 ? 'over' : 'under';
    comparison = `${Math.abs(difference).toLocaleString()} bytes ${direction} target.`;
  }

  const label = actual ? 'Actual' : 'Estimated';
  ui.distance.textContent = `${label}: ${percentage}% of target — ${comparison}`;
  if (!actual) {
    ui.distance.textContent += ' The final size may differ.';
  }
}

function renderControls() {
  const valid = ready && readSettings() !== null && readTargetBytes() !== null;
  ui.compress.textContent = mediaType === 'image' ? 'Update image' : 'Compress full video';
  ui.compress.disabled = !valid || !!activeJob;
  ui.sample.disabled = !valid || !!activeJob;
  ui.cancel.disabled = !activeJob && !pendingImage;
  ui['audio-bitrate'].disabled = !metadata?.hasAudio || !ui.audio.checked;
  const canSave = canSaveOutput();
  ui['image-controls'].disabled = !ready;
  ui['video-controls'].disabled = !ready;
  ui.download.disabled = !canSave;

  let canShare = false;
  if (canSave && navigator.canShare && navigator.share) {
    try {
      canShare = navigator.canShare({ files: [createOutputFile()] });
    } catch {
      // Download remains available when native file sharing is unsupported.
    }
  }
  ui.share.hidden = !canShare;
  ui.share.disabled = !canShare;
}

function renderOutputDetails() {
  if (!result) {
    return;
  }

  const stale = result.settingsVersion !== settingsVersion;
  const heading = result.sample ? 'Sample preview' : 'Output';
  ui['output-heading'].textContent = heading + (stale ? ' (outdated)' : '');

  const details = [
    `${result.width} × ${result.height}`,
    formatBytes(result.blob.size),
    result.codec ? codecNames[result.codec] : 'AVIF',
  ];
  if (result.sample) {
    details.push(`${result.duration.toFixed(1)}-second sample only; not the full file size.`);
  }
  ui['output-info'].textContent = details.join(' · ');
}

function releasePreview(image, video) {
  image.removeAttribute('src');
  video.pause();
  video.removeAttribute('src');
  video.load();
  image.hidden = true;
  video.hidden = true;
}

function setOriginal(blob) {
  releasePreview(ui['original-image'], ui['original-video']);
  if (originalURL) URL.revokeObjectURL(originalURL);
  originalURL = URL.createObjectURL(blob);
  const element = mediaType === 'image' ? ui['original-image'] : ui['original-video'];
  element.src = originalURL;
  element.hidden = false;
  ui['original-section'].hidden = false;
}

function setResult(output, resultRevision) {
  releasePreview(ui['output-image'], ui['output-video']);
  if (outputURL) URL.revokeObjectURL(outputURL);
  result = { ...output, settingsVersion: resultRevision };
  outputURL = URL.createObjectURL(output.blob);
  const element = mediaType === 'image' ? ui['output-image'] : ui['output-video'];
  element.src = outputURL;
  element.hidden = false;
  ui['output-section'].hidden = false;
  render();
}

function startJob(work, { progress = false } = {}) {
  const job = { fileVersion, settingsVersion, controller: new AbortController() };
  activeJob = job;
  ui.progress.hidden = false;
  if (progress) {
    ui.progress.value = 0;
  } else {
    ui.progress.removeAttribute('value');
  }
  job.promise = (async () => {
    try {
      await work(job.controller.signal, job);
    } catch (error) {
      if (fileVersion === job.fileVersion && mediaType === 'image') {
        imageProcessor?.dispose();
        imageProcessor = null;
      }
      if (fileVersion === job.fileVersion && !ready && videoProcessor) {
        videoProcessor.dispose();
        videoProcessor = null;
      }
      if (isCurrentJob(job) && !job.controller.signal.aborted) {
        ui.status.textContent = error.message || 'This file could not be processed.';
      }
    } finally {
      if (activeJob === job) {
        activeJob = null;
        ui.progress.hidden = true;
        render();
        if (pendingImage && fileVersion === job.fileVersion) {
          encodePendingImage();
        }
      }
    }
  })();
  render();
  return job.promise;
}

async function stopWork() {
  clearTimeout(imageTimer);
  pendingImage = false;
  const job = activeJob;
  job?.controller.abort();
  imageProcessor?.dispose();
  imageProcessor = null;
  await job?.promise;
}

function scheduleImageEncoding() {
  clearTimeout(imageTimer);
  pendingImage = false;
  if (!ready || !readTargetBytes() || !readSettings()) {
    render();
    return;
  }
  pendingImage = true;
  imageReadyAt = performance.now() + IMAGE_UPDATE_DELAY_MS;
  imageTimer = setTimeout(encodePendingImage, IMAGE_UPDATE_DELAY_MS);
  render();
}

function encodePendingImage() {
  if (activeJob || !pendingImage || !ready || !readTargetBytes() || !readSettings()) {
    return;
  }
  clearTimeout(imageTimer);
  const wait = imageReadyAt - performance.now();
  if (wait > 0) {
    imageTimer = setTimeout(encodePendingImage, wait);
    return;
  }
  pendingImage = false;
  const values = readSettings();
  const source = file;
  startJob(async (signal, job) => {
    ui.status.textContent = 'Encoding image…';
    if (!imageProcessor) {
      imageProcessor = new ImageProcessor();
      await imageProcessor.load(source);
    }
    signal.throwIfAborted();
    const output = await imageProcessor.encode(values);
    signal.throwIfAborted();
    if (!isCurrentJob(job)) {
      return;
    }
    setResult({
      blob: new Blob([output.bytes], { type: 'image/avif' }),
      width: output.width,
      height: output.height,
    }, job.settingsVersion);
    ui.status.textContent = 'Image ready.';
  });
}

function scheduleCodecSelection() {
  clearTimeout(codecTimer);
  const request = ++codecRequestId;
  if (!ready || mediaType !== 'video' || !readSettings()) {
    ui.codec.textContent = 'Output codec: —';
    return;
  }
  const processor = videoProcessor;
  const values = readSettings();
  ui.codec.textContent = 'Selecting output codec…';
  codecTimer = setTimeout(async () => {
    try {
      const codec = await processor.selectCodec(values);
      if (request === codecRequestId) ui.codec.textContent = `Output codec: ${codecNames[codec]} + ${values.audio ? 'AAC audio' : 'no audio'}`;
    } catch (error) {
      if (request === codecRequestId) ui.codec.textContent = error.message;
    }
  }, CODEC_SELECTION_DELAY_MS);
}

async function selectFile() {
  const selected = ui.file.files[0];
  if (!selected) return;
  const fileGeneration = ++fileVersion;
  ++settingsVersion;
  ++codecRequestId;
  clearTimeout(codecTimer);
  ready = false;
  await stopWork();
  if (fileGeneration !== fileVersion) return;
  videoProcessor?.dispose();
  videoProcessor = null;
  result = metadata = null;
  file = selected;
  mediaType = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp|tiff?)$/i.test(file.name) ? 'image' : 'video';
  releasePreview(ui['original-image'], ui['original-video']);
  releasePreview(ui['output-image'], ui['output-video']);
  if (originalURL) URL.revokeObjectURL(originalURL);
  if (outputURL) URL.revokeObjectURL(outputURL);
  originalURL = outputURL = null;
  ui['original-section'].hidden = ui['output-section'].hidden = true;
  ui['image-controls'].hidden = mediaType !== 'image';
  ui['video-controls'].hidden = ui.sample.hidden = ui['sample-help'].hidden = mediaType !== 'video';
  ui.quality.value = ui['quality-value'].value = '50';
  ui['image-edge'].value = ui['video-edge'].value = '';
  ui.fps.value = '0';
  ui.compatibility.checked = false;
  ui.audio.checked = true;
  ui['audio-bitrate'].value = '128000';
  ui.codec.textContent = 'Output codec: —';
  ui['source-info'].textContent = file.name;
  await startJob(async (signal) => {
    ui.status.textContent = 'Opening file…';
    if (mediaType === 'image') {
      imageProcessor = new ImageProcessor();
      const info = await imageProcessor.load(file);
      signal.throwIfAborted();
      metadata = { width: info.width, height: info.height };
      setOriginal(info.preview);
    } else {
      const { VideoProcessor } = await import('./video.js');
      signal.throwIfAborted();
      videoProcessor = new VideoProcessor(file);
      const processor = videoProcessor;
      const abort = () => processor.dispose();
      signal.addEventListener('abort', abort, { once: true });
      try {
        metadata = await processor.inspect();
      } finally {
        signal.removeEventListener('abort', abort);
      }
      signal.throwIfAborted();
      ui.bitrate.value = String(Math.max(1, Math.round(metadata.bitrate / 1000)));
      ui.audio.checked = metadata.hasAudio;
      ui.audio.disabled = !metadata.hasAudio;
      for (const option of ui.fps.options) {
        option.disabled = Number(option.value) > metadata.fps;
      }
      setOriginal(file);
    }
    ready = true;
    ui['source-info'].textContent = `${file.name} · ${metadata.width} × ${metadata.height}`
      + (metadata.duration ? ` · ${metadata.duration.toFixed(1)} seconds` : '');
    ui.status.textContent = 'Adjust the settings and enter a target size.';
    if (mediaType === 'image') scheduleImageEncoding();
    else scheduleCodecSelection();
  });
}

function encodingChanged() {
  ++settingsVersion;
  ui['quality-value'].value = ui.quality.value;
  ui.status.textContent = '';
  if (mediaType === 'image') scheduleImageEncoding();
  else {
    activeJob?.controller.abort();
    scheduleCodecSelection();
  }
  render();
}

function targetChanged() {
  if (mediaType === 'image') {
    if (!readTargetBytes()) {
      clearTimeout(imageTimer);
      pendingImage = false;
    } else if (!hasCurrentOutput() && !activeJob && !pendingImage) scheduleImageEncoding();
  }
  render();
}

function compressVideo(sample) {
  if (activeJob || !ready || !readTargetBytes() || !readSettings()) return;
  const values = readSettings();
  const sampleStart = sample ? ui['original-video'].currentTime : null;
  const processor = videoProcessor;
  // Keep only one output blob/preview; a sample replaces a previous full output.
  startJob(async (signal, job) => {
    ui.status.textContent = sample ? 'Encoding sample…' : 'Compressing full video…';
    const output = await processor.convert(values, {
      signal, sampleStart,
      onProgress: value => {
        if (activeJob === job && !signal.aborted) ui.progress.value = value;
      },
    });
    if (!isCurrentJob(job)) {
      return;
    }
    setResult(output, job.settingsVersion);
    ui.codec.textContent = `Output codec: ${codecNames[output.codec]} + ${values.audio ? 'AAC audio' : 'no audio'}`;
    ui.status.textContent = sample ? 'Sample ready. Compress the full video to measure its actual size.' : 'Video ready.';
  }, { progress: true });
}

function compressCurrentFile() {
  if (mediaType === 'image') {
    pendingImage = true;
    imageReadyAt = 0;
    encodePendingImage();
  } else {
    compressVideo(false);
  }
}

async function cancelCurrentJob() {
  const cancelledGeneration = fileVersion;
  ++settingsVersion;
  await stopWork();
  if (cancelledGeneration !== fileVersion) return;
  if (!ready) ui.file.value = '';
  ui.status.textContent = ready ? 'Cancelled. Adjust settings or start again.' : 'Cancelled. Choose a file to start again.';
  render();
}

function downloadOutput() {
  if (!canSaveOutput()) {
    return;
  }
  const link = document.createElement('a');
  link.href = outputURL;
  link.download = createOutputFile().name;
  document.body.append(link);
  link.click();
  link.remove();
}

async function shareOutput() {
  if (!canSaveOutput()) {
    return;
  }
  try {
    await navigator.share({ files: [createOutputFile()] });
  } catch (error) {
    if (error.name !== 'AbortError') {
      ui.status.textContent = 'Sharing failed. You can download the file instead.';
    }
  }
}

function disposePage() {
  ++fileVersion;
  ++codecRequestId;
  ready = false;
  clearTimeout(imageTimer);
  clearTimeout(codecTimer);
  pendingImage = false;
  activeJob?.controller.abort();
  imageProcessor?.dispose();
  imageProcessor = null;
  videoProcessor?.dispose();
  videoProcessor = null;
  releasePreview(ui['original-image'], ui['original-video']);
  releasePreview(ui['output-image'], ui['output-video']);
  if (originalURL) URL.revokeObjectURL(originalURL);
  if (outputURL) URL.revokeObjectURL(outputURL);
  originalURL = outputURL = null;
  file = metadata = result = null;
}

function restorePage(event) {
  if (event.persisted) {
    ui.file.value = '';
    ui['original-section'].hidden = ui['output-section'].hidden = true;
    ui.status.textContent = 'Choose a file to start again.';
    render();
  }
}

ui.file.addEventListener('change', selectFile);
ui.target.addEventListener('input', targetChanged);
ui.unit.addEventListener('change', targetChanged);
ui.compress.addEventListener('click', compressCurrentFile);
ui.sample.addEventListener('click', () => compressVideo(true));
ui.cancel.addEventListener('click', cancelCurrentJob);
ui.download.addEventListener('click', downloadOutput);
ui.share.addEventListener('click', shareOutput);

const encodingControlIds = [
  'quality', 'image-edge', 'video-edge', 'bitrate',
  'fps', 'audio', 'audio-bitrate', 'compatibility',
];
for (const id of encodingControlIds) {
  ui[id].addEventListener('input', encodingChanged);
}

window.addEventListener('pagehide', disposePage);
window.addEventListener('pageshow', restorePage);
render();
