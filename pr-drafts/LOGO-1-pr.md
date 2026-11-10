<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

This is bundle LOGO-1 from the builder's queue. On 6 Nov 2026 at 18:34 UTC Robert sent `cat-logo.svg`, the plum curled cat whose tail forms a "G", and said: "this should be the logo on both platforms, like for all the platforms."

## What changed

**The emblem**
- `public/brand/emblem-light.svg` and `emblem-dark.svg` are now Robert's cat. It's plum `#48125D` on light and `#E9DDF0` on night, so it reads on both themes.
- It's still the bundled default from BRAND-1, so staff can replace it in Staff › Website › Branding.

**Where it shows**
- **App header:** the cat sits beside the name, as before (BRAND-1b).
- **Staff header:** the cat now sits beside the name too. It used to show the name as text only.
- **Staff footer and the home page footer:** both now show the cat and the name through `BrandMark`.
- **Browser tab:** `tab-icon-32.png` is redrawn from the cat.
- **Home screen:** a new `apple-touch-icon.png` (180 px, white background) is linked from `index.html`, for when someone adds the site to a phone's home screen.

**Docs**
- `docs/decisions.md` logs the choice.
- The branding README, `docs/code-tour.md` and the doc comments no longer call the emblem "Nicole's cat, a placeholder".

## What it doesn't change
- **Story link previews** stay plain colour squares, as decided for link previews.
- **Emails** are plain text (`server/send-email.ts`), so there is nowhere to put a logo. Adding one would mean HTML emails, which are listed under Follow-ups.

## How it was tested
- `npm run checks` on this branch: RESULTS
- Screenshots at 390, 768 and 1440 px:
  - home header, home footer, staff header and staff footer all show the cat;
  - nothing scrolls sideways (overflow 0 px at every width).

## By hand (staging)
1. Open Staff › Website › Branding. If an emblem was uploaded there, clear it so the new default shows, unless you want to keep the upload.

## Follow-ups
- HTML emails with the logo, if you want the cat in emails too.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
