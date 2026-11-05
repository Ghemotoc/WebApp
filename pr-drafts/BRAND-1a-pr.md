<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14e BRAND-1, part a of 2: the place in the admin site where staff upload the logos and emblems. On 4 Nov 2026 at 14:25 UTC Robert asked for "space in the admin panel to add light theme and dark theme logos and emblems (emblems apply to favicon)", with Nicole's cat as the placeholder. This part builds the upload, the checks and the staff page. Part b puts the pictures in the top bar and the browser tab. The request has no story issue.

## What changed

- **Staff › Website › Branding** (`/staff/website/branding`), for the owner and admins only, as for the rest of the website.
  - Four slots, each on its own card:
    - Logo, light theme
    - Logo, night theme
    - Emblem, light theme
    - Emblem, night theme
  - Each card says where the picture shows and previews it on its theme's page colour.
  - "Upload a picture" and "Use the default".
  - An empty slot shows the default. For the emblem that is Nicole's cat, in `public/brand/` and coloured with each theme's heading colour. For the logo it is the name as text, as today.
- **Checks (CLAUDE.md rule 19).**
  - Every brand picture goes through the picture check.
  - A moderator then approves it, because the logo is on every screen for every age.
  - While a new picture waits, the slot keeps showing its earlier approved picture, or the default, so the logo never drops to the cat during moderation. The card says which one is showing.
- **Audit log.** Every choice and every "Use the default" is logged (`website.brand_asset_set`, `website.brand_asset_cleared`).
- **Database changes:**
  - New enum `brand_asset_slot`, and `picture_kind` gains `brand_asset`.
  - New private bucket `brand-assets` (PNG, WebP or JPEG, up to 2 MB), with three storage policies.
  - New table `brand_assets`: one row per slot, holding `picture_id`, `earlier_picture_id` and who chose it. It has RLS and one select policy for the owner and admins.
  - New functions `register_brand_picture()`, `admin_set_brand_asset()`, `admin_clear_brand_asset()`, `admin_brand_assets()` and `brand_assets_published()` (the public read part b uses), plus the internal `brand_shown_picture()` and `brand_slot_json()`.
  - `picture_needs_person()` now covers brand pictures.
- **Front end:**
  - A new feature folder, `src/features/branding/`, with its README.
  - `uploadBrandPicture()` in the pictures API.
  - The moderation queue labels the new picture kind as "Logo or emblem".
- `docs/code-tour.md` has a section on this part, and `docs/decisions.md` has a row for it.

## Builder's proposals (Robert can change them)

- Only the owner and admins upload, as for the rest of the website.
- A moderator approves every brand picture.
- A new picture waiting for approval leaves the earlier one up.
- Uploads take PNG, WebP or JPEG. SVG can't go through the picture check yet, so a vector logo is a follow-up.

## Tests

- `supabase/tests/database/290-brand-assets.test.sql` (24 tests) covers:
  - every policy, allowed and denied;
  - refusing an upload outside the slot folders, and a picture in the wrong slot;
  - the moderator hold;
  - the earlier picture staying up while a newer one waits, and coming back if moderation removes the newer one;
  - clearing a slot;
  - the audit log.
- `e2e/brand-assets.spec.ts` covers:
  - the defaults;
  - an upload waiting for a moderator, then showing once approved;
  - "Use the default";
  - a moderator being refused;
  - axe at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 234 files, 1,469 tests passed.
- Database (`supabase test db`, after a reset): 200 files, 4,594 tests passed, including the new `290-brand-assets` (24 tests).
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (brand-assets, landing-pictures-featured, seasonal-doodles, pictures-to-check): 45 of 45 passed.
- The first database run caught two guards, both fixed in this commit:
  - the table comment now starts with `kind: staff` (test 002);
  - test 021's list of tables a signed-out visitor reads now includes `brand_assets` (0 rows).

## By hand

Nothing.

## Follow-ups

- SVG logos, once the picture check can read SVG files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
