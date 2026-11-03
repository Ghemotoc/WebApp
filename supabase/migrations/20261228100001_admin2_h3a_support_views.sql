/*
 * Migration: support tickets, part 3a: views with counts, the first-reply timer and auto-solve
 * (story S1-E11-13, part 13b; bundle ADMIN-2h3a; criteria 6 and 7).
 *
 * How it works:
 * - Views: the inbox's saved views (My tickets, Unassigned, All open, Pending on user, Solved)
 *   are presets of the status and assignee filters it already has; admin_support_view_counts()
 *   gives their counts. The Spam view comes with marking spam in part h4.
 * - First-reply timer: each ticket's answer is due a number of working days after it arrived
 *   (the setting support_first_reply_target_working_days, 1 by default: the story's proposal),
 *   counted Monday to Friday in Romanian time. Public holidays are not skipped yet. The inbox
 *   shows the due time until staff first answer.
 * - Auto-solve: a ticket left "pending on user" for 7 days (support_auto_solve_days) is solved by
 *   the system with a polite email (a new outbox kind, auto_solved); the person's answer opens it
 *   again (parts h1 and h2).
 * What it adds: two settings, support_first_reply_due(), admin_support_view_counts(),
 *   admin_support_inbox() with the due time, auto_solve_support_tickets() on pg_cron (hourly).
 * Who calls it: src/features/support/ (the inbox), pg_cron, server/support-emails.ts (the email).
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('support_first_reply_target_working_days', '1'::jsonb, false,
   'Working days (Monday to Friday, Romanian time) within which staff should first answer a support ticket (S1-E11-13 criterion 6; proposal).'),
  ('support_auto_solve_days', '7'::jsonb, false,
   'Days a support ticket may wait for the person before it is solved automatically with a polite email (S1-E11-13 criterion 7).')
on conflict (key) do nothing;

/* ---------- The first-reply timer ---------- */

/**
 * support_first_reply_due: when the first answer to a ticket is due: the arrival time plus the
 * target in working days, counting only Monday to Friday in Romanian time (a ticket that arrives
 * on Saturday with a one-day target is due on Monday at the same time). Public holidays are not
 * skipped (a follow-up once a holiday list exists).
 * Input: arrived_at. Returns: the due time.
 */
create or replace function public.support_first_reply_due(arrived_at timestamptz)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  working_days integer := greatest(coalesce((public.setting_value('support_first_reply_target_working_days'))::integer, 1), 0);
  local_time timestamp := arrived_at at time zone 'Europe/Bucharest';
  counted integer := 0;
begin
  -- Step through the calendar a day at a time, counting only weekdays.
  while counted < working_days loop
    local_time := local_time + interval '1 day';
    if extract(isodow from local_time) < 6 then
      counted := counted + 1;
    end if;
  end loop;
  return local_time at time zone 'Europe/Bucharest';
end;
$$;

comment on function public.support_first_reply_due(timestamptz) is
  'Internal: when the first answer to a support ticket is due, in working days (S1-E11-13 criterion 6).';
revoke execute on function public.support_first_reply_due(timestamptz) from public, anon, authenticated;

/* ---------- Views and counts ---------- */

/**
 * admin_support_view_counts: how many tickets each saved view holds (criterion 6).
 * Returns: {mine, unassigned, all_open, pending_on_user, solved}; "open" means not solved or
 *   closed, as the inbox's first view.
 * Errors: insufficient_privilege unless the caller may view support tickets.
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
      'mine', count(*) filter (where tickets.status not in ('solved', 'closed')
                                 and tickets.assigned_to_user_id = (select auth.uid())),
      'unassigned', count(*) filter (where tickets.status not in ('solved', 'closed')
                                       and tickets.assigned_to_user_id is null),
      'all_open', count(*) filter (where tickets.status not in ('solved', 'closed')),
      'pending_on_user', count(*) filter (where tickets.status = 'pending_on_user'),
      'solved', count(*) filter (where tickets.status = 'solved'))
    from public.support_tickets as tickets);
end;
$$;

comment on function public.admin_support_view_counts() is 'The counts of the support inbox''s saved views (S1-E11-13 criterion 6).';
revoke execute on function public.admin_support_view_counts() from public, anon;
grant execute on function public.admin_support_view_counts() to authenticated;

-- The inbox gains the first-reply columns, so its return type changes.
drop function public.admin_support_inbox(text, text);

/**
 * admin_support_inbox: the one inbox, as in part h1, now with each ticket's first-reply due time
 * and when staff first answered (criterion 6).
 * Inputs (optional): status_filter (a status, 'all', or empty for every ticket not yet solved or
 *   closed); assigned_filter ('mine' or 'nobody').
 * Returns: as in part h1, plus first_reply_due_at and first_replied_at.
 * Errors: insufficient_privilege unless the caller may view support tickets.
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
    where (case
             when nullif(status_filter, '') is null then tickets.status not in ('solved', 'closed')
             when status_filter = 'all' then true
             else tickets.status::text = status_filter
           end)
      and (assigned_filter is null
           or (assigned_filter = 'mine' and tickets.assigned_to_user_id = (select auth.uid()))
           or (assigned_filter = 'nobody' and tickets.assigned_to_user_id is null))
    order by array_position(array['urgent', 'high', 'normal', 'low'], tickets.priority::text), tickets.last_message_at;
end;
$$;

comment on function public.admin_support_inbox(text, text) is
  'The support inbox, most urgent and longest waiting first, with the first-reply due time (S1-E11-13 criteria 6).';
revoke execute on function public.admin_support_inbox(text, text) from public, anon;
grant execute on function public.admin_support_inbox(text, text) to authenticated;

/* ---------- Auto-solve ---------- */

-- The polite email after an automatic solve is a third kind of ticket email.
alter table public.support_ticket_emails drop constraint support_ticket_emails_kind_is_known;
alter table public.support_ticket_emails add constraint support_ticket_emails_kind_is_known
  check (kind in ('acknowledgement', 'staff_reply', 'auto_solved'));
-- Only a staff answer carries a message; the other kinds are written from the ticket alone.
alter table public.support_ticket_emails drop constraint support_ticket_emails_reply_has_message;
alter table public.support_ticket_emails add constraint support_ticket_emails_reply_has_message
  check (kind <> 'staff_reply' or message_id is not null);

/**
 * auto_solve_support_tickets: solves every ticket that has waited for the person longer than the
 * support_auto_solve_days setting (7 by default) since the last message, with a line in its
 * history by the system and a polite email (criterion 7). The person's answer opens it again.
 * Returns: how many were solved. Internal: pg_cron, every hour.
 */
create or replace function public.auto_solve_support_tickets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  wait_days integer := greatest(coalesce((public.setting_value('support_auto_solve_days'))::integer, 7), 1);
  ticket public.support_tickets;
  solved_count integer := 0;
begin
  for ticket in
    select * from public.support_tickets
    where status = 'pending_on_user' and last_message_at < now() - make_interval(days => wait_days)
    for update skip locked
  loop
    update public.support_tickets set status = 'solved', solved_at = now() where id = ticket.id;
    -- No one is signed in here, so the history says "the system".
    insert into public.support_ticket_events (ticket_id, actor_user_id, change, value_before, value_after)
    values (ticket.id, null, 'status', to_jsonb('pending_on_user'::text), to_jsonb('solved'::text));
    insert into public.support_ticket_emails (ticket_id, kind) values (ticket.id, 'auto_solved');
    solved_count := solved_count + 1;
  end loop;
  return solved_count;
end;
$$;

comment on function public.auto_solve_support_tickets() is
  'Internal: solves support tickets left waiting for the person, with a polite email (S1-E11-13 criterion 7); pg_cron hourly.';
revoke execute on function public.auto_solve_support_tickets() from public, anon, authenticated;

select cron.schedule('auto-solve-support-tickets', '23 * * * *', 'select public.auto_solve_support_tickets()');
