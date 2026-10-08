/*! Cropper.js 2.2.0 | Copyright 2015-present Chen Fengyuan | MIT License, see LICENSE */
import CropperCanvas from '@cropper/element-canvas';
import CropperImage from '@cropper/element-image';
import CropperShade from '@cropper/element-shade';
import CropperSelection from '@cropper/element-selection';
import CropperHandle from '@cropper/element-handle';

for (const component of [CropperCanvas, CropperImage, CropperShade, CropperSelection, CropperHandle]) {
  component.$define();
}
