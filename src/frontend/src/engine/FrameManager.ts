/**
 * FrameManager.ts
 * Manages multiple animation frames with internal frame ID generation, each containing a LayerManager and UndoRedoManager with support for hierarchical layer structure, deep cloning for frame duplication, frame switching by index, drag-and-drop frame reordering, per-frame duration editing, and onion skin support for accessing adjacent frames; initial frame created in constructor gets exactly one default layer named "Layer 1" with undo manager attached, and new frames created via addFrame() also get exactly one default layer.
 */

import { LayerManager } from "./LayerManager";
import { UndoRedoManager } from "./UndoRedoManager";

/**
 * Generate a unique ID for frames
 */
function generateFrameId(): string {
  return `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface Frame {
  id: string;
  layerManager: LayerManager;
  undoRedoManager: UndoRedoManager;
  duration: number; // in milliseconds, default 100
}

export class FrameManager {
  private frames: Frame[] = [];
  private currentFrameIndex = 0;
  public width: number;
  public height: number;

  constructor(width = 600, height = 400) {
    this.width = width;
    this.height = height;

    // Create first frame with unique ID and default duration
    const firstFrameId = generateFrameId();
    const layerManager = new LayerManager(width, height);
    const undoRedoManager = new UndoRedoManager();

    // Attach undo manager BEFORE creating the default layer
    layerManager.attachUndoManager(undoRedoManager);

    // Check if the initial frame has zero layers and create exactly one default layer
    if (layerManager.getLayerCount() === 0) {
      layerManager.createLayer("Layer 1");
    }

    const firstFrame: Frame = {
      id: firstFrameId,
      layerManager,
      undoRedoManager,
      duration: 100,
    };

    this.frames = [firstFrame];
    this.currentFrameIndex = 0;
  }

  /**
   * Get the current frame
   */
  getCurrent(): LayerManager {
    if (
      this.currentFrameIndex < 0 ||
      this.currentFrameIndex >= this.frames.length
    ) {
      return this.frames[0].layerManager;
    }
    return this.frames[this.currentFrameIndex].layerManager;
  }

  /**
   * Get the current frame object
   */
  getCurrentFrame(): Frame | null {
    if (
      this.currentFrameIndex < 0 ||
      this.currentFrameIndex >= this.frames.length
    ) {
      return null;
    }
    return this.frames[this.currentFrameIndex];
  }

  /**
   * Get the current LayerManager
   */
  getCurrentLayerManager(): LayerManager {
    return this.getCurrent();
  }

  /**
   * Get the current UndoRedoManager
   */
  getCurrentUndoRedoManager(): UndoRedoManager {
    if (
      this.currentFrameIndex < 0 ||
      this.currentFrameIndex >= this.frames.length
    ) {
      return this.frames[0].undoRedoManager;
    }
    return this.frames[this.currentFrameIndex].undoRedoManager;
  }

  /**
   * Get all frames
   */
  getFrames(): Frame[] {
    return this.frames;
  }

  /**
   * Set active frame by index
   * @param index - Frame index to switch to
   * @returns true if successful, false otherwise
   */
  setActiveFrame(index: number): boolean {
    if (index < 0 || index >= this.frames.length) {
      return false;
    }
    this.currentFrameIndex = index;
    return true;
  }

  /**
   * Add a new frame with default duration and exactly one default layer named "Layer 1"
   * @returns The new frame ID
   */
  addFrame(): string {
    const newFrameId = generateFrameId();
    const layerManager = new LayerManager(this.width, this.height);
    const undoRedoManager = new UndoRedoManager();

    // Attach undo manager BEFORE creating the default layer
    layerManager.attachUndoManager(undoRedoManager);

    // Create exactly one default layer named "Layer 1"
    layerManager.createLayer("Layer 1");

    const newFrame: Frame = {
      id: newFrameId,
      layerManager,
      undoRedoManager,
      duration: 100,
    };

    this.frames.push(newFrame);
    return newFrameId;
  }

  /**
   * Delete a frame by ID
   * @param id - Frame ID to delete
   * @returns true if successful, false otherwise
   */
  deleteFrame(id: string): boolean {
    if (this.frames.length <= 1) {
      return false; // Cannot delete the last frame
    }

    const index = this.frames.findIndex((f) => f.id === id);
    if (index === -1) {
      return false;
    }

    this.frames.splice(index, 1);

    // Adjust current frame index if necessary
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
    }

    return true;
  }

  /**
   * Duplicate a frame by ID using deep cloning
   * @param id - Frame ID to duplicate
   * @returns New frame ID if successful, null otherwise
   */
  duplicateFrame(id: string): string | null {
    const sourceIndex = this.frames.findIndex((f) => f.id === id);
    if (sourceIndex === -1) {
      return null;
    }

    const sourceFrame = this.frames[sourceIndex];
    const newFrameId = generateFrameId();

    // Deep clone the LayerManager using the clone() method
    const clonedLayerManager = sourceFrame.layerManager.clone();

    // Create new frame with cloned LayerManager and same duration
    const newFrame: Frame = {
      id: newFrameId,
      layerManager: clonedLayerManager,
      undoRedoManager: new UndoRedoManager(), // Fresh undo history for new frame
      duration: sourceFrame.duration, // Copy duration from source frame
    };

    // Insert after the source frame
    this.frames.splice(sourceIndex + 1, 0, newFrame);

    return newFrameId;
  }

  /**
   * Move a frame from source position to target position
   * @param sourceId - Source frame ID to move
   * @param targetId - Target frame ID to move before
   */
  moveFrame(sourceId: string, targetId: string): void {
    const srcIndex = this.frames.findIndex((f) => f.id === sourceId);
    const tgtIndex = this.frames.findIndex((f) => f.id === targetId);

    if (srcIndex === -1 || tgtIndex === -1) {
      return;
    }

    // Remove source frame
    const [frame] = this.frames.splice(srcIndex, 1);

    // Insert at target position
    this.frames.splice(tgtIndex, 0, frame);
  }

  /**
   * Switch to a frame by ID
   * @param id - Frame ID to switch to
   * @returns true if successful, false otherwise
   */
  switchToFrame(id: string): boolean {
    const index = this.frames.findIndex((f) => f.id === id);
    if (index === -1) {
      return false;
    }

    this.currentFrameIndex = index;
    return true;
  }

  /**
   * Get the total number of frames
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * Get the current frame index
   */
  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * Set the current frame by index
   * @param index - Frame index to set
   */
  setCurrentFrame(index: number): void {
    if (index < 0 || index >= this.frames.length) {
      return;
    }
    this.currentFrameIndex = index;
  }

  /**
   * Get the current frame ID
   */
  getCurrentFrameId(): string | null {
    if (
      this.currentFrameIndex < 0 ||
      this.currentFrameIndex >= this.frames.length
    ) {
      return null;
    }
    return this.frames[this.currentFrameIndex].id;
  }

  /**
   * Get all frame IDs in order
   */
  getFrameIds(): string[] {
    return this.frames.map((f) => f.id);
  }

  /**
   * Get frame duration by index
   * @param index - Frame index
   * @returns Duration in milliseconds, or 100 if invalid index
   */
  getFrameDuration(index: number): number {
    if (index < 0 || index >= this.frames.length) {
      return 100;
    }
    return this.frames[index].duration;
  }

  /**
   * Set frame duration by index
   * @param index - Frame index
   * @param duration - Duration in milliseconds (clamped between 10 and 1000)
   */
  setFrameDuration(index: number, duration: number): void {
    if (index < 0 || index >= this.frames.length) {
      return;
    }

    // Clamp duration between 10 and 1000 milliseconds
    const clampedDuration = Math.max(10, Math.min(1000, duration));
    this.frames[index].duration = clampedDuration;
  }

  /**
   * Get the previous frame's LayerManager for onion skin support
   * @returns LayerManager of previous frame, or null if at first frame
   */
  getPreviousFrame(): LayerManager | null {
    if (this.currentFrameIndex <= 0) {
      return null;
    }
    return this.frames[this.currentFrameIndex - 1].layerManager;
  }

  /**
   * Get the next frame's LayerManager for onion skin support
   * @returns LayerManager of next frame, or null if at last frame
   */
  getNextFrame(): LayerManager | null {
    if (this.currentFrameIndex >= this.frames.length - 1) {
      return null;
    }
    return this.frames[this.currentFrameIndex + 1].layerManager;
  }

  /**
   * Resize the canvas for all frames.
   * Calls LayerManager.resizeCanvas(newW, newH) inside each frame.
   */
  resizeCanvas(newWidth: number, newHeight: number): void {
    this.width = newWidth;
    this.height = newHeight;

    for (const frame of this.frames) {
      frame.layerManager.resizeCanvas(newWidth, newHeight);
    }
  }

  /**
   * Navigate to the next frame
   */
  nextFrame(): boolean {
    if (this.currentFrameIndex >= this.frames.length - 1) {
      return false;
    }

    this.currentFrameIndex++;
    return true;
  }

  /**
   * Navigate to the previous frame
   */
  previousFrame(): boolean {
    if (this.currentFrameIndex <= 0) {
      return false;
    }

    this.currentFrameIndex--;
    return true;
  }

  /**
   * Clear all frames and reset to a single empty frame
   */
  clearAllFrames(): void {
    const newFrameId = generateFrameId();
    const layerManager = new LayerManager(this.width, this.height);
    const undoRedoManager = new UndoRedoManager();

    // Attach undo manager BEFORE creating the default layer
    layerManager.attachUndoManager(undoRedoManager);

    // Create exactly one default layer named "Layer 1"
    layerManager.createLayer("Layer 1");

    this.frames = [
      {
        id: newFrameId,
        layerManager,
        undoRedoManager,
        duration: 100,
      },
    ];
    this.currentFrameIndex = 0;
  }
}
