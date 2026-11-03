/*
 * Migration: the avatar builder (bundle ADMIN-2, part g; Robert's brief of 2 Nov 2026, section 7,
 * from his 08:36 message, and section 1: "Avatars can't be uploaded at all: they are made only
 * with the avatar builder or are the initials, so they need no moderation. Remove avatar upload
 * in part g.").
 *
 * What it does:
 *   1. profiles.avatar_recipe: a small JSON recipe (style, skin tone, head, hair colour,
 *      expression, facial hair, accessory, clothes colour, background) that the browser draws as
 *      SVG with DiceBear's Open Peeps art (CC0; docs/adr/0013-avatar-builder-art.md). Null means
 *      the initials avatar, the default. Nothing is uploaded, so there is no picture check.
 *      avatar_recipe_valid() checks the shape: only the known keys, colours as six hex digits and
 *      part names as short plain words, so a recipe can never carry markup into the SVG.
 *   2. set_my_avatar_recipe(): the person saves or clears their own recipe.
 *   3. profile_avatar_recipe(): the recipe of a profile, for everyone who sees the profile's name.
 *   4. Avatar uploads end: the avatars_insert_own storage policy goes, and no profile keeps an uploaded picture as its avatar any more.
 * The data export (my_data_export(), S1-E13-02) copies the whole profile row, so the recipe is in
 * it without a change.
 *
 * Who calls it: Supabase applies it in order. What reads it: Settings › Profile and every round
 * avatar (src/features/avatars/).
 */

/* ---------- 1. The recipe ---------- */

/**
 * avatar_recipe_valid: is this a recipe the builder could have made?
 * Input: recipe, a jsonb value (null counts as valid: it means the initials).
 * Returns: true for an object with exactly the recipe's keys, style 'open-peeps', version 1,
 *   colours as six lower-case hex digits and part names of 1 to 24 letters or digits.
 * Why so strict: the browser puts these values into an SVG; nothing else may get in.
 * Where it fits: the profiles_avatar_recipe_shape check and set_my_avatar_recipe().
 */
create or replace function public.avatar_recipe_valid(recipe jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select recipe is null or (
    jsonb_typeof(recipe) = 'object'
    -- Step 1: exactly these keys, no more and no fewer.
    and (select array_agg(key order by key) from jsonb_object_keys(recipe) as key)
      = array['accessory', 'background', 'clothes', 'expression', 'facialHair', 'hairColour',
              'head', 'skin', 'style', 'version']
    -- Step 2: the art and the recipe's version.
    and recipe ->> 'style' = 'open-peeps'
    and recipe -> 'version' = '1'::jsonb
    -- Step 3: colours are six hex digits.
    and coalesce(recipe ->> 'skin', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'hairColour', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'clothes', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'background', '') ~ '^[0-9a-f]{6}$'
    -- Step 4: parts are short plain words ('none' for no facial hair or accessory).
    and coalesce(recipe ->> 'head', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'expression', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'facialHair', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'accessory', '') ~ '^[A-Za-z0-9]{1,24}$'
  );
$$;

comment on function public.avatar_recipe_valid(jsonb) is
  'True for null or a recipe of the known shape: known keys, hex colours, plain part names (ADMIN-2g).';
grant execute on function public.avatar_recipe_valid(jsonb) to anon, authenticated;

alter table public.profiles add column avatar_recipe jsonb;
alter table public.profiles add constraint profiles_avatar_recipe_shape
  check (public.avatar_recipe_valid(avatar_recipe));
comment on column public.profiles.avatar_recipe is
  'The drawn avatar the person built (ADMIN-2g); null means the initials avatar. Never a picture.';

/* ---------- 2. Saving one's own ---------- */

/**
 * set_my_avatar_recipe: saves the signed-in person's drawn avatar, or clears it.
 * Input: recipe, as avatar_recipe_valid() describes; null goes back to the initials.
 * Returns: the saved recipe (or null).
 * Errors: insufficient_privilege for an account that may not change its profile right now (as
 *   for the bio); check_violation with hint invalid_recipe for anything else.
 * Where it fits: Settings › Profile (src/features/avatars/api/avatarRecipe.ts).
 */
create or replace function public.set_my_avatar_recipe(recipe jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: only an account that may write (architecture 1.7.8), like the bio.
  if not public.is_active_member() then
    raise exception 'Your account can''t change its profile right now.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only a recipe the builder could have made.
  if not public.avatar_recipe_valid(recipe) then
    raise exception 'That avatar can''t be saved.' using errcode = 'check_violation', hint = 'invalid_recipe';
  end if;
  -- Step 3: save it on the caller's own profile.
  update public.profiles set avatar_recipe = recipe where profiles.id = (select auth.uid());
  return recipe;
end;
$$;

comment on function public.set_my_avatar_recipe(jsonb) is
  'Saves or clears the signed-in person''s drawn avatar (ADMIN-2g).';
revoke execute on function public.set_my_avatar_recipe(jsonb) from public, anon;
grant execute on function public.set_my_avatar_recipe(jsonb) to authenticated;

/* ---------- 3. Reading a profile's ---------- */

/**
 * profile_avatar_recipe: the drawn avatar of a profile.
 * Input: profile_handle, the username without "@".
 * Returns: the recipe, or null for the initials: also for a deleted profile or one moderators
 *   hid or removed (a ban hides the profile, ADMIN-2f1), except to its owner. Never a user ID.
 * Why everyone may read it: it is drawn beside the username wherever the username shows, like
 *   the initials, and holds nothing about the person but the look they chose.
 * Where it fits: every round avatar (src/features/avatars/hooks/useAvatarRecipe.ts).
 */
create or replace function public.profile_avatar_recipe(profile_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.avatar_recipe
  from public.profiles
  where profiles.handle = profile_handle and profiles.deleted_at is null
    and (profiles.id = (select auth.uid()) or not public.is_moderated_away('profile', profiles.id));
$$;

comment on function public.profile_avatar_recipe(text) is
  'A profile''s drawn avatar, or null for the initials (ADMIN-2g).';
revoke execute on function public.profile_avatar_recipe(text) from public;
grant execute on function public.profile_avatar_recipe(text) to anon, authenticated;

/* ---------- 4. No more avatar uploads ---------- */

-- Robert, 2 Nov 2026, 08:41 to 08:50: avatars are built or initials only. Nobody can add a file
-- to the avatars bucket any more; files already there stay under the picture rules until the
-- retention jobs clear them, and no profile shows one.
-- avatar_upload_allowed() stays: signature pictures (FORUMS-2d) use the same file name rules.
drop policy if exists avatars_insert_own on storage.objects;
update public.profiles set avatar_picture_id = null where avatar_picture_id is not null;
