/**
 * DrawGrid.ts
 *
 * Optimized grid rendering utility using pattern-tiling with 2×2 offscreen canvas.
 * Draws a checkerboard pattern in pure pixel space without any camera transforms.
 */

let gridPattern: CanvasPattern | null = null;
let patternCanvas: HTMLCanvasElement | null = null;

/**
 * Draws a checkerboard grid pattern in pure pixel space.
 * Camera parameter is ignored - grid is drawn in pixel space only.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  // Create pattern canvas if not already created
  if (!patternCanvas) {
    patternCanvas = document.createElement("canvas");
    patternCanvas.width = 2;
    patternCanvas.height = 2;
    const patternCtx = patternCanvas.getContext("2d");

    if (patternCtx) {
      // Draw 2×2 checkerboard pattern
      patternCtx.fillStyle = "#2a2a2a"; // Light gray
      patternCtx.fillRect(0, 0, 1, 1);
      patternCtx.fillRect(1, 1, 1, 1);

      patternCtx.fillStyle = "#232323"; // Dark gray
      patternCtx.fillRect(1, 0, 1, 1);
      patternCtx.fillRect(0, 1, 1, 1);

      // Create pattern
      gridPattern = ctx.createPattern(patternCanvas, "repeat");
    }
  }

  if (!gridPattern) return;

  // Save context state
  ctx.save();

  // Set identity transform for pure pixel space rendering
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // Fill with pattern
  ctx.fillStyle = gridPattern;
  ctx.fillRect(0, 0, width, height);

  // Restore context state
  ctx.restore();
}
