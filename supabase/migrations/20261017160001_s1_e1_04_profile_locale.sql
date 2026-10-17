-- Migration: the interface language saved to the account (story S1-E1-04).
--
-- What it adds: profiles.locale, the language a signed-in person chose in the language
-- drop-down, and set_my_locale(), the one way to change it.
-- Rule: the interface opens in Romanian for everyone, whatever the device language; English is
-- one choice away (decided 17 Oct 2026, 11:48). So every account starts on 'ro'. A signed-in
-- choice is saved here and applies on every device (S1-E1-04 acceptance criteria).
-- Who calls it: src/features/language/api/profileLocale.ts reads the column through the existing
-- profiles_select_own policy and saves through set_my_locale().
-- Why a function and not an update policy: an update policy on profiles would let a person change
-- every column of their own row through the API (their year of birth too) unless column
-- privileges were also narrowed. The function changes the locale column only.
-- Personal data: a language preference; kept for the life of the account (docs/retention.md).

alter table public.profiles
  add column locale text not null default 'ro',
  -- The two interface languages (src/locales/ro and src/locales/en). A new interface language
  -- adds its code here in the migration that adds its locale files.
  add constraint profiles_locale_is_supported check (locale in ('ro', 'en'));

comment on column public.profiles.locale is
  'Interface language the person chose: ro (default for everyone, 17 Oct 2026) or en (S1-E1-04).';

/**
 * set_my_locale: saves the signed-in person's interface language on their own profile.
 * Input: new_locale, 'ro' or 'en'.
 * Returns: the saved language code.
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for any other code;
 *   no_data_found when the account has no live profile (deleted, or not created yet).
 * Who may call it: any signed-in person, read-only accounts included (a person waiting for a
 *   parent's consent can still pick their language). It only ever touches the caller's own row,
 *   so one person can never change another's language.
 * Where it fits: the language drop-down in the top bar and footer (LanguageSelect) calls it after
 *   switching the screen, so the next device the person signs in on opens in the same language.
 */
create or replace function public.set_my_locale(new_locale text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_locale text;
begin
  -- Step 1: only a signed-in person has a profile to save to.
  if (select auth.uid()) is null then
    raise exception 'Sign in to save your language to your account.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: refuse anything but the two interface languages, with a clear message (the table's
  -- check would refuse it too, but with a less helpful one).
  if new_locale is null or new_locale not in ('ro', 'en') then
    raise exception 'Unsupported interface language: %. Use ro or en.', coalesce(new_locale, 'null')
      using errcode = 'invalid_parameter_value';
  end if;

  -- Step 3: change the caller's own row only, and only while the account is live.
  update public.profiles
    set locale = new_locale
    where profiles.id = (select auth.uid()) and profiles.deleted_at is null
    returning profiles.locale into saved_locale;

  -- Step 4: no row means a deleted account or a sign-up whose profile doesn't exist yet.
  if saved_locale is null then
    raise exception 'This account has no profile to save the language to.'
      using errcode = 'no_data_found';
  end if;

  return saved_locale;
end;
$$;

comment on function public.set_my_locale(text) is
  'Saves the signed-in person''s interface language (ro or en) on their own profile (S1-E1-04).';

-- Signed-out visitors keep their choice on the device only; they can't call this at all.
revoke execute on function public.set_my_locale(text) from public, anon;
grant execute on function public.set_my_locale(text) to authenticated;
