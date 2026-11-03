/*
 * Migration: support tickets, part 2: email in and out (story S1-E11-13, part 13a; bundle
 * ADMIN-2h2; criteria 1, 2, 3 and the follow-up in 7).
 *
 * How it works:
 * - Out: a new in-app ticket queues an acknowledgement and every staff answer queues an email
 *   (never an internal note) in support_ticket_emails. pg_cron wakes our worker every minute
 *   (run_support_email_worker(), pg_net, the notification emails' worker key); the worker
 *   (server/support-emails.ts) claims the due emails, sends them from the support inbox with the
 *   ticket number in the subject and the threading headers, and marks what left. Contact us
 *   tickets already got their acknowledgement from server/contact.ts, so they get none here.
 * - In: our server receives each email from Brevo's inbound parsing (/api/support-inbound), signs
 *   it like a Contact us message and calls receive_support_email(). An answer lands in its ticket
 *   (found by our Message-ID in In-Reply-To or References, or by "[#1042]" in the subject, and
 *   only when it comes from that ticket's person); anything else starts an email ticket, "email
 *   only" when no account uses the address.
 * OPEN, not chosen here (CLAUDE.md rule 13): which outside helpdesk, if any, sits behind these
 * screens. This is the stand-in: Brevo (decided 17 Oct 2026, 19:43) behind two server handlers.
 * Privacy: the outbox holds no address and no words; the address is read when the email leaves.
 * Nothing here logs an address or the words (CLAUDE.md rule 12).
 * What it adds:
 *   support_ticket_messages.email_message_id, support_tickets.follow_up_of_ticket_id
 *   support_ticket_emails                                      the outbox
 *   support_email_worker_claim(), support_email_worker_mark_sent(), run_support_email_worker()
 *   receive_support_email()                                    email in, from our server
 *   admin_support_ticket()                                     now says which answers were emailed
 * Who calls it: server/support-emails.ts (the worker and the inbound handler), pg_cron.
 */

/* ---------- New columns ---------- */

-- The Message-ID of an email that came in (as sent) or the token of one we sent ("support-<uuid>",
-- the part before the @). Used to thread answers and to drop an email Brevo delivers twice.
alter table public.support_ticket_messages add column email_message_id text;
alter table public.support_ticket_messages
  add constraint support_ticket_messages_email_message_id_length check (char_length(email_message_id) <= 998);
create unique index support_ticket_messages_email_message_id_idx
  on public.support_ticket_messages (email_message_id) where email_message_id is not null;
comment on column public.support_ticket_messages.email_message_id is
  'The Message-ID of an email that arrived in this ticket; threads answers and drops repeats (S1-E11-13).';

-- A reply to a closed ticket starts a new one linked to it (criterion 7).
alter table public.support_tickets add column follow_up_of_ticket_id uuid references public.support_tickets (id) on delete set null;
comment on column public.support_tickets.follow_up_of_ticket_id is
  'The closed ticket this one follows up, when the person answered it after it closed (S1-E11-13 criterion 7).';

/* ---------- The outbox ---------- */

create table public.support_ticket_emails (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  -- What it says: the acknowledgement of a new ticket, or a staff answer (message_id).
  kind text not null,
  message_id uuid references public.support_ticket_messages (id) on delete cascade,
  -- The left part of the Message-ID we send ("support-<uuid>"); the worker adds "@<domain>".
  -- An answer that quotes it in In-Reply-To or References lands back in this ticket.
  message_token text not null unique default 'support-' || gen_random_uuid()::text,
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_ticket_emails_kind_is_known check (kind in ('acknowledgement', 'staff_reply')),
  constraint support_ticket_emails_reply_has_message check (kind = 'acknowledgement' or message_id is not null)
);

comment on table public.support_ticket_emails is
  'kind: platform
Support ticket emails waiting to leave and those that left (S1-E11-13 criteria 2 and 3). Never holds an address or words; kept with its ticket so answers keep threading.';

create index support_ticket_emails_due_idx on public.support_ticket_emails (created_at) where sent_at is null;
create index support_ticket_emails_ticket_idx on public.support_ticket_emails (ticket_id);
create index support_ticket_emails_message_idx on public.support_ticket_emails (message_id) where message_id is not null;
create trigger support_ticket_emails_set_updated_at
  before update on public.support_ticket_emails
  for each row execute function public.set_updated_at();
alter table public.support_ticket_emails enable row level security;

/**
 * support_ticket_emails_select_support_staff: staff with the support_tickets area see which
 * answers left by email, so the ticket page can say "Emailed" or "Waiting to be emailed". Nobody
 * else reads the outbox; only the worker's functions write it.
 */
create policy support_ticket_emails_select_support_staff
  on public.support_ticket_emails for select to authenticated
  using ((select public.staff_may('support_tickets', 'view')));
comment on policy support_ticket_emails_select_support_staff on public.support_ticket_emails is
  'Allows staff with the support_tickets area to see which ticket emails left (S1-E11-13).';

grant select on public.support_ticket_emails to authenticated;

/* ---------- Queuing ---------- */

/**
 * queue_support_acknowledgement: a new in-app ticket gets an acknowledgement email with its
 * number (criterion 2). Trigger function on support_tickets. Contact us tickets already got one
 * from server/contact.ts, and email tickets are acknowledged by receive_support_email(), which
 * skips automatic replies.
 */
create or replace function public.queue_support_acknowledgement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.support_ticket_emails (ticket_id, kind) values (new.id, 'acknowledgement');
  return null;
end;
$$;

comment on function public.queue_support_acknowledgement() is 'Internal trigger: queues the acknowledgement of a new in-app support ticket (S1-E11-13 criterion 2).';
revoke execute on function public.queue_support_acknowledgement() from public, anon, authenticated;

create trigger support_tickets_queue_acknowledgement
  after insert on public.support_tickets
  for each row when (new.channel = 'in_app')
  execute function public.queue_support_acknowledgement();

/**
 * queue_support_reply_email: every staff answer goes out by email (criterion 3); an internal note
 * never does (criterion 5). Trigger function on support_ticket_messages.
 */
create or replace function public.queue_support_reply_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.support_ticket_emails (ticket_id, kind, message_id) values (new.ticket_id, 'staff_reply', new.id);
  return null;
end;
$$;

comment on function public.queue_support_reply_email() is 'Internal trigger: queues the email of a staff answer, never of a note (S1-E11-13 criteria 3 and 5).';
revoke execute on function public.queue_support_reply_email() from public, anon, authenticated;

create trigger support_ticket_messages_queue_reply_email
  after insert on public.support_ticket_messages
  for each row when (new.kind = 'staff_reply')
  execute function public.queue_support_reply_email();

/* ---------- The worker ---------- */

/**
 * support_ticket_address: where a ticket's emails go: the address the ticket came from, or the
 * account's confirmed sign-in email. Internal. Returns null when there is nowhere to send.
 */
create or replace function public.support_ticket_address(ticket public.support_tickets)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(ticket.requester_email,
    (select users.email from auth.users
     join public.profiles on profiles.id = users.id
     where users.id = ticket.requester_user_id and users.email_confirmed_at is not null
       and profiles.deleted_at is null));
$$;

comment on function public.support_ticket_address(public.support_tickets) is 'Internal: the address a support ticket''s emails go to (S1-E11-13).';
revoke execute on function public.support_ticket_address(public.support_tickets) from public, anon, authenticated;

/**
 * support_email_json: one due email as the worker needs it. Internal.
 * Returns: {email_id, kind, to, language, both_languages, number, subject, body, message_token,
 *   in_reply_to, has_account}. both_languages is true for an email-only ticket in Romanian,
 *   because nobody told us which language they read. in_reply_to is the person's last email in
 *   the ticket, so their mail app threads our answer under it.
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
                    where messages.ticket_id = ticket.id and messages.kind = 'from_requester'
                      and messages.email_message_id is not null
                    order by messages.created_at desc limit 1),
    'has_account', ticket.requester_user_id is not null);
$$;

comment on function public.support_email_json(public.support_ticket_emails, public.support_tickets, text) is
  'Internal: one due support email as the worker sends it (S1-E11-13).';
revoke execute on function public.support_email_json(public.support_ticket_emails, public.support_tickets, text) from public, anon, authenticated;

/**
 * support_email_worker_claim: the support emails due now, claimed for 15 minutes so two workers
 * never send the same one; each is tried at most 5 times.
 * Inputs: worker_key (the Vault secret email_worker_key, shared with the notification emails);
 *   batch_size (1 to 100, default 50).
 * Returns: a JSON array (see support_email_json()). An email with nowhere to go is closed without
 *   sending.
 * Errors: insufficient_privilege for a wrong key.
 * Flow: server/support-emails.ts calls it, sends, then calls support_email_worker_mark_sent().
 */
create or replace function public.support_email_worker_claim(worker_key text, batch_size integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued public.support_ticket_emails;
  ticket public.support_tickets;
  address text;
  claimed jsonb := '[]'::jsonb;
begin
  -- Step 1: only our worker may ask.
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the oldest due emails nobody else is sending.
  for queued in
    select * from public.support_ticket_emails
    where support_ticket_emails.sent_at is null and support_ticket_emails.attempts < 5
      and (support_ticket_emails.claimed_at is null or support_ticket_emails.claimed_at < now() - interval '15 minutes')
    order by support_ticket_emails.created_at
    limit least(greatest(coalesce(batch_size, 50), 1), 100)
    for update skip locked
  loop
    select * into ticket from public.support_tickets where support_tickets.id = queued.ticket_id;
    address := public.support_ticket_address(ticket);
    -- Step 3: nobody to tell (a deleted or unconfirmed account): close it without sending.
    if address is null then
      update public.support_ticket_emails set sent_at = now() where id = queued.id;
      continue;
    end if;
    update public.support_ticket_emails set claimed_at = now(), attempts = queued.attempts + 1 where id = queued.id;
    claimed := claimed || jsonb_build_array(public.support_email_json(queued, ticket, address));
  end loop;
  return claimed;
end;
$$;

comment on function public.support_email_worker_claim(text, integer) is
  'The support worker claims the ticket emails due now (S1-E11-13 criteria 2 and 3).';
revoke execute on function public.support_email_worker_claim(text, integer) from public;
grant execute on function public.support_email_worker_claim(text, integer) to anon, authenticated;

/**
 * support_email_worker_mark_sent: marks the emails that left, so they are never sent again.
 * Inputs: worker_key; email_ids (from support_email_worker_claim()). Returns: how many were marked.
 * Errors: insufficient_privilege for a wrong key.
 */
create or replace function public.support_email_worker_mark_sent(worker_key text, email_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked integer;
begin
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.support_ticket_emails set sent_at = now()
  where id = any(email_ids) and sent_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

comment on function public.support_email_worker_mark_sent(text, uuid[]) is 'The support worker marks the ticket emails that left (S1-E11-13).';
revoke execute on function public.support_email_worker_mark_sent(text, uuid[]) from public;
grant execute on function public.support_email_worker_mark_sent(text, uuid[]) to anon, authenticated;

/**
 * run_support_email_worker: wakes /api/support-emails through pg_net when ticket emails are due.
 * It uses the notification worker's address (Vault email_worker_url) with the last part of the
 * path changed, so no new by-hand setting is needed. Does nothing while the Vault lacks the
 * address or the key. Internal: pg_cron, every minute (an acknowledgement should feel quick).
 */
create or replace function public.run_support_email_worker()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  worker_key text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'email_worker_url';
  select decrypted_secret into worker_key from vault.decrypted_secrets where name = 'email_worker_key';
  if coalesce(worker_url, '') = '' or coalesce(worker_key, '') = ''
     or not exists (select 1 from public.support_ticket_emails
                    where sent_at is null and attempts < 5) then
    return false;
  end if;
  perform net.http_post(
    url := regexp_replace(worker_url, '/api/[^/?]*$', '/api/support-emails'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;

comment on function public.run_support_email_worker() is
  'Internal: calls the support email worker through pg_net when ticket emails are due (S1-E11-13); pg_cron every minute.';
revoke execute on function public.run_support_email_worker() from public, anon, authenticated;

select cron.schedule('run-support-email-worker', '* * * * *', 'select public.run_support_email_worker()');

/* ---------- Email in ---------- */

/**
 * support_ticket_for_email: the ticket an incoming email answers, or null. Internal.
 * How: first our own Message-ID tokens ("support-<uuid>") in In-Reply-To or References, then
 * "[#1042]" or "#1042" in the subject. Either way the ticket must belong to the sender (its
 * address, or the account signed in with it), so a stranger quoting a number starts a new ticket
 * instead of writing into someone else's.
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
  -- Step 3: only the ticket's own person may write into it.
  if found_ticket.id is null
     or not (lower(coalesce(found_ticket.requester_email, '')) = lower(btrim(email_sender))
              or (sender_account is not null and found_ticket.requester_user_id = sender_account)) then
    return null;
  end if;
  return found_ticket;
end;
$$;

comment on function public.support_ticket_for_email(text, text, text) is
  'Internal: the support ticket an incoming email answers, only when it comes from that ticket''s person (S1-E11-13 criterion 3).';
revoke execute on function public.support_ticket_for_email(text, text, text) from public, anon, authenticated;

/**
 * add_email_to_support_ticket: puts an incoming email in its ticket. A solved ticket, or one
 * waiting for the person, opens again (criterion 7). Internal. Returns: the ticket number.
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
  if ticket.status in ('solved', 'pending_on_user') then
    update public.support_tickets set status = 'open', solved_at = null where id = ticket.id;
    perform public.record_support_event(ticket.id, 'status', to_jsonb(ticket.status), to_jsonb('open'::text));
  end if;
  return ticket.number;
end;
$$;

comment on function public.add_email_to_support_ticket(public.support_tickets, text, text) is
  'Internal: an incoming email joins its support ticket, which opens again when it was waiting or solved (S1-E11-13).';
revoke execute on function public.add_email_to_support_ticket(public.support_tickets, text, text) from public, anon, authenticated;

/**
 * start_email_support_ticket: a new ticket from an email (criterion 1), linked to a closed one it
 * follows up (criterion 7). Acknowledged (criterion 2) unless the email is an automatic reply or
 * the address already got 3 acknowledgements this hour, so two auto-responders can't loop.
 * Internal. Returns: {number, acknowledged}.
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
  new_ticket public.support_tickets;
  recent_acknowledgements integer;
begin
  -- Step 1: the language: the account's, or Romanian (the acknowledgement then carries both).
  select case when profiles.locale = 'en' then 'en' else 'ro' end into sender_language
  from public.profiles where profiles.id = sender_account;
  -- Step 2: the ticket, its first message and its first history line.
  insert into public.support_tickets (requester_user_id, requester_email, language, subject, channel, follow_up_of_ticket_id)
  values (sender_account, lower(btrim(sender)), coalesce(sender_language, 'ro'), subject, 'email', follow_up_of)
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel, email_message_id)
  values (new_ticket.id, 'from_requester', sender_account, body, 'email', email_message_id);
  perform public.record_support_event(new_ticket.id, 'created', null, jsonb_strip_nulls(jsonb_build_object(
    'channel', 'email',
    'follow_up_of', (select tickets.number from public.support_tickets as tickets where tickets.id = follow_up_of))));
  -- Step 3: the acknowledgement, unless it would answer a machine or loop.
  select count(*) into recent_acknowledgements
  from public.support_ticket_emails as emails
  join public.support_tickets as tickets on tickets.id = emails.ticket_id
  where emails.kind = 'acknowledgement' and emails.created_at > now() - interval '1 hour'
    and tickets.requester_email = new_ticket.requester_email;
  if coalesce(is_automatic, false) or recent_acknowledgements >= 3 then
    return jsonb_build_object('number', new_ticket.number, 'acknowledged', false);
  end if;
  insert into public.support_ticket_emails (ticket_id, kind) values (new_ticket.id, 'acknowledgement');
  return jsonb_build_object('number', new_ticket.number, 'acknowledged', true);
end;
$$;

comment on function public.start_email_support_ticket(text, text, text, text, boolean, uuid) is
  'Internal: a new support ticket from an email, acknowledged unless automatic or looping (S1-E11-13 criteria 1, 2 and 7).';
revoke execute on function public.start_email_support_ticket(text, text, text, text, boolean, uuid) from public, anon, authenticated;

/**
 * receive_support_email: an email to the support inbox, from our server (criteria 1, 3 and 7).
 * Inputs: payload, the JSON text server/support-emails.ts built and signed: from, subject, text,
 *   messageId, threadHeaders (In-Reply-To and References), automatic (true for an auto-reply or
 *   bulk mail), sentAt; signature, its HMAC (support_payload_is_signed()).
 * Returns: {number, created, acknowledged}; created is false when it joined a ticket or repeated
 *   an email already saved (Brevo may deliver twice).
 * Errors: insufficient_privilege for a wrong signature or a payload older than 15 minutes;
 *   check_violation for an address of the wrong shape.
 * Flow: answers its ticket, or starts a follow-up of a closed one, or a new ticket. Granted to
 *   anon because the server calls it without a sign-in; the signature is the guard.
 */
create or replace function public.receive_support_email(payload text, signature text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fields jsonb;
  sender text;
  email_id text;
  clean_subject text;
  clean_body text;
  existing_number bigint;
  ticket public.support_tickets;
begin
  -- Step 1: only a fresh payload our server signed.
  if not public.support_payload_is_signed(payload, signature) then
    raise exception 'This email didn''t come through our server.' using errcode = 'insufficient_privilege';
  end if;
  fields := payload::jsonb;
  if (fields ->> 'sentAt')::timestamptz < now() - interval '15 minutes' then
    raise exception 'This email is too old to save.' using errcode = 'insufficient_privilege';
  end if;
  sender := lower(btrim(fields ->> 'from'));
  email_id := nullif(left(btrim(coalesce(fields ->> 'messageId', '')), 998), '');
  -- Step 2: an email saved before is not saved again.
  select tickets.number into existing_number from public.support_ticket_messages as messages
  join public.support_tickets as tickets on tickets.id = messages.ticket_id
  where messages.email_message_id = email_id;
  if existing_number is not null then
    return jsonb_build_object('number', existing_number, 'created', false, 'acknowledged', false);
  end if;
  -- Step 3: the words, trimmed to what a ticket holds; an empty email still makes a ticket.
  clean_subject := coalesce(nullif(left(btrim(coalesce(fields ->> 'subject', '')), 150), ''), '(no subject)');
  clean_body := coalesce(nullif(left(btrim(coalesce(fields ->> 'text', '')), 10000), ''), '(This email had no text.)');
  -- Step 4: an answer to an open ticket joins it; to a closed one starts a linked follow-up.
  ticket := public.support_ticket_for_email(sender, clean_subject, fields ->> 'threadHeaders');
  if ticket.id is not null and ticket.status <> 'closed' then
    return jsonb_build_object('number', public.add_email_to_support_ticket(ticket, clean_body, email_id),
      'created', false, 'acknowledged', false);
  end if;
  return public.start_email_support_ticket(sender, clean_subject, clean_body, email_id,
    (fields ->> 'automatic')::boolean, ticket.id) || jsonb_build_object('created', true);
end;
$$;

comment on function public.receive_support_email(text, text) is
  'Saves an email to the support inbox, signed by our server, in its ticket or a new one (S1-E11-13 criteria 1, 3 and 7).';
revoke execute on function public.receive_support_email(text, text) from public;
grant execute on function public.receive_support_email(text, text) to anon, authenticated;

/* ---------- The staff ticket page ---------- */

/**
 * support_message_email_state: whether a staff answer left by email: 'sent', 'waiting' or null
 * for anything that isn't emailed (a note, the person's own message). Internal.
 */
create or replace function public.support_message_email_state(message_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when emails.sent_at is not null then 'sent' else 'waiting' end
  from public.support_ticket_emails as emails where emails.message_id = support_message_email_state.message_id
  limit 1;
$$;

comment on function public.support_message_email_state(uuid) is 'Internal: whether a staff answer was emailed (S1-E11-13).';
revoke execute on function public.support_message_email_state(uuid) from public, anon, authenticated;

/**
 * admin_support_ticket: as in part h1 (one ticket for staff, every view logged, the age group
 * only), now with each answer's email state ("emailed") and the closed ticket a follow-up
 * continues ("follow_up_of", its number).
 * Input: ticket_number. Returns: the ticket as JSON, or null for an unknown number.
 * Errors: insufficient_privilege unless the caller may view support tickets.
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
      'follow_up_of', (select earlier.number from public.support_tickets as earlier where earlier.id = ticket.follow_up_of_ticket_id),
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

comment on function public.admin_support_ticket(bigint) is
  'One support ticket for staff, with notes, history, email states and the age group only; each view is logged (S1-E11-13).';
