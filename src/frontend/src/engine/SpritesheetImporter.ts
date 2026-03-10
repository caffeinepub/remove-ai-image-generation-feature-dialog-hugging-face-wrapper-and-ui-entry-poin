/**
 * SpritesheetImporter.ts
 *
 * Utility for slicing spritesheets into individual frames.
 * Uses offscreen canvas to extract tiles and convert them to ImageData.
 */

import type { FrameManager } from "./FrameManager";

/**
 * Slice a spritesheet into individual frames and add them to the FrameManager
 * @param bitmap - The spritesheet ImageBitmap
 * @param tileWidth - Width of each tile in pixels
 * @param tileHeight - Height of each tile in pixels
 * @param frameManager - FrameManager to add frames to
 * @returns Number of frames imported
 */
export async function importSpritesheet(
  bitmap: ImageBitmap,
  tileWidth: number,
  tileHeight: number,
  frameManager: FrameManager,
): Promise<number> {
  const sheetWidth = bitmap.width;
  const sheetHeight = bitmap.height;

  // Calculate number of tiles
  const tilesX = Math.floor(sheetWidth / tileWidth);
  const tilesY = Math.floor(sheetHeight / tileHeight);
  const totalTiles = tilesX * tilesY;

  if (totalTiles === 0) {
    throw new Error("Invalid tile dimensions - no tiles can be extracted");
  }

  // Create offscreen canvas for extraction
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = tileWidth;
  offscreenCanvas.height = tileHeight;
  const ctx = offscreenCanvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context for spritesheet extraction");
  }

  // Disable image smoothing for pixel-perfect extraction
  ctx.imageSmoothingEnabled = false;

  // Clear all existing frames before importing
  frameManager.clearAllFrames();

  // Extract each tile and create a frame
  let frameCount = 0;
  for (let row = 0; row < tilesY; row++) {
    for (let col = 0; col < tilesX; col++) {
      // Clear canvas
      ctx.clearRect(0, 0, tileWidth, tileHeight);

      // Calculate source position
      const srcX = col * tileWidth;
      const srcY = row * tileHeight;

      // Draw tile onto offscreen canvas
      ctx.drawImage(
        bitmap,
        srcX,
        srcY,
        tileWidth,
        tileHeight,
        0,
        0,
        tileWidth,
        tileHeight,
      );

      // Extract ImageData
      const imageData = ctx.getImageData(0, 0, tileWidth, tileHeight);

      // Add frame to FrameManager
      if (frameCount === 0) {
        // First frame - use existing frame created by clearAllFrames
        const layerManager = frameManager.getCurrentLayerManager();
        if (layerManager) {
          // Resize canvas to match tile dimensions
          frameManager.resizeCanvas(tileWidth, tileHeight);

          // Import image into the first frame's active layer
          layerManager.importImageCentered(
            imageData,
            `Frame ${frameCount + 1}`,
          );
        }
      } else {
        // Subsequent frames - add new frame
        frameManager.addFrame();
        frameManager.setActiveFrame(frameCount);

        const layerManager = frameManager.getCurrentLayerManager();
        if (layerManager) {
          // Import image into the new frame's active layer
          layerManager.importImageCentered(
            imageData,
            `Frame ${frameCount + 1}`,
          );
        }
      }

      frameCount++;
    }
  }

  // Switch back to first frame
  frameManager.setActiveFrame(0);

  return frameCount;
}

/**
 * Validate spritesheet dimensions before import
 * @param imageWidth - Width of the spritesheet image
 * @param imageHeight - Height of the spritesheet image
 * @param tileWidth - Width of each tile
 * @param tileHeight - Height of each tile
 * @returns Validation result with error message if invalid
 */
export function validateSpritesheetDimensions(
  imageWidth: number,
  imageHeight: number,
  tileWidth: number,
  tileHeight: number,
): { valid: boolean; error?: string } {
  if (tileWidth <= 0 || tileHeight <= 0) {
    return { valid: false, error: "Tile dimensions must be greater than zero" };
  }

  if (tileWidth > imageWidth || tileHeight > imageHeight) {
    return { valid: false, error: "Tile dimensions exceed image dimensions" };
  }

  const tilesX = Math.floor(imageWidth / tileWidth);
  const tilesY = Math.floor(imageHeight / tileHeight);

  if (tilesX === 0 || tilesY === 0) {
    return {
      valid: false,
      error: "No complete tiles can be extracted with these dimensions",
    };
  }

  return { valid: true };
}
