# ICPixel — Turntable Panel

## Current State
The RightSidebar has 3 tabs: Properties, Layers, NFT. It reads from `window.editor` (EditorRuntime) for canvas data. The ExportManager exposes `createFilteredComposite(layerManager, width, height)` for rendering composites per-frame. The FrameManager exposes `setActiveFrame(index)`, `getFrames()`, `getCurrentFrameIndex()`, and `getCurrentLayerManager()`.

## Requested Changes (Diff)

### Add
- New `TurntablePanel` component (`src/frontend/src/components/turntable/TurntablePanel.tsx`)
- A 4th tab "Turn" added to RightSidebar (both dark and grey theme variants)
- Four preview canvases: Front (no transform), Right (flip X), Back (flip X+Y), Left (flip Y)
- Each preview shows a label (FRONT, RIGHT, BACK, LEFT) and is clickable
- Clicking a preview navigates the timeline to the corresponding frame index (0=Front, 1=Right, 2=Back, 3=Left) if that frame exists — otherwise it shows a "No frame" placeholder
- Previews update automatically by polling `window.editor` every 200ms (same pattern as HUD polling)
- A small frame count indicator shows how many frames are available vs the 4 expected
- Active frame highlight: whichever preview corresponds to the current active frame is highlighted

### Modify
- `RightSidebar.tsx`: add "Turn" tab trigger and content area, import TurntablePanel

### Remove
- Nothing

## Implementation Plan
1. Create `TurntablePanel.tsx` with 4 preview canvases, polling render loop, click-to-navigate logic
2. Add "Turn" tab to RightSidebar (both compact and full sidebar variants)
