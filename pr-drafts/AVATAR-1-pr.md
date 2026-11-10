<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle AVATAR-1). Follow-up to S1-E5-05 (avatars). Robert, 6 Nov 2026: "I don't like any of these avatars", chose DiceBear Micah, "ideally all take colour", and "let's credit the designer where we can and where we should"; editing "much easier, not with dropdowns".

## What changed

- **Micah art.** Drawn avatars use DiceBear's Micah style (CC BY 4.0), drawn close up. The designer is credited under the editor and inside every SVG (`AvatarArtCredit`, `drawAvatar.ts`).
- **A visual editor, no drop-downs.** Tabs of picture tiles for each part and colour swatches; every hairstyle takes any colour (`AvatarEditorTabs`, `AvatarPartTiles`, `AvatarColourSwatches`). A reusable `Tabs` component in `src/components/ui/` (PROFILE-1 uses it next).
- **Saved avatars move over.** Migration `20270202120001_avatar1_01_micah_art.sql` moves every saved Open Peeps recipe to the nearest Micah one; the recipe schema follows.
- **Docs.** ADR 0016 replaces ADR 0013; decisions, code tour and the avatars README updated. The third-party check knows the new package.

## How it was tested

- The full check list ran on the whole stack of the ten queued bundles (this one first): lint, typecheck, types and schema checks, 1,570 unit tests, 4,870 database tests (253 and 302 cover the move), the full e2e run (2,452 passed), i18n, migrations, build, bundle and third-party checks.
- The failures that run found were in later bundles and are fixed there; their checks were rerun and pass.

## By hand (staging)

- Nothing: the migration moves saved avatars when it reaches staging.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
