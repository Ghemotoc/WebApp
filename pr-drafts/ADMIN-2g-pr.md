<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 12 ADMIN-2, part g, from Robert's brief of 2 Nov 2026 (`bundle-12-pictures-bans-avatars-brief.md`, section 7 from his 08:36 message, and section 1: "Avatars can't be uploaded at all ... Remove avatar upload in part g.").

## What changed

- **Settings › Your avatar** replaces the profile picture upload. A live preview, one labelled drop-down per part (skin tone, hair or head covering, hair colour, expression, facial hair, glasses and more, clothes colour, background), "Surprise me", "Undo", "Save avatar" and "Use my initials instead". Every choice is named in words, everything works by keyboard and there is no free text. The initials stay the default; the builder starts with medium hair, a smile and no facial hair or accessory, so nothing assumes a gender. Nine skin tones, 47 heads (including hijab, turban, bantu knots, cornrows, locs and twists), 12 hair colours. en and ro, admin-editable through Interface text.
- **The art:** DiceBear 9.4.2 with the Open Peeps style (art CC0 by Pablo Stanley, code MIT), bundled and drawn in the browser as SVG. It loads only when the first avatar is drawn (about 260 KB), so the reader and other pages never download it. ADR 0013 records the licence and why Open Peeps over Lorelei (no clothes), Micah and Personas (CC BY) and Avataaars (own licence). The three hosts in its SVG metadata are added to the reviewed hosts (never loaded).
- **Database:** `profiles.avatar_recipe` with a shape check (`avatar_recipe_valid()`: only the known keys, hex colours and plain part names, so nothing but a look can reach the SVG), `set_my_avatar_recipe()` (accounts that may write, like the bio) and `profile_avatar_recipe()` (null for a hidden or banned profile, except to its owner). The recipe is in Download my data.
- **Uploads removed:** the `avatars` insert policy is dropped and no profile keeps an uploaded picture as its avatar. The profile header and message avatars now draw the recipe over the initials.
- **Records:** ADR 0013, decisions, retention (the recipe row), the privacy notice drafts (en and ro: the drawn avatar instead of a picture), code tour and a README for `src/features/avatars/`.

## How it was tested

- Database test 253 (17 tests): valid and invalid recipes (extra or missing key, a colour or part name carrying markup, another style); a member saves and clears their own; refused for an invalid recipe, a banned account and a signed-out visitor; anyone reads a profile's recipe, a banned profile's shows only to its owner; the recipe is in the data export. Test 164 now proves a profile picture can't be uploaded.
- Unit tests: every choice is named in both languages, the starting recipe is valid with no facial hair, Surprise me always makes a valid recipe, the drawing options draw exactly the chosen parts and fall back for a value the builder doesn't offer.
- e2e `e2e/avatar-builder.spec.ts`: build, undo, Surprise me and undo, save, the drawn avatar on the profile, back to the initials, no file field left; axe at 390, 768 and 1440 px, light and night, ro and en. `e2e/picture-check.spec.ts` now shows the picture check on a story cover. Checked by eye at 390 px (Settings and the profile).

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing to set. Profile pictures uploaded on staging before this stop showing; their files stay in the `avatars` bucket under the picture rules until the retention jobs clear them.

## Board mismatches

- Board 6.3 (Settings) still draws "Profile picture" with an upload field; the brief replaces it with the builder.

## Questions for Robert

None.

## Follow-ups

- The account button in the top bar still shows the initials; it could draw the avatar too.
- Our own doodle-style avatar parts can replace the Open Peeps art later (a new `style` in the recipe).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
