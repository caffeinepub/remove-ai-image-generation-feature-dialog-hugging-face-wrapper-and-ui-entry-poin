/**
 * SharpenFilterBrush.ts
 * Sharpen filter that increases local contrast by enhancing pixel differences.
 */

import type { FilterBrush } from "../FilterBrush";

export class SharpenFilterBrush implements FilterBrush {
  /**
   * Apply sharpen filter using a convolution kernel that enhances edges
   * Uses a 3x3 sharpening kernel: center weight 5, neighbors -1
   */
  apply(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    // Sharpening kernel weights
    // [ -1, -1, -1 ]
    // [ -1,  9, -1 ]
    // [ -1, -1, -1 ]
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

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

        // Clamp values to valid range [0, 255]
        output[idx] = Math.max(0, Math.min(255, Math.round(sumR)));
        output[idx + 1] = Math.max(0, Math.min(255, Math.round(sumG)));
        output[idx + 2] = Math.max(0, Math.min(255, Math.round(sumB)));
        output[idx + 3] = pixels[idx + 3]; // Preserve alpha
      }
    }

    return output;
  }
}
