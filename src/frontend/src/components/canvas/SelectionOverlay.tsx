import type { ToolController } from "@/engine/ToolController";
import type React from "react";
import { useEffect, useRef } from "react";

interface SelectionOverlayProps {
  toolController: ToolController;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

const HANDLE_SIZE = 6;
const PIVOT_SIZE = 8; // Increased from 6 to 8 for better visibility

/**
 * SelectionOverlay Component
 *
 * Pure RAF-driven selection frame renderer with zero React state updates.
 * Renders a permanently mounted SVG with selection frame, 8 resize handles, rotation pivot, and live lasso path.
 * Uses requestAnimationFrame loop for smooth, lag-free updates independent of React render timing.
 * Converts world coordinates to screen coordinates using offset + world * zoom with pixel-snapped alignment.
 * Supports live selection rectangle during creation, live lasso path during drawing, and hides handles (but not pivot) during rotation mode.
 * Implements rendering priority: live lasso path (highest) → live selection rectangle → committed selection frame (lowest).
 * No flicker, no lag, perfectly synced with selection movement and zoom.
 * Enhanced with stable rotation preview rendering, brighter pivot indicator, and improved visual consistency.
 */
const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  toolController,
  zoom,
  offsetX,
  offsetY,
}) => {
  // Ref to the SVG rect element for direct DOM manipulation
  const rectRef = useRef<SVGRectElement | null>(null);

  // Refs for 8 resize handles
  const handleRefs = useRef<Record<string, SVGRectElement | null>>({});

  // Ref for rotation pivot
  const pivotRef = useRef<SVGRectElement | null>(null);

  // Ref for lasso path
  const lassoPathRef = useRef<SVGPathElement | null>(null);

  // Ref to track visibility state to avoid redundant attribute changes
  const visibleRef = useRef(false);

  // Ref to store RAF ID for cleanup
  const rafRef = useRef<number | null>(null);

  // Start requestAnimationFrame loop to continuously update selection rect, handles, pivot, and lasso path
  useEffect(() => {
    const updateLoop = () => {
      const rectEl = rectRef.current;
      const pivotEl = pivotRef.current;
      const lassoPathEl = lassoPathRef.current;

      if (!rectEl) {
        rafRef.current = requestAnimationFrame(updateLoop);
        return;
      }

      // Check if rotation mode is active
      const isRotating = toolController.isRotatingSelection();

      // Get live lasso path (highest priority)
      const lassoPath = toolController.getLiveLassoPath();

      // Get live selection rect (during creation) or committed selection rect
      const live = toolController.getLiveSelectionRect();
      const static_ = toolController.getSelectionRect();
      const rect = live ?? static_;

      // Rendering priority: live lasso path → live selection rectangle → committed selection frame

      // Priority 1: Live lasso path (active drawing)
      if (lassoPath.length > 1) {
        // Hide selection rectangle and handles
        if (visibleRef.current) {
          rectEl.setAttribute("visibility", "hidden");

          for (const key in handleRefs.current) {
            const handleEl = handleRefs.current[key];
            if (handleEl) {
              handleEl.setAttribute("visibility", "hidden");
            }
          }

          if (pivotEl) {
            pivotEl.setAttribute("visibility", "hidden");
          }

          visibleRef.current = false;
        }

        // Show lasso path
        if (lassoPathEl) {
          // Build SVG path data string
          let pathData = `M ${Math.floor(offsetX + lassoPath[0].x * zoom)} ${Math.floor(offsetY + lassoPath[0].y * zoom)}`;

          for (let i = 1; i < lassoPath.length; i++) {
            const screenX = Math.floor(offsetX + lassoPath[i].x * zoom);
            const screenY = Math.floor(offsetY + lassoPath[i].y * zoom);
            pathData += ` L ${screenX} ${screenY}`;
          }

          lassoPathEl.setAttribute("d", pathData);
          lassoPathEl.setAttribute("visibility", "visible");
        }

        rafRef.current = requestAnimationFrame(updateLoop);
        return;
      }

      // Hide lasso path if not drawing
      if (lassoPathEl) {
        lassoPathEl.setAttribute("visibility", "hidden");
      }

      // Priority 2 & 3: Live selection rectangle or committed selection frame
      if (!rect) {
        if (visibleRef.current) {
          rectEl.setAttribute("visibility", "hidden");

          // Hide all handles
          for (const key in handleRefs.current) {
            const handleEl = handleRefs.current[key];
            if (handleEl) {
              handleEl.setAttribute("visibility", "hidden");
            }
          }

          // Hide pivot
          if (pivotEl) {
            pivotEl.setAttribute("visibility", "hidden");
          }

          visibleRef.current = false;
        }
        rafRef.current = requestAnimationFrame(updateLoop);
        return;
      }

      // Convert world coordinates to screen coordinates with pixel-snapping
      const x = Math.floor(offsetX + rect.x * zoom) + 0.5;
      const y = Math.floor(offsetY + rect.y * zoom) + 0.5;
      const width = Math.floor(rect.width * zoom);
      const height = Math.floor(rect.height * zoom);

      // Update rect attributes directly with consistent stroke rendering
      rectEl.setAttribute("x", x.toString());
      rectEl.setAttribute("y", y.toString());
      rectEl.setAttribute("width", width.toString());
      rectEl.setAttribute("height", height.toString());

      // Ensure stroke is always fully opaque and consistent during rotation
      rectEl.setAttribute("stroke-opacity", "1");

      // Show rect if hidden
      if (!visibleRef.current) {
        rectEl.setAttribute("visibility", "visible");
        visibleRef.current = true;
      }

      // Update 8 resize handles
      const handlePositions = {
        nw: { x: x - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2 },
        n: { x: x + width / 2 - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2 },
        ne: { x: x + width - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2 },
        w: { x: x - HANDLE_SIZE / 2, y: y + height / 2 - HANDLE_SIZE / 2 },
        e: {
          x: x + width - HANDLE_SIZE / 2,
          y: y + height / 2 - HANDLE_SIZE / 2,
        },
        sw: { x: x - HANDLE_SIZE / 2, y: y + height - HANDLE_SIZE / 2 },
        s: {
          x: x + width / 2 - HANDLE_SIZE / 2,
          y: y + height - HANDLE_SIZE / 2,
        },
        se: { x: x + width - HANDLE_SIZE / 2, y: y + height - HANDLE_SIZE / 2 },
      };

      // Update each handle
      for (const key in handlePositions) {
        const handleEl = handleRefs.current[key];
        if (handleEl) {
          const pos = handlePositions[key];
          handleEl.setAttribute("x", pos.x.toString());
          handleEl.setAttribute("y", pos.y.toString());
          handleEl.setAttribute("width", HANDLE_SIZE.toString());
          handleEl.setAttribute("height", HANDLE_SIZE.toString());

          // Hide handles during rotation, show otherwise
          if (isRotating) {
            handleEl.setAttribute("visibility", "hidden");
          } else {
            handleEl.setAttribute("visibility", "visible");
          }
        }
      }

      // Update rotation pivot
      // Access pivot through the internal selectionManager (via any cast for private access)
      if (pivotEl) {
        const selectionManager = (toolController as any).selectionManager;
        const pivot = selectionManager?.getRotationPivot?.();

        if (pivot) {
          // Convert pivot world coordinates to screen coordinates
          const pivotScreenX =
            Math.floor(offsetX + pivot.x * zoom) - PIVOT_SIZE / 2;
          const pivotScreenY =
            Math.floor(offsetY + pivot.y * zoom) - PIVOT_SIZE / 2;

          // 8×8px pivot square (increased from 6×6), pixel-snapped, centered on pivot point
          pivotEl.setAttribute("x", pivotScreenX.toString());
          pivotEl.setAttribute("y", pivotScreenY.toString());
          pivotEl.setAttribute("width", PIVOT_SIZE.toString());
          pivotEl.setAttribute("height", PIVOT_SIZE.toString());
          pivotEl.setAttribute("visibility", "visible");
        } else {
          pivotEl.setAttribute("visibility", "hidden");
        }
      }

      // Schedule next frame
      rafRef.current = requestAnimationFrame(updateLoop);
    };

    // Start the loop
    rafRef.current = requestAnimationFrame(updateLoop);

    // Cleanup: cancel RAF loop on unmount
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [toolController, zoom, offsetX, offsetY]);

  // Always render a static SVG with selection frame, handles, pivot, and lasso path
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {/* Live lasso path (highest priority) */}
      <path
        ref={lassoPathRef}
        d=""
        fill="none"
        stroke="white"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        strokeDasharray="2 2"
        visibility="hidden"
      />

      {/* Selection frame - fully opaque stroke with consistent rendering */}
      <rect
        ref={rectRef}
        x={0}
        y={0}
        width={0}
        height={0}
        fill="none"
        stroke="white"
        strokeWidth={1}
        strokeOpacity={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        strokeDasharray="2 2"
        visibility="hidden"
      />

      {/* 8 resize handles */}
      <rect
        ref={(el) => {
          handleRefs.current.nw = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.n = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.ne = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.w = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.e = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.sw = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.s = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
      <rect
        ref={(el) => {
          handleRefs.current.se = el;
        }}
        x={0}
        y={0}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />

      {/* Rotation pivot - brighter yellow-green color with increased size for better visibility */}
      <rect
        ref={pivotRef}
        x={0}
        y={0}
        width={PIVOT_SIZE}
        height={PIVOT_SIZE}
        fill="#D4FF64"
        stroke="black"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
        visibility="hidden"
      />
    </svg>
  );
};

export default SelectionOverlay;
