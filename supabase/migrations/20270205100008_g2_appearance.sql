/*
 * Migration: a member's look follows them to every device (bundle G2 THEMES; the liquid glass
 * redesign Robert approved on 7 Nov 2026, 19:51 UTC; handoff doc "Design tokens and themes",
 * section "Themes: members choose their look").
 *
 * What it adds:
 * - three columns on profiles, the member's Settings › Appearance choices:
 *   look           one of the six year-round themes (Lilac mist is the default);
 *   colour_mode    light, night or device ("Match my device", the default, as before);
 *   seasonal_looks whether the winter, spring, summer and autumn looks may switch on by themselves
 *                  (off unless the member turns it on);
 *   appearance_saved_at  when the member last saved these choices; null until they first do. A
 *                  member who never chose keeps whatever each device shows (its own footer choice,
 *                  or the device's dark mode), instead of every device being reset to the defaults
 *                  at sign-in;
 * - set_my_appearance(), the one way to change them, on the caller's own row only;
 * - the public setting seasonal_look_dates: when each seasonal look shows (the canvas's
 *   "Website themes" board: Winter 8 Jan to the end of February, Spring March to May, Summer
 *   June to August, Autumn September to November). Staff edit it in Website content › Seasonal
 *   looks (bundle G12); until then it changes by migration.
 * Not personal in any sensitive way: a colour preference. It is in "Download my data" already,
 * because that export copies the whole profile row (S1-E13-02).
 * RLS: profiles keeps its policies. The member reads the new columns through profiles_select_own
 * (the table's select grant to authenticated already covers new columns); nobody writes them
 * except through set_my_appearance(), which updates only auth.uid()'s own live row.
 * Who calls it: src/features/theme/api/appearance.ts (Settings › Appearance and the footer's
 * night switch). Tests: supabase/tests/database/311-appearance.test.sql.
 */

/* ---------- The member's choices ---------- */

-- Step 1: the columns, with the defaults every existing member gets (the look they see today).
alter table public.profiles
  add column look text not null default 'lilac',
  add column colour_mode text not null default 'device',
  add column seasonal_looks boolean not null default false,
  add column appearance_saved_at timestamptz;

-- Step 2: only the known values (the handoff's six year-round themes and three modes).
alter table public.profiles
  add constraint profiles_look_known
    check (look in ('lilac', 'sorbet', 'seaglass', 'pistachio', 'candy', 'tmc')),
  add constraint profiles_colour_mode_known
    check (colour_mode in ('light', 'night', 'device'));

comment on column public.profiles.look is
  'The member''s year-round theme (Settings › Appearance; bundle G2): lilac (default), sorbet, seaglass, pistachio, candy or tmc. Night mode looks the same with every theme.';
comment on column public.profiles.colour_mode is
  'Light, night or device (Match my device, the default) (Settings › Appearance and the footer; bundle G2).';
comment on column public.profiles.appearance_saved_at is
  'When the member last saved look, colour_mode and seasonal_looks; null until they first do, so devices keep their own choice (bundle G2).';
comment on column public.profiles.seasonal_looks is
  'Whether the seasonal looks switch on by themselves in their weeks (seasonal_look_dates); off unless the member turns it on (bundle G2).';

/* ---------- Saving them ---------- */

/**
 * set_my_appearance: saves the signed-in member's look, mode and seasonal switch on their own
 *   profile, so every device they sign in on shows the same (bundle G2).
 * Inputs: new_look (lilac, sorbet, seaglass, pistachio, candy or tmc), new_colour_mode (light,
 *   night or device), new_seasonal_looks (true or false).
 * Returns: the three saved values as JSON ({look, colour_mode, seasonal_looks}).
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for an unknown look or
 *   mode, or a missing value; no_data_found when the account has no live profile.
 * Called by: src/features/theme/api/appearance.ts (saveMyAppearance).
 */
create function public.set_my_appearance(
  new_look text,
  new_colour_mode text,
  new_seasonal_looks boolean
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

  -- Step 3: change the caller's own row only, and only while the account is live.
  update public.profiles
    set look = new_look, colour_mode = new_colour_mode, seasonal_looks = new_seasonal_looks,
        appearance_saved_at = now()
    where profiles.id = (select auth.uid()) and profiles.deleted_at is null
    returning * into saved;

  -- Step 4: no row means a deleted account or a sign-up whose profile doesn't exist yet.
  if saved.id is null then
    raise exception 'This account has no profile to save the look to.'
      using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('look', saved.look, 'colour_mode', saved.colour_mode,
    'seasonal_looks', saved.seasonal_looks);
end;
$$;
comment on function public.set_my_appearance(text, text, boolean) is
  'Saves the signed-in member''s look, mode and seasonal switch on their own profile (bundle G2).';

-- Signed-out visitors keep their choice on the device only; they can't call this at all.
revoke execute on function public.set_my_appearance(text, text, boolean) from public, anon;
grant execute on function public.set_my_appearance(text, text, boolean) to authenticated;

/* ---------- When each seasonal look shows ---------- */

-- Month-day windows, in order; a window may cross the new year (from later than to). Read by
-- src/lib/theme.ts (seasonalLookOn) through usePublicSettings, like every public setting.
insert into public.settings (key, value, is_public, description) values
  ('seasonal_look_dates',
   '[{"look": "winter", "from": "01-08", "to": "02-29"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}, {"look": "autumn", "from": "09-01", "to": "11-30"}]'::jsonb,
   true,
   'When each seasonal look shows, for members who turned Seasonal themes on (canvas "Website themes", 7 Nov 2026). Month-day, inclusive; edited in Website content › Seasonal looks from bundle G12.');
