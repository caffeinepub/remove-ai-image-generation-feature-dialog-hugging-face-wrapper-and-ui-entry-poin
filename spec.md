# ICPixel — Phase 5: Per-Tab Save/Load Integration

## Current State
- Each tab has its own `EditorRuntime` which stores `currentProjectId` and `currentProjectName` in its `ProjectState`
- `window.editor.currentProjectId / setCurrentProjectId / setCurrentProjectName` bridge points to the active tab's runtime and is updated on tab switch
- `MenuBarCloud.tsx` uses `window.editor.currentProjectId` for save/load — so it already operates on the active tab
- `TabBar.tsx` shows tab names with rename support but no unsaved indicator
- No `isDirty` state exists — no visual feedback when a tab has unsaved changes
- Tab names don't auto-update when a project is loaded or saved

## Requested Changes (Diff)

### Add
- `isDirty: boolean` field to `TabState` in `TabManager.ts`
- `projectId: string | null` and `projectName: string | null` fields to `TabState` (mirrors what's already in `EditorRuntime.ProjectState` — stored here for quick UI access without calling runtime)
- Unsaved indicator (small colored dot) on each tab in `TabBar.tsx` when `isDirty === true`
- `window.editor.markTabClean()` — called by `MenuBarCloud` after a successful save to clear the dirty flag on the active tab
- `window.editor.setActiveTabName(name)` — called by `MenuBarCloud` after save/load to sync the tab label to the project name

### Modify
- `HomePage.tsx`: listen to `layersVersion` changes (already tracked) — whenever it increments after initial mount, mark the active tab dirty. On tab switch, snapshot dirty state into the outgoing tab's `TabState`. On tab switch in, restore dirty state.
- `MenuBarCloud.tsx`: after successful save, call `window.editor.markTabClean()` and `window.editor.setActiveTabName(name)`. After successful load, call `window.editor.setActiveTabName(projectName)`.
- `TabBar.tsx`: accept `dirtyFlags: boolean[]` prop; show a small dot (●) next to the tab name when `dirtyFlags[index]` is true.

### Remove
- Nothing

## Implementation Plan
1. Update `TabManager.ts` — add `isDirty`, `projectId`, `projectName` to `TabState` and `createTab`
2. Update `TabBar.tsx` — accept `dirtyFlags` prop, show dot indicator
3. Update `HomePage.tsx`:
   - Initialize tabs with `isDirty: false, projectId: null, projectName: null`
   - Track `isDirty` for active tab: subscribe to `layersVersion` after initial load, set dirty; reset after save via `window.editor.markTabClean()`
   - On tab switch: snapshot `isDirty` into outgoing tab, restore from incoming tab
   - Expose `window.editor.markTabClean()` and `window.editor.setActiveTabName(name)` on the bridge
   - Pass `dirtyFlags` to `TabBar`
4. Update `MenuBarCloud.tsx`:
   - After `handleSave` and `handleSaveAsConfirm` success: call `window.editor.markTabClean?.()` and `window.editor.setActiveTabName?.(name)`
   - After `handleProjectLoaded` success: call `window.editor.setActiveTabName?.(projectName)`
