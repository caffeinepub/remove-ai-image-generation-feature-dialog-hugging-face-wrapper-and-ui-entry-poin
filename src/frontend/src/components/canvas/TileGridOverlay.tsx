import React from "react";

interface TileGridOverlayProps {
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  show: boolean;
  tileSize: number;
}

/**
 * TileGridOverlay renders a DodgerBlue tile grid overlay using SVG patterns
 * that adjusts automatically to zoom and offset for visual tile boundaries.
 */
export default function TileGridOverlay({
  width,
  height,
  zoom,
  offsetX,
  offsetY,
  show,
  tileSize,
}: TileGridOverlayProps) {
  if (!show) return null;

  const scaledTileSize = tileSize * zoom;

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
          id="tile-grid"
          width={scaledTileSize}
          height={scaledTileSize}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={scaledTileSize}
            height={scaledTileSize}
            fill="none"
            stroke="rgba(30, 144, 255, 0.6)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#tile-grid)" />
    </svg>
  );
}
