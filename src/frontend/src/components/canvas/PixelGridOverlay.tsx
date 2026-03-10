import React from "react";

interface PixelGridOverlayProps {
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  show: boolean;
}

/**
 * PixelGridOverlay renders a thin, crisp Aseprite-style pixel grid overlay
 * that follows camera zoom and offset but remains independent of the main canvas drawing.
 */
export default function PixelGridOverlay({
  width,
  height,
  zoom,
  offsetX,
  offsetY,
  show,
}: PixelGridOverlayProps) {
  if (!show) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width: width * zoom,
        height: height * zoom,
        transform: `translate(${offsetX}px, ${offsetY}px)`,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="pixel-grid"
          width={zoom}
          height={zoom}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={zoom}
            height={zoom}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pixel-grid)" />
    </svg>
  );
}
