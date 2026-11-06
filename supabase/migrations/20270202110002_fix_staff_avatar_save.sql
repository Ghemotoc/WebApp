-- Migration: a staff account can save its own drawn avatar (Robert, 6 Nov 2026, 10:58 UTC: "the
-- avatar cannot be saved").
--
-- Why it failed: set_my_avatar_recipe() asked is_active_member(), and account_state() answers
-- 'staff_account' for anyone with a staff role (step 4: a staff account never writes as a member,
-- Q14a). That rule is about stories, comments and posts. An avatar is only the look beside the
-- username: staff show it in the admin site and in the audit trail, so they may set their own.
--
-- What it changes:
--   may_change_own_avatar()   new, internal: true for an active member or a staff account
--   set_my_avatar_recipe()    asks may_change_own_avatar() instead of is_active_member()
-- Everything else stays as it was: a banned, suspended, deleted or unconfirmed account still
-- can't save, and the recipe is checked by avatar_recipe_valid() as before.
-- Personal data: none new.

/**
 * may_change_own_avatar: may the signed-in person save or clear their own drawn avatar?
 * Input: none (the caller). Returns: true for an active member or a staff account; false when
 *   signed out, and for every other account state (banned, suspended, unconfirmed and so on).
 * Errors: none.
 * Where it fits: set_my_avatar_recipe() → this → account_state().
 */
create or replace function public.may_change_own_avatar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.account_state((select auth.uid())) in ('active', 'staff_account'),
    false
  );
$$;

comment on function public.may_change_own_avatar() is
  'Internal: true when the caller may save their own drawn avatar: an active member or a staff account (6 Nov 2026).';
revoke execute on function public.may_change_own_avatar() from public, anon, authenticated;

/**
 * set_my_avatar_recipe: saves the signed-in person's drawn avatar, or clears it.
 * Input: recipe, as avatar_recipe_valid() describes; null goes back to the initials.
 * Returns: the saved recipe (or null).
 * Errors: insufficient_privilege for an account that may not change its avatar right now (a ban,
 *   a suspension, an unconfirmed email and so on); check_violation with hint invalid_recipe for
 *   a recipe the builder couldn't have made.
 * Where it fits: Settings › Profile (src/features/avatars/api/avatarRecipe.ts).
 */
create or replace function public.set_my_avatar_recipe(recipe jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: an active member, or a staff account (6 Nov 2026: staff may set their own look).
  if not public.may_change_own_avatar() then
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
  'Saves or clears the signed-in person''s drawn avatar; staff accounts too since 6 Nov 2026 (ADMIN-2g).';
revoke execute on function public.set_my_avatar_recipe(jsonb) from public, anon;
grant execute on function public.set_my_avatar_recipe(jsonb) to authenticated;
