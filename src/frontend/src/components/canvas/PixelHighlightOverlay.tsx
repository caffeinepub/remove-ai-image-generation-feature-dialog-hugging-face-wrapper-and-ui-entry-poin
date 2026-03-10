import type React from "react";
import { useEffect, useRef } from "react";

interface PixelHighlightOverlayProps {
  hoverRef: React.RefObject<{ x: number; y: number } | null>;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export default function PixelHighlightOverlay({
  hoverRef,
  zoom,
  offsetX,
  offsetY,
}: PixelHighlightOverlayProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const updateOverlay = () => {
      const div = divRef.current;
      if (!div) return;

      const hoverPixel = hoverRef.current;

      if (!hoverPixel) {
        div.style.display = "none";
        animationFrameId = requestAnimationFrame(updateOverlay);
        return;
      }

      // Read the active tool directly from window.editor.tool.currentTool
      const currentTool = (window as any).editor?.tool?.currentTool || "pencil";

      // Define scalable tools: only pencil, brush, and eraser scale with brush size
      const scalableTools = ["pencil", "brush", "eraser"];

      // Determine if the current tool should scale with brush size
      const shouldScale = scalableTools.includes(currentTool);

      // Get brush size from window.editor.tool.brushSize
      const brushSize = (window as any).editor?.tool?.brushSize || 1;

      // Calculate the effective brush size: brushSize for scalable tools, 1×1 for all others
      const effectiveBrushSize = shouldScale ? brushSize : 1;

      // Calculate the radius for centering
      const radius = Math.floor(effectiveBrushSize / 2);

      // Calculate top-left corner in pixel space (centered around the brush)
      const topLeftX = hoverPixel.x - radius;
      const topLeftY = hoverPixel.y - radius;

      // Compute correct screen-space positioning using camera transforms
      const screenX = topLeftX * zoom + offsetX;
      const screenY = topLeftY * zoom + offsetY;
      const screenSize = effectiveBrushSize * zoom;

      div.style.display = "block";
      div.style.left = `${screenX}px`;
      div.style.top = `${screenY}px`;
      div.style.width = `${screenSize}px`;
      div.style.height = `${screenSize}px`;

      animationFrameId = requestAnimationFrame(updateOverlay);
    };

    animationFrameId = requestAnimationFrame(updateOverlay);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hoverRef, zoom, offsetX, offsetY]);

  return (
    <div
      ref={divRef}
      style={{
        position: "absolute",
        border: "1px solid rgba(255, 255, 255, 0.85)",
        pointerEvents: "none",
        boxSizing: "border-box",
        display: "none",
      }}
    />
  );
}
