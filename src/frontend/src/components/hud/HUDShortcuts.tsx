import React from "react";
import { HUD_SHORTCUTS } from "./hudShortcutsConfig";
import type { HUDState } from "./hudTypes";

interface HUDShortcutsProps {
  state: HUDState;
}

export function HUDShortcuts({ state }: HUDShortcutsProps) {
  const toolName = state.tool.toUpperCase();
  const shortcuts = HUD_SHORTCUTS[toolName] || [];

  if (shortcuts.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-[40]"
      style={{ zoom: 0.85 }}
    >
      <div
        className="rounded border border-white/20 bg-black/80 px-3 py-2 font-mono shadow-lg"
        style={{ fontSize: "0.85em" }}
      >
        <div className="mb-1.5 border-b border-white/20 pb-1 text-white/70">
          {toolName} Shortcuts
        </div>
        <div className="space-y-0.5">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center gap-2 text-white/90"
            >
              <span className="min-w-[60px] text-yellow-400">
                {shortcut.keys}
              </span>
              <span className="text-white/70">{shortcut.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
