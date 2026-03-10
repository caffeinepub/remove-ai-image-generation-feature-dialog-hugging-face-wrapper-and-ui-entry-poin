/**
 * FilterBrush.ts
 * Interface for filter brushes that apply image processing effects to pixel data.
 * Filters must be stateless and pure, returning transformed pixel arrays without modifying the input.
 */

export interface FilterBrush {
  /**
   * Apply filter transformation to pixel data
   * @param pixels - RGBA pixel data as Uint8ClampedArray
   * @param width - Width of the pixel region
   * @param height - Height of the pixel region
   * @returns Transformed pixel data as Uint8ClampedArray
   */
  apply(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Uint8ClampedArray;
}
