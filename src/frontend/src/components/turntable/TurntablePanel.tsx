import { useEffect, useRef, useState } from "react";

const DIRECTIONS = [
  { label: "FRONT", frame: 0 },
  { label: "RIGHT", frame: 1 },
  { label: "BACK", frame: 2 },
  { label: "LEFT", frame: 3 },
] as const;

const PREVIEW_SIZE = 96;

export function TurntablePanel() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    let rafId: number;

    const render = () => {
      const runtime = (window as any).editor;
      if (!runtime) {
        rafId = window.setTimeout(render, 200) as unknown as number;
        return;
      }

      const fm = runtime.frameManager;
      if (!fm) {
        rafId = window.setTimeout(render, 200) as unknown as number;
        return;
      }

      const frames = fm.getFrames();
      const currentIdx = fm.getCurrentFrameIndex();
      setActiveFrame(currentIdx);
      setFrameCount(frames.length);

      const width = runtime.width || 32;
      const height = runtime.height || 32;

      DIRECTIONS.forEach(({ frame: frameIdx }, i) => {
        const canvas = canvasRefs.current[i];
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;

        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

        // Draw checkerboard background
        const cellSize = Math.max(4, Math.floor(PREVIEW_SIZE / 16));
        for (let cy = 0; cy < PREVIEW_SIZE; cy += cellSize) {
          for (let cx = 0; cx < PREVIEW_SIZE; cx += cellSize) {
            const isLight =
              (Math.floor(cx / cellSize) + Math.floor(cy / cellSize)) % 2 === 0;
            ctx.fillStyle = isLight ? "#e0e0e0" : "#c8c8c8";
            ctx.fillRect(cx, cy, cellSize, cellSize);
          }
        }

        const frame = frames[frameIdx];
        if (!frame) return;

        const lm = frame.layerManager;
        if (!lm) return;

        try {
          const buf = lm.getCompositeBuffer();
          const imgData = new ImageData(
            new Uint8ClampedArray(buf),
            width,
            height,
          );

          // Draw into a temp canvas at native size
          const tmp = document.createElement("canvas");
          tmp.width = width;
          tmp.height = height;
          const tmpCtx = tmp.getContext("2d");
          if (!tmpCtx) return;
          tmpCtx.putImageData(imgData, 0, 0);

          // Scale to fit PREVIEW_SIZE keeping aspect ratio
          const scale = Math.min(PREVIEW_SIZE / width, PREVIEW_SIZE / height);
          const dw = Math.floor(width * scale);
          const dh = Math.floor(height * scale);
          const dx = Math.floor((PREVIEW_SIZE - dw) / 2);
          const dy = Math.floor((PREVIEW_SIZE - dh) / 2);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmp, dx, dy, dw, dh);
        } catch (_e) {
          // Frame data not ready yet
        }
      });

      rafId = window.setTimeout(render, 200) as unknown as number;
    };

    render();
    return () => clearTimeout(rafId);
  }, []);

  const handleClick = (frameIdx: number) => {
    const runtime = (window as any).editor;
    if (!runtime?.frameManager) return;
    const frames = runtime.frameManager.getFrames();
    if (frameIdx < frames.length) {
      runtime.frameManager.setActiveFrame(frameIdx);
      setActiveFrame(frameIdx);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Turntable
        </div>
        <p className="text-xs text-muted-foreground">
          Draw each angle on frames 1–4. Click a view to navigate to that frame.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DIRECTIONS.map(({ label, frame: frameIdx }, i) => {
          const hasFrame = frameIdx < frameCount;
          const isActive = activeFrame === frameIdx;

          return (
            <button
              key={label}
              type="button"
              data-ocid={`turntable.item.${i + 1}`}
              className={[
                "flex flex-col items-center gap-1 rounded cursor-pointer select-none",
                "transition-all duration-100 bg-transparent border-0 p-0",
                hasFrame ? "opacity-100" : "opacity-50",
              ].join(" ")}
              onClick={() => handleClick(frameIdx)}
              title={
                hasFrame
                  ? `Go to frame ${frameIdx + 1} (${label})`
                  : `Frame ${frameIdx + 1} does not exist yet`
              }
            >
              <div
                className={[
                  "rounded overflow-hidden",
                  isActive
                    ? "ring-2 ring-primary ring-offset-1"
                    : "ring-1 ring-border",
                ].join(" ")}
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              >
                {hasFrame ? (
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[i] = el;
                    }}
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                    style={{
                      display: "block",
                      imageRendering: "pixelated",
                      width: PREVIEW_SIZE,
                      height: PREVIEW_SIZE,
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center bg-muted"
                    style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                  >
                    <span className="text-muted-foreground text-lg">—</span>
                  </div>
                )}
              </div>
              <span
                className={[
                  "text-xs font-mono font-semibold",
                  isActive ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded border border-border bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold">Tip:</span> Assign frames 1–4 as
          Front, Right, Back, Left for a full character turntable.
        </p>
      </div>
    </div>
  );
}
