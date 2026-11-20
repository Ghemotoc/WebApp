-- Migration: the circle colour, seven colours from the cover palette (bundle CALM-3, the
-- simplified design; Robert, 20 Nov 2026, 12:12 UTC: "a member who keeps their initials gets a
-- plain coloured circle, its colour picked at random from the cover palette, and they can change
-- it"; handover "Build: handover for the simplified design", Step 4, Circle colour).
--
-- Until now a member could pick one of sixteen bead colours, and with none picked the colour came
-- from the username (bundle G11a). From now on:
--   - there are seven colours, the cover palette's plum, violet, gold, lilac, blush, sky and sage;
--   - every profile has one: a new member gets one at random when they join, and every profile
--     without one gets one now, so the column is never null;
--   - "from the username" goes as a choice: set_my_initials_colour() refuses null.
--
-- What it changes, in this order:
--   1. profiles.initials_colour: today's sixteen names mapped to the seven through
--      initials_colour_from_retired() (the old check is dropped first, then put back against the
--      new list);
--   2. initials_colour_names(): the seven names, in the order of beadColourNames;
--   3. random_initials_colour(): one of the seven at random, the column's default; every null is
--      filled and the column becomes not null;
--   4. set_my_initials_colour(): no longer accepts null.
-- Sign-up (create_profile_from_sign_up()) leaves the column out of its insert, so the default
-- picks the colour; 351-initials-colour.test.sql checks that a new profile gets one.
-- Who calls it: src/features/avatars/ (api/avatarRecipe.ts, InitialsColourSection).
-- Personal data: none new (a colour for display, public like the avatar).
-- Tests: supabase/tests/database/351-initials-colour.test.sql.

/* ---------- 1. Map today's names to the seven ---------- */

-- The old check allows only the sixteen names; drop it while the rows change.
alter table public.profiles drop constraint profiles_initials_colour_known;

/**
 * initials_colour_from_retired: the one of the seven that takes the place of a colour retired in
 * CALM-3 (handover Step 4): ink and berry are plum, indigo violet, ember gold, paper lilac, cherry
 * blush, cobalt and slate sky, forest sage. Any other name comes back unchanged.
 * Input: colour, a name from the old list of sixteen. Returns: a name. Errors: none.
 * Where it fits: the update just below; 351 checks the mapping.
 */
create function public.initials_colour_from_retired(colour text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case colour
    when 'ink' then 'plum'
    when 'berry' then 'plum'
    when 'indigo' then 'violet'
    when 'ember' then 'gold'
    when 'paper' then 'lilac'
    when 'cherry' then 'blush'
    when 'cobalt' then 'sky'
    when 'slate' then 'sky'
    when 'forest' then 'sage'
    else colour
  end;
$$;
comment on function public.initials_colour_from_retired(text) is
  'Internal: the circle colour that replaces one retired in CALM-3 (ink and berry plum, indigo violet, ember gold, paper lilac, cherry blush, cobalt and slate sky, forest sage).';
revoke execute on function public.initials_colour_from_retired(text) from public, anon, authenticated;

update public.profiles
set initials_colour = public.initials_colour_from_retired(initials_colour)
where initials_colour is not null;

/* ---------- 2. The seven names ---------- */

/**
 * initials_colour_names: the seven circle colours a member may pick, in the same order as
 * beadColourNames in src/features/avatars/lib/beadColours.ts (351 checks the count,
 * beadColours.test.ts the names).
 * Input: none. Returns: the names. Errors: none.
 * Where it fits: the column's check, set_my_initials_colour() and random_initials_colour().
 */
create or replace function public.initials_colour_names()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['plum', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage'];
$$;
comment on function public.initials_colour_names() is
  'Internal: the seven circle colours from the cover palette, in the order of beadColours.ts (CALM-3).';
revoke execute on function public.initials_colour_names() from public, anon, authenticated;

-- Put the check back against the seven names.
alter table public.profiles add constraint profiles_initials_colour_known
  check (initials_colour = any (public.initials_colour_names()));

/* ---------- 3. A colour for everyone ---------- */

/**
 * random_initials_colour: one of the seven circle colours, picked at random (Robert, 20 Nov 2026:
 * "its colour picked at random from the cover palette").
 * Input: none. Returns: a colour name. Errors: none.
 * Where it fits: the default of profiles.initials_colour, so every new profile gets a colour when
 * it is made, at sign-up or in the seed.
 */
create function public.random_initials_colour()
returns text
language sql
volatile
set search_path = ''
as $$
  -- floor(random() * 7) is 0 to 6; Postgres arrays count from 1.
  select (public.initials_colour_names())[1 + floor(random() * cardinality(public.initials_colour_names()))::integer];
$$;
comment on function public.random_initials_colour() is
  'Internal: one of the seven circle colours at random, the default of profiles.initials_colour (CALM-3).';
revoke execute on function public.random_initials_colour() from public, anon, authenticated;

alter table public.profiles alter column initials_colour set default public.random_initials_colour();

-- Every profile without a colour gets one now (staging holds only seed and demo accounts, so no
-- real member's circle changes), then the column may never be empty again.
update public.profiles set initials_colour = public.random_initials_colour() where initials_colour is null;
alter table public.profiles alter column initials_colour set not null;

comment on column public.profiles.initials_colour is
  'The colour of the circle behind the member''s initials (one of initials_colour_names()): picked at random on joining, changeable in Settings › Profile (CALM-3; replaces null for "from the username", G11a).';

/* ---------- 4. Picking a colour ---------- */

/**
 * set_my_initials_colour: saves the colour of the circle behind the signed-in person's initials.
 * Input: colour, one of initials_colour_names().
 * Returns: the saved colour.
 * Errors: insufficient_privilege for an account that may not change its look right now (the same
 *   rule as the drawn avatar, may_change_own_avatar()); check_violation with hint unknown_colour
 *   for null or any other name (null meant "from the username" until CALM-3; every profile now has
 *   a colour of its own).
 * Where it fits: Settings › Profile, Circle colour (InitialsColourSection).
 */
create or replace function public.set_my_initials_colour(colour text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the same people who may change their drawn avatar (active members and staff).
  if not public.may_change_own_avatar() then
    raise exception 'Your account can''t change its profile right now.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only one of the seven colours; null is no longer a choice (CALM-3).
  if colour is null or not (colour = any (public.initials_colour_names())) then
    raise exception 'That colour isn''t one of the choices.' using errcode = 'check_violation', hint = 'unknown_colour';
  end if;
  -- Step 3: save it on the caller's own profile.
  update public.profiles set initials_colour = colour, updated_at = now()
  where profiles.id = (select auth.uid());
  return colour;
end;
$$;
comment on function public.set_my_initials_colour(text) is
  'Saves the colour of the circle behind the signed-in person''s initials, one of seven (G11a; CALM-3).';
revoke execute on function public.set_my_initials_colour(text) from public, anon;
grant execute on function public.set_my_initials_colour(text) to authenticated;
