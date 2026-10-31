/*
 * Migration: parental consent for under-16s (story S1-E2-03; bundle ACCOUNTS-2, part c;
 * ADR 0011; GDPR art. 8: Romania's digital consent age is 16, and consent is our legal basis,
 * decided 16 Oct 2026, late evening, Q15).
 *
 * How it works, from the top:
 * - an under-16 first does the age check (account_state() now asks for it before the consent);
 * - then, while the parental_consent flag is on and no parent or guardian has agreed, the account
 *   is awaiting_parental_consent: read-only (criterion 1);
 * - the writer gives a parent's or guardian's email on /parent-consent. Our Pages Function makes
 *   a random token, keeps it out of the writer's hands and stores only its SHA-256 here through
 *   begin_parental_consent(), signed with the Vault secret parental_consent_secret; the parent
 *   gets the link by email;
 * - the parent opens the link: parental_consent_request(token) shows what the page needs, and
 *   answer_parental_consent() (signed again) records "agree", "refuse" or, later, "withdraw"
 *   (criteria 2, 3 and 5);
 * - staff can withdraw it for a parent who writes to us (admin_withdraw_parental_consent());
 * - no answer within 14 days: the nightly clean-up erases the account (criterion 4).
 * The flag stays as an emergency switch: turning it off is owner-only and logged (criterion 6).
 * How a parent or guardian is verified is OPEN for an avocat (rule 13): only the email and their
 * own statement are recorded.
 * Who calls it: server/parent-consent.ts, src/features/parent-consent/, the staff account page.
 */

/* ---------- The flag ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('parental_consent', true, false,
   'Under-16s need a parent''s or guardian''s consent before they can write (S1-E2-03; GDPR art. 8). An emergency switch only: turning it off is owner-only and logged.')
on conflict (key) do nothing;

/* ---------- The table ---------- */

create table public.parental_consents (
  id uuid primary key default gen_random_uuid(),
  -- The writer under 16 whose account it is (rule 15). Their rows go with the account.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Who was asked: the parent's or guardian's email, the email it was sent to (criterion 2).
  parent_email text not null,
  -- The language of the email and of the page the parent first sees.
  language text not null,
  -- Only the SHA-256 of the link's token, so a database read never gives the link away.
  token_hash text not null unique,
  -- waiting → agreed or refused; agreed → withdrawn; replaced when the writer sent a new email.
  status text not null default 'waiting',
  -- The parent ticked "I'm this child's parent or legal guardian" when agreeing.
  is_guardian_confirmed boolean not null default false,
  -- The privacy notice and terms versions the parent was shown when agreeing (criterion 2).
  privacy_version_id uuid references public.legal_document_versions (id),
  terms_version_id uuid references public.legal_document_versions (id),
  decided_at timestamptz,
  withdrawn_at timestamptz,
  -- 'parent' from the link, or 'staff' when a parent wrote to us (criterion 5).
  withdrawn_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parental_consents_status_is_known
    check (status in ('waiting', 'agreed', 'refused', 'withdrawn', 'replaced')),
  constraint parental_consents_language_is_known check (language in ('ro', 'en')),
  constraint parental_consents_email_looks_right
    check (length(parent_email) between 6 and 254 and parent_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint parental_consents_withdrawn_by_is_known
    check (withdrawn_by is null or withdrawn_by in ('parent', 'staff'))
);
comment on table public.parental_consents is
  'kind: user_action
A parent''s or guardian''s consent for a writer under 16 (S1-E2-03; GDPR art. 8): who was asked, when they answered, which notice versions they saw. Never the token itself.';

-- One live request per writer: a new email replaces the waiting one.
create unique index parental_consents_one_live
  on public.parental_consents (user_id) where status in ('waiting', 'agreed');
create index parental_consents_user_id on public.parental_consents (user_id);
create trigger parental_consents_set_updated_at
  before update on public.parental_consents
  for each row execute function public.set_updated_at();
alter table public.parental_consents enable row level security;

-- Who: the writer. Why: they see the email they gave and whether their parent answered (board
-- 2.4); the parent reads their side through parental_consent_request() with the link's token.
-- Nobody writes the table directly; the functions below do.
create policy parental_consents_select_own on public.parental_consents
  for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.parental_consents to authenticated;

/* ---------- Helpers ---------- */

/**
 * parental_consent_is_signed: true when our server signed the payload with the Vault secret
 * parental_consent_secret (the same value as Cloudflare's PARENTAL_CONSENT_SECRET).
 * Inputs: the payload text and its hex HMAC-SHA256. Returns: true or false; false when no secret
 * is set. Internal: begin_parental_consent() and answer_parental_consent().
 */
create or replace function public.parental_consent_is_signed(payload text, signature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets
  where name = 'parental_consent_secret';
  if secret is null or secret = '' or signature is null then
    return false;
  end if;
  return encode(extensions.hmac(payload, secret, 'sha256'), 'hex') = lower(signature);
end;
$$;
comment on function public.parental_consent_is_signed(text, text) is
  'Internal: checks our server''s signature on a parental consent write (S1-E2-03).';
revoke execute on function public.parental_consent_is_signed(text, text) from public, anon, authenticated;

/**
 * has_parental_consent: true when a parent or guardian agreed and hasn't withdrawn.
 * Input: the writer's user ID. Returns: true or false. Internal: account_state().
 */
create or replace function public.has_parental_consent(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.parental_consents
    where parental_consents.user_id = target_user_id and parental_consents.status = 'agreed');
$$;
comment on function public.has_parental_consent(uuid) is
  'Internal: whether a parent or guardian agreed for this writer (S1-E2-03).';
revoke execute on function public.has_parental_consent(uuid) from public, anon, authenticated;

/**
 * parental_consent_deadline: the day the account is erased if nobody agrees, 14 days after the age
 * check passed (or after sign-up, if that came later; canvas 2.4).
 * Input: the writer's user ID. Returns: the moment, or null for an unknown account.
 * Internal: the writer's page, the parent's page, the clean-up.
 */
create or replace function public.parental_consent_deadline(target_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(users.created_at, coalesce(profiles.age_checked_at, users.created_at))
    + interval '14 days'
  from public.profiles join auth.users on users.id = profiles.id
  where profiles.id = target_user_id;
$$;
comment on function public.parental_consent_deadline(uuid) is
  'Internal: when an under-16 account without consent is erased (S1-E2-03).';
revoke execute on function public.parental_consent_deadline(uuid) from public, anon, authenticated;

/**
 * latest_legal_version: the newest published version of one legal document in one language.
 * Inputs: the document's slug ('privacy', 'terms') and the language. Returns: the version's ID,
 * or null. Internal: the parent's page and the consent record.
 */
create or replace function public.latest_legal_version(document_slug text, wanted_language text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select versions.id from public.legal_document_versions as versions
  join public.legal_documents as documents on documents.id = versions.document_id
  where documents.slug = document_slug and versions.language = wanted_language
    and versions.published_at <= now()
  order by versions.published_at desc limit 1;
$$;
comment on function public.latest_legal_version(text, text) is
  'Internal: the newest published version of a legal document in a language (S1-E2-03).';
revoke execute on function public.latest_legal_version(text, text) from public, anon, authenticated;

/* ---------- The account gate ---------- */

/**
 * account_state: as in S1-E10-06, with two changes for S1-E2-03:
 * - an under-16 does the age check first, so age_check_pending comes before the consent step;
 * - awaiting_parental_consent only while the parental_consent flag is on and no parent or
 *   guardian has agreed (has_parental_consent()).
 * Input: the user ID. Returns: the account's status. Where it fits: every write policy, through
 * is_active_member().
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

  -- Step 3: a ban or a suspension stops every write (S1-E10-06; DSA art. 23).
  if (public.active_sanction(target_user_id, 'ban')).id is not null then
    return 'banned';
  end if;
  if (public.active_sanction(target_user_id, 'suspension')).id is not null then
    return 'suspended';
  end if;

  -- Step 4: a staff account never writes as a member; a writer account stays separate (Q14a).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    return 'staff_account';
  end if;

  -- Step 5: the age rules (S1-E2-02, S1-E2-08), the age check before a parent is asked.
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
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  -- Step 6: an under-16 needs a parent's or guardian's yes (S1-E2-03; GDPR art. 8).
  if band = '13_to_15' and public.is_feature_enabled('parental_consent')
     and not public.has_parental_consent(target_user_id) then
    return 'awaiting_parental_consent';
  end if;

  -- Step 7: a username, so what the person writes can be shown with a name (S1-E2-04).
  if profile_row.handle is null then
    return 'handle_missing';
  end if;

  -- Step 8: a new important version of the terms or privacy notice must be accepted (S1-E14-01).
  if public.needs_legal_acceptance(target_user_id) then
    return 'legal_acceptance_required';
  end if;

  return 'active';
end;
$$;

/* ---------- The writer's side ---------- */

/**
 * my_parental_consent: what /parent-consent shows the signed-in writer.
 * Returns: { outcome: 'ok', needs_consent, status (the latest request's, or null), parent_email,
 *   language, sent_at, decided_at, deadline, can_send } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out. Where it fits: the writer's page and the
 * notice in AppLayout (src/features/parent-consent/).
 */
create or replace function public.my_parental_consent()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  latest public.parental_consents;
  needs_consent boolean;
begin
  -- Step 1: signed in, with a live profile.
  if me is null then
    raise exception 'Sign in to ask a parent or guardian.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = me and deleted_at is null) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the latest request that still counts (a replaced one never does).
  select * into latest from public.parental_consents
  where parental_consents.user_id = me and parental_consents.status <> 'replaced'
  order by parental_consents.created_at desc limit 1;
  needs_consent := public.account_state(me) = 'awaiting_parental_consent';
  -- Step 3: the answer; a writer may send while consent is needed and nobody withdrew it.
  return jsonb_build_object(
    'outcome', 'ok',
    'needs_consent', needs_consent,
    'status', latest.status,
    'parent_email', latest.parent_email,
    'language', latest.language,
    'sent_at', latest.created_at,
    'decided_at', latest.decided_at,
    'deadline', public.parental_consent_deadline(me),
    'can_send', needs_consent and coalesce(latest.status, 'none') <> 'withdrawn');
end;
$$;
comment on function public.my_parental_consent() is
  'The signed-in writer''s parental consent: whether it is needed, the email asked and the deadline (S1-E2-03).';
revoke execute on function public.my_parental_consent() from public, anon;
grant execute on function public.my_parental_consent() to authenticated;

/**
 * begin_parental_consent: stores a new request for the signed-in writer, replacing a waiting one
 * (Send again, Change the email). Only our server can call it usefully: it made the token and
 * signs "consent|<user ID>|<email>|<language>|<token hash>" (criterion 1).
 * Inputs: the parent's email, the language, the token's SHA-256 (hex) and the signature.
 * Returns: { outcome: 'ok', handle, deadline } for the email, or { outcome: 'not_needed' }.
 * Errors: insufficient_privilege when signed out or unsigned; check_violation (hint own_email,
 *   too_soon) for the writer's own email or a second email within a minute.
 */
create or replace function public.begin_parental_consent(
  parent_email text,
  language text,
  token_hash text,
  signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  wanted_email text := lower(trim(begin_parental_consent.parent_email));
  waiting public.parental_consents;
begin
  -- Step 1: signed in, and the request came from our server.
  if me is null or not public.parental_consent_is_signed(
      'consent|' || me || '|' || wanted_email || '|' || begin_parental_consent.language || '|'
        || begin_parental_consent.token_hash, signature) then
    raise exception 'This request wasn''t signed by our server.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only while consent is needed and nobody withdrew it.
  if not coalesce((public.my_parental_consent() ->> 'can_send')::boolean, false) then
    return jsonb_build_object('outcome', 'not_needed');
  end if;
  -- Step 3: never the writer's own address, and no flood of emails to a parent.
  if exists (select 1 from auth.users where users.id = me and lower(users.email) = wanted_email) then
    raise exception 'That is your own email.' using errcode = 'check_violation', hint = 'own_email';
  end if;
  select * into waiting from public.parental_consents
  where parental_consents.user_id = me and parental_consents.status = 'waiting' for update;
  if waiting.created_at > now() - interval '1 minute' then
    raise exception 'Wait a minute before sending again.' using errcode = 'check_violation', hint = 'too_soon';
  end if;
  -- Step 4: the old link stops working, the new one counts.
  update public.parental_consents set status = 'replaced' where id = waiting.id;
  insert into public.parental_consents (user_id, parent_email, language, token_hash)
  values (me, wanted_email, begin_parental_consent.language, lower(begin_parental_consent.token_hash));
  return jsonb_build_object(
    'outcome', 'ok',
    'handle', (select handle from public.profiles where id = me),
    'deadline', public.parental_consent_deadline(me));
end;
$$;
comment on function public.begin_parental_consent(text, text, text, text) is
  'Stores a signed request to a parent or guardian for the signed-in writer (S1-E2-03).';
revoke execute on function public.begin_parental_consent(text, text, text, text) from public, anon;
grant execute on function public.begin_parental_consent(text, text, text, text) to authenticated;

/* ---------- The parent's side ---------- */

/**
 * parental_consent_by_token: the request a link's token points to, locked for an answer.
 * Input: the raw token. Returns: the row, or an empty row. Internal.
 */
create or replace function public.parental_consent_by_token(raw_token text)
returns public.parental_consents
language sql
security definer
set search_path = ''
as $$
  select * from public.parental_consents
  where token_hash = encode(extensions.digest(coalesce(raw_token, ''), 'sha256'), 'hex')
  for update;
$$;
comment on function public.parental_consent_by_token(text) is
  'Internal: finds a parental consent request by its link''s token (S1-E2-03).';
revoke execute on function public.parental_consent_by_token(text) from public, anon, authenticated;

/**
 * parental_consent_request: what the parent's page shows, read with the link's token (the token is
 * the secret, so anyone holding the link may read it; board 2.4).
 * Input: the raw token from the link.
 * Returns: { outcome: 'ok', status, language, writer_email, handle, birth_year, age_check_passed,
 *   deadline, decided_at, privacy_version, terms_version } or { outcome: 'gone' } for an unknown,
 *   replaced or erased request. Never the user ID.
 */
create or replace function public.parental_consent_request(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request public.parental_consents;
  writer public.profiles;
begin
  -- Step 1: the request, unless it was replaced or the account is gone.
  select * into request from public.parental_consents
  where token_hash = encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex');
  select * into writer from public.profiles where id = request.user_id and deleted_at is null;
  if request.id is null or request.status = 'replaced' or writer.id is null then
    return jsonb_build_object('outcome', 'gone');
  end if;
  -- Step 2: what the parent needs to decide (board 2.4).
  return jsonb_build_object(
    'outcome', 'ok',
    'status', request.status,
    'language', request.language,
    'writer_email', (select email from auth.users where id = writer.id),
    'handle', writer.handle,
    'birth_year', writer.birth_year,
    'age_check_passed', writer.age_check_result in ('13_or_over', '18_or_over'),
    'deadline', public.parental_consent_deadline(writer.id),
    'decided_at', request.decided_at,
    'privacy_version', (select version_label from public.legal_document_versions
      where id = public.latest_legal_version('privacy', request.language)),
    'terms_version', (select version_label from public.legal_document_versions
      where id = public.latest_legal_version('terms', request.language)));
end;
$$;
comment on function public.parental_consent_request(text) is
  'What a parent or guardian sees from the consent link, read with its token (S1-E2-03).';
revoke execute on function public.parental_consent_request(text) from public;
grant execute on function public.parental_consent_request(text) to anon, authenticated;

/**
 * parental_consent_agree: records a yes on a waiting request and tells the writer (criterion 2).
 * Input: the locked request and the page's language. Internal: answer_parental_consent().
 */
create or replace function public.parental_consent_agree(
  request public.parental_consents,
  page_language text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parental_consents
  set status = 'agreed', decided_at = now(), is_guardian_confirmed = true,
      privacy_version_id = public.latest_legal_version('privacy', page_language),
      terms_version_id = public.latest_legal_version('terms', page_language)
  where id = request.id;
  perform public.notify(request.user_id, 'parental_consent_agreed', null, '{}'::jsonb);
end;
$$;
comment on function public.parental_consent_agree(public.parental_consents, text) is
  'Internal: a parent''s or guardian''s yes (S1-E2-03).';
revoke execute on function public.parental_consent_agree(public.parental_consents, text) from public, anon, authenticated;

/**
 * answer_parental_consent: the parent's answer, from the link (criteria 2, 3 and 5). Only our
 * server signs "answer|<token hash>|<decision>", so the emails that follow always go.
 * Inputs: the raw token; 'agree', 'refuse' or 'withdraw'; the page's language; the signature.
 * Returns: { outcome: 'ok', decision, writer_email, writer_language, handle, parent_email,
 *   parent_language } so our server can write the emails, or { outcome: 'gone' } or
 *   { outcome: 'already_answered', status }.
 * Errors: insufficient_privilege when unsigned. A refusal erases the account's personal data at
 * once, after the writer's address has been read for the email that tells them.
 */
create or replace function public.answer_parental_consent(
  token text,
  decision text,
  page_language text,
  signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.parental_consents;
  answer jsonb;
begin
  -- Step 1: the request came through our server.
  if not public.parental_consent_is_signed('answer|'
      || encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex') || '|' || decision, signature) then
    raise exception 'This answer wasn''t signed by our server.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a live request; agree and refuse need a waiting one, withdraw an agreed one.
  request := public.parental_consent_by_token(token);
  if request.id is null or request.status = 'replaced'
     or exists (select 1 from public.profiles where id = request.user_id and deleted_at is not null) then
    return jsonb_build_object('outcome', 'gone');
  end if;
  if (decision in ('agree', 'refuse') and request.status <> 'waiting')
     or (decision = 'withdraw' and request.status <> 'agreed')
     or decision not in ('agree', 'refuse', 'withdraw') then
    return jsonb_build_object('outcome', 'already_answered', 'status', request.status);
  end if;
  -- Step 3: who to write to, read before a refusal erases the writer's address.
  select jsonb_build_object('outcome', 'ok', 'decision', decision, 'writer_email', users.email,
      'writer_language', coalesce(profiles.locale, 'ro'), 'handle', profiles.handle,
      'parent_email', request.parent_email, 'parent_language', request.language)
    into answer
  from public.profiles join auth.users on users.id = profiles.id
  where profiles.id = request.user_id;
  -- Step 4: the answer itself.
  if decision = 'agree' then
    perform public.parental_consent_agree(request, coalesce(nullif(page_language, ''), request.language));
  elsif decision = 'refuse' then
    update public.parental_consents set status = 'refused', decided_at = now() where id = request.id;
    perform public.erase_unchecked_account(request.user_id);
  else
    update public.parental_consents
    set status = 'withdrawn', withdrawn_at = now(), withdrawn_by = 'parent'
    where id = request.id;
    perform public.notify(request.user_id, 'parental_consent_withdrawn', null, '{}'::jsonb);
  end if;
  return answer;
end;
$$;
comment on function public.answer_parental_consent(text, text, text, text) is
  'A parent''s or guardian''s answer from the consent link, signed by our server (S1-E2-03).';
revoke execute on function public.answer_parental_consent(text, text, text, text) from public;
grant execute on function public.answer_parental_consent(text, text, text, text) to anon, authenticated;

/* ---------- Staff ---------- */

/**
 * admin_withdraw_parental_consent: withdraws a parent's consent for them, when they write to us
 * instead of using the link (criterion 5). The account goes read-only and the writer is told.
 * Inputs: the writer's user ID and the reason (for example "The mother wrote on 3 Nov").
 * Returns: true. Errors: insufficient_privilege (hint not_allowed) for anyone but owner, admin and
 *   moderator; check_violation (hint reason_missing, no_consent). Logged as
 *   parental_consent.withdrawn. Where it fits: Staff › Users › an account › Actions.
 */
create or replace function public.admin_withdraw_parental_consent(
  target_user_id uuid,
  reason_given text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent public.parental_consents;
begin
  if not public.staff_may('users', 'act') then
    raise exception 'Only the owner, admins and moderators can do this.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  if coalesce(trim(reason_given), '') = '' then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  select * into consent from public.parental_consents
  where user_id = target_user_id and status = 'agreed' for update;
  if consent.id is null then
    raise exception 'There is no consent to withdraw.' using errcode = 'check_violation', hint = 'no_consent';
  end if;
  update public.parental_consents
  set status = 'withdrawn', withdrawn_at = now(), withdrawn_by = 'staff'
  where id = consent.id;
  perform public.log_staff_action('parental_consent.withdrawn', 'parental_consents', consent.id::text,
    target_user_id, trim(reason_given), jsonb_build_object('status', 'agreed'),
    jsonb_build_object('status', 'withdrawn'));
  perform public.notify(target_user_id, 'parental_consent_withdrawn', null, '{}'::jsonb);
  return true;
end;
$$;
comment on function public.admin_withdraw_parental_consent(uuid, text) is
  'Withdraws a parent''s consent when they write to us; owner, admin and moderator; logged (S1-E2-03).';
revoke execute on function public.admin_withdraw_parental_consent(uuid, text) from public, anon;
grant execute on function public.admin_withdraw_parental_consent(uuid, text) to authenticated;

/**
 * admin_set_flag: as in S1-E11-03, except that turning parental_consent off is owner-only
 * (criterion 6): it is an emergency switch, and with it off under-16s write without a parent.
 * Inputs: flag_key; turn_on. Returns: the new state. Errors: insufficient_privilege; no_data_found
 * for an unknown flag. Logged as settings.flag. Where it fits: Staff › Settings.
 */
create or replace function public.admin_set_flag(flag_key text, turn_on boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_on boolean;
begin
  perform public.require_settings_staff();
  -- Step 1: the emergency switch needs the owner.
  if flag_key = 'parental_consent' and not turn_on and not public.is_staff('owner') then
    raise exception 'Only the owner can turn parental consent off.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the flag as it was, locked so two admins can't both change it at once.
  select is_enabled into was_on from public.feature_flags where key = flag_key for update;
  if was_on is null then
    raise exception 'There is no flag called %.', flag_key using errcode = 'no_data_found';
  end if;
  -- Step 3: the change and its log line, in the same transaction.
  update public.feature_flags set is_enabled = turn_on where key = flag_key;
  perform public.log_staff_action('settings.flag', 'feature_flags', flag_key, null, null,
    jsonb_build_object('is_enabled', was_on), jsonb_build_object('is_enabled', turn_on));
  return turn_on;
end;
$$;

/* ---------- The clean-up ---------- */

/**
 * erase_unchecked_account: as in S1-E2-08b, and the parent's email goes too (it is a third
 * person's data, kept only while the request mattered).
 * Input: the user ID. Internal: the 14-day clean-up and a parent's refusal.
 */
create or replace function public.erase_unchecked_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the profile: deleted, with its personal details gone.
  update public.profiles
  set deleted_at = now(), birth_year = null, birth_month = null, pen_name = null, bio = '',
      birthday_day = null, birthday_month = null
  where profiles.id = target_user_id;
  -- Step 2: the age check and consent rows that only made sense while the account waited.
  delete from public.age_check_sessions where age_check_sessions.user_id = target_user_id;
  delete from public.age_check_attempts where age_check_attempts.user_id = target_user_id;
  delete from public.parental_consents where parental_consents.user_id = target_user_id;
  -- Step 3: the login: no email, no password, no way back in.
  delete from auth.refresh_tokens where refresh_tokens.user_id = target_user_id::text;
  delete from auth.sessions where sessions.user_id = target_user_id;
  delete from auth.identities where identities.user_id = target_user_id;
  update auth.users
  set email = target_user_id::text || '@deleted.invalid', encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = now() + interval '100 years'
  where users.id = target_user_id;
end;
$$;

/**
 * erase_unchecked_accounts: as in S1-E2-08b, plus under-16 accounts that no parent or guardian
 * agreed to within 14 days of the age check (criterion 4). An account whose consent was withdrawn
 * stays read-only and is not erased: what happens to it is on the lawyer's list (rule 13).
 * Returns: how many were erased. Runs daily (job erase-unchecked-accounts).
 */
create or replace function public.erase_unchecked_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  person record;
  erased integer := 0;
begin
  for person in
    select profiles.id from public.profiles
    join auth.users on users.id = profiles.id
    where profiles.deleted_at is null
      and coalesce(users.raw_app_meta_data ->> 'seed_persona', 'false') <> 'true'
      and (
        (users.created_at <= now() - interval '14 days'
          and public.account_state(profiles.id) in ('age_check_pending', 'age_check_failed')
          and not exists (
            select 1 from public.manual_age_checks
            where manual_age_checks.user_id = profiles.id and manual_age_checks.status = 'open'))
        or (public.parental_consent_deadline(profiles.id) <= now()
          and public.account_state(profiles.id) = 'awaiting_parental_consent'
          and not exists (
            select 1 from public.parental_consents
            where parental_consents.user_id = profiles.id and parental_consents.status = 'withdrawn')))
  loop
    perform public.erase_unchecked_account(person.id);
    erased := erased + 1;
  end loop;
  return erased;
end;
$$;

/* ---------- Notifications ---------- */

/**
 * notification_category: as in S1-E2-08b, with the two consent kinds under the team's chip
 * ("staff"): both come from us, not from another member.
 * Input: the kind. Returns: 'stories', 'follows', 'staff' or 'replies'. Internal: my_notifications().
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    else 'replies'
  end;
$$;
