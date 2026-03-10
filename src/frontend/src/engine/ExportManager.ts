/**
 * ExportManager.ts
 *
 * Provides export and import functionality for pixel art including:
 * - PNG export (current frame, sequence, sprite sheet) with optional scaling, solid background support, and filter-aware rendering
 * - WebM video export with optional scaling, transparency, background color support, and filter-aware rendering
 * - PNG import using createImageBitmap
 * - Project save/load with compression and chunking for large projects
 *
 * All export functions support an optional `scale` parameter for pixel-perfect upscaling.
 * Export operations apply layer filters (hue, brightness, contrast, grayscale, blur, drop shadow) during rendering.
 */

import {
  compressProjectData,
  decompressProjectData,
} from "@/lib/projectSerializer";
import type { FrameManager } from "./FrameManager";
import type { Layer } from "./Layer";
import type { LayerManager } from "./LayerManager";

// ============================================================================
// Constants
// ============================================================================

// Maximum chunk size: 1.5 MB (leaving buffer below 2 MB IC limit)
const MAX_CHUNK_SIZE = 1.5 * 1024 * 1024;

// Target compressed size before chunking: 1.8 MB
const TARGET_SIZE_BEFORE_CHUNKING = 1.8 * 1024 * 1024;

// ============================================================================
// Chunking Helpers
// ============================================================================

/**
 * Split data into chunks of specified size
 * @param data - Data to split
 * @param chunkSize - Maximum size of each chunk
 * @returns Array of chunks
 */
function splitIntoChunks(data: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (offset < data.length) {
    const end = Math.min(offset + chunkSize, data.length);
    chunks.push(data.slice(offset, end));
    offset = end;
  }

  return chunks;
}

/**
 * Combine chunks back into a single Uint8Array
 * @param chunks - Array of chunks to combine
 * @returns Combined data
 */
function combineChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

// ============================================================================
// Project Save/Load with Compression and Chunking
// ============================================================================

export interface SaveProjectOptions {
  onProgress?: (current: number, total: number) => void;
}

export interface SaveProjectChunk {
  index: number;
  total: number;
  data: Uint8Array;
}

/**
 * Prepare project data for saving with compression and optional chunking
 * @param projectData - Serialized project data
 * @param options - Optional progress callback
 * @returns Array of chunks ready to be saved
 */
export async function prepareProjectForSave(
  projectData: Uint8Array,
  _options?: SaveProjectOptions,
): Promise<SaveProjectChunk[]> {
  // Step 1: Compress the data
  const compressed = await compressProjectData(projectData);

  console.log(`Project size: ${projectData.length} bytes`);
  console.log(`Compressed size: ${compressed.length} bytes`);
  console.log(
    `Compression ratio: ${((compressed.length / projectData.length) * 100).toFixed(1)}%`,
  );

  // Step 2: Check if chunking is needed
  if (compressed.length <= TARGET_SIZE_BEFORE_CHUNKING) {
    // No chunking needed, return single chunk
    return [
      {
        index: 0,
        total: 1,
        data: compressed,
      },
    ];
  }

  // Step 3: Split into chunks
  const chunks = splitIntoChunks(compressed, MAX_CHUNK_SIZE);
  console.log(`Split into ${chunks.length} chunks`);

  // Step 4: Create chunk metadata
  return chunks.map((data, index) => ({
    index,
    total: chunks.length,
    data,
  }));
}

/**
 * Load and decompress project data from chunks
 * @param chunks - Array of project chunks
 * @returns Decompressed project data
 */
export async function loadProjectFromChunks(
  chunks: SaveProjectChunk[],
): Promise<Uint8Array> {
  // Step 1: Sort chunks by index
  const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

  // Step 2: Validate chunk sequence
  if (sortedChunks.length === 0) {
    throw new Error("No chunks provided");
  }

  const totalChunks = sortedChunks[0].total;
  if (sortedChunks.length !== totalChunks) {
    throw new Error(
      `Missing chunks: expected ${totalChunks}, got ${sortedChunks.length}`,
    );
  }

  for (let i = 0; i < sortedChunks.length; i++) {
    if (sortedChunks[i].index !== i) {
      throw new Error(`Invalid chunk sequence at index ${i}`);
    }
  }

  // Step 3: Combine chunks
  const compressed = combineChunks(sortedChunks.map((c) => c.data));

  // Step 4: Decompress
  const decompressed = await decompressProjectData(compressed);

  console.log(
    `Loaded ${chunks.length} chunks, decompressed to ${decompressed.length} bytes`,
  );

  return decompressed;
}

// ============================================================================
// Filter Helpers
// ============================================================================

/**
 * Build a CSS filter string from layer filter properties
 * @param layer - Layer with filter properties
 * @returns CSS filter string
 */
function buildFilterString(layer: Layer): string {
  const filters: string[] = [];

  // Hue rotation (-180 to 180 degrees)
  if (layer.filters.hue !== 0) {
    filters.push(`hue-rotate(${layer.filters.hue}deg)`);
  }

  // Brightness (-100 to 100 -> 0% to 200%)
  if (layer.filters.brightness !== 0) {
    const brightness = 100 + layer.filters.brightness;
    filters.push(`brightness(${brightness}%)`);
  }

  // Contrast (-100 to 100 -> 0% to 200%)
  if (layer.filters.contrast !== 0) {
    const contrast = 100 + layer.filters.contrast;
    filters.push(`contrast(${contrast}%)`);
  }

  // Grayscale (0 to 100 -> 0% to 100%)
  if (layer.filters.grayscale !== 0) {
    filters.push(`grayscale(${layer.filters.grayscale}%)`);
  }

  // Blur (0 to 10 pixels)
  if (layer.filters.blur !== 0) {
    filters.push(`blur(${layer.filters.blur}px)`);
  }

  return filters.length > 0 ? filters.join(" ") : "none";
}

/**
 * Build a CSS drop shadow filter string from layer drop shadow properties
 * @param layer - Layer with drop shadow properties
 * @returns CSS drop-shadow filter string or empty string if disabled
 */
function buildDropShadowString(layer: Layer): string {
  const ds = layer.filters.dropShadow;

  // Only apply if opacity > 0
  if (ds.opacity === 0) {
    return "";
  }

  // Convert opacity from 0-100 to 0-1
  const alpha = ds.opacity / 100;

  // Parse hex color to RGB
  const hex = ds.color.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  return `drop-shadow(${ds.offsetX}px ${ds.offsetY}px ${ds.blur}px rgba(${r}, ${g}, ${b}, ${alpha}))`;
}

/**
 * Render a layer to a temporary canvas with filters applied
 * @param layer - Layer to render
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Canvas with filtered layer content
 */
function renderLayerWithFilters(
  layer: Layer,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for filtered layer rendering");
  }

  // Create temporary canvas for layer pixels
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    throw new Error("Failed to get 2D context for temporary canvas");
  }

  // Put layer pixels on temporary canvas
  const imageData = new ImageData(
    new Uint8ClampedArray(layer.pixels),
    width,
    height,
  );
  tempCtx.putImageData(imageData, 0, 0);

  // Build filter strings
  const filterString = buildFilterString(layer);
  const dropShadowString = buildDropShadowString(layer);

  // Combine filters
  const combinedFilter = [filterString, dropShadowString]
    .filter((f) => f && f !== "none")
    .join(" ");

  // Apply filters and draw to main canvas
  if (combinedFilter) {
    ctx.filter = combinedFilter;
  }
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = "none"; // Reset filter

  return canvas;
}

/**
 * Create a composite canvas from LayerManager with filters applied to each layer
 * @param layerManager - LayerManager containing layers
 * @param width - Canvas width
 * @param height - Canvas height
 * @param background - Background mode ('transparent' or 'solid')
 * @param backgroundColor - Hex color string for solid background
 * @returns Canvas with filtered composite
 */
function createFilteredComposite(
  layerManager: LayerManager,
  width: number,
  height: number,
  background?: "transparent" | "solid",
  backgroundColor?: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for filtered composite");
  }

  // Fill solid background if requested
  if (background === "solid" && backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Get layers in render order (bottom to top)
  const layers = layerManager.getFlatRenderOrder();

  // Render each visible layer with filters
  for (const layer of layers) {
    if (!layer.visible) continue;

    // Render layer with filters applied
    const filteredCanvas = renderLayerWithFilters(layer, width, height);

    // Apply layer opacity and blend mode
    ctx.globalAlpha = layer.opacity;

    // Set blend mode
    if (layer.blendMode === "multiply") {
      ctx.globalCompositeOperation = "multiply";
    } else if (layer.blendMode === "add") {
      ctx.globalCompositeOperation = "lighter";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    // Draw filtered layer onto composite
    ctx.drawImage(filteredCanvas, 0, 0);

    // Reset blend mode and opacity
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
  }

  return canvas;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Creates a base 1× canvas from a composite buffer (Uint8ClampedArray).
 * If a solid background is requested, fills the canvas first, then composites the frame on top.
 * @param buffer - The RGBA pixel data
 * @param width - Canvas width
 * @param height - Canvas height
 * @param background - Background mode ('transparent' or 'solid')
 * @param backgroundColor - Hex color string for solid background
 * @returns A canvas element with the rendered composite
 */
// biome-ignore lint/correctness/noUnusedVariables: reserved for future use
function createBaseCanvasFromComposite(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  background?: "transparent" | "solid",
  backgroundColor?: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for base canvas");
  }

  // Fill solid background if requested
  if (background === "solid" && backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Create a temporary canvas to hold the frame data
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    throw new Error("Failed to get 2D context for temporary canvas");
  }

  // Put the pixel data on the temporary canvas
  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  tempCtx.putImageData(imageData, 0, 0);

  // Composite the frame onto the main canvas (respects alpha blending)
  ctx.drawImage(tempCanvas, 0, 0);

  return canvas;
}

/**
 * Scales a canvas using nearest-neighbor (pixel-perfect) scaling.
 * @param srcCanvas - The source canvas to scale
 * @param scale - Integer scale factor (≥1)
 * @returns A new canvas scaled by the given factor
 */
function scaleCanvasNearestNeighbor(
  srcCanvas: HTMLCanvasElement,
  scale: number,
): HTMLCanvasElement {
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = srcCanvas.width * scale;
  scaledCanvas.height = srcCanvas.height * scale;

  const ctx = scaledCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for scaled canvas");
  }

  // Disable image smoothing for pixel-perfect scaling
  ctx.imageSmoothingEnabled = false;

  // Draw the source canvas scaled up
  ctx.drawImage(
    srcCanvas,
    0,
    0,
    srcCanvas.width,
    srcCanvas.height,
    0,
    0,
    scaledCanvas.width,
    scaledCanvas.height,
  );

  return scaledCanvas;
}

/**
 * Converts a canvas to a PNG Blob.
 * @param canvas - The canvas to convert
 * @returns A Promise that resolves to a PNG Blob
 */
function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to convert canvas to blob"));
      }
    }, "image/png");
  });
}

/**
 * Clamps and validates the scale parameter.
 * @param scale - The scale value to validate
 * @returns An integer scale ≥1, defaults to 1 if invalid
 */
function validateScale(scale?: number): number {
  if (
    scale === undefined ||
    scale === null ||
    Number.isNaN(scale) ||
    scale < 1
  ) {
    return 1;
  }
  return Math.floor(scale);
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Exports the current frame as a PNG file with optional scaling, background, and filter-aware rendering.
 * Applies layer filters during export for accurate visual output.
 * @param layerManager - The LayerManager containing the current frame
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param options - Optional parameters including scale, background, and backgroundColor
 */
export async function exportCurrentFramePNG(
  layerManager: LayerManager,
  canvasWidth: number,
  canvasHeight: number,
  options?: {
    scale?: number;
    background?: "transparent" | "solid";
    backgroundColor?: string;
  },
): Promise<void> {
  const scale = validateScale(options?.scale);

  // Create filtered composite canvas
  const baseCanvas = createFilteredComposite(
    layerManager,
    canvasWidth,
    canvasHeight,
    options?.background,
    options?.backgroundColor,
  );

  // Scale if needed
  const finalCanvas =
    scale > 1 ? scaleCanvasNearestNeighbor(baseCanvas, scale) : baseCanvas;

  // Convert to blob and download
  const blob = await canvasToPngBlob(finalCanvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `frame_${scale}x.png`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports all frames as a PNG sequence with optional scaling, background, and filter-aware rendering.
 * Each frame is rendered with filters applied before scaling and saving.
 * @param frameManager - The FrameManager containing all frames
 * @param options - Optional parameters including scale, background, and backgroundColor
 */
export async function exportPNGSequence(
  frameManager: FrameManager,
  options?: {
    scale?: number;
    background?: "transparent" | "solid";
    backgroundColor?: string;
  },
): Promise<void> {
  const scale = validateScale(options?.scale);
  const frames = frameManager.getFrames();
  const width = frameManager.width;
  const height = frameManager.height;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Create filtered composite canvas
    const baseCanvas = createFilteredComposite(
      frame.layerManager,
      width,
      height,
      options?.background,
      options?.backgroundColor,
    );

    // Scale if needed
    const finalCanvas =
      scale > 1 ? scaleCanvasNearestNeighbor(baseCanvas, scale) : baseCanvas;

    // Convert to blob and download
    const blob = await canvasToPngBlob(finalCanvas);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `frame_${String(i).padStart(3, "0")}_${scale}x.png`;
    link.click();
    URL.revokeObjectURL(url);

    // Small delay to avoid overwhelming the browser
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Exports all frames as a sprite sheet with optional scaling, solid background support, and filter-aware rendering.
 * @param frameManager - The FrameManager containing all frames
 * @param layout - Layout configuration ('horizontal', 'vertical', or 'grid')
 * @param options - Optional parameters including scale, background, and backgroundColor
 */
export async function exportSpriteSheet(
  frameManager: FrameManager,
  layout: "horizontal" | "vertical" | "grid",
  options?: {
    scale?: number;
    background?: "transparent" | "solid";
    backgroundColor?: string;
  },
): Promise<void> {
  const scale = validateScale(options?.scale);
  const frames = frameManager.getFrames();
  const width = frameManager.width;
  const height = frameManager.height;

  // Fixed separator size (no separators)
  const _sep = 0;

  // Calculate sprite sheet dimensions at base scale
  let sheetWidth: number;
  let sheetHeight: number;

  if (layout === "grid") {
    const cols = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / cols);
    sheetWidth = width * cols;
    sheetHeight = height * rows;
  } else if (layout === "horizontal") {
    sheetWidth = width * frames.length;
    sheetHeight = height;
  } else {
    // vertical
    sheetWidth = width;
    sheetHeight = height * frames.length;
  }

  // Create base 1× sprite sheet canvas
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = sheetWidth;
  baseCanvas.height = sheetHeight;
  const ctx = baseCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for sprite sheet");
  }

  // Fill solid background if requested
  if (options?.background === "solid" && options?.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, sheetWidth, sheetHeight);
  }

  // Render all frames onto the base sprite sheet with filters
  if (layout === "grid") {
    const cols = Math.ceil(Math.sqrt(frames.length));
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      // Create filtered composite for this frame
      const frameCanvas = createFilteredComposite(
        frame.layerManager,
        width,
        height,
      );

      // Calculate grid position
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * width;
      const y = row * height;

      // Draw frame onto sprite sheet
      ctx.drawImage(frameCanvas, x, y);
    }
  } else {
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      // Create filtered composite for this frame
      const frameCanvas = createFilteredComposite(
        frame.layerManager,
        width,
        height,
      );

      // Calculate position on sprite sheet
      const x = layout === "horizontal" ? i * width : 0;
      const y = layout === "vertical" ? i * height : 0;

      // Draw frame onto sprite sheet
      ctx.drawImage(frameCanvas, x, y);
    }
  }

  // Scale the entire sprite sheet if needed
  const finalCanvas =
    scale > 1 ? scaleCanvasNearestNeighbor(baseCanvas, scale) : baseCanvas;

  // Convert to blob and download
  const blob = await canvasToPngBlob(finalCanvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spritesheet_${layout}_${scale}x.png`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports all frames as a WebM video with optional scaling, transparency, background color support, and filter-aware rendering.
 * @param frameManager - The FrameManager containing all frames
 * @param fpsOrOptions - Either fps number (legacy) or options object with scale, fps, transparency, and backgroundColor
 * @param transparency - Legacy transparency parameter (optional)
 */
export async function exportWebM(
  frameManager: FrameManager,
  fpsOrOptions?:
    | number
    | {
        scale?: number;
        fps?: number;
        transparency?: boolean;
        backgroundColor?: string;
      },
  transparency?: boolean,
): Promise<void> {
  // Handle legacy signature vs new options signature
  let scale = 1;
  let fps = 30;
  let useTransparency = false;
  let backgroundColor: string | undefined = undefined;

  if (typeof fpsOrOptions === "number") {
    // Legacy signature: (frameManager, fps, transparency)
    fps = fpsOrOptions;
    useTransparency = transparency ?? false;
  } else if (fpsOrOptions && typeof fpsOrOptions === "object") {
    // New signature: (frameManager, options)
    scale = validateScale(fpsOrOptions.scale);
    fps = fpsOrOptions.fps ?? 30;
    useTransparency = fpsOrOptions.transparency ?? false;
    backgroundColor = fpsOrOptions.backgroundColor;
  }

  const frames = frameManager.getFrames();
  const width = frameManager.width;
  const height = frameManager.height;

  // Create canvas for recording (at target scale)
  const recordCanvas = document.createElement("canvas");
  recordCanvas.width = width * scale;
  recordCanvas.height = height * scale;
  const recordCtx = recordCanvas.getContext("2d");
  if (!recordCtx) {
    throw new Error("Failed to get 2D context for WebM recording");
  }

  // Disable smoothing for pixel-perfect scaling
  recordCtx.imageSmoothingEnabled = false;

  // Set up MediaRecorder
  const stream = recordCanvas.captureStream();
  const mimeType = useTransparency
    ? "video/webm;codecs=vp9"
    : "video/webm;codecs=vp8";
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Start recording
  mediaRecorder.start();

  // Render frames with proper timing and filters
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Create filtered composite canvas
    const baseCanvas = createFilteredComposite(
      frame.layerManager,
      width,
      height,
      useTransparency ? "transparent" : "solid",
      backgroundColor,
    );

    // Clear and draw scaled frame onto record canvas
    recordCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
    recordCtx.drawImage(
      baseCanvas,
      0,
      0,
      width,
      height,
      0,
      0,
      recordCanvas.width,
      recordCanvas.height,
    );

    // Wait for frame duration (use per-frame duration if available, otherwise use fps)
    const frameDuration = frame.duration || 1000 / fps;
    await new Promise((resolve) => setTimeout(resolve, frameDuration));
  }

  // Stop recording and download
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `animation_${scale}x.webm`;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    };
    mediaRecorder.stop();
  });
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Imports a PNG file and returns the image data.
 * @param file - The File object to import
 * @returns A Promise that resolves to an object containing width, height, and pixel data
 */
export async function importPNG(file: File): Promise<{
  width: number;
  height: number;
  data: Uint8ClampedArray;
}> {
  // Create an image bitmap from the file
  const bitmap = await createImageBitmap(file);

  // Create a canvas to extract pixel data
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for import");
  }

  // Draw the bitmap onto the canvas
  ctx.drawImage(bitmap, 0, 0);

  // Extract pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
  };
}
