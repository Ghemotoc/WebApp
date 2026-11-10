/*
 * Migration: the setting behind "a heads-up before sharing personal details" (bundle MUST-1,
 * part b; IDEA-20261108-6; story S1-E13-01, Settings › Privacy).
 *
 * How it works: before a comment, a forum post, a private message or a bio is sent, the browser
 * looks at the words for something shaped like a phone number, an email address, a street address
 * or a school's name, and asks "Post anyway?". The check runs only in the person's own browser:
 * nothing about it is saved, logged or sent to staff, and "Post anyway" saves the words as
 * written. It never blocks, so it isn't text moderation (CLAUDE.md rule 19). The database keeps
 * only whether the check is on for the person.
 * What it adds:
 * - profiles.checks_personal_details: null until the person chooses, which means on for under-18s
 *   and off for adults; an adult may turn it on, and it stays on for anyone under 18
 *   (IDEA-20261108-6: "a signed-in person under 18"; "Adults can switch it on too").
 * - my_privacy_settings() answers 'checks_personal_details'.
 * - set_checks_personal_details(should_check): saves an adult's choice; refuses to turn it off
 *   for someone under 18 (check_violation, hint under_18).
 * Who calls it: src/features/privacy/ (the switch in Settings › Privacy, and
 *   usePersonalDetailsCheck(), which the comment, forum post, message and bio boxes use).
 * Tests: supabase/tests/database/347-personal-details-check.test.sql.
 */

alter table public.profiles add column checks_personal_details boolean;
comment on column public.profiles.checks_personal_details is
  'Whether the browser asks "Post anyway?" before sending text that looks like contact details; null is the age default: on under 18, off for adults (MUST-1b).';

/*
 * checks_personal_details_of(profile): whether the check is on for this person. Inputs: the
 * profile row. Returns true for anyone under 18 (or of unknown age), else the person's own choice,
 * off when they never chose. Raises nothing. Used by my_privacy_settings().
 */
create function public.checks_personal_details_of(target public.profiles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.message_age_group(target) <> 'adult' or coalesce(target.checks_personal_details, false);
$$;
comment on function public.checks_personal_details_of(public.profiles) is
  'Internal: whether the personal details heads-up is on for this person (MUST-1b).';
revoke all on function public.checks_personal_details_of(public.profiles) from public, anon, authenticated;

/*
 * set_checks_personal_details(should_check): saves whether the signed-in person gets the heads-up.
 * Inputs: true or false. Returns nothing. Errors: insufficient_privilege (signed out),
 * check_violation for an empty choice, check_violation with hint under_18 when someone under 18
 * tries to turn it off. Called by Settings › Privacy.
 */
create function public.set_checks_personal_details(should_check boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  caller public.profiles;
begin
  -- Step 1: a choice is needed.
  if should_check is null then
    raise exception 'Choose whether to get the heads-up.' using errcode = 'check_violation';
  end if;
  -- Step 2: under 18 it stays on (IDEA-20261108-6).
  select * into caller from public.profiles where profiles.id = caller_id;
  if not should_check and public.message_age_group(caller) <> 'adult' then
    raise exception 'Under 18, the heads-up stays on.' using errcode = 'check_violation', hint = 'under_18';
  end if;
  -- Step 3: save it.
  update public.profiles set checks_personal_details = should_check where profiles.id = caller_id;
end;
$$;
comment on function public.set_checks_personal_details(boolean) is
  'Saves whether the signed-in person gets the personal details heads-up; stays on under 18 (MUST-1b).';
revoke all on function public.set_checks_personal_details(boolean) from public, anon;
grant execute on function public.set_checks_personal_details(boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.my_privacy_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select jsonb_build_object(
    'profile_audience', public.profile_audience_of(profiles),
    'library_audience', profiles.library_visible_to,
    'shows_online_status', profiles.shows_online_status,
    'message_audience', public.message_audience_of(profiles),
    'is_under_18', public.message_age_group(profiles) <> 'adult',
    'suggest_me', coalesce(public.suggests_me(profiles.id), false),
    'parent_spotlight', case
      when public.age_band_of(profiles.id) <> '13_to_15' then 'not_needed'
      when public.has_spotlight_consent(profiles.id) then 'agreed'
      when exists (select 1 from public.parental_consents
                   where parental_consents.user_id = profiles.id and parental_consents.status = 'agreed'
                     and parental_consents.spotlight_requested_at is not null
                     and parental_consents.spotlight_requested_at
                         > coalesce(parental_consents.spotlight_withdrawn_at, '-infinity')) then 'asked'
      else 'none'
    end,
    'can_ask_parent', public.age_band_of(profiles.id) = '13_to_15' and public.has_parental_consent(profiles.id),
    'shows_reader_level', profiles.shows_reader_level,
    -- MUST-1b: whether the browser asks "Post anyway?" before sending what looks like contact details.
    'checks_personal_details', public.checks_personal_details_of(profiles))
  from public.profiles where profiles.id = public.require_live_profile();
$$;
