# ADMIN-2g plan: avatar builder (brief section 7, Robert 2 Nov 2026 08:36; uploads removed per 08:41 to 08:50)

## Choice of art
- DiceBear 9.4.2 (`@dicebear/core` MIT, published March 2026) with the **Open Peeps** style (`@dicebear/open-peeps`, art by Pablo Stanley, **CC0 1.0**: commercial use, no attribution needed).
- Why Open Peeps: CC0; the widest range of hair and head coverings (afro, bantu knots, cornrows, dreads, twists, hijab, turban, grey hair, shaved); skin tone, hair colour, facial hair, accessories (glasses), clothing colour, background. Eyes and mouth come together as one "expression" part.
- Rejected: Lorelei (CC0, separate eyes and mouth, but head only: no clothes), Micah and Personas (CC BY 4.0, attribution on every avatar), Avataaars (custom licence, not an open licence).
- ADR `docs/adr/00NN-avatar-builder-art.md` records it.

## Database (one migration)
- `profiles.avatar_recipe jsonb` (null = initials, the default). Check `avatar_recipe_valid(recipe)`: an object with exactly the allowed keys (`style`='open-peeps', `version`=1, `skin`, `head`, `hairColour`, `expression`, `facialHair` (or 'none'), `accessory` (or 'none'), `clothes`, `background`), each value from the lists (in SQL, mirroring src/features/avatars/lib/avatarOptions.ts; a Vitest test compares the two lists through the generated check).
- `set_my_avatar_recipe(recipe jsonb)` (null clears) — owner only, active or read-only accounts allowed (it is their own profile), refuses an invalid recipe (check_violation, hint `invalid_recipe`).
- `profile_avatar_recipe(handle)` — the recipe for anyone who may see the profile (respects blocks and `is_moderated_away('profile')`, like the public profile view); or add it to the public profile view if that's where the picture comes from.
- Remove uploads: `avatar_upload_allowed()` returns false; existing `avatar_picture_id` set to null; `profile_avatar_picture()` returns nothing for others; the avatars bucket keeps its old files until the retention sweep (or delete in the migration's storage step if simple).
- Data export: `to_jsonb(profiles)` already carries `avatar_recipe` (check `export_row_for_owner`).
- pgTAP: valid/invalid recipes, allowed/denied for set (own vs other, anon), read rules (blocked viewer sees none), uploads refused, export includes it.

## Front end
- New feature folder `src/features/avatars/` (README): `lib/avatarOptions.ts` (lists, skin tones from light to dark, no gendered default), `lib/drawAvatar.ts` (recipe → SVG data URI via createAvatar), `lib/randomRecipe.ts` (Surprise me), `api/avatarRecipe.ts`, `hooks/useAvatarRecipe.ts`, `hooks/useMyAvatarRecipe.ts`, components `AvatarDrawing` (img alt=""), `AvatarBuilderSection` (Settings › Profile: live preview, one labelled Select per part, Surprise me, Undo, Save, Use my initials), zod schema `src/schemas/avatarRecipe.ts`.
- `AvatarImage` draws the recipe when there is one (initials otherwise); `AvatarSettingsSection` (upload) removed from Settings.
- Locales: `avatars.*` in ro and en (option names too), admin-editable through interface text.
- e2e `e2e/avatar-builder.spec.ts`: build, Surprise me, Undo, save, shown on the profile; keyboard only; use initials again; axe; old avatar upload tests changed.
