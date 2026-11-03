/*
 * Migration: data requests count days in Romanian time (bundle CONTESTS, part b2d; story
 * S1-E11-09; found by the bundle's full test run).
 *
 * Why: the admin site fills "Date received" with today's date in Romania, and a ticket's request
 * uses the day the ticket arrived in Romania, but admin_open_data_request() compared it with the
 * database's own date (UTC). Between 22:00 and 24:00 UTC (00:00 to 02:00 in Romania) every new
 * request was refused as "in the future". The deadline pills and the "first month is over" check
 * used the same UTC date, so they could be a day out at night too.
 * What it changes: the three functions below, word for word as before except that "today" is
 * public.romania_today() (S1-E11-06), the date every other deadline in the app uses.
 * Who calls them: the Data requests area of the admin site and admin_open_ticket_data_request().
 */

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
    when public.data_request_deadline(request) < public.romania_today() then 'overdue'
    when public.data_request_deadline(request) - public.romania_today() <= 2 then 'alert'
    when public.data_request_deadline(request) - public.romania_today() <= 7 then 'reminder'
    else 'on_time'
  end;
$$;
comment on function public.data_request_urgency(public.data_requests) is
  'Internal: overdue, alert (2 days), reminder (7 days), on_time or closed (S1-E11-09, proposal).';
revoke execute on function public.data_request_urgency(public.data_requests) from public, anon, authenticated;

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
  if received_on is null or received_on > public.romania_today() then
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
  if public.romania_today() > request.due_on then
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
