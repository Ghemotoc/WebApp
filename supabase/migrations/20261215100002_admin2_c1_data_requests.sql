/*
 * Data requests: the log staff keep of every request to see, move, correct or delete someone's
 * data, with its deadline, any extension and the identity check (bundle ADMIN-2, part c1; story
 * S1-E11-09, part 09a; screen 8.12; GDPR art. 12(3), 12(6), 15 to 17, 20 and 5(2)).
 *
 * What it adds:
 * 1. data_requests (kind: staff): one row per request, never deleted, so it is our proof (art.
 *    5(2)). Only support, admin and the owner read it (staff_may('data_requests')); moderators
 *    and content editors are refused (criterion "a moderator or a content editor").
 * 2. Staff functions: open a request for an account found by user ID, handle or email; list and
 *    open requests with their deadline (one month from receipt) and how close it is; extend by up
 *    to two more months within the first month, telling the person; ask the person to confirm the
 *    request was theirs; close it with what was done. Each writes the audit log.
 * 3. The person's side: my_data_requests() and answer_data_request(), so the signed-in account
 *    confirms (or denies) a request that didn't come from inside it. That sign-in is the identity
 *    check (criterion 4): nothing is ever sent to another address.
 * 4. Two notifications, always sent and emailed: data_request_confirm and data_request_extended.
 * Building and sending the copy, the parent's path for under-16s and the files are part c2.
 *
 * Who calls it: src/features/staff (Staff › Data requests) and src/features/settings (Settings ›
 * Data requests). What it calls: log_staff_action(), notify().
 */

/* ---------- 1. The table ---------- */

create sequence public.data_request_reference_seq;

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  -- The reference staff and the person quote: D-000001.
  reference text not null unique
    default 'D-' || lpad(nextval('public.data_request_reference_seq')::text, 6, '0'),
  -- The person the request is about (rule 15). Accounts are closed, never deleted, so no cascade.
  user_id uuid not null references public.profiles (id),
  request_type public.data_request_type not null,
  channel public.data_request_channel not null,
  received_on date not null,
  -- One month from receipt (GDPR art. 12(3)); an extension moves extended_to, never this.
  due_on date not null,
  extended_to date,
  extension_reason text,
  extended_at timestamptz,
  identity public.data_request_identity not null,
  identity_asked_at timestamptz,
  identity_answered_at timestamptz,
  state public.data_request_state not null default 'open',
  -- What was done, written when it is closed; the person never reads staff notes.
  outcome text,
  closed_at timestamptz,
  note text not null default '',
  created_by_user_id uuid not null references public.profiles (id),
  -- The last staff member who acted on it.
  handled_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_requests_due_one_month check (due_on = (received_on + interval '1 month')::date),
  constraint data_requests_extension_at_most_two_months check (
    extended_to is null or (extended_to > due_on and extended_to <= (received_on + interval '3 months')::date
                            and btrim(coalesce(extension_reason, '')) <> '')),
  constraint data_requests_closed_together check ((state = 'closed') = (closed_at is not null)),
  constraint data_requests_outcome_when_closed check (state = 'open' or btrim(coalesce(outcome, '')) <> ''),
  constraint data_requests_note_length check (char_length(note) <= 2000),
  constraint data_requests_outcome_length check (outcome is null or char_length(outcome) <= 2000)
);

comment on table public.data_requests is
  'kind: staff
Every request to see, move, correct or delete someone''s data: dates, deadline, extension, identity check and who handled it; never the files (S1-E11-09; GDPR art. 5(2), 12). Kept as our proof.';
comment on column public.data_requests.user_id is
  'The person the request is about; staff see it, the public never (rule 15).';
comment on column public.data_requests.due_on is
  'One month from receipt (GDPR art. 12(3)); extended_to, when set, is the deadline instead.';

create index data_requests_user_id on public.data_requests (user_id, received_on desc);
create index data_requests_open_due on public.data_requests (due_on) where state = 'open';

create trigger data_requests_set_updated_at
  before update on public.data_requests
  for each row execute function public.set_updated_at();

create trigger data_requests_refuse_user_id_change
  before update on public.data_requests
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.data_requests enable row level security;

-- Staff read through the policy below; every write goes through the admin_* functions.
grant select on public.data_requests to authenticated;

/**
 * Policy data_requests_select_staff: support, admin and the owner, in a staff session, read every
 * data request. Why: they handle them (architecture 1.8.3, "Data requests: owner, admin, support
 * act"); moderators and content editors have no access (S1-E11-09, last criterion). The person
 * reads their own requests only through my_data_requests(), which leaves out staff notes.
 */
create policy data_requests_select_staff
  on public.data_requests for select to authenticated
  using (public.staff_may('data_requests', 'act'));

comment on policy data_requests_select_staff on public.data_requests is
  'Allows owner, admin and support staff to read data requests (S1-E11-09).';

/* ---------- 2. Shared helpers ---------- */

/**
 * data_request_deadline: the date a request must be answered by: the extension when there is one,
 * otherwise one month from receipt. Input: the row. Returns: date. Internal.
 */
create or replace function public.data_request_deadline(request public.data_requests)
returns date
language sql
immutable
set search_path = ''
as $$
  select coalesce(request.extended_to, request.due_on);
$$;
comment on function public.data_request_deadline(public.data_requests) is
  'Internal: the date a data request must be answered by (S1-E11-09; GDPR art. 12(3)).';
revoke execute on function public.data_request_deadline(public.data_requests) from public, anon, authenticated;

/**
 * data_request_urgency: how close an open request is to its deadline, for the list's pills:
 * 'overdue' after it, 'alert' up to 2 days before, 'reminder' up to 7 days before (S1-E11-09
 * criterion 2, proposal), 'on_time' otherwise, and 'closed' once closed.
 * Input: the row. Returns: text. Internal.
 */
create or replace function public.data_request_urgency(request public.data_requests)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when request.state = 'closed' then 'closed'
    when public.data_request_deadline(request) < current_date then 'overdue'
    when public.data_request_deadline(request) - current_date <= 2 then 'alert'
    when public.data_request_deadline(request) - current_date <= 7 then 'reminder'
    else 'on_time'
  end;
$$;
comment on function public.data_request_urgency(public.data_requests) is
  'Internal: overdue, alert (2 days), reminder (7 days), on_time or closed (S1-E11-09, proposal).';
revoke execute on function public.data_request_urgency(public.data_requests) from public, anon, authenticated;

/**
 * data_request_person_is_under_16: whether the person is under 16 by year of birth (and the age
 * check). A request about them from anyone but their own signed-in account goes through their
 * parent or guardian (S1-E11-09 criterion 5; GDPR art. 8), which part c2 builds.
 * Input: person_id. Returns: boolean (false when the age is unknown). Internal.
 */
create or replace function public.data_request_person_is_under_16(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
           profiles.age_check_result, current_date)::text in ('under_13', '13_to_15'), false)
  from public.profiles where profiles.id = person_id;
$$;
comment on function public.data_request_person_is_under_16(uuid) is
  'Internal: whether a data request''s person is under 16, so it goes through the parent (S1-E11-09).';
revoke execute on function public.data_request_person_is_under_16(uuid) from public, anon, authenticated;

/**
 * data_request_json: one request as Staff › Data requests shows it: no email, no year of birth.
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
    'state', request.state,
    'outcome', request.outcome,
    'closed_at', request.closed_at,
    'note', request.note,
    'handled_by_handle', (select profiles.handle from public.profiles where profiles.id = request.handled_by_user_id),
    'created_at', request.created_at);
$$;
comment on function public.data_request_json(public.data_requests) is
  'Internal: one data request for the staff screens (S1-E11-09).';
revoke execute on function public.data_request_json(public.data_requests) from public, anon, authenticated;

/**
 * admin_data_request_target: the checks every staff action on a request starts with: the caller
 * may handle data requests, the request exists and, unless told otherwise, it is still open.
 * Input: target_request_id, must_be_open. Returns: the row, locked for the change.
 * Errors: insufficient_privilege (hint not_allowed); check_violation with hint no_such_request
 *   or request_closed. Internal.
 */
create or replace function public.admin_data_request_target(target_request_id uuid, must_be_open boolean)
returns public.data_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests;
begin
  -- Step 1: the server decides who may act, never the menu (architecture 1.8.1).
  if not public.staff_may('data_requests', 'act') then
    raise exception 'Only owner, admin and support staff handle data requests.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the request, locked so two staff members don't change it at once.
  select * into request from public.data_requests where data_requests.id = target_request_id for update;
  if not found then
    raise exception 'There is no such request.' using errcode = 'check_violation', hint = 'no_such_request';
  end if;
  if must_be_open and request.state = 'closed' then
    raise exception 'This request is closed.' using errcode = 'check_violation', hint = 'request_closed';
  end if;
  return request;
end;
$$;
comment on function public.admin_data_request_target(uuid, boolean) is
  'Internal: the staff, request and open checks every data request action starts with (S1-E11-09).';
revoke execute on function public.admin_data_request_target(uuid, boolean) from public, anon, authenticated;

/* ---------- 3. Staff open, list and read requests ---------- */

/**
 * admin_open_data_request: logs a new data request (S1-E11-09 criterion 1).
 * Input: target_user_id (found with admin_user_lookup() by user ID, handle or email); the type;
 *   how it arrived; the date it was received (never in the future; an old date is allowed,
 *   because a letter can arrive late); a staff note.
 * Returns: the new request as JSON (data_request_json()), with its deadline one month from receipt.
 * Errors: insufficient_privilege (hint not_allowed); check_violation with hint no_such_person,
 *   bad_date (in the future or missing) or note_too_long.
 * A request made inside the signed-in account ('in_app') needs no further identity check: the
 * sign-in is the check (criterion 4). Any other starts at not_asked.
 * Where it fits: DataRequestForm → useDataRequests → api/dataRequests.ts → here.
 */
create or replace function public.admin_open_data_request(
  target_user_id uuid, request_type public.data_request_type, channel public.data_request_channel,
  received_on date, note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests;
begin
  -- Step 1: who may log one.
  if not public.staff_may('data_requests', 'act') then
    raise exception 'Only owner, admin and support staff handle data requests.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: an account that exists, a date that has happened and a note that fits.
  if not exists (select 1 from public.profiles where profiles.id = target_user_id) then
    raise exception 'There is no such account.' using errcode = 'check_violation', hint = 'no_such_person';
  end if;
  if received_on is null or received_on > current_date then
    raise exception 'The date received can''t be in the future.' using errcode = 'check_violation', hint = 'bad_date';
  end if;
  if char_length(coalesce(note, '')) > 2000 then
    raise exception 'The note is too long.' using errcode = 'check_violation', hint = 'note_too_long';
  end if;
  -- Step 3: the request, with its deadline one month from receipt (GDPR art. 12(3)).
  insert into public.data_requests (user_id, request_type, channel, received_on, due_on, identity,
    note, created_by_user_id, handled_by_user_id)
  values (target_user_id, request_type, channel, received_on, (received_on + interval '1 month')::date,
    case when channel = 'in_app' then 'not_needed' else 'not_asked' end::public.data_request_identity,
    btrim(coalesce(note, '')), (select auth.uid()), (select auth.uid()))
  returning * into request;
  -- Step 4: the audit log, naming the person by user ID (never the email used to find them).
  perform public.log_staff_action('data_request.opened', 'data_requests', request.id::text, request.user_id,
    null, null, jsonb_build_object('reference', request.reference, 'type', request.request_type,
      'channel', request.channel, 'received_on', request.received_on));
  return public.data_request_json(request);
end;
$$;
comment on function public.admin_open_data_request(uuid, public.data_request_type, public.data_request_channel, date, text) is
  'Staff log a new data request; the deadline is one month from receipt (S1-E11-09).';
revoke execute on function public.admin_open_data_request(uuid, public.data_request_type, public.data_request_channel, date, text) from public, anon;
grant execute on function public.admin_open_data_request(uuid, public.data_request_type, public.data_request_channel, date, text) to authenticated;

/**
 * admin_data_requests: the list on Staff › Data requests: open ones first, nearest deadline
 *   first, then closed ones, newest first.
 * Input: only_open (true leaves closed ones out).
 * Returns: JSON array of data_request_json() (at most 200).
 * Errors: insufficient_privilege (hint not_allowed).
 * Where it fits: StaffDataRequestsPage → useDataRequests → api/dataRequests.ts → here.
 */
create or replace function public.admin_data_requests(only_open boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('data_requests', 'act') then
    raise exception 'Only owner, admin and support staff handle data requests.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  return coalesce((
    select jsonb_agg(public.data_request_json(listed) order by listed.state = 'closed',
      case when listed.state = 'open' then public.data_request_deadline(listed) end,
      listed.created_at desc)
    from (select * from public.data_requests
          where not only_open or data_requests.state = 'open'
          order by data_requests.state = 'closed', data_requests.created_at desc
          limit 200) as listed), '[]'::jsonb);
end;
$$;
comment on function public.admin_data_requests(boolean) is
  'Staff list data requests, nearest deadline first (S1-E11-09).';
revoke execute on function public.admin_data_requests(boolean) from public, anon;
grant execute on function public.admin_data_requests(boolean) to authenticated;

/* ---------- 4. Staff extend, ask for confirmation and close ---------- */

/**
 * admin_extend_data_request: gives a request one or two more months, with a reason, and tells the
 *   person (S1-E11-09 criterion 3; GDPR art. 12(3): at most two further months, and the person is
 *   told within the first month, with the reasons).
 * Input: target_request_id; extra_months, 1 or 2 counted from the first deadline (so asking for 2
 *   after 1 adds one more); the reason the person reads.
 * Returns: the request as JSON.
 * Errors: as admin_data_request_target(); check_violation with hint reason_needed, bad_months
 *   (not 1 or 2, or not more than an earlier extension) or too_late (the first month is over).
 * Where it fits: DataRequestExtendForm → useDataRequests → api/dataRequests.ts → here.
 */
create or replace function public.admin_extend_data_request(
  target_request_id uuid, extra_months integer, reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
  wanted date;
begin
  -- Step 1: a reason the person can read.
  if btrim(coalesce(reason, '')) = '' or char_length(reason) > 1000 then
    raise exception 'Say why you need more time, in at most 1000 characters.'
      using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 2: one or two months from the first deadline, and more than any earlier extension.
  wanted := (request.due_on + make_interval(months => coalesce(extra_months, 0)))::date;
  if extra_months is null or extra_months not in (1, 2) or wanted <= coalesce(request.extended_to, request.due_on) then
    raise exception 'Pick one or two more months, more than before.' using errcode = 'check_violation', hint = 'bad_months';
  end if;
  -- Step 3: the person must be told within the first month (art. 12(3)).
  if current_date > request.due_on then
    raise exception 'The first month is over, so the deadline can''t be extended now.'
      using errcode = 'check_violation', hint = 'too_late';
  end if;
  -- Step 4: the extension, the audit log and the person's notice (always sent, by email too).
  update public.data_requests set extended_to = wanted, extension_reason = btrim(reason),
    extended_at = now(), handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id returning * into request;
  perform public.log_staff_action('data_request.extended', 'data_requests', request.id::text, request.user_id,
    btrim(reason), jsonb_build_object('deadline', request.due_on), jsonb_build_object('deadline', wanted));
  perform public.notify(request.user_id, 'data_request_extended', null,
    jsonb_build_object('data_request_id', request.id));
  return public.data_request_json(request);
end;
$$;
comment on function public.admin_extend_data_request(uuid, integer, text) is
  'Staff give a data request one or two more months, with a reason; the person is told (S1-E11-09).';
revoke execute on function public.admin_extend_data_request(uuid, integer, text) from public, anon;
grant execute on function public.admin_extend_data_request(uuid, integer, text) to authenticated;

/**
 * admin_ask_data_request_confirmation: asks the person to confirm, signed in to their own account,
 *   that a request made by email or post was theirs (S1-E11-09 criterion 4; GDPR art. 12(6)). The
 *   notification is emailed to the account's own address only, never to an address from the
 *   request. Asking again sends it again.
 * Input: target_request_id. Returns: the request as JSON.
 * Errors: as admin_data_request_target(); check_violation with hint no_check_needed (made inside
 *   the account), already_answered, or parent_needed (the person is under 16: part c2 sends it to
 *   the parent or guardian instead, criterion 5).
 * Where it fits: DataRequestIdentity → useDataRequests → api/dataRequests.ts → here.
 */
create or replace function public.admin_ask_data_request_confirmation(target_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
begin
  -- Step 1: only a request that still needs the check.
  if request.identity = 'not_needed' then
    raise exception 'This request was made inside the account.' using errcode = 'check_violation', hint = 'no_check_needed';
  end if;
  if request.identity in ('confirmed', 'denied') then
    raise exception 'The person has already answered.' using errcode = 'check_violation', hint = 'already_answered';
  end if;
  -- Step 2: about an under-16, the check goes to the parent or guardian (GDPR art. 8; part c2).
  if public.data_request_person_is_under_16(request.user_id) then
    raise exception 'This person is under 16: the request goes through their parent or guardian.'
      using errcode = 'check_violation', hint = 'parent_needed';
  end if;
  -- Step 3: ask, log it and tell the person (always sent, by email to the account's own address).
  update public.data_requests set identity = 'asked', identity_asked_at = now(),
    handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id returning * into request;
  perform public.log_staff_action('data_request.confirmation_asked', 'data_requests', request.id::text,
    request.user_id, null, null, jsonb_build_object('method', 'sign_in'));
  perform public.notify(request.user_id, 'data_request_confirm', null,
    jsonb_build_object('data_request_id', request.id));
  return public.data_request_json(request);
end;
$$;
comment on function public.admin_ask_data_request_confirmation(uuid) is
  'Staff ask the person to confirm, signed in, that a data request was theirs (S1-E11-09; GDPR art. 12(6)).';
revoke execute on function public.admin_ask_data_request_confirmation(uuid) from public, anon;
grant execute on function public.admin_ask_data_request_confirmation(uuid) to authenticated;

/**
 * admin_close_data_request: closes a request with what was done (S1-E11-09 criterion "a request is
 *   closed": the log keeps the user ID, type, dates, identity check and who handled it).
 * Input: target_request_id, outcome (required, the staff record of what was done).
 * Returns: the request as JSON.
 * Errors: as admin_data_request_target(); check_violation with hint outcome_needed.
 * Where it fits: DataRequestCloseForm → useDataRequests → api/dataRequests.ts → here.
 */
create or replace function public.admin_close_data_request(target_request_id uuid, outcome text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
begin
  if btrim(coalesce(outcome, '')) = '' or char_length(outcome) > 2000 then
    raise exception 'Say what was done, in at most 2000 characters.'
      using errcode = 'check_violation', hint = 'outcome_needed';
  end if;
  update public.data_requests set state = 'closed', closed_at = now(), outcome = btrim(admin_close_data_request.outcome),
    handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id returning * into request;
  perform public.log_staff_action('data_request.closed', 'data_requests', request.id::text, request.user_id,
    request.outcome, jsonb_build_object('state', 'open'),
    jsonb_build_object('state', 'closed', 'identity', request.identity,
      'deadline', public.data_request_deadline(request)));
  return public.data_request_json(request);
end;
$$;
comment on function public.admin_close_data_request(uuid, text) is
  'Staff close a data request with what was done (S1-E11-09).';
revoke execute on function public.admin_close_data_request(uuid, text) from public, anon;
grant execute on function public.admin_close_data_request(uuid, text) to authenticated;

/* ---------- 5. The person's side ---------- */

/**
 * my_data_requests: the signed-in person's own data requests, for Settings › Data requests: the
 *   reference, what and when, the deadline, any extension and its reason, and whether we are
 *   waiting for them to confirm. Never staff notes or who handled it.
 * Returns: JSON array, newest first. Errors: insufficient_privilege when signed out.
 * Where it fits: MyDataRequests → useMyDataRequests → api/myDataRequests.ts → here.
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
        'identity', requests.identity,
        'state', requests.state)
      order by requests.received_on desc, requests.created_at desc)
    from public.data_requests as requests
    where requests.user_id = (select auth.uid())), '[]'::jsonb);
end;
$$;
comment on function public.my_data_requests() is
  'The signed-in person''s own data requests, without staff notes (S1-E11-09).';
revoke execute on function public.my_data_requests() from public, anon;
grant execute on function public.my_data_requests() to authenticated;

/**
 * answer_data_request: the signed-in person says whether a request staff asked about was theirs.
 *   Signing in to the account is the identity check (S1-E11-09 criterion 4); the answer and its
 *   time are stored with the request and in the audit log.
 * Input: request_reference ("D-000001"), is_mine.
 * Returns: 'confirmed' or 'denied'.
 * Errors: insufficient_privilege when signed out; check_violation with hint no_such_request (not
 *   theirs, or no such reference) or not_waiting (nothing asked, already answered or closed).
 * Where it fits: MyDataRequests → useMyDataRequests → api/myDataRequests.ts → here.
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
  -- Step 2: only while we are waiting for them.
  if request.identity <> 'asked' or request.state <> 'open' or is_mine is null then
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
comment on function public.answer_data_request(text, boolean) is
  'The signed-in person confirms or denies a data request staff asked about (S1-E11-09; GDPR art. 12(6)).';
revoke execute on function public.answer_data_request(text, boolean) from public, anon;
grant execute on function public.answer_data_request(text, boolean) to authenticated;


/* ---------- 6. Notifications ---------- */

alter table public.notifications
  add column data_request_id uuid references public.data_requests (id) on delete set null;
comment on column public.notifications.data_request_id is
  'The data request a notice is about (S1-E11-09).';

/**
 * notify: as in ADMIN-2b1, plus about.data_request_id, and the two data request notices are
 * required: the person can't switch off being asked to confirm, or told of an extension (GDPR
 * art. 12(3)). Inputs, return and callers are unchanged.
 */
create or replace function public.notify(
  recipient_id uuid, notification_kind public.notification_kind, actor_id uuid, about jsonb,
  group_key text default null, group_window interval default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grouped public.notifications;
begin
  -- Step 1: never one's own action, never across a block.
  if recipient_id is null or recipient_id = actor_id then
    return;
  end if;
  if actor_id is not null and exists (
      select 1 from public.blocks
      where (blocks.user_id = recipient_id and blocks.blocked_user_id = actor_id)
         or (blocks.user_id = actor_id and blocks.blocked_user_id = recipient_id)) then
    return;
  end if;
  -- Step 2: a fresh grouped row takes the new person instead of a new row.
  if notify.group_key is not null then
    select * into grouped from public.notifications
    where notifications.user_id = recipient_id and notifications.group_key = notify.group_key
      and notifications.created_at > now() - group_window
    order by notifications.created_at desc limit 1
    for update;
    if grouped.id is not null then
      if actor_id = any (grouped.actor_user_ids) then
        return;
      end if;
      update public.notifications set
        actor_user_ids = (array[actor_id] || grouped.actor_user_ids)[1:50],
        actor_count = grouped.actor_count + 1,
        read_at = null,
        updated_at = now()
      where notifications.id = grouped.id;
      return;
    end if;
  end if;
  -- Step 3: a new row; a decision, an appeal's outcome or a staff change can't be switched off
  -- (DSA art. 17, 20; S1-E11-08), nor can a data request's notice (GDPR art. 12; S1-E11-09).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id,
    story_revision_id, data_request_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, (about ->> 'data_request_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff', 'data_request_confirm',
                          'data_request_extended'));
end;
$$;

/**
 * notification_category: as in ADMIN-2b1, plus the two data request notices under staff.
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
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    else 'replies'
  end;
$$;

/**
 * email_delivery_for: as in CLASSES-e, plus the two data request notices, always emailed: the
 * person must hear about them even when they don't sign in (GDPR art. 12(3); S1-E11-09).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;

/**
 * notification_json: as in ADMIN-2b3, plus 'data_request' {reference, deadline, extension_reason}
 * for the two data request notices. Inputs, return and callers are unchanged.
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    -- ADMIN-2b3: the title as the recipient may see it (S1-E11-08).
    'story', (select jsonb_build_object('slug', stories.slug, 'title', (public.story_as_shown(stories)).title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    -- FORUMS-2c: the space a join request or approval is about, while the reader may see it.
    'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
              from public.spaces where spaces.id = target.space_id and spaces.deleted_at is null
                and public.space_card_visible(spaces)),
    -- FORUMS-2d: what a moderator asked the person to change, why, and by when.
    'change_request', (select jsonb_build_object('item', requests.item, 'reason', requests.reason,
                         'due_at', requests.due_at, 'is_open', requests.resolved_at is null,
                         'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
                                   from public.spaces where spaces.id = requests.space_id))
                       from public.customisation_change_requests as requests
                       where requests.id = target.change_request_id),
    -- ADMIN-2b1: what staff changed about the writer's story, and why (S1-E11-08 criterion 4).
    'staff_change', case when target.kind = 'story_changed_by_staff'
                      then public.notification_staff_change_json(target.story_revision_id) end,
    -- ADMIN-2c1: the data request a notice is about: its reference, deadline and why it moved.
    'data_request', (select jsonb_build_object('reference', data_requests.reference,
                       'deadline', public.data_request_deadline(data_requests),
                       'extension_reason', data_requests.extension_reason)
                     from public.data_requests where data_requests.id = target.data_request_id),
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/* ---------- 7. One request ---------- */

/**
 * admin_data_request: one data request, open or closed, for its staff page.
 * Input: target_request_id. Returns: the request as JSON.
 * Errors: as admin_data_request_target().
 * Where it fits: StaffDataRequestPage → useDataRequest → api/dataRequests.ts → here.
 */
create or replace function public.admin_data_request(target_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request public.data_requests;
begin
  -- Step 1: the same checks as every action, without needing it to be open or locking it.
  if not public.staff_may('data_requests', 'act') then
    raise exception 'You can''t handle data requests.' using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  select * into request from public.data_requests where data_requests.id = target_request_id;
  if not found then
    raise exception 'There is no such request.' using errcode = 'check_violation', hint = 'no_such_request';
  end if;
  -- Step 2: the request as the staff screen shows it.
  return public.data_request_json(request);
end;
$$;
comment on function public.admin_data_request(uuid) is
  'Staff open one data request (S1-E11-09).';
revoke execute on function public.admin_data_request(uuid) from public, anon;
grant execute on function public.admin_data_request(uuid) to authenticated;
