/**
 * CanvasRenderer.ts
 *
 * Renders the composite buffer from LayerManager onto a canvas element in pure pixel space (1:1) at the origin (0, 0), includes optional grid background and onion skin ghost frame support, renders reference layers before all other layers but after the background using high-performance buffer-based alpha blending, applies non-destructive per-layer filters using ctx.filter and ctx.shadow* properties, and renders unified preview buffer from ToolController after the main composite with integer-safe coordinate flooring; detects rotation mode and skips selection outlines/corners/handles, drawing only a 2×2 pivot square during rotation; selection outline rendering removed to support pure SVG overlay architecture.
 */

import type { FrameManager } from "../../engine/FrameManager";
import type { LayerManager } from "../../engine/LayerManager";
import type { ToolController } from "../../engine/ToolController";
import { drawGrid } from "./DrawGrid";

// Ghost frame cache for onion skin optimization
const ghostCache = new Map<string, HTMLCanvasElement>();

// Offscreen canvas for intermediate rendering
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

// Offscreen canvas for preview buffer rendering
let previewCanvas: HTMLCanvasElement | null = null;
let previewCtx: CanvasRenderingContext2D | null = null;

/**
 * Renders the LayerManager's composite buffer onto the canvas in pure pixel space (1:1) at origin (0, 0).
 * No camera transforms are applied - everything is rendered in pixel space.
 * Detects rotation mode and skips selection frame rendering, showing only 2×2 pivot square.
 * Reference layers are rendered before all other layers but after the background using optimized buffer blending.
 * Selection outline rendering removed to support pure SVG overlay architecture.
 * Applies non-destructive per-layer filters using CSS filters and drop shadow.
 */
export function renderCanvas(
  layerManager: LayerManager,
  ctx: CanvasRenderingContext2D,
  showGrid = true,
  frameManager: FrameManager | null = null,
  _currentFrameIndex = 0,
  onionPrev = false,
  onionNext = false,
  onionStrength = 0.3,
  toolController: ToolController | null = null,
): void {
  const canvas = ctx.canvas;
  const { width, height } = layerManager.getSize();

  // Create or resize offscreen canvas if needed
  if (
    !offscreenCanvas ||
    offscreenCanvas.width !== width ||
    offscreenCanvas.height !== height
  ) {
    offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
  }

  if (!offscreenCtx) return;

  // Ensure offscreen context uses identity transform for pixel-perfect 1:1 sampling
  offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
  offscreenCtx.imageSmoothingEnabled = false;

  // Clear offscreen canvas
  offscreenCtx.clearRect(0, 0, width, height);

  // Draw onion skin ghost frames if enabled and frameManager exists
  if (frameManager) {
    // Draw previous frame ghost (red tint)
    if (onionPrev) {
      const prevFrame = frameManager.getPreviousFrame();
      if (prevFrame) {
        drawLayerManagerGhost(prevFrame, offscreenCtx, onionStrength, "red");
      }
    }

    // Draw next frame ghost (blue tint)
    if (onionNext) {
      const nextFrame = frameManager.getNextFrame();
      if (nextFrame) {
        drawLayerManagerGhost(nextFrame, offscreenCtx, onionStrength, "blue");
      }
    }
  }

  // Get all layer nodes to check for reference layers
  const flatNodes = layerManager.flatten();

  // Separate reference layers from regular layers
  const referenceLayers: any[] = [];
  const regularLayers: any[] = [];

  for (const node of flatNodes) {
    if (node.type === "layer" && node.layer && node.visible) {
      if (node.isReference) {
        referenceLayers.push({ node, layer: node.layer });
      } else {
        regularLayers.push({ node, layer: node.layer });
      }
    }
  }

  // Render reference layers first (no filters applied)
  for (const { layer } of referenceLayers) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) continue;

    const imageData = tempCtx.createImageData(width, height);
    imageData.data.set(layer.pixels);
    tempCtx.putImageData(imageData, 0, 0);

    offscreenCtx.globalAlpha = layer.opacity;
    offscreenCtx.drawImage(tempCanvas, 0, 0);
    offscreenCtx.globalAlpha = 1.0;
  }

  // Render regular layers with filters
  for (const { layer } of regularLayers) {
    // Create temporary canvas for this layer
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) continue;

    // Draw layer pixels to temp canvas
    const imageData = tempCtx.createImageData(width, height);
    imageData.data.set(layer.pixels);
    tempCtx.putImageData(imageData, 0, 0);

    // Build CSS filter string
    const filters: string[] = [];

    if (layer.filters.hue !== 0) {
      filters.push(`hue-rotate(${layer.filters.hue}deg)`);
    }

    if (layer.filters.brightness !== 0) {
      const brightnessValue = 100 + layer.filters.brightness;
      filters.push(`brightness(${brightnessValue}%)`);
    }

    if (layer.filters.contrast !== 0) {
      const contrastValue = 100 + layer.filters.contrast;
      filters.push(`contrast(${contrastValue}%)`);
    }

    if (layer.filters.grayscale > 0) {
      filters.push(`grayscale(${layer.filters.grayscale}%)`);
    }

    if (layer.filters.blur > 0) {
      filters.push(`blur(${layer.filters.blur}px)`);
    }

    // Apply filters to context
    if (filters.length > 0) {
      offscreenCtx.filter = filters.join(" ");
    } else {
      offscreenCtx.filter = "none";
    }

    // Apply drop shadow if opacity > 0
    if (layer.filters.dropShadow.opacity > 0) {
      offscreenCtx.shadowOffsetX = layer.filters.dropShadow.offsetX;
      offscreenCtx.shadowOffsetY = layer.filters.dropShadow.offsetY;
      offscreenCtx.shadowBlur = layer.filters.dropShadow.blur;
      offscreenCtx.shadowColor = `${layer.filters.dropShadow.color}${Math.round(
        (layer.filters.dropShadow.opacity / 100) * 255,
      )
        .toString(16)
        .padStart(2, "0")}`;
    } else {
      offscreenCtx.shadowOffsetX = 0;
      offscreenCtx.shadowOffsetY = 0;
      offscreenCtx.shadowBlur = 0;
      offscreenCtx.shadowColor = "transparent";
    }

    // Draw layer with filters and opacity
    offscreenCtx.globalAlpha = layer.opacity;
    offscreenCtx.drawImage(tempCanvas, 0, 0);
    offscreenCtx.globalAlpha = 1.0;

    // Reset context state
    offscreenCtx.filter = "none";
    offscreenCtx.shadowOffsetX = 0;
    offscreenCtx.shadowOffsetY = 0;
    offscreenCtx.shadowBlur = 0;
    offscreenCtx.shadowColor = "transparent";
  }

  // Clear main canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ensure main context uses identity transform (no camera transform)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // Draw grid if enabled (in pure pixel space, ignoring camera)
  if (showGrid) {
    drawGrid(ctx, width, height);
  }

  // Draw offscreen canvas at (0, 0) in pixel space
  ctx.drawImage(offscreenCanvas, 0, 0);

  // Draw unified preview buffer from ToolController using optimized rendering
  // Note: ToolController now handles rotation mode rendering internally
  // (suppresses outlines and shows only 2×2 pivot square in preview buffer)
  if (toolController && toolController.previewBuffer.length > 0) {
    // Create or resize preview canvas if needed
    if (
      !previewCanvas ||
      previewCanvas.width !== width ||
      previewCanvas.height !== height
    ) {
      previewCanvas = document.createElement("canvas");
      previewCanvas.width = width;
      previewCanvas.height = height;
      previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
    }

    if (previewCtx) {
      // Clear preview canvas
      previewCtx.clearRect(0, 0, width, height);

      // Create ImageData for preview buffer
      const previewImageData = previewCtx.createImageData(width, height);
      const previewData = previewImageData.data;

      // Write all preview pixels to ImageData buffer with integer-safe coordinate flooring
      for (const p of toolController.previewBuffer) {
        const px = p.x | 0;
        const py = p.y | 0;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const index = (py * width + px) * 4;
        previewData[index] = p.r;
        previewData[index + 1] = p.g;
        previewData[index + 2] = p.b;
        previewData[index + 3] = p.a;
      }

      // Draw ImageData onto preview canvas
      previewCtx.putImageData(previewImageData, 0, 0);

      // Composite preview canvas over main canvas
      const previousCompositeOp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(previewCanvas, 0, 0);
      ctx.globalCompositeOperation = previousCompositeOp;
    }
  }

  // After drawing the unified preview buffer, add a caret-only draw if it exists
  if (
    toolController &&
    typeof (toolController as any).drawTextPreview === "function"
  ) {
    (toolController as any).drawTextPreview(ctx);
  }
}

/**
 * Helper function to draw a ghost frame with color tinting and alpha blending.
 * Uses caching to avoid redundant pixel recomputation.
 */
function drawLayerManagerGhost(
  layerManager: LayerManager,
  ctx: CanvasRenderingContext2D,
  strength: number,
  tint: "red" | "blue",
): void {
  const { width, height } = layerManager.getSize();

  // Generate cache key based on tint and frame identifier
  // Use a simple hash of the composite buffer for cache key
  const compositeBuffer = layerManager.getCompositeBuffer();
  const bufferHash = hashBuffer(compositeBuffer);
  const cacheKey = `${tint}_${bufferHash}`;

  // Check cache first
  if (ghostCache.has(cacheKey)) {
    const cachedCanvas = ghostCache.get(cacheKey)!;
    ctx.drawImage(cachedCanvas, 0, 0);
    return;
  }

  // Create offscreen canvas for ghost frame
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) return;

  // Get composite buffer and create ImageData
  const ghostData = tempCtx.createImageData(width, height);
  ghostData.data.set(compositeBuffer);

  // Apply tinting and alpha blending
  const data = ghostData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a > 0) {
      if (tint === "red") {
        // Red tint: boost red channel, reduce others
        data[i] = Math.min(255, r * 1.3);
        data[i + 1] = g * 0.5;
        data[i + 2] = b * 0.5;
      } else {
        // Blue tint: boost blue channel, reduce others
        data[i] = r * 0.5;
        data[i + 1] = g * 0.5;
        data[i + 2] = Math.min(255, b * 1.3);
      }

      // Apply strength to alpha
      data[i + 3] = a * strength;
    }
  }

  // Render to temp canvas
  tempCtx.putImageData(ghostData, 0, 0);

  // Store in cache
  ghostCache.set(cacheKey, tempCanvas);

  // Draw to main context (no transform applied here)
  ctx.drawImage(tempCanvas, 0, 0);
}

/**
 * Simple hash function for buffer data to generate cache keys.
 * Uses a sampling approach for performance.
 */
function hashBuffer(buffer: Uint8ClampedArray): string {
  let hash = 0;
  const step = Math.max(1, Math.floor(buffer.length / 100)); // Sample ~100 points

  for (let i = 0; i < buffer.length; i += step) {
    hash = (hash << 5) - hash + buffer[i];
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(36);
}
