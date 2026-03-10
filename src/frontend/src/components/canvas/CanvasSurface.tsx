import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

interface CanvasSurfaceProps {
  width: number;
  height: number;
  onReady?: (ctx: CanvasRenderingContext2D) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  camera?: { zoom: number; offsetX: number; offsetY: number };
  showGrid?: boolean;
}

export interface CanvasSurfaceHandle {
  getCanvasElement: () => HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
}

const CanvasSurface = forwardRef<CanvasSurfaceHandle, CanvasSurfaceProps>(
  (
    {
      width,
      height,
      onReady,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      camera,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const readyCalledRef = useRef(false);

    useImperativeHandle(ref, () => ({
      getCanvasElement: () => canvasRef.current,
      getContext: () => ctxRef.current,
    }));

    // Initialize canvas and context only once on mount
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;
      ctxRef.current = ctx;

      // Call onReady only once
      if (!readyCalledRef.current && onReady) {
        onReady(ctx);
        readyCalledRef.current = true;
      }
    }, [onReady]);

    // When width/height props change, immediately sync canvas resolution
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Update internal bitmap resolution (critical for pixel-accurate rendering)
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      // Reacquire context and disable smoothing
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;
      ctxRef.current = ctx;
    }, [width, height]);

    // Optional: ensure canvas stays synced if browser internally changes pixel ratio
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const observer = new ResizeObserver(() => {
        // Force 1:1 pixel ratio
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
      });

      observer.observe(canvas);

      return () => observer.disconnect();
    }, [width, height]);

    // Attach native pointer event listeners for performance
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleCanvasPointerDown = (e: PointerEvent) => {
        if (onPointerDown) onPointerDown(e);
      };

      const handleCanvasPointerMove = (e: PointerEvent) => {
        if (onPointerMove) onPointerMove(e);
      };

      const handleCanvasPointerUp = (e: PointerEvent) => {
        if (onPointerUp) onPointerUp(e);
      };

      const handleCanvasPointerLeave = (e: PointerEvent) => {
        // Forward pointer leave to pointer up handler
        if (onPointerUp) onPointerUp(e);
      };

      // Attach native listeners with passive option for move events
      canvas.addEventListener("pointerdown", handleCanvasPointerDown);
      canvas.addEventListener("pointermove", handleCanvasPointerMove, {
        passive: true,
      });
      canvas.addEventListener("pointerup", handleCanvasPointerUp);
      canvas.addEventListener("pointerleave", handleCanvasPointerLeave);

      // Cleanup listeners on unmount or when handlers change
      return () => {
        canvas.removeEventListener("pointerdown", handleCanvasPointerDown);
        canvas.removeEventListener("pointermove", handleCanvasPointerMove);
        canvas.removeEventListener("pointerup", handleCanvasPointerUp);
        canvas.removeEventListener("pointerleave", handleCanvasPointerLeave);
      };
    }, [onPointerDown, onPointerMove, onPointerUp]);

    return (
      <div
        className="canvas-viewport"
        style={{
          position: "relative",
          width: `${width}px`,
          height: `${height}px`,
          transform: camera
            ? `translate(${camera.offsetX}px, ${camera.offsetY}px) scale(${camera.zoom})`
            : undefined,
          transformOrigin: "top left",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-none"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            imageRendering: "pixelated",
            pointerEvents: "auto",
          }}
        />
      </div>
    );
  },
);

CanvasSurface.displayName = "CanvasSurface";

export default CanvasSurface;
