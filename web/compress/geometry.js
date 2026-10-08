const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function fullCrop(source) {
  return { left: 0, top: 0, width: source.width, height: source.height };
}

// All geometry uses oriented source pixels
export function constrainCrop(source, crop, video = false) {
  const minimum = video ? 2 : 1;
  if (!Object.values(crop).every(Number.isFinite)) throw new Error('Invalid crop dimensions.');
  const width = clamp(Math.round(crop.width), minimum, source.width);
  const height = clamp(Math.round(crop.height), minimum, source.height);
  return {
    left: clamp(Math.round(crop.left), 0, source.width - width),
    top: clamp(Math.round(crop.top), 0, source.height - height),
    width, height,
  };
}

export function resizeGeometry(source, crop = fullCrop(source), scale = 1, video = false) {
  crop = constrainCrop(source, crop, video);
  if (!Number.isFinite(scale)) throw new Error('Invalid output dimensions.');
  const minimum = video ? 2 : 1;
  scale = clamp(scale, Math.max(minimum / crop.width, minimum / crop.height), 1);
  const round = value => video ? Math.floor(value / 2) * 2 : Math.round(value);
  return {
    crop, scale,
    width: Math.max(minimum, round(crop.width * scale)),
    height: Math.max(minimum, round(crop.height * scale)),
  };
}

export function cropFromSelection(source, selection, bounds, video = false) {
  return constrainCrop(source, {
    left: selection.x / bounds.width * source.width,
    top: selection.y / bounds.height * source.height,
    width: selection.width / bounds.width * source.width,
    height: selection.height / bounds.height * source.height,
  }, video);
}

export function selectionFromCrop(source, crop, bounds) {
  return {
    x: crop.left / source.width * bounds.width,
    y: crop.top / source.height * bounds.height,
    width: crop.width / source.width * bounds.width,
    height: crop.height / source.height * bounds.height,
  };
}

export function encodingGeometry(source, settings, video = false) {
  const crop = constrainCrop(source, settings.crop || fullCrop(source), video);
  const { width, height } = settings;
  const minimum = video ? 2 : 1;
  if (![width, height].every(value => Number.isSafeInteger(value) && value >= minimum)
    || width > crop.width || height > crop.height
    || (video && (width % 2 || height % 2))) {
    throw new Error('Output dimensions must fit inside the crop.');
  }
  return { crop, width, height };
}
