-- Sign-up: every new Supabase Auth account gets its profile and its consent records in the same
-- transaction, or no account at all (story S1-E2-01; ADR 0002).
--
-- How it works: the sign-up form (src/features/auth/) sends its answers as Supabase sign-up data
-- (raw_user_meta_data): birth_year, invite_code, the IDs of the terms and privacy versions the
-- person accepted, and the interface language. When Supabase Auth inserts the new row into
-- auth.users, the trigger below checks them all. If anything is wrong it raises an error, Postgres
-- undoes the whole insert and Supabase answers "Database error saving new user": nothing about the
-- person is kept ("stores nothing", S1-E2-01 and S1-E11-17). The form asks check_invite() and the
-- legal versions first, so people see a plain message before it ever gets that far.
-- The user ID: Supabase Auth makes a random UUID and the same value becomes profiles.id; it never
-- changes (refuse_user_id_change, S1-E1-02) and is never reused (architecture 1.6).
-- Later stories add to this same trigger: S1-E2-02 (year of birth rules), S1-E2-10 (country).

/**
 * record_sign_up_consent: records that a new account accepted one legal version at sign-up.
 * Inputs: new_user_id; document_slug ('terms' or 'privacy'); accepted_version_id, the version the
 *   form showed. Returns: nothing.
 * Errors: raises check_violation when the version is missing or is not the current live version of
 *   that document (for example the terms changed while the form was open), so the person signs up
 *   only after seeing the text in force.
 */
create or replace function public.record_sign_up_consent(
  new_user_id uuid,
  document_slug text,
  accepted_version_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_published_at timestamptz;
  version_id uuid;
begin
  -- Step 1: the newest live version of the document (every language shares its go-live time).
  select max(versions.published_at) into current_published_at
  from public.legal_document_versions as versions
  join public.legal_documents as documents on documents.id = versions.document_id
  where documents.slug = document_slug and versions.published_at <= now();

  -- Step 2: the version the form showed must be one language of that newest version.
  select versions.id into version_id
  from public.legal_document_versions as versions
  join public.legal_documents as documents on documents.id = versions.document_id
  where documents.slug = document_slug
    and versions.id::text = accepted_version_id
    and versions.published_at = current_published_at;
  if version_id is null then
    raise exception 'Sign-up needs the current % to be accepted.', document_slug
      using errcode = 'check_violation';
  end if;

  -- Step 3: the record, with the time (consent is the legal basis, Q15; GDPR Art 7(1)).
  insert into public.consents (user_id, legal_document_version_id, method)
  values (new_user_id, version_id, 'sign_up');
end;
$$;

comment on function public.record_sign_up_consent(uuid, text, text) is
  'Internal: records a new account''s acceptance of the current version of one legal document (S1-E2-01).';

/**
 * sign_up_birth_year: reads and checks the year of birth from the sign-up data.
 * Input: sign_up_data (raw_user_meta_data). Returns: the year.
 * Errors: raises check_violation when the year is missing, not a whole number or outside
 *   1900 to this year. S1-E2-02 adds the age rules (under 13, adults_only).
 */
create or replace function public.sign_up_birth_year(sign_up_data jsonb)
returns smallint
language plpgsql
stable
set search_path = ''
as $$
declare
  year_text text := sign_up_data ->> 'birth_year';
  this_year integer := extract(year from (now() at time zone 'Europe/Bucharest'))::integer;
begin
  if year_text is null or year_text !~ '^\d{4}$'
    or year_text::integer not between 1900 and this_year then
    raise exception 'Sign-up needs a year of birth.' using errcode = 'check_violation';
  end if;
  return year_text::smallint;
end;
$$;

comment on function public.sign_up_birth_year(jsonb) is
  'Internal: the year of birth from the sign-up data, checked (S1-E2-01; S1-E2-02 adds the age rules).';

/**
 * handle_new_auth_user: the trigger that turns a new Supabase Auth account into a member.
 * Runs: after every insert into auth.users (sign-up with a password or a magic link).
 * Steps: skip the seed personas → take an invite place while invite_only is on → check the year of
 *   birth → create the profile → record the two consents.
 * Errors: any refusal raises, and the whole sign-up is undone (nothing stored).
 * Seed personas: supabase/seed.sql marks its synthetic accounts with app metadata
 *   {"seed_persona": true} and creates their profiles itself. App metadata can only be written by
 *   the server, never by the sign-up form, so nobody can use the mark to skip the checks.
 */
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sign_up_data jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_locale text := sign_up_data ->> 'locale';
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: the March test is invite only (decided 17 Oct 2026, 12:44).
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code');
  end if;

  -- Step 3: the profile, with the year of birth and the language the form was in (Romanian unless
  -- the person chose English, decided 17 Oct 2026, 11:48).
  insert into public.profiles (id, birth_year, locale)
  values (
    new.id,
    public.sign_up_birth_year(sign_up_data),
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end
  );

  -- Step 4: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new.id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new.id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: checks a sign-up and creates the profile and consents, or refuses it all (S1-E2-01).';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.record_sign_up_consent(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.sign_up_birth_year(jsonb) from public, anon, authenticated;
