/**
 * BlurFilterBrush.ts
 * Blur filter that averages nearby non-transparent pixels for smoothing effects.
 */

import type { FilterBrush } from "../FilterBrush";

export class BlurFilterBrush implements FilterBrush {
  /**
   * Apply blur filter by averaging nearby non-transparent pixels
   * Uses a 3x3 kernel for efficient local neighborhood sampling
   */
  apply(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Sample 3x3 neighborhood
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            // Clamp coordinates to bounds
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = (ny * width + nx) * 4;
              const alpha = pixels[nidx + 3];

              // Only include non-transparent pixels
              if (alpha > 0) {
                sumR += pixels[nidx];
                sumG += pixels[nidx + 1];
                sumB += pixels[nidx + 2];
                sumA += alpha;
                count++;
              }
            }
          }
        }

        // Average the accumulated values
        if (count > 0) {
          output[idx] = Math.round(sumR / count);
          output[idx + 1] = Math.round(sumG / count);
          output[idx + 2] = Math.round(sumB / count);
          output[idx + 3] = Math.round(sumA / count);
        } else {
          // No neighbors, keep original pixel
          output[idx] = pixels[idx];
          output[idx + 1] = pixels[idx + 1];
          output[idx + 2] = pixels[idx + 2];
          output[idx + 3] = pixels[idx + 3];
        }
      }
    }

    return output;
  }
}
