-- "Accept before posting again": the account gate learns about legal versions (story S1-E14-01).
--
-- What it adds:
--   needs_legal_acceptance(user_id)   internal: has this person accepted every document that needs
--                                     it, at or after its latest important version?
--   account_state(user_id)            now answers legal_acceptance_required before active
--   my_legal_documents_to_accept()    the signed-in person's own list, for the "We've updated our
--                                     Terms" notice
--   accept_current_legal_versions()   records the signed-in person's acceptance
-- Rule (story S1-E14-01): "Given a material change, when a new version goes live, then signed-in
-- users see a notice and must accept before posting again." Reading never stops.
-- Who calls it: every write policy through is_active_member() (architecture 1.7.8), and the
-- Legal centre (src/features/legal/api/legalAcceptance.ts).

/**
 * latest_material_legal_version: the newest live version of a document that is an important change.
 * Input: target_document_id. Returns: its published_at time, or null when there is none.
 * Where it fits: needs_legal_acceptance() compares people's acceptances with this time.
 */
create or replace function public.latest_material_legal_version(target_document_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(versions.published_at)
  from public.legal_document_versions as versions
  where versions.document_id = target_document_id
    and versions.is_material
    and versions.published_at <= now();
$$;

comment on function public.latest_material_legal_version(uuid) is
  'Internal: when the newest live important version of a legal document went live (S1-E14-01).';

/**
 * legal_documents_to_accept: the documents a person still has to accept.
 * Input: target_user_id. Returns: one row per document that needs acceptance and whose latest
 *   important version the person hasn't accepted (accepting any language of that version, or of a
 *   later one, counts). Errors: none.
 * Where it fits: needs_legal_acceptance() and my_legal_documents_to_accept() share it.
 */
create or replace function public.legal_documents_to_accept(target_user_id uuid)
returns setof public.legal_documents
language sql
stable
security definer
set search_path = ''
as $$
  select documents.*
  from public.legal_documents as documents
  where documents.needs_acceptance
    and public.latest_material_legal_version(documents.id) is not null
    and not exists (
      select 1
      from public.consents
      join public.legal_document_versions as accepted
        on accepted.id = consents.legal_document_version_id
      where consents.user_id = target_user_id
        and accepted.document_id = documents.id
        and accepted.published_at >= public.latest_material_legal_version(documents.id)
    )
  order by documents.sort_order;
$$;

comment on function public.legal_documents_to_accept(uuid) is
  'Internal: the legal documents a person has not accepted since their latest important version (S1-E14-01).';

/**
 * needs_legal_acceptance: true when the person must accept a new version before writing again.
 * Input: target_user_id. Returns: a boolean. Where it fits: account_state() below.
 */
create or replace function public.needs_legal_acceptance(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.legal_documents_to_accept(target_user_id));
$$;

comment on function public.needs_legal_acceptance(uuid) is
  'Internal: true when a person must accept a new legal version before writing again (S1-E14-01).';

/**
 * account_state: why an account can or can't write, checked in this order:
 *   deleted (or no profile) → email_unconfirmed → age_check_failed → minor_not_admitted
 *   (adults_only on and under 18, or under 13) → awaiting_parental_consent (under 16) →
 *   age_check_pending (unless adults_only is on and the person is 18 or over by year) →
 *   legal_acceptance_required (a new important version of the terms or privacy notice is waiting,
 *   S1-E14-01) → active.
 * Decisions: the March test is invited adults only, and while adults_only is on an adult is
 * active once the email is confirmed (decided 17 Oct 2026, 12:44; the flag is a proposal).
 * Under-16s need a parent's consent (GDPR Art 8; decided 16 Oct 2026, Q15): until S1-E2-03 adds
 * the consent lookup, every under-16 stays read-only (the safe default).
 * Input: target_user_id. Returns: an account_status value. Errors: none.
 * Not callable by clients: it would reveal other people's age status (privacy).
 */
create or replace function public.account_state(target_user_id uuid)
returns public.account_status
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
  email_confirmed_on timestamptz;
  band public.age_band;
  adults_only boolean := public.is_feature_enabled('adults_only');
begin
  -- Step 1: no live profile, no account.
  select * into profile_row from public.profiles where profiles.id = target_user_id;
  if not found or profile_row.deleted_at is not null then
    return 'deleted';
  end if;

  -- Step 2: the email must be confirmed (S1-E2-01).
  select users.email_confirmed_at into email_confirmed_on
  from auth.users where users.id = target_user_id;
  if email_confirmed_on is null then
    return 'email_unconfirmed';
  end if;

  -- Step 3: the age rules (S1-E2-02, S1-E2-08, S1-E2-03).
  if profile_row.age_check_result = 'failed' then
    return 'age_check_failed';
  end if;
  band := public.age_band_from_birth(
    profile_row.birth_year,
    profile_row.birth_month,
    profile_row.age_check_result,
    (now() at time zone 'Europe/Bucharest')::date
  );
  if band = 'under_13' or (adults_only and band <> '18_plus') then
    return 'minor_not_admitted';
  end if;
  if band = '13_to_15' then
    return 'awaiting_parental_consent';
  end if;
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  -- Step 4: a new important version of the terms or privacy notice must be accepted (S1-E14-01).
  if public.needs_legal_acceptance(target_user_id) then
    return 'legal_acceptance_required';
  end if;

  return 'active';
end;
$$;

comment on function public.account_state(uuid) is
  'Internal: why an account can or cannot write; only active may write (architecture 1.7.8).';

/**
 * my_legal_documents_to_accept: the signed-in person's own list of documents to accept.
 * Returns: slug and title-free details (the screen shows the title in the person's language) of
 *   each document waiting, with the label of its current version. Signed out: no rows.
 * Who may call it: any signed-in person, read-only accounts included (anyone can be asked to
 *   accept). It only ever looks at the caller's own acceptances.
 * Where it fits: the "We've updated our Terms" notice (src/features/legal/).
 */
create or replace function public.my_legal_documents_to_accept()
returns table (document_slug text, version_label text, change_summary text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    documents.slug,
    current_version.version_label,
    current_version.change_summary
  from public.legal_documents_to_accept((select auth.uid())) as documents
  cross join lateral (
    select versions.version_label, versions.change_summary
    from public.legal_document_versions as versions
    where versions.document_id = documents.id and versions.published_at <= now()
    order by versions.published_at desc, versions.language = 'en' desc
    limit 1
  ) as current_version
  where (select auth.uid()) is not null
  order by documents.sort_order;
$$;

comment on function public.my_legal_documents_to_accept() is
  'The signed-in person''s legal documents waiting for acceptance (S1-E14-01).';

/**
 * accept_current_legal_versions: records that the signed-in person accepts the current version of
 * each document named, in the language they read it in.
 * Inputs: document_slugs, for example '{terms,privacy}'; reading_language, 'ro' or 'en' (when that
 *   language has no text, the English version is recorded).
 * Returns: how many acceptances were recorded.
 * Errors: insufficient_privilege when signed out or the account has no live profile;
 *   invalid_parameter_value for a document that doesn't need acceptance or doesn't exist.
 * Who may call it: any signed-in person, at any age: 16 and 17-year-olds accept without a parent
 *   (decided 17 Oct 2026, 10:23); under-16s also need a parent or guardian, which S1-E2-03 adds.
 */
create or replace function public.accept_current_legal_versions(
  document_slugs text[],
  reading_language text default 'ro'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  requested_slug text;
  version_id uuid;
  recorded_count integer := 0;
begin
  -- Step 1: only a signed-in person with a live profile can accept anything.
  if caller_id is null or not exists (
    select 1 from public.profiles where profiles.id = caller_id and profiles.deleted_at is null
  ) then
    raise exception 'Sign in to accept the terms.' using errcode = 'insufficient_privilege';
  end if;

  foreach requested_slug in array document_slugs loop
    -- Step 2: the current live version of that document, in the reading language if it exists.
    select versions.id into version_id
    from public.legal_document_versions as versions
    join public.legal_documents as documents on documents.id = versions.document_id
    where documents.slug = requested_slug and documents.needs_acceptance
      and versions.published_at <= now()
    order by versions.published_at desc, (versions.language = reading_language) desc,
      (versions.language = 'en') desc
    limit 1;
    if version_id is null then
      raise exception 'There is no document "%" to accept.', requested_slug
        using errcode = 'invalid_parameter_value';
    end if;

    -- Step 3: record the acceptance with the time (GDPR Art 7(1): we must be able to show it).
    insert into public.consents (user_id, legal_document_version_id, method)
    values (caller_id, version_id, 're_accept');
    recorded_count := recorded_count + 1;
  end loop;

  return recorded_count;
end;
$$;

comment on function public.accept_current_legal_versions(text[], text) is
  'Records the signed-in person''s acceptance of the current legal versions named (S1-E14-01).';

-- Internal helpers are not callable from the API; the two "my" functions are for signed-in people.
revoke execute on function public.latest_material_legal_version(uuid) from public, anon, authenticated;
revoke execute on function public.legal_documents_to_accept(uuid) from public, anon, authenticated;
revoke execute on function public.needs_legal_acceptance(uuid) from public, anon, authenticated;
revoke execute on function public.my_legal_documents_to_accept() from public, anon;
revoke execute on function public.accept_current_legal_versions(text[], text) from public, anon;
grant execute on function public.my_legal_documents_to_accept() to authenticated;
grant execute on function public.accept_current_legal_versions(text[], text) to authenticated;
