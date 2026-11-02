/*
 * Data requests: the parent's or guardian's path for under-16s (bundle ADMIN-2, part c3; story
 * S1-E11-09, part 09a, criterion 5 and "for a parent, a one-time link to the checked email
 * address"; screen 8.12; GDPR art. 8, 12(6) and 15; the Civil Code, art. 41).
 *
 * A request about someone under 16 that didn't come from their own signed-in account goes through
 * the parent or guardian recorded in the parental consent (S1-E2-03), checked the same way as a
 * person is checked: by a link to the address we already hold, never to one taken from the request.
 * How it works:
 * 1. Staff press "Ask the parent or guardian". Our server (server/data-request-parent.ts) makes a
 *    random token, signs "data-request-ask|<request id>|<token hash>" with the parental consent
 *    secret and calls admin_ask_data_request_parent(), which stores only the hash and answers the
 *    parent's address. The server emails the parent /data-request/parent#<token>. The signature
 *    means staff can't store a token of their own and answer for the parent.
 * 2. The parent opens the link signed out (data_request_parent_link()) and answers "we asked for
 *    it" or "we didn't" (answer_data_request_parent()). The request records the answer, when, and
 *    that the parent checked it (goes_to_parent): the method and the result (criterion 4).
 * 3. Staff build the copy as in part c2. On this path the person gets no notice and their Settings
 *    list doesn't show the files: the copy goes to the checked parent only. The server then signs
 *    a second token and admin_send_data_request_parent_copy() stores it; the parent is emailed a
 *    one-time link to the same page.
 * 4. The parent presses "Open the files" (open_data_request_parent_copy()). The first press starts
 *    one hour (proposal) in which policy exports_select_parent_link lets anyone holding the file's
 *    random name download it; after that hour the link says it was used. The files still go after
 *    seven days with the nightly clean-up (S1-E13-04).
 * Nothing about the parent is written to the audit log: their address stays in parental_consents.
 *
 * Who calls it: server/data-request-parent.ts (ask and send), src/features/data-requests (the
 * staff page and the parent's page). What it calls: parental_consent_is_signed(),
 * admin_data_request_target(), log_staff_action().
 */

/* ---------- 1. The request remembers the parent's path ---------- */

alter table public.data_requests
  -- True once staff asked the parent: the identity check and the copy go through them.
  add column goes_to_parent boolean not null default false,
  -- Only the SHA-256 of each link's token, so a database read never gives a link away.
  add column parent_check_token_hash text unique,
  add column parent_copy_token_hash text unique,
  add column parent_copy_sent_at timestamptz,
  -- The first time the parent opened the files; the link works for one hour from then.
  add column parent_copy_opened_at timestamptz,
  add constraint data_requests_parent_links_need_parent check (
    goes_to_parent or (parent_check_token_hash is null and parent_copy_token_hash is null));

comment on column public.data_requests.goes_to_parent is
  'True when the request goes through the under-16''s parent or guardian (S1-E11-09 criterion 5).';
comment on column public.data_requests.parent_copy_opened_at is
  'When the parent first opened the copy''s one-time link; it works for one hour from then (proposal).';

/* ---------- 2. Shared helpers ---------- */

/**
 * data_request_parent_is_signed: checks our server's signature on a parent link, made with the
 * parental consent secret: "data-request-<purpose>|<request id>|<token hash>". The purpose (ask or
 * copy) keeps a signature for one link from being used for the other, and the prefix keeps it
 * apart from the consent signatures ("consent|", "answer|").
 * Inputs: purpose, the request's ID, the token's SHA-256 (hex) and the signature.
 * Returns: true when it matches. Internal.
 */
create or replace function public.data_request_parent_is_signed(
  purpose text, target_request_id uuid, token_hash text, signature text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.parental_consent_is_signed(
    'data-request-' || purpose || '|' || target_request_id || '|' || lower(coalesce(token_hash, '')),
    signature);
$$;
comment on function public.data_request_parent_is_signed(text, uuid, text, text) is
  'Internal: checks our server''s signature on a data request link to a parent (S1-E11-09).';
revoke execute on function public.data_request_parent_is_signed(text, uuid, text, text) from public, anon, authenticated;

/**
 * data_request_parent_consent: the parent or guardian who agreed for this person and hasn't
 * withdrawn (S1-E2-03): the only address a link may go to.
 * Input: the person's user ID. Returns: the consent row, or an empty row. Internal.
 */
create or replace function public.data_request_parent_consent(person_id uuid)
returns public.parental_consents
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.parental_consents
  where parental_consents.user_id = person_id and parental_consents.status = 'agreed'
  order by parental_consents.decided_at desc nulls last
  limit 1;
$$;
comment on function public.data_request_parent_consent(uuid) is
  'Internal: the agreed parental consent a data request link goes to (S1-E11-09).';
revoke execute on function public.data_request_parent_consent(uuid) from public, anon, authenticated;

/**
 * data_request_parent_email: what our server needs to write to the parent.
 * Inputs: the request and the parent's consent. Returns: jsonb with parent_email, language,
 * handle, reference and request_type. Internal: the ask and send functions.
 */
create or replace function public.data_request_parent_email(
  request public.data_requests, consent public.parental_consents
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'parent_email', consent.parent_email,
    'language', consent.language,
    'handle', (select profiles.handle from public.profiles where profiles.id = request.user_id),
    'reference', request.reference,
    'request_type', request.request_type);
$$;
comment on function public.data_request_parent_email(public.data_requests, public.parental_consents) is
  'Internal: the details of an email to a parent about a data request (S1-E11-09).';
revoke execute on function public.data_request_parent_email(public.data_requests, public.parental_consents)
  from public, anon, authenticated;

/**
 * data_request_parent_copy_state: where a copy link stands: ready (not opened yet), open (within
 * the hour after the first opening), used (the hour is over) or expired (no file left).
 * Input: the request. Returns: text. Internal.
 */
create or replace function public.data_request_parent_copy_state(request public.data_requests)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.exports
                     where exports.data_request_id = request.id and exports.state = 'ready'
                       and exports.expires_at > now()) then 'expired'
    when request.parent_copy_opened_at is null then 'ready'
    when request.parent_copy_opened_at > now() - interval '1 hour' then 'open'
    else 'used'
  end;
$$;
comment on function public.data_request_parent_copy_state(public.data_requests) is
  'Internal: ready, open, used or expired, for a parent''s one-time copy link (S1-E11-09).';
revoke execute on function public.data_request_parent_copy_state(public.data_requests) from public, anon, authenticated;

/* ---------- 3. Staff ask the parent ---------- */

/**
 * admin_ask_data_request_parent: starts the parent's identity check for a request about an
 * under-16 that didn't come from their own account (S1-E11-09 criterion 5). Asking again sends a
 * new link; the old one stops working.
 * Inputs: target_request_id; the token's SHA-256 (hex) and our server's signature.
 * Returns: { parent_email, language, handle, reference, request_type } for the email.
 * Errors: as admin_data_request_target(); insufficient_privilege (hint unsigned) without our
 *   server's signature; check_violation with hint no_check_needed (made in the account),
 *   already_answered, not_under_16 or no_parent_on_record (no agreed consent to write to).
 * Where it fits: DataRequestIdentityPanel → useStaffDataRequest → POST
 *   /api/data-request-parent/ask → here.
 */
create or replace function public.admin_ask_data_request_parent(
  target_request_id uuid, token_hash text, signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
  consent public.parental_consents := public.data_request_parent_consent(request.user_id);
begin
  -- Step 1: only our server makes the link, so only the parent's inbox ever holds it.
  if not public.data_request_parent_is_signed('ask', request.id, token_hash, signature) then
    raise exception 'This request wasn''t signed by our server.'
      using errcode = 'insufficient_privilege', hint = 'unsigned';
  end if;
  -- Step 2: a check that is still open, about an under-16, with a parent on record.
  if request.identity = 'not_needed' then
    raise exception 'The request came from inside the account.' using errcode = 'check_violation', hint = 'no_check_needed';
  end if;
  if request.identity in ('confirmed', 'denied') then
    raise exception 'The check is already answered.' using errcode = 'check_violation', hint = 'already_answered';
  end if;
  if not public.data_request_person_is_under_16(request.user_id) then
    raise exception 'This person is 16 or over.' using errcode = 'check_violation', hint = 'not_under_16';
  end if;
  if consent.id is null then
    raise exception 'No parent or guardian agreed for this account.'
      using errcode = 'check_violation', hint = 'no_parent_on_record';
  end if;
  -- Step 3: the request goes through the parent; only the hash of the new link is kept.
  update public.data_requests
  set goes_to_parent = true, identity = 'asked', identity_asked_at = now(),
      parent_check_token_hash = lower(token_hash), handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id;
  perform public.log_staff_action('data_request.parent_asked', 'data_requests', request.id::text,
    request.user_id, null, jsonb_build_object('identity', request.identity),
    jsonb_build_object('identity', 'asked', 'method', 'parent_link'));
  return public.data_request_parent_email(request, consent);
end;
$$;
comment on function public.admin_ask_data_request_parent(uuid, text, text) is
  'Staff ask an under-16''s parent or guardian to confirm a data request, signed by our server (S1-E11-09).';
revoke execute on function public.admin_ask_data_request_parent(uuid, text, text) from public, anon;
grant execute on function public.admin_ask_data_request_parent(uuid, text, text) to authenticated;

/* ---------- 4. The parent's page ---------- */

/**
 * data_request_by_parent_token: the request a parent's link points to, locked for an answer.
 * Input: the raw token. Returns: the row, or an empty row; which link it is, the caller checks
 * by comparing the hash. Internal.
 */
create or replace function public.data_request_by_parent_token(raw_token text)
returns public.data_requests
language sql
security definer
set search_path = ''
as $$
  select * from public.data_requests
  where goes_to_parent
    and encode(extensions.digest(coalesce(raw_token, ''), 'sha256'), 'hex')
        in (parent_check_token_hash, parent_copy_token_hash)
  for update;
$$;
comment on function public.data_request_by_parent_token(text) is
  'Internal: finds a data request by a parent''s link token (S1-E11-09).';
revoke execute on function public.data_request_by_parent_token(text) from public, anon, authenticated;

/**
 * data_request_parent_link: what the parent's page shows, read with the link's token (the token is
 * the secret, so anyone holding the link may read this much). Never the user ID, the parent's
 * address or the child's email.
 * Input: the raw token.
 * Returns: { outcome: 'ok', link: 'check', language, handle, reference, request_type,
 *   received_on, identity } for the check link; { outcome: 'ok', link: 'copy', language, handle,
 *   reference, state, open_until, expires_at } for the copy link; { outcome: 'gone' } otherwise
 *   (an unknown or replaced link, or a check link on a closed request).
 * Where it fits: DataRequestParentPage → useParentLink → api/dataRequestParent.ts → here.
 */
create or replace function public.data_request_parent_link(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hash text := encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex');
  request public.data_requests;
  base jsonb;
begin
  -- Step 1: the request, and the language the parent agreed in.
  select * into request from public.data_requests
  where goes_to_parent and hash in (parent_check_token_hash, parent_copy_token_hash);
  if request.id is null or (hash = request.parent_check_token_hash and request.state = 'closed') then
    return jsonb_build_object('outcome', 'gone');
  end if;
  base := jsonb_build_object('outcome', 'ok',
    'language', coalesce((public.data_request_parent_consent(request.user_id)).language, 'ro'),
    'handle', (select profiles.handle from public.profiles where profiles.id = request.user_id),
    'reference', request.reference);
  -- Step 2: the check link asks "did you ask for this?"; the copy link offers the files.
  if hash = request.parent_check_token_hash then
    return base || jsonb_build_object('link', 'check', 'request_type', request.request_type,
      'received_on', request.received_on, 'identity', request.identity);
  end if;
  return base || jsonb_build_object('link', 'copy',
    'state', public.data_request_parent_copy_state(request),
    'open_until', request.parent_copy_opened_at + interval '1 hour',
    'expires_at', (select max(exports.expires_at) from public.exports
                   where exports.data_request_id = request.id and exports.state = 'ready'));
end;
$$;
comment on function public.data_request_parent_link(text) is
  'What a parent sees from a data request link, read with its token (S1-E11-09).';
revoke execute on function public.data_request_parent_link(text) from public;
grant execute on function public.data_request_parent_link(text) to anon, authenticated;

/**
 * answer_data_request_parent: the parent's answer from the check link: "we asked for it"
 * (confirmed) or "we didn't" (denied). The answer, its time and the method (goes_to_parent) are
 * kept on the request as the proof (criterion 4).
 * Inputs: the raw token; is_ours.
 * Returns: data_request_parent_link() after the answer, or { outcome: 'gone' } or
 *   { outcome: 'already_answered' }.
 * Where it fits: DataRequestParentCheck → useParentLink → here.
 */
create or replace function public.answer_data_request_parent(token text, is_ours boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.data_request_by_parent_token(token);
begin
  -- Step 1: a live check link on an open request.
  if request.id is null or request.state = 'closed'
     or request.parent_check_token_hash
        <> encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex') then
    return jsonb_build_object('outcome', 'gone');
  end if;
  if request.identity <> 'asked' or is_ours is null then
    return jsonb_build_object('outcome', 'already_answered');
  end if;
  -- Step 2: the answer.
  update public.data_requests
  set identity = case when is_ours then 'confirmed' else 'denied' end::public.data_request_identity,
      identity_answered_at = now()
  where data_requests.id = request.id;
  return public.data_request_parent_link(token);
end;
$$;
comment on function public.answer_data_request_parent(text, boolean) is
  'A parent''s or guardian''s answer to a data request check, from the link (S1-E11-09).';
revoke execute on function public.answer_data_request_parent(text, boolean) from public;
grant execute on function public.answer_data_request_parent(text, boolean) to anon, authenticated;

/* ---------- 5. Sending the copy to the parent ---------- */

/**
 * admin_send_data_request_parent_copy: after staff sent the copy (admin_finish_data_request_copy),
 * gives the parent a one-time link to it (criterion "for a parent, a one-time link to the checked
 * email address"). Sending again replaces the link and starts it afresh.
 * Inputs: target_request_id; the token's SHA-256 (hex) and our server's signature.
 * Returns: { parent_email, language, handle, reference, request_type, expires_at } for the email.
 * Errors: as admin_data_request_target(); insufficient_privilege (hint unsigned);
 *   check_violation with hint identity_not_checked (not the parent's path, or not confirmed),
 *   no_parent_on_record or not_found (no ready file).
 * Where it fits: useDataRequestCopy, right after the copy is sent → POST
 *   /api/data-request-parent/send → here.
 */
create or replace function public.admin_send_data_request_parent_copy(
  target_request_id uuid, token_hash text, signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
  consent public.parental_consents := public.data_request_parent_consent(request.user_id);
  expires timestamptz;
begin
  -- Step 1: our server's link, for a request the parent confirmed.
  if not public.data_request_parent_is_signed('copy', request.id, token_hash, signature) then
    raise exception 'This request wasn''t signed by our server.'
      using errcode = 'insufficient_privilege', hint = 'unsigned';
  end if;
  if not request.goes_to_parent or request.identity <> 'confirmed' then
    raise exception 'The parent hasn''t confirmed this request.'
      using errcode = 'check_violation', hint = 'identity_not_checked';
  end if;
  if consent.id is null then
    raise exception 'No parent or guardian agreed for this account.'
      using errcode = 'check_violation', hint = 'no_parent_on_record';
  end if;
  -- Step 2: a ready copy to point to.
  select max(exports.expires_at) into expires from public.exports
  where exports.data_request_id = request.id and exports.state = 'ready' and exports.expires_at > now();
  if expires is null then
    raise exception 'There is no copy to send.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  -- Step 3: the new link; the old one stops working.
  update public.data_requests
  set parent_copy_token_hash = lower(token_hash), parent_copy_sent_at = now(),
      parent_copy_opened_at = null, handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id;
  perform public.log_staff_action('data_request.parent_copy_link_sent', 'data_requests',
    request.id::text, request.user_id, null, null, jsonb_build_object('expires_at', expires));
  return public.data_request_parent_email(request, consent) || jsonb_build_object('expires_at', expires);
end;
$$;
comment on function public.admin_send_data_request_parent_copy(uuid, text, text) is
  'Staff send a parent the one-time link to a data request copy, signed by our server (S1-E11-09).';
revoke execute on function public.admin_send_data_request_parent_copy(uuid, text, text) from public, anon;
grant execute on function public.admin_send_data_request_parent_copy(uuid, text, text) to authenticated;

/**
 * open_data_request_parent_copy: the parent presses "Open the files". The first press starts the
 * link's one hour (proposal); pressing again within it gives the same files.
 * Input: the raw token.
 * Returns: { outcome: 'ok', open_until, files: [{display_name, file_name, file_size}] }, or
 *   { outcome: 'gone' }, { outcome: 'used' } or { outcome: 'expired' }.
 * Where it fits: DataRequestParentCopy → useParentLink → here; the browser then downloads each
 *   file through policy exports_select_parent_link.
 */
create or replace function public.open_data_request_parent_copy(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.data_request_by_parent_token(token);
  link_state text;
  opened timestamptz;
begin
  -- Step 1: a copy link that hasn't been used up.
  if request.id is null
     or request.parent_copy_token_hash is distinct from
        encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex') then
    return jsonb_build_object('outcome', 'gone');
  end if;
  link_state := public.data_request_parent_copy_state(request);
  if link_state in ('used', 'expired') then
    return jsonb_build_object('outcome', link_state);
  end if;
  -- Step 2: the first opening starts the hour.
  opened := coalesce(request.parent_copy_opened_at, now());
  update public.data_requests set parent_copy_opened_at = opened where data_requests.id = request.id;
  -- Step 3: the files, with the random names the browser downloads them by.
  return jsonb_build_object('outcome', 'ok', 'open_until', opened + interval '1 hour',
    'files', public.data_request_files_json(request.id, true));
end;
$$;
comment on function public.open_data_request_parent_copy(text) is
  'A parent opens a data request copy from the one-time link; the first opening starts one hour (S1-E11-09).';
revoke execute on function public.open_data_request_parent_copy(text) from public;
grant execute on function public.open_data_request_parent_copy(text) to anon, authenticated;

/**
 * export_parent_link_open_allowed: may this file be downloaded from a parent's link? Only a ready,
 * unexpired file of a parent's request, within the hour after the parent first opened the link.
 * The file's random name (a UUID) is the second key: only open_data_request_parent_copy() gives it.
 * Input: the path inside the bucket. Where it fits: the exports_select_parent_link policy.
 */
create or replace function public.export_parent_link_open_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exports
    join public.data_requests on data_requests.id = exports.data_request_id
    where exports.file_name = object_name
      and exports.kind = 'data_request'
      and exports.state = 'ready'
      and exports.expires_at > now()
      and data_requests.goes_to_parent
      and data_requests.parent_copy_opened_at > now() - interval '1 hour');
$$;
comment on function public.export_parent_link_open_allowed(text) is
  'True for a parent''s data request file within the hour after the one-time link was opened (S1-E11-09).';
revoke execute on function public.export_parent_link_open_allowed(text) from public;
grant execute on function public.export_parent_link_open_allowed(text) to anon, authenticated;

/**
 * Policy exports_select_parent_link (files): a parent or guardian downloads their child's data
 * request copy, signed out, within the hour after first opening the one-time link we emailed to
 * the address in the parental consent. Why: S1-E11-09 sends a parent "a one-time link to the
 * checked email address"; they have no account of their own.
 */
create policy exports_select_parent_link
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'exports' and public.export_parent_link_open_allowed(name));

comment on policy exports_select_parent_link on storage.objects is
  'Allows a parent to download a data request copy within an hour of opening the one-time link (S1-E11-09).';

/* ---------- 6. What changes in parts c1 and c2 ---------- */

/**
 * data_request_json: as in ADMIN-2c1, plus the parent's path: whether the request goes through
 * the parent, and when the copy link was sent and first opened.
 * Input: the row. Returns: jsonb. Internal: admin_data_requests() and admin_data_request().
 */
create or replace function public.data_request_json(request public.data_requests)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', request.id,
    'reference', request.reference,
    'user_id', request.user_id,
    'handle', (select profiles.handle from public.profiles where profiles.id = request.user_id),
    'is_under_16', public.data_request_person_is_under_16(request.user_id),
    'request_type', request.request_type,
    'channel', request.channel,
    'received_on', request.received_on,
    'due_on', request.due_on,
    'extended_to', request.extended_to,
    'extension_reason', request.extension_reason,
    'deadline', public.data_request_deadline(request),
    'urgency', public.data_request_urgency(request),
    'identity', request.identity,
    'identity_asked_at', request.identity_asked_at,
    'identity_answered_at', request.identity_answered_at,
    'goes_to_parent', request.goes_to_parent,
    'parent_copy_sent_at', request.parent_copy_sent_at,
    'parent_copy_opened_at', request.parent_copy_opened_at,
    'state', request.state,
    'outcome', request.outcome,
    'closed_at', request.closed_at,
    'note', request.note,
    'handled_by_handle', (select profiles.handle from public.profiles where profiles.id = request.handled_by_user_id),
    'created_at', request.created_at);
$$;

/**
 * admin_data_request_copy_target: as in ADMIN-2c2, except that a request about an under-16 from
 * outside their account may now get a copy once their parent or guardian confirmed it (part c3).
 * Input: target_request_id. Returns: the open request, locked.
 * Errors: as admin_data_request_target(); check_violation with hint not_a_copy, parent_needed
 *   (the parent hasn't been asked), identity_denied or identity_not_checked. Internal.
 */
create or replace function public.admin_data_request_copy_target(target_request_id uuid)
returns public.data_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
begin
  if request.request_type not in ('copy', 'move') then
    raise exception 'Only a request for a copy, or to move the data, gets a copy.'
      using errcode = 'check_violation', hint = 'not_a_copy';
  end if;
  -- An under-16's request from outside their own account goes through the parent (GDPR art. 8).
  if request.identity <> 'not_needed' and not request.goes_to_parent
     and public.data_request_person_is_under_16(request.user_id) then
    raise exception 'This person is under 16: the copy goes through their parent or guardian.'
      using errcode = 'check_violation', hint = 'parent_needed';
  end if;
  if request.identity = 'denied' then
    raise exception 'The person said this request wasn''t theirs.'
      using errcode = 'check_violation', hint = 'identity_denied';
  end if;
  if request.identity not in ('not_needed', 'confirmed') then
    raise exception 'Check the person''s identity first.'
      using errcode = 'check_violation', hint = 'identity_not_checked';
  end if;
  return request;
end;
$$;

/**
 * admin_finish_data_request_copy: as in ADMIN-2c2, except that on the parent's path the person
 * gets no notice: the copy goes only to the checked parent, through the one-time link that
 * admin_send_data_request_parent_copy() makes next (S1-E11-09 criterion 4: "nothing is ever sent
 * to any other address").
 * Input: target_request_id. Returns: the request as admin_data_request() gives it.
 * Errors: as admin_data_request_copy_target(); check_violation with hint not_found or no_file.
 */
create or replace function public.admin_finish_data_request_copy(target_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_copy_target(target_request_id);
  sent_files jsonb;
  expires timestamptz := now() + interval '7 days';
begin
  -- Step 1: a copy being built, and every one of its files really there.
  if not exists (select 1 from public.exports
                 where exports.data_request_id = request.id and exports.state = 'building') then
    raise exception 'No copy is being built.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  if exists (select 1 from public.exports
             where exports.data_request_id = request.id and exports.state = 'building'
               and not exists (select 1 from storage.objects
                               where objects.bucket_id = 'exports' and objects.name = exports.file_name)) then
    raise exception 'A file hasn''t arrived.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 2: an earlier copy for this request goes; its files go with the nightly sweep (S1-E13-04).
  delete from public.exports where exports.data_request_id = request.id and exports.state = 'ready';
  -- Step 3: ready for seven days, each size taken from storage, never from the browser.
  update public.exports
  set state = 'ready', ready_at = now(), expires_at = expires,
      file_size = (select (objects.metadata ->> 'size')::bigint from storage.objects
                   where objects.bucket_id = 'exports' and objects.name = exports.file_name)
  where exports.data_request_id = request.id and exports.state = 'building';
  -- Step 4: the log keeps which files were sent, never the files (criterion "a request is closed").
  select jsonb_agg(jsonb_build_object('name', exports.display_name, 'size', exports.file_size)
      order by exports.display_name)
    into sent_files from public.exports where exports.data_request_id = request.id;
  update public.data_requests
  set copies_sent = copies_sent || jsonb_build_array(jsonb_build_object(
        'sent_at', now(), 'expires_at', expires, 'files', sent_files)),
      handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id;
  perform public.log_staff_action('data_request.copy_sent', 'data_requests', request.id::text,
    request.user_id, null, null, jsonb_build_object('files', sent_files, 'expires_at', expires));
  -- Step 5: tell the person, unless the copy goes to their parent (part c3).
  if not request.goes_to_parent then
    perform public.notify(request.user_id, 'data_request_copy_ready', null,
      jsonb_build_object('data_request_id', request.id));
  end if;
  return public.admin_data_request(request.id);
end;
$$;

/**
 * my_data_requests: as in ADMIN-2c2, except on the parent's path (part c3): a copy sent to the
 * person's parent or guardian isn't listed (it went to the checked parent only), and a check
 * waiting for the parent shows as not asked, so the person isn't offered the answer.
 * Returns: JSON array, newest first. Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_data_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your requests.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'reference', requests.reference,
        'request_type', requests.request_type,
        'channel', requests.channel,
        'received_on', requests.received_on,
        'deadline', public.data_request_deadline(requests),
        'extension_reason', requests.extension_reason,
        -- The parent answers a check on their path, so the person isn't asked to.
        'identity', case when requests.goes_to_parent and requests.identity = 'asked'
                         then 'not_asked'::public.data_request_identity else requests.identity end,
        'state', requests.state,
        'files', case when requests.goes_to_parent then '[]'::jsonb
                      else public.data_request_files_json(requests.id, true) end)
      order by requests.received_on desc, requests.created_at desc)
    from public.data_requests as requests
    where requests.user_id = (select auth.uid())), '[]'::jsonb);
end;
$$;

/**
 * answer_data_request: as in ADMIN-2c1, except that a request going through the parent can't be
 * answered from the person's own account: the parent answers it from their link (part c3).
 * Input: request_reference ("D-000001"), is_mine. Returns: 'confirmed' or 'denied'.
 * Errors: insufficient_privilege when signed out; check_violation with hint no_such_request or
 *   not_waiting (nothing asked, already answered, closed, or the parent's to answer).
 */
create or replace function public.answer_data_request(request_reference text, is_mine boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests;
  answer public.data_request_identity := case when is_mine then 'confirmed' else 'denied' end;
begin
  -- Step 1: the signed-in person's own request, and only theirs.
  if (select auth.uid()) is null then
    raise exception 'Sign in to answer.' using errcode = 'insufficient_privilege';
  end if;
  select * into request from public.data_requests
  where data_requests.reference = request_reference and data_requests.user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'There is no such request.' using errcode = 'check_violation', hint = 'no_such_request';
  end if;
  -- Step 2: only while we are waiting for them, never for their parent (GDPR art. 8).
  if request.identity <> 'asked' or request.state <> 'open' or is_mine is null or request.goes_to_parent then
    raise exception 'We aren''t waiting for an answer.' using errcode = 'check_violation', hint = 'not_waiting';
  end if;
  -- Step 3: the answer, with the method and result in the log (art. 5(2)).
  update public.data_requests set identity = answer, identity_answered_at = now()
  where data_requests.id = request.id;
  insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, reason,
    before_values, after_values)
  values ((select auth.uid()), 'data_request.identity_answered', 'data_requests', request.id::text,
    request.user_id, null, jsonb_build_object('identity', 'asked'),
    jsonb_build_object('identity', answer, 'method', 'sign_in'));
  return answer::text;
end;
$$;
