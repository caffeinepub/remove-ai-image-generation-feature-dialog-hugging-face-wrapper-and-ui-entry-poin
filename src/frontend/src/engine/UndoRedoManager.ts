/**
 * UndoRedoManager.ts
 * Stores undo and redo stacks for pixel edits with atomic stroke-based transactions.
 *
 * Supports two command types:
 *  1. Rectangular diffs (legacy): x, y, w, h, layerIndex, before/after buffers
 *  2. Atomic transactions: arrays of individual pixel changes grouped by complete actions
 *
 * Includes a minimal event system for reactive UI updates.
 */

import type { Layer } from "./Layer";

export interface Change {
  x: number;
  y: number;
  old: [number, number, number, number]; // [r, g, b, a]
  new: [number, number, number, number]; // [r, g, b, a]
  layer: Layer;
}

export interface UndoCommand {
  layerIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  before: Uint8ClampedArray;
  after: Uint8ClampedArray;
  // New: support for atomic transactions
  changes?: Change[];
}

export class UndoRedoManager {
  private undoStack: UndoCommand[] = [];
  private redoStack: UndoCommand[] = [];
  private limit = 200; // reasonable limit
  private currentTransaction: Change[] | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Subscribe to undo/redo state changes
   */
  onChange(callback: () => void): void {
    this.listeners.add(callback);
  }

  /**
   * Unsubscribe from undo/redo state changes
   */
  offChange(callback: () => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Emit change event to all listeners
   */
  private emitChange(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }

  /**
   * Begin a new transaction for atomic stroke-based undo
   * Safety: returns early if a transaction is already active
   */
  beginTransaction(): void {
    if (this.currentTransaction) return;
    this.currentTransaction = [];
  }

  /**
   * Ensure a transaction exists
   * Creates a new transaction if none is active
   */
  ensureTransaction(): void {
    if (!this.currentTransaction) {
      this.currentTransaction = [];
    }
  }

  /**
   * Push a single pixel change to the current transaction
   */
  pushChange(change: Change): void {
    if (this.currentTransaction) {
      this.currentTransaction.push(change);
    }
  }

  /**
   * End the current transaction and push it to the undo stack
   */
  endTransaction(): void {
    if (this.currentTransaction && this.currentTransaction.length > 0) {
      // Create an undo command with the transaction changes
      // Use dummy values for x, y, w, h since we're using the changes array
      const command: UndoCommand = {
        layerIndex: 0, // Not used for transaction-based commands
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        before: new Uint8ClampedArray(0),
        after: new Uint8ClampedArray(0),
        changes: this.currentTransaction,
      };

      this.push(command);
    }
    this.currentTransaction = null;
  }

  /**
   * Clear everything (e.g. when creating new project)
   */
  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentTransaction = null;
    this.emitChange();
  }

  /**
   * Push a new undo action (supports both rectangular diffs and transactions)
   */
  push(command: UndoCommand): void {
    this.undoStack.push(command);
    this.redoStack = []; // clear redo on new action

    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }

    this.emitChange();
  }

  /**
   * Undo: apply the 'before' pixels or restore old pixel values from transaction
   */
  undo(
    applyFn: (cmd: UndoCommand, pixels: Uint8ClampedArray) => void,
  ): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;

    // Check if this is a transaction-based command
    if (cmd.changes && cmd.changes.length > 0) {
      // Apply changes in reverse order, restoring old values
      for (let i = cmd.changes.length - 1; i >= 0; i--) {
        const change = cmd.changes[i];
        const [r, g, b, a] = change.old;
        change.layer.setPixel(change.x, change.y, r, g, b, a);
      }
    } else {
      // Legacy rectangular diff command
      applyFn(cmd, cmd.before);
    }

    this.redoStack.push(cmd);
    this.emitChange();
    return true;
  }

  /**
   * Redo: apply the 'after' pixels or reapply new pixel values from transaction
   */
  redo(
    applyFn: (cmd: UndoCommand, pixels: Uint8ClampedArray) => void,
  ): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;

    // Check if this is a transaction-based command
    if (cmd.changes && cmd.changes.length > 0) {
      // Apply changes in forward order, reapplying new values
      for (const change of cmd.changes) {
        const [r, g, b, a] = change.new;
        change.layer.setPixel(change.x, change.y, r, g, b, a);
      }
    } else {
      // Legacy rectangular diff command
      applyFn(cmd, cmd.after);
    }

    this.undoStack.push(cmd);
    this.emitChange();
    return true;
  }

  /**
   * Check if currently in a transaction
   */
  isInTransaction(): boolean {
    return this.currentTransaction !== null;
  }
}
