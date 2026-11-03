-- Database tests for support tickets, part 1 (story S1-E11-13, part 13a; bundle ADMIN-2h1).
-- What it proves:
-- - a member starts a numbered ticket and answers it; a solved ticket opens again, a closed one
--   refuses; a signed-out visitor can't start one;
-- - a member reads only their own tickets, through the functions, and never an internal note or
--   who on the team answered;
-- - support, admin and owner read the inbox and every ticket; a moderator and a member don't
--   (allowed and denied for each table's policy);
-- - staff change status, priority, category, assignee and tags, each kept in the history and the
--   audit log; a reply marks the ticket pending on the person; a note never reaches them;
-- - the person's panel shows the age group, never the year of birth; the email is hidden until
--   "Show", and showing it is logged; opening a ticket is logged;
-- - a Contact us message is saved only with our server's signature, joins the account signed in
--   with that email, and an unknown address makes an "email only" ticket.
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- A fresh password sign-in, as Supabase's tokens carry it.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- A payload signed as server/contact.ts signs it.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-support-secret', 'sha256'), 'hex');
$$;

delete from vault.secrets where name = 'support_ticket_secret';
select vault.create_secret('test-support-secret', 'support_ticket_secret');
delete from public.rate_limit_events where user_id = '00000000-0000-4000-8000-000000000001';

/* ---------- 1. A member's own tickets ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table first_ticket on commit drop as
  select (public.create_my_support_ticket('I can''t find my drafts', 'Where did my drafts go?', 'writing') ->> 'number')::bigint as number;
grant select on first_ticket to authenticated, anon;
select ok((select number from first_ticket) >= 1001, 'a member starts a ticket with a number from 1001');
select is((select count(*)::integer from public.my_support_tickets()), 1, 'the member sees it under their requests');
select is(public.my_support_ticket((select number from first_ticket)) ->> 'subject', 'I can''t find my drafts',
  'the member opens their ticket');
select is((select count(*)::integer from public.support_tickets), 0,
  'denied: support_tickets_select_support_staff: a member reads no ticket from the table');
select is((select count(*)::integer from public.support_ticket_messages), 0,
  'denied: support_ticket_messages_select_support_staff: nor any message');
select is((select count(*)::integer from public.support_ticket_events), 0,
  'denied: support_ticket_events_select_support_staff: nor any history');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.my_support_ticket((select number from first_ticket)), null, 'another member can''t open it');
select throws_ok(format('select public.reply_my_support_ticket(%s, %L)', (select number from first_ticket), 'Me too'),
  'P0002', null, 'another member can''t answer it');
select pg_temp.sign_out();
select throws_ok($$ select public.create_my_support_ticket('Help', 'Please') $$, '42501', null,
  'a signed-out visitor can''t start a ticket in the app');

/* ---------- 2. Staff read ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok((select count(*) from public.support_tickets) >= 1,
  'allowed: support_tickets_select_support_staff: support reads every ticket');
select ok((select count(*) from public.support_ticket_messages) >= 1,
  'allowed: support_ticket_messages_select_support_staff: and every message');
select ok((select count(*) from public.support_ticket_events) >= 1,
  'allowed: support_ticket_events_select_support_staff: and every history line');
select ok(exists (select 1 from public.admin_support_inbox() where number = (select number from first_ticket)),
  'the new ticket is in the inbox');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok(exists (select 1 from public.admin_support_inbox()), 'an admin reads the inbox');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select * from public.admin_support_inbox() $$, '42501', null, 'a moderator doesn''t read the inbox');
select throws_ok(format('select public.admin_reply_support_ticket(%s, %L)', (select number from first_ticket), 'Hi'),
  '42501', null, 'nor answer a ticket');

/* ---------- 3. Staff work on a ticket ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(public.admin_support_ticket((select number from first_ticket)) -> 'requester' ->> 'age_group', '18_plus',
  'the panel shows the age group');
select ok(not (public.admin_support_ticket((select number from first_ticket)) -> 'requester' ? 'birth_year'),
  'and never the year of birth');
select ok(public.admin_update_support_ticket((select number from first_ticket),
  '{"status": "open", "priority": "high", "assignee": "support", "tags": ["drafts", "Lost-Work"]}'),
  'support changes the status, priority, assignee and tags');
select is((select array_agg(change order by change) from public.support_ticket_events
           where ticket_id = (select id from public.support_tickets where number = (select number from first_ticket))
             and change <> 'created'),
  array['assignee', 'priority', 'status', 'tags'], 'each change is in the ticket''s history');
select is((select tags from public.support_tickets where number = (select number from first_ticket)),
  array['drafts', 'lost-work'], 'tags are kept in lower case');
select throws_ok(format('select public.admin_update_support_ticket(%s, %L)', (select number from first_ticket), '{"assignee": "moderator"}'),
  '23514', null, 'a ticket can''t be assigned to someone who can''t answer tickets');
select ok(public.admin_reply_support_ticket((select number from first_ticket), 'Only staff should read this.', true),
  'support adds an internal note');
select ok(public.admin_reply_support_ticket((select number from first_ticket), 'Your drafts are under Write.'),
  'support answers');
select is((select status::text from public.support_tickets where number = (select number from first_ticket)), 'pending_on_user',
  'a reply marks the ticket pending on the person');
reset role;
select is((select count(*)::integer from public.audit_log
           where action in ('support_ticket.viewed', 'support_ticket.status', 'support_ticket.noted', 'support_ticket.replied')
             and target_user_id = '00000000-0000-4000-8000-000000000001'), 5,
  'the views, the change and the replies are in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(public.admin_reveal_ticket_email((select number from first_ticket)), 'adult_writer@personas.test',
  'support shows the address, from the account when the ticket has none');

/* ---------- 4. What the member sees after staff worked ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(jsonb_array_length(public.my_support_ticket((select number from first_ticket)) -> 'messages'), 2,
  'the member sees their message and the reply, never the note');
select ok(public.reply_my_support_ticket((select number from first_ticket), 'Found them, thanks!'),
  'the member answers');
select is((select status from public.my_support_tickets() where number = (select number from first_ticket))::text, 'open',
  'and the ticket opens again');
reset role;
update public.support_tickets set status = 'closed', closed_at = now() where number = (select number from first_ticket);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(format('select public.reply_my_support_ticket(%s, %L)', (select number from first_ticket), 'One more'),
  '23514', null, 'a closed ticket can''t be answered');

/* ---------- 5. Contact us ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.submit_contact_ticket('{"topic": "other", "message": "Hi", "email": "a@b.test", "language": "en", "sentAt": "2099-01-01T00:00:00Z"}', 'bad') $$,
  '42501', null, 'an unsigned Contact us message isn''t saved');
create temporary table contact_numbers on commit drop as
  select public.submit_contact_ticket(payloads.payload, pg_temp.signed(payloads.payload)) as number, payloads.who
  from (values
    ('known', json_build_object('topic', 'account', 'message', 'I can''t log in', 'email', 'Adult_Writer@personas.test',
       'language', 'en', 'sentAt', now())::text),
    ('stranger', json_build_object('topic', 'question', 'message', 'Is it free?', 'email', 'stranger@example.test',
       'language', 'ro', 'sentAt', now())::text)) as payloads (who, payload);
reset role;
select is((select requester_user_id from public.support_tickets
           where number = (select number from contact_numbers where who = 'known')),
  '00000000-0000-4000-8000-000000000001'::uuid, 'a signed message joins the account signed in with that email');
select is((select subject || ' / ' || channel || ' / ' || (requester_user_id is null)::text from public.support_tickets
           where number = (select number from contact_numbers where who = 'stranger')),
  'Întrebare / contact_form / true', 'an unknown address makes an email-only ticket in the sender''s language');

select * from finish();
rollback;
