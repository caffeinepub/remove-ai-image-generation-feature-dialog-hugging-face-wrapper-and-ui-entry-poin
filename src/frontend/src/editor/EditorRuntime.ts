/**
 * EditorRuntime.ts
 * Persistent singleton module that owns FrameManager, ToolController, canvas dimensions, project state, HUD visibility state with subscription system for reactive UI updates, and layer-change subscription system for immediate layer panel updates; includes comprehensive filter brush patch system with five new pixel-art-safe filters and complete filter parameter model, plus brush spacing patch with stable distance-based spacing.
 */

import { FrameManager } from "../engine/FrameManager";
import type { LayerManager } from "../engine/LayerManager";
import { ToolController } from "../engine/ToolController";
import type { UndoRedoManager } from "../engine/UndoRedoManager";

const DEBUG =
  (typeof process !== "undefined" && process.env.DEV === "true") ||
  (typeof localStorage !== "undefined" &&
    localStorage.getItem("DEBUG_EDITOR") === "1");

type HudVisibilityState = {
  generalInfo: boolean;
  notes: boolean;
  shortcuts: boolean;
  colorQuickDockExpanded: boolean;
};

type HudVisibilityCallback = (state: HudVisibilityState) => void;
type LayersChangedCallback = () => void;

export class EditorRuntime {
  private _frameManager: FrameManager;
  private _toolController: ToolController;
  private _canvasWidth: number;
  private _canvasHeight: number;
  private _currentProjectId: string | null = null;
  private _currentProjectName: string | null = null;

  // HUD visibility state
  public hudVisibility: HudVisibilityState = {
    generalInfo: true,
    notes: true,
    shortcuts: true,
    colorQuickDockExpanded: true,
  };

  // HUD visibility subscribers
  private hudVisibilitySubscribers: HudVisibilityCallback[] = [];

  // Layer-change subscribers
  private layersChangedSubscribers: LayersChangedCallback[] = [];

  constructor(width = 32, height = 32) {
    this._canvasWidth = width;
    this._canvasHeight = height;

    // Create FrameManager (creates first frame with one layer)
    this._frameManager = new FrameManager(width, height);

    // Get current frame
    const currentFrame = this._frameManager.getCurrentFrame();
    if (!currentFrame) {
      throw new Error("Failed to initialize EditorRuntime: no current frame");
    }

    // Create ToolController with current frame's LayerManager
    this._toolController = new ToolController(currentFrame.layerManager);
    if (DEBUG) {
      console.log(
        "🔥 ACTUAL TOOLCONTROLLER CONSTRUCTOR 🔥",
        ToolController.toString().slice(0, 300),
      );
    }
    this._toolController.attachUndoManager(currentFrame.undoRedoManager);
    this._toolController.setColor(255, 255, 255, 255);

    // Apply custom brush patch immediately after ToolController instantiation
    this.applyCustomBrushPatch(this._toolController);
    this.applyBrushSpacingPatch(this._toolController);
    this.applyFilterBrushPatch(this._toolController);
  }

  /**
   * Permanent Custom Brush Fix (Runtime Patch)
   * Applies necessary patches to ensure custom brush functionality works correctly
   * with proper centering and scaling behavior for already-centered pixel data
   */
  private applyCustomBrushPatch(tool: any): void {
    if (!tool || tool.__customBrushPatchApplied) return;

    tool.__customBrushPatchApplied = true;

    tool.stampCustomBrush = function (x: number, y: number): void {
      if (!this.customBrush) return;
      if (this.currentTool !== "brush") return;

      const baseX = Math.floor(x);
      const baseY = Math.floor(y);

      const scale = Math.max(1, Math.floor(this.brushSize || 1));
      const halfScale = Math.floor(scale / 2);
      const opacity = Math.max(0, Math.min(1, Number(this.brushOpacity ?? 1)));

      for (const p of this.customBrush.pixels) {
        const a = Math.max(
          0,
          Math.min(255, Math.round((p.a ?? 255) * opacity)),
        );

        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = baseX + p.x * scale + (sx - halfScale);
            const py = baseY + p.y * scale + (sy - halfScale);

            this.drawSinglePixelCore(px, py, p.r, p.g, p.b, a);

            if (this.mirrorX) {
              this.drawSinglePixelCore(
                this.layerManager.canvasWidth - 1 - px,
                py,
                p.r,
                p.g,
                p.b,
                a,
              );
            }
            if (this.mirrorY) {
              this.drawSinglePixelCore(
                px,
                this.layerManager.canvasHeight - 1 - py,
                p.r,
                p.g,
                p.b,
                a,
              );
            }
            if (this.mirrorX && this.mirrorY) {
              this.drawSinglePixelCore(
                this.layerManager.canvasWidth - 1 - px,
                this.layerManager.canvasHeight - 1 - py,
                p.r,
                p.g,
                p.b,
                a,
              );
            }
          }
        }
      }
    };

    if (DEBUG) {
      console.log(
        "✅ Custom brush runtime patch applied with proper centering (halfScale)",
      );
    }
  }

  /**
   * Brush Spacing Patch
   * Adds brush spacing functionality to ToolController for pencil, eraser, and brush tools
   *
   * FIXED: Stable distance-based spacing with subdivided integer pixel steps
   * - First stamp bypasses spacing logic and is drawn immediately
   * - Distance accumulation driven by subdivided integer pixel steps between lastX/Y and new position
   * - For each subdivision step: compute interpX/Y, compute stepDist from previous interpolated point
   * - Increment spacingCarry by stepDist (distance between successive interpolated points)
   * - Stamps while spacingCarry >= spacing + 1, subtracts spacing + 1 after each stamp
   * - Updates lastStampX/Y when and only when a pixel is stamped
   * - Updates lastX/Y only after the entire subdivision loop completes
   * - Keeps spacingCarry constant when no stamp occurs
   * - Resets spacingCarry only in pointerDown() and pointerUp()
   */
  private applyBrushSpacingPatch(tool: any): void {
    // If already patched, do nothing
    if (tool.setBrushSpacing) return;

    // Initialize spacing properties
    tool.brushSpacingPx = 0;
    tool.spacingCarry = 0;
    tool.lastStampX = null;
    tool.lastStampY = null;

    // Add setter and getter methods
    tool.setBrushSpacing = (px: number) => {
      tool.brushSpacingPx = Math.max(0, Math.floor(px));
    };

    tool.getBrushSpacing = () => tool.brushSpacingPx;

    // Wrap drawInterpolatedStroke
    const original = tool.drawInterpolatedStroke.bind(tool);
    tool.drawInterpolatedStroke = (x: number, y: number) => {
      // If spacing is disabled, use original implementation
      if (tool.brushSpacingPx === 0) {
        return original(x, y);
      }

      // If this is the very first stamp (no lastX/Y), draw immediately and return
      if (tool.lastX === null || tool.lastY === null) {
        tool.drawPixel(x, y);
        tool.lastX = x;
        tool.lastY = y;
        tool.lastStampX = x;
        tool.lastStampY = y;
        tool.spacingCarry = 0;
        return;
      }

      // Calculate delta from last pointer position to current pointer position
      const dx = x - tool.lastX;
      const dy = y - tool.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If no movement, do nothing
      if (distance === 0) {
        return;
      }

      // Subdivide the line segment into integer pixel steps
      const steps = Math.max(1, Math.ceil(distance));

      // Track previous interpolated position for stepDist calculation
      let prevInterpX = tool.lastX;
      let prevInterpY = tool.lastY;

      const spacing = tool.brushSpacingPx;

      // Process each subdivision step
      for (let i = 1; i <= steps; i++) {
        // Compute interpolated position
        const t = i / steps;
        const interpX = tool.lastX + dx * t;
        const interpY = tool.lastY + dy * t;

        // Compute step distance from previous interpolated point
        const stepDx = interpX - prevInterpX;
        const stepDy = interpY - prevInterpY;
        const stepDist = Math.sqrt(stepDx * stepDx + stepDy * stepDy);

        // Increment spacingCarry by stepDist
        tool.spacingCarry += stepDist;

        // Stamp pixels while spacingCarry >= spacing + 1
        while (tool.spacingCarry >= spacing + 1) {
          // Draw stamp at current interpolated position
          tool.drawPixel(Math.round(interpX), Math.round(interpY));

          // Update lastStamp position
          tool.lastStampX = interpX;
          tool.lastStampY = interpY;

          // Subtract spacing + 1 from carry
          tool.spacingCarry -= spacing + 1;
        }

        // Update previous interpolated position for next iteration
        prevInterpX = interpX;
        prevInterpY = interpY;
      }

      // Update lastX/Y to current position (after entire subdivision loop completes)
      tool.lastX = x;
      tool.lastY = y;
    };

    // Wrap pointerDown to reset spacing state and start undo transaction for filter brushes
    const origDown = tool.pointerDown.bind(tool);
    tool.pointerDown = (x: number, y: number, shiftKey = false) => {
      // Reset spacing state on pointer down for spacing-enabled tools
      if (
        tool.currentTool === "pencil" ||
        tool.currentTool === "eraser" ||
        tool.currentTool === "brush"
      ) {
        tool.spacingCarry = 0;
        tool.lastStampX = null;
        tool.lastStampY = null;

        // Start undo transaction for filter brushes
        if (
          tool.currentTool === "brush" &&
          tool.activeFilterBrush &&
          tool.undoManager
        ) {
          tool.undoManager.beginTransaction();
        }
      }
      return origDown(x, y, shiftKey);
    };

    // Wrap pointerUp to reset spacing state and end undo transaction for filter brushes
    const origUp = tool.pointerUp.bind(tool);
    tool.pointerUp = (x: number, y: number) => {
      const result = origUp(x, y);

      // Reset spacing state on pointer up for spacing-enabled tools
      if (
        tool.currentTool === "pencil" ||
        tool.currentTool === "eraser" ||
        tool.currentTool === "brush"
      ) {
        tool.spacingCarry = 0;
        tool.lastStampX = null;
        tool.lastStampY = null;

        // End undo transaction for filter brushes
        if (
          tool.currentTool === "brush" &&
          tool.activeFilterBrush &&
          tool.undoManager
        ) {
          tool.undoManager.endTransaction();
        }
      }

      return result;
    };

    if (DEBUG) {
      console.log(
        "✅ Brush spacing patch applied with subdivided integer pixel steps",
      );
    }
  }

  /**
   * Filter Brush Patch
   * Adds filter brush functionality to ToolController with comprehensive parameter model
   *
   * Implementation:
   * - Defines activeFilterBrush state for tracking active filter selection
   * - Exposes public API methods: setFilterBrush(id), clearFilterBrush(), getFilterBrush()
   * - Implements filterParams object with radius, amount, hue, and saturation fields
   * - Provides getter/setter methods for each filter parameter
   * - Implements applyFilterAt(x, y) for localized filter operations
   * - Includes five new filters: Invert, Grayscale, Brightness, Contrast, Sepia
   * - Monkey-patches drawPixel() to redirect to applyFilterAt() when filter brush is active
   * - Respects brush size, opacity, mirror modes, and selection masks
   * - Integrates with existing undo transaction boundaries
   */
  private applyFilterBrushPatch(tool: any): void {
    // If already patched, do nothing
    if (tool.setFilterBrush) return;

    // Initialize filter brush state
    tool.activeFilterBrush = null;

    // Initialize filter parameters
    tool.filterParams = {
      radius: 1,
      amount: 0,
      hue: 0,
      saturation: 100,
    };

    // Public API: Set filter brush
    tool.setFilterBrush = (id: string) => {
      tool.activeFilterBrush = id;
      if (DEBUG) {
        console.log(`✅ Filter brush activated: ${id}`);
      }
    };

    // Public API: Clear filter brush
    tool.clearFilterBrush = () => {
      tool.activeFilterBrush = null;
      if (DEBUG) {
        console.log("✅ Filter brush cleared");
      }
    };

    // Public API: Get current filter brush
    tool.getFilterBrush = () => tool.activeFilterBrush;

    // Filter parameter getters and setters
    tool.setFilterRadius = (value: number) => {
      tool.filterParams.radius = Math.max(1, Math.min(6, Math.floor(value)));
    };

    tool.getFilterRadius = () => tool.filterParams.radius;

    tool.setFilterAmount = (value: number) => {
      tool.filterParams.amount = Math.max(-100, Math.min(100, value));
    };

    tool.getFilterAmount = () => tool.filterParams.amount;

    tool.setFilterHue = (value: number) => {
      tool.filterParams.hue = value % 360;
    };

    tool.getFilterHue = () => tool.filterParams.hue;

    tool.setFilterSaturation = (value: number) => {
      tool.filterParams.saturation = Math.max(0, Math.min(200, value));
    };

    tool.getFilterSaturation = () => tool.filterParams.saturation;

    /**
     * Apply filter at specified coordinates
     * Reads nearby pixels from snapshot, performs filtering, writes modified pixels back
     * Treats all pixels as [r, g, b, a] values, including transparent pixels
     * Computes new alpha as max(centerAlpha, filteredAlpha)
     */
    tool.applyFilterAt = function (x: number, y: number): void {
      if (!this.activeFilterBrush) return;
      if (!this.layerManager) return;

      const activeLayer = this.layerManager.getActiveLayer();
      if (!activeLayer) return;

      const centerX = Math.floor(x);
      const centerY = Math.floor(y);
      const radius = Math.max(1, Math.floor(this.brushSize / 2));
      const opacity = Math.max(0, Math.min(1, Number(this.brushOpacity ?? 1)));

      // Snapshot the entire pixel buffer to prevent pixel loss during modification
      const pixelSnapshot = activeLayer.pixels.slice();

      // Process pixels within brush radius
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = centerX + dx;
          const py = centerY + dy;

          // Skip if outside layer bounds
          if (
            px < 0 ||
            px >= this.layerManager.canvasWidth ||
            py < 0 ||
            py >= this.layerManager.canvasHeight
          ) {
            continue;
          }

          // Check selection mask if active
          if (this.selectionManager?.hasSelection()) {
            if (!this.selectionManager.isPixelInSelection(px, py)) {
              continue;
            }
          }

          // Get center pixel from snapshot (normalized as array)
          const index = (py * this.layerManager.canvasWidth + px) * 4;
          const centerR = pixelSnapshot[index];
          const centerG = pixelSnapshot[index + 1];
          const centerB = pixelSnapshot[index + 2];
          const centerA = pixelSnapshot[index + 3];

          // Apply filter based on type
          let filteredColor = {
            r: centerR,
            g: centerG,
            b: centerB,
            a: centerA,
          };

          if (this.activeFilterBrush === "blur") {
            filteredColor = this._applyBlurFilter(
              pixelSnapshot,
              px,
              py,
              this.filterParams.radius,
            );
          } else if (this.activeFilterBrush === "sharpen") {
            filteredColor = this._applySharpenFilter(
              pixelSnapshot,
              px,
              py,
              this.filterParams.radius,
            );
          } else if (this.activeFilterBrush === "emboss") {
            filteredColor = this._applyEmbossFilter(
              pixelSnapshot,
              px,
              py,
              this.filterParams.radius,
            );
          } else if (this.activeFilterBrush === "invert") {
            filteredColor = this._applyInvertFilter(
              centerR,
              centerG,
              centerB,
              centerA,
            );
          } else if (this.activeFilterBrush === "grayscale") {
            filteredColor = this._applyGrayscaleFilter(
              centerR,
              centerG,
              centerB,
              centerA,
            );
          } else if (this.activeFilterBrush === "brightness") {
            filteredColor = this._applyBrightnessFilter(
              centerR,
              centerG,
              centerB,
              centerA,
              this.filterParams.amount,
            );
          } else if (this.activeFilterBrush === "contrast") {
            filteredColor = this._applyContrastFilter(
              centerR,
              centerG,
              centerB,
              centerA,
              this.filterParams.amount,
            );
          } else if (this.activeFilterBrush === "sepia") {
            filteredColor = this._applySepiaFilter(
              centerR,
              centerG,
              centerB,
              centerA,
            );
          }

          // Blend filtered color with original based on opacity
          const blendedR = Math.round(
            centerR * (1 - opacity) + filteredColor.r * opacity,
          );
          const blendedG = Math.round(
            centerG * (1 - opacity) + filteredColor.g * opacity,
          );
          const blendedB = Math.round(
            centerB * (1 - opacity) + filteredColor.b * opacity,
          );

          // Compute new alpha as max(centerAlpha, filteredAlpha)
          const newAlpha = Math.max(centerA, filteredColor.a);

          // Write pixel back with computed alpha
          activeLayer.setPixel(px, py, blendedR, blendedG, blendedB, newAlpha);

          // Apply mirror modes
          if (this.mirrorX) {
            const mirrorX = this.layerManager.canvasWidth - 1 - px;
            activeLayer.setPixel(
              mirrorX,
              py,
              blendedR,
              blendedG,
              blendedB,
              newAlpha,
            );
          }
          if (this.mirrorY) {
            const mirrorY = this.layerManager.canvasHeight - 1 - py;
            activeLayer.setPixel(
              px,
              mirrorY,
              blendedR,
              blendedG,
              blendedB,
              newAlpha,
            );
          }
          if (this.mirrorX && this.mirrorY) {
            const mirrorX = this.layerManager.canvasWidth - 1 - px;
            const mirrorY = this.layerManager.canvasHeight - 1 - py;
            activeLayer.setPixel(
              mirrorX,
              mirrorY,
              blendedR,
              blendedG,
              blendedB,
              newAlpha,
            );
          }
        }
      }
    };

    /**
     * Apply blur filter using weighted box blur convolution
     * Includes transparent neighbors by weighting color contributions by (alpha / 255)
     * Returns filtered color with computed alpha
     */
    tool._applyBlurFilter = function (
      pixelSnapshot: Uint8ClampedArray,
      x: number,
      y: number,
      radius: number,
    ): any {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      let totalWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (
            nx < 0 ||
            nx >= this.layerManager.canvasWidth ||
            ny < 0 ||
            ny >= this.layerManager.canvasHeight
          ) {
            continue;
          }

          const index = (ny * this.layerManager.canvasWidth + nx) * 4;
          const r = pixelSnapshot[index];
          const g = pixelSnapshot[index + 1];
          const b = pixelSnapshot[index + 2];
          const a = pixelSnapshot[index + 3];

          // Weight color contributions by (alpha / 255)
          const weight = a / 255;
          sumR += r * weight;
          sumG += g * weight;
          sumB += b * weight;
          sumA += a;
          totalWeight += weight;
        }
      }

      if (totalWeight === 0) {
        const index = (y * this.layerManager.canvasWidth + x) * 4;
        return {
          r: pixelSnapshot[index],
          g: pixelSnapshot[index + 1],
          b: pixelSnapshot[index + 2],
          a: pixelSnapshot[index + 3],
        };
      }

      const count = (2 * radius + 1) * (2 * radius + 1);

      return {
        r: Math.round(sumR / totalWeight),
        g: Math.round(sumG / totalWeight),
        b: Math.round(sumB / totalWeight),
        a: Math.round(sumA / count),
      };
    };

    /**
     * Apply sharpen filter using center-weighted algorithm
     * Processes across alpha edges without early returns
     * Returns filtered color with computed alpha
     */
    tool._applySharpenFilter = function (
      pixelSnapshot: Uint8ClampedArray,
      x: number,
      y: number,
      radius: number,
    ): any {
      const centerIndex = (y * this.layerManager.canvasWidth + x) * 4;
      const centerR = pixelSnapshot[centerIndex];
      const centerG = pixelSnapshot[centerIndex + 1];
      const centerB = pixelSnapshot[centerIndex + 2];
      const centerA = pixelSnapshot[centerIndex + 3];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      let totalWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (
            nx < 0 ||
            nx >= this.layerManager.canvasWidth ||
            ny < 0 ||
            ny >= this.layerManager.canvasHeight
          ) {
            continue;
          }

          const index = (ny * this.layerManager.canvasWidth + nx) * 4;
          const r = pixelSnapshot[index];
          const g = pixelSnapshot[index + 1];
          const b = pixelSnapshot[index + 2];
          const a = pixelSnapshot[index + 3];

          // Weight color contributions by (alpha / 255)
          const weight = a / 255;
          sumR += r * weight;
          sumG += g * weight;
          sumB += b * weight;
          sumA += a;
          totalWeight += weight;
        }
      }

      if (totalWeight === 0) {
        return { r: centerR, g: centerG, b: centerB, a: centerA };
      }

      const avgR = sumR / totalWeight;
      const avgG = sumG / totalWeight;
      const avgB = sumB / totalWeight;

      const count = (2 * radius + 1) * (2 * radius + 1) - 1;

      return {
        r: Math.max(0, Math.min(255, Math.round(centerR * 2 - avgR))),
        g: Math.max(0, Math.min(255, Math.round(centerG * 2 - avgG))),
        b: Math.max(0, Math.min(255, Math.round(centerB * 2 - avgB))),
        a: Math.round(sumA / count),
      };
    };

    /**
     * Apply emboss filter using directional neighbor differences
     * Processes across alpha edges without early returns
     * Returns filtered color with computed alpha
     */
    tool._applyEmbossFilter = function (
      pixelSnapshot: Uint8ClampedArray,
      x: number,
      y: number,
      _radius: number,
    ): any {
      const centerIndex = (y * this.layerManager.canvasWidth + x) * 4;
      const _centerR = pixelSnapshot[centerIndex];
      const _centerG = pixelSnapshot[centerIndex + 1];
      const _centerB = pixelSnapshot[centerIndex + 2];
      const _centerA = pixelSnapshot[centerIndex + 3];

      // Get top-left and bottom-right neighbors
      const tlX = Math.max(0, x - 1);
      const tlY = Math.max(0, y - 1);
      const brX = Math.min(this.layerManager.canvasWidth - 1, x + 1);
      const brY = Math.min(this.layerManager.canvasHeight - 1, y + 1);

      const tlIndex = (tlY * this.layerManager.canvasWidth + tlX) * 4;
      const brIndex = (brY * this.layerManager.canvasWidth + brX) * 4;

      const tlR = pixelSnapshot[tlIndex];
      const tlG = pixelSnapshot[tlIndex + 1];
      const tlB = pixelSnapshot[tlIndex + 2];
      const tlA = pixelSnapshot[tlIndex + 3];

      const brR = pixelSnapshot[brIndex];
      const brG = pixelSnapshot[brIndex + 1];
      const brB = pixelSnapshot[brIndex + 2];
      const brA = pixelSnapshot[brIndex + 3];

      const diffR = tlR - brR;
      const diffG = tlG - brG;
      const diffB = tlB - brB;

      return {
        r: Math.max(0, Math.min(255, 128 + diffR)),
        g: Math.max(0, Math.min(255, 128 + diffG)),
        b: Math.max(0, Math.min(255, 128 + diffB)),
        a: Math.max(tlA, brA),
      };
    };

    /**
     * Apply invert filter
     * Inverts RGB values while preserving alpha
     */
    tool._applyInvertFilter = (
      r: number,
      g: number,
      b: number,
      a: number,
    ): any => ({
      r: 255 - r,
      g: 255 - g,
      b: 255 - b,
      a: a,
    });

    /**
     * Apply grayscale filter using luminance formula
     * Converts to grayscale while preserving alpha
     */
    tool._applyGrayscaleFilter = (
      r: number,
      g: number,
      b: number,
      a: number,
    ): any => {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return {
        r: gray,
        g: gray,
        b: gray,
        a: a,
      };
    };

    /**
     * Apply brightness filter
     * Adjusts brightness by adding amount to RGB values
     */
    tool._applyBrightnessFilter = (
      r: number,
      g: number,
      b: number,
      a: number,
      amount: number,
    ): any => {
      const adjustment = Math.round((amount / 100) * 255);
      return {
        r: Math.max(0, Math.min(255, r + adjustment)),
        g: Math.max(0, Math.min(255, g + adjustment)),
        b: Math.max(0, Math.min(255, b + adjustment)),
        a: a,
      };
    };

    /**
     * Apply contrast filter
     * Adjusts contrast using contrast factor calculation
     */
    tool._applyContrastFilter = (
      r: number,
      g: number,
      b: number,
      a: number,
      amount: number,
    ): any => {
      const factor = (259 * (amount + 255)) / (255 * (259 - amount));
      return {
        r: Math.max(0, Math.min(255, Math.round(factor * (r - 128) + 128))),
        g: Math.max(0, Math.min(255, Math.round(factor * (g - 128) + 128))),
        b: Math.max(0, Math.min(255, Math.round(factor * (b - 128) + 128))),
        a: a,
      };
    };

    /**
     * Apply sepia filter using standard sepia transformation matrix
     * Applies sepia tone while preserving alpha
     */
    tool._applySepiaFilter = (
      r: number,
      g: number,
      b: number,
      a: number,
    ): any => ({
      r: Math.min(255, Math.round(r * 0.393 + g * 0.769 + b * 0.189)),
      g: Math.min(255, Math.round(r * 0.349 + g * 0.686 + b * 0.168)),
      b: Math.min(255, Math.round(r * 0.272 + g * 0.534 + b * 0.131)),
      a: a,
    });

    // Monkey-patch drawPixel to redirect to applyFilterAt when filter brush is active
    const originalDrawPixel = tool.drawPixel.bind(tool);
    tool.drawPixel = function (x: number, y: number): void {
      // Check if filter brush is active and current tool is brush
      if (this.currentTool === "brush" && this.activeFilterBrush) {
        this.applyFilterAt(x, y);
        return;
      }

      // Otherwise use original drawPixel implementation
      originalDrawPixel(x, y);
    };

    if (DEBUG) {
      console.log(
        "✅ Filter brush patch applied with comprehensive filter system and parameter model",
      );
    }
  }

  // Getters
  get frameManager(): FrameManager {
    return this._frameManager;
  }

  get toolController(): ToolController {
    return this._toolController;
  }

  get activeFrameIndex(): number {
    return this._frameManager.getCurrentFrameIndex();
  }

  get canvasWidth(): number {
    return this._canvasWidth;
  }

  get canvasHeight(): number {
    return this._canvasHeight;
  }

  get currentProjectId(): string | null {
    return this._currentProjectId;
  }

  get currentProjectName(): string | null {
    return this._currentProjectName;
  }

  // Setters
  setCanvasSize(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  setCurrentProject(id: string | null, name: string | null): void {
    this._currentProjectId = id;
    this._currentProjectName = name;
  }

  /**
   * Get current HUD visibility state
   */
  getHudVisibility(): HudVisibilityState {
    return { ...this.hudVisibility };
  }

  /**
   * Toggle HUD visibility for a specific component
   */
  toggleHudVisibility(key: keyof HudVisibilityState): void {
    this.hudVisibility[key] = !this.hudVisibility[key];
    this.notifyHudVisibilitySubscribers();
  }

  /**
   * Subscribe to HUD visibility changes
   * Returns an unsubscribe function
   */
  onHudVisibilityChange(callback: HudVisibilityCallback): () => void {
    this.hudVisibilitySubscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.hudVisibilitySubscribers.indexOf(callback);
      if (index > -1) {
        this.hudVisibilitySubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of HUD visibility changes
   */
  private notifyHudVisibilitySubscribers(): void {
    const state = this.getHudVisibility();
    for (const callback of this.hudVisibilitySubscribers) {
      callback(state);
    }
  }

  /**
   * Subscribe to layer changes
   * Returns an unsubscribe function
   */
  onLayersChanged(callback: LayersChangedCallback): () => void {
    this.layersChangedSubscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.layersChangedSubscribers.indexOf(callback);
      if (index > -1) {
        this.layersChangedSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of layer changes
   */
  notifyLayersChanged(): void {
    for (const callback of this.layersChangedSubscribers) {
      callback();
    }
  }

  /**
   * Get current LayerManager from active frame
   */
  getCurrentLayerManager(): LayerManager {
    return this._frameManager.getCurrent();
  }

  /**
   * Get current UndoRedoManager from active frame
   */
  getCurrentUndoRedoManager(): UndoRedoManager {
    return this._frameManager.getCurrentUndoRedoManager();
  }

  /**
   * Switch to a different frame by index
   * Updates ToolController's LayerManager and UndoRedoManager references
   * Cancels any active selection when switching frames
   */
  switchToFrame(index: number): boolean {
    const success = this._frameManager.setActiveFrame(index);
    if (!success) return false;

    const currentFrame = this._frameManager.getCurrentFrame();
    if (!currentFrame) return false;

    // Update ToolController references
    this._toolController.setLayerManager(currentFrame.layerManager);
    this._toolController.attachUndoManager(currentFrame.undoRedoManager);

    // Cancel any active selection when switching frames
    this._toolController.cancelSelectionFromOutside();

    return true;
  }

  /**
   * Reset the entire editor state with a new FrameManager and ToolController
   * Used when loading projects or creating new projects
   */
  reset(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;

    // Create fresh FrameManager
    this._frameManager = new FrameManager(width, height);

    // Get current frame
    const currentFrame = this._frameManager.getCurrentFrame();
    if (!currentFrame) {
      throw new Error("Failed to reset EditorRuntime: no current frame");
    }

    // Create fresh ToolController
    this._toolController = new ToolController(currentFrame.layerManager);
    if (DEBUG) {
      console.log(
        "🔥 ACTUAL TOOLCONTROLLER CONSTRUCTOR 🔥",
        ToolController.toString().slice(0, 300),
      );
    }
    this._toolController.attachUndoManager(currentFrame.undoRedoManager);
    this._toolController.setColor(255, 255, 255, 255);

    // Apply custom brush patch immediately after ToolController instantiation
    this.applyCustomBrushPatch(this._toolController);
    this.applyBrushSpacingPatch(this._toolController);
    this.applyFilterBrushPatch(this._toolController);
  }
}

// Module-level singleton instance
let runtimeInstance: EditorRuntime | null = null;

/**
 * Get the singleton EditorRuntime instance
 * Creates it on first call, reuses it on subsequent calls
 */
export function getEditorRuntime(): EditorRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new EditorRuntime(32, 32);
  }
  return runtimeInstance;
}

/**
 * Reset the singleton instance (used for testing or complete resets)
 */
export function resetEditorRuntime(): void {
  runtimeInstance = null;
}
