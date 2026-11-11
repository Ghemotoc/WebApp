-- Migration: the colour of a member's initials bead, picked in Settings › Profile (bundle G11a,
-- liquid glass Account; the canvas's SettingsProfile board, "If you keep your initials").
--
-- Until now the bead's colour came only from the username (src/features/avatars/lib/
-- beadColours.ts). A member may now pick one of the same sixteen colours; with none picked the
-- username still decides, so nobody's bead changes until they choose.
--
-- What it adds:
--   profiles.initials_colour     one of the sixteen bead names, or null for "from the username"
--   initials_colour_names()      internal: the sixteen names, in the bead list's order
--   set_my_initials_colour()     the signed-in person picks a colour, or goes back to automatic
--   profile_avatar_look()        a profile's drawn avatar and initials colour in one read, for
--                                every round avatar (replaces two reads with one)
-- Who calls it: src/features/avatars/ (api/avatarRecipe.ts, InitialsColourSection).
-- Personal data: none new (a colour chosen for display, public like the avatar).
-- Tests: supabase/tests/database/351-initials-colour.test.sql.

/**
 * initials_colour_names: the sixteen bead colours a member may pick, in the same order as
 * beadColours.ts (the two lists must match; 351 checks the count, beadColours.test.ts the names).
 * Input: none. Returns: the names. Errors: none.
 */
create function public.initials_colour_names()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['plum', 'violet', 'ink', 'gold', 'blush', 'sky', 'sage', 'lilac', 'paper',
               'cobalt', 'forest', 'indigo', 'ember', 'berry', 'cherry', 'slate'];
$$;
comment on function public.initials_colour_names() is
  'Internal: the sixteen initials bead colours, in the order of beadColours.ts (G11a).';
revoke execute on function public.initials_colour_names() from public, anon, authenticated;

alter table public.profiles add column initials_colour text
  constraint profiles_initials_colour_known
  check (initials_colour is null or initials_colour = any (public.initials_colour_names()));
comment on column public.profiles.initials_colour is
  'The colour the member picked for their initials bead (one of initials_colour_names()); null means the colour comes from the username (G11a).';

/**
 * set_my_initials_colour: saves the colour of the signed-in person's initials bead.
 * Input: colour, one of initials_colour_names(), or null to let the username decide again.
 * Returns: the saved colour (or null).
 * Errors: insufficient_privilege for an account that may not change its look right now (the same
 *   rule as the drawn avatar, may_change_own_avatar()); check_violation with hint unknown_colour
 *   for any other name.
 * Where it fits: Settings › Profile, "If you keep your initials" (InitialsColourSection).
 */
create function public.set_my_initials_colour(colour text)
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
  -- Step 2: only one of the sixteen colours, or null.
  if colour is not null and not (colour = any (public.initials_colour_names())) then
    raise exception 'That colour isn''t one of the choices.' using errcode = 'check_violation', hint = 'unknown_colour';
  end if;
  -- Step 3: save it on the caller's own profile.
  update public.profiles set initials_colour = colour, updated_at = now()
  where profiles.id = (select auth.uid());
  return colour;
end;
$$;
comment on function public.set_my_initials_colour(text) is
  'Saves or clears the colour of the signed-in person''s initials bead (G11a).';
revoke execute on function public.set_my_initials_colour(text) from public, anon;
grant execute on function public.set_my_initials_colour(text) to authenticated;

/**
 * profile_avatar_look: what a round avatar needs for one profile: the drawn avatar's recipe and
 * the initials colour. Read by everyone, signed in or not, like profile_avatar_recipe().
 * Input: profile_handle, the username without "@".
 * Returns: {"recipe": … or null, "initials_colour": … or null}; null when there is no such live
 *   profile, or when moderation hid the profile from anyone but its owner (the bead then takes
 *   its colour from the username, as for anyone).
 * Errors: none.
 * Where it fits: useAvatarLook() → every PersonAvatar, ProfileAvatar and AvatarImage.
 */
create function public.profile_avatar_look(profile_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('recipe', profiles.avatar_recipe, 'initials_colour', profiles.initials_colour)
  from public.profiles
  where profiles.handle = profile_handle and profiles.deleted_at is null
    and (profiles.id = (select auth.uid()) or not public.is_moderated_away('profile', profiles.id));
$$;
comment on function public.profile_avatar_look(text) is
  'A profile''s drawn avatar and initials colour, or null (G11a; the same rule as profile_avatar_recipe()).';
revoke execute on function public.profile_avatar_look(text) from public;
grant execute on function public.profile_avatar_look(text) to anon, authenticated;
