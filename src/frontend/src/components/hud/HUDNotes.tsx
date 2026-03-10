import { getEditorRuntime } from "@/editor/EditorRuntime";
import React from "react";
import type { HUDState } from "./hudTypes";

interface HUDNotesProps {
  state: HUDState;
}

export function HUDNotes({ state }: HUDNotesProps) {
  const runtime = getEditorRuntime();
  const visibility = runtime.getHudVisibility();

  // Don't render if visibility is false
  if (!visibility.notes) {
    return null;
  }

  let noteText = "";

  // Display only contextual messages for Selection and Lasso tools
  if (state.tool === "select") {
    noteText = "Drag to create rectangular selection.";
  } else if (state.tool === "lasso") {
    noteText = "Click to draw freehand selection path.";
  }

  if (!noteText) return null;

  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-[40]"
      style={{ zoom: 0.85 }}
    >
      <div
        className="max-w-md rounded border border-blue-500/30 bg-black/80 px-3 py-2 font-mono shadow-lg"
        style={{ fontSize: "0.85em" }}
      >
        <div className="flex items-start gap-2">
          <span className="text-blue-400">ℹ️</span>
          <span className="text-white/90">{noteText}</span>
        </div>
      </div>
    </div>
  );
}
