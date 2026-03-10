/**
 * Brush serialization utilities for .json file format with canonical JSON format validation.
 */

export interface BrushPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface BrushData {
  type: "icpixel-custom-brush";
  version: 1;
  name: string;
  width: number;
  height: number;
  pixels: BrushPixel[];
}

/**
 * Serialize brush data to canonical JSON format for .json file
 */
export function serializeBrush(
  data: Omit<BrushData, "type" | "version">,
): string {
  const canonicalData: BrushData = {
    type: "icpixel-custom-brush",
    version: 1,
    name: data.name,
    width: data.width,
    height: data.height,
    pixels: data.pixels.map((p) => ({
      x: p.x,
      y: p.y,
      r: p.r,
      g: p.g,
      b: p.b,
      a: p.a,
    })),
  };

  return JSON.stringify(canonicalData, null, 2);
}

/**
 * Deserialize brush data from JSON string with validation
 * Returns null if validation fails
 */
export function deserializeBrush(json: string): BrushData | null {
  try {
    const data = JSON.parse(json);

    // Validate canonical format
    if (data.type !== "icpixel-custom-brush") {
      console.error('Invalid brush file: type must be "icpixel-custom-brush"');
      return null;
    }

    if (data.version !== 1) {
      console.error("Invalid brush file: version must be 1");
      return null;
    }

    // Validate required fields
    if (
      typeof data.name !== "string" ||
      typeof data.width !== "number" ||
      typeof data.height !== "number" ||
      !Array.isArray(data.pixels)
    ) {
      console.error("Invalid brush file: missing or invalid required fields");
      return null;
    }

    // Validate pixel data
    for (const pixel of data.pixels) {
      if (
        typeof pixel.x !== "number" ||
        typeof pixel.y !== "number" ||
        typeof pixel.r !== "number" ||
        typeof pixel.g !== "number" ||
        typeof pixel.b !== "number" ||
        typeof pixel.a !== "number"
      ) {
        console.error("Invalid brush file: invalid pixel data");
        return null;
      }
    }

    return data as BrushData;
  } catch (error) {
    console.error("Failed to deserialize brush:", error);
    return null;
  }
}

/**
 * Download brush data as .json file
 * Uses canonical format with sanitized filename
 */
export function downloadBrush(data: Omit<BrushData, "type" | "version">): void {
  // Serialize to canonical JSON format
  const json = serializeBrush(data);

  // Create blob with JSON content
  const blob = new Blob([json], { type: "application/json" });

  // Create object URL
  const url = URL.createObjectURL(blob);

  // Sanitize brush name: trim and replace spaces with underscores
  const sanitizedName = data.name.trim().replace(/\s+/g, "_");

  // Create temporary anchor element and trigger download
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizedName}.json`;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Load brush data from .json file with validation
 */
export function loadBrushFromFile(file: File): Promise<BrushData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve(null);
        return;
      }

      const brushData = deserializeBrush(text);
      resolve(brushData);
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsText(file);
  });
}

/**
 * Trim transparent pixels from brush data
 */
export function trimBrushPixels(
  pixels: BrushPixel[],
  _width: number,
  _height: number,
): {
  pixels: BrushPixel[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
} {
  if (pixels.length === 0) {
    return { pixels: [], width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  // Find bounding box of opaque pixels
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const pixel of pixels) {
    if (pixel.a > 0) {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    }
  }

  // If no opaque pixels, return empty
  if (minX === Number.POSITIVE_INFINITY) {
    return { pixels: [], width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  // Calculate new dimensions
  const newWidth = maxX - minX + 1;
  const newHeight = maxY - minY + 1;

  // Adjust pixel coordinates
  const trimmedPixels = pixels
    .filter((p) => p.a > 0)
    .map((p) => ({
      ...p,
      x: p.x - minX,
      y: p.y - minY,
    }));

  return {
    pixels: trimmedPixels,
    width: newWidth,
    height: newHeight,
    offsetX: minX,
    offsetY: minY,
  };
}
