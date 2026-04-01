# ICPixel — Landing Page Overlay

## Current State
The app opens directly into the editor (HomePage.tsx). There is no landing page. The theme toggle button sits at the bottom of the left sidebar (ToolPanel.tsx). Both win95 and dark themes are supported via next-themes.

## Requested Changes (Diff)

### Add
- `LandingPage.tsx` component: a full-screen overlay that renders on top of the editor on every app load. It shows the logo, SEO-optimized headline/description/feature list, and a "Launch Editor" button that dismisses it. The overlay respects the active theme (win95 = silver-grey classic dialog style; dark = dark UI style). The existing theme toggle button is replicated on the landing page so users can switch themes before entering.

### Modify
- `HomePage.tsx`: import and render `<LandingPage>` as an overlay on top of the existing editor layout. State: `showLanding` defaults to `true`, set to `false` when the user clicks Launch Editor.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/components/landing/LandingPage.tsx`
   - Full-screen fixed overlay (z-[2000]) so it sits above all HUD/dialogs
   - Renders a centered dialog/window that visually matches the active theme:
     - win95: `#c0c0c0` background, black text, raised/inset borders, system font
     - dark: dark card background, white text, standard borders
   - Content: logo (img /assets/logoicpixel.png), headline, subheadline, body paragraph, feature pill row, Launch Editor button
   - Theme toggle button (same logic as ToolPanel ThemeToggleButton) positioned top-right of the dialog
   - SEO: rich semantic HTML (h1, p, ul) so Google indexes the text even though it's a React component
2. Modify `HomePage.tsx` to mount `<LandingPage>` with `onDismiss` callback
