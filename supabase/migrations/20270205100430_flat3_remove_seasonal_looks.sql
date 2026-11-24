/*
 * Migration: remove the seasonal themes (flat themes bundle, part 3; Robert's brand answers,
 * 23 Nov 2026: seasonal themes removed, so the six year-round themes are the only looks).
 * What it does:
 * - drops the staff tool that changed the seasonal weeks, admin_set_seasonal_look_dates(), and its
 *   helper seasonal_window_problem() (bundle G12a);
 * - deletes the public setting seasonal_look_dates (bundle G2), which nothing reads any more;
 * - swaps set_my_appearance() for a version without the seasonal switch: look, mode, and the two
 *   optional comfort switches (Less motion, High contrast);
 * - drops profiles.seasonal_looks, the member's "seasonal themes" switch.
 * picture_needs_person(), which the G12a migration also changed, stays as it is.
 * Personal data: one less preference on the profile; nothing new is stored. docs/retention.md drops
 * the column.
 * RLS: profiles keeps its policies; settings keeps its policies (one row fewer).
 * Who calls it: src/features/theme/api/appearance.ts (Settings › Appearance).
 * Tests: supabase/tests/database/311-appearance.test.sql (the new save and the removed column) and
 * 352-seasonal-looks-staff-uploads.test.sql (the staff tool and the setting are gone).
 */

/* ---------- The staff tool for the seasonal weeks ---------- */

-- Step 1: the staff function first, because it calls the helper.
drop function public.admin_set_seasonal_look_dates(jsonb);
drop function public.seasonal_window_problem(jsonb);

-- Step 2: the weeks themselves. Earlier changes stay in the audit log (it is append-only).
delete from public.settings where key = 'seasonal_look_dates';

/* ---------- Saving the look ---------- */

-- Step 3: the five-input version goes. A new version with the same name and fewer inputs would
-- make a short call ambiguous if both stayed.
drop function public.set_my_appearance(text, text, boolean, boolean, boolean);

/**
 * set_my_appearance: saves the signed-in member's look, mode, "Less motion" switch and "High
 *   contrast" switch on their own profile, so every device they sign in on shows the same (bundle
 *   G2; less motion added in MOTION-1, high contrast in CONTRAST-1, the seasonal switch removed in
 *   the flat themes bundle, part 3).
 * Inputs: new_look (lilac, sorbet, seaglass, pistachio, candy or tmc), new_colour_mode (light,
 *   night or device), new_less_motion and new_high_contrast (each true, false, or left out to keep
 *   the saved value).
 * Returns: the four saved values as JSON ({look, colour_mode, less_motion, high_contrast}).
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for an unknown look or
 *   mode; no_data_found when the account has no live profile.
 * Called by: src/features/theme/api/appearance.ts (saveAccountAppearance).
 */
create function public.set_my_appearance(
  new_look text,
  new_colour_mode text,
  new_less_motion boolean default null,
  new_high_contrast boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.profiles;
begin
  -- Step 1: only a signed-in person has a profile to save to.
  if (select auth.uid()) is null then
    raise exception 'Sign in to save your look to your account.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: refuse unknown values with a plain message (the checks would too, less helpfully).
  if new_look is null or new_look not in ('lilac', 'sorbet', 'seaglass', 'pistachio', 'candy', 'tmc') then
    raise exception 'Unknown theme: %.', coalesce(new_look, 'none')
      using errcode = 'invalid_parameter_value';
  end if;
  if new_colour_mode is null or new_colour_mode not in ('light', 'night', 'device') then
    raise exception 'Unknown mode: %. Use light, night or device.', coalesce(new_colour_mode, 'none')
      using errcode = 'invalid_parameter_value';
  end if;

  -- Step 3: change the caller's own row only, and only while the account is live. A call that
  -- leaves new_less_motion or new_high_contrast out keeps the saved value.
  update public.profiles
    set look = new_look, colour_mode = new_colour_mode,
        less_motion = coalesce(new_less_motion, profiles.less_motion),
        high_contrast = coalesce(new_high_contrast, profiles.high_contrast),
        appearance_saved_at = now()
    where profiles.id = (select auth.uid()) and profiles.deleted_at is null
    returning * into saved;

  -- Step 4: no row means a deleted account or a sign-up whose profile doesn't exist yet.
  if saved.id is null then
    raise exception 'This account has no profile to save the look to.'
      using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('look', saved.look, 'colour_mode', saved.colour_mode,
    'less_motion', saved.less_motion, 'high_contrast', saved.high_contrast);
end;
$$;
comment on function public.set_my_appearance(text, text, boolean, boolean) is
  'Saves the signed-in member''s look, mode, Less motion switch and High contrast switch on their own profile (bundles G2, MOTION-1, CONTRAST-1 and the flat themes bundle).';

-- Signed-out visitors keep their choice on the device only; they can't call this at all.
revoke execute on function public.set_my_appearance(text, text, boolean, boolean) from public, anon;
grant execute on function public.set_my_appearance(text, text, boolean, boolean) to authenticated;

/* ---------- The member's switch ---------- */

-- Step 4: the column goes once nothing writes it.
alter table public.profiles drop column seasonal_looks;

comment on column public.profiles.appearance_saved_at is
  'When the member last saved look, colour_mode, less_motion or high_contrast; null until they first do, so devices keep their own choice (bundle G2).';
