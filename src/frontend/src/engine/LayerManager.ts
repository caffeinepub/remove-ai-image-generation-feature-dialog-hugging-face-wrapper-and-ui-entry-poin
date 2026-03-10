/**
 * LayerManager.ts
 * Manages true hierarchical layer node structure using LayerNode type with unique IDs, supporting both layer and group nodes with actual parent-child relationships, providing flatten() for rendering compatibility, ID-based CRUD operations with backward compatibility, enhanced drag-and-drop with improved positional modes and safe hierarchical move implementation, layer and group duplication functionality with deep cloning, persistent group collapse state management, deep cloning support for complete layer tree duplication, reference layer support with importReferenceImage() method, per-layer filter management with setLayerFilter() and setLayerDropShadow() methods, layer alignment methods for positioning layers on canvas edges and centers, layer transformation methods (invert, flip horizontal, flip vertical) with undo/redo integration, and maintaining full backward compatibility with existing index-based APIs while internally using ID-based active layer tracking.
 */

import { type BlendMode, Layer } from "./Layer";
import type { UndoCommand, UndoRedoManager } from "./UndoRedoManager";

/**
 * Generate a unique ID for layer nodes
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// LayerNode type definition supporting both layer and group nodes
// Note: collapsed property is only for group nodes
export type LayerNode = {
  id: string;
  type: "layer" | "group";
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  children?: LayerNode[];
  layer?: Layer;
  collapsed?: boolean; // Only for group nodes - controls expand/collapse state
  isReference?: boolean; // Only for layer nodes - marks reference layers
};

export class LayerManager {
  private nodes: LayerNode[] = [];
  private activeLayerId: string | null = null;
  public canvasWidth: number;
  public canvasHeight: number;
  public undoManager: UndoRedoManager | null = null;
  private compositeBuffer: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.compositeBuffer = new Uint8ClampedArray(width * height * 4);
  }

  /**
   * Attach an UndoRedoManager to this LayerManager
   */
  attachUndoManager(manager: UndoRedoManager): void {
    this.undoManager = manager;

    // Also attach to all existing layers for atomic change tracking
    const flatNodes = this.flatten();
    for (const node of flatNodes) {
      if (node.layer) {
        node.layer.attachUndoManager(manager);
      }
    }
  }

  /**
   * Recursively flatten the node tree in proper Z-order (topmost last)
   * Returns all layer nodes in bottom-to-top rendering order
   */
  flatten(): LayerNode[] {
    const result: LayerNode[] = [];

    const traverse = (nodeList: LayerNode[]) => {
      for (const node of nodeList) {
        if (node.type === "layer") {
          result.push(node);
        } else if (node.type === "group" && node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(this.nodes);
    return result;
  }

  /**
   * Get flat render order - returns all visible layers in top-to-bottom hierarchical order
   */
  getFlatRenderOrder(): Layer[] {
    const flatNodes = this.flatten();
    const result: Layer[] = [];

    for (const node of flatNodes) {
      if (node.visible && node.layer) {
        result.push(node.layer);
      }
    }

    return result;
  }

  /**
   * Create a new layer and add it to the stack
   * Returns the layer object for backward compatibility
   */
  createLayer(name?: string): Layer {
    const id = generateId();
    const layerName = name || `Layer ${this.getLayerCount() + 1}`;
    const layer = new Layer(this.canvasWidth, this.canvasHeight, layerName);

    // Attach undo manager to new layer if available
    if (this.undoManager) {
      layer.attachUndoManager(this.undoManager);
    }

    const layerNode: LayerNode = {
      id,
      type: "layer",
      name: layerName,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: "normal",
      layer,
      isReference: false,
    };

    this.nodes.push(layerNode);
    this.activeLayerId = id;

    return layer;
  }

  /**
   * Import a reference image and create a locked, semi-transparent reference layer at the bottom
   * @param imageData - Image data to import
   * @param name - Name for the reference layer
   */
  importReferenceImage(imageData: ImageData, name: string): void {
    const id = generateId();
    const layerName = `Reference (${name})`;
    const layer = new Layer(this.canvasWidth, this.canvasHeight, layerName);

    // Attach undo manager to new layer if available
    if (this.undoManager) {
      layer.attachUndoManager(this.undoManager);
    }

    // Copy image data to layer
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        // Only set pixels within canvas bounds
        if (x < this.canvasWidth && y < this.canvasHeight) {
          layer.setPixel(x, y, r, g, b, a);
        }
      }
    }

    const layerNode: LayerNode = {
      id,
      type: "layer",
      name: layerName,
      visible: true,
      locked: true,
      opacity: 0.5,
      blendMode: "normal",
      layer,
      isReference: true,
    };

    // Insert at the beginning (bottom of stack)
    this.nodes.unshift(layerNode);
  }

  /**
   * Set a pixel on a specific layer by ID
   * @param layerId - ID of the layer
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param r - Red value
   * @param g - Green value
   * @param b - Blue value
   * @param a - Alpha value
   */
  setPixelOnLayer(
    layerId: string,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const node = this.findNodeById(layerId);
    if (node && node.type === "layer" && node.layer) {
      node.layer.setPixel(x, y, r, g, b, a);
    }
  }

  /**
   * Set a filter property on the active layer
   * @param key - Filter property key (hue, brightness, contrast, grayscale, blur)
   * @param value - Filter value
   */
  setLayerFilter(
    id: string,
    key: keyof Omit<Layer["filters"], "dropShadow">,
    value: number,
  ): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    node.layer.filters[key] = value;

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Set a drop shadow property on the active layer
   * @param key - Drop shadow property key
   * @param value - Drop shadow value
   */
  setLayerDropShadow(
    id: string,
    key: keyof Layer["filters"]["dropShadow"],
    value: number | string,
  ): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    (node.layer.filters.dropShadow as any)[key] = value;

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Invert colors of the active layer
   * Wraps operation in undo transaction
   */
  invertActiveLayer(): void {
    if (!this.activeLayerId) return;

    const node = this.findNodeById(this.activeLayerId);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Start undo transaction
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    // Invert all pixels
    for (let i = 0; i < layer.pixels.length; i += 4) {
      const a = layer.pixels[i + 3];

      // Only invert non-transparent pixels
      if (a > 0) {
        layer.pixels[i] = 255 - layer.pixels[i]; // Invert R
        layer.pixels[i + 1] = 255 - layer.pixels[i + 1]; // Invert G
        layer.pixels[i + 2] = 255 - layer.pixels[i + 2]; // Invert B
        // Keep alpha unchanged
      }
    }

    // End undo transaction
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Flip the active layer horizontally
   * Wraps operation in undo transaction
   */
  flipActiveLayerHorizontal(): void {
    if (!this.activeLayerId) return;

    const node = this.findNodeById(this.activeLayerId);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Start undo transaction
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    // Create temporary buffer for flipped pixels
    const tempPixels = new Uint8ClampedArray(layer.pixels.length);

    // Flip horizontally
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcIndex = (y * layer.width + x) * 4;
        const dstX = layer.width - 1 - x;
        const dstIndex = (y * layer.width + dstX) * 4;

        tempPixels[dstIndex] = layer.pixels[srcIndex];
        tempPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
        tempPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
        tempPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
      }
    }

    // Copy flipped pixels back to layer
    layer.pixels.set(tempPixels);

    // End undo transaction
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Flip the active layer vertically
   * Wraps operation in undo transaction
   */
  flipActiveLayerVertical(): void {
    if (!this.activeLayerId) return;

    const node = this.findNodeById(this.activeLayerId);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Start undo transaction
    if (this.undoManager) {
      this.undoManager.beginTransaction();
    }

    // Create temporary buffer for flipped pixels
    const tempPixels = new Uint8ClampedArray(layer.pixels.length);

    // Flip vertically
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcIndex = (y * layer.width + x) * 4;
        const dstY = layer.height - 1 - y;
        const dstIndex = (dstY * layer.width + x) * 4;

        tempPixels[dstIndex] = layer.pixels[srcIndex];
        tempPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
        tempPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
        tempPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
      }
    }

    // Copy flipped pixels back to layer
    layer.pixels.set(tempPixels);

    // End undo transaction
    if (this.undoManager) {
      this.undoManager.endTransaction();
    }

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Align layer to the left edge of the canvas
   * @param id - ID of the layer to align
   */
  alignLayerLeft(id: string): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Find leftmost non-transparent pixel
    let minX = layer.width;
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const pixel = layer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          minX = Math.min(minX, x);
          break;
        }
      }
    }

    // If no content found, do nothing
    if (minX === layer.width) return;

    // Calculate shift amount
    const shiftX = -minX;
    if (shiftX === 0) return;

    // Create new pixel buffer
    const newPixels = new Uint8ClampedArray(layer.width * layer.height * 4);

    // Copy pixels with shift
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcX = x - shiftX;
        if (srcX >= 0 && srcX < layer.width) {
          const srcIndex = (y * layer.width + srcX) * 4;
          const dstIndex = (y * layer.width + x) * 4;
          newPixels[dstIndex] = layer.pixels[srcIndex];
          newPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
          newPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
          newPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }

    layer.pixels.set(newPixels);

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Align layer to the right edge of the canvas
   * @param id - ID of the layer to align
   */
  alignLayerRight(id: string): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Find rightmost non-transparent pixel
    let maxX = -1;
    for (let y = 0; y < layer.height; y++) {
      for (let x = layer.width - 1; x >= 0; x--) {
        const pixel = layer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          maxX = Math.max(maxX, x);
          break;
        }
      }
    }

    // If no content found, do nothing
    if (maxX === -1) return;

    // Calculate shift amount
    const shiftX = layer.width - 1 - maxX;
    if (shiftX === 0) return;

    // Create new pixel buffer
    const newPixels = new Uint8ClampedArray(layer.width * layer.height * 4);

    // Copy pixels with shift
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcX = x - shiftX;
        if (srcX >= 0 && srcX < layer.width) {
          const srcIndex = (y * layer.width + srcX) * 4;
          const dstIndex = (y * layer.width + x) * 4;
          newPixels[dstIndex] = layer.pixels[srcIndex];
          newPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
          newPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
          newPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }

    layer.pixels.set(newPixels);

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Align layer to the horizontal center of the canvas
   * @param id - ID of the layer to align
   */
  alignLayerHorizontalCenter(id: string): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Find leftmost and rightmost non-transparent pixels
    let minX = layer.width;
    let maxX = -1;
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const pixel = layer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }

    // If no content found, do nothing
    if (minX === layer.width || maxX === -1) return;

    // Calculate content center and canvas center
    const contentCenterX = (minX + maxX) / 2;
    const canvasCenterX = (layer.width - 1) / 2;
    const shiftX = Math.round(canvasCenterX - contentCenterX);

    if (shiftX === 0) return;

    // Create new pixel buffer
    const newPixels = new Uint8ClampedArray(layer.width * layer.height * 4);

    // Copy pixels with shift
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcX = x - shiftX;
        if (srcX >= 0 && srcX < layer.width) {
          const srcIndex = (y * layer.width + srcX) * 4;
          const dstIndex = (y * layer.width + x) * 4;
          newPixels[dstIndex] = layer.pixels[srcIndex];
          newPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
          newPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
          newPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }

    layer.pixels.set(newPixels);

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Align layer to the vertical middle of the canvas
   * @param id - ID of the layer to align
   */
  alignLayerVerticalMiddle(id: string): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Find topmost and bottommost non-transparent pixels
    let minY = layer.height;
    let maxY = -1;
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const pixel = layer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // If no content found, do nothing
    if (minY === layer.height || maxY === -1) return;

    // Calculate content center and canvas center
    const contentCenterY = (minY + maxY) / 2;
    const canvasCenterY = (layer.height - 1) / 2;
    const shiftY = Math.round(canvasCenterY - contentCenterY);

    if (shiftY === 0) return;

    // Create new pixel buffer
    const newPixels = new Uint8ClampedArray(layer.width * layer.height * 4);

    // Copy pixels with shift
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcY = y - shiftY;
        if (srcY >= 0 && srcY < layer.height) {
          const srcIndex = (srcY * layer.width + x) * 4;
          const dstIndex = (y * layer.width + x) * 4;
          newPixels[dstIndex] = layer.pixels[srcIndex];
          newPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
          newPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
          newPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }

    layer.pixels.set(newPixels);

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Align layer to the top edge of the canvas
   * @param id - ID of the layer to align
   */
  alignLayerTop(id: string): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Find topmost non-transparent pixel
    let minY = layer.height;
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const pixel = layer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          minY = Math.min(minY, y);
          break;
        }
      }
      if (minY < layer.height) break;
    }

    // If no content found, do nothing
    if (minY === layer.height) return;

    // Calculate shift amount
    const shiftY = -minY;
    if (shiftY === 0) return;

    // Create new pixel buffer
    const newPixels = new Uint8ClampedArray(layer.width * layer.height * 4);

    // Copy pixels with shift
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcY = y - shiftY;
        if (srcY >= 0 && srcY < layer.height) {
          const srcIndex = (srcY * layer.width + x) * 4;
          const dstIndex = (y * layer.width + x) * 4;
          newPixels[dstIndex] = layer.pixels[srcIndex];
          newPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
          newPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
          newPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }

    layer.pixels.set(newPixels);

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Align layer to the bottom edge of the canvas
   * @param id - ID of the layer to align
   */
  alignLayerBottom(id: string): void {
    const node = this.findNodeById(id);
    if (!node || node.type !== "layer" || !node.layer) return;

    const layer = node.layer;

    // Find bottommost non-transparent pixel
    let maxY = -1;
    for (let y = layer.height - 1; y >= 0; y--) {
      for (let x = 0; x < layer.width; x++) {
        const pixel = layer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          maxY = Math.max(maxY, y);
          break;
        }
      }
      if (maxY >= 0) break;
    }

    // If no content found, do nothing
    if (maxY === -1) return;

    // Calculate shift amount
    const shiftY = layer.height - 1 - maxY;
    if (shiftY === 0) return;

    // Create new pixel buffer
    const newPixels = new Uint8ClampedArray(layer.width * layer.height * 4);

    // Copy pixels with shift
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const srcY = y - shiftY;
        if (srcY >= 0 && srcY < layer.height) {
          const srcIndex = (srcY * layer.width + x) * 4;
          const dstIndex = (y * layer.width + x) * 4;
          newPixels[dstIndex] = layer.pixels[srcIndex];
          newPixels[dstIndex + 1] = layer.pixels[srcIndex + 1];
          newPixels[dstIndex + 2] = layer.pixels[srcIndex + 2];
          newPixels[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }

    layer.pixels.set(newPixels);

    // Trigger editor refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }
  }

  /**
   * Create a new group and add it to the stack
   * Returns the group ID
   */
  createGroup(name: string): string {
    const id = generateId();

    const groupNode: LayerNode = {
      id,
      type: "group",
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: "normal",
      children: [],
      collapsed: false, // Initialize with expanded state
    };

    this.nodes.push(groupNode);

    return id;
  }

  /**
   * Find a node by ID (searches recursively)
   */
  private findNodeById(
    id: string,
    nodeList: LayerNode[] = this.nodes,
  ): LayerNode | null {
    for (const node of nodeList) {
      if (node.id === id) {
        return node;
      }
      if (node.type === "group" && node.children) {
        const found = this.findNodeById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Check if a node is a descendant of another node
   */
  private isDescendantOf(nodeId: string, ancestorId: string): boolean {
    const ancestor = this.findNodeById(ancestorId);
    if (!ancestor || ancestor.type !== "group" || !ancestor.children) {
      return false;
    }

    const checkChildren = (children: LayerNode[]): boolean => {
      for (const child of children) {
        if (child.id === nodeId) {
          return true;
        }
        if (child.type === "group" && child.children) {
          if (checkChildren(child.children)) {
            return true;
          }
        }
      }
      return false;
    };

    return checkChildren(ancestor.children);
  }

  /**
   * Private helper that recursively locates a node's parent, child array, and index
   * @param id - ID of the node to find
   * @returns Object containing parent node, children array, and index, or null if not found
   */
  private findParentOf(
    id: string,
  ): { parent: LayerNode | null; children: LayerNode[]; index: number } | null {
    // Check root level
    const rootIndex = this.nodes.findIndex((n) => n.id === id);
    if (rootIndex !== -1) {
      return { parent: null, children: this.nodes, index: rootIndex };
    }

    // Recursively search in groups
    const searchInChildren = (
      nodeList: LayerNode[],
      _parent: LayerNode | null,
    ): {
      parent: LayerNode | null;
      children: LayerNode[];
      index: number;
    } | null => {
      for (const node of nodeList) {
        if (node.type === "group" && node.children) {
          const childIndex = node.children.findIndex((n) => n.id === id);
          if (childIndex !== -1) {
            return { parent: node, children: node.children, index: childIndex };
          }

          const found = searchInChildren(node.children, node);
          if (found) return found;
        }
      }
      return null;
    };

    return searchInChildren(this.nodes, null);
  }

  /**
   * Private helper to deep clone a node (layer or group)
   * @param node - Node to clone
   * @returns Cloned node with new ID and " Copy" suffix
   */
  private cloneNode(node: LayerNode): LayerNode {
    const newId = generateId();
    const newName = `${node.name} Copy`;

    if (node.type === "layer" && node.layer) {
      // Deep clone layer with pixel data
      const clonedLayer = node.layer.clone();
      clonedLayer.name = newName;

      // Attach undo manager if available
      if (this.undoManager) {
        clonedLayer.attachUndoManager(this.undoManager);
      }

      return {
        id: newId,
        type: "layer",
        name: newName,
        visible: node.visible,
        locked: node.locked,
        opacity: node.opacity,
        blendMode: node.blendMode,
        layer: clonedLayer,
        isReference: node.isReference,
      };
    }
    if (node.type === "group" && node.children) {
      // Recursively clone group and all children
      const clonedChildren = node.children.map((child) =>
        this.cloneNode(child),
      );

      return {
        id: newId,
        type: "group",
        name: newName,
        visible: node.visible,
        locked: node.locked,
        opacity: node.opacity,
        blendMode: node.blendMode,
        children: clonedChildren,
        collapsed: node.collapsed, // Preserve collapse state
      };
    }

    // Fallback (should not reach here)
    return {
      id: newId,
      type: node.type,
      name: newName,
      visible: node.visible,
      locked: node.locked,
      opacity: node.opacity,
      blendMode: node.blendMode,
      children: node.type === "group" ? [] : undefined,
      layer: undefined,
      collapsed: node.type === "group" ? false : undefined,
      isReference: false,
    };
  }

  /**
   * Private helper to replace the internal node tree
   * Used during cloning operations to set the cloned tree structure
   * @param nodes - New node tree to set
   */
  private _setTree(nodes: LayerNode[]): void {
    this.nodes = nodes;
  }

  /**
   * Deep clone the entire LayerManager with all layers and groups
   * Creates a new LayerManager instance with cloned layer tree and new IDs
   * @returns New LayerManager instance with cloned content
   */
  clone(): LayerManager {
    // Create new LayerManager with same dimensions
    const clonedManager = new LayerManager(this.canvasWidth, this.canvasHeight);

    // Deep clone all nodes in the tree
    const clonedNodes = this.nodes.map((node) => this.cloneNode(node));

    // Set the cloned tree
    clonedManager._setTree(clonedNodes);

    // Clone active layer ID if it exists
    if (this.activeLayerId) {
      // Find the corresponding cloned node by matching the original structure
      const originalIndex = this.flatten().findIndex(
        (n) => n.id === this.activeLayerId,
      );
      if (originalIndex !== -1) {
        const clonedFlatNodes = clonedManager.flatten();
        if (originalIndex < clonedFlatNodes.length) {
          clonedManager.activeLayerId = clonedFlatNodes[originalIndex].id;
        }
      }
    }

    return clonedManager;
  }

  /**
   * Get an item (layer or group) by ID
   */
  getItem(id: string): LayerNode | null {
    return this.findNodeById(id);
  }

  /**
   * Get tree structure of all nodes
   */
  getTree(): LayerNode[] {
    return [...this.nodes];
  }

  /**
   * Get the current hierarchical node array
   * @returns Current hierarchical node array
   */
  getNodeTree(): LayerNode[] {
    return [...this.nodes];
  }

  /**
   * Set the active layer by ID or index (backward compatibility)
   */
  setActiveLayer(idOrIndex: string | number): void {
    if (typeof idOrIndex === "string") {
      // ID-based selection
      const node = this.findNodeById(idOrIndex);
      if (node && node.type === "layer") {
        this.activeLayerId = idOrIndex;
      }
    } else {
      // Index-based selection (backward compatibility)
      const flatNodes = this.flatten();
      if (idOrIndex >= 0 && idOrIndex < flatNodes.length) {
        this.activeLayerId = flatNodes[idOrIndex].id;
      }
    }
  }

  /**
   * Get the active layer
   */
  getActiveLayer(): Layer | null {
    if (!this.activeLayerId) return null;

    const node = this.findNodeById(this.activeLayerId);
    if (node && node.type === "layer" && node.layer) {
      return node.layer;
    }

    return null;
  }

  /**
   * Get the active layer node
   * @returns Active layer node or null if no active layer
   */
  getActiveLayerNode(): LayerNode | null {
    if (!this.activeLayerId) return null;
    return this.findNodeById(this.activeLayerId);
  }

  /**
   * Get the parent group name of a layer by ID
   * @param layerId - ID of the layer
   * @returns Parent group name or null if layer is at root level or not found
   */
  getParentGroupName(layerId: string): string | null {
    const parentInfo = this.findParentOf(layerId);
    if (!parentInfo || !parentInfo.parent) return null;
    return parentInfo.parent.name;
  }

  // ========================================
  // ID-BASED CRUD METHODS
  // ========================================

  /**
   * Set visibility of a node by ID
   * @param id - ID of the node
   * @param visible - Visibility state
   * @returns true if successful, false otherwise
   */
  setVisibilityById(id: string, visible: boolean): boolean {
    const node = this.findNodeById(id);
    if (!node) return false;

    node.visible = visible;
    if (node.layer) {
      node.layer.visible = visible;
    }
    return true;
  }

  /**
   * Toggle visibility of a node by ID
   * @param id - ID of the node
   * @returns true if successful, false otherwise
   */
  toggleVisibilityById(id: string): boolean {
    const node = this.findNodeById(id);
    if (!node) return false;

    node.visible = !node.visible;
    if (node.layer) {
      node.layer.visible = node.visible;
    }
    return true;
  }

  /**
   * Toggle locked status of a node by ID
   * @param id - ID of the node
   * @returns true if successful, false otherwise
   */
  toggleLockedById(id: string): boolean {
    const node = this.findNodeById(id);
    if (!node) return false;

    node.locked = !node.locked;
    if (node.layer) {
      node.layer.locked = node.locked;
    }
    return true;
  }

  /**
   * Rename a node by ID
   * @param id - ID of the node to rename
   * @param newName - New name for the node
   * @returns true if successful, false otherwise
   */
  renameById(id: string, newName: string): boolean {
    const node = this.findNodeById(id);
    if (!node) return false;

    node.name = newName;
    if (node.layer) {
      node.layer.name = newName;
    }
    return true;
  }

  /**
   * Set opacity of a node by ID
   * @param id - ID of the node
   * @param opacity - Opacity value (0.0 to 1.0)
   * @returns true if successful, false otherwise
   */
  setOpacityById(id: string, opacity: number): boolean {
    const node = this.findNodeById(id);
    if (!node) return false;

    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    node.opacity = clampedOpacity;
    if (node.layer) {
      node.layer.opacity = clampedOpacity;
    }
    return true;
  }

  /**
   * Set blend mode of a node by ID
   * @param id - ID of the node
   * @param blendMode - Blend mode to set
   * @returns true if successful, false otherwise
   */
  setBlendModeById(id: string, blendMode: BlendMode): boolean {
    const node = this.findNodeById(id);
    if (!node) return false;

    node.blendMode = blendMode;
    if (node.layer) {
      node.layer.blendMode = blendMode;
    }
    return true;
  }

  /**
   * Set collapsed state of a group by ID
   * @param id - ID of the group
   * @param collapsed - Collapsed state
   * @returns true if successful, false otherwise
   */
  setGroupCollapsed(id: string, collapsed: boolean): boolean {
    const node = this.findNodeById(id);
    if (!node || node.type !== "group") return false;

    node.collapsed = collapsed;
    return true;
  }

  /**
   * Toggle collapsed state of a group by ID
   * @param id - ID of the group
   * @returns true if successful, false otherwise
   */
  toggleGroupCollapsed(id: string): boolean {
    const node = this.findNodeById(id);
    if (!node || node.type !== "group") return false;

    node.collapsed = !node.collapsed;
    return true;
  }

  /**
   * Duplicate a node by ID (deep clone with new ID)
   * @param id - ID of the node to duplicate
   * @returns New node ID if successful, null otherwise
   */
  duplicateById(id: string): string | null {
    const parentInfo = this.findParentOf(id);
    if (!parentInfo) return null;

    const { children, index } = parentInfo;
    const originalNode = children[index];

    // Deep clone the node
    const clonedNode = this.cloneNode(originalNode);

    // Insert immediately after the original
    children.splice(index + 1, 0, clonedNode);

    return clonedNode.id;
  }

  /**
   * Delete a node by ID (with recursive support for groups)
   * @param id - ID of the node to delete
   * @returns true if successful, false otherwise
   */
  deleteById(id: string): boolean {
    const parentInfo = this.findParentOf(id);
    if (!parentInfo) return false;

    const { children, index } = parentInfo;

    // Remove the node
    children.splice(index, 1);

    // Update active layer if necessary
    if (this.activeLayerId === id) {
      const remainingNodes = this.flatten();
      if (remainingNodes.length > 0) {
        const newIndex = Math.min(index, remainingNodes.length - 1);
        this.activeLayerId = remainingNodes[newIndex].id;
      } else {
        this.activeLayerId = null;
      }
    }

    return true;
  }

  /**
   * Move a node to a new position with optional parent group assignment
   * @param sourceId - ID of the node to move
   * @param targetParentId - ID of the target parent group (null for root level)
   * @param positionIndex - Index position within the target parent's children
   * @returns true if successful, false otherwise
   */
  moveById(
    sourceId: string,
    targetParentId: string | null,
    positionIndex: number,
  ): boolean {
    // Find the source node and its current parent
    const sourceParentInfo = this.findParentOf(sourceId);
    if (!sourceParentInfo) return false;

    const { children: sourceChildren, index: sourceIndex } = sourceParentInfo;
    const sourceNode = sourceChildren[sourceIndex];

    // Remove from current location
    sourceChildren.splice(sourceIndex, 1);

    // Determine target children array
    let targetChildren: LayerNode[];
    if (targetParentId === null) {
      // Moving to root level
      targetChildren = this.nodes;
    } else {
      // Moving to a group
      const targetParent = this.findNodeById(targetParentId);
      if (
        !targetParent ||
        targetParent.type !== "group" ||
        !targetParent.children
      ) {
        // Invalid target, restore source node
        sourceChildren.splice(sourceIndex, 0, sourceNode);
        return false;
      }
      targetChildren = targetParent.children;
    }

    // Insert at target position
    const clampedIndex = Math.max(
      0,
      Math.min(positionIndex, targetChildren.length),
    );
    targetChildren.splice(clampedIndex, 0, sourceNode);

    return true;
  }

  /**
   * Move a layer or group to a new position with enhanced positional modes and safety validation
   * @param sourceId - ID of the item to move
   * @param targetId - ID of the target node (null for root level)
   * @param position - Position relative to target: "before", "inside", or "after"
   * @returns true if successful, false otherwise
   */
  moveLayerOrGroup(
    sourceId: string,
    targetId: string | null,
    position: "before" | "inside" | "after",
  ): boolean {
    // Validate source exists
    const sourceParentInfo = this.findParentOf(sourceId);
    if (!sourceParentInfo) return false;

    // Prevent self-drop
    if (sourceId === targetId) {
      return false;
    }

    // Prevent moving a node into itself or its descendants
    if (targetId && this.isDescendantOf(targetId, sourceId)) {
      return false;
    }

    const { children: sourceChildren, index: sourceIndex } = sourceParentInfo;
    const sourceNode = sourceChildren[sourceIndex];

    // Remove from current location
    sourceChildren.splice(sourceIndex, 1);

    // Handle root level target
    if (targetId === null) {
      this.nodes.push(sourceNode);
      return true;
    }

    // Find target node
    const targetParentInfo = this.findParentOf(targetId);
    if (!targetParentInfo) {
      // Restore source node
      sourceChildren.splice(sourceIndex, 0, sourceNode);
      return false;
    }

    const { children: targetChildren, index: targetIndex } = targetParentInfo;
    const targetNode = targetChildren[targetIndex];

    // Determine insertion point based on position
    if (position === "before") {
      // Insert before target in same parent
      targetChildren.splice(targetIndex, 0, sourceNode);
    } else if (position === "after") {
      // Insert after target in same parent
      targetChildren.splice(targetIndex + 1, 0, sourceNode);
    } else if (position === "inside") {
      // Insert inside target (only valid for groups)
      if (targetNode.type === "group" && targetNode.children) {
        // Insert at beginning of group
        targetNode.children.unshift(sourceNode);
      } else {
        // Invalid target for inside, restore source node
        sourceChildren.splice(sourceIndex, 0, sourceNode);
        return false;
      }
    }

    return true;
  }

  /**
   * Expand a group programmatically
   * @param groupId - ID of the group to expand
   * @returns true if successful, false otherwise
   */
  expandGroup(groupId: string): boolean {
    const node = this.findNodeById(groupId);
    if (node && node.type === "group") {
      node.collapsed = false;
      return true;
    }
    return false;
  }

  // ========================================
  // DEPRECATED INDEX-BASED METHODS
  // ========================================

  /**
   * Add an existing layer to the stack (backward compatibility)
   */
  addLayer(layer: Layer): void {
    const id = generateId();

    // Attach undo manager to layer if available
    if (this.undoManager) {
      layer.attachUndoManager(this.undoManager);
    }

    const layerNode: LayerNode = {
      id,
      type: "layer",
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      layer,
      isReference: false,
    };

    this.nodes.push(layerNode);
  }

  /**
   * Get all layers (backward compatibility)
   */
  getLayers(): Layer[] {
    const flatNodes = this.flatten();
    return flatNodes
      .filter((node) => node.layer !== undefined)
      .map((node) => node.layer!);
  }

  /**
   * Get layer count (backward compatibility)
   */
  getLayerCount(): number {
    return this.flatten().filter((node) => node.layer !== undefined).length;
  }

  /**
   * Get the active layer index (backward compatibility)
   */
  getActiveLayerIndex(): number {
    if (!this.activeLayerId) return -1;

    const flatNodes = this.flatten();
    return flatNodes.findIndex((node) => node.id === this.activeLayerId);
  }

  /**
   * Rename a layer by index (backward compatibility)
   * ⚠️ Deprecated — index-based API kept only for compatibility. Use renameById().
   */
  renameLayer(index: number, newName: string): void {
    const flatNodes = this.flatten();
    if (index >= 0 && index < flatNodes.length) {
      const node = flatNodes[index];
      this.renameById(node.id, newName);
    }
  }

  /**
   * Set layer opacity by index (backward compatibility)
   * ⚠️ Deprecated — index-based API kept only for compatibility. Use setOpacityById().
   */
  setLayerOpacity(index: number, opacity: number): void {
    const flatNodes = this.flatten();
    if (index >= 0 && index < flatNodes.length) {
      const node = flatNodes[index];
      this.setOpacityById(node.id, opacity);
    }
  }

  /**
   * Set layer blend mode by index (backward compatibility)
   * ⚠️ Deprecated — index-based API kept only for compatibility. Use setBlendModeById().
   */
  setLayerBlendMode(index: number, blendMode: BlendMode): void {
    const flatNodes = this.flatten();
    if (index >= 0 && index < flatNodes.length) {
      const node = flatNodes[index];
      this.setBlendModeById(node.id, blendMode);
    }
  }

  /**
   * Toggle layer locked status by index (backward compatibility)
   * ⚠️ Deprecated — index-based API kept only for compatibility. Use toggleLockedById().
   */
  toggleLayerLocked(index: number): void {
    const flatNodes = this.flatten();
    if (index >= 0 && index < flatNodes.length) {
      const node = flatNodes[index];
      this.toggleLockedById(node.id);
    }
  }

  /**
   * Delete a layer by index (backward compatibility)
   * ⚠️ Deprecated — index-based API kept only for compatibility. Use deleteById().
   */
  deleteLayer(index: number): void {
    const flatNodes = this.flatten();
    if (index >= 0 && index < flatNodes.length) {
      const nodeToDelete = flatNodes[index];
      this.deleteById(nodeToDelete.id);
    }
  }

  /**
   * Move a layer from one index to another (backward compatibility)
   * ⚠️ Deprecated — index-based API kept only for compatibility. Use moveById().
   */
  moveLayer(fromIndex: number, toIndex: number): void {
    const flatNodes = this.flatten();

    if (
      fromIndex >= 0 &&
      fromIndex < flatNodes.length &&
      toIndex >= 0 &&
      toIndex < flatNodes.length
    ) {
      const nodeToMove = flatNodes[fromIndex];

      // Use ID-based move with root level target
      this.moveById(nodeToMove.id, null, toIndex);
    }
  }

  /**
   * Resize the canvas and all layers
   */
  resizeCanvas(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    this.compositeBuffer = new Uint8ClampedArray(newWidth * newHeight * 4);

    // Get first layer for dimension reference
    const flatNodes = this.flatten();
    const firstNode = flatNodes.find((node) => node.layer);
    const oldWidth = firstNode?.layer ? firstNode.layer.width : 0;
    const oldHeight = firstNode?.layer ? firstNode.layer.height : 0;

    const offsetX = Math.floor((newWidth - oldWidth) / 2);
    const offsetY = Math.floor((newHeight - oldHeight) / 2);

    // Resize each layer
    for (const node of flatNodes) {
      if (node.layer) {
        const layer = node.layer;
        const oldPixels = new Uint8ClampedArray(layer.pixels);
        const oldW = layer.width;
        const oldH = layer.height;

        // Create new pixel buffer
        layer.width = newWidth;
        layer.height = newHeight;
        layer.pixels = new Uint8ClampedArray(newWidth * newHeight * 4);

        // Copy old pixels to centered position in new buffer
        for (let y = 0; y < oldH; y++) {
          for (let x = 0; x < oldW; x++) {
            const oldIndex = (y * oldW + x) * 4;
            const newX = x + offsetX;
            const newY = y + offsetY;

            // Check if new position is within bounds
            if (newX >= 0 && newX < newWidth && newY >= 0 && newY < newHeight) {
              const newIndex = (newY * newWidth + newX) * 4;
              layer.pixels[newIndex] = oldPixels[oldIndex];
              layer.pixels[newIndex + 1] = oldPixels[oldIndex + 1];
              layer.pixels[newIndex + 2] = oldPixels[oldIndex + 2];
              layer.pixels[newIndex + 3] = oldPixels[oldIndex + 3];
            }
          }
        }
      }
    }
  }

  /**
   * Import an image and create a new layer from it
   */
  importImage(imageData: ImageData, name = "Imported Layer"): Layer {
    const id = generateId();
    const layer = new Layer(this.canvasWidth, this.canvasHeight, name);

    // Attach undo manager to new layer if available
    if (this.undoManager) {
      layer.attachUndoManager(this.undoManager);
    }

    // Copy image data to layer (centered if smaller than canvas)
    const offsetX = Math.floor((this.canvasWidth - imageData.width) / 2);
    const offsetY = Math.floor((this.canvasHeight - imageData.height) / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const srcIndex = (y * imageData.width + x) * 4;
        const destX = x + offsetX;
        const destY = y + offsetY;

        if (
          destX >= 0 &&
          destX < this.canvasWidth &&
          destY >= 0 &&
          destY < this.canvasHeight
        ) {
          layer.setPixel(
            destX,
            destY,
            imageData.data[srcIndex],
            imageData.data[srcIndex + 1],
            imageData.data[srcIndex + 2],
            imageData.data[srcIndex + 3],
          );
        }
      }
    }

    const layerNode: LayerNode = {
      id,
      type: "layer",
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: "normal",
      layer,
      isReference: false,
    };

    this.nodes.push(layerNode);
    this.activeLayerId = id;

    return layer;
  }

  /**
   * Import an image centered on the canvas and create a new layer from it
   * @param imageData - Image data to import
   * @param name - Name for the new layer
   * @returns The created layer
   */
  importImageCentered(imageData: ImageData, name = "Imported Image"): Layer {
    const id = generateId();
    const layer = new Layer(this.canvasWidth, this.canvasHeight, name);

    // Attach undo manager to new layer if available
    if (this.undoManager) {
      layer.attachUndoManager(this.undoManager);
    }

    // Calculate centered position
    const offsetX = Math.floor((this.canvasWidth - imageData.width) / 2);
    const offsetY = Math.floor((this.canvasHeight - imageData.height) / 2);

    // Copy image data to layer at centered position
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const srcIndex = (y * imageData.width + x) * 4;
        const destX = x + offsetX;
        const destY = y + offsetY;

        if (
          destX >= 0 &&
          destX < this.canvasWidth &&
          destY >= 0 &&
          destY < this.canvasHeight
        ) {
          layer.setPixel(
            destX,
            destY,
            imageData.data[srcIndex],
            imageData.data[srcIndex + 1],
            imageData.data[srcIndex + 2],
            imageData.data[srcIndex + 3],
          );
        }
      }
    }

    const layerNode: LayerNode = {
      id,
      type: "layer",
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: "normal",
      layer,
      isReference: false,
    };

    this.nodes.push(layerNode);
    this.activeLayerId = id;

    return layer;
  }

  /**
   * Generate a composite buffer of all visible layers using hierarchical order
   * Returns the internal composite buffer directly without cloning
   */
  getCompositeBuffer(): Uint8ClampedArray {
    // Clear the composite buffer
    this.compositeBuffer.fill(0);

    // Get layers in render order
    const layers = this.getFlatRenderOrder();

    // Composite layers from bottom to top
    for (const layer of layers) {
      if (!layer.visible) continue;

      for (let i = 0; i < this.compositeBuffer.length; i += 4) {
        const srcR = layer.pixels[i];
        const srcG = layer.pixels[i + 1];
        const srcB = layer.pixels[i + 2];
        const srcA = (layer.pixels[i + 3] / 255) * layer.opacity;

        const dstR = this.compositeBuffer[i];
        const dstG = this.compositeBuffer[i + 1];
        const dstB = this.compositeBuffer[i + 2];
        const dstA = this.compositeBuffer[i + 3] / 255;

        // Alpha blending
        const outA = srcA + dstA * (1 - srcA);
        let outR: number;
        let outG: number;
        let outB: number;

        if (outA === 0) {
          outR = outG = outB = 0;
        } else {
          if (layer.blendMode === "normal") {
            outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
            outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
            outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;
          } else if (layer.blendMode === "multiply") {
            outR = ((srcR * dstR) / 255) * srcA + dstR * dstA * (1 - srcA);
            outG = ((srcG * dstG) / 255) * srcA + dstG * dstA * (1 - srcA);
            outB = ((srcB * dstB) / 255) * srcA + dstB * dstA * (1 - srcA);
          } else if (layer.blendMode === "add") {
            outR = Math.min(255, srcR * srcA + dstR * dstA);
            outG = Math.min(255, srcG * srcA + dstG * dstA);
            outB = Math.min(255, srcB * srcA + dstB * dstA);
          } else {
            outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
            outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
            outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;
          }
        }

        this.compositeBuffer[i] = Math.round(outR);
        this.compositeBuffer[i + 1] = Math.round(outG);
        this.compositeBuffer[i + 2] = Math.round(outB);
        this.compositeBuffer[i + 3] = Math.round(outA * 255);
      }
    }

    return this.compositeBuffer;
  }

  /**
   * Capture pixel data before an operation (for undo)
   */
  captureBefore(
    layerIndex: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Uint8ClampedArray {
    const flatNodes = this.flatten();
    const node = flatNodes[layerIndex];
    if (!node || !node.layer) return new Uint8ClampedArray(0);

    const layer = node.layer;

    const buffer = new Uint8ClampedArray(w * h * 4);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const srcX = x + px;
        const srcY = y + py;
        if (
          srcX >= 0 &&
          srcX < layer.width &&
          srcY >= 0 &&
          srcY < layer.height
        ) {
          const srcIndex = (srcY * layer.width + srcX) * 4;
          const dstIndex = (py * w + px) * 4;
          buffer[dstIndex] = layer.pixels[srcIndex];
          buffer[dstIndex + 1] = layer.pixels[srcIndex + 1];
          buffer[dstIndex + 2] = layer.pixels[srcIndex + 2];
          buffer[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }
    return buffer;
  }

  /**
   * Capture pixel data after an operation (for redo)
   */
  captureAfter(
    layerIndex: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Uint8ClampedArray {
    const flatNodes = this.flatten();
    const node = flatNodes[layerIndex];
    if (!node || !node.layer) return new Uint8ClampedArray(0);

    const layer = node.layer;

    const buffer = new Uint8ClampedArray(w * h * 4);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const srcX = x + px;
        const srcY = y + py;
        if (
          srcX >= 0 &&
          srcX < layer.width &&
          srcY >= 0 &&
          srcY < layer.height
        ) {
          const srcIndex = (srcY * layer.width + srcX) * 4;
          const dstIndex = (py * w + px) * 4;
          buffer[dstIndex] = layer.pixels[srcIndex];
          buffer[dstIndex + 1] = layer.pixels[srcIndex + 1];
          buffer[dstIndex + 2] = layer.pixels[srcIndex + 2];
          buffer[dstIndex + 3] = layer.pixels[srcIndex + 3];
        }
      }
    }
    return buffer;
  }

  /**
   * Apply pixels to a layer region (used by undo/redo)
   */
  applyPixelsToLayer(
    layerIndex: number,
    x: number,
    y: number,
    w: number,
    h: number,
    pixels: Uint8ClampedArray,
  ): void {
    const flatNodes = this.flatten();
    const node = flatNodes[layerIndex];
    if (!node || !node.layer) return;

    const layer = node.layer;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dstX = x + px;
        const dstY = y + py;
        if (
          dstX >= 0 &&
          dstX < layer.width &&
          dstY >= 0 &&
          dstY < layer.height
        ) {
          const srcIndex = (py * w + px) * 4;
          const dstIndex = (dstY * layer.width + dstX) * 4;
          layer.pixels[dstIndex] = pixels[srcIndex];
          layer.pixels[dstIndex + 1] = pixels[srcIndex + 1];
          layer.pixels[dstIndex + 2] = pixels[srcIndex + 2];
          layer.pixels[dstIndex + 3] = pixels[srcIndex + 3];
        }
      }
    }
  }

  /**
   * Push an undo command with before/after pixel data
   */
  pushUndo(
    layerIndex: number,
    x: number,
    y: number,
    w: number,
    h: number,
    before: Uint8ClampedArray,
    after: Uint8ClampedArray,
  ): void {
    if (!this.undoManager) return;

    this.undoManager.push({
      layerIndex,
      x,
      y,
      w,
      h,
      before,
      after,
    });
  }

  /**
   * Restore a pixel region from an undo/redo command
   */
  restoreRegion(cmd: UndoCommand, pixels: Uint8ClampedArray): void {
    this.applyPixelsToLayer(cmd.layerIndex, cmd.x, cmd.y, cmd.w, cmd.h, pixels);
  }

  /**
   * Get canvas size (for full canvas capture fallback)
   */
  getSize(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Get active layer's ID
   * @returns Active layer's ID or null if no active layer
   */
  getActiveLayerId(): string | null {
    return this.activeLayerId;
  }
}
