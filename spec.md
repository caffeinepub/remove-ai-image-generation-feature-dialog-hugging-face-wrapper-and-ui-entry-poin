# ICPixel

## Current State
- Multi-tab canvas editor with up to 2 tabs, each with independent ProjectState
- `HomePage` is mounted/unmounted by the router when navigating to/from `/profile`, destroying all tab state
- `MenuBarCloud.tsx` checks `result.__kind__ === "ok"` on backend save results, but backend returns standard Candid variants `{ ok: string }` or `{ err: string }` — `__kind__` is always undefined, so save success path never executes
- Both bugs cause perceived "save doesn't work" and "second canvas disappears"

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `App.tsx`: Stop using router to unmount/remount `HomePage`. Instead render both `HomePage` and `ProfilePage` always, show/hide with CSS (`display: none` / `display: flex`) based on current route. This preserves all editor state including tabs across navigation.
- `MenuBarCloud.tsx`: Fix `result.__kind__ === "ok"` → `'ok' in result` and `result.__kind__ === "err"` → `'err' in result` in `handleSaveAsConfirm`. Use `result.ok` for the project ID and `result.err` for the error message.

### Remove
- Nothing

## Implementation Plan
1. Modify `App.tsx` to keep both pages rendered simultaneously, switching visibility based on current path using `useRouterState` or `window.location.pathname`
2. Fix the Candid result variant checks in `MenuBarCloud.tsx` (`handleSaveAsConfirm` function)
3. Validate and build
