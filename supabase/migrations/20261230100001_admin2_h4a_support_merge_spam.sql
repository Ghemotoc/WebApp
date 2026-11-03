/*
 * Migration: support tickets, part 4a: merging two tickets and marking spam (story S1-E11-13,
 * part 13b; bundle ADMIN-2h4a; criteria 9 and 13).
 *
 * How it works:
 * - Merge (criterion 9): staff merge one ticket into another from the same person. Every message
 *   moves to the ticket that stays; the merged one closes with a pointer to it, and the person is
 *   told the new number by email and on their old ticket's page. A later email answering the old
 *   ticket lands in the one that stays.
 * - Spam (criterion 13): staff mark a ticket as spam. It leaves every view except Spam, nothing
 *   waiting to be emailed for it leaves, staff can't answer it (notes still work), and later
 *   emails from the same address (or the same account) go straight to Spam without an
 *   acknowledgement. "Not spam" puts it back.
 * What it adds: is_spam, marked_spam_at and merged_into_ticket_id on support_tickets; a 'merged'
 *   ticket email; admin_mark_support_spam(), admin_merge_support_tickets(); the Spam view in
 *   admin_support_inbox() and admin_support_view_counts(); spam and merges in the email intake,
 *   the staff ticket and the member's ticket.
 * Who calls it: src/features/support/ (staff and member pages), server/support-emails.ts.
 */

/* ---------- New columns ---------- */

alter table public.support_tickets
  add column is_spam boolean not null default false,
  add column marked_spam_at timestamptz,
  -- The ticket this one was merged into; it is closed and its messages live there now.
  add column merged_into_ticket_id uuid references public.support_tickets (id) on delete set null,
  add constraint support_tickets_not_merged_into_itself check (merged_into_ticket_id is null or merged_into_ticket_id <> id);

-- The "you can find this in #N now" email after a merge is a fourth kind of ticket email.
alter table public.support_ticket_emails drop constraint support_ticket_emails_kind_is_known;
alter table public.support_ticket_emails add constraint support_ticket_emails_kind_is_known
  check (kind in ('acknowledgement', 'staff_reply', 'auto_solved', 'merged'));

-- The history names spam marks and merges too.
alter table public.support_ticket_events drop constraint support_ticket_events_change_is_known;
alter table public.support_ticket_events add constraint support_ticket_events_change_is_known check (
  change in ('created', 'status', 'priority', 'category', 'assignee', 'tags',
             'spam_marked', 'spam_cleared', 'merged_into', 'merged_from'));

/* ---------- Spam ---------- */

/**
 * support_sender_is_spam: true when staff marked an earlier ticket from this address, or from
 * this account, as spam (criterion 13: "the sender's later emails go there too"). Internal.
 */
create or replace function public.support_sender_is_spam(sender text, sender_account uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.support_tickets as tickets
    where tickets.is_spam
      and (lower(tickets.requester_email) = lower(btrim(sender))
           or (sender_account is not null and tickets.requester_user_id = sender_account)));
$$;

comment on function public.support_sender_is_spam(text, uuid) is 'Internal: whether staff marked earlier support mail from this sender as spam (S1-E11-13 criterion 13).';
revoke execute on function public.support_sender_is_spam(text, uuid) from public, anon, authenticated;

/**
 * refuse_reply_to_spam: staff can't answer a ticket marked as spam, so nothing is ever emailed to
 * a spammer (criterion 13: "no reply is sent"); internal notes still work. Trigger function on
 * support_ticket_messages, before insert. Errors: check_violation.
 */
create or replace function public.refuse_reply_to_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.support_tickets where id = new.ticket_id and is_spam) then
    raise exception 'This ticket is marked as spam, so it can''t be answered.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.refuse_reply_to_spam() is 'Internal trigger: no staff answer on a spam ticket (S1-E11-13 criterion 13).';
revoke execute on function public.refuse_reply_to_spam() from public, anon, authenticated;

create trigger support_ticket_messages_refuse_reply_to_spam
  before insert on public.support_ticket_messages
  for each row when (new.kind = 'staff_reply')
  execute function public.refuse_reply_to_spam();

/**
 * admin_mark_support_spam: marks a ticket as spam, or takes the mark off (criterion 13).
 * Marking cancels the ticket's emails that haven't left yet.
 * Inputs: ticket_number; spam (true to mark, false for "Not spam").
 * Returns: true. Errors: as require_support_ticket_for_staff().
 * Logged as support_ticket.spam_marked or support_ticket.spam_cleared, in the audit log and the
 *   ticket's history.
 */
create or replace function public.admin_mark_support_spam(ticket_number bigint, spam boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets := public.require_support_ticket_for_staff(ticket_number);
  marking boolean := coalesce(spam, true);
begin
  -- Step 1: nothing to do when it already says so.
  if ticket.is_spam = marking then
    return true;
  end if;
  -- Step 2: the mark, and the history line.
  update public.support_tickets
  set is_spam = marking, marked_spam_at = case when marking then now() else null end
  where id = ticket.id;
  perform public.record_support_event(ticket.id, case when marking then 'spam_marked' else 'spam_cleared' end, null, null);
  -- Step 3: a spammer gets nothing: emails still waiting are closed without sending.
  if marking then
    update public.support_ticket_emails set sent_at = now()
    where support_ticket_emails.ticket_id = ticket.id and sent_at is null;
  end if;
  perform public.log_staff_action(case when marking then 'support_ticket.spam_marked' else 'support_ticket.spam_cleared' end,
    'support_tickets', ticket.id::text, ticket.requester_user_id, null, null, null);
  return true;
end;
$$;

comment on function public.admin_mark_support_spam(bigint, boolean) is 'Staff mark a support ticket as spam or not; logged (S1-E11-13 criterion 13).';
revoke execute on function public.admin_mark_support_spam(bigint, boolean) from public, anon;
grant execute on function public.admin_mark_support_spam(bigint, boolean) to authenticated;

/* ---------- Merge ---------- */

/**
 * admin_merge_support_tickets: merges one ticket into another from the same person (criterion 9).
 * Every message moves to the ticket that stays; the merged ticket closes with a pointer to it,
 * its unsent emails are cancelled, the person is emailed the new number, both histories say so,
 * and the tags join.
 * Inputs: source_number (the ticket that goes), target_number (the ticket that stays).
 * Returns: the number that stays.
 * Errors: as require_support_ticket_for_staff(); check_violation for the same ticket twice, a
 *   closed or spam ticket, or two different people.
 * Logged as support_ticket.merged on both tickets.
 */
create or replace function public.admin_merge_support_tickets(source_number bigint, target_number bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.support_tickets := public.require_support_ticket_for_staff(source_number);
  target public.support_tickets := public.require_support_ticket_for_staff(target_number);
begin
  -- Step 1: two open tickets from the same person (their account, or the same address).
  if source.id = target.id then
    raise exception 'A ticket can''t be merged into itself.' using errcode = 'check_violation';
  end if;
  if source.status = 'closed' or target.status = 'closed' or source.is_spam or target.is_spam then
    raise exception 'Closed and spam tickets can''t be merged.' using errcode = 'check_violation';
  end if;
  if not ((source.requester_user_id is not null and source.requester_user_id = target.requester_user_id)
          or lower(coalesce(source.requester_email, '-')) = lower(coalesce(target.requester_email, '+'))) then
    raise exception 'Only tickets from the same person can be merged.' using errcode = 'check_violation';
  end if;
  -- Step 2: the messages move; what the source was still going to email is cancelled.
  update public.support_ticket_messages set ticket_id = target.id where ticket_id = source.id;
  update public.support_ticket_emails set sent_at = now() where ticket_id = source.id and sent_at is null;
  -- Step 3: the ticket that stays gets the tags of both and the latest activity.
  update public.support_tickets
  set tags = (select coalesce(array_agg(distinct tag order by tag), '{}') from unnest(target.tags || source.tags) as tag),
      last_message_at = greatest(target.last_message_at, source.last_message_at)
  where id = target.id;
  -- Step 4: the merged ticket closes and points to the one that stays.
  update public.support_tickets
  set status = 'closed', closed_at = now(), merged_into_ticket_id = target.id
  where id = source.id;
  perform public.record_support_event(source.id, 'merged_into', null, to_jsonb(target.number::text));
  perform public.record_support_event(target.id, 'merged_from', null, to_jsonb(source.number::text));
  -- Step 5: the person is told the new number (criterion 9).
  insert into public.support_ticket_emails (ticket_id, kind) values (source.id, 'merged');
  perform public.log_staff_action('support_ticket.merged', 'support_tickets', source.id::text, source.requester_user_id, null,
    jsonb_build_object('number', source.number), jsonb_build_object('merged_into', target.number));
  return target.number;
end;
$$;

comment on function public.admin_merge_support_tickets(bigint, bigint) is
  'Staff merge two support tickets from the same person; the person is told the new number (S1-E11-13 criterion 9).';
revoke execute on function public.admin_merge_support_tickets(bigint, bigint) from public, anon;
grant execute on function public.admin_merge_support_tickets(bigint, bigint) to authenticated;

/* ---------- The email intake, with spam and merges ---------- */

/**
 * support_ticket_for_email: as in part h2 (our Message-ID first, then the number in the subject,
 * only for the ticket's own person), now following a merge to the ticket that stays.
 */
create or replace function public.support_ticket_for_email(email_sender text, email_subject text, thread_headers text)
returns public.support_tickets
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_ticket public.support_tickets;
  sender_account uuid := public.account_for_email(email_sender);
begin
  -- Step 1: by our Message-ID.
  select tickets.* into found_ticket
  from public.support_ticket_emails as emails
  join public.support_tickets as tickets on tickets.id = emails.ticket_id
  where emails.message_token = any(array(
    select token_match[1] from regexp_matches(coalesce(thread_headers, ''), '<?(support-[0-9a-f-]{36})@', 'g') as token_match))
  order by emails.created_at desc limit 1;
  -- Step 2: by the number in the subject.
  if found_ticket.id is null then
    select tickets.* into found_ticket from public.support_tickets as tickets
    where tickets.number = (substring(coalesce(email_subject, '') from '#([0-9]{4,12})'))::bigint;
  end if;
  -- Step 3: a merged ticket's mail belongs to the ticket that stayed (one step: a ticket that
  -- stays is never merged again while it points nowhere else).
  if found_ticket.merged_into_ticket_id is not null then
    select * into found_ticket from public.support_tickets where id = found_ticket.merged_into_ticket_id;
  end if;
  -- Step 4: only the ticket's own person may write into it.
  if found_ticket.id is null
     or not (lower(coalesce(found_ticket.requester_email, '')) = lower(btrim(email_sender))
              or (sender_account is not null and found_ticket.requester_user_id = sender_account)) then
    return null;
  end if;
  return found_ticket;
end;
$$;

comment on function public.support_ticket_for_email(text, text, text) is
  'Internal: the support ticket an incoming email answers, following merges, only when it comes from that ticket''s person (S1-E11-13 criteria 3 and 9).';

/**
 * add_email_to_support_ticket: as in part h2; an email to a spam ticket is kept there without
 * opening it again.
 */
create or replace function public.add_email_to_support_ticket(ticket public.support_tickets, body text, email_message_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel, email_message_id)
  values (ticket.id, 'from_requester', ticket.requester_user_id, body, 'email', email_message_id);
  update public.support_tickets set last_message_at = now() where id = ticket.id;
  if ticket.status in ('solved', 'pending_on_user') and not ticket.is_spam then
    update public.support_tickets set status = 'open', solved_at = null where id = ticket.id;
    perform public.record_support_event(ticket.id, 'status', to_jsonb(ticket.status), to_jsonb('open'::text));
  end if;
  return ticket.number;
end;
$$;

/**
 * start_email_support_ticket: as in part h2, and a sender staff marked as spam before starts a
 * ticket that goes straight to Spam, without an acknowledgement (criterion 13).
 */
create or replace function public.start_email_support_ticket(
  sender text, subject text, body text, email_message_id text, is_automatic boolean, follow_up_of uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_account uuid := public.account_for_email(sender);
  sender_language text;
  is_known_spam boolean := public.support_sender_is_spam(sender, sender_account);
  new_ticket public.support_tickets;
  recent_acknowledgements integer;
begin
  -- Step 1: the language: the account's, or Romanian (the acknowledgement then carries both).
  select case when profiles.locale = 'en' then 'en' else 'ro' end into sender_language
  from public.profiles where profiles.id = sender_account;
  -- Step 2: the ticket, its first message and its first history line.
  insert into public.support_tickets (requester_user_id, requester_email, language, subject, channel,
    follow_up_of_ticket_id, is_spam, marked_spam_at)
  values (sender_account, lower(btrim(sender)), coalesce(sender_language, 'ro'), subject, 'email', follow_up_of,
    is_known_spam, case when is_known_spam then now() end)
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel, email_message_id)
  values (new_ticket.id, 'from_requester', sender_account, body, 'email', email_message_id);
  perform public.record_support_event(new_ticket.id, 'created', null, jsonb_strip_nulls(jsonb_build_object(
    'channel', 'email',
    'follow_up_of', (select tickets.number from public.support_tickets as tickets where tickets.id = follow_up_of))));
  -- Step 3: no acknowledgement for spam, a machine, or a loop.
  select count(*) into recent_acknowledgements
  from public.support_ticket_emails as emails
  join public.support_tickets as tickets on tickets.id = emails.ticket_id
  where emails.kind = 'acknowledgement' and emails.created_at > now() - interval '1 hour'
    and tickets.requester_email = new_ticket.requester_email;
  if is_known_spam or coalesce(is_automatic, false) or recent_acknowledgements >= 3 then
    return jsonb_build_object('number', new_ticket.number, 'acknowledged', false);
  end if;
  insert into public.support_ticket_emails (ticket_id, kind) values (new_ticket.id, 'acknowledgement');
  return jsonb_build_object('number', new_ticket.number, 'acknowledged', true);
end;
$$;

/**
 * support_email_json: as in part h2, plus merged_into: the number of the ticket a merged one now
 * lives in, for the 'merged' email.
 */
create or replace function public.support_email_json(queued public.support_ticket_emails, ticket public.support_tickets, address text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'email_id', queued.id, 'kind', queued.kind, 'to', address, 'language', ticket.language,
    'both_languages', ticket.requester_user_id is null and ticket.channel = 'email' and ticket.language = 'ro',
    'number', ticket.number, 'subject', ticket.subject,
    'body', (select messages.body from public.support_ticket_messages as messages where messages.id = queued.message_id),
    'message_token', queued.message_token,
    'in_reply_to', (select messages.email_message_id from public.support_ticket_messages as messages
                    where messages.ticket_id in (ticket.id, ticket.merged_into_ticket_id) and messages.kind = 'from_requester'
                      and messages.email_message_id is not null
                    order by messages.created_at desc limit 1),
    'has_account', ticket.requester_user_id is not null,
    'merged_into', (select tickets.number from public.support_tickets as tickets where tickets.id = ticket.merged_into_ticket_id));
$$;

/* ---------- The inbox: the Spam view ---------- */

/**
 * admin_support_view_counts: as in part h3a, plus spam; spam tickets count only there.
 * Returns: {mine, unassigned, all_open, pending_on_user, solved, spam}.
 */
create or replace function public.admin_support_view_counts()
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
      'mine', count(*) filter (where not tickets.is_spam and tickets.status not in ('solved', 'closed')
                                 and tickets.assigned_to_user_id = (select auth.uid())),
      'unassigned', count(*) filter (where not tickets.is_spam and tickets.status not in ('solved', 'closed')
                                       and tickets.assigned_to_user_id is null),
      'all_open', count(*) filter (where not tickets.is_spam and tickets.status not in ('solved', 'closed')),
      'pending_on_user', count(*) filter (where not tickets.is_spam and tickets.status = 'pending_on_user'),
      'solved', count(*) filter (where not tickets.is_spam and tickets.status = 'solved'),
      'spam', count(*) filter (where tickets.is_spam))
    from public.support_tickets as tickets);
end;
$$;

/**
 * admin_support_inbox: as in part h3a; status_filter 'spam' shows the Spam view, and every other
 * view leaves spam out.
 */
create or replace function public.admin_support_inbox(status_filter text default null, assigned_filter text default null)
returns table (
  number bigint, subject text, status public.support_ticket_status, priority public.support_ticket_priority,
  category public.support_ticket_category, channel public.support_ticket_channel, requester_handle text,
  email_only boolean, assigned_handle text, assigned_to_me boolean, message_count integer,
  last_message_at timestamptz, created_at timestamptz, first_reply_due_at timestamptz,
  first_replied_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('support_tickets', 'view') then
    raise exception 'Only support staff can read tickets.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select tickets.number, tickets.subject, tickets.status, tickets.priority, tickets.category, tickets.channel,
      requester.handle, tickets.requester_user_id is null, assignee.handle,
      coalesce(tickets.assigned_to_user_id = (select auth.uid()), false),
      (select count(*)::integer from public.support_ticket_messages as messages
       where messages.ticket_id = tickets.id and messages.kind <> 'internal_note'),
      tickets.last_message_at, tickets.created_at,
      public.support_first_reply_due(tickets.created_at), tickets.first_replied_at
    from public.support_tickets as tickets
    left join public.profiles as requester on requester.id = tickets.requester_user_id
    left join public.profiles as assignee on assignee.id = tickets.assigned_to_user_id
    where tickets.is_spam = coalesce(status_filter = 'spam', false)
      and (case
             when nullif(status_filter, '') is null then tickets.status not in ('solved', 'closed')
             when status_filter in ('all', 'spam') then true
             else tickets.status::text = status_filter
           end)
      and (assigned_filter is null
           or (assigned_filter = 'mine' and tickets.assigned_to_user_id = (select auth.uid()))
           or (assigned_filter = 'nobody' and tickets.assigned_to_user_id is null))
    order by array_position(array['urgent', 'high', 'normal', 'low'], tickets.priority::text), tickets.last_message_at;
end;
$$;

/* ---------- The staff ticket and the member's ticket ---------- */

/**
 * admin_support_ticket: as in part h3b, plus whether it is spam and the ticket it was merged into.
 */
create or replace function public.admin_support_ticket(ticket_number bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets;
begin
  -- Step 1: support staff only; an unknown number answers nothing.
  if not public.staff_may('support_tickets', 'view') then
    raise exception 'Only support staff can read tickets.' using errcode = 'insufficient_privilege';
  end if;
  select * into ticket from public.support_tickets where support_tickets.number = ticket_number;
  if ticket.id is null then
    return null;
  end if;
  -- Step 2: the view goes in the audit log, without the words.
  perform public.log_staff_action('support_ticket.viewed', 'support_tickets', ticket.id::text,
    ticket.requester_user_id, null, null, null);
  -- Step 3: the ticket, its messages, its history and the person's panel.
  return (
    select jsonb_build_object(
      'number', ticket.number, 'subject', ticket.subject, 'status', ticket.status,
      'priority', ticket.priority, 'category', ticket.category, 'channel', ticket.channel,
      'language', ticket.language, 'tags', to_jsonb(ticket.tags), 'created_at', ticket.created_at,
      'is_spam', ticket.is_spam,
      'merged_into', (select later.number from public.support_tickets as later where later.id = ticket.merged_into_ticket_id),
      'follow_up_of', (select earlier.number from public.support_tickets as earlier where earlier.id = ticket.follow_up_of_ticket_id),
      'assigned_handle', (select profiles.handle from public.profiles where profiles.id = ticket.assigned_to_user_id),
      'requester', jsonb_build_object(
        'handle', requester.handle,
        'display_name', case when requester.id is null then null
                             else public.display_name(requester.handle, requester.pen_name) end,
        -- Staff may see the user ID (architecture 1.6), so the panel links to Users.
        'user_id', ticket.requester_user_id,
        'email_only', ticket.requester_user_id is null,
        'masked_email', public.masked_email(ticket.requester_email),
        'age_group', case when ticket.requester_user_id is null then null
                          else public.age_band_of(ticket.requester_user_id) end),
      'messages', coalesce((select jsonb_agg(jsonb_build_object('kind', messages.kind,
          'author_handle', author.handle, 'body', messages.body, 'channel', messages.channel,
          'emailed', public.support_message_email_state(messages.id),
          'at', messages.created_at) order by messages.created_at, messages.id)
        from public.support_ticket_messages as messages
        left join public.profiles as author on author.id = messages.author_user_id
        where messages.ticket_id = ticket.id), '[]'::jsonb),
      'history', public.support_ticket_history(ticket.id))
    from (select 1) as one_row
    left join public.profiles as requester on requester.id = ticket.requester_user_id);
end;
$$;

/**
 * my_support_ticket: as in part h1, plus merged_into: the number the person finds their
 * messages under after a merge (criterion 9).
 */
create or replace function public.my_support_ticket(ticket_number bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', tickets.number, 'subject', tickets.subject, 'status', tickets.status,
    'category', tickets.category, 'created_at', tickets.created_at,
    'merged_into', (select later.number from public.support_tickets as later where later.id = tickets.merged_into_ticket_id),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
        'from_team', messages.kind = 'staff_reply', 'body', messages.body, 'at', messages.created_at)
        order by messages.created_at)
      from public.support_ticket_messages as messages
      where messages.ticket_id = tickets.id and messages.kind <> 'internal_note'), '[]'::jsonb))
  from public.support_tickets as tickets
  where tickets.number = ticket_number and tickets.requester_user_id = (select auth.uid());
$$;
