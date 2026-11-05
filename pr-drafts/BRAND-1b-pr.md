<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14e BRAND-1, part b of 2: the app now shows the logos and emblems staff upload in Staff › Website › Branding (part a, #342). On 4 Nov 2026 at 14:25 UTC Robert asked for light and dark theme logos and emblems, with the emblem as the browser tab icon and Nicole's cat as the placeholder. The request has no story issue.

## What changed

- **Top bar.** The product name is now a `BrandMark`:
  - the emblem for the current theme sits before the name (decorative, hidden from screen readers);
  - with no logo uploaded, the name shows as text, as before;
  - with a logo uploaded for a theme, that theme shows the logo picture instead, with the product name as its alt text.
- **Browser tab icon.** `index.html` now links the cat emblem (light and dark SVG, by the system colour scheme, plus a 32 px PNG for older browsers). `BrandTabIcon` swaps the links for the uploaded emblems once they are approved.
- **Where the pictures come from.** `fetchPublishedBrand()` reads `brand_assets_published()` (part a), which only returns pictures a moderator has approved, and signs each address for an hour. `useBrandAssets()` caches them and refreshes every 50 minutes, so an address never expires on screen. A failed read leaves the defaults up.
- **Light and night.** Two small classes in `index.css` (`tmc-light-only`, `tmc-night-only`) show each theme's picture only on its own theme.
- The README and `docs/code-tour.md` describe part b.

## Tests

- `BrandMark.test.tsx` (3 tests): the default shows the cat and the name once; a logo replaces the text on its own theme only; the emblems stay hidden from screen readers.
- `e2e/brand-assets.spec.ts` gains a step: after a moderator approves an uploaded emblem, a visitor on /discover sees it in the top bar and the tab icon points at it, while the night emblem stays the default.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 235 files, 1,472 tests passed.
- Database (`supabase test db`, after a reset): 200 files, 4,594 tests passed.
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (brand-assets, design-page, home, epic-s1-e1, staff-shell): 101 of 101 passed.
- After bringing in main (#343, shelf paging), the merge was clean; Prettier and `tsc -b` passed again.

## By hand

Nothing.

## Follow-ups

- SVG logos, once the picture check can read SVG files (from part a).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
