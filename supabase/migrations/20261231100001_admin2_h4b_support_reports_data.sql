/*
 * Migration: support tickets, part 4b: Convert to report, Open data request, retention and the
 * data export (story S1-E11-13, part 13b; bundle ADMIN-2h4b; criteria 10, 11 and 14).
 *
 * How it works:
 * - Convert to report (criterion 10): staff turn a ticket about unlawful or harmful content, or a
 *   child's safety, into a notice in the moderation system (public_notices, S1-E10-02), linked to
 *   the ticket. When the address points to something we host, the notice opens or joins that
 *   item's case in the queue with the reason's tier, safeguarding included (S1-E10-03a, 10); when
 *   it doesn't (or there is no address), it waits in the moderators' unmatched notices. The
 *   person isn't asked for the good-faith statement or a name: staff write it up from the ticket.
 * - Open data request (criterion 11): staff start a data request (S1-E11-09) for the ticket's
 *   account, received on the day the ticket arrived, so the one-month deadline counts from then.
 *   A ticket from someone without an account can't: the request needs an account (staff handle
 *   those by hand, as in March).
 * - Retention (criterion 14): a ticket closed or solved more than 2 years ago is deleted with its
 *   messages, history and emails (setting support_ticket_keep_years; proposal), nightly.
 * - The data export: the person's own tickets and messages (never staff notes or who on the team
 *   wrote) are in "Download my data" and in a staff copy for a data request.
 * What it adds: support_ticket_id on public_notices and data_requests; two history changes;
 *   admin_convert_ticket_to_report(), admin_open_ticket_data_request(), admin_ticket_links(),
 *   purge_old_support_tickets() on pg_cron, export_support_tickets_of() inside export_tables_of().
 * Who calls it: src/features/support/ (the ticket page), pg_cron, the data export.
 */

/* ---------- Links from a notice and a data request back to their ticket ---------- */

alter table public.public_notices
  add column support_ticket_id uuid references public.support_tickets (id) on delete set null;
comment on column public.public_notices.support_ticket_id is
  'The support ticket staff converted into this notice (S1-E11-13 criterion 10); empty for a notice from the public form.';
-- The ticket's number stays after the ticket itself is deleted (2 years, criterion 14), so the
-- notice still shows it was written up by staff and still passes the checks below.
alter table public.public_notices add column support_ticket_number bigint;
comment on column public.public_notices.support_ticket_number is
  'The number of the support ticket this notice came from; kept after the ticket is deleted (S1-E11-13 criterion 10).';
-- Staff write a converted notice up from the ticket, so the person's own good-faith statement and
-- name aren't asked for (DSA art. 16 is about the public form); an address to answer stays required.
alter table public.public_notices drop constraint public_notices_notifier_given;
alter table public.public_notices add constraint public_notices_notifier_given check (
  kind = 'removal_order' or reason = 'child_sexual_content' or support_ticket_number is not null
  or (notifier_name is not null and notifier_email is not null));
alter table public.public_notices drop constraint public_notices_good_faith;
alter table public.public_notices add constraint public_notices_good_faith check (
  kind = 'removal_order' or good_faith_confirmed or support_ticket_number is not null);

alter table public.data_requests
  add column support_ticket_id uuid references public.support_tickets (id) on delete set null;
comment on column public.data_requests.support_ticket_id is
  'The support ticket the request started from (S1-E11-13 criterion 11), or empty.';

alter table public.support_ticket_events drop constraint support_ticket_events_change_is_known;
alter table public.support_ticket_events add constraint support_ticket_events_change_is_known check (
  change in ('created', 'status', 'priority', 'category', 'assignee', 'tags',
             'spam_marked', 'spam_cleared', 'merged_into', 'merged_from',
             'converted_to_report', 'data_request_opened'));

/* ---------- Convert to report ---------- */

/**
 * admin_convert_ticket_to_report: turns a ticket into a notice for the moderation team
 * (criterion 10).
 * Inputs: ticket_number; content_address (the address of what is reported, or empty when there
 *   is none, as for a worry about a child); reason (a report reason: its tier and safeguarding
 *   follow); explanation (what staff learned from the ticket, 1 to 2,000 characters).
 * Returns: {reference, matched}: the notice's reference (N-000123) and whether it reached the
 *   queue as a case (true) or waits in the unmatched notices (false).
 * Errors: as require_support_ticket_for_staff(); check_violation for an empty or long explanation
 *   or a spam ticket.
 * Logged as support_ticket.converted_to_report, without the words; the ticket's history keeps the
 *   reference.
 */
create or replace function public.admin_convert_ticket_to_report(
  ticket_number bigint, content_address text, reason public.report_reason, explanation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets := public.require_support_ticket_for_staff(ticket_number);
  clean_address text := nullif(left(btrim(coalesce(content_address, '')), 2000), '');
  clean_explanation text := btrim(coalesce(explanation, ''));
  -- What the address points to; all three stay empty when it points to nothing we host.
  matched_type public.reportable_type;
  matched_id uuid;
  matched_owner uuid;
  notice public.public_notices;
begin
  -- Step 1: a real explanation, and never for spam.
  if char_length(clean_explanation) not between 1 and 2000 then
    raise exception 'Write what the ticket says is wrong (up to 2,000 characters).' using errcode = 'check_violation';
  end if;
  if ticket.is_spam then
    raise exception 'A spam ticket can''t become a report.' using errcode = 'check_violation';
  end if;
  -- Step 2: what the address points to, if anything we host.
  if clean_address is not null then
    select found_item.item_type, found_item.item_id, found_item.owner_user_id
      into matched_type, matched_id, matched_owner
    from public.item_for_public_address(clean_address) as found_item;
  end if;
  -- Step 3: the notice, linked to the ticket; without an address it names the ticket instead.
  insert into public.public_notices (kind, reason, content_url, item_type, item_id, owner_user_id, explanation,
    notifier_email, language, reference, support_ticket_id, support_ticket_number)
  values ('notice', reason, coalesce(clean_address, 'support ticket #' || ticket.number),
    matched_type, matched_id, matched_owner, clean_explanation,
    public.support_ticket_address(ticket), ticket.language, public.next_notice_reference('notice'), ticket.id, ticket.number)
  returning * into notice;
  -- Step 4: a matched notice opens or joins the item's case, with the reason's tier.
  if notice.item_id is not null then
    update public.public_notices set case_id = public.attach_notice_to_case(notice) where id = notice.id;
  end if;
  perform public.record_support_event(ticket.id, 'converted_to_report', null, to_jsonb(notice.reference));
  perform public.log_staff_action('support_ticket.converted_to_report', 'support_tickets', ticket.id::text,
    ticket.requester_user_id, null, null, jsonb_build_object('notice', notice.reference, 'reason', reason));
  return jsonb_build_object('reference', notice.reference, 'matched', notice.item_id is not null);
end;
$$;

comment on function public.admin_convert_ticket_to_report(bigint, text, public.report_reason, text) is
  'Staff turn a support ticket into a notice for the moderation team, linked to the ticket (S1-E11-13 criterion 10).';
revoke execute on function public.admin_convert_ticket_to_report(bigint, text, public.report_reason, text) from public, anon;
grant execute on function public.admin_convert_ticket_to_report(bigint, text, public.report_reason, text) to authenticated;

/* ---------- Open data request ---------- */

/**
 * admin_open_ticket_data_request: starts a data request (S1-E11-09) from a ticket (criterion 11),
 * received on the day the ticket arrived (Romanian time), so the legal month counts from then.
 * Inputs: ticket_number; request_type (copy, move, correct, delete or other).
 * Returns: the request as admin_open_data_request() gives it (with its reference and deadline).
 * Errors: as require_support_ticket_for_staff() and admin_open_data_request() (staff without the
 *   data_requests area are refused there); check_violation (hint no_account) for a ticket from
 *   someone without an account.
 */
create or replace function public.admin_open_ticket_data_request(ticket_number bigint, request_type public.data_request_type)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets := public.require_support_ticket_for_staff(ticket_number);
  request jsonb;
begin
  -- Step 1: a data request belongs to an account.
  if ticket.requester_user_id is null then
    raise exception 'This person has no account, so handle the request by email.'
      using errcode = 'check_violation', hint = 'no_account';
  end if;
  -- Step 2: the request, through the data requests area's own function (its checks and log).
  request := public.admin_open_data_request(ticket.requester_user_id, request_type,
    case when ticket.channel = 'in_app' then 'in_app' else 'email' end::public.data_request_channel,
    (ticket.created_at at time zone 'Europe/Bucharest')::date,
    'From support ticket #' || ticket.number);
  -- Step 3: the link back, and a line in the ticket's history.
  update public.data_requests set support_ticket_id = ticket.id where reference = request ->> 'reference';
  perform public.record_support_event(ticket.id, 'data_request_opened', null, to_jsonb(request ->> 'reference'));
  return request;
end;
$$;

comment on function public.admin_open_ticket_data_request(bigint, public.data_request_type) is
  'Staff start a data request from a support ticket, received on the day the ticket arrived (S1-E11-13 criterion 11).';
revoke execute on function public.admin_open_ticket_data_request(bigint, public.data_request_type) from public, anon;
grant execute on function public.admin_open_ticket_data_request(bigint, public.data_request_type) to authenticated;

/**
 * admin_ticket_links: the notices and data requests started from a ticket, for its page.
 * Input: ticket_number. Returns: {notices: [{reference, at}], data_requests: [{id, reference,
 *   type, due_on}]}, newest first (the ID opens the request's page). Errors: insufficient_privilege unless the caller may view tickets.
 */
create or replace function public.admin_ticket_links(ticket_number bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('support_tickets', 'view') then
    raise exception 'Only support staff can read tickets.' using errcode = 'insufficient_privilege';
  end if;
  return (
    select jsonb_build_object(
      'notices', coalesce((select jsonb_agg(jsonb_build_object('reference', notices.reference, 'at', notices.received_at)
                             order by notices.received_at desc)
                           from public.public_notices as notices where notices.support_ticket_id = tickets.id), '[]'::jsonb),
      'data_requests', coalesce((select jsonb_agg(jsonb_build_object('id', requests.id, 'reference', requests.reference,
                                   'type', requests.request_type, 'due_on', coalesce(requests.extended_to, requests.due_on))
                                   order by requests.created_at desc)
                                 from public.data_requests as requests where requests.support_ticket_id = tickets.id), '[]'::jsonb))
    from public.support_tickets as tickets where tickets.number = ticket_number);
end;
$$;

comment on function public.admin_ticket_links(bigint) is 'The notices and data requests started from a support ticket (S1-E11-13 criteria 10 and 11).';
revoke execute on function public.admin_ticket_links(bigint) from public, anon;
grant execute on function public.admin_ticket_links(bigint) to authenticated;

/* ---------- Retention ---------- */

insert into public.settings (key, value, is_public, description) values
  ('support_ticket_keep_years', '2'::jsonb, false,
   'Years a support ticket is kept after it was closed or solved, then deleted with its messages (S1-E11-13 criterion 14; proposal).')
on conflict (key) do nothing;

/**
 * purge_old_support_tickets: deletes tickets closed or solved more than support_ticket_keep_years
 * (2) ago, with their messages, history and emails (criterion 14; docs/retention.md). A notice or
 * data request started from one keeps its own record and loses only the link.
 * Returns: how many tickets it deleted. Internal: pg_cron, every night.
 */
create or replace function public.purge_old_support_tickets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep_years integer := greatest(coalesce((public.setting_value('support_ticket_keep_years'))::integer, 2), 1);
  deleted_count integer;
begin
  delete from public.support_tickets
  where status in ('closed', 'solved')
    and coalesce(closed_at, solved_at) < now() - make_interval(years => keep_years);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_old_support_tickets() is
  'Job: deletes support tickets closed or solved more than support_ticket_keep_years (2) ago (S1-E11-13 criterion 14).';
revoke execute on function public.purge_old_support_tickets() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-old-support-tickets', '41 3 * * *', 'select public.purge_old_support_tickets();');

/* ---------- The data export ---------- */

/**
 * export_support_tickets_of: the person's support tickets for their data export (criterion 14):
 * each with its number, subject, status, category, how it came in, dates, a merge, and the
 * messages as they see them (theirs and the support team's; never an internal note or who on the
 * team wrote). Input: the person's user ID. Returns: a JSON array, oldest first. Internal.
 */
create or replace function public.export_support_tickets_of(owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'number', tickets.number, 'subject', tickets.subject, 'status', tickets.status,
      'category', tickets.category, 'channel', tickets.channel, 'language', tickets.language,
      'email_given', tickets.requester_email, 'created_at', tickets.created_at,
      'solved_at', tickets.solved_at, 'closed_at', tickets.closed_at,
      'merged_into', (select later.number from public.support_tickets as later where later.id = tickets.merged_into_ticket_id),
      'messages', coalesce((select jsonb_agg(jsonb_build_object(
          'from', case when messages.kind = 'staff_reply' then 'support_team' else 'you' end,
          'body', messages.body, 'channel', messages.channel, 'at', messages.created_at)
          order by messages.created_at)
        from public.support_ticket_messages as messages
        where messages.ticket_id = tickets.id and messages.kind <> 'internal_note'
          and (messages.kind = 'staff_reply' or messages.author_user_id = owner_id or messages.author_user_id is null)), '[]'::jsonb))
      order by tickets.created_at), '[]'::jsonb)
  from public.support_tickets as tickets
  where tickets.requester_user_id = owner_id;
$$;

comment on function public.export_support_tickets_of(uuid) is
  'Internal: the person''s support tickets for their data export, without staff notes or names (S1-E11-13 criterion 14).';
revoke execute on function public.export_support_tickets_of(uuid) from public, anon, authenticated;

/**
 * export_tables_of: as before (the person's rows of every included table, by table name, oldest
 * first), plus "support_tickets" from export_support_tickets_of(): tickets name their person in
 * requester_user_id, not user_id, and their notes must stay out, so they have their own query.
 * Input: the person's user ID. Returns: { "<table>": [rows] }. Internal: my_data_export() and the
 * staff copy for a data request.
 */
create or replace function public.export_tables_of(owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  entry record;
  table_rows jsonb;
begin
  for entry in select listed.table_name from public.data_export_tables() as listed
               where listed.is_included order by listed.table_name loop
    execute format(
      'select coalesce(jsonb_agg(public.export_row_for_owner(to_jsonb(owned)) order by owned.created_at), ''[]''::jsonb)
       from public.%I as owned where owned.user_id = $1', entry.table_name)
      into table_rows using owner_id;
    result := result || jsonb_build_object(entry.table_name, table_rows);
  end loop;
  return result || jsonb_build_object('support_tickets', public.export_support_tickets_of(owner_id));
end;
$$;
