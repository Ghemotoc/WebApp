/*
 * Migration: any picture, never a real person (bundle PICTURES-1; Robert, 7 Nov 2026, Builder
 * thread: "It can be pictures of things outside like buildings and so on, character pictures if
 * they are drawn and so on, but it shouldn't be real people").
 *
 * This replaces the 2 Nov 2026 rule "drawings and illustrations only, no photos" (migration
 * 20261220100001_admin2_e1_picture_rules.sql). Two settings change; no table, policy or function
 * changes, so the RLS and grants stay as they are.
 * - picture_allowed_kinds: the kinds every upload screen lists in its "i" tooltip
 *   (PictureRulesNote). It gains photos of places and things; drawings now say "drawn characters"
 *   and illustrations "vectors" in the interface text.
 * - picture_reject_reasons: "a photograph" is no longer a reason to reject a picture, so it leaves
 *   the moderator's list. Its label stays in the locale files, because pictures rejected before
 *   today still show it in their history. "A real person" and "a celebrity" stay.
 * Unchanged on purpose: sexual pictures are allowed only as drawings in 18+ stories (2 Nov 2026,
 * brief section 2), so "a photographic sexual image" stays a reason.
 * Who reads the settings: PictureRulesNote through get_client_config() (public), and
 * admin_reject_picture() / admin_picture_reject_reasons() (staff).
 * Tests: supabase/tests/database/247-picture-rules.test.sql and 248-pictures-to-check.test.sql.
 */

-- Step 1: the allowed kinds, photos of places and things added (keys are interface text keys:
-- pictures.rules.kinds.<key> in the ro and en common.json files).
update public.settings
set value = '["drawing", "illustration", "photo_of_places_and_things", "non_photographic_ai"]'::jsonb,
    description = 'The kinds of picture anyone may upload; every upload screen lists them in its info tooltip. Any picture, photos of places and things included, but never a real person or a celebrity (Robert, 7 Nov 2026; replaces "drawings only, no photos" of 2 Nov 2026).'
where key = 'picture_allowed_kinds';

-- Step 2: "a photograph" is no longer a reason to reject a picture.
update public.settings
set value = '["photographic_sexual_image", "real_person", "celebrity", "sexual_image_of_minor", "gore", "hate", "other"]'::jsonb,
    description = 'What a rejected picture showed: the choices on Moderation › Pictures to check (Robert, 2 Nov 2026, 08:21; "a photograph" removed 7 Nov 2026, when photos of places and things became allowed). Labels are interface text (moderation.pictures.reasons).'
where key = 'picture_reject_reasons';
