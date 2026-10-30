/*
 * Migration: moderator mail (story S1-E10-11; DSA art. 12: a single point of contact for users).
 *
 * How it works: a member writes to the moderation team from "Contact the moderators"; the message
 * goes to one shared inbox, never to one moderator (criterion 1). Staff assign a thread, add
 * internal notes the member never sees and reply as "The moderation team", never under their own
 * name (criterion 2). The member gets a notification for each reply.
 * Decision (rule 8): the shared inbox lives in our admin site until the helpdesk (S1-E11-13) comes;
 * that story adds the outside helpdesk behind an adapter.
 * What it adds:
 *   moderator_mail_threads, moderator_mail_messages   the threads and their messages
 *   send_moderator_mail(), reply_moderator_mail(),     the member's side: write, reply, list, read;
 *   my_moderator_mail(), my_moderator_mail_thread()   members read only through these, so a
 *                                                      staff member's ID or name never reaches them
 *   admin_moderator_mail_inbox(), admin_moderator_mail_thread(), admin_assign_mail(),
 *   admin_reply_mail(), admin_set_mail_status()        the staff side, each logged
 * Who calls it: src/features/moderator-mail/ (members) and src/features/moderation/ (staff).
 */

/* ---------- The tables ---------- */

create sequence public.moderator_mail_reference_seq;
comment on sequence public.moderator_mail_reference_seq is 'Numbers moderator mail threads: M-000123 (S1-E10-11).';

create table public.moderator_mail_threads (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  -- The member who wrote (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  subject text not null,
  -- open: the team owes an answer; waiting: the team answered, waiting for the member; closed.
  status text not null default 'open',
  -- The moderator looking after it, or nobody yet.
  assigned_to_user_id uuid references public.profiles (id),
  -- The statement of reasons the member asks about, if any (S1-E10-04).
  statement_id uuid references public.statements_of_reasons (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderator_mail_threads_status_is_known check (status in ('open', 'waiting', 'closed')),
  constraint moderator_mail_threads_subject_length check (char_length(btrim(subject)) between 1 and 150)
);

comment on table public.moderator_mail_threads is
  'kind: user_action
Messages from members to the moderation team: one shared inbox (S1-E10-11; DSA art. 12).';

create index moderator_mail_threads_user_id_idx on public.moderator_mail_threads (user_id, last_message_at desc);
create index moderator_mail_threads_status_idx on public.moderator_mail_threads (status, last_message_at);
create trigger moderator_mail_threads_refuse_user_id_change
  before update on public.moderator_mail_threads
  for each row execute function public.refuse_user_id_change('user_id');
create trigger moderator_mail_threads_set_updated_at
  before update on public.moderator_mail_threads
  for each row execute function public.set_updated_at();

create table public.moderator_mail_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.moderator_mail_threads (id) on delete cascade,
  -- Who wrote it: the member, or the staff member who answered for the team (rule 15).
  user_id uuid not null references public.profiles (id),
  body text not null,
  -- A staff note the member never sees (criterion 2).
  is_internal_note boolean not null default false,
  -- Written for the team: the member sees "The moderation team", never a name.
  from_team boolean not null default false,
  created_at timestamptz not null default now(),
  -- Messages are never edited; the column is here because every table has one.
  updated_at timestamptz not null default now(),
  constraint moderator_mail_messages_body_length check (char_length(btrim(body)) between 1 and 4000),
  constraint moderator_mail_messages_notes_are_from_team check (not is_internal_note or from_team)
);

comment on table public.moderator_mail_messages is
  'kind: user_action
The messages of a moderator mail thread, with staff''s internal notes (S1-E10-11).';

create index moderator_mail_messages_thread_idx on public.moderator_mail_messages (thread_id, created_at);
create trigger moderator_mail_messages_refuse_user_id_change
  before update on public.moderator_mail_messages
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.moderator_mail_threads enable row level security;
alter table public.moderator_mail_messages enable row level security;

/**
 * moderator_mail_threads_select_moderation: moderation staff read every thread in the shared
 * inbox (criterion 1). Members read their own only through my_moderator_mail(), so the
 * assignee's ID never reaches them.
 */
create policy moderator_mail_threads_select_moderation
  on public.moderator_mail_threads for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy moderator_mail_threads_select_moderation on public.moderator_mail_threads is
  'Allows moderation staff to read every moderator mail thread: one shared inbox (S1-E10-11).';

/**
 * moderator_mail_messages_select_moderation: moderation staff read every message and note. Members
 * read their thread through my_moderator_mail_thread(), which leaves notes and staff out.
 */
create policy moderator_mail_messages_select_moderation
  on public.moderator_mail_messages for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy moderator_mail_messages_select_moderation on public.moderator_mail_messages is
  'Allows moderation staff to read every moderator mail message and internal note (S1-E10-11).';

-- Reads only, for staff; every write goes through the functions below.
grant select on public.moderator_mail_threads to authenticated;
grant select on public.moderator_mail_messages to authenticated;

/* ---------- The member's side ---------- */

/**
 * clean_mail_text: trims a subject or message and refuses an empty one. Internal.
 * Input: the text and how long it may be. Errors: check_violation with a plain message.
 */
create or replace function public.clean_mail_text(raw_text text, longest integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text := btrim(coalesce(raw_text, ''));
begin
  if cleaned = '' then
    raise exception 'Write something first.' using errcode = 'check_violation';
  end if;
  if char_length(cleaned) > longest then
    raise exception 'This can be at most % characters.', longest using errcode = 'check_violation';
  end if;
  return cleaned;
end;
$$;

comment on function public.clean_mail_text(text, integer) is 'Internal: trims and checks a moderator mail text (S1-E10-11).';
revoke execute on function public.clean_mail_text(text, integer) from public, anon, authenticated;

/**
 * send_moderator_mail: a member writes to the moderation team (criterion 1).
 * Inputs: subject (up to 150 characters), body (up to 4,000), statement_reference (optional: the
 *   statement of reasons they ask about, S-000123; it must be theirs).
 * Returns: {reference} of the new thread.
 * Errors: insufficient_privilege when signed out; check_violation for an empty or long text or a
 *   statement that isn't theirs; program_limit_exceeded over the hourly limit (S1-E10-12).
 * Any signed-in account may write, a suspended one included: it may want to ask about a decision.
 */
create or replace function public.send_moderator_mail(subject text, body text, statement_reference text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_subject text := public.clean_mail_text(subject, 150);
  clean_body text := public.clean_mail_text(body, 4000);
  linked_statement_id uuid;
  new_thread public.moderator_mail_threads;
begin
  -- Step 1: signed in; the statement, when named, is theirs.
  if caller_id is null then
    raise exception 'Log in to write to the moderators.' using errcode = 'insufficient_privilege';
  end if;
  if nullif(btrim(statement_reference), '') is not null then
    select statements_of_reasons.id into linked_statement_id from public.statements_of_reasons
    where statements_of_reasons.reference = upper(btrim(statement_reference)) and statements_of_reasons.user_id = caller_id;
    if linked_statement_id is null then
      raise exception 'That decision isn''t one of yours.' using errcode = 'check_violation';
    end if;
  end if;
  -- Step 2: the limit (S1-E10-12), then the thread and its first message.
  perform public.take_rate_limit('moderator_mail');
  insert into public.moderator_mail_threads (reference, user_id, subject, statement_id)
  values ('M-' || lpad(nextval('public.moderator_mail_reference_seq')::text, 6, '0'), caller_id, clean_subject, linked_statement_id)
  returning * into new_thread;
  insert into public.moderator_mail_messages (thread_id, user_id, body) values (new_thread.id, caller_id, clean_body);
  return jsonb_build_object('reference', new_thread.reference);
end;
$$;

comment on function public.send_moderator_mail(text, text, text) is
  'A member writes to the moderation team''s shared inbox (S1-E10-11).';
revoke execute on function public.send_moderator_mail(text, text, text) from public, anon;
grant execute on function public.send_moderator_mail(text, text, text) to authenticated;

/**
 * reply_moderator_mail: the member answers in their own thread; a closed thread opens again.
 * Inputs: thread_reference (M-000123), body. Returns: true.
 * Errors: insufficient_privilege when signed out; no_data_found for a thread that isn't theirs;
 *   check_violation for the text; program_limit_exceeded over the limit.
 */
create or replace function public.reply_moderator_mail(thread_reference text, body text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_body text := public.clean_mail_text(body, 4000);
  thread public.moderator_mail_threads;
begin
  if caller_id is null then
    raise exception 'Log in to write to the moderators.' using errcode = 'insufficient_privilege';
  end if;
  select * into thread from public.moderator_mail_threads
  where reference = upper(btrim(thread_reference)) and user_id = caller_id for update;
  if thread.id is null then
    raise exception 'There is no such conversation.' using errcode = 'no_data_found';
  end if;
  perform public.take_rate_limit('moderator_mail');
  insert into public.moderator_mail_messages (thread_id, user_id, body) values (thread.id, caller_id, clean_body);
  update public.moderator_mail_threads set status = 'open', last_message_at = now() where id = thread.id;
  return true;
end;
$$;

comment on function public.reply_moderator_mail(text, text) is
  'The member answers in their own moderator mail thread; it opens again for the team (S1-E10-11).';
revoke execute on function public.reply_moderator_mail(text, text) from public, anon;
grant execute on function public.reply_moderator_mail(text, text) to authenticated;

/**
 * my_moderator_mail: the caller's threads, newest first.
 * Returns: reference, subject, status, statement_reference, last_message_at and whether the last
 *   message is the team's (so the list can say "The moderation team replied").
 */
create or replace function public.my_moderator_mail()
returns table (
  reference text, subject text, status text, statement_reference text,
  last_message_at timestamptz, team_replied_last boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select threads.reference, threads.subject, threads.status, statements_of_reasons.reference,
    threads.last_message_at,
    coalesce((select messages.from_team from public.moderator_mail_messages as messages
              where messages.thread_id = threads.id and not messages.is_internal_note
              order by messages.created_at desc limit 1), false)
  from public.moderator_mail_threads as threads
  left join public.statements_of_reasons on statements_of_reasons.id = threads.statement_id
  where threads.user_id = (select auth.uid())
  order by threads.last_message_at desc;
$$;

comment on function public.my_moderator_mail() is 'The caller''s moderator mail threads, newest first (S1-E10-11).';
revoke execute on function public.my_moderator_mail() from public, anon;
grant execute on function public.my_moderator_mail() to authenticated;

/**
 * my_moderator_mail_thread: one of the caller's threads with its messages: never an internal note
 * and never who on the team wrote (criterion 2: replies come from "The moderation team").
 * Input: thread_reference. Returns: {reference, subject, status, statement_reference, messages:
 *   [{from_team, body, at}]} or null when the thread isn't theirs.
 */
create or replace function public.my_moderator_mail_thread(thread_reference text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', threads.reference, 'subject', threads.subject, 'status', threads.status,
    'statement_reference', (select statements_of_reasons.reference from public.statements_of_reasons
                            where statements_of_reasons.id = threads.statement_id),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('from_team', messages.from_team,
        'body', messages.body, 'at', messages.created_at) order by messages.created_at)
      from public.moderator_mail_messages as messages
      where messages.thread_id = threads.id and not messages.is_internal_note), '[]'::jsonb))
  from public.moderator_mail_threads as threads
  where threads.reference = upper(btrim(thread_reference)) and threads.user_id = (select auth.uid());
$$;

comment on function public.my_moderator_mail_thread(text) is
  'One of the caller''s moderator mail threads, without notes or staff names (S1-E10-11).';
revoke execute on function public.my_moderator_mail_thread(text) from public, anon;
grant execute on function public.my_moderator_mail_thread(text) to authenticated;

/* ---------- The staff side ---------- */

/**
 * require_mail_thread_for_staff: the thread a staff member works on, locked.
 * Input: thread_reference. Returns: the thread.
 * Errors: insufficient_privilege unless the caller may act on moderation; no_data_found for an
 *   unknown reference. Internal.
 */
create or replace function public.require_mail_thread_for_staff(thread_reference text)
returns public.moderator_mail_threads
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.moderator_mail_threads;
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderation staff can answer moderator mail.' using errcode = 'insufficient_privilege';
  end if;
  select * into thread from public.moderator_mail_threads where reference = upper(btrim(thread_reference)) for update;
  if thread.id is null then
    raise exception 'There is no such conversation.' using errcode = 'no_data_found';
  end if;
  return thread;
end;
$$;

comment on function public.require_mail_thread_for_staff(text) is 'Internal: the moderator mail thread staff act on, locked (S1-E10-11).';
revoke execute on function public.require_mail_thread_for_staff(text) from public, anon, authenticated;

/**
 * admin_moderator_mail_inbox: the shared inbox, open threads first, oldest waiting first.
 * Inputs (optional): status_filter ('open', 'waiting', 'closed'), assigned_filter ('mine',
 *   'nobody'). Returns: reference, subject, status, the member's username, the assignee's username,
 *   whether it is assigned to the caller, the number of messages and the last message time.
 * Errors: insufficient_privilege unless the caller may view moderation.
 */
create or replace function public.admin_moderator_mail_inbox(status_filter text default null, assigned_filter text default null)
returns table (
  reference text, subject text, status text, member_handle text, assigned_handle text,
  assigned_to_me boolean, message_count integer, last_message_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff can read moderator mail.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select threads.reference, threads.subject, threads.status, member.handle, assignee.handle,
      coalesce(threads.assigned_to_user_id = (select auth.uid()), false),
      (select count(*)::integer from public.moderator_mail_messages where moderator_mail_messages.thread_id = threads.id),
      threads.last_message_at
    from public.moderator_mail_threads as threads
    join public.profiles as member on member.id = threads.user_id
    left join public.profiles as assignee on assignee.id = threads.assigned_to_user_id
    where (status_filter is null or threads.status = status_filter)
      and (assigned_filter is null
           or (assigned_filter = 'mine' and threads.assigned_to_user_id = (select auth.uid()))
           or (assigned_filter = 'nobody' and threads.assigned_to_user_id is null))
    order by (threads.status = 'closed'), (threads.status = 'waiting'), threads.last_message_at;
end;
$$;

comment on function public.admin_moderator_mail_inbox(text, text) is
  'The moderation team''s shared inbox, open threads first (S1-E10-11).';
revoke execute on function public.admin_moderator_mail_inbox(text, text) from public, anon;
grant execute on function public.admin_moderator_mail_inbox(text, text) to authenticated;

/**
 * admin_moderator_mail_thread: one thread for staff, with every message and note and who wrote
 * each. Input: thread_reference. Returns: {reference, subject, status, member_handle,
 *   assigned_handle, statement_reference, messages: [{author_handle, from_team, is_internal_note,
 *   body, at}]}. Errors: insufficient_privilege unless the caller may view moderation.
 */
create or replace function public.admin_moderator_mail_thread(thread_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff can read moderator mail.' using errcode = 'insufficient_privilege';
  end if;
  return (
    select jsonb_build_object(
      'reference', threads.reference, 'subject', threads.subject, 'status', threads.status,
      'member_handle', member.handle, 'assigned_handle', assignee.handle,
      'statement_reference', (select statements_of_reasons.reference from public.statements_of_reasons
                              where statements_of_reasons.id = threads.statement_id),
      'messages', coalesce((select jsonb_agg(jsonb_build_object('author_handle', author.handle,
          'from_team', messages.from_team, 'is_internal_note', messages.is_internal_note,
          'body', messages.body, 'at', messages.created_at) order by messages.created_at)
        from public.moderator_mail_messages as messages
        join public.profiles as author on author.id = messages.user_id
        where messages.thread_id = threads.id), '[]'::jsonb))
    from public.moderator_mail_threads as threads
    join public.profiles as member on member.id = threads.user_id
    left join public.profiles as assignee on assignee.id = threads.assigned_to_user_id
    where threads.reference = upper(btrim(thread_reference)));
end;
$$;

comment on function public.admin_moderator_mail_thread(text) is
  'One moderator mail thread for staff, with notes and authors (S1-E10-11).';
revoke execute on function public.admin_moderator_mail_thread(text) from public, anon;
grant execute on function public.admin_moderator_mail_thread(text) to authenticated;

/**
 * admin_assign_mail: assigns a thread to a moderator, or to nobody (criterion 2).
 * Inputs: thread_reference; assignee_handle (a staff member who may act on moderation, or null).
 * Returns: true. Errors: as require_mail_thread_for_staff(); check_violation for someone who
 *   can't answer moderator mail. Logged as moderator_mail.assigned.
 */
create or replace function public.admin_assign_mail(thread_reference text, assignee_handle text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.moderator_mail_threads := public.require_mail_thread_for_staff(thread_reference);
  assignee_id uuid;
begin
  if nullif(btrim(assignee_handle), '') is not null then
    select profiles.id into assignee_id from public.profiles
    join public.staff_roles on staff_roles.user_id = profiles.id
    join public.staff_role_areas on staff_role_areas.role = staff_roles.role
      and staff_role_areas.area = 'moderation' and staff_role_areas.access = 'act'
    where profiles.handle = btrim(assignee_handle, ' @') limit 1;
    if assignee_id is null then
      raise exception '@% can''t answer moderator mail.', btrim(assignee_handle, ' @') using errcode = 'check_violation';
    end if;
  end if;
  update public.moderator_mail_threads set assigned_to_user_id = assignee_id where id = thread.id;
  perform public.log_staff_action('moderator_mail.assigned', 'moderator_mail_threads', thread.id::text, thread.user_id, null,
    jsonb_build_object('assigned_to_user_id', thread.assigned_to_user_id), jsonb_build_object('assigned_to_user_id', assignee_id));
  return true;
end;
$$;

comment on function public.admin_assign_mail(text, text) is 'Assigns a moderator mail thread to a moderator or nobody, logged (S1-E10-11).';
revoke execute on function public.admin_assign_mail(text, text) from public, anon;
grant execute on function public.admin_assign_mail(text, text) to authenticated;

/**
 * admin_reply_mail: staff answer as "The moderation team", or add an internal note (criterion 2).
 * Inputs: thread_reference; body (up to 4,000 characters); is_note (true: only staff see it).
 * Returns: true. A reply marks the thread "waiting" for the member and notifies them; a note
 *   changes nothing they can see. Errors: as require_mail_thread_for_staff(); check_violation for
 *   the text. Logged as moderator_mail.replied or moderator_mail.noted, without the words.
 */
create or replace function public.admin_reply_mail(thread_reference text, body text, is_note boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.moderator_mail_threads := public.require_mail_thread_for_staff(thread_reference);
  clean_body text := public.clean_mail_text(body, 4000);
begin
  insert into public.moderator_mail_messages (thread_id, user_id, body, is_internal_note, from_team)
  values (thread.id, (select auth.uid()), clean_body, coalesce(is_note, false), true);
  if not coalesce(is_note, false) then
    update public.moderator_mail_threads set status = 'waiting', last_message_at = now() where id = thread.id;
    perform public.notify(thread.user_id, 'moderator_mail_reply', null, jsonb_build_object('mail_thread_id', thread.id));
  end if;
  perform public.log_staff_action(
    case when coalesce(is_note, false) then 'moderator_mail.noted' else 'moderator_mail.replied' end,
    'moderator_mail_threads', thread.id::text, thread.user_id, null, null, null);
  return true;
end;
$$;

comment on function public.admin_reply_mail(text, text, boolean) is
  'Staff reply as the moderation team, or add an internal note; logged without the words (S1-E10-11).';
revoke execute on function public.admin_reply_mail(text, text, boolean) from public, anon;
grant execute on function public.admin_reply_mail(text, text, boolean) to authenticated;

/**
 * admin_set_mail_status: marks a thread open, waiting or closed.
 * Inputs: thread_reference; new_status. Returns: true. Errors: as require_mail_thread_for_staff();
 *   check_violation for an unknown status. Logged as moderator_mail.status.
 */
create or replace function public.admin_set_mail_status(thread_reference text, new_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.moderator_mail_threads := public.require_mail_thread_for_staff(thread_reference);
begin
  if new_status not in ('open', 'waiting', 'closed') then
    raise exception 'Unknown status "%".', new_status using errcode = 'check_violation';
  end if;
  update public.moderator_mail_threads set status = new_status where id = thread.id;
  perform public.log_staff_action('moderator_mail.status', 'moderator_mail_threads', thread.id::text, thread.user_id, null,
    jsonb_build_object('status', thread.status), jsonb_build_object('status', new_status));
  return true;
end;
$$;

comment on function public.admin_set_mail_status(text, text) is 'Marks a moderator mail thread open, waiting or closed, logged (S1-E10-11).';
revoke execute on function public.admin_set_mail_status(text, text) from public, anon;
grant execute on function public.admin_set_mail_status(text, text) to authenticated;
