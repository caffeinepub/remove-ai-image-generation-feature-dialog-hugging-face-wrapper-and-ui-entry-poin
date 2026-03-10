/**
 * SelectionManager.ts
 * Fully independent Aseprite-style selection engine with inclusive-bounds rectangles, true rotation transforms, strict pivot invariant enforcement, controlled mid-rotation pivot rebasing, smooth grab behavior using grabOffset, rotation grab anchoring using rotationGrabAngle, paste functionality that always creates a floating selection regardless of active layer or transform state with immediate visibility, proper scale transform baking that rebuilds floatingPixels and _sourceGrid from scaled preview before switching to move or commit, getLiveSelectionRect() method for real-time selection creation feedback, immediate rotation activation fix that ensures floating pixels exist before rotating, automatic trimming system for empty rows and columns after lasso and magic selection commits, ESC cancel fix that restores artwork precisely to pre-transform state by backing up all pixels in selectionRect (including transparent ones) before clearing and restoring the full region without conditional logic, discardSelectionNoRestore() method for Cut operations, and extractFloatingPixelsForBrushExport() method for non-destructive pixel extraction for brush creation.
 */

import type { LayerManager } from "./LayerManager";

type SelectionMode = "idle" | "creating" | "floating" | "transforming";
type TransformType =
  | "move"
  | "scale-nw"
  | "scale-ne"
  | "scale-sw"
  | "scale-se"
  | "scale-n"
  | "scale-e"
  | "scale-s"
  | "scale-w"
  | "rotate";

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FloatingPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export class SelectionManager {
  private layerManager: LayerManager;
  private mode: SelectionMode = "idle";
  private transformType: TransformType | null = null;
  private isTransformingFlag = false;

  // Selection rectangle (inclusive bounds: width = max - min + 1)
  private selectionRect: SelectionRect | null = null;

  // Creating state
  private createStart: { x: number; y: number } | null = null;
  private createCurrent: { x: number; y: number } | null = null;

  // Floating selection pixels (INVARIANT: stored in local coordinates 0,0-based)
  private floatingPixels: FloatingPixel[] = [];
  private originalFloatingPixels: FloatingPixel[] = []; // Original backup, never mutated
  private floatingRect: SelectionRect | null = null;

  // Backup buffers for ESC restore (immutable snapshots)
  private backupPixels: FloatingPixel[] = [];
  private backupRect: SelectionRect | null = null;

  // Transform state
  private dragStart: { x: number; y: number } | null = null;
  private transformInitialRect: SelectionRect | null = null;

  // Grab offset for smooth move behavior
  private grabOffset: { x: number; y: number } | null = null;

  // Rotation state
  private rotationAngle = 0;
  private rotationStartAngle = 0;
  private pivotX = 0;
  private pivotY = 0;
  private originalRotationRect: SelectionRect | null = null;

  // Hold-R rotation mode state
  private rotationMode = false;
  private rotationPivot: { x: number; y: number } | null = null;
  private pivotOffset = { x: 0, y: 0 };

  // Rotation grab angle for smooth cursor-pinned rotation
  private rotationGrabAngle: number | null = null;

  // Track last cursor position during rotation for pivot move continuity
  private lastRotateCursor: { x: number; y: number } | null = null;

  // Strict pivot invariant flag to prevent drift
  private hasRotationStarted = false;

  // Lasso mask for polygon selection
  private lassoMask: boolean[][] | null = null;

  // Source grid for Aseprite-accurate nearest-neighbor scaling and rotation
  private _sourceGrid: (FloatingPixel | null)[][] | null = null;

  // Original source grid captured at rotation start (for absolute rotation)
  private _originalSourceGrid: (FloatingPixel | null)[][] | null = null;

  // Cache for rotation preview during active rotation
  private _lastRotatedPreview: FloatingPixel[] | null = null;

  // Rotation envelope for infinite bounds during rotation
  private rotationEnvelopeRect: SelectionRect | null = null;

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
  }

  /**
   * Set the LayerManager for this SelectionManager
   * Used to synchronize the active LayerManager across frames
   */
  public setLayerManager(layerManager: LayerManager): void {
    this.layerManager = layerManager;
  }

  /**
   * Get floating rect for consistent origin tracking
   * Returns a copy of the floatingRect if it exists, null otherwise
   */
  public getFloatingRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return this.floatingRect ? { ...this.floatingRect } : null;
  }

  /**
   * Get live selection rectangle during creation
   * Returns the in-progress selection rectangle computed from createStart and createCurrent
   * Uses inclusive bounds calculation: width = max - min + 1, height = max - min + 1
   * Returns null if not currently creating a selection
   */
  public getLiveSelectionRect(): SelectionRect | null {
    if (this.mode !== "creating" || !this.createStart || !this.createCurrent) {
      return null;
    }

    const minX = Math.min(this.createStart.x, this.createCurrent.x);
    const maxX = Math.max(this.createStart.x, this.createCurrent.x);
    const minY = Math.min(this.createStart.y, this.createCurrent.y);
    const maxY = Math.max(this.createStart.y, this.createCurrent.y);

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Get preview selection rectangle during creation
   * Returns the current drag rectangle based on createStart and createCurrent coordinates
   * Returns null if not currently creating a selection
   * @deprecated Use getLiveSelectionRect() instead
   */
  public getPreviewSelectionRect(): SelectionRect | null {
    return this.getLiveSelectionRect();
  }

  /**
   * Get visual selection rectangle for rendering
   * Returns the current visible rectangle: if rotating and rotationEnvelopeRect exists, use it;
   * otherwise use the static selectionRect
   * Returns null if no selection exists
   */
  public getVisualSelectionRect(): SelectionRect | null {
    // If rotating and rotation envelope exists, use it
    if (this.rotationMode && this.rotationEnvelopeRect) {
      return { ...this.rotationEnvelopeRect };
    }

    // Otherwise use the static selection rectangle
    return this.selectionRect ? { ...this.selectionRect } : null;
  }

  /**
   * Check if a point (in world coordinates) is over floating pixels
   * Returns false if no floating pixels exist
   * Returns true if a floating pixel exists at (x, y) position
   */
  public isPointOverFloatingPixels(x: number, y: number): boolean {
    // Return false if no floating pixels exist
    if (this.floatingPixels.length === 0 || !this.floatingRect) {
      return false;
    }

    // Floor coordinates to integer pixel positions
    const px = Math.floor(x);
    const py = Math.floor(y);

    // Get floating pixels in world coordinates
    const worldPixels = this.getFloatingPixels();

    // Check if any floating pixel exists at (px, py)
    for (const pixel of worldPixels) {
      if (Math.floor(pixel.x) === px && Math.floor(pixel.y) === py) {
        return true;
      }
    }

    return false;
  }

  /**
   * Begin creating a new selection
   */
  beginSelection(x: number, y: number): void {
    this.mode = "creating";
    this.createStart = { x: Math.floor(x), y: Math.floor(y) };
    this.createCurrent = { x: Math.floor(x), y: Math.floor(y) };
    this.selectionRect = null;
    this.floatingPixels = [];
    this.originalFloatingPixels = [];
    this.floatingRect = null;
    this.lassoMask = null;
  }

  /**
   * Update selection during creation
   */
  updateSelection(x: number, y: number): void {
    if (this.mode !== "creating" || !this.createStart) return;

    this.createCurrent = { x: Math.floor(x), y: Math.floor(y) };
  }

  /**
   * Commit the selection (finalize creation)
   * Uses inclusive bounds: width = max - min + 1, height = max - min + 1
   */
  commitSelection(): void {
    if (this.mode === "creating" && this.createStart && this.createCurrent) {
      const minX = Math.min(this.createStart.x, this.createCurrent.x);
      const maxX = Math.max(this.createStart.x, this.createCurrent.x);
      const minY = Math.min(this.createStart.y, this.createCurrent.y);
      const maxY = Math.max(this.createStart.y, this.createCurrent.y);

      // Inclusive bounds: width = max - min + 1, height = max - min + 1
      this.selectionRect = {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };

      // Clear creation states
      this.mode = "idle";
      this.createStart = null;
      this.createCurrent = null;
    }
  }

  /**
   * Create selection from lasso path using even-odd point-in-polygon rule
   * Builds polygon mask and computes minimal bounding box
   */
  createSelectionFromLassoPath(path: Array<{ x: number; y: number }>): void {
    if (path.length < 3) return;

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const point of path) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    this.selectionRect = {
      x: minX,
      y: minY,
      width: width,
      height: height,
    };

    this.lassoMask = [];
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        const worldX = minX + x;
        const worldY = minY + y;

        let inside = false;
        for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
          const xi = path[i].x;
          const yi = path[i].y;
          const xj = path[j].x;
          const yj = path[j].y;

          const intersect =
            yi > worldY !== yj > worldY &&
            worldX < ((xj - xi) * (worldY - yi)) / (yj - yi) + xi;

          if (intersect) inside = !inside;
        }

        row.push(inside);
      }
      this.lassoMask.push(row);
    }

    this.mode = "idle";
    this.createStart = null;
    this.createCurrent = null;

    if (this.selectionRect) {
      this.extractFloatingPixels();
      this.floatingRect = { ...this.selectionRect };
    }

    // Automatically trim empty rows and columns
    this.trimFloatingToOpaqueBounds();
  }

  /**
   * Create selection from magic select (flood-fill based)
   */
  createSelectionFromMagicSelect(
    minX: number,
    minY: number,
    width: number,
    height: number,
    binaryMask: Uint8Array,
  ): void {
    this.selectionRect = {
      x: minX,
      y: minY,
      width: width,
      height: height,
    };

    this.lassoMask = [];
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        row.push(binaryMask[index] === 1);
      }
      this.lassoMask.push(row);
    }

    this.mode = "idle";
    this.createStart = null;
    this.createCurrent = null;

    if (this.selectionRect) {
      this.extractFloatingPixels();
      this.floatingRect = { ...this.selectionRect };
    }

    // Automatically trim empty rows and columns
    this.trimFloatingToOpaqueBounds();
  }

  /**
   * Trim floating selection to opaque pixel bounds
   * Removes empty rows and columns around the selection
   * Skips trimming if selection already tightly bounds the opaque pixels
   */
  private trimFloatingToOpaqueBounds(): void {
    if (!this.floatingPixels || this.floatingPixels.length === 0) return;

    // Calculate minimum and maximum pixel coordinates
    let minPx = Number.POSITIVE_INFINITY;
    let minPy = Number.POSITIVE_INFINITY;
    let maxPx = Number.NEGATIVE_INFINITY;
    let maxPy = Number.NEGATIVE_INFINITY;

    for (const p of this.floatingPixels) {
      minPx = Math.min(minPx, p.x);
      minPy = Math.min(minPy, p.y);
      maxPx = Math.max(maxPx, p.x);
      maxPy = Math.max(maxPy, p.y);
    }

    // Skip trimming if selection already tightly bounds the pixels
    if (!this.selectionRect) return;
    if (
      minPx === 0 &&
      minPy === 0 &&
      maxPx === this.selectionRect.width - 1 &&
      maxPy === this.selectionRect.height - 1
    ) {
      return;
    }

    // Compute new selection rectangle dimensions
    const newX = this.selectionRect.x + minPx;
    const newY = this.selectionRect.y + minPy;
    const newWidth = maxPx - minPx + 1;
    const newHeight = maxPy - minPy + 1;

    // Adjust floating pixel coordinates to new local coordinate system
    for (const p of this.floatingPixels) {
      p.x -= minPx;
      p.y -= minPy;
    }

    // Update selection rectangles
    const newRect = { x: newX, y: newY, width: newWidth, height: newHeight };
    this.selectionRect = newRect;
    this.floatingRect = newRect;

    // Rebuild _sourceGrid with new dimensions
    this._sourceGrid = [];
    for (let y = 0; y < newHeight; y++) {
      this._sourceGrid.push(new Array(newWidth).fill(null));
    }

    // Populate grid with repositioned floating pixels
    for (const p of this.floatingPixels) {
      if (p.y < newHeight && p.x < newWidth) {
        this._sourceGrid[p.y][p.x] = { ...p };
      }
    }
  }

  /**
   * Extract floating pixels for brush export without clearing or modifying the selection
   * This method safely reads pixels from the active layer using the current selection rect or lassoMask
   * without clearing, moving, or canceling the selection. It populates floatingPixels and floatingRect
   * for brush serialization while leaving the selection and layer data intact.
   */
  public extractFloatingPixelsForBrushExport(): void {
    if (!this.selectionRect) return;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const rect = this.selectionRect;

    // Extract pixels from the active layer without clearing them
    this.floatingPixels = [];
    for (let py = 0; py < rect.height; py++) {
      for (let px = 0; px < rect.width; px++) {
        // Check lasso mask if it exists
        if (this.lassoMask && !this.lassoMask[py]?.[px]) {
          continue;
        }

        const worldX = rect.x + px;
        const worldY = rect.y + py;

        const pixel = activeLayer.getPixel(worldX, worldY);
        if (pixel && pixel[3] > 0) {
          this.floatingPixels.push({
            x: px,
            y: py,
            r: pixel[0],
            g: pixel[1],
            b: pixel[2],
            a: pixel[3],
          });
        }
      }
    }

    // Set floatingRect to match selectionRect for brush export
    this.floatingRect = { ...rect };

    // Do NOT clear the layer, do NOT modify backupPixels, do NOT change mode or transform state
    // This is a read-only operation for brush export purposes only
  }

  /**
   * Paste clipboard content as a floating selection
   * Always creates a floating selection regardless of active layer or transform state
   *
   * @param pixels - Array of pixels in local coordinates (0,0-based)
   * @param width - Width of the clipboard content
   * @param height - Height of the clipboard content
   * @param pasteX - X coordinate for paste position (world coordinates)
   * @param pasteY - Y coordinate for paste position (world coordinates)
   */
  public paste(
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
    pasteX: number,
    pasteY: number,
  ): void {
    // Step 1: Create new selectionRect positioned at the paste point
    this.selectionRect = {
      x: Math.floor(pasteX),
      y: Math.floor(pasteY),
      width: width,
      height: height,
    };

    // Step 2: Initialize floatingPixels using the clipboard payload (local coordinates from 0,0)
    this.floatingPixels = pixels.map((p) => ({
      x: p.x,
      y: p.y,
      r: p.r,
      g: p.g,
      b: p.b,
      a: p.a,
    }));

    // Step 3: Set floatingRect = selectionRect
    this.floatingRect = { ...this.selectionRect };

    // Step 4: Force the transforming state
    this.mode = "transforming";
    this.isTransformingFlag = true;
    this.transformType = "move";

    // Step 5: Initialize transformInitialRect
    this.transformInitialRect = { ...this.selectionRect };

    // Step 6: Initialize dragStart and grabOffset for immediate visibility
    this.dragStart = {
      x: this.selectionRect.x,
      y: this.selectionRect.y,
    };
    this.grabOffset = { x: 0, y: 0 };

    // Build source grid for future transforms
    this._sourceGrid = [];
    for (let y = 0; y < height; y++) {
      const row = new Array(width).fill(null);
      this._sourceGrid.push(row);
    }
    for (const p of this.floatingPixels) {
      if (p.x >= 0 && p.x < width && p.y >= 0 && p.y < height) {
        this._sourceGrid[p.y][p.x] = p;
      }
    }

    // Clear other state
    this.lassoMask = null;
    this.rotationAngle = 0;
    this.rotationStartAngle = 0;
    this.originalRotationRect = null;
    this.rotationMode = false;
    this.rotationPivot = null;
    this.rotationGrabAngle = null;
    this.lastRotateCursor = null;
    this._originalSourceGrid = null;
    this._lastRotatedPreview = null;
    this.rotationEnvelopeRect = null;
    this.hasRotationStarted = false;
    this.backupPixels = [];
    this.backupRect = null;
    this.originalFloatingPixels = this.floatingPixels.map((p) => ({ ...p }));
  }

  /**
   * Cancel the current selection or operation
   * Restores artwork precisely to pre-transform state using immutable backupPixels and backupRect snapshots
   * ESC always returns the artwork to its original pre-transform position without applying transform deltas
   */
  cancelSelection(): void {
    const activeLayer = this.layerManager.getActiveLayer();

    // Step 1: Restore artwork using backupPixels and backupRect
    if (activeLayer && this.backupRect && this.backupPixels.length > 0) {
      // Restore all pixels from backup (including transparent ones)
      for (const p of this.backupPixels) {
        const wx = this.backupRect.x + p.x;
        const wy = this.backupRect.y + p.y;
        activeLayer.setPixel(wx, wy, p.r, p.g, p.b, p.a);
      }

      // Step 2: Restore selectionRect and floatingRect to backupRect
      this.selectionRect = { ...this.backupRect };
      this.floatingRect = { ...this.backupRect };

      // Step 3: Restore floatingPixels to backupPixels
      this.floatingPixels = this.backupPixels.map((p) => ({ ...p }));
    }

    // Step 4: Clear all transform-related fields
    this.mode = "idle";
    this.dragStart = null;
    this.transformInitialRect = null;
    this.grabOffset = null;
    this.transformType = null;
    this.isTransformingFlag = false;

    // Step 5: Clear floating and temporary buffers
    this.floatingPixels = [];
    this.originalFloatingPixels = [];
    this.floatingRect = null;
    this._sourceGrid = null;
    this._originalSourceGrid = null;

    // Step 6: Clear backup buffers
    this.backupPixels = [];
    this.backupRect = null;

    // Step 7: Clear rotation state
    this.rotationAngle = 0;
    this.rotationStartAngle = 0;
    this.originalRotationRect = null;
    this.rotationMode = false;
    this.rotationPivot = null;
    this.rotationGrabAngle = null;
    this.lastRotateCursor = null;
    this.lassoMask = null;
    this._lastRotatedPreview = null;
    this.rotationEnvelopeRect = null;
    this.hasRotationStarted = false;

    // Step 8: Clear selection
    this.selectionRect = null;
    this.createStart = null;
    this.createCurrent = null;
  }

  /**
   * Discard selection without restoring backup pixels
   * Clears all selection-related state and floating pixel data without restoring backup pixels
   * Used for Cut operations where the floating pixels should be removed without restoring the original artwork
   *
   * This method resets internal state variables (selectionRect, floatingPixels, floatingRect, backupPixels, backupRect, rotation fields, lassoMask, etc.)
   * exactly as described, maintaining parity with cancelSelection() except for skipping restoration.
   */
  public discardSelectionNoRestore(): void {
    // Step 1: Clear all transform-related fields (no restoration)
    this.mode = "idle";
    this.dragStart = null;
    this.transformInitialRect = null;
    this.grabOffset = null;
    this.transformType = null;
    this.isTransformingFlag = false;

    // Step 2: Clear floating and temporary buffers
    this.floatingPixels = [];
    this.originalFloatingPixels = [];
    this.floatingRect = null;
    this._sourceGrid = null;
    this._originalSourceGrid = null;

    // Step 3: Clear backup buffers
    this.backupPixels = [];
    this.backupRect = null;

    // Step 4: Clear rotation state
    this.rotationAngle = 0;
    this.rotationStartAngle = 0;
    this.originalRotationRect = null;
    this.rotationMode = false;
    this.rotationPivot = null;
    this.rotationGrabAngle = null;
    this.lastRotateCursor = null;
    this.lassoMask = null;
    this._lastRotatedPreview = null;
    this.rotationEnvelopeRect = null;
    this.hasRotationStarted = false;

    // Step 5: Clear selection
    this.selectionRect = null;
    this.createStart = null;
    this.createCurrent = null;
  }

  /**
   * Hit test to determine what the pointer is over
   */
  hitTest(x: number, y: number): "inside" | "edge" | "corner" | null {
    if (!this.selectionRect) return null;

    const rect = this.selectionRect;
    const threshold = 0;

    const minX = rect.x;
    const maxX = rect.x + rect.width - 1;
    const minY = rect.y;
    const maxY = rect.y + rect.height - 1;

    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];

    for (const corner of corners) {
      if (
        Math.abs(x - corner.x) <= threshold &&
        Math.abs(y - corner.y) <= threshold
      ) {
        return "corner";
      }
    }

    const onLeft = Math.abs(x - minX) <= threshold && y >= minY && y <= maxY;
    const onRight = Math.abs(x - maxX) <= threshold && y >= minY && y <= maxY;
    const onTop = Math.abs(y - minY) <= threshold && x >= minX && x <= maxX;
    const onBottom = Math.abs(y - maxY) <= threshold && x >= minX && x <= maxX;

    if (onLeft || onRight || onTop || onBottom) {
      return "edge";
    }

    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return "inside";
    }

    return null;
  }

  /**
   * Check if floating pixels already exist
   */
  hasFloatingPixels(): boolean {
    return this.floatingPixels.length > 0;
  }

  /**
   * Start move-only transform without extracting pixels
   * FIXED: Detects if coming from a scale transform and bakes the scaled preview first
   */
  startMoveOnly(x: number, y: number): void {
    // BAKING LOGIC: If switching from scale to move, bake the scaled preview
    if (this.transformType?.startsWith("scale-")) {
      this.bakeScaleToFloating();
    }

    this.isTransformingFlag = true;
    this.transformType = "move";
    this.dragStart = { x: Math.floor(x), y: Math.floor(y) };
    this.transformInitialRect = this.selectionRect
      ? { ...this.selectionRect }
      : null;

    // Capture grab offset (not floored)
    if (this.selectionRect) {
      this.grabOffset = {
        x: x - this.selectionRect.x,
        y: y - this.selectionRect.y,
      };
    }
  }

  /**
   * Begin a transform operation
   * FIXED: When switching from scale to move, bake the scaled preview first
   */
  beginTransform(type: TransformType, x: number, y: number): void {
    if (!this.selectionRect) return;

    // BAKING LOGIC: If switching from scale to move, bake the scaled preview
    if (
      type === "move" &&
      this.transformType &&
      this.transformType.startsWith("scale-")
    ) {
      this.bakeScaleToFloating();
    }

    this.mode = "transforming";
    this.isTransformingFlag = true;
    this.transformType = type;
    this.dragStart = { x: Math.floor(x), y: Math.floor(y) };
    this.transformInitialRect = { ...this.selectionRect };

    // Capture grab offset for move operations (not floored)
    if (type === "move") {
      this.grabOffset = {
        x: x - this.selectionRect.x,
        y: y - this.selectionRect.y,
      };
    }

    if (type === "rotate") {
      return;
    }

    if (this.floatingPixels.length === 0) {
      this.extractFloatingPixels();
    }
  }

  /**
   * Bake the current scaled preview into floatingPixels and rebuild _sourceGrid
   * This method is called before rotation begins to ensure the scaled pixels are permanent
   */
  private bakeActiveScaleToFloating(): void {
    if (!this.floatingRect) return;
    if (!this.transformType || !this.transformType.startsWith("scale-")) return;
    if (!this._sourceGrid) return;

    const world = this.getTransformedPixels();
    const fr = this.floatingRect;
    this.floatingPixels = world.map((p) => ({
      x: p.x - fr.x,
      y: p.y - fr.y,
      r: p.r,
      g: p.g,
      b: p.b,
      a: p.a,
    }));

    this.selectionRect = { ...fr };

    this._sourceGrid = [];
    for (let y = 0; y < fr.height; y++) {
      this._sourceGrid.push(new Array(fr.width).fill(null));
    }
    for (const p of this.floatingPixels) {
      if (p.x >= 0 && p.x < fr.width && p.y >= 0 && p.y < fr.height) {
        this._sourceGrid[p.y][p.x] = p;
      }
    }

    this.originalFloatingPixels = this.floatingPixels.map((p) => ({ ...p }));
  }

  /**
   * Bake the current scaled preview into floatingPixels and rebuild _sourceGrid
   * This method reads the existing _sourceGrid, maps the scaled geometry using interpolation,
   * and writes baked pixels back into floatingPixels and _sourceGrid in local (0,0) coordinates.
   * It ensures the floatingRect and selectionRect remain identical.
   */
  private bakeScaleToFloating(): void {
    if (!this._sourceGrid || !this.floatingRect) return;

    const dst = this.floatingRect;
    const srcW = this._sourceGrid[0].length;
    const srcH = this._sourceGrid.length;

    // Step 1: Generate scaled pixels in local (0,0-based) coordinates using nearest-neighbor interpolation
    const scaledPixels: FloatingPixel[] = [];
    for (let dy = 0; dy < dst.height; dy++) {
      for (let dx = 0; dx < dst.width; dx++) {
        const srcX = Math.floor((dx / dst.width) * srcW);
        const srcY = Math.floor((dy / dst.height) * srcH);
        const px = this._sourceGrid[srcY]?.[srcX];
        if (px) {
          scaledPixels.push({
            x: dx,
            y: dy,
            r: px.r,
            g: px.g,
            b: px.b,
            a: px.a,
          });
        }
      }
    }

    // Step 2: Update floatingPixels with scaled data
    this.floatingPixels = scaledPixels;

    // Step 3: Rebuild _sourceGrid from scaled floatingPixels
    this._sourceGrid = [];
    for (let y = 0; y < dst.height; y++) {
      const row = new Array(dst.width).fill(null);
      this._sourceGrid.push(row);
    }
    for (const p of this.floatingPixels) {
      if (p.x >= 0 && p.x < dst.width && p.y >= 0 && p.y < dst.height) {
        this._sourceGrid[p.y][p.x] = p;
      }
    }

    // Step 4: Ensure floatingRect and selectionRect remain unchanged
    // (They are already in sync, no changes needed)
  }

  /**
   * Bake the current scaled preview into floatingPixels and rebuild _sourceGrid
   * This is called when switching from scale to move transform
   * @deprecated Use bakeScaleToFloating() instead
   */
  private bakeScaledPreview(): void {
    this.bakeScaleToFloating();
  }

  /**
   * Update transform operation
   */
  updateTransform(x: number, y: number): void {
    if (this.rotationMode) {
      return;
    }

    if (
      !this.isTransformingFlag ||
      !this.transformType ||
      !this.dragStart ||
      !this.transformInitialRect
    )
      return;

    if (this.transformType === "move") {
      // Use grab offset for smooth movement
      if (this.grabOffset) {
        const dx = x - this.grabOffset.x - this.transformInitialRect.x;
        const dy = y - this.grabOffset.y - this.transformInitialRect.y;

        this.selectionRect = {
          x: Math.round(this.transformInitialRect.x + dx),
          y: Math.round(this.transformInitialRect.y + dy),
          width: this.transformInitialRect.width,
          height: this.transformInitialRect.height,
        };
        this.floatingRect = { ...this.selectionRect };
      }
    } else if (this.transformType.startsWith("scale-")) {
      const dx = Math.floor(x) - this.dragStart.x;
      const dy = Math.floor(y) - this.dragStart.y;
      this.updateScale(dx, dy);
    }
  }

  /**
   * Get floating pixels for preview rendering
   * Returns pixels in world coordinates for rendering
   */
  getFloatingPixels(): FloatingPixel[] {
    if (this.floatingPixels.length === 0 || !this.floatingRect) {
      return [];
    }

    // During active rotation, return cached preview
    if (this.rotationMode && this._lastRotatedPreview) {
      return this._lastRotatedPreview;
    }

    if (this.isTransformingFlag) {
      return this.getTransformedPixels();
    }

    // Return pixels in world coordinates for rendering
    return this.floatingPixels.map((p) => ({
      x: this.floatingRect!.x + p.x,
      y: this.floatingRect!.y + p.y,
      r: p.r,
      g: p.g,
      b: p.b,
      a: p.a,
    }));
  }

  /**
   * Commit the transform operation
   * Returns the final transformed pixels in local coordinates
   *
   * FIXED: When transformType starts with "scale-", rebuild floatingPixels and _sourceGrid
   * from the scaled preview before switching to move or commit, matching rotation baking behavior.
   */
  commitTransform(): FloatingPixel[] {
    if (!this.isTransformingFlag) return [];
    if (!this.floatingRect) return [];
    if (this.floatingPixels.length === 0) return [];

    let committedPixels: FloatingPixel[] = [];

    if (this.transformType === "rotate") {
      if (this._lastRotatedPreview) {
        committedPixels = this._lastRotatedPreview.map((p) => ({
          x: p.x - this.floatingRect!.x,
          y: p.y - this.floatingRect!.y,
          r: p.r,
          g: p.g,
          b: p.b,
          a: p.a,
        }));
      } else {
        const worldPixels = this.applyRotationToFloating();
        committedPixels = worldPixels.map((p) => ({
          x: p.x - this.floatingRect!.x,
          y: p.y - this.floatingRect!.y,
          r: p.r,
          g: p.g,
          b: p.b,
          a: p.a,
        }));
      }
    } else if (this.transformType?.startsWith("scale-")) {
      // FIXED: Bake the scaled preview into floatingPixels and rebuild _sourceGrid
      if (!this._sourceGrid) {
        committedPixels = [...this.floatingPixels];
      } else {
        const dst = this.floatingRect;
        const srcW = this._sourceGrid[0].length;
        const srcH = this._sourceGrid.length;

        // Step 1: Generate scaled pixels in local (0,0-based) coordinates
        const scaledPixels: FloatingPixel[] = [];
        for (let dy = 0; dy < dst.height; dy++) {
          for (let dx = 0; dx < dst.width; dx++) {
            const srcX = Math.floor((dx / dst.width) * srcW);
            const srcY = Math.floor((dy / dst.height) * srcH);
            const px = this._sourceGrid[srcY]?.[srcX];
            if (px) {
              scaledPixels.push({
                x: dx,
                y: dy,
                r: px.r,
                g: px.g,
                b: px.b,
                a: px.a,
              });
            }
          }
        }

        // Step 2: Update floatingPixels with scaled data
        this.floatingPixels = scaledPixels;

        // Step 3: Rebuild _sourceGrid from scaled floatingPixels
        this._sourceGrid = [];
        for (let y = 0; y < dst.height; y++) {
          const row = new Array(dst.width).fill(null);
          this._sourceGrid.push(row);
        }
        for (const p of this.floatingPixels) {
          if (p.x >= 0 && p.x < dst.width && p.y >= 0 && p.y < dst.height) {
            this._sourceGrid[p.y][p.x] = p;
          }
        }

        // Step 4: Ensure floatingRect and selectionRect remain in sync
        this.selectionRect = { ...this.floatingRect };

        committedPixels = [...scaledPixels];
      }
    } else {
      committedPixels = [...this.floatingPixels];
    }

    this.mode = "idle";
    this.isTransformingFlag = false;
    this.transformType = null;
    this.dragStart = null;
    this.transformInitialRect = null;
    this.grabOffset = null;
    this.floatingPixels = [];
    this.originalFloatingPixels = [];
    this.backupPixels = [];
    this.backupRect = null;
    this._sourceGrid = null;
    this._originalSourceGrid = null;
    this.rotationAngle = 0;
    this.rotationStartAngle = 0;
    this.originalRotationRect = null;
    this._lastRotatedPreview = null;
    this.rotationEnvelopeRect = null;

    return committedPixels;
  }

  /**
   * Get outline pixels for rendering
   */
  getOutlinePixels(): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    if (this.mode === "creating" && this.createStart && this.createCurrent) {
      const minX = Math.min(this.createStart.x, this.createCurrent.x);
      const maxX = Math.max(this.createStart.x, this.createCurrent.x);
      const minY = Math.min(this.createStart.y, this.createCurrent.y);
      const maxY = Math.max(this.createStart.y, this.createCurrent.y);

      return this.computeOutline(minX, minY, maxX, maxY);
    }

    if (this.selectionRect) {
      const rect = this.selectionRect;
      const minX = rect.x;
      const maxX = rect.x + rect.width - 1;
      const minY = rect.y;
      const maxY = rect.y + rect.height - 1;

      return this.computeOutline(minX, minY, maxX, maxY);
    }

    return pixels;
  }

  /**
   * Check if there's an active selection
   */
  hasSelection(): boolean {
    return this.selectionRect !== null;
  }

  /**
   * Get current selection rectangle
   */
  getSelectionRect(): SelectionRect | null {
    return this.selectionRect ? { ...this.selectionRect } : null;
  }

  /**
   * Check if currently creating a selection
   */
  isCreating(): boolean {
    return this.mode === "creating";
  }

  /**
   * Check if currently transforming a selection
   */
  isTransforming(): boolean {
    return this.isTransformingFlag;
  }

  /**
   * Get rotation pivot point (for rendering)
   */
  getRotationPivot(): { x: number; y: number } | null {
    return this.rotationPivot;
  }

  /**
   * Check if in rotation mode
   */
  isInRotationMode(): boolean {
    return this.rotationMode;
  }

  /**
   * Get current rotation angle
   */
  getRotationAngle(): number {
    return this.rotationAngle;
  }

  /**
   * Helper method to determine if pivot should be shown
   */
  shouldShowPivot(): boolean {
    return this.rotationMode === true;
  }

  /**
   * Begin rotation mode (Hold-R)
   * FIXED: Ensures floating pixels exist before rotating, then bakes active scale transforms before initializing rotation, and initializes _sourceGrid using world-space floating pixels converted into local coordinates via selectionRect
   */
  beginRotation(): void {
    if (!this.selectionRect) return;

    // 🔑 FIX: Ensure floating pixels exist before rotating
    if (!this.hasFloatingPixels()) {
      this.extractFloatingPixels();
    }

    // Safety: still nothing to rotate
    if (!this.hasFloatingPixels()) return;

    // --- existing logic continues unchanged ---
    if (
      this.isTransformingFlag &&
      this.transformType &&
      this.transformType.startsWith("scale-")
    ) {
      this.bakeActiveScaleToFloating();
    }

    this.transformType = null;
    this.isTransformingFlag = false;

    const rect = this.selectionRect;

    const worldPixels = this.getFloatingPixels();

    this._sourceGrid = [];
    for (let y = 0; y < rect.height; y++) {
      this._sourceGrid.push(new Array(rect.width).fill(null));
    }

    for (const p of worldPixels) {
      const lx = p.x - rect.x;
      const ly = p.y - rect.y;
      if (lx >= 0 && lx < rect.width && ly >= 0 && ly < rect.height) {
        this._sourceGrid[ly][lx] = { ...p, x: lx, y: ly };
      }
    }

    this.originalRotationRect = { ...rect };

    this.rotationMode = true;
    this.rotationAngle = 0;
    this.hasRotationStarted = false;

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    this.rotationPivot = { x: centerX, y: centerY };
    this.pivotOffset = {
      x: centerX - rect.x,
      y: centerY - rect.y,
    };

    this.rotationGrabAngle = null;
    this.rotationEnvelopeRect = { ...rect };
  }

  /**
   * Update rotation during drag
   * Includes controlled mid-rotation pivot rebasing when ALT is held and rotation has started
   */
  updateRotation(cursorX: number, cursorY: number, altKey = false): void {
    if (!this.rotationMode || !this.rotationPivot) return;

    if (altKey) {
      // ALT branch: Allow pivot updates only if rotation hasn't started
      if (!this.hasRotationStarted) {
        // Allow updating pivotOffset before rotation starts
        this.rotationPivot.x = Math.floor(cursorX);
        this.rotationPivot.y = Math.floor(cursorY);

        if (this.originalRotationRect) {
          this.pivotOffset = {
            x: this.rotationPivot.x - this.originalRotationRect.x,
            y: this.rotationPivot.y - this.originalRotationRect.y,
          };
        }

        if (this.lastRotateCursor) {
          this.rotationStartAngle =
            Math.atan2(
              this.lastRotateCursor.y - this.rotationPivot.y,
              this.lastRotateCursor.x - this.rotationPivot.x,
            ) - this.rotationAngle;
        }
      } else {
        // Rotation has started: perform mid-rotation pivot rebasing
        // Step 1: Bake the current rotated preview into floatingPixels
        if (this._lastRotatedPreview && this._lastRotatedPreview.length > 0) {
          // Compute tight bounding box around rotated pixels (in world coordinates)
          let minX = Number.POSITIVE_INFINITY;
          let maxX = Number.NEGATIVE_INFINITY;
          let minY = Number.POSITIVE_INFINITY;
          let maxY = Number.NEGATIVE_INFINITY;

          for (const p of this._lastRotatedPreview) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
          }

          // Update floatingRect to tight bounding box
          const newRect = {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          };

          this.floatingRect = { ...newRect };

          // Step 2: Convert rotated pixels from world coordinates to local (0,0-based) coordinates
          this.floatingPixels = this._lastRotatedPreview.map((p) => ({
            x: p.x - minX,
            y: p.y - minY,
            r: p.r,
            g: p.g,
            b: p.b,
            a: p.a,
          }));

          // Step 3: Rebuild _sourceGrid from the new floatingPixels
          this._sourceGrid = [];
          for (let y = 0; y < newRect.height; y++) {
            const row = new Array(newRect.width).fill(null);
            this._sourceGrid.push(row);
          }
          for (const p of this.floatingPixels) {
            if (
              p.x >= 0 &&
              p.x < newRect.width &&
              p.y >= 0 &&
              p.y < newRect.height
            ) {
              this._sourceGrid[p.y][p.x] = p;
            }
          }

          // Step 4: Clear _lastRotatedPreview
          this._lastRotatedPreview = null;

          // Step 5: Reset rotationAngle and rotationStartAngle to 0
          this.rotationAngle = 0;
          this.rotationStartAngle = 0;

          // Step 6: Set originalRotationRect to the current floatingRect
          this.originalRotationRect = { ...this.floatingRect };

          // Step 7: Update rotationPivot and recompute pivotOffset
          this.rotationPivot.x = Math.floor(cursorX);
          this.rotationPivot.y = Math.floor(cursorY);

          this.pivotOffset = {
            x: this.rotationPivot.x - this.floatingRect.x,
            y: this.rotationPivot.y - this.floatingRect.y,
          };

          // Step 8: Set hasRotationStarted = false
          this.hasRotationStarted = false;

          // Reset rotation envelope
          this.rotationEnvelopeRect = { ...this.originalRotationRect };

          // Clear original source grid
          this._originalSourceGrid = null;

          // Reset rotation grab angle
          this.rotationGrabAngle = null;

          // Force preview settle after pivot rebasing (zero-angle refresh)
          this._lastRotatedPreview = this.applyRotationToFloating();
        } else {
          // No preview to bake, just update rotationPivot for UI
          this.rotationPivot.x = Math.floor(cursorX);
          this.rotationPivot.y = Math.floor(cursorY);
        }
      }

      return;
    }

    // Non-ALT branch: Normal rotation with grab anchoring
    if (this.floatingPixels.length === 0) {
      this.extractFloatingPixels();
    }

    if (!this._originalSourceGrid && this._sourceGrid) {
      this._originalSourceGrid = this._sourceGrid.map((row) => [...row]);
    }

    this.lastRotateCursor = { x: Math.floor(cursorX), y: Math.floor(cursorY) };

    // Calculate cursor angle relative to pivot
    const cursorAngle = Math.atan2(
      cursorY - this.rotationPivot.y,
      cursorX - this.rotationPivot.x,
    );

    // Initialize grab angle on first rotation update
    if (this.rotationGrabAngle === null) {
      this.rotationGrabAngle = cursorAngle;
      this.rotationStartAngle = cursorAngle;
    }

    // Calculate rotation angle as difference from grab angle
    this.rotationAngle = cursorAngle - this.rotationGrabAngle;

    // On the first frame where rotationAngle changes from 0, set hasRotationStarted = true
    if (!this.hasRotationStarted && this.rotationAngle !== 0) {
      this.hasRotationStarted = true;
    }

    if (this.originalRotationRect && this.rotationEnvelopeRect) {
      const rect = this.originalRotationRect;

      const corners = [
        { x: 0, y: 0 },
        { x: rect.width - 1, y: 0 },
        { x: 0, y: rect.height - 1 },
        { x: rect.width - 1, y: rect.height - 1 },
      ];

      const centerX = this.pivotOffset.x;
      const centerY = this.pivotOffset.y;

      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      const cos = Math.cos(this.rotationAngle);
      const sin = Math.sin(this.rotationAngle);

      for (const corner of corners) {
        const offsetX = corner.x - centerX;
        const offsetY = corner.y - centerY;

        const rotatedX = offsetX * cos - offsetY * sin + centerX;
        const rotatedY = offsetX * sin + offsetY * cos + centerY;

        minX = Math.min(minX, Math.floor(rotatedX));
        maxX = Math.max(maxX, Math.ceil(rotatedX));
        minY = Math.min(minY, Math.floor(rotatedY));
        maxY = Math.max(maxY, Math.ceil(rotatedY));
      }

      const candidateRect = {
        x: Math.floor(rect.x + minX),
        y: Math.floor(rect.y + minY),
        width: Math.floor(maxX - minX + 1),
        height: Math.floor(maxY - minY + 1),
      };

      const env = this.rotationEnvelopeRect;
      const minEnvX = Math.min(env.x, candidateRect.x);
      const minEnvY = Math.min(env.y, candidateRect.y);
      const maxEnvX = Math.max(
        env.x + env.width - 1,
        candidateRect.x + candidateRect.width - 1,
      );
      const maxEnvY = Math.max(
        env.y + env.height - 1,
        candidateRect.y + candidateRect.height - 1,
      );

      this.rotationEnvelopeRect = {
        x: minEnvX,
        y: minEnvY,
        width: maxEnvX - minEnvX + 1,
        height: maxEnvY - minEnvY + 1,
      };

      this.floatingRect = { ...this.rotationEnvelopeRect };
    }

    this._lastRotatedPreview = this.applyRotationToFloating();
  }

  /**
   * End rotation mode (Release-R)
   * REFACTORED: Bakes rotated preview into floatingPixels in local space,
   * recomputes tight bounding box, updates both floatingRect and selectionRect,
   * clears preview cache, rebuilds _sourceGrid to make rotation permanent,
   * sets isTransformingFlag=true and transformType='move' for immediate committability,
   * and re-anchors the pivot to the center of the updated selectionRect;
   * resets hasRotationStarted = false without recomputing or recentering pivotOffset
   */
  endRotation(): void {
    if (!this.rotationMode) return;

    // Exit rotation mode
    this.rotationMode = false;
    this.hasRotationStarted = false;
    this.grabOffset = null;
    this.rotationGrabAngle = null;

    // If no rotated preview exists, nothing to bake
    if (!this._lastRotatedPreview || this._lastRotatedPreview.length === 0) {
      this._lastRotatedPreview = null;
      return;
    }

    // Compute tight bounding box around rotated pixels (in world coordinates)
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of this._lastRotatedPreview) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    // Update floatingRect and selectionRect to tight bounding box
    const newRect = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };

    this.floatingRect = { ...newRect };
    this.selectionRect = { ...newRect };

    // Convert rotated pixels from world coordinates to local (0,0-based) coordinates
    this.floatingPixels = this._lastRotatedPreview.map((p) => ({
      x: p.x - minX,
      y: p.y - minY,
      r: p.r,
      g: p.g,
      b: p.b,
      a: p.a,
    }));

    // Clear preview cache
    this._lastRotatedPreview = null;

    // Rebuild _sourceGrid from rotated floatingPixels for future transforms
    this._sourceGrid = [];
    for (let y = 0; y < newRect.height; y++) {
      const row = new Array(newRect.width).fill(null);
      this._sourceGrid.push(row);
    }
    for (const p of this.floatingPixels) {
      if (p.x >= 0 && p.x < newRect.width && p.y >= 0 && p.y < newRect.height) {
        this._sourceGrid[p.y][p.x] = p;
      }
    }

    // Reset rotation state
    this.rotationAngle = 0;
    this.rotationStartAngle = 0;
    this.originalRotationRect = null;
    this.rotationEnvelopeRect = null;
    this._originalSourceGrid = null;
    this.lastRotateCursor = null;

    // Set transform state to make selection immediately committable
    this.isTransformingFlag = true;
    this.transformType = "move";

    // Re-anchor the pivot to the center of the updated selectionRect
    this.rotationPivot = {
      x: this.selectionRect.x + this.selectionRect.width / 2,
      y: this.selectionRect.y + this.selectionRect.height / 2,
    };
    this.pivotOffset = {
      x: this.rotationPivot.x - this.selectionRect.x,
      y: this.rotationPivot.y - this.selectionRect.y,
    };
  }

  /**
   * Apply rotation to floating pixels using true world-space computation
   * Returns preview pixels in world coordinates
   */
  private applyRotationToFloating(): FloatingPixel[] {
    if (!this.floatingRect || !this.originalRotationRect || !this.rotationPivot)
      return [];

    const srcGrid = this._originalSourceGrid || this._sourceGrid;
    if (!srcGrid) return [];

    const result: FloatingPixel[] = [];

    const pivotWorld = this.rotationPivot;
    const srcPivotLocal = this.pivotOffset;

    const a = this.rotationAngle;
    const cos = Math.cos(-a);
    const sin = Math.sin(-a);

    for (let dy = 0; dy < this.floatingRect.height; dy++) {
      for (let dx = 0; dx < this.floatingRect.width; dx++) {
        const wx = this.floatingRect.x + dx;
        const wy = this.floatingRect.y + dy;

        const ox = wx - pivotWorld.x;
        const oy = wy - pivotWorld.y;

        const sx = ox * cos - oy * sin + srcPivotLocal.x;
        const sy = ox * sin + oy * cos + srcPivotLocal.y;

        const ix = Math.floor(sx);
        const iy = Math.floor(sy);

        if (
          iy >= 0 &&
          iy < srcGrid.length &&
          ix >= 0 &&
          ix < srcGrid[0].length
        ) {
          const px = srcGrid[iy]?.[ix];
          if (px) {
            result.push({
              x: wx,
              y: wy,
              r: px.r,
              g: px.g,
              b: px.b,
              a: px.a,
            });
          }
        }
      }
    }

    return result;
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Extract pixels from the active layer into floating selection
   * FIXED: Backup all pixels in selectionRect (including transparent ones) before clearing
   */
  private extractFloatingPixels(): void {
    if (!this.selectionRect) return;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const rect = this.selectionRect;

    // Step 1: Backup all pixels in selectionRect, including transparent ones
    this.backupPixels = [];
    for (let py = 0; py < rect.height; py++) {
      for (let px = 0; px < rect.width; px++) {
        const wx = rect.x + px;
        const wy = rect.y + py;

        // Get pixel from layer; if no pixel exists, record [0,0,0,0]
        const pixel = activeLayer.getPixel(wx, wy);
        if (pixel) {
          this.backupPixels.push({
            x: px,
            y: py,
            r: pixel[0],
            g: pixel[1],
            b: pixel[2],
            a: pixel[3],
          });
        } else {
          this.backupPixels.push({
            x: px,
            y: py,
            r: 0,
            g: 0,
            b: 0,
            a: 0,
          });
        }
      }
    }

    // Assign backupRect once loop completes
    this.backupRect = { ...rect };

    // Step 2: Extract opaque floating pixels for transform operations
    this.floatingPixels = [];
    for (let py = 0; py < rect.height; py++) {
      for (let px = 0; px < rect.width; px++) {
        if (this.lassoMask && !this.lassoMask[py]?.[px]) {
          continue;
        }

        const worldX = rect.x + px;
        const worldY = rect.y + py;

        const pixel = activeLayer.getPixel(worldX, worldY);
        if (pixel && pixel[3] > 0) {
          this.floatingPixels.push({
            x: px,
            y: py,
            r: pixel[0],
            g: pixel[1],
            b: pixel[2],
            a: pixel[3],
          });
        }
      }
    }

    this.originalFloatingPixels = this.floatingPixels.map((p) => ({ ...p }));

    // Step 3: Build _sourceGrid from floating pixels
    this._sourceGrid = [];
    for (let y = 0; y < rect.height; y++) {
      const row = new Array(rect.width).fill(null);
      this._sourceGrid.push(row);
    }
    for (const p of this.floatingPixels) {
      if (p.x >= 0 && p.x < rect.width && p.y >= 0 && p.y < rect.height) {
        this._sourceGrid[p.y][p.x] = p;
      }
    }

    // Step 4: Clear the layer after full backup is finished
    for (let py = 0; py < rect.height; py++) {
      for (let px = 0; px < rect.width; px++) {
        if (this.lassoMask && !this.lassoMask[py]?.[px]) {
          continue;
        }

        const wx = rect.x + px;
        const wy = rect.y + py;
        activeLayer.setPixel(wx, wy, 0, 0, 0, 0);
      }
    }

    this.floatingRect = { ...rect };
  }

  /**
   * Update scale transform with inclusive bounds
   */
  private updateScale(dx: number, dy: number): void {
    if (!this.transformInitialRect || !this.floatingRect || !this.selectionRect)
      return;

    let minX = this.transformInitialRect.x;
    let maxX =
      this.transformInitialRect.x + this.transformInitialRect.width - 1;
    let minY = this.transformInitialRect.y;
    let maxY =
      this.transformInitialRect.y + this.transformInitialRect.height - 1;

    switch (this.transformType) {
      case "scale-nw":
        minX += dx;
        minY += dy;
        break;
      case "scale-ne":
        maxX += dx;
        minY += dy;
        break;
      case "scale-sw":
        minX += dx;
        maxY += dy;
        break;
      case "scale-se":
        maxX += dx;
        maxY += dy;
        break;
      case "scale-n":
        minY += dy;
        break;
      case "scale-s":
        maxY += dy;
        break;
      case "scale-e":
        maxX += dx;
        break;
      case "scale-w":
        minX += dx;
        break;
    }

    let width = Math.max(1, maxX - minX + 1);
    let height = Math.max(1, maxY - minY + 1);

    this.selectionRect.x = minX;
    this.selectionRect.y = minY;
    this.selectionRect.width = width;
    this.selectionRect.height = height;

    this.floatingRect.x = minX;
    this.floatingRect.y = minY;
    this.floatingRect.width = width;
    this.floatingRect.height = height;
  }

  /**
   * Get transformed pixels using nearest-neighbor scaling
   * Returns pixels in world coordinates
   */
  private getTransformedPixels(): FloatingPixel[] {
    if (!this.floatingRect) return [];

    if (this.rotationMode) {
      if (this._lastRotatedPreview !== null) {
        return this._lastRotatedPreview;
      }
      return this.applyRotationToFloating();
    }

    if (this.transformType === "move") {
      return this.floatingPixels.map((p) => ({
        x: this.floatingRect!.x + p.x,
        y: this.floatingRect!.y + p.y,
        r: p.r,
        g: p.g,
        b: p.b,
        a: p.a,
      }));
    }

    if (!this._sourceGrid) return [];

    const dst = this.floatingRect;
    const srcW = this._sourceGrid[0].length;
    const srcH = this._sourceGrid.length;
    const result: FloatingPixel[] = [];

    for (let dy = 0; dy < dst.height; dy++) {
      for (let dx = 0; dx < dst.width; dx++) {
        const srcX = Math.floor((dx / dst.width) * srcW);
        const srcY = Math.floor((dy / dst.height) * srcH);
        const px = this._sourceGrid[srcY]?.[srcX];
        if (px) {
          result.push({
            x: dst.x + dx,
            y: dst.y + dy,
            r: px.r,
            g: px.g,
            b: px.b,
            a: px.a,
          });
        }
      }
    }
    return result;
  }

  /**
   * Compute perfectly consistent 1-pixel outline with inclusive bounds
   */
  private computeOutline(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Array<{ x: number; y: number }> {
    const pixels: Array<{ x: number; y: number }> = [];

    const x1 = Math.floor(Math.min(minX, maxX));
    const x2 = Math.floor(Math.max(minX, maxX));
    const y1 = Math.floor(Math.min(minY, maxY));
    const y2 = Math.floor(Math.max(minY, maxY));

    for (let x = x1; x <= x2; x++) {
      pixels.push({ x, y: y1 });
    }

    if (y2 !== y1) {
      for (let x = x1; x <= x2; x++) {
        pixels.push({ x, y: y2 });
      }
    }

    for (let y = y1 + 1; y < y2; y++) {
      pixels.push({ x: x1, y });
    }

    if (x2 !== x1) {
      for (let y = y1 + 1; y < y2; y++) {
        pixels.push({ x: x2, y });
      }
    }

    return pixels;
  }
}
