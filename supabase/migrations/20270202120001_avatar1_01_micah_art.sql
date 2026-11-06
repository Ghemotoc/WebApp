-- Migration: the drawn avatar moves to the Micah art (bundle AVATAR-1; Robert, 6 Nov 2026,
-- 11:03 to 11:16 UTC: "I would rather have a fully editable avatar"; he picked DiceBear's Micah
-- at 11:09, where every hairstyle takes any colour; ADR 0016 replaces ADR 0013).
--
-- What it changes:
--   avatar_recipe_valid()        a valid recipe is now style 'micah', version 1, with the Micah
--                                parts (hair, eyebrows, eyes, mouth, nose, facial hair, glasses,
--                                earrings, shirt) and five colours; the old Open Peeps shape is
--                                no longer valid
--   profiles.avatar_recipe       every saved Open Peeps recipe becomes the nearest Micah one:
--                                the same skin tone, hair colour, clothes colour and background,
--                                and the closest hairstyle, glasses and facial hair; nobody loses
--                                their avatar or has to build it again
--   micah_recipe_from_open_peeps() the conversion, kept for the tests; no app role may call it
-- set_my_avatar_recipe() and profile_avatar_recipe() are unchanged: they call
-- avatar_recipe_valid() and read the column.
-- Personal data: none new. A recipe is only the look a person chose.

/* ---------- 1. Let the old recipes go while they are converted ---------- */

alter table public.profiles drop constraint profiles_avatar_recipe_shape;

/* ---------- 2. The new shape ---------- */

/**
 * avatar_recipe_valid: is this a recipe the builder could have made?
 * Input: recipe, a jsonb value (null counts as valid: it means the initials).
 * Returns: true for an object with exactly the recipe's keys, style 'micah', version 1, colours
 *   as six lower-case hex digits and part names of 1 to 24 letters or digits.
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
      = array['background', 'earrings', 'extrasColour', 'eyebrows', 'eyes', 'facialHair',
              'glasses', 'hair', 'hairColour', 'mouth', 'nose', 'shirt', 'shirtColour', 'skin',
              'style', 'version']
    -- Step 2: the art and the recipe's version.
    and recipe ->> 'style' = 'micah'
    and recipe -> 'version' = '1'::jsonb
    -- Step 3: colours are six hex digits.
    and coalesce(recipe ->> 'skin', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'hairColour', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'extrasColour', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'shirtColour', '') ~ '^[0-9a-f]{6}$'
    and coalesce(recipe ->> 'background', '') ~ '^[0-9a-f]{6}$'
    -- Step 4: parts are short plain words ('none' for no glasses, earrings or facial hair).
    and coalesce(recipe ->> 'hair', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'eyebrows', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'eyes', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'mouth', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'nose', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'facialHair', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'glasses', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'earrings', '') ~ '^[A-Za-z0-9]{1,24}$'
    and coalesce(recipe ->> 'shirt', '') ~ '^[A-Za-z0-9]{1,24}$'
  );
$$;

comment on function public.avatar_recipe_valid(jsonb) is
  'True for null or a Micah recipe of the known shape: known keys, hex colours, plain part names (ADMIN-2g; AVATAR-1, 6 Nov 2026).';
grant execute on function public.avatar_recipe_valid(jsonb) to anon, authenticated;

/* ---------- 3. Every saved Open Peeps avatar becomes its nearest Micah one ---------- */

/**
 * micah_recipe_from_open_peeps: the nearest Micah recipe to a saved Open Peeps one.
 * Input: old, an Open Peeps recipe. Returns: a Micah recipe that avatar_recipe_valid() accepts.
 * The colours carry over as they are; the shapes map to the closest Micah part.
 * Where it fits: used by this migration; kept (nobody may call it) so the database tests can
 *   prove every old recipe converts to a valid new one.
 */
create function public.micah_recipe_from_open_peeps(old jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'style', 'micah',
    'version', 1,
    'skin', old ->> 'skin',
    -- Step 1: the closest hairstyle: shaved or bald, mohawk, long, fringe, covered, short.
    'hair', case
      when old ->> 'head' ~ '^(noHair|shaved)' then 'mrClean'
      when old ->> 'head' ~ '^mohawk' then 'mrT'
      when old ->> 'head' ~ '^(long|afro|dreads|twists|bantuKnots|cornrows|bun|buns|grayBun)' then 'full'
      when old ->> 'head' ~ '^(bangs|mediumBangs|medium)' then 'pixie'
      when old ->> 'head' in ('hijab', 'turban', 'hatBeanie', 'hatHip') then 'turban'
      when old ->> 'head' ~ '^(short|flatTop|pomp|grayShort)' then 'fonze'
      else 'dannyPhantom'
    end,
    'hairColour', old ->> 'hairColour',
    'eyebrows', 'up',
    'eyes', 'eyes',
    'mouth', 'smile',
    'nose', 'curve',
    -- Step 2: a moustache becomes stubble, any other facial hair a beard.
    'facialHair', case
      when old ->> 'facialHair' = 'none' then 'none'
      when old ->> 'facialHair' ~ '^moustache' then 'scruff'
      else 'beard'
    end,
    -- Step 3: any glasses or sunglasses become round glasses; an eyepatch has no match.
    'glasses', case when old ->> 'accessory' ~ '^(glasses|sunglasses)' then 'round' else 'none' end,
    'earrings', 'none',
    'extrasColour', '2c1b18',
    'shirt', 'crew',
    'shirtColour', old ->> 'clothes',
    'background', old ->> 'background'
  );
$$;

comment on function public.micah_recipe_from_open_peeps(jsonb) is
  'The nearest Micah recipe to an Open Peeps one; used once by the AVATAR-1 migration (6 Nov 2026).';
-- Only the migration (and the database tests, as the owner) use it; no app role may call it.
revoke execute on function public.micah_recipe_from_open_peeps(jsonb) from public, anon, authenticated;

update public.profiles
set avatar_recipe = public.micah_recipe_from_open_peeps(avatar_recipe)
where avatar_recipe ->> 'style' = 'open-peeps';

-- Anything else that is no longer valid (nothing should be) goes back to the initials.
update public.profiles
set avatar_recipe = null
where not public.avatar_recipe_valid(avatar_recipe);

/* ---------- 4. The check again ---------- */

alter table public.profiles add constraint profiles_avatar_recipe_shape
  check (public.avatar_recipe_valid(avatar_recipe));
