/**
 * FramePreviewRenderer.ts
 * Module for generating frame thumbnail previews from LayerManager instances.
 * Creates offscreen canvas with scaled composite buffer rendering for Timeline UI display.
 */

import type { LayerManager } from "../../engine/LayerManager";

/**
 * Render a frame thumbnail from a LayerManager instance
 * @param layerManager - LayerManager instance to render
 * @param size - Thumbnail size in pixels (default: 48)
 * @returns Canvas element containing the rendered thumbnail
 */
export function renderFrameThumbnail(
  layerManager: LayerManager,
  size = 48,
): HTMLCanvasElement {
  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  // Get composite buffer from LayerManager
  const composite = layerManager.getCompositeBuffer();
  const width = layerManager.canvasWidth;
  const height = layerManager.canvasHeight;

  // Create ImageData from composite buffer
  // Create a new Uint8ClampedArray to ensure proper typing
  const imageData = new ImageData(
    new Uint8ClampedArray(composite),
    width,
    height,
  );

  // Create temporary canvas for source image
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) {
    return canvas;
  }

  // Draw composite to temporary canvas
  tempCtx.putImageData(imageData, 0, 0);

  // Calculate scaling to fit within thumbnail size while maintaining aspect ratio
  const scale = Math.min(size / width, size / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = (size - scaledWidth) / 2;
  const offsetY = (size - scaledHeight) / 2;

  // Disable image smoothing for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;

  // Draw scaled image to thumbnail canvas
  ctx.drawImage(
    tempCanvas,
    0,
    0,
    width,
    height,
    offsetX,
    offsetY,
    scaledWidth,
    scaledHeight,
  );

  return canvas;
}
