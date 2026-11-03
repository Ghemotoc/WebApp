/*
 * Migration: support tickets inside the admin site, part 1 (story S1-E11-13, part 13a; bundle
 * ADMIN-2h1; Robert, 17 Oct 2026: "I do want the ticketing system to be integrated in the admin
 * portal where everything is available").
 *
 * How it works: every support request becomes a numbered ticket (#1001 and up). A member writes
 * from "Your support requests" in Settings; a Contact us message is saved as a ticket by our
 * server (signed, like the public report form); an email arrives through the inbound webhook in
 * part h2. Staff with the support_tickets area (owner, admin and support; proposal, because
 * architecture 1.8.3 has no row for tickets) see one inbox, open a ticket, change its status,
 * priority, category, assignee and tags (each change kept in the ticket's history, criterion 4),
 * answer or add an internal note the person never sees (criterion 5). The person's panel shows
 * the age group only, never the year of birth or the age check (criterion 12).
 * OPEN, not chosen here (CLAUDE.md rule 13): which outside helpdesk, if any, sits behind these
 * screens. Our own tables hold the tickets; part h2 puts email in and out behind an adapter.
 * Privacy: a ticket holds personal data (an email address for someone without an account, and
 * what they wrote). Only the support_tickets area reads it; revealing an address is logged
 * (architecture 1.8.3); retention and the data export come in part h4 (2 years after closing,
 * a proposal in the story). Nothing here logs an email or the words (CLAUDE.md rule 12).
 * What it adds:
 *   support_tickets, support_ticket_messages, support_ticket_events   the tickets, their messages
 *                                                                     and their history
 *   create_my_support_ticket(), reply_my_support_ticket(),            the member's side
 *   my_support_tickets(), my_support_ticket()
 *   submit_contact_ticket()                                           Contact us, from our server
 *   admin_support_inbox(), admin_support_ticket(),                    the staff side, each logged
 *   admin_update_support_ticket(), admin_reply_support_ticket(),
 *   admin_reveal_ticket_email()
 * Who calls it: src/features/support/ (members and staff) and server/contact.ts.
 */

/* ---------- The staff area and the rate limit ---------- */

-- Owner, admin and support answer tickets (proposal: architecture 1.8.3 lists support for
-- data requests and user look-ups, the work tickets lead to). Moderators reach a ticket's
-- problem through "Convert to report" (part h4), not the inbox.
insert into public.staff_role_areas (role, area, access) values
  ('owner', 'support_tickets', 'act'),
  ('admin', 'support_tickets', 'act'),
  ('support', 'support_tickets', 'act')
on conflict (role, area) do nothing;

-- How many requests an hour a member may start (S1-E10-12's pattern; proposal).
update public.settings
set value = value || '{"support_ticket": {"new_account": 3, "older_account": 10}}'::jsonb
where key = 'rate_limits';

/* ---------- The tables ---------- */

create sequence public.support_ticket_number_seq start with 1001;
comment on sequence public.support_ticket_number_seq is 'Numbers support tickets: #1001 and up (S1-E11-13 criterion 1).';

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  -- The number the person quotes (#1042); never reused.
  number bigint not null unique default nextval('public.support_ticket_number_seq'),
  -- The person asking, when they have an account; empty for an "email only" ticket. Never shown
  -- publicly (CLAUDE.md rule 15); the role name says who it is.
  requester_user_id uuid references public.profiles (id),
  -- Where to answer someone without an account, or the address a Contact us message gave.
  -- Personal data: read only by the support_tickets area, never logged (rule 12).
  requester_email text,
  -- The language of the emails the person gets (ro or en).
  language text not null default 'ro',
  subject text not null,
  channel public.support_ticket_channel not null,
  status public.support_ticket_status not null default 'new',
  priority public.support_ticket_priority not null default 'normal',
  category public.support_ticket_category not null default 'other',
  -- The staff member looking after it, or nobody yet.
  assigned_to_user_id uuid references public.profiles (id),
  -- Staff's own labels: lower case words joined by hyphens, at most 10.
  tags text[] not null default '{}',
  -- When staff first answered (the first-reply timer in part h3 reads it).
  first_replied_at timestamptz,
  last_message_at timestamptz not null default now(),
  solved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_someone_to_answer check (requester_user_id is not null or requester_email is not null),
  constraint support_tickets_email_shape check (
    requester_email is null or (char_length(requester_email) <= 254 and requester_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint support_tickets_language_is_known check (language in ('ro', 'en')),
  constraint support_tickets_subject_length check (char_length(btrim(subject)) between 1 and 150),
  constraint support_tickets_tags_shape check (
    cardinality(tags) <= 10
    and (cardinality(tags) = 0 or array_to_string(tags, ' ') ~ '^[a-z0-9-]{1,30}( [a-z0-9-]{1,30})*$'))
);

comment on table public.support_tickets is
  'kind: platform
Support requests as numbered tickets (S1-E11-13). Platform, not user_action: an "email only" ticket has no account, so requester_user_id can be empty (like public_notices).';
comment on column public.support_tickets.requester_user_id is 'The person asking, when they have an account; never shown publicly (rule 15).';
comment on column public.support_tickets.requester_email is 'Personal data: only the support_tickets area reads it, revealing it is logged; never logged itself (rule 12).';

create index support_tickets_requester_idx on public.support_tickets (requester_user_id, last_message_at desc);
create index support_tickets_status_idx on public.support_tickets (status, last_message_at);
create index support_tickets_assignee_idx on public.support_tickets (assigned_to_user_id) where assigned_to_user_id is not null;
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  kind public.support_message_kind not null,
  -- Who wrote it: the person asking (empty for an email-only sender) or the staff member.
  author_user_id uuid references public.profiles (id),
  body text not null,
  -- How it arrived or left: in the app, by the Contact us form or by email (part h2).
  channel public.support_ticket_channel not null,
  created_at timestamptz not null default now(),
  -- Messages are never edited; the column is here because every table has one.
  updated_at timestamptz not null default now(),
  constraint support_ticket_messages_body_length check (char_length(btrim(body)) between 1 and 10000),
  constraint support_ticket_messages_staff_have_an_author check (kind = 'from_requester' or author_user_id is not null)
);

comment on table public.support_ticket_messages is
  'kind: platform
The messages of a support ticket, with staff''s internal notes (S1-E11-13 criteria 3 and 5).';

create index support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);

create table public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  -- Who changed it: a staff member, the person (a reply reopens a ticket) or nobody (the system).
  actor_user_id uuid references public.profiles (id),
  change text not null,
  value_before jsonb,
  value_after jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_ticket_events_change_is_known check (
    change in ('created', 'status', 'priority', 'category', 'assignee', 'tags'))
);

comment on table public.support_ticket_events is
  'kind: platform
A support ticket''s history: every change of status, priority, category, assignee and tags (S1-E11-13 criterion 4).';

create index support_ticket_events_ticket_idx on public.support_ticket_events (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_events enable row level security;

/**
 * support_tickets_select_support_staff: staff with the support_tickets area read every ticket in
 * the one inbox (criterion 15). Members read their own only through my_support_tickets(), so the
 * assignee and the notes never reach them.
 */
create policy support_tickets_select_support_staff
  on public.support_tickets for select to authenticated
  using ((select public.staff_may('support_tickets', 'view')));
comment on policy support_tickets_select_support_staff on public.support_tickets is
  'Allows staff with the support_tickets area (owner, admin, support) to read every ticket (S1-E11-13).';

/** support_ticket_messages_select_support_staff: the same staff read every message and note. */
create policy support_ticket_messages_select_support_staff
  on public.support_ticket_messages for select to authenticated
  using ((select public.staff_may('support_tickets', 'view')));
comment on policy support_ticket_messages_select_support_staff on public.support_ticket_messages is
  'Allows staff with the support_tickets area to read every ticket message and internal note (S1-E11-13).';

/** support_ticket_events_select_support_staff: the same staff read every ticket's history. */
create policy support_ticket_events_select_support_staff
  on public.support_ticket_events for select to authenticated
  using ((select public.staff_may('support_tickets', 'view')));
comment on policy support_ticket_events_select_support_staff on public.support_ticket_events is
  'Allows staff with the support_tickets area to read every ticket''s history (S1-E11-13 criterion 4).';

-- Reads only, for staff; every write goes through the functions below.
grant select on public.support_tickets to authenticated;
grant select on public.support_ticket_messages to authenticated;
grant select on public.support_ticket_events to authenticated;

/* ---------- Shared pieces ---------- */

/**
 * record_support_event: adds one line to a ticket's history. Internal.
 * Inputs: the ticket, what changed, the value before and after.
 */
create or replace function public.record_support_event(
  target_ticket_id uuid, what_changed text, before_value jsonb, after_value jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.support_ticket_events (ticket_id, actor_user_id, change, value_before, value_after)
  values (target_ticket_id, (select auth.uid()), what_changed, before_value, after_value);
$$;

comment on function public.record_support_event(uuid, text, jsonb, jsonb) is 'Internal: one line of a support ticket''s history (S1-E11-13).';
revoke execute on function public.record_support_event(uuid, text, jsonb, jsonb) from public, anon, authenticated;

/**
 * account_for_email: the account whose sign-in email is this address, if any. Internal: it lets a
 * Contact us message or an email join the right account (criterion 1) without the server ever
 * being told who someone is. Compares the address in lower case.
 */
create or replace function public.account_for_email(address text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.id from auth.users
  join public.profiles on profiles.id = users.id
  where lower(users.email) = lower(btrim(address))
  limit 1;
$$;

comment on function public.account_for_email(text) is 'Internal: the account signed in with this email, if any (S1-E11-13).';
revoke execute on function public.account_for_email(text) from public, anon, authenticated;

/**
 * masked_email: an address with most of its first part hidden, "a***@example.com", for the
 * ticket page before staff press "Show" (architecture 1.8.3: an email is shown only after Show).
 */
create or replace function public.masked_email(address text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when address is null then null
    else left(address, 1) || '***@' || split_part(address, '@', 2) end;
$$;

comment on function public.masked_email(text) is 'Hides most of an email address''s first part (S1-E11-13).';
revoke execute on function public.masked_email(text) from public, anon;
grant execute on function public.masked_email(text) to authenticated;

/* ---------- The member's side ---------- */

/**
 * create_my_support_ticket: a member asks for help from "Your support requests" (criterion 1,
 * the in-app channel).
 * Inputs: subject (up to 150 characters), body (up to 4,000), category (what it is about).
 * Returns: {number} of the new ticket.
 * Errors: insufficient_privilege when signed out; check_violation for an empty or long text;
 *   program_limit_exceeded over the hourly limit (support_ticket in the rate_limits setting).
 * Any signed-in account may ask, a suspended one included (it may need help with that).
 */
create or replace function public.create_my_support_ticket(
  subject text, body text, category public.support_ticket_category default 'other'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_subject text := public.clean_mail_text(subject, 150);
  clean_body text := public.clean_mail_text(body, 4000);
  caller_language text;
  new_ticket public.support_tickets;
begin
  -- Step 1: signed in, and within the hourly limit.
  if caller_id is null then
    raise exception 'Log in to ask for help.' using errcode = 'insufficient_privilege';
  end if;
  perform public.take_rate_limit('support_ticket');
  -- Step 2: the ticket in the member's language, its first message and the first history line.
  select case when profiles.locale = 'en' then 'en' else 'ro' end into caller_language
  from public.profiles where profiles.id = caller_id;
  insert into public.support_tickets (requester_user_id, language, subject, channel, category)
  values (caller_id, coalesce(caller_language, 'ro'), clean_subject, 'in_app', coalesce(category, 'other'))
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (new_ticket.id, 'from_requester', caller_id, clean_body, 'in_app');
  perform public.record_support_event(new_ticket.id, 'created', null, jsonb_build_object('channel', 'in_app'));
  return jsonb_build_object('number', new_ticket.number);
end;
$$;

comment on function public.create_my_support_ticket(text, text, public.support_ticket_category) is
  'A member asks for help: a new in-app support ticket (S1-E11-13 criterion 1).';
revoke execute on function public.create_my_support_ticket(text, text, public.support_ticket_category) from public, anon;
grant execute on function public.create_my_support_ticket(text, text, public.support_ticket_category) to authenticated;

/**
 * reply_my_support_ticket: the member answers in their own ticket. A solved ticket, or one
 * waiting for them, opens again (criterion 7); a closed one refuses, because part h3 makes a
 * follow-up ticket instead.
 * Inputs: ticket_number, body. Returns: true.
 * Errors: insufficient_privilege when signed out; no_data_found for a ticket that isn't theirs;
 *   check_violation for the text or a closed ticket; program_limit_exceeded over the limit.
 */
create or replace function public.reply_my_support_ticket(ticket_number bigint, body text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_body text := public.clean_mail_text(body, 4000);
  ticket public.support_tickets;
begin
  -- Step 1: signed in, and the ticket is theirs.
  if caller_id is null then
    raise exception 'Log in to answer.' using errcode = 'insufficient_privilege';
  end if;
  select * into ticket from public.support_tickets
  where support_tickets.number = ticket_number and requester_user_id = caller_id for update;
  if ticket.id is null then
    raise exception 'There is no such request.' using errcode = 'no_data_found';
  end if;
  if ticket.status = 'closed' then
    raise exception 'This request is closed. Start a new one and mention #%.', ticket.number using errcode = 'check_violation';
  end if;
  -- Step 2: the message, then the ticket opens again when it was waiting or solved.
  perform public.take_rate_limit('support_ticket');
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (ticket.id, 'from_requester', caller_id, clean_body, 'in_app');
  update public.support_tickets set last_message_at = now() where id = ticket.id;
  if ticket.status in ('solved', 'pending_on_user') then
    update public.support_tickets set status = 'open', solved_at = null where id = ticket.id;
    perform public.record_support_event(ticket.id, 'status', to_jsonb(ticket.status), to_jsonb('open'::text));
  end if;
  return true;
end;
$$;

comment on function public.reply_my_support_ticket(bigint, text) is
  'The member answers in their own support ticket; a solved or waiting one opens again (S1-E11-13 criterion 7).';
revoke execute on function public.reply_my_support_ticket(bigint, text) from public, anon;
grant execute on function public.reply_my_support_ticket(bigint, text) to authenticated;

/**
 * my_support_tickets: the caller's tickets, newest activity first ("Your support requests",
 * criterion 2).
 * Returns: number, subject, status, category, created_at, last_message_at and whether the last
 *   message is the team's (so the list can say "We answered").
 */
create or replace function public.my_support_tickets()
returns table (
  number bigint, subject text, status public.support_ticket_status,
  category public.support_ticket_category, created_at timestamptz, last_message_at timestamptz,
  team_replied_last boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select tickets.number, tickets.subject, tickets.status, tickets.category, tickets.created_at,
    tickets.last_message_at,
    coalesce((select messages.kind = 'staff_reply' from public.support_ticket_messages as messages
              where messages.ticket_id = tickets.id and messages.kind <> 'internal_note'
              order by messages.created_at desc limit 1), false)
  from public.support_tickets as tickets
  where tickets.requester_user_id = (select auth.uid())
  order by tickets.last_message_at desc;
$$;

comment on function public.my_support_tickets() is 'The caller''s support tickets, newest activity first (S1-E11-13 criterion 2).';
revoke execute on function public.my_support_tickets() from public, anon;
grant execute on function public.my_support_tickets() to authenticated;

/**
 * my_support_ticket: one of the caller's tickets with its messages: never an internal note and
 * never who on the team wrote (replies come from "the support team").
 * Input: ticket_number. Returns: {number, subject, status, category, created_at, messages:
 *   [{from_team, body, at}]} or null when the ticket isn't theirs.
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
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
        'from_team', messages.kind = 'staff_reply', 'body', messages.body, 'at', messages.created_at)
        order by messages.created_at)
      from public.support_ticket_messages as messages
      where messages.ticket_id = tickets.id and messages.kind <> 'internal_note'), '[]'::jsonb))
  from public.support_tickets as tickets
  where tickets.number = ticket_number and tickets.requester_user_id = (select auth.uid());
$$;

comment on function public.my_support_ticket(bigint) is
  'One of the caller''s support tickets, without notes or staff names (S1-E11-13).';
revoke execute on function public.my_support_ticket(bigint) from public, anon;
grant execute on function public.my_support_ticket(bigint) to authenticated;

/* ---------- Contact us, from our server ---------- */

/**
 * support_payload_is_signed: true when a payload carries our server's signature (HMAC-SHA256
 * with the Vault secret support_ticket_secret, set by hand; the same value is SUPPORT_TICKET_SECRET
 * on Cloudflare). Internal. False when the secret isn't set, so nothing unsigned is ever saved.
 */
create or replace function public.support_payload_is_signed(payload text, signature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'support_ticket_secret';
  if secret is null or secret = '' or signature is null then
    return false;
  end if;
  return encode(extensions.hmac(payload, secret, 'sha256'), 'hex') = lower(signature);
end;
$$;

comment on function public.support_payload_is_signed(text, text) is
  'Internal: checks a support payload''s signature against the Vault secret support_ticket_secret (S1-E11-13).';
revoke execute on function public.support_payload_is_signed(text, text) from public, anon, authenticated;

/**
 * contact_topic_subject: the subject a Contact us ticket gets, in the person's language, from the
 * form's topic (the form has no subject field, S1-E14-04). Internal.
 */
create or replace function public.contact_topic_subject(topic text, language text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when language = 'en' then case topic
      when 'question' then 'Question' when 'account' then 'Account problem'
      when 'data_request' then 'Data request' else 'Other' end
    else case topic
      when 'question' then 'Întrebare' when 'account' then 'Problemă cu contul'
      when 'data_request' then 'Cerere privind datele' else 'Altceva' end
  end;
$$;

comment on function public.contact_topic_subject(text, text) is 'Internal: a Contact us ticket''s subject from its topic (S1-E11-13).';
revoke execute on function public.contact_topic_subject(text, text) from public, anon, authenticated;

/**
 * submit_contact_ticket: saves a Contact us message as a ticket (criterion 1).
 * Inputs: payload, the JSON text server/contact.ts checked and signed: topic, message, email,
 *   language, sentAt; signature, its HMAC (see support_payload_is_signed()).
 * Returns: the ticket number.
 * Errors: insufficient_privilege when the signature is wrong or the payload is older than 15
 *   minutes (it didn't come straight through our server); check_violation for an empty message.
 * Flow: the Pages Function /api/contact calls it, then sends the emails with the number. The
 *   email joins the ticket to an account signed in with it, if there is one. Granted to anon and
 *   authenticated because the sender may have no account; the signature is the guard.
 */
create or replace function public.submit_contact_ticket(payload text, signature text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  fields jsonb;
  sender_email text;
  sender_language text;
  sender_account_id uuid;
  new_ticket public.support_tickets;
begin
  -- Step 1: only a fresh payload our server signed.
  if not public.support_payload_is_signed(payload, signature) then
    raise exception 'This message didn''t come through the form.' using errcode = 'insufficient_privilege';
  end if;
  fields := payload::jsonb;
  if (fields ->> 'sentAt')::timestamptz < now() - interval '15 minutes' then
    raise exception 'This message is too old to save.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: who wrote, and in which language.
  sender_email := btrim(fields ->> 'email');
  sender_language := case when fields ->> 'language' = 'en' then 'en' else 'ro' end;
  sender_account_id := public.account_for_email(sender_email);
  -- Step 3: the ticket, its first message and the first history line.
  insert into public.support_tickets (requester_user_id, requester_email, language, subject, channel, category)
  values (sender_account_id, sender_email, sender_language,
    public.contact_topic_subject(fields ->> 'topic', sender_language), 'contact_form',
    case when fields ->> 'topic' = 'account' then 'account'::public.support_ticket_category else 'other' end)
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (new_ticket.id, 'from_requester', sender_account_id, public.clean_mail_text(fields ->> 'message', 4000), 'contact_form');
  perform public.record_support_event(new_ticket.id, 'created', null,
    jsonb_build_object('channel', 'contact_form', 'topic', fields ->> 'topic'));
  return new_ticket.number;
end;
$$;

comment on function public.submit_contact_ticket(text, text) is
  'Saves a Contact us message, signed by our server, as a support ticket (S1-E11-13 criterion 1).';
revoke execute on function public.submit_contact_ticket(text, text) from public;
grant execute on function public.submit_contact_ticket(text, text) to anon, authenticated;

/* ---------- The staff side ---------- */

/**
 * require_support_ticket_for_staff: the ticket a staff member works on, locked. Internal.
 * Input: ticket_number. Returns: the ticket.
 * Errors: insufficient_privilege unless the caller may act on support tickets; no_data_found for
 *   an unknown number.
 */
create or replace function public.require_support_ticket_for_staff(ticket_number bigint)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets;
begin
  if not public.staff_may('support_tickets', 'act') then
    raise exception 'Only support staff can work on tickets.' using errcode = 'insufficient_privilege';
  end if;
  select * into ticket from public.support_tickets where support_tickets.number = ticket_number for update;
  if ticket.id is null then
    raise exception 'There is no ticket #%.', ticket_number using errcode = 'no_data_found';
  end if;
  return ticket;
end;
$$;

comment on function public.require_support_ticket_for_staff(bigint) is 'Internal: the support ticket staff act on, locked (S1-E11-13).';
revoke execute on function public.require_support_ticket_for_staff(bigint) from public, anon, authenticated;

/**
 * admin_support_inbox: the one inbox (criterion 6's views and counts come in part h3).
 * Inputs (optional): status_filter (a status, 'all', or empty for every ticket not yet solved or
 *   closed); assigned_filter ('mine' or 'nobody').
 * Returns: number, subject, status, priority, category, channel, the person's username (empty
 *   for an email-only ticket), whether it is email only, the assignee's username, whether it is
 *   assigned to the caller, the number of messages, the last message time and when it arrived.
 *   Most urgent first, then the longest waiting.
 * Errors: insufficient_privilege unless the caller may view support tickets.
 */
create or replace function public.admin_support_inbox(status_filter text default null, assigned_filter text default null)
returns table (
  number bigint, subject text, status public.support_ticket_status, priority public.support_ticket_priority,
  category public.support_ticket_category, channel public.support_ticket_channel, requester_handle text,
  email_only boolean, assigned_handle text, assigned_to_me boolean, message_count integer,
  last_message_at timestamptz, created_at timestamptz
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
      tickets.last_message_at, tickets.created_at
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

comment on function public.admin_support_inbox(text, text) is 'The support inbox, most urgent and longest waiting first (S1-E11-13).';
revoke execute on function public.admin_support_inbox(text, text) from public, anon;
grant execute on function public.admin_support_inbox(text, text) to authenticated;

/**
 * support_ticket_history: a ticket's history as JSON, oldest first, with who made each change.
 * Internal (admin_support_ticket() reads it).
 */
create or replace function public.support_ticket_history(target_ticket_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('change', events.change, 'before', events.value_before,
      'after', events.value_after, 'actor_handle', actor.handle, 'at', events.created_at)
      order by events.created_at, events.id), '[]'::jsonb)
  from public.support_ticket_events as events
  left join public.profiles as actor on actor.id = events.actor_user_id
  where events.ticket_id = target_ticket_id;
$$;

comment on function public.support_ticket_history(uuid) is 'Internal: a support ticket''s history as JSON (S1-E11-13 criterion 4).';
revoke execute on function public.support_ticket_history(uuid) from public, anon, authenticated;

/**
 * admin_support_ticket: one ticket for staff, with every message and note, who wrote each, its
 * history and the person's panel: username, age group (13 to 15, 16 to 17, 18 and over; never the
 * year of birth or the age check, criterion 12) and the email hidden until "Show".
 * Input: ticket_number. Returns: the ticket as JSON, or null for an unknown number.
 * Errors: insufficient_privilege unless the caller may view support tickets. Opening a ticket is
 *   logged as support_ticket.viewed (criterion 15: every view is in the audit log).
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
      'assigned_handle', (select profiles.handle from public.profiles where profiles.id = ticket.assigned_to_user_id),
      'requester', jsonb_build_object(
        'handle', requester.handle,
        -- Staff may see the user ID (architecture 1.6), so the panel links to Users.
        'user_id', ticket.requester_user_id,
        'email_only', ticket.requester_user_id is null,
        'masked_email', public.masked_email(ticket.requester_email),
        'age_group', case when ticket.requester_user_id is null then null
                          else public.age_band_of(ticket.requester_user_id) end),
      'messages', coalesce((select jsonb_agg(jsonb_build_object('kind', messages.kind,
          'author_handle', author.handle, 'body', messages.body, 'channel', messages.channel,
          'at', messages.created_at) order by messages.created_at, messages.id)
        from public.support_ticket_messages as messages
        left join public.profiles as author on author.id = messages.author_user_id
        where messages.ticket_id = ticket.id), '[]'::jsonb),
      'history', public.support_ticket_history(ticket.id))
    from (select 1) as one_row
    left join public.profiles as requester on requester.id = ticket.requester_user_id);
end;
$$;

comment on function public.admin_support_ticket(bigint) is
  'One support ticket for staff, with notes, history and the age group only; each view is logged (S1-E11-13).';
revoke execute on function public.admin_support_ticket(bigint) from public, anon;
grant execute on function public.admin_support_ticket(bigint) to authenticated;

/**
 * admin_reveal_ticket_email: the email address a ticket answers to, after staff press "Show"
 * (architecture 1.8.3: revealing an email is logged).
 * Input: ticket_number. Returns: the address (the ticket's, or the account's sign-in email).
 * Errors: as require_support_ticket_for_staff(). Logged as support_ticket.email_revealed.
 */
create or replace function public.admin_reveal_ticket_email(ticket_number bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets := public.require_support_ticket_for_staff(ticket_number);
  address text := ticket.requester_email;
begin
  if address is null then
    select users.email into address from auth.users where users.id = ticket.requester_user_id;
  end if;
  perform public.log_staff_action('support_ticket.email_revealed', 'support_tickets', ticket.id::text,
    ticket.requester_user_id, null, null, null);
  return address;
end;
$$;

comment on function public.admin_reveal_ticket_email(bigint) is 'Shows a ticket''s email address to support staff, logged (S1-E11-13).';
revoke execute on function public.admin_reveal_ticket_email(bigint) from public, anon;
grant execute on function public.admin_reveal_ticket_email(bigint) to authenticated;

/**
 * support_assignee_id: the account a ticket may be assigned to, from its username: someone whose
 * role may act on support tickets. Internal. Errors: check_violation for anyone else.
 */
create or replace function public.support_assignee_id(assignee_handle text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  assignee_id uuid;
begin
  select profiles.id into assignee_id from public.profiles
  join public.staff_roles on staff_roles.user_id = profiles.id
  join public.staff_role_areas on staff_role_areas.role = staff_roles.role
    and staff_role_areas.area = 'support_tickets' and staff_role_areas.access = 'act'
  where profiles.handle = btrim(assignee_handle, ' @') limit 1;
  if assignee_id is null then
    raise exception '@% can''t answer support tickets.', btrim(assignee_handle, ' @') using errcode = 'check_violation';
  end if;
  return assignee_id;
end;
$$;

comment on function public.support_assignee_id(text) is 'Internal: the staff account a support ticket can be assigned to (S1-E11-13).';
revoke execute on function public.support_assignee_id(text) from public, anon, authenticated;

/**
 * apply_support_change: changes one field of a ticket when the new value differs, and records it
 * in the ticket's history and the audit log. Internal (admin_update_support_ticket() calls it once
 * per field). Inputs: the ticket, the field, the value before and after as JSON.
 */
create or replace function public.apply_support_change(ticket public.support_tickets, field text, before_value jsonb, after_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if before_value is not distinct from after_value then
    return;
  end if;
  perform public.record_support_event(ticket.id, field, before_value, after_value);
  perform public.log_staff_action('support_ticket.' || field, 'support_tickets', ticket.id::text,
    ticket.requester_user_id, null, jsonb_build_object(field, before_value), jsonb_build_object(field, after_value));
end;
$$;

comment on function public.apply_support_change(public.support_tickets, text, jsonb, jsonb) is
  'Internal: records one changed support ticket field in its history and the audit log (S1-E11-13).';
revoke execute on function public.apply_support_change(public.support_tickets, text, jsonb, jsonb) from public, anon, authenticated;

/**
 * admin_update_support_ticket: staff change a ticket's status, priority, category, assignee or
 * tags (criterion 4). Only the keys present in `changes` change; each change that differs goes
 * into the ticket's history and the audit log with its before and after values.
 * Inputs: ticket_number; changes, JSON with any of: status, priority, category (enum values),
 *   assignee (a username, or "" for nobody), tags (an array of lower-case words).
 * Returns: true. Errors: as require_support_ticket_for_staff(); check_violation for an unknown
 *   value, an assignee who can't answer tickets or tags of the wrong shape.
 */
create or replace function public.admin_update_support_ticket(ticket_number bigint, changes jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets := public.require_support_ticket_for_staff(ticket_number);
  new_status public.support_ticket_status;
  new_priority public.support_ticket_priority;
  new_category public.support_ticket_category;
  new_assignee uuid := ticket.assigned_to_user_id;
  new_tags text[] := ticket.tags;
begin
  -- Step 1: the new values; a key that isn't given keeps the ticket's value.
  new_status := coalesce((changes ->> 'status')::public.support_ticket_status, ticket.status);
  new_priority := coalesce((changes ->> 'priority')::public.support_ticket_priority, ticket.priority);
  new_category := coalesce((changes ->> 'category')::public.support_ticket_category, ticket.category);
  if changes ? 'assignee' then
    new_assignee := case when nullif(btrim(changes ->> 'assignee'), '') is null then null
                         else public.support_assignee_id(changes ->> 'assignee') end;
  end if;
  if changes ? 'tags' then
    select coalesce(array_agg(distinct lower(btrim(tag)) order by lower(btrim(tag))), '{}')
    into new_tags from jsonb_array_elements_text(changes -> 'tags') as tag where btrim(tag) <> '';
  end if;
  -- Step 2: the ticket (the table's checks refuse tags of the wrong shape).
  update public.support_tickets set
    status = new_status, priority = new_priority, category = new_category,
    assigned_to_user_id = new_assignee, tags = new_tags,
    solved_at = case when new_status = 'solved' and ticket.status <> 'solved' then now()
                     when new_status in ('solved', 'closed') then solved_at else null end,
    closed_at = case when new_status = 'closed' then coalesce(closed_at, now()) else null end
  where id = ticket.id;
  -- Step 3: one history line and one audit line per field that changed.
  perform public.apply_support_change(ticket, 'status', to_jsonb(ticket.status), to_jsonb(new_status));
  perform public.apply_support_change(ticket, 'priority', to_jsonb(ticket.priority), to_jsonb(new_priority));
  perform public.apply_support_change(ticket, 'category', to_jsonb(ticket.category), to_jsonb(new_category));
  perform public.apply_support_change(ticket, 'assignee',
    to_jsonb((select profiles.handle from public.profiles where profiles.id = ticket.assigned_to_user_id)),
    to_jsonb((select profiles.handle from public.profiles where profiles.id = new_assignee)));
  perform public.apply_support_change(ticket, 'tags', to_jsonb(ticket.tags), to_jsonb(new_tags));
  return true;
exception
  when invalid_text_representation then
    raise exception 'That value isn''t one a ticket can have.' using errcode = 'check_violation';
end;
$$;

comment on function public.admin_update_support_ticket(bigint, jsonb) is
  'Staff change a support ticket''s status, priority, category, assignee or tags; each change is kept and logged (S1-E11-13 criterion 4).';
revoke execute on function public.admin_update_support_ticket(bigint, jsonb) from public, anon;
grant execute on function public.admin_update_support_ticket(bigint, jsonb) to authenticated;

/**
 * admin_reply_support_ticket: staff answer the person, or add an internal note only staff see
 * (criteria 3 and 5). A reply to a new or open ticket marks it "pending on user" and starts the
 * first-reply time; a note changes nothing the person can see. Part h2 emails the reply.
 * Inputs: ticket_number; body (up to 4,000 characters); is_note (true: staff only).
 * Returns: true. Errors: as require_support_ticket_for_staff(); check_violation for the text or a
 *   reply on a closed ticket (a note is still allowed). Logged as support_ticket.replied or
 *   support_ticket.noted, without the words.
 */
create or replace function public.admin_reply_support_ticket(ticket_number bigint, body text, is_note boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets := public.require_support_ticket_for_staff(ticket_number);
  clean_body text := public.clean_mail_text(body, 4000);
  note boolean := coalesce(is_note, false);
begin
  -- Step 1: a closed ticket takes notes only.
  if ticket.status = 'closed' and not note then
    raise exception 'This ticket is closed, so it can''t be answered.' using errcode = 'check_violation';
  end if;
  -- Step 2: the message.
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (ticket.id, case when note then 'internal_note' else 'staff_reply' end::public.support_message_kind,
    (select auth.uid()), clean_body, case when ticket.channel = 'in_app' then 'in_app' else 'email' end::public.support_ticket_channel);
  -- Step 3: a reply moves the ticket on and is what the first-reply timer measures.
  if not note then
    update public.support_tickets set last_message_at = now(), first_replied_at = coalesce(first_replied_at, now())
    where id = ticket.id;
    if ticket.status in ('new', 'open') then
      update public.support_tickets set status = 'pending_on_user' where id = ticket.id;
      perform public.record_support_event(ticket.id, 'status', to_jsonb(ticket.status), to_jsonb('pending_on_user'::text));
    end if;
  end if;
  perform public.log_staff_action(case when note then 'support_ticket.noted' else 'support_ticket.replied' end,
    'support_tickets', ticket.id::text, ticket.requester_user_id, null, null, null);
  return true;
end;
$$;

comment on function public.admin_reply_support_ticket(bigint, text, boolean) is
  'Staff answer a support ticket or add an internal note; logged without the words (S1-E11-13 criteria 3 and 5).';
revoke execute on function public.admin_reply_support_ticket(bigint, text, boolean) from public, anon;
grant execute on function public.admin_reply_support_ticket(bigint, text, boolean) to authenticated;
