/**
 * ToolController.ts
 * Handles drawing interactions for the pixel editor with atomic stroke-based undo transactions, unified preview buffer, keyboard handling, integrated SelectionManager with Aseprite-style workflow, rotation pivot offset fix, rotation mode pointer handling fix, paste operation that immediately forces active transform mode, fixed rotation activation flow where pressing R only arms rotation mode (pivot visible, awaiting click) and rotation starts only when clicking inside the selection while holding R, live lasso path getter for real-time visualization, correct undo transaction behavior across Cut and Paste for all selection tools with transaction guards, rotation commit undo fix that isolates the rotation commit in its own transaction by closing any previous transaction before starting a new one for the pixel write operation when committing rotation transforms via Enter key, rectangle rotation undo fix that starts undo transaction before beginRotation() to capture pixel extraction, deleteSelection(), fillSelection(), outlineSelection() methods for consistent selection actions across all selection tools, getCursorForPosition() method for dynamic cursor hints based on hover position relative to selection bounds, custom brush drawing integration with setCustomBrush() setter and stampCustomBrush() method for true custom brush support, shape preview deduplication system that prevents truncation and performance degradation on large canvases with large brush sizes, Pencil tool default square brush shape configuration, and Text tool layer creation functionality that automatically creates new raster layers for committed text.
 */

import type { Layer } from "./Layer";
import type { LayerManager } from "./LayerManager";
import {
  type ProceduralBrushType,
  generateProceduralStamp,
} from "./ProceduralBrushEngine";
import { SelectionManager } from "./SelectionManager";
import type { UndoRedoManager } from "./UndoRedoManager";

// Font size table: maps font family IDs to allowed font sizes
const FONT_SIZE_TABLE: Record<string, number[]> = {
  "pixel-press-start": [8, 16, 24, 32, 40, 48, 56, 64],
  "pixel-vt323": [16, 24, 32, 40, 48, 56, 64],
  "pixel-silkscreen": [8, 16, 24, 32, 40, 48, 56, 64],
};

export class ToolController {
  private layerManager: LayerManager;
  private undoManager: UndoRedoManager | null = null;
  private selectionManager: SelectionManager;
  private isDrawing = false;
  private isRotating = false;
  private lastX: number | null = null;
  private lastY: number | null = null;
  private lineStartX: number | null = null;
  private lineStartY: number | null = null;
  private rectStartX: number | null = null;
  private rectStartY: number | null = null;
  private circleStart: { x: number; y: number } | null = null;

  // Last pointer position for immediate rotation activation
  private lastPointerPosition: { x: number; y: number } | null = null;

  // Performance optimization: dirty flag for preview updates
  private lastPreviewX: number | null = null;
  private lastPreviewY: number | null = null;

  // Lasso tool state
  private lassoPath: Array<{ x: number; y: number }> = [];

  // Text tool state
  public textBuffer: {
    x: number;
    y: number;
    text: string;
    size: number;
    family: string;
  } | null = null;
  private fontSize = 16;
  private textFontFamily = "pixel-press-start";

  // Text dragging state
  private isDraggingText = false;
  private textDragOffset = { x: 0, y: 0 };

  // Unified preview buffer for all shape tools
  public previewBuffer: Array<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
  }> = [];

  // Clipboard for copy/paste operations
  public clipboard: Array<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
  }> = [];

  // Cached ImageData for move preview buffer (alpha optimization)
  public moveImageData: ImageData | null = null;

  // Brush properties
  private brushSize = 1;
  private brushOpacity = 1.0;

  // Pencil shape property - DEFAULT CHANGED TO SQUARE
  private pencilShape: "round" | "square" = "square";

  // Shape mode property for rectangle and circle tools
  private shapeMode: "stroke" | "fill" = "stroke";

  // Procedural brush properties
  private brushType: ProceduralBrushType = "grass";
  private brushRandomness = 0;
  private brushSaturationShift = 0;
  private brushLightnessShift = 0;

  // Brush tool preset (separate from brushType for pencil/eraser)
  private brushPreset: ProceduralBrushType = "grass";

  // Custom brush data
  private customBrush: {
    width: number;
    height: number;
    pixels: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }>;
  } | null = null;

  // Quick toggle states
  public mirrorX = false;
  public mirrorY = false;
  public pixelPerfect = false;
  public dither = false;

  // Selection state management
  private selectionPhase: "none" | "creating" | "active" | "transforming" =
    "none";
  private selectionSourceTool: "select" | "lasso" | "magic" | null = null;

  private currentTool:
    | "pencil"
    | "eraser"
    | "brush"
    | "line"
    | "rectangle"
    | "circle"
    | "fill"
    | "select"
    | "move"
    | "outline"
    | "eyedropper"
    | "lasso"
    | "magic"
    | "text" = "pencil";
  private currentColor: { r: number; g: number; b: number; a: number } = {
    r: 255,
    g: 255,
    b: 255,
    a: 255,
  };

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    this.selectionManager = new SelectionManager(layerManager);
  }

  /**
   * Set custom brush data for drawing
   * @param brush - Custom brush data with width, height, and pixel array, or null to clear
   */
  public setCustomBrush(
    brush: {
      width: number;
      height: number;
      pixels: Array<{
        x: number;
        y: number;
        r: number;
        g: number;
        b: number;
        a: number;
      }>;
    } | null,
  ): void {
    this.customBrush = brush;
  }

  /**
   * Stamp custom brush at given coordinates
   * Applies custom brush pixel data to the canvas
   */
  private stampCustomBrush(x: number, y: number): void {
    if (!this.customBrush) return;

    const baseX = Math.floor(x);
    const baseY = Math.floor(y);

    for (const p of this.customBrush.pixels) {
      const px = baseX + p.x;
      const py = baseY + p.y;
      this.drawSinglePixelCore(px, py, p.r, p.g, p.b, p.a);
    }
  }

  /**
   * Get cursor for position based on hover position relative to selection bounds
   * Returns appropriate cursor string for visual feedback of available transform actions
   *
   * @param x - World X coordinate
   * @param y - World Y coordinate
   * @returns Cursor string or null if no selection exists
   */
  public getCursorForPosition(x: number, y: number): string | null {
    // Early return if no active selection
    if (!this.selectionManager.hasSelection()) {
      return null;
    }

    const selectionRect = this.selectionManager.getSelectionRect();
    if (!selectionRect) {
      return null;
    }

    // Define edge proximity threshold for resize cursor activation
    const edgeThreshold = 8;

    // Calculate selection bounds
    const minX = selectionRect.x;
    const maxX = selectionRect.x + selectionRect.width - 1;
    const minY = selectionRect.y;
    const maxY = selectionRect.y + selectionRect.height - 1;

    // Check if cursor is over rotation pivot
    const rotationPivot = this.selectionManager.getRotationPivot();
    if (rotationPivot && this.selectionManager.isInRotationMode()) {
      const pivotRadius = 6;
      const dx = x - rotationPivot.x;
      const dy = y - rotationPivot.y;
      if (Math.sqrt(dx * dx + dy * dy) <= pivotRadius) {
        return "crosshair";
      }
    }

    // Calculate distances to edges
    const distToLeft = Math.abs(x - minX);
    const distToRight = Math.abs(x - maxX);
    const distToTop = Math.abs(y - minY);
    const distToBottom = Math.abs(y - maxY);

    // Check corner proximity
    const nearLeft = distToLeft <= edgeThreshold;
    const nearRight = distToRight <= edgeThreshold;
    const nearTop = distToTop <= edgeThreshold;
    const nearBottom = distToBottom <= edgeThreshold;

    // Corner cursors
    if (nearLeft && nearTop) return "nwse-resize";
    if (nearRight && nearTop) return "nesw-resize";
    if (nearLeft && nearBottom) return "nesw-resize";
    if (nearRight && nearBottom) return "nwse-resize";

    // Edge cursors
    if (nearTop && x >= minX && x <= maxX) return "ns-resize";
    if (nearBottom && x >= minX && x <= maxX) return "ns-resize";
    if (nearLeft && y >= minY && y <= maxY) return "ew-resize";
    if (nearRight && y >= minY && y <= maxY) return "ew-resize";

    // Inside selection
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return "move";
    }

    // Outside selection
    return "default";
  }

  /**
   * Delete Selection - clears all pixels inside the current selection
   * Wraps operation in exactly one undo transaction
   * Respects mask for lasso/magic selections
   * Selection remains visible after action
   */
  public deleteSelection(): void {
    // Exit if no active selection
    if (!this.selectionManager.hasSelection()) {
      return;
    }

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const selectionRect = this.selectionManager.getSelectionRect();
    if (!selectionRect) return;

    // Get lasso mask if it exists
    const lassoMask = (this.selectionManager as any).lassoMask;

    // Begin undo transaction
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    // Clear selected pixels
    for (let y = 0; y < selectionRect.height; y++) {
      for (let x = 0; x < selectionRect.width; x++) {
        // Respect lasso/magic mask if present
        if (lassoMask && !lassoMask[y]?.[x]) {
          continue;
        }

        const worldX = selectionRect.x + x;
        const worldY = selectionRect.y + y;

        // Set pixel to transparent
        activeLayer.setPixel(worldX, worldY, 0, 0, 0, 0);
      }
    }

    // End undo transaction
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }

    // Selection remains visible (do not call cancelSelection)
  }

  /**
   * Fill Selection - fills all selected pixels with current color
   * Wraps operation in exactly one undo transaction
   * Respects mask for lasso/magic selections
   * Uses identical blending logic as brush fill
   * Selection remains visible after action
   */
  public fillSelection(): void {
    // Exit if no active selection
    if (!this.selectionManager.hasSelection()) {
      return;
    }

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const selectionRect = this.selectionManager.getSelectionRect();
    if (!selectionRect) return;

    // Get lasso mask if it exists
    const lassoMask = (this.selectionManager as any).lassoMask;

    // Begin undo transaction
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    // Fill selected pixels with current color
    const srcR = this.currentColor.r;
    const srcG = this.currentColor.g;
    const srcB = this.currentColor.b;
    const srcA = (this.currentColor.a / 255) * this.brushOpacity;

    for (let y = 0; y < selectionRect.height; y++) {
      for (let x = 0; x < selectionRect.width; x++) {
        // Respect lasso/magic mask if present
        if (lassoMask && !lassoMask[y]?.[x]) {
          continue;
        }

        const worldX = selectionRect.x + x;
        const worldY = selectionRect.y + y;

        // Get destination pixel for blending
        const dst = activeLayer.getPixel(worldX, worldY);
        if (!dst) {
          // No destination, just set source with opacity
          activeLayer.setPixel(
            worldX,
            worldY,
            srcR,
            srcG,
            srcB,
            Math.round(srcA * 255),
          );
        } else {
          // Blend using Porter-Duff "source over" operator
          const dstR = dst[0];
          const dstG = dst[1];
          const dstB = dst[2];
          const dstA = dst[3] / 255;

          const outA = srcA + dstA * (1 - srcA);

          if (outA === 0) {
            activeLayer.setPixel(worldX, worldY, 0, 0, 0, 0);
          } else {
            const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
            const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
            const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;

            activeLayer.setPixel(
              worldX,
              worldY,
              Math.round(outR),
              Math.round(outG),
              Math.round(outB),
              Math.round(outA * 255),
            );
          }
        }
      }
    }

    // End undo transaction
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }

    // Selection remains visible (do not call cancelSelection)
  }

  /**
   * Outline Selection - draws a 1-pixel outline around selection bounds
   * For rectangle: draws rectangular border (top, bottom, left, right)
   * For lasso/magic: outlines mask perimeter (4-neighbor edge detection)
   * Wraps operation in exactly one undo transaction
   * Uses current color and opacity
   * Selection remains visible after action
   */
  public outlineSelection(): void {
    // Exit if no active selection
    if (!this.selectionManager.hasSelection()) {
      return;
    }

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const selectionRect = this.selectionManager.getSelectionRect();
    if (!selectionRect) return;

    // Get lasso mask if it exists
    const lassoMask = (this.selectionManager as any).lassoMask;

    // Begin undo transaction
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    const srcR = this.currentColor.r;
    const srcG = this.currentColor.g;
    const srcB = this.currentColor.b;
    const srcA = (this.currentColor.a / 255) * this.brushOpacity;

    if (!lassoMask) {
      // Rectangle selection: draw rectangular border
      const minX = selectionRect.x;
      const maxX = selectionRect.x + selectionRect.width - 1;
      const minY = selectionRect.y;
      const maxY = selectionRect.y + selectionRect.height - 1;

      // Top edge
      for (let x = minX; x <= maxX; x++) {
        this.drawOutlinePixel(activeLayer, x, minY, srcR, srcG, srcB, srcA);
      }

      // Bottom edge
      for (let x = minX; x <= maxX; x++) {
        this.drawOutlinePixel(activeLayer, x, maxY, srcR, srcG, srcB, srcA);
      }

      // Left edge
      for (let y = minY; y <= maxY; y++) {
        this.drawOutlinePixel(activeLayer, minX, y, srcR, srcG, srcB, srcA);
      }

      // Right edge
      for (let y = minY; y <= maxY; y++) {
        this.drawOutlinePixel(activeLayer, maxX, y, srcR, srcG, srcB, srcA);
      }
    } else {
      // Lasso/magic selection: outline mask perimeter using 4-neighbor edge detection
      for (let y = 0; y < selectionRect.height; y++) {
        for (let x = 0; x < selectionRect.width; x++) {
          // Skip if pixel is not in mask
          if (!lassoMask[y]?.[x]) {
            continue;
          }

          // Check 4 neighbors
          const hasOutsideNeighbor =
            y === 0 ||
            !lassoMask[y - 1]?.[x] || // up
            y === selectionRect.height - 1 ||
            !lassoMask[y + 1]?.[x] || // down
            x === 0 ||
            !lassoMask[y]?.[x - 1] || // left
            x === selectionRect.width - 1 ||
            !lassoMask[y]?.[x + 1]; // right

          if (hasOutsideNeighbor) {
            const worldX = selectionRect.x + x;
            const worldY = selectionRect.y + y;
            this.drawOutlinePixel(
              activeLayer,
              worldX,
              worldY,
              srcR,
              srcG,
              srcB,
              srcA,
            );
          }
        }
      }
    }

    // End undo transaction
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }

    // Selection remains visible (do not call cancelSelection)
  }

  /**
   * Helper method to draw a single outline pixel with alpha blending
   */
  private drawOutlinePixel(
    layer: Layer,
    x: number,
    y: number,
    srcR: number,
    srcG: number,
    srcB: number,
    srcA: number,
  ): void {
    const dst = layer.getPixel(x, y);
    if (!dst) {
      // No destination, just set source with opacity
      layer.setPixel(x, y, srcR, srcG, srcB, Math.round(srcA * 255));
    } else {
      // Blend using Porter-Duff "source over" operator
      const dstR = dst[0];
      const dstG = dst[1];
      const dstB = dst[2];
      const dstA = dst[3] / 255;

      const outA = srcA + dstA * (1 - srcA);

      if (outA === 0) {
        layer.setPixel(x, y, 0, 0, 0, 0);
      } else {
        const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
        const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
        const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;

        layer.setPixel(
          x,
          y,
          Math.round(outR),
          Math.round(outG),
          Math.round(outB),
          Math.round(outA * 255),
        );
      }
    }
  }

  /**
   * Get current selection rectangle
   * Safe getter for CanvasSurface to access selection state
   */
  public getSelectionRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return this.selectionManager.getSelectionRect();
  }

  /**
   * Get live selection rectangle during creation
   * Safe getter for SelectionOverlay to access real-time selection creation feedback
   */
  public getLiveSelectionRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return this.selectionManager.getLiveSelectionRect();
  }

  /**
   * Get live lasso path during creation
   * Returns array of { x, y } coordinate objects when current tool is "lasso" and selectionPhase is "creating"
   * Returns empty array for all other tool states or selection phases
   */
  public getLiveLassoPath(): Array<{ x: number; y: number }> {
    if (this.currentTool === "lasso" && this.selectionPhase === "creating") {
      return this.lassoPath;
    }
    return [];
  }

  /**
   * Check if a selection exists
   * Safe getter for CanvasSurface to access selection state
   */
  public hasSelection(): boolean {
    return this.selectionManager.hasSelection();
  }

  /**
   * Check if currently in rotation mode
   * Safe getter for CanvasSurface to access rotation state
   */
  public isRotatingSelection(): boolean {
    return this.selectionManager.isInRotationMode();
  }

  /**
   * Get current selection phase
   */
  getSelectionPhase(): "none" | "creating" | "active" | "transforming" {
    return this.selectionPhase;
  }

  /**
   * Get selection source tool (the tool that created the current selection)
   */
  getSelectionSourceTool(): "select" | "lasso" | "magic" | null {
    return this.selectionSourceTool;
  }

  /**
   * Cancel selection from outside (e.g., when clicking outside canvas)
   * Cancels the active selection without committing or switching tools
   */
  public cancelSelectionFromOutside(): void {
    // Cancel the selection through SelectionManager
    this.selectionManager.cancelSelection();

    // Reset internal selection state
    this.selectionPhase = "none";
    this.selectionSourceTool = null;

    // Clear preview buffer
    this.clearPreview();
  }

  /**
   * Paste from clipboard - fully owns the paste workflow
   *
   * Steps:
   * 1. Safely cancel any existing selection
   * 2. Call selectionManager.paste(pixels, width, height, worldX, worldY) to place clipboard data
   * 3. Set this.selectionPhase = "transforming" and this.selectionSourceTool = "select"
   * 4. Explicitly set this.currentTool = "select" to ensure pointer events route through selection handling immediately
   * 5. Compute the center of the new selectionRect and call selectionManager.startMoveOnly(centerX, centerY) to activate the move transform immediately
   * 6. Clear previewBuffer and regenerate the preview once to ensure visibility
   * 7. Do NOT begin or end transaction inside this function
   *
   * @param pixels - Array of pixels in local coordinates (0,0-based)
   * @param width - Width of the clipboard content
   * @param height - Height of the clipboard content
   * @param worldX - X coordinate for paste position (world coordinates)
   * @param worldY - Y coordinate for paste position (world coordinates)
   */
  public pasteFromClipboard(
    pixels: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }>,
    width: number,
    height: number,
    worldX: number,
    worldY: number,
  ): void {
    // Step 1: Safely cancel any existing selection
    if (this.selectionManager.hasSelection()) {
      this.selectionManager.cancelSelection();
    }

    // Step 2: Call selectionManager.paste() to place clipboard data
    this.selectionManager.paste(pixels, width, height, worldX, worldY);

    // Step 3: Set selectionPhase and selectionSourceTool
    this.selectionPhase = "transforming";
    this.selectionSourceTool = "select";

    // Step 4: Explicitly set currentTool to "select" to ensure pointer events route through selection handling immediately
    this.currentTool = "select";

    // Step 5: Compute the center of the new selectionRect and call startMoveOnly()
    const rect = this.selectionManager.getSelectionRect();
    if (rect) {
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      this.selectionManager.startMoveOnly(centerX, centerY);
    }

    // Step 6: Clear previewBuffer and regenerate the preview once
    this.clearPreview();
    this.updateSelectionPreview();

    // Step 7: Do NOT begin or end transaction inside this function
  }

  /**
   * Clear the preview buffer
   */
  clearPreview(): void {
    this.previewBuffer = [];
  }

  /**
   * Attach an UndoRedoManager to this ToolController
   */
  attachUndoManager(manager: UndoRedoManager): void {
    this.undoManager = manager;

    // Also attach to all layers for atomic change tracking
    const layers = this.layerManager.getLayers();
    for (const layer of layers) {
      layer.attachUndoManager(manager);
    }
  }

  /**
   * Set the LayerManager for this ToolController
   * Used to synchronize drawing behavior with the active frame during playback
   * Defensive guard: cancels any active selection before setting the new layerManager
   */
  setLayerManager(layerManager: LayerManager): void {
    // Defensive guard: cancel any active selection before switching layerManager
    if (this.selectionPhase !== "none") {
      this.cancelSelectionFromOutside();
    }

    this.layerManager = layerManager;
    this.selectionManager.setLayerManager(layerManager);
  }

  /**
   * Set the current drawing color
   */
  setColor(r: number, g: number, b: number, a = 255): void {
    this.currentColor = { r, g, b, a };
  }

  /**
   * Set brush type for procedural brush system
   */
  setBrushType(type: ProceduralBrushType): void {
    this.brushType = type;
  }

  /**
   * Set brush preset for Brush tool with validation
   * Validates the preset and defaults to 'grass' if invalid
   */
  setBrushPreset(preset: ProceduralBrushType): void {
    const valid: ProceduralBrushType[] = [
      "grass",
      "stone",
      "cloud",
      "metallic",
      "calligraphy",
      "fur",
      "sparkle",
      "dither",
      "bark",
    ];
    const finalPreset = valid.includes(preset) ? preset : "grass";
    this.brushPreset = finalPreset;
  }

  /**
   * Set pencil shape (round or square)
   */
  public setPencilShape(shape: "round" | "square"): void {
    this.pencilShape = shape;
  }

  /**
   * Set shape mode for rectangle and circle tools (fill or stroke)
   */
  public setShapeMode(mode: "stroke" | "fill"): void {
    this.shapeMode = mode;
  }

  /**
   * Set brush randomness (0.0-1.0)
   */
  setBrushRandomness(randomness: number): void {
    this.brushRandomness = Math.max(0, Math.min(1, randomness));
  }

  /**
   * Set brush saturation shift (-1.0 to 1.0)
   */
  setBrushSaturationShift(shift: number): void {
    this.brushSaturationShift = Math.max(-1, Math.min(1, shift));
  }

  /**
   * Set brush lightness shift (-1.0 to 1.0)
   */
  setBrushLightnessShift(shift: number): void {
    this.brushLightnessShift = Math.max(-1, Math.min(1, shift));
  }

  /**
   * Set brush HSL shift (convenience method)
   */
  setBrushHSLShift(satShift: number, lightShift: number): void {
    this.setBrushSaturationShift(satShift);
    this.setBrushLightnessShift(lightShift);
  }

  /**
   * Get nearest allowed font size for the current font family
   */
  private getNearestAllowedFontSize(size: number, fontId: string): number {
    const allowedSizes =
      FONT_SIZE_TABLE[fontId] || FONT_SIZE_TABLE["pixel-press-start"];

    // Find the nearest allowed size
    let nearest = allowedSizes[0];
    let minDiff = Math.abs(size - nearest);

    for (const allowedSize of allowedSizes) {
      const diff = Math.abs(size - allowedSize);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = allowedSize;
      }
    }

    return nearest;
  }

  /**
   * Set font size for text tool
   * Snaps to nearest allowed font size for the current font family
   */
  public setFontSize(size: number): void {
    const snappedSize = this.getNearestAllowedFontSize(
      size,
      this.textFontFamily,
    );
    this.fontSize = snappedSize;
    if (this.textBuffer) {
      this.textBuffer.size = this.fontSize;
      this.requestPreviewUpdate();
    }
  }

  /**
   * Set font family for text tool
   * Re-snaps font size to valid increments for the new font family
   */
  public setFontFamily(fontId: string): void {
    this.textFontFamily = fontId;

    // Re-snap font size to valid increments for the new font family
    this.fontSize = this.getNearestAllowedFontSize(this.fontSize, fontId);

    if (this.textBuffer) {
      this.textBuffer.family = fontId;
      this.textBuffer.size = this.fontSize;
      this.requestPreviewUpdate();
    }
  }

  /**
   * Get CSS font family string from font family identifier
   * Maps font IDs to Google Fonts (Press Start 2P, VT323, Silkscreen)
   */
  private getFontFamilyString(fontId: string): string {
    switch (fontId) {
      case "pixel-press-start":
        return '"Press Start 2P", monospace';
      case "pixel-vt323":
        return '"VT323", monospace';
      case "pixel-silkscreen":
        return '"Silkscreen", sans-serif';
      default:
        return '"Press Start 2P", monospace';
    }
  }

  /**
   * Check if text tool is active
   * Returns true only when current tool is "text" AND textBuffer is not null
   */
  public isTextActive(): boolean {
    return this.currentTool === "text" && this.textBuffer !== null;
  }

  /**
   * Append character to text buffer
   */
  public appendText(char: string): void {
    if (this.textBuffer) {
      this.textBuffer.text += char;
      this.requestPreviewUpdate();
    }
  }

  /**
   * Backspace text buffer
   */
  public backspaceText(): void {
    if (this.textBuffer && this.textBuffer.text.length > 0) {
      this.textBuffer.text = this.textBuffer.text.slice(0, -1);
      this.requestPreviewUpdate();
    }
  }

  /**
   * Cancel text input
   */
  public cancelText(): void {
    this.textBuffer = null;
    if (this.previewBuffer.length > 0) this.clearPreview();
  }

  /**
   * Commit text to layer
   * Creates a new raster layer for the text and renders all text pixels into it
   * Wraps the entire operation (layer creation + pixel writes) in a single undo transaction
   */
  public commitText(): void {
    if (!this.textBuffer || !this.textBuffer.text) {
      this.textBuffer = null;
      if (this.previewBuffer.length > 0) this.clearPreview();
      return;
    }

    // Retrieve layerManager and undoManager
    const layerManager = this.layerManager;
    const undoManager = this.undoManager;

    // Begin undo transaction
    if (undoManager) {
      undoManager.beginTransaction();
    }

    // Create new text layer with formatted name
    const layerName = `Text – ${this.textBuffer.family} ${this.textBuffer.size}px`;
    const textLayer = layerManager.createLayer(layerName);

    // Create temporary canvas for text rendering
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    if (!tempCtx) {
      this.textBuffer = null;
      if (this.previewBuffer.length > 0) this.clearPreview();
      if (undoManager) {
        undoManager.endTransaction();
      }
      return;
    }

    // Set canvas size large enough for text
    tempCanvas.width = layerManager.canvasWidth;
    tempCanvas.height = layerManager.canvasHeight;

    // Configure text rendering with selected font family
    const fontFamily = this.getFontFamilyString(this.textBuffer.family);
    tempCtx.font = `${this.textBuffer.size}px ${fontFamily}`;
    tempCtx.fillStyle = `rgba(${this.currentColor.r}, ${this.currentColor.g}, ${this.currentColor.b}, ${this.currentColor.a / 255})`;
    tempCtx.textBaseline = "top";

    // Disable smoothing for crisp bitmap text
    tempCtx.imageSmoothingEnabled = false;

    // Draw text with integer-snapped coordinates
    tempCtx.fillText(
      this.textBuffer.text,
      Math.round(this.textBuffer.x),
      Math.round(this.textBuffer.y),
    );

    // Get image data and copy pixels to text layer with opacity blending
    const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
    );
    const data = imageData.data;

    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        const idx = (y * tempCanvas.width + x) * 4;
        const pr = data[idx];
        const pg = data[idx + 1];
        const pb = data[idx + 2];
        const pa = data[idx + 3];

        // Only process pixels with alpha > threshold
        if (pa > 128) {
          // Apply global opacity multiplier to glyph alpha
          const sa = (pa / 255) * this.brushOpacity;

          // Get destination pixel for blending
          const dst = textLayer.getPixel(x, y);
          if (!dst) {
            // No destination, just set source with opacity
            textLayer.setPixel(x, y, pr, pg, pb, Math.round(sa * 255));
          } else {
            // Blend using Porter-Duff "source over" operator
            const dr = dst[0];
            const dg = dst[1];
            const db = dst[2];
            const da = dst[3] / 255;

            const outA = sa + da * (1 - sa);

            if (outA === 0) {
              textLayer.setPixel(x, y, 0, 0, 0, 0);
            } else {
              const outR = (pr * sa + dr * da * (1 - sa)) / outA;
              const outG = (pg * sa + dg * da * (1 - sa)) / outA;
              const outB = (pb * sa + db * da * (1 - sa)) / outA;

              textLayer.setPixel(
                x,
                y,
                Math.round(outR),
                Math.round(outG),
                Math.round(outB),
                Math.round(outA * 255),
              );
            }
          }
        }
      }
    }

    // End undo transaction
    if (undoManager) {
      undoManager.endTransaction();
    }

    // Clear text buffer and preview
    this.textBuffer = null;
    if (this.previewBuffer.length > 0) this.clearPreview();
  }

  /**
   * Request preview update for text tool
   * Triggers renderTextPreview to update previewBuffer
   */
  private requestPreviewUpdate(): void {
    this.renderTextPreview();
  }

  /**
   * Render text preview into previewBuffer using fast, crisp approach
   * Uses small offscreen canvas scaled precisely to text dimensions
   * Disables all smoothing, draws text at (0,0) with 70% preview alpha
   * Uses hard alpha threshold (a > 64) to push only solid pixels into previewBuffer
   * Snaps text positions to integer pixels
   */
  private renderTextPreview(): void {
    if (this.previewBuffer.length > 0) this.clearPreview();

    if (!this.textBuffer || !this.textBuffer.text) return;

    const tb = this.textBuffer;
    const fontFamily = this.getFontFamilyString(tb.family);

    // Create measurement canvas to get text dimensions
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!measureCtx) return;

    measureCtx.font = `${tb.size}px ${fontFamily}`;
    const textWidth = Math.ceil(measureCtx.measureText(tb.text).width);
    const textHeight = tb.size;

    // Create small offscreen canvas scaled precisely to text dimensions
    const offCanvas = document.createElement("canvas");
    offCanvas.width = textWidth;
    offCanvas.height = textHeight;
    const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;

    // Disable all smoothing
    offCtx.imageSmoothingEnabled = false;

    // Configure text rendering
    offCtx.font = `${tb.size}px ${fontFamily}`;
    offCtx.textBaseline = "top";

    // Draw text at (0,0) with 70% preview alpha
    const previewAlpha = this.currentColor.a * 0.7;
    offCtx.fillStyle = `rgba(${this.currentColor.r}, ${this.currentColor.g}, ${this.currentColor.b}, ${previewAlpha / 255})`;
    offCtx.fillText(tb.text, 0, 0);

    // Get image data and use hard alpha threshold (a > 64) to push only solid pixels
    const imageData = offCtx.getImageData(0, 0, textWidth, textHeight);
    const data = imageData.data;

    // Snap text position to integer pixels
    const snappedX = Math.round(tb.x);
    const snappedY = Math.round(tb.y);

    for (let y = 0; y < textHeight; y++) {
      for (let x = 0; x < textWidth; x++) {
        const idx = (y * textWidth + x) * 4;
        const a = data[idx + 3];

        // Hard alpha threshold: only add pixels with a > 64
        if (a > 64) {
          this.previewBuffer.push({
            x: snappedX + x,
            y: snappedY + y,
            r: this.currentColor.r,
            g: this.currentColor.g,
            b: this.currentColor.b,
            a: Math.floor(previewAlpha),
          });
        }
      }
    }
  }

  /**
   * Draw text preview - renders only the caret, not the text glyphs
   * Text glyphs are rendered from previewBuffer
   */
  public drawTextPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.textBuffer) return;

    const tb = this.textBuffer;
    const fontFamily = this.getFontFamilyString(tb.family);

    // Measure text width to position caret
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    if (!measureCtx) return;

    measureCtx.font = `${tb.size}px ${fontFamily}`;
    const textWidth = measureCtx.measureText(tb.text).width;

    // Draw caret at the end of the text
    const caretX = Math.round(tb.x + textWidth);
    const caretY = Math.round(tb.y);
    const caretHeight = tb.size;

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(caretX, caretY, 1, caretHeight);
  }

  /**
   * Set the current tool (pencil, eraser, brush, line, rectangle, circle, fill,
   * select, move, outline, eyedropper, lasso, magic, text)
   *
   * CRITICAL FIX:
   * - Prevents tool switching while textBuffer is active
   * - Switching BETWEEN selection-family tools (select, lasso, move, magic) must NOT
   *   cancel the selection.
   * - Switching AWAY from selection tools to a non-selection tool MUST commit
   *   or cancel the selection (Aseprite behavior).
   * - Switching INTO selection tools must KEEP the existing selection and
   *   redraw the preview.
   * - Leaving the lasso tool resets the lasso path only, not the selection.
   * - Text tool lifecycle: only initialize or clear textBuffer and clear preview when leaving text tool
   */
  setTool(
    tool:
      | "pencil"
      | "eraser"
      | "brush"
      | "line"
      | "rectangle"
      | "circle"
      | "fill"
      | "select"
      | "move"
      | "outline"
      | "eyedropper"
      | "lasso"
      | "magic"
      | "text",
  ): void {
    // Prevent tool switching while text buffer is active
    if (this.textBuffer) return;

    const prevTool = this.currentTool;

    const wasSelectionTool =
      prevTool === "select" ||
      prevTool === "lasso" ||
      prevTool === "move" ||
      prevTool === "magic";
    const goingToSelectionTool =
      tool === "select" ||
      tool === "lasso" ||
      tool === "move" ||
      tool === "magic";

    // Leaving selection tools → commit & clear selection (Aseprite-style)
    if (wasSelectionTool && !goingToSelectionTool) {
      if (this.selectionManager.hasSelection()) {
        // Commit floating pixels
        if (this.selectionManager.isTransforming()) {
          const transformedPixels = this.selectionManager.commitTransform();
          if (transformedPixels.length > 0) {
            this.applyPixelsToLayer(transformedPixels);
          }
        }
        // Now fully clear
        this.selectionManager.cancelSelection();
      }
      if (this.previewBuffer.length > 0) this.clearPreview();

      // Reset selection state when leaving selection tools
      this.selectionPhase = "none";
      this.selectionSourceTool = null;
    }

    // Reset lasso path only when leaving the lasso tool
    if (prevTool === "lasso" && tool !== "lasso") {
      this.lassoPath = [];
    }

    // Handle text tool activation/deactivation
    if (prevTool === "text" && tool !== "text") {
      // Leaving text tool: clear textBuffer and preview
      this.textBuffer = null;
      if (this.previewBuffer.length > 0) this.clearPreview();
    }

    this.currentTool = tool;

    // Switching INTO selection tools (select/lasso/move/magic) → KEEP selection
    if (goingToSelectionTool) {
      if (this.previewBuffer.length > 0) this.clearPreview();
      if (this.selectionManager.hasSelection()) {
        this.updateSelectionPreview();
      }
    } else {
      // Non-selection tools → no preview overlay
      if (this.previewBuffer.length > 0) this.clearPreview();
    }
  }

  /**
   * Set brush size (1-32 pixels)
   */
  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(32, Math.floor(size)));
  }

  /**
   * Set brush opacity (0.0-1.0)
   */
  setBrushOpacity(opacity: number): void {
    this.brushOpacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Enable/disable mirror X
   */
  enableMirrorX(v: boolean): void {
    this.mirrorX = v;
  }

  /**
   * Enable/disable mirror Y
   */
  enableMirrorY(v: boolean): void {
    this.mirrorY = v;
  }

  /**
   * Enable/disable pixel perfect
   */
  enablePixelPerfect(v: boolean): void {
    this.pixelPerfect = v;
  }

  /**
   * Set quick toggle states (legacy compatibility)
   */
  setMirrorX(v: boolean): void {
    this.mirrorX = v;
  }

  setMirrorY(v: boolean): void {
    this.mirrorY = v;
  }

  setPixelPerfect(v: boolean): void {
    this.pixelPerfect = v;
  }

  setDither(v: boolean): void {
    this.dither = v;
  }

  /**
   * Clear the current selection
   */
  clearSelection(): void {
    this.selectionManager.cancelSelection();
    if (this.previewBuffer.length > 0) this.clearPreview();

    // Reset selection state
    this.selectionPhase = "none";
    this.selectionSourceTool = null;
  }

  /**
   * Handle keyboard input
   * Forward keys to selection handler (safe fallback)
   */
  handleKey(key: string): void {
    this.handleSelectionKey(key);
  }

  /**
   * Handle selection key events for Enter, Escape, and R key
   * Enter commits any active transform or stamps floating pixels
   * Escape cancels selection and restores original pixels
   * R_down enters rotation mode without starting transform (pivot visible, awaiting click)
   * R_up ends rotation mode without committing or resetting
   *
   * ROTATION COMMIT FIX:
   * When Enter is pressed during rotation mode, isolate the rotation commit in its own undo transaction
   * by closing any previous transaction before starting a new one for the pixel write operation
   *
   * RECTANGLE ROTATION FIX:
   * When R_down is pressed, start undo transaction BEFORE calling beginRotation() to capture pixel extraction
   */
  handleSelectionKey(key: string): void {
    if (key === "R_down") {
      if (!this.selectionManager.hasSelection()) return;

      // Rectangle rotation extracts & clears pixels during beginRotation()
      // so we MUST be inside an undo transaction first
      if (this.undoManager && !this.undoManager.isInTransaction()) {
        this.undoManager.beginTransaction();
      }

      // Enter rotation mode (arms rotation, shows pivot, awaits click)
      this.selectionManager.beginRotation();
      this.selectionPhase = "active";
      // Do NOT set isRotating = true
      // Do NOT start transform automatically

      this.updateSelectionPreview();
      return;
    }

    if (key === "R_up") {
      if (this.selectionManager.isInRotationMode()) {
        this.selectionManager.endRotation();
        this.isRotating = false;
        this.updateSelectionPreview();
      }
      return;
    }

    if (key === "Escape") {
      // Cancel selection + restore original pixels
      this.selectionManager.cancelSelection();
      if (this.previewBuffer.length > 0) this.clearPreview();

      // Reset selection state
      this.selectionPhase = "none";
      this.selectionSourceTool = null;

      // End transaction if one is active
      if (this.undoManager?.isInTransaction()) {
        this.undoManager.endTransaction();
      }
      return;
    }

    if (key === "Enter") {
      // If a transform is active, commit it first
      if (this.selectionManager.isTransforming()) {
        // ROTATION COMMIT FIX: Isolate rotation commit in its own transaction
        // Step 1: Check if we're committing a rotation transform
        const isRotationCommit = this.selectionManager.isInRotationMode();

        // Step 2: If rotation commit, close any open transaction from earlier operations
        if (
          isRotationCommit &&
          this.undoManager &&
          this.undoManager.isInTransaction()
        ) {
          this.undoManager.endTransaction();
        }

        // Step 3: Start a new transaction for the rotation commit only
        if (isRotationCommit && this.undoManager) {
          this.undoManager.beginTransaction();
        }

        // Step 4: Commit the transform and apply pixels
        const transformedPixels = this.selectionManager.commitTransform();
        if (transformedPixels.length > 0) {
          this.applyPixelsToLayer(transformedPixels);
        }

        // Step 5: End the rotation commit transaction
        if (isRotationCommit && this.undoManager) {
          this.undoManager.endTransaction();
        }
      }

      // After Enter, clear selection outline and floating state
      this.selectionManager.cancelSelection();
      if (this.previewBuffer.length > 0) this.clearPreview();

      // Reset selection state
      this.selectionPhase = "none";
      this.selectionSourceTool = null;
    }
  }

  /**
   * Activate immediate move transform after paste
   * Called after selectionManager.paste() completes and floating pixels exist
   *
   * Steps:
   * 1. Retrieve selectionRect from selectionManager
   * 2. Compute its center
   * 3. Call selectionManager.startMoveOnly(cx, cy) to initialize move transform
   * 4. Set this.selectionPhase = "transforming"
   * 5. Call this.updateSelectionPreview() once to ensure visible transform state
   */
  public activatePasteTransform(): void {
    // Step 1: Retrieve selectionRect from selectionManager
    const rect = this.selectionManager.getSelectionRect();
    if (!rect) return;

    // Step 2: Compute center of selection rectangle
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;

    // Step 3: Call selectionManager.startMoveOnly(cx, cy) to initialize move transform
    this.selectionManager.startMoveOnly(cx, cy);

    // Step 4: Set this.selectionPhase = "transforming" to match selection interaction state
    this.selectionPhase = "transforming";

    // Step 5: Call this.updateSelectionPreview() once to ensure visible transform state
    this.updateSelectionPreview();
  }

  /**
   * Handle pointer down event - initialize stroke state and begin transaction
   */
  pointerDown(x: number, y: number, _shiftKey = false): void {
    // Handle text tool with drag detection
    if (this.currentTool === "text") {
      // Check if clicking on existing text to drag it
      if (this.textBuffer) {
        const tb = this.textBuffer;

        // Create temporary canvas to measure text
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          const fontFamily = this.getFontFamilyString(tb.family);
          ctx.font = `${tb.size}px ${fontFamily}`;
          const width = ctx.measureText(tb.text).width;
          const height = tb.size;

          const inside =
            x >= tb.x && x <= tb.x + width && y >= tb.y && y <= tb.y + height;

          if (inside) {
            this.isDraggingText = true;
            this.textDragOffset.x = x - tb.x;
            this.textDragOffset.y = y - tb.y;
            return;
          }
        }
      }

      // Not clicking on existing text, create new text buffer
      this.textBuffer = {
        x: Math.floor(x),
        y: Math.floor(y),
        text: "",
        size: this.fontSize,
        family: this.textFontFamily,
      };
      if (this.previewBuffer.length > 0) this.clearPreview();
      return;
    }

    // Handle eyedropper tool - sample pixel and update UI
    if (this.currentTool === "eyedropper") {
      const activeLayer = this.layerManager.getActiveLayer();
      if (!activeLayer) return;

      // Sample pixel at (x, y) with bounds checking
      const px = Math.floor(x);
      const py = Math.floor(y);

      if (
        px >= 0 &&
        px < this.layerManager.canvasWidth &&
        py >= 0 &&
        py < this.layerManager.canvasHeight
      ) {
        const pixel = activeLayer.getPixel(px, py);
        if (pixel) {
          // Set brush color from sampled RGBA values
          this.setColor(pixel[0], pixel[1], pixel[2], pixel[3]);

          // Update UI using window.editor.setPrimaryColorFromOutside if available
          if ((window as any).editor?.setPrimaryColorFromOutside) {
            (window as any).editor.setPrimaryColorFromOutside(
              pixel[0],
              pixel[1],
              pixel[2],
              pixel[3],
            );
          }
        }
      }
      return;
    }

    this.isDrawing = true;

    if (this.currentTool === "fill") {
      // Begin transaction for fill operation
      if (this.undoManager) {
        this.undoManager.beginTransaction();
      }
      this.floodFill(x, y);
      if (this.undoManager) {
        this.undoManager.endTransaction();
      }
      return;
    }

    if (this.currentTool === "outline") {
      this.outlineBlob(x, y);
      return;
    }

    // Handle magic select tool - flood-fill contiguous pixels and create selection
    if (this.currentTool === "magic") {
      this.magicSelect(x, y);
      return;
    }

    // Handle lasso tool
    if (this.currentTool === "lasso") {
      // Start recording lasso path
      this.lassoPath = [];
      this.lassoPath.push({ x: Math.floor(x), y: Math.floor(y) });

      // Set selection phase to creating
      this.selectionPhase = "creating";
      return;
    }

    // Handle select and move tools with SelectionManager
    if (this.currentTool === "select" || this.currentTool === "move") {
      // Check if rotation mode is active and a selection exists
      if (
        this.selectionManager.isInRotationMode() &&
        this.selectionManager.hasSelection()
      ) {
        // Check if pointer is over floating pixels
        const overFloatingPixels =
          this.selectionManager.isPointOverFloatingPixels(x, y);

        // If over floating pixels, begin rotation transform
        if (overFloatingPixels) {
          this.undoManager?.beginTransaction();
          this.selectionManager.beginTransform("rotate", x, y);
          this.isRotating = true;
          this.selectionPhase = "transforming";
          this.updateSelectionPreview();
          return;
        }
      }

      const hit = this.selectionManager.hitTest(x, y);

      if (hit === "inside") {
        if (!this.selectionManager.hasFloatingPixels()) {
          // Begin transaction before extracting floating pixels
          if (this.undoManager && !this.undoManager.isInTransaction()) {
            this.undoManager.beginTransaction();
          }
          this.selectionManager.beginTransform("move", x, y); // extracts floating
          this.selectionPhase = "transforming";
        } else {
          this.selectionManager.startMoveOnly(x, y); // new method
          this.selectionPhase = "transforming";
        }
        this.updateSelectionPreview();
        return;
      }
      if (hit === "edge" || hit === "corner") {
        // Begin scale transform
        const transformType = this.determineTransformType(x, y);
        if (transformType) {
          // Begin transaction before scale transform
          if (this.undoManager && !this.undoManager.isInTransaction()) {
            this.undoManager.beginTransaction();
          }
          this.selectionManager.beginTransform(transformType, x, y);
          this.selectionPhase = "transforming";
          this.updateSelectionPreview();
        }
      } else {
        // Outside - cancel previous selection and start new one
        this.selectionManager.cancelSelection();
        this.selectionManager.beginSelection(x, y);
        this.selectionPhase = "creating";
        this.selectionSourceTool = "select";
        this.updateSelectionPreview();
      }
      return;
    }

    // Begin transaction for continuous stroke tools
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    if (this.currentTool === "line") {
      // Line tool: store start position
      this.lineStartX = x;
      this.lineStartY = y;
    } else if (this.currentTool === "rectangle") {
      // Rectangle tool: store start position
      this.rectStartX = x;
      this.rectStartY = y;
    } else if (this.currentTool === "circle") {
      // Circle tool: store center position
      this.circleStart = { x, y };
      if (this.previewBuffer.length > 0) this.clearPreview();
    } else {
      // Pencil/Eraser/Brush: initialize stroke state and draw first pixel
      this.lastX = x;
      this.lastY = y;
      this.drawPixel(x, y);
    }
  }

  /**
   * Handle pointer move event - interpolate between last and current coordinates for smooth strokes
   * In rotation mode, only update rotation if isRotating === true
   * PATCH 2: Start interpolation at i=1 to prevent redrawing initial pixel
   * PATCH 3: Round interpolation coordinates to prevent drift
   * SLOWDOWN FIX: No preview updates during continuous brush strokes
   */
  pointerMove(
    e: PointerEvent,
    x: number,
    y: number,
    _shiftKey = false,
    altKey = false,
    _ctrlKey = false,
    _metaKey = false,
  ): void {
    // Track last pointer position for immediate rotation activation
    this.lastPointerPosition = { x, y };

    // Handle text dragging
    if (this.textBuffer && this.isDraggingText) {
      this.textBuffer.x = Math.floor(x - this.textDragOffset.x);
      this.textBuffer.y = Math.floor(y - this.textDragOffset.y);
      this.requestPreviewUpdate();
      return;
    }

    // Rotation mode: only update rotation if isRotating === true
    if (this.selectionManager.isInRotationMode()) {
      // ALT + left mouse drag = move pivot only
      if (altKey && e.buttons & 1) {
        this.selectionManager.updateRotation(x, y, true);
        this.updateSelectionPreview();
        return;
      }

      // If actively rotating (isRotating === true), update rotation
      if (this.isRotating) {
        this.selectionManager.updateRotation(x, y, false);
        this.updateSelectionPreview();
        return;
      }

      // Even if not actively rotating, consume the event in rotation mode
      return;
    }

    // SLOWDOWN FIX: No preview updates during continuous brush strokes.
    if (
      this.isDrawing &&
      (this.currentTool === "pencil" ||
        this.currentTool === "eraser" ||
        this.currentTool === "brush")
    ) {
      this.drawInterpolatedStroke(x, y);
      return;
    }

    if (!this.isDrawing) {
      return;
    }

    // Handle lasso tool - append points but do NOT draw incremental preview lines
    if (this.currentTool === "lasso") {
      const px = Math.floor(x);
      const py = Math.floor(y);

      // Only add point if it's different from the last point
      if (
        this.lassoPath.length === 0 ||
        this.lassoPath[this.lassoPath.length - 1].x !== px ||
        this.lassoPath[this.lassoPath.length - 1].y !== py
      ) {
        this.lassoPath.push({ x: px, y: py });
        // DO NOT call updateLassoPreview() here to prevent outline pixels from being added
      }
      return;
    }

    if (this.currentTool === "select" || this.currentTool === "move") {
      // If we're currently transforming (move/resize/rotate), update the transform.
      if (this.selectionManager.isTransforming()) {
        this.selectionManager.updateTransform(x, y);
      } else if (this.selectionManager.isCreating()) {
        // Otherwise we're creating a new selection.
        this.selectionManager.updateSelection(x, y);
      }

      // Always update preview buffer with outline + floating pixels
      this.updateSelectionPreview();
      return;
    }

    if (this.currentTool === "line") {
      // Line tool: compute preview pixels using Bresenham's algorithm
      if (this.lineStartX !== null && this.lineStartY !== null) {
        // Dirty flag check
        if (x !== this.lastPreviewX || y !== this.lastPreviewY) {
          this.computeLinePreview(this.lineStartX, this.lineStartY, x, y);
          this.lastPreviewX = x;
          this.lastPreviewY = y;
        }
      }
      return;
    }

    if (this.currentTool === "rectangle") {
      // Rectangle tool: populate previewBuffer with rectangle outline pixels
      if (this.rectStartX !== null && this.rectStartY !== null) {
        // Dirty flag check
        if (x !== this.lastPreviewX || y !== this.lastPreviewY) {
          this.computeRectanglePreview(this.rectStartX, this.rectStartY, x, y);
          this.lastPreviewX = x;
          this.lastPreviewY = y;
        }
      }
      return;
    }

    if (this.currentTool === "circle") {
      // Circle tool: compute preview pixels
      if (this.circleStart) {
        // Dirty flag check
        if (x !== this.lastPreviewX || y !== this.lastPreviewY) {
          this.computeCirclePreview(
            this.circleStart.x,
            this.circleStart.y,
            x,
            y,
          );
          this.lastPreviewX = x;
          this.lastPreviewY = y;
        }
      }
      return;
    }

    if (
      this.currentTool === "fill" ||
      this.currentTool === "outline" ||
      this.currentTool === "magic" ||
      this.currentTool === "text"
    ) {
      // Fill, Outline, Magic, and Text tools: no action during pointer move
      return;
    }
  }

  /**
   * Draw interpolated stroke between last and current position
   * Helper method for continuous brush strokes (pencil, eraser, brush)
   */
  private drawInterpolatedStroke(x: number, y: number): void {
    if (this.lastX === null || this.lastY === null) return;

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance);

    // Start at 1 so we do NOT redraw the initial pixel
    for (let i = 1; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const interpX = Math.round(this.lastX + dx * t);
      const interpY = Math.round(this.lastY + dy * t);
      this.drawPixel(interpX, interpY);
    }

    // Update last position
    this.lastX = x;
    this.lastY = y;
  }

  /**
   * Handle pointer up event - finalize stroke and end transaction
   * PATCH 1: Pencil & Eraser must NOT draw on pointerUp (prevents double-draw and alpha reset)
   */
  pointerUp(x: number, y: number): void {
    // End text dragging
    if (this.isDraggingText) {
      this.isDraggingText = false;
      return;
    }

    this.isRotating = false;

    // Reset dirty flags
    this.lastPreviewX = null;
    this.lastPreviewY = null;

    // Handle lasso tool - finalize polygon and create selection
    if (this.currentTool === "lasso") {
      if (this.lassoPath.length >= 3) {
        // Begin transaction before creating selection from lasso path
        if (this.undoManager && !this.undoManager.isInTransaction()) {
          this.undoManager.beginTransaction();
        }

        this.selectionManager.createSelectionFromLassoPath(this.lassoPath);

        // Set selection state
        this.selectionPhase = "active";
        this.selectionSourceTool = "lasso";

        // Switch to SELECT tool (Aseprite-style behavior)
        this.currentTool = "select";

        // Update preview once at the end
        this.updateSelectionPreview();
      }

      this.lassoPath = [];
      this.isDrawing = false;

      return;
    }

    if (this.currentTool === "select" || this.currentTool === "move") {
      // If creating, commit the selection
      if (this.selectionManager.isCreating()) {
        this.selectionManager.commitSelection();
        this.selectionPhase = "active";
        this.updateSelectionPreview();
      }

      this.isDrawing = false;
      return;
    }
    if (
      this.currentTool === "line" &&
      this.lineStartX !== null &&
      this.lineStartY !== null
    ) {
      // Line tool: draw the final line using Bresenham's algorithm
      this.drawLine(this.lineStartX, this.lineStartY, x, y);
      this.lineStartX = null;
      this.lineStartY = null;

      // Clear preview buffer after commit
      if (this.previewBuffer.length > 0) this.clearPreview();

      // End transaction for line operation
      if (this.undoManager) {
        this.undoManager.endTransaction();
      }
    } else if (
      this.currentTool === "rectangle" &&
      this.rectStartX !== null &&
      this.rectStartY !== null
    ) {
      // Rectangle tool: draw the rectangle based on shapeMode
      this.commitRectangle(this.rectStartX, this.rectStartY, x, y);
      this.rectStartX = null;
      this.rectStartY = null;

      // Clear preview buffer after commit
      if (this.previewBuffer.length > 0) this.clearPreview();

      // End transaction for rectangle operation
      if (this.undoManager) {
        this.undoManager.endTransaction();
      }
    } else if (this.currentTool === "circle" && this.circleStart) {
      // Circle tool: draw the circle based on shapeMode
      this.commitCircle(this.circleStart.x, this.circleStart.y, x, y);
      this.circleStart = null;
      if (this.previewBuffer.length > 0) this.clearPreview();

      // End transaction for circle operation
      if (this.undoManager) {
        this.undoManager.endTransaction();
      }
    } else if (this.currentTool === "pencil" || this.currentTool === "eraser") {
      // PATCH 1: Pencil & Eraser must NOT draw on pointerUp (prevents double-draw and alpha reset)
      this.endTransaction();
      return;
    } else if (this.currentTool === "brush") {
      // End transaction for brush stroke
      if (this.undoManager) {
        this.undoManager.endTransaction();
      }
    }

    // Reset drawing state for all tools
    this.isDrawing = false;
    this.lastX = null;
    this.lastY = null;
  }

  /**
   * End transaction helper for pencil/eraser
   */
  private endTransaction(): void {
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }
    this.isDrawing = false;
    this.lastX = null;
    this.lastY = null;
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Push preview pixel with deduplication
   * Ensures each pixel appears only once per frame in the preview buffer
   *
   * @param visited - Uint8Array tracking visited pixels
   * @param px - Pixel X coordinate
   * @param py - Pixel Y coordinate
   * @param r - Red channel
   * @param g - Green channel
   * @param b - Blue channel
   * @param a - Alpha channel
   */
  private pushPreviewPixelDedup(
    visited: Uint8Array,
    px: number,
    py: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const w = this.layerManager.canvasWidth;
    const h = this.layerManager.canvasHeight;
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const idx = py * w + px;
    if (visited[idx]) return;
    visited[idx] = 1;
    this.previewBuffer.push({ x: px, y: py, r, g, b, a });
  }

  /**
   * Magic Select: Flood-fill contiguous pixels and convert to floating selection
   * Uses BFS to identify contiguous region, computes bounding box, builds binary mask,
   * extracts floating pixels, and automatically switches to SELECT tool
   */
  private magicSelect(x: number, y: number): void {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Ensure coordinates are integers and within bounds
    const startX = Math.floor(x);
    const startY = Math.floor(y);

    if (
      startX < 0 ||
      startX >= this.layerManager.canvasWidth ||
      startY < 0 ||
      startY >= this.layerManager.canvasHeight
    ) {
      return;
    }

    // Get the target color at the starting position
    const targetColor = activeLayer.getPixel(startX, startY);
    if (!targetColor) return;

    const width = this.layerManager.canvasWidth;
    const height = this.layerManager.canvasHeight;

    // Create a visited array to track blob pixels
    const visited = new Uint8Array(width * height);

    // Queue for BFS traversal to identify the blob
    const queue: Array<{ x: number; y: number }> = [];
    queue.push({ x: startX, y: startY });
    visited[startY * width + startX] = 1;

    // Set to store all blob pixels
    const blobPixels = new Set<number>();
    blobPixels.add(startY * width + startX);

    // Helper function to check if a color matches the target color
    const matchesTarget = (
      r: number,
      g: number,
      b: number,
      a: number,
    ): boolean => {
      return (
        r === targetColor[0] &&
        g === targetColor[1] &&
        b === targetColor[2] &&
        a === targetColor[3]
      );
    };

    // Identify all pixels in the blob using 4-direction flood-fill (BFS)
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      const { x: cx, y: cy } = current;

      // Check all four neighbors (up, down, left, right)
      const neighbors = [
        { x: cx, y: cy - 1 }, // up
        { x: cx, y: cy + 1 }, // down
        { x: cx - 1, y: cy }, // left
        { x: cx + 1, y: cy }, // right
      ];

      for (const neighbor of neighbors) {
        const { x: nx, y: ny } = neighbor;

        // Check bounds
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        // Check if already visited
        const index = ny * width + nx;
        if (visited[index]) {
          continue;
        }

        // Check if the neighbor matches the target color
        const neighborColor = activeLayer.getPixel(nx, ny);
        if (!neighborColor) continue;

        if (
          matchesTarget(
            neighborColor[0],
            neighborColor[1],
            neighborColor[2],
            neighborColor[3],
          )
        ) {
          visited[index] = 1;
          blobPixels.add(index);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // If no pixels found, return early
    if (blobPixels.size === 0) {
      this.isDrawing = false;
      return;
    }

    // Compute bounding box of the blob
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (const pixelIndex of blobPixels) {
      const px = pixelIndex % width;
      const py = Math.floor(pixelIndex / width);

      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    // Calculate selection rectangle dimensions
    const rectWidth = maxX - minX + 1;
    const rectHeight = maxY - minY + 1;

    // Build binary mask for precise region shape (Uint8Array format)
    const binaryMask = new Uint8Array(rectWidth * rectHeight);

    for (const pixelIndex of blobPixels) {
      const px = pixelIndex % width;
      const py = Math.floor(pixelIndex / width);

      const localX = px - minX;
      const localY = py - minY;
      binaryMask[localY * rectWidth + localX] = 1;
    }

    // Begin transaction before creating selection from magic select
    if (this.undoManager && !this.undoManager.isInTransaction()) {
      this.undoManager.beginTransaction();
    }

    // Use SelectionManager's public method to create the selection
    this.selectionManager.createSelectionFromMagicSelect(
      minX,
      minY,
      rectWidth,
      rectHeight,
      binaryMask,
    );

    // Set selection state
    this.selectionSourceTool = "magic";
    this.selectionPhase = "active";

    // Force immediate preview drawing
    this.updateSelectionPreview();

    // Reset drawing state
    this.isDrawing = false;

    // Automatically switch to SELECT tool for transformation
    // Do NOT overwrite selectionSourceTool
    this.currentTool = "select";

    // Force one more preview refresh after tool switch
    if (this.selectionManager.hasSelection()) {
      this.updateSelectionPreview();
    }
  }

  /**
   * Update lasso preview - draws temporary white outline of the path
   * REMOVED: This method is no longer called to prevent lasso outline pixels from being added to previewBuffer
   */
  private updateLassoPreview(): void {
    // REMOVED: No longer draws lasso outline pixels to previewBuffer
    // The lasso path is tracked internally but not rendered as a preview
  }

  /**
   * Apply floating pixels to active layer (only called on commit)
   * Note: floating preview NEVER writes to layer until Enter or pointerUp commit.
   */
  private applyPixelsToLayer(
    pixels: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }>,
  ): void {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const rect = this.selectionManager.getSelectionRect();
    if (!rect) return;

    for (const pixel of pixels) {
      const worldX = rect.x + pixel.x;
      const worldY = rect.y + pixel.y;

      if (
        worldX >= 0 &&
        worldX < this.layerManager.canvasWidth &&
        worldY >= 0 &&
        worldY < this.layerManager.canvasHeight
      ) {
        activeLayer.setPixel(
          worldX,
          worldY,
          pixel.r,
          pixel.g,
          pixel.b,
          pixel.a,
        );
      }
    }
  }

  /**
   * Update selection preview buffer — non-destructive.
   * Shows floating pixels whenever hasFloatingPixels() returns true, regardless of transformation state.
   * If in rotation mode, suppresses all visual outline rendering.
   * PATCH 1: Floating pixels are treated as WORLD COORDINATES with hard clipping to prevent wrap/teleport preview.
   * PATCH 2: Selection outline pixels removed from preview buffer to support pure SVG overlay rendering.
   * PATCH 3: Removed 2×2 pivot square rendering - pivot is now exclusively handled by SelectionOverlay.tsx SVG.
   * PATCH 4: Explicitly prevent lasso outline pixels from being added to the preview buffer.
   */
  private updateSelectionPreview(): void {
    if (this.previewBuffer.length > 0) this.clearPreview();

    const floating = this.selectionManager.getFloatingPixels();
    const _rect = this.selectionManager.getSelectionRect();
    const width = this.layerManager.canvasWidth;
    const height = this.layerManager.canvasHeight;

    // PATCH 1: Floating pixels are treated as WORLD COORDINATES
    if (floating.length > 0 && this.selectionManager.hasFloatingPixels()) {
      for (const px of floating) {
        const wx = px.x;
        const wy = px.y;

        // HARD CLIP — prevents wrap / teleport preview
        if (wx < 0 || wy < 0 || wx >= width || wy >= height) continue;

        this.previewBuffer.push({
          x: wx,
          y: wy,
          r: px.r,
          g: px.g,
          b: px.b,
          a: px.a,
        });
      }
    }

    // If in rotation mode, suppress all visual outline rendering
    if (this.selectionManager.isInRotationMode()) {
      // PATCH 3: Removed 2×2 pivot square rendering
      // Pivot rendering is now exclusively handled by SelectionOverlay.tsx

      return; // Skip outline rendering
    }

    // PATCH 2: Selection outline pixels removed from preview buffer
    // Outline rendering is now handled by SelectionOverlay.tsx (pure SVG overlay)

    // PATCH 4: Explicitly prevent lasso outline pixels from being added
    // The lasso path is tracked internally but not rendered as a preview
  }

  /**
   * Determine transform type based on pointer position
   */
  private determineTransformType(
    x: number,
    y: number,
  ):
    | "scale-nw"
    | "scale-ne"
    | "scale-sw"
    | "scale-se"
    | "scale-n"
    | "scale-e"
    | "scale-s"
    | "scale-w"
    | "move"
    | null {
    const rect = this.selectionManager.getSelectionRect();
    if (!rect) return null;

    const threshold = 0; // 1-pixel precision

    // Calculate inclusive bounds
    const minX = rect.x;
    const maxX = rect.x + rect.width - 1;
    const minY = rect.y;
    const maxY = rect.y + rect.height - 1;

    // Check corners first (inclusive bounds)
    if (Math.abs(x - minX) <= threshold && Math.abs(y - minY) <= threshold)
      return "scale-nw";
    if (Math.abs(x - maxX) <= threshold && Math.abs(y - minY) <= threshold)
      return "scale-ne";
    if (Math.abs(x - minX) <= threshold && Math.abs(y - maxY) <= threshold)
      return "scale-sw";
    if (Math.abs(x - maxX) <= threshold && Math.abs(y - maxY) <= threshold)
      return "scale-se";

    // Check edges (inclusive bounds)
    if (Math.abs(y - minY) <= threshold && x >= minX && x <= maxX)
      return "scale-n";
    if (Math.abs(y - maxY) <= threshold && x >= minX && x <= maxX)
      return "scale-s";
    if (Math.abs(x - minX) <= threshold && y >= minY && y <= maxY)
      return "scale-w";
    if (Math.abs(x - maxX) <= threshold && y >= minY && y <= maxY)
      return "scale-e";

    // Check inside (inclusive bounds)
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return "move";

    return null;
  }

  /**
   * Safe import: cancels any active drawing or text input before importing.
   * Directly adds a centered layer without transform overlay.
   */
  startImportTransform(imageData: ImageData, name?: string): void {
    // Cancel any active drawing state
    this.isDrawing = false;

    // Cancel any active text input
    this.textBuffer = null;

    // Reset text start position (if any)
    this.lineStartX = null;
    this.lineStartY = null;

    // Import image centered into active layer
    this.layerManager.importImageCentered(imageData, name || "Imported Image");

    // Clear preview buffer
    if (this.previewBuffer.length > 0) this.clearPreview();
  }

  /**
   * No-op (legacy stub)
   */
  commitImportTransform(): void {
    // No-op (legacy stub)
  }

  /**
   * No-op (legacy stub)
   */
  cancelImportTransform(): void {
    // No-op (legacy stub)
  }

  /**
   * Outline a contiguous blob of same-colored pixels starting at (x, y)
   * Identifies the blob using 4-direction flood-fill, determines perimeter pixels,
   * and draws those perimeter pixels using the current brush color with alpha blending.
   * All changes are wrapped in an atomic undo/redo transaction.
   */
  private outlineBlob(x: number, y: number): void {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Check if layer is locked
    if (activeLayer.locked) return;

    // Ensure coordinates are integers and within bounds
    const startX = Math.floor(x);
    const startY = Math.floor(y);

    if (
      startX < 0 ||
      startX >= this.layerManager.canvasWidth ||
      startY < 0 ||
      startY >= this.layerManager.canvasHeight
    ) {
      return;
    }

    // Get the target color at the starting position
    const targetColor = activeLayer.getPixel(startX, startY);
    if (!targetColor) return;

    const width = this.layerManager.canvasWidth;
    const height = this.layerManager.canvasHeight;

    // Create a visited array to track blob pixels
    const visited = new Uint8Array(width * height);

    // Queue for BFS traversal to identify the blob
    const queue: Array<{ x: number; y: number }> = [];
    queue.push({ x: startX, y: startY });
    visited[startY * width + startX] = 1;

    // Set to store all blob pixels
    const blobPixels = new Set<number>();
    blobPixels.add(startY * width + startX);

    // Helper function to check if a color matches the target color
    const matchesTarget = (
      r: number,
      g: number,
      b: number,
      a: number,
    ): boolean => {
      return (
        r === targetColor[0] &&
        g === targetColor[1] &&
        b === targetColor[2] &&
        a === targetColor[3]
      );
    };

    // Identify all pixels in the blob using 4-direction flood-fill
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      const { x: cx, y: cy } = current;

      // Check all four neighbors (up, down, left, right)
      const neighbors = [
        { x: cx, y: cy - 1 }, // up
        { x: cx, y: cy + 1 }, // down
        { x: cx - 1, y: cy }, // left
        { x: cx + 1, y: cy }, // right
      ];

      for (const neighbor of neighbors) {
        const { x: nx, y: ny } = neighbor;

        // Check bounds
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        // Check if already visited
        const index = ny * width + nx;
        if (visited[index]) {
          continue;
        }

        // Check if the neighbor matches the target color
        const neighborColor = activeLayer.getPixel(nx, ny);
        if (!neighborColor) continue;

        if (
          matchesTarget(
            neighborColor[0],
            neighborColor[1],
            neighborColor[2],
            neighborColor[3],
          )
        ) {
          visited[index] = 1;
          blobPixels.add(index);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Determine perimeter pixels: blob pixels with at least one non-blob neighbor
    const perimeterPixels: Array<{ x: number; y: number }> = [];

    for (const pixelIndex of blobPixels) {
      const px = pixelIndex % width;
      const py = Math.floor(pixelIndex / width);

      // Check 4 neighbors
      const neighbors = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 }, // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }, // right
      ];

      let isPerimeter = false;

      for (const neighbor of neighbors) {
        const nx = px + neighbor.dx;
        const ny = py + neighbor.dy;

        // Check if neighbor is out of bounds or not in blob
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          isPerimeter = true;
          break;
        }

        const neighborIndex = ny * width + nx;
        if (!blobPixels.has(neighborIndex)) {
          isPerimeter = true;
          break;
        }
      }

      if (isPerimeter) {
        perimeterPixels.push({ x: px, y: py });
      }
    }

    // Begin transaction for outline operation
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    // Draw the perimeter pixels using the current brush color with alpha blending
    const opacity = this.brushOpacity; // 0–1
    const srcR = this.currentColor.r;
    const srcG = this.currentColor.g;
    const srcB = this.currentColor.b;
    const srcA = (this.currentColor.a / 255) * opacity;

    for (const pixel of perimeterPixels) {
      const dst = activeLayer.getPixel(pixel.x, pixel.y);
      if (dst) {
        const dstR = dst[0] / 255;
        const dstG = dst[1] / 255;
        const dstB = dst[2] / 255;
        const dstA = dst[3] / 255;

        const outA = srcA + dstA * (1 - srcA);
        const outR = ((srcR / 255) * srcA + dstR * dstA * (1 - srcA)) / outA;
        const outG = ((srcG / 255) * srcA + dstG * dstA * (1 - srcA)) / outA;
        const outB = ((srcB / 255) * srcA + dstB * dstA * (1 - srcA)) / outA;

        activeLayer.setPixel(
          pixel.x,
          pixel.y,
          Math.round(outR * 255),
          Math.round(outG * 255),
          Math.round(outB * 255),
          Math.round(outA * 255),
        );
      }
    }

    // End transaction for outline operation
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }
  }

  /**
   * Compute line preview pixels using Bresenham's algorithm with deduplication
   * Populates previewBuffer with pixels respecting brush size and color
   */
  private computeLinePreview(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    if (this.previewBuffer.length > 0) this.clearPreview();

    // Create visited buffer for deduplication
    const visited = new Uint8Array(
      this.layerManager.canvasWidth * this.layerManager.canvasHeight,
    );

    // Get line pixels using Bresenham's algorithm
    const linePixels = this.computeLinePixels(x0, y0, x1, y1);

    // For each line pixel, apply brush size and add to preview buffer with deduplication
    const halfSize = Math.floor(this.brushSize / 2);
    const finalAlpha = Math.floor(this.currentColor.a * this.brushOpacity);

    for (const linePixel of linePixels) {
      for (let dy = -halfSize; dy < this.brushSize - halfSize; dy++) {
        for (let dx = -halfSize; dx < this.brushSize - halfSize; dx++) {
          const px = Math.floor(linePixel.x) + dx;
          const py = Math.floor(linePixel.y) + dy;

          this.pushPreviewPixelDedup(
            visited,
            px,
            py,
            this.currentColor.r,
            this.currentColor.g,
            this.currentColor.b,
            finalAlpha,
          );
        }
      }
    }
  }

  /**
   * Compute rectangle preview pixels based on shapeMode with deduplication
   * Populates previewBuffer with rectangle pixels respecting brush size, color, and mode (fill or stroke)
   */
  private computeRectanglePreview(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    if (this.previewBuffer.length > 0) this.clearPreview();

    // Create visited buffer for deduplication
    const visited = new Uint8Array(
      this.layerManager.canvasWidth * this.layerManager.canvasHeight,
    );

    let rectPixels: Array<{ x: number; y: number }> = [];

    if (this.shapeMode === "fill") {
      rectPixels = this.computeRectangleFillPixels(x0, y0, x1, y1);
    } else if (this.shapeMode === "stroke") {
      rectPixels = this.computeRectanglePixels(x0, y0, x1, y1);
    }

    // For each rectangle pixel, apply brush size and add to preview buffer with deduplication
    const halfSize = Math.floor(this.brushSize / 2);
    const finalAlpha = Math.floor(this.currentColor.a * this.brushOpacity);

    for (const rectPixel of rectPixels) {
      for (let dy = -halfSize; dy < this.brushSize - halfSize; dy++) {
        for (let dx = -halfSize; dx < this.brushSize - halfSize; dx++) {
          const px = Math.floor(rectPixel.x) + dx;
          const py = Math.floor(rectPixel.y) + dy;

          this.pushPreviewPixelDedup(
            visited,
            px,
            py,
            this.currentColor.r,
            this.currentColor.g,
            this.currentColor.b,
            finalAlpha,
          );
        }
      }
    }
  }

  /**
   * Compute rectangle outline pixels
   * Returns array of pixel coordinates for the rectangle outline
   */
  private computeRectanglePixels(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    // Get four lines for rectangle outline
    const topLine = this.computeLinePixels(x0, y0, x1, y0);
    const rightLine = this.computeLinePixels(x1, y0, x1, y1);
    const bottomLine = this.computeLinePixels(x1, y1, x0, y1);
    const leftLine = this.computeLinePixels(x0, y1, x0, y0);

    pixels.push(...topLine, ...rightLine, ...bottomLine, ...leftLine);

    return pixels;
  }

  /**
   * Compute rectangle fill pixels
   * Returns array of pixel coordinates for the filled rectangle
   */
  private computeRectangleFillPixels(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        pixels.push({ x, y });
      }
    }

    return pixels;
  }

  /**
   * Compute line pixels using Bresenham's algorithm
   * Returns array of pixel coordinates for the line
   */
  private computeLinePixels(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    // Bresenham's line algorithm
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const endX = Math.floor(x1);
    const endY = Math.floor(y1);

    while (true) {
      pixels.push({ x, y });

      if (x === endX && y === endY) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return pixels;
  }

  /**
   * Flood fill algorithm using queue-based traversal for contiguous color replacement
   * PATCH A: Apply global opacity multiplier using Photoshop-style alpha compositing
   */
  private floodFill(x: number, y: number): void {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Ensure coordinates are integers and within bounds
    const startX = Math.floor(x);
    const startY = Math.floor(y);

    if (
      startX < 0 ||
      startX >= this.layerManager.canvasWidth ||
      startY < 0 ||
      startY >= this.layerManager.canvasHeight
    ) {
      return;
    }

    // Get the target color at the starting position
    const targetColor = activeLayer.getPixel(startX, startY);
    if (!targetColor) return;

    // Get the fill color
    const fillColor = this.currentColor;

    // If target color is the same as fill color, no need to fill
    if (
      targetColor[0] === fillColor.r &&
      targetColor[1] === fillColor.g &&
      targetColor[2] === fillColor.b &&
      targetColor[3] === fillColor.a
    ) {
      return;
    }

    // Create a visited array to track which pixels have been processed
    const width = this.layerManager.canvasWidth;
    const height = this.layerManager.canvasHeight;
    const visited = new Uint8Array(width * height);

    // Queue for BFS traversal
    const queue: Array<{ x: number; y: number }> = [];
    queue.push({ x: startX, y: startY });
    visited[startY * width + startX] = 1;

    // Helper function to check if a color matches the target color
    const matchesTarget = (
      r: number,
      g: number,
      b: number,
      a: number,
    ): boolean => {
      return (
        r === targetColor[0] &&
        g === targetColor[1] &&
        b === targetColor[2] &&
        a === targetColor[3]
      );
    };

    // Process queue with opacity blending
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      const { x: cx, y: cy } = current;

      // PATCH A: Apply global opacity multiplier using Photoshop-style alpha compositing
      const dst = activeLayer.getPixel(cx, cy);
      if (!dst) {
        // No destination pixel, just set source with opacity
        const sa = this.brushOpacity;
        activeLayer.setPixel(
          cx,
          cy,
          fillColor.r,
          fillColor.g,
          fillColor.b,
          Math.round(fillColor.a * sa),
        );
      } else {
        // Blend using Porter-Duff "source over" operator
        const r = fillColor.r;
        const g = fillColor.g;
        const b = fillColor.b;
        const dr = dst[0];
        const dg = dst[1];
        const db = dst[2];
        const da = dst[3] / 255;

        const sa = this.brushOpacity;
        const dstA = da;
        const outA = sa + dstA * (1 - sa);

        if (outA === 0) {
          activeLayer.setPixel(cx, cy, 0, 0, 0, 0);
        } else {
          const outR = (r * sa + dr * dstA * (1 - sa)) / outA;
          const outG = (g * sa + dg * dstA * (1 - sa)) / outA;
          const outB = (b * sa + db * dstA * (1 - sa)) / outA;

          activeLayer.setPixel(
            cx,
            cy,
            Math.round(outR),
            Math.round(outG),
            Math.round(outB),
            Math.round(outA * 255),
          );
        }
      }

      // Check all four neighbors (up, down, left, right)
      const neighbors = [
        { x: cx, y: cy - 1 }, // up
        { x: cx, y: cy + 1 }, // down
        { x: cx - 1, y: cy }, // left
        { x: cx + 1, y: cy }, // right
      ];

      for (const neighbor of neighbors) {
        const { x: nx, y: ny } = neighbor;

        // Check bounds
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        // Check if already visited
        const index = ny * width + nx;
        if (visited[index]) {
          continue;
        }

        // Check if the neighbor matches the target color
        const neighborColor = activeLayer.getPixel(nx, ny);
        if (!neighborColor) continue;

        if (
          matchesTarget(
            neighborColor[0],
            neighborColor[1],
            neighborColor[2],
            neighborColor[3],
          )
        ) {
          visited[index] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  /**
   * Compute preview pixels for circle tool during pointer move based on shapeMode with deduplication
   */
  private computeCirclePreview(
    centerX: number,
    centerY: number,
    currentX: number,
    currentY: number,
  ): void {
    if (this.previewBuffer.length > 0) this.clearPreview();

    // Create visited buffer for deduplication
    const visited = new Uint8Array(
      this.layerManager.canvasWidth * this.layerManager.canvasHeight,
    );

    let circlePixels: Array<{ x: number; y: number }> = [];

    if (this.shapeMode === "fill") {
      circlePixels = this.computeCircleFillPixels(
        centerX,
        centerY,
        currentX,
        currentY,
      );
    } else if (this.shapeMode === "stroke") {
      circlePixels = this.computeCirclePixels(
        centerX,
        centerY,
        currentX,
        currentY,
      );
    }

    // For each circle pixel, apply brush size and add to preview buffer with deduplication
    const halfSize = Math.floor(this.brushSize / 2);
    const finalAlpha = Math.floor(this.currentColor.a * this.brushOpacity);

    for (const circlePixel of circlePixels) {
      for (let dy = -halfSize; dy < this.brushSize - halfSize; dy++) {
        for (let dx = -halfSize; dx < this.brushSize - halfSize; dx++) {
          const px = Math.floor(circlePixel.x) + dx;
          const py = Math.floor(circlePixel.y) + dy;

          this.pushPreviewPixelDedup(
            visited,
            px,
            py,
            this.currentColor.r,
            this.currentColor.g,
            this.currentColor.b,
            finalAlpha,
          );
        }
      }
    }
  }

  /**
   * Compute circle pixels using Bresenham's midpoint circle algorithm
   * Returns array of pixel coordinates for the circle outline
   */
  private computeCirclePixels(
    centerX: number,
    centerY: number,
    currentX: number,
    currentY: number,
  ): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    // Calculate radius from center to current position
    const dx = currentX - centerX;
    const dy = currentY - centerY;
    const radius = Math.round(Math.sqrt(dx * dx + dy * dy));

    if (radius === 0) {
      pixels.push({ x: Math.floor(centerX), y: Math.floor(centerY) });
      return pixels;
    }

    // Bresenham's midpoint circle algorithm
    let x = 0;
    let y = radius;
    let d = 1 - radius;

    const cx = Math.floor(centerX);
    const cy = Math.floor(centerY);

    // Helper to add 8-way symmetric points
    const addSymmetricPoints = (px: number, py: number) => {
      pixels.push({ x: cx + px, y: cy + py });
      pixels.push({ x: cx - px, y: cy + py });
      pixels.push({ x: cx + px, y: cy - py });
      pixels.push({ x: cx - px, y: cy - py });
      pixels.push({ x: cx + py, y: cy + px });
      pixels.push({ x: cx - py, y: cy + px });
      pixels.push({ x: cx + py, y: cy - px });
      pixels.push({ x: cx - py, y: cy - px });
    };

    addSymmetricPoints(x, y);

    while (x < y) {
      x++;
      if (d < 0) {
        d += 2 * x + 1;
      } else {
        y--;
        d += 2 * (x - y) + 1;
      }
      addSymmetricPoints(x, y);
    }

    return pixels;
  }

  /**
   * Compute circle fill pixels
   * Returns array of pixel coordinates for the filled circle
   */
  private computeCircleFillPixels(
    centerX: number,
    centerY: number,
    currentX: number,
    currentY: number,
  ): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    // Calculate radius from center to current position
    const dx = currentX - centerX;
    const dy = currentY - centerY;
    const radius = Math.round(Math.sqrt(dx * dx + dy * dy));

    if (radius === 0) {
      pixels.push({ x: Math.floor(centerX), y: Math.floor(centerY) });
      return pixels;
    }

    const cx = Math.floor(centerX);
    const cy = Math.floor(centerY);
    const radiusSquared = radius * radius;

    // Fill circle by checking all pixels within bounding box
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radiusSquared) {
          pixels.push({ x: cx + x, y: cy + y });
        }
      }
    }

    return pixels;
  }

  /**
   * Draw a straight line using Bresenham's line algorithm
   */
  private drawLine(x0: number, y0: number, x1: number, y1: number): void {
    // Bresenham's line algorithm
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      this.drawPixel(x, y);

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Commit rectangle based on shapeMode (fill or stroke)
   */
  private commitRectangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    if (this.shapeMode === "fill") {
      this.drawRectFill(x0, y0, x1, y1);
    } else if (this.shapeMode === "stroke") {
      this.drawRectOutline(x0, y0, x1, y1);
    }
  }

  /**
   * Draw a rectangular outline between two corner points
   */
  private drawRectOutline(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    // Draw four lines to form a rectangle outline
    // Top edge
    this.drawLine(x0, y0, x1, y0);
    // Right edge
    this.drawLine(x1, y0, x1, y1);
    // Bottom edge
    this.drawLine(x1, y1, x0, y1);
    // Left edge
    this.drawLine(x0, y1, x0, y0);
  }

  /**
   * Draw a filled rectangle between two corner points
   */
  private drawRectFill(x0: number, y0: number, x1: number, y1: number): void {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.drawPixel(x, y);
      }
    }
  }

  /**
   * Commit circle based on shapeMode (fill or stroke)
   */
  private commitCircle(
    centerX: number,
    centerY: number,
    currentX: number,
    currentY: number,
  ): void {
    if (this.shapeMode === "fill") {
      const pixels = this.computeCircleFillPixels(
        centerX,
        centerY,
        currentX,
        currentY,
      );
      for (const pixel of pixels) {
        this.drawPixel(pixel.x, pixel.y);
      }
    } else if (this.shapeMode === "stroke") {
      const pixels = this.computeCirclePixels(
        centerX,
        centerY,
        currentX,
        currentY,
      );
      for (const pixel of pixels) {
        this.drawPixel(pixel.x, pixel.y);
      }
    }
  }

  /**
   * Draw single pixel core - low-level painting with true alpha blending
   * Used by stampProceduralBrush and stampCustomBrush for direct pixel placement
   * Implements proper per-channel alpha blending for semi-transparent strokes
   */
  private drawSinglePixelCore(
    pixelX: number,
    pixelY: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Check bounds
    if (
      pixelX < 0 ||
      pixelX >= this.layerManager.canvasWidth ||
      pixelY < 0 ||
      pixelY >= this.layerManager.canvasHeight
    ) {
      return;
    }

    // Eraser mode: set transparent RGBA 0,0,0,0
    if (this.currentTool === "eraser") {
      activeLayer.setPixel(pixelX, pixelY, 0, 0, 0, 0);
      return;
    }

    // Normal brush: fetch destination pixel and perform true alpha blending
    const dst = activeLayer.getPixel(pixelX, pixelY);
    if (!dst) {
      // No destination pixel, just set the source
      activeLayer.setPixel(pixelX, pixelY, r, g, b, a);
      return;
    }

    // Compute source and destination alpha as normalized values (0.0-1.0)
    const srcA = a / 255;
    const dstA = dst[3] / 255;

    // Compute output alpha using Porter-Duff "over" operator
    const outA = srcA + dstA * (1 - srcA);

    // If output alpha is zero, set transparent pixel
    if (outA === 0) {
      activeLayer.setPixel(pixelX, pixelY, 0, 0, 0, 0);
      return;
    }

    // Blend RGB channels using true alpha blending formula
    const outR = (r * srcA + dst[0] * dstA * (1 - srcA)) / outA;
    const outG = (g * srcA + dst[1] * dstA * (1 - srcA)) / outA;
    const outB = (b * srcA + dst[2] * dstA * (1 - srcA)) / outA;

    // Write final blended pixel
    activeLayer.setPixel(
      pixelX,
      pixelY,
      Math.round(outR),
      Math.round(outG),
      Math.round(outB),
      Math.round(outA * 255),
    );
  }

  /**
   * Stamp procedural brush at given coordinates
   * Generates procedural stamp and applies it to the canvas
   * Uses brushPreset for Brush tool, brushType for other tools
   * Passes unmodified base alpha to generateProceduralStamp, then scales each pixel's alpha by global opacity
   * PATCH 6: SAFETY GUARD - Prevents procedural logic from running for non-brush tools
   */
  private stampProceduralBrush(x: number, y: number): void {
    // PATCH 6: SAFETY GUARD - Prevent pencil from accidentally using procedural code
    if (this.currentTool !== "brush") {
      return; // Prevent pencil from accidentally using procedural code
    }

    const baseX = Math.floor(x);
    const baseY = Math.floor(y);

    // Determine which brush type to use
    const effectiveBrushType = this.brushPreset;

    // Store global opacity for scaling
    const globalOpacity = this.brushOpacity;

    // Generate procedural stamp with unmodified base alpha
    const stamp = generateProceduralStamp(
      effectiveBrushType,
      this.brushSize,
      this.currentColor.r,
      this.currentColor.g,
      this.currentColor.b,
      this.currentColor.a,
      this.brushRandomness,
      this.brushSaturationShift,
      this.brushLightnessShift,
    );

    // Apply stamp pixels with global opacity scaling
    for (const pixel of stamp) {
      const pixelX = baseX + pixel.x;
      const pixelY = baseY + pixel.y;

      // Apply pixel-perfect rule
      if (this.pixelPerfect && this.lastX !== null && this.lastY !== null) {
        const dx = Math.abs(pixelX - Math.floor(this.lastX));
        const dy = Math.abs(pixelY - Math.floor(this.lastY));
        if (dx === 1 && dy === 1) {
          continue; // Skip diagonal pixels
        }
      }

      // Apply dither preview
      if (this.dither) {
        const checker = (pixelX + pixelY) % 2 === 0;
        if (!checker) continue; // Skip odd checkerboard pixels
      }

      // Scale pixel alpha by global opacity
      const scaledA = Math.floor(pixel.a * globalOpacity);

      // Draw the original pixel with scaled alpha
      this.drawSinglePixelCore(
        pixelX,
        pixelY,
        pixel.r,
        pixel.g,
        pixel.b,
        scaledA,
      );

      // Apply mirror transformations
      if (this.mirrorX) {
        const mirrorX = this.layerManager.canvasWidth - 1 - pixelX;
        this.drawSinglePixelCore(
          mirrorX,
          pixelY,
          pixel.r,
          pixel.g,
          pixel.b,
          scaledA,
        );

        // If both mirrors are active, draw the diagonal mirror too
        if (this.mirrorY) {
          const mirrorY = this.layerManager.canvasHeight - 1 - pixelY;
          this.drawSinglePixelCore(
            mirrorX,
            mirrorY,
            pixel.r,
            pixel.g,
            pixel.b,
            scaledA,
          );
        }
      }

      if (this.mirrorY) {
        const mirrorY = this.layerManager.canvasHeight - 1 - pixelY;
        this.drawSinglePixelCore(
          pixelX,
          mirrorY,
          pixel.r,
          pixel.g,
          pixel.b,
          scaledA,
        );
      }
    }
  }

  /**
   * Draw or erase a pixel at the given coordinates on the active layer based on current tool
   * Routes to custom brush system when customBrush is set, otherwise uses procedural brush or legacy round brush
   * Applies brush size, brush opacity, mirror transformations, pixel-perfect rule, and dither preview
   * Ensures pencil never routes through procedural brush logic and uses uniform opacity
   * PATCH 4: Clean mirrored drawing logic
   * PATCH 5: Fix pencil opacity blending randomness
   */
  private drawPixel(x: number, y: number): void {
    // Custom brush drawing for brush tool when customBrush is set
    if (this.currentTool === "brush") {
      if (this.customBrush) {
        this.stampCustomBrush(x, y);
      } else {
        this.stampProceduralBrush(x, y);
      }
      return;
    }

    // Legacy round brush implementation for pencil, eraser, and other tools
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Ensure coordinates are integers
    const baseX = Math.floor(x);
    const baseY = Math.floor(y);

    // Calculate brush offset for centering
    const halfSize = Math.floor(this.brushSize / 2);

    // Helper function to draw a single pixel with bounds checking
    // PATCH 5: Fix pencil opacity blending randomness
    const drawSinglePixel = (pixelX: number, pixelY: number) => {
      // Apply pixel-perfect rule
      if (this.pixelPerfect && this.lastX !== null && this.lastY !== null) {
        const dx = Math.abs(pixelX - Math.floor(this.lastX));
        const dy = Math.abs(pixelY - Math.floor(this.lastY));
        if (dx === 1 && dy === 1) {
          return; // Skip diagonal pixels
        }
      }

      // Apply dither preview
      if (this.dither) {
        const checker = (pixelX + pixelY) % 2 === 0;
        if (!checker) return; // Skip odd checkerboard pixels
      }

      // Check bounds
      if (
        pixelX < 0 ||
        pixelX >= this.layerManager.canvasWidth ||
        pixelY < 0 ||
        pixelY >= this.layerManager.canvasHeight
      ) {
        return;
      }

      // Set the pixel on the active layer based on current tool
      if (this.currentTool === "eraser") {
        // Eraser mode: set RGBA to zero (transparent)
        activeLayer.setPixel(pixelX, pixelY, 0, 0, 0, 0);
      } else {
        // Pencil, Line, Rectangle, Circle, or Fill mode: use uniform opacity from global slider
        // Fetch destination pixel for alpha blending
        const dst = activeLayer.getPixel(pixelX, pixelY);
        if (!dst) {
          // No destination pixel, just set the source
          const finalAlpha = Math.floor(255 * this.brushOpacity);
          activeLayer.setPixel(
            pixelX,
            pixelY,
            this.currentColor.r,
            this.currentColor.g,
            this.currentColor.b,
            finalAlpha,
          );
          return;
        }

        // PATCH 5: Fix pencil opacity blending with proper Porter-Duff compositing
        const r = this.currentColor.r;
        const g = this.currentColor.g;
        const b = this.currentColor.b;
        const dr = dst[0];
        const dg = dst[1];
        const db = dst[2];
        const da = dst[3] / 255;

        const srcA = this.brushOpacity;
        const dstA = da;
        const outA = srcA + dstA * (1 - srcA);

        const outR = (r * srcA + dr * dstA * (1 - srcA)) / outA;
        const outG = (g * srcA + dg * dstA * (1 - srcA)) / outA;
        const outB = (b * srcA + db * dstA * (1 - srcA)) / outA;

        activeLayer.setPixel(
          pixelX,
          pixelY,
          Math.round(outR),
          Math.round(outG),
          Math.round(outB),
          Math.round(outA * 255),
        );
      }
    };

    // Draw brush with size
    for (let dy = -halfSize; dy < this.brushSize - halfSize; dy++) {
      for (let dx = -halfSize; dx < this.brushSize - halfSize; dx++) {
        const px = baseX + dx;
        const py = baseY + dy;

        // Pencil shape mask
        const isPencil = this.currentTool === "pencil";

        let mask = true;
        if (isPencil) {
          if (this.pencilShape === "round") {
            const dist = dx * dx + dy * dy;
            mask = dist <= halfSize * halfSize;
          } else {
            mask = true;
          }
        }

        if (!mask) continue;

        // PATCH 4: Clean mirrored drawing logic — only draw once unless mirrorX/Y enabled
        if (!this.mirrorX && !this.mirrorY) {
          drawSinglePixel(px, py);
        } else {
          drawSinglePixel(px, py);

          if (this.mirrorX) {
            drawSinglePixel(this.layerManager.canvasWidth - px - 1, py);
          }
          if (this.mirrorY) {
            drawSinglePixel(px, this.layerManager.canvasHeight - py - 1);
          }
          if (this.mirrorX && this.mirrorY) {
            drawSinglePixel(
              this.layerManager.canvasWidth - px - 1,
              this.layerManager.canvasHeight - py - 1,
            );
          }
        }
      }
    }
  }

  /**
   * Check if currently drawing
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
}
