/**
 * Layer.ts
 * Core layer class for managing RGBA pixel buffers using Uint8ClampedArray.
 * Provides pixel-level operations with atomic change tracking, image data conversion, blend mode support, layer properties including name, visibility, lock status, opacity, blend mode, and per-layer filter properties for non-destructive visual effects.
 */

import type { UndoRedoManager } from "./UndoRedoManager";

export type BlendMode = "normal" | "multiply" | "add";

export interface LayerFilters {
  hue: number; // -180 to 180
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  grayscale: number; // 0 to 100
  blur: number; // 0 to 10
  dropShadow: {
    offsetX: number; // -20 to 20
    offsetY: number; // -20 to 20
    blur: number; // 0 to 10
    opacity: number; // 0 to 100
    color: string; // hex color
  };
}

export class Layer {
  public width: number;
  public height: number;
  public pixels: Uint8ClampedArray;
  public name: string;
  public visible: boolean;
  public locked: boolean;
  public opacity: number;
  public blendMode: BlendMode;
  public filters: LayerFilters;
  public undoManager: UndoRedoManager | null = null;

  constructor(width: number, height: number, name = "Layer") {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.name = name;
    this.visible = true;
    this.locked = false;
    this.opacity = 1.0;
    this.blendMode = "normal";
    this.filters = {
      hue: 0,
      brightness: 0,
      contrast: 0,
      grayscale: 0,
      blur: 0,
      dropShadow: {
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        opacity: 0,
        color: "#000000",
      },
    };
  }

  /**
   * Attach an UndoRedoManager to this layer for atomic change tracking
   */
  attachUndoManager(manager: UndoRedoManager): void {
    this.undoManager = manager;
  }

  /**
   * Set a pixel at the given coordinates with RGBA values
   * Automatically tracks changes for atomic undo transactions
   */
  setPixel(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const index = (y * this.width + x) * 4;

    // Record old values for undo if we're in a transaction
    if (this.undoManager?.isInTransaction()) {
      const oldR = this.pixels[index];
      const oldG = this.pixels[index + 1];
      const oldB = this.pixels[index + 2];
      const oldA = this.pixels[index + 3];

      // Push the change to the current transaction
      this.undoManager.pushChange({
        x,
        y,
        old: [oldR, oldG, oldB, oldA],
        new: [r, g, b, a],
        layer: this,
      });
    }

    // Apply the new pixel values
    this.pixels[index] = r;
    this.pixels[index + 1] = g;
    this.pixels[index + 2] = b;
    this.pixels[index + 3] = a;
  }

  /**
   * Get a pixel at the given coordinates
   * Returns [r, g, b, a] or null if out of bounds
   */
  getPixel(x: number, y: number): [number, number, number, number] | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    const index = (y * this.width + x) * 4;
    return [
      this.pixels[index],
      this.pixels[index + 1],
      this.pixels[index + 2],
      this.pixels[index + 3],
    ];
  }

  /**
   * Clear the layer (set all pixels to transparent)
   */
  clear(): void {
    this.pixels.fill(0);
  }

  /**
   * Clone this layer
   */
  clone(): Layer {
    const cloned = new Layer(this.width, this.height, `${this.name} Copy`);
    cloned.pixels.set(this.pixels);
    cloned.visible = this.visible;
    cloned.locked = this.locked;
    cloned.opacity = this.opacity;
    cloned.blendMode = this.blendMode;

    // Deep copy filters
    cloned.filters = {
      hue: this.filters.hue,
      brightness: this.filters.brightness,
      contrast: this.filters.contrast,
      grayscale: this.filters.grayscale,
      blur: this.filters.blur,
      dropShadow: {
        offsetX: this.filters.dropShadow.offsetX,
        offsetY: this.filters.dropShadow.offsetY,
        blur: this.filters.dropShadow.blur,
        opacity: this.filters.dropShadow.opacity,
        color: this.filters.dropShadow.color,
      },
    };

    return cloned;
  }

  /**
   * Convert layer pixels to ImageData
   */
  toImageData(): ImageData {
    return new ImageData(
      new Uint8ClampedArray(this.pixels),
      this.width,
      this.height,
    );
  }

  /**
   * Load pixels from ImageData
   */
  fromImageData(imageData: ImageData): void {
    if (imageData.width !== this.width || imageData.height !== this.height) {
      throw new Error("ImageData dimensions must match layer dimensions");
    }
    this.pixels.set(imageData.data);
  }

  /**
   * Restore pixels from a saved buffer
   */
  restorePixels(buffer: Uint8ClampedArray): void {
    if (buffer.length !== this.pixels.length) {
      throw new Error("Buffer size must match layer pixel buffer size");
    }
    this.pixels.set(buffer);
  }

  /**
   * Apply a stamp (another pixel buffer) at the given position
   * with optional alpha blending
   */
  applyStamp(
    stampPixels: Uint8ClampedArray,
    stampWidth: number,
    stampHeight: number,
    x: number,
    y: number,
    opacity = 1.0,
  ): void {
    for (let sy = 0; sy < stampHeight; sy++) {
      for (let sx = 0; sx < stampWidth; sx++) {
        const targetX = x + sx;
        const targetY = y + sy;

        // Skip if out of bounds
        if (
          targetX < 0 ||
          targetX >= this.width ||
          targetY < 0 ||
          targetY >= this.height
        ) {
          continue;
        }

        const stampIndex = (sy * stampWidth + sx) * 4;
        const targetIndex = (targetY * this.width + targetX) * 4;

        const sr = stampPixels[stampIndex];
        const sg = stampPixels[stampIndex + 1];
        const sb = stampPixels[stampIndex + 2];
        const sa = (stampPixels[stampIndex + 3] / 255) * opacity;

        // Get current pixel
        const dr = this.pixels[targetIndex];
        const dg = this.pixels[targetIndex + 1];
        const db = this.pixels[targetIndex + 2];
        const da = this.pixels[targetIndex + 3] / 255;

        // Alpha blending
        const outA = sa + da * (1 - sa);
        let outR: number;
        let outG: number;
        let outB: number;

        if (outA === 0) {
          outR = outG = outB = 0;
        } else {
          outR = (sr * sa + dr * da * (1 - sa)) / outA;
          outG = (sg * sa + dg * da * (1 - sa)) / outA;
          outB = (sb * sa + db * da * (1 - sa)) / outA;
        }

        this.pixels[targetIndex] = Math.round(outR);
        this.pixels[targetIndex + 1] = Math.round(outG);
        this.pixels[targetIndex + 2] = Math.round(outB);
        this.pixels[targetIndex + 3] = Math.round(outA * 255);
      }
    }
  }
}
