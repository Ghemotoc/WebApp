/*
 * Migration: the "High contrast" switch follows a member to every device (bundle CONTRAST-1;
 * Robert, 13 Nov 2026: "people should still be able to use the themes they like, but at high
 * contrast ... a clickable option ... in the settings", and his choice the same day: "Build, plain
 * white pages"; idea IDEA-20261113-14).
 *
 * Why: the pastel themes meet WCAG 2.2 AA (4.5:1 text). Some people need more (1.4.6 Contrast
 * (Enhanced), 7:1), and the device setting that asks for it is little known and often locked on
 * school or shared computers. A switch in Settings › Appearance puts the choice inside the app.
 *
 * What it adds:
 * - profiles.high_contrast: whether the member turned "High contrast" on (off by default). The
 *   device's own "more contrast" setting still counts by itself: either one is enough.
 * - set_my_appearance() gains a fifth, optional input, new_high_contrast. Left out (null), the
 *   saved value stays as it is, so a page loaded before this migration keeps working and never
 *   switches a member's choice off by accident (the same rule as new_less_motion, MOTION-1).
 * Personal data: a comfort preference, like the look. It can hint at low vision, so it is treated
 * as the rest of the profile is: read only by the member, never shown to anyone else, never used
 * for anything but drawing the page. It is in "Download my data" already, because that export
 * copies the whole profile row (S1-E13-02); docs/retention.md lists it.
 * RLS: profiles keeps its policies. The member reads the new column through profiles_select_own
 * (the table's select grant to authenticated already covers new columns); nobody writes it except
 * through set_my_appearance(), which updates only auth.uid()'s own live row.
 * Who calls it: src/features/theme/api/appearance.ts (Settings › Appearance).
 * Tests: supabase/tests/database/311-appearance.test.sql.
 */

/* ---------- The member's choice ---------- */

-- Step 1: the column; every existing member starts with the switch off (what they see today).
alter table public.profiles
  add column high_contrast boolean not null default false;

comment on column public.profiles.high_contrast is
  'Whether the member turned "High contrast" on in Settings › Appearance: plain white pages (black at night), darker text and edges, the theme kept in its deep accent (bundle CONTRAST-1). The device''s own contrast setting still counts by itself.';

/* ---------- Saving it ---------- */

-- Step 2: the four-input version goes; the five-input version below takes its calls too, because
-- its fourth and fifth inputs are optional. (Two versions side by side would make a shorter call
-- ambiguous.)
drop function public.set_my_appearance(text, text, boolean, boolean);

/**
 * set_my_appearance: saves the signed-in member's look, mode, seasonal switch, "Less motion"
 *   switch and "High contrast" switch on their own profile, so every device they sign in on shows
 *   the same (bundle G2; less motion added in MOTION-1, high contrast in CONTRAST-1).
 * Inputs: new_look (lilac, sorbet, seaglass, pistachio, candy or tmc), new_colour_mode (light,
 *   night or device), new_seasonal_looks (true or false), new_less_motion and new_high_contrast
 *   (each true, false, or left out to keep the saved value).
 * Returns: the five saved values as JSON ({look, colour_mode, seasonal_looks, less_motion,
 *   high_contrast}).
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for an unknown look or
 *   mode, or a missing value; no_data_found when the account has no live profile.
 * Called by: src/features/theme/api/appearance.ts (saveAccountAppearance).
 */
create function public.set_my_appearance(
  new_look text,
  new_colour_mode text,
  new_seasonal_looks boolean,
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
  if new_seasonal_looks is null then
    raise exception 'Say whether seasonal themes are on or off.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Step 3: change the caller's own row only, and only while the account is live. A call that
  -- leaves new_less_motion or new_high_contrast out keeps the saved value (an older page doesn't
  -- know the switch).
  update public.profiles
    set look = new_look, colour_mode = new_colour_mode, seasonal_looks = new_seasonal_looks,
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
    'seasonal_looks', saved.seasonal_looks, 'less_motion', saved.less_motion,
    'high_contrast', saved.high_contrast);
end;
$$;
comment on function public.set_my_appearance(text, text, boolean, boolean, boolean) is
  'Saves the signed-in member''s look, mode, seasonal switch, Less motion switch and High contrast switch on their own profile (bundles G2, MOTION-1 and CONTRAST-1).';

-- Signed-out visitors keep their choice on the device only; they can't call this at all.
revoke execute on function public.set_my_appearance(text, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_my_appearance(text, text, boolean, boolean, boolean) to authenticated;
