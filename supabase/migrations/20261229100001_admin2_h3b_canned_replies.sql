/*
 * Migration: support tickets, part 3b: canned replies (story S1-E11-13, part 13b; bundle
 * ADMIN-2h3b; criterion 8: "when staff insert one, then it fills in the user's name and language
 * (English or Română) and can be edited before sending").
 *
 * How it works: support staff keep a short list of ready answers, each with a title and its words
 * in Romanian and English. On a ticket, staff pick one; the browser takes the ticket's language,
 * fills {{name}} (the person's pen name, or their username; dropped for an email-only ticket) and
 * {{number}} (the ticket), and puts the words in the reply box to edit before sending. Nothing is
 * sent by inserting.
 * Who may change them: staff with the support_tickets area (owner, admin, support), through
 * admin_save_canned_reply() and admin_delete_canned_reply(), each in the audit log with before
 * and after values (these are staff templates, not anyone's personal words). Templates ship with
 * draft Romanian and English text (CLAUDE.md: every template a feature needs ships with it).
 * What it adds: support_canned_replies, the two functions, three starting replies, and the
 * person's display name in admin_support_ticket().
 * Who calls it: src/features/support/ (the Canned replies page and the ticket page).
 */

create table public.support_canned_replies (
  id uuid primary key default gen_random_uuid(),
  -- What staff see in the picker.
  title text not null,
  body_ro text not null,
  body_en text not null,
  -- The staff member who last saved it; empty for the starting replies this migration adds.
  updated_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting hides it from the picker; the audit log keeps what it said.
  deleted_at timestamptz,
  constraint support_canned_replies_title_length check (char_length(btrim(title)) between 1 and 80),
  constraint support_canned_replies_body_ro_length check (char_length(btrim(body_ro)) between 1 and 4000),
  constraint support_canned_replies_body_en_length check (char_length(btrim(body_en)) between 1 and 4000)
);

comment on table public.support_canned_replies is
  'kind: platform
Ready answers support staff insert into a ticket and edit before sending (S1-E11-13 criterion 8). Staff templates, no personal data.';

create trigger support_canned_replies_set_updated_at
  before update on public.support_canned_replies
  for each row execute function public.set_updated_at();
alter table public.support_canned_replies enable row level security;

/**
 * support_canned_replies_select_support_staff: staff with the support_tickets area read the ready
 * answers that aren't deleted, for the picker and the Canned replies page. Nobody else reads
 * them; writes go through the functions below.
 */
create policy support_canned_replies_select_support_staff
  on public.support_canned_replies for select to authenticated
  using (deleted_at is null and (select public.staff_may('support_tickets', 'view')));
comment on policy support_canned_replies_select_support_staff on public.support_canned_replies is
  'Allows staff with the support_tickets area to read the canned replies that aren''t deleted (S1-E11-13 criterion 8).';

grant select on public.support_canned_replies to authenticated;

-- The starting replies, in draft Romanian and English (Robert reads all new Romanian text).
insert into public.support_canned_replies (title, body_ro, body_en) values
  ('Thanks, we’re looking into it',
   E'Bună, {{name}},\n\nÎți mulțumim că ne-ai scris. Ne uităm la cererea #{{number}} și revenim cu un răspuns cât de curând.',
   E'Hi {{name}},\n\nThank you for writing to us. We’re looking into request #{{number}} and will come back to you soon.'),
  ('Resetting a password',
   E'Bună, {{name}},\n\nPoți alege o parolă nouă din pagina de autentificare: apasă „Ți-ai uitat parola?” și urmează linkul din email. Linkul funcționează o singură dată.',
   E'Hi {{name}},\n\nYou can choose a new password from the log-in page: press “Forgot your password?” and follow the link in the email. The link works once.'),
  ('Reporting goes through Report',
   E'Bună, {{name}},\n\nCa să ajungă la echipa de moderare, raportează direct lucrul respectiv cu butonul Raportează de lângă el. Așa vedem exact ce ne arăți și răspundem mai repede. Dacă cineva este în pericol, sună la 112.',
   E'Hi {{name}},\n\nSo it reaches our moderation team, please report it with the Report button beside it. That way we see exactly what you mean and can act faster. If someone is in danger, call 112.');

/**
 * admin_save_canned_reply: adds a canned reply, or changes one (criterion 8).
 * Inputs: reply_id (null to add one), title (up to 80 characters), body_ro and body_en (up to
 *   4,000 each).
 * Returns: the reply's ID. Errors: insufficient_privilege unless the caller may act on support
 *   tickets; check_violation for an empty or long field; no_data_found for an unknown reply.
 * Logged as support_canned_reply.saved with the before and after values.
 */
create or replace function public.admin_save_canned_reply(reply_id uuid, title text, body_ro text, body_en text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.support_canned_replies;
  saved public.support_canned_replies;
begin
  -- Step 1: support staff only.
  if not public.staff_may('support_tickets', 'act') then
    raise exception 'Only support staff can change canned replies.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a new reply, or the change to one that exists.
  if reply_id is null then
    insert into public.support_canned_replies (title, body_ro, body_en, updated_by_user_id)
    values (btrim(title), btrim(body_ro), btrim(body_en), (select auth.uid()))
    returning * into saved;
  else
    select * into before_row from public.support_canned_replies
    where support_canned_replies.id = reply_id and deleted_at is null for update;
    if before_row.id is null then
      raise exception 'There is no such canned reply.' using errcode = 'no_data_found';
    end if;
    update public.support_canned_replies set title = btrim(admin_save_canned_reply.title),
      body_ro = btrim(admin_save_canned_reply.body_ro), body_en = btrim(admin_save_canned_reply.body_en),
      updated_by_user_id = (select auth.uid())
    where id = reply_id returning * into saved;
  end if;
  -- Step 3: the audit log keeps what changed.
  perform public.log_staff_action('support_canned_reply.saved', 'support_canned_replies', saved.id::text, null, null,
    case when before_row.id is null then null
         else jsonb_build_object('title', before_row.title, 'body_ro', before_row.body_ro, 'body_en', before_row.body_en) end,
    jsonb_build_object('title', saved.title, 'body_ro', saved.body_ro, 'body_en', saved.body_en));
  return saved.id;
end;
$$;

comment on function public.admin_save_canned_reply(uuid, text, text, text) is
  'Support staff add or change a canned reply; logged with before and after (S1-E11-13 criterion 8).';
revoke execute on function public.admin_save_canned_reply(uuid, text, text, text) from public, anon;
grant execute on function public.admin_save_canned_reply(uuid, text, text, text) to authenticated;

/**
 * admin_delete_canned_reply: takes a canned reply out of the picker. The audit log keeps what it
 * said. Input: reply_id. Returns: true.
 * Errors: insufficient_privilege unless the caller may act on support tickets; no_data_found for
 *   an unknown reply.
 */
create or replace function public.admin_delete_canned_reply(reply_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted public.support_canned_replies;
begin
  if not public.staff_may('support_tickets', 'act') then
    raise exception 'Only support staff can change canned replies.' using errcode = 'insufficient_privilege';
  end if;
  update public.support_canned_replies set deleted_at = now(), updated_by_user_id = (select auth.uid())
  where id = reply_id and deleted_at is null returning * into deleted;
  if deleted.id is null then
    raise exception 'There is no such canned reply.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('support_canned_reply.deleted', 'support_canned_replies', deleted.id::text, null, null,
    jsonb_build_object('title', deleted.title, 'body_ro', deleted.body_ro, 'body_en', deleted.body_en), null);
  return true;
end;
$$;

comment on function public.admin_delete_canned_reply(uuid) is 'Support staff delete a canned reply; logged (S1-E11-13 criterion 8).';
revoke execute on function public.admin_delete_canned_reply(uuid) from public, anon;
grant execute on function public.admin_delete_canned_reply(uuid) to authenticated;

/**
 * admin_support_ticket: as in part h2, with the person's display name (their pen name, or their
 * username) in the panel, so a canned reply can greet them by it.
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

comment on function public.admin_support_ticket(bigint) is
  'One support ticket for staff, with notes, history, email states, the display name and the age group only; each view is logged (S1-E11-13).';
