// HUD shortcuts configuration defining keyboard shortcuts for different tools and modes
export const HUD_SHORTCUTS: Record<
  string,
  Array<{ keys: string; desc: string }>
> = {
  GLOBAL: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Ctrl+Z", desc: "Undo" },
    { keys: "Ctrl+Shift+Z", desc: "Redo" },
  ],
  PENCIL: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
  ],
  BRUSH: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
  ],
  ERASER: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
  ],
  EYEDROPPER: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Click", desc: "Pick color" },
  ],
  FILL: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Click", desc: "Fill area" },
  ],
  LINE: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
  ],
  RECTANGLE: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
  ],
  CIRCLE: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
  ],
  SELECT: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Enter", desc: "Commit selection" },
    { keys: "Esc", desc: "Cancel selection" },
    { keys: "R + Drag", desc: "Rotate selection" },
    { keys: "Alt + Drag", desc: "Move pivot point" },
  ],
  LASSO: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Enter", desc: "Commit selection" },
    { keys: "Esc", desc: "Cancel selection" },
    { keys: "R + Drag", desc: "Rotate selection" },
    { keys: "Alt + Drag", desc: "Move pivot point" },
  ],
  MAGIC: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Click", desc: "Select similar pixels" },
    { keys: "Enter", desc: "Commit selection" },
    { keys: "Esc", desc: "Cancel selection" },
  ],
  OUTLINE: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Click", desc: "Create outline" },
  ],
  TEXT: [
    { keys: "Space + Drag", desc: "Pan canvas" },
    { keys: "Scroll", desc: "Zoom in/out" },
    { keys: "Type", desc: "Enter text" },
    { keys: "Enter", desc: "Commit text" },
    { keys: "Esc", desc: "Cancel text" },
    { keys: "Backspace", desc: "Delete character" },
  ],
};
