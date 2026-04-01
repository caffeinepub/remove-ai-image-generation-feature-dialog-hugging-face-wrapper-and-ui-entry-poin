# ICPixel — Full SEO Landing Page

## Current State
The landing page is a centered popup/modal overlay (`position: fixed`, backdrop blur) rendered inside `HomePage.tsx`. It appears over the editor on first load. This is not a real page — it's a dialog, invisible to search engine crawlers that can't execute JS, and structurally wrong for SEO.

## Requested Changes (Diff)

### Add
- New route `/` renders a full-page `LandingPage` component (no overlay, no backdrop)
- New route `/editor` renders the `HomePage` (pixel art editor)
- `LandingPage` component rebuilt as a complete scrollable page with: hero, features, use-cases, how-it-works, monetization note, CTA section, footer
- Semantic HTML structure (h1, h2, h3, p, ul, li) with SEO-optimized content
- Meta title and meta description in `index.html`
- Both dark and Win95 theme variants for the full-page layout
- Theme toggle button in the landing page header/nav area

### Modify
- `App.tsx`: add `/editor` route, keep `/profile` route; change `/` to render `LandingPage`
- `index.html`: update `<title>`, add `<meta name="description">`, add Open Graph tags
- `HomePage.tsx`: remove `showLanding` state and `LandingPage` import; always render the editor
- `LandingPage.tsx`: full rebuild as a full-page scrollable layout, not a modal

### Remove
- The modal/overlay wrapper (position fixed, backdrop, maxWidth dialog) from `LandingPage.tsx`
- `showLanding` boolean state from `HomePage.tsx`

## Implementation Plan
1. Update `index.html` with SEO meta tags
2. Add `/editor` route to `App.tsx`; `/` maps to new `LandingPage`, `/editor` maps to `HomePage`
3. Rebuild `LandingPage.tsx` as a full scrollable page — hero, features, use cases, how it works, monetization note, CTA, footer — both theme variants
4. Remove `showLanding` from `HomePage.tsx` and import of `LandingPage`
5. Validate and build
