import { getEditorRuntime } from "@/editor/EditorRuntime";
import React from "react";
import type { HUDState } from "./hudTypes";

interface HUDGeneralInfoProps {
  state: HUDState;
}

export function HUDGeneralInfo({ state }: HUDGeneralInfoProps) {
  const runtime = getEditorRuntime();
  const visibility = runtime.getHudVisibility();

  // Don't render if visibility is false
  if (!visibility.generalInfo) {
    return null;
  }

  // Build layer display text
  let layerDisplay = "No Layer";
  if (state.activeLayerName) {
    if (state.activeLayerParentGroupName) {
      layerDisplay = `${state.activeLayerParentGroupName} / ${state.activeLayerName}`;
    } else {
      layerDisplay = state.activeLayerName;
    }
  }

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-1/2 z-[40] -translate-x-1/2"
      style={{ zoom: 0.85 }}
    >
      <div
        className="rounded border border-white/20 bg-black/80 px-3 py-1.5 font-mono shadow-lg"
        style={{ fontSize: "0.85em" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-white/90">
            Tool: <span className="text-blue-400">{state.tool}</span>
          </span>
          <span className="text-white/90">
            Size: <span className="text-green-400">{state.brushSize}px</span>
          </span>
          <span className="text-white/90">
            Zoom:{" "}
            <span className="text-purple-400">
              {Math.round(state.zoom * 100)}%
            </span>
          </span>
          {state.hoverPixel && (
            <span className="text-white/90">
              Pos:{" "}
              <span className="text-yellow-400">
                {state.hoverPixel.x}, {state.hoverPixel.y}
              </span>
            </span>
          )}
          <span className="text-white/90">
            Layer: <span className="text-cyan-400">{layerDisplay}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
