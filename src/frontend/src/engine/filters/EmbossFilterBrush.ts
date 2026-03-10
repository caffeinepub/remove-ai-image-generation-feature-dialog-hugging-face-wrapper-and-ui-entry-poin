/**
 * EmbossFilterBrush.ts
 * Emboss filter that applies directional difference calculations for relief effects.
 */

import type { FilterBrush } from "../FilterBrush";

export class EmbossFilterBrush implements FilterBrush {
  /**
   * Apply emboss filter using directional difference for relief effect
   * Uses a 3x3 emboss kernel with directional bias
   */
  apply(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    // Emboss kernel for directional relief effect
    // [ -2, -1,  0 ]
    // [ -1,  1,  1 ]
    // [  0,  1,  2 ]
    const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Apply convolution kernel
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let kernelIdx = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            // Clamp coordinates to bounds
            const clampedX = Math.max(0, Math.min(width - 1, nx));
            const clampedY = Math.max(0, Math.min(height - 1, ny));

            const nidx = (clampedY * width + clampedX) * 4;
            const weight = kernel[kernelIdx++];

            sumR += pixels[nidx] * weight;
            sumG += pixels[nidx + 1] * weight;
            sumB += pixels[nidx + 2] * weight;
          }
        }

        // Add 128 offset for emboss effect and clamp to valid range
        output[idx] = Math.max(0, Math.min(255, Math.round(sumR + 128)));
        output[idx + 1] = Math.max(0, Math.min(255, Math.round(sumG + 128)));
        output[idx + 2] = Math.max(0, Math.min(255, Math.round(sumB + 128)));
        output[idx + 3] = pixels[idx + 3]; // Preserve alpha
      }
    }

    return output;
  }
}
