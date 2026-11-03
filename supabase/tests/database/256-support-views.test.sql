-- Database tests for support tickets, part 3a: views, the first-reply timer and auto-solve
-- (story S1-E11-13, part 13b; bundle ADMIN-2h3a).
-- What it proves:
-- - the first answer is due a working day later, Monday to Friday in Romanian time;
-- - each saved view counts the right tickets (Spam joined in part h4a); a moderator can't read
--   the counts;
-- - the inbox gives each ticket its due time and first answer;
-- - a ticket left pending on the person for 7 days is solved by the system with a polite email,
--   and one waiting 3 days is left alone.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;

-- Only this test's tickets count: the others are closed for the length of the transaction.
update public.support_tickets set status = 'closed', closed_at = now();
update public.support_ticket_emails set sent_at = now() where sent_at is null;

/* ---------- 1. The first-reply timer ---------- */

select is(public.support_first_reply_due('2026-11-03 10:00:00+02'), '2026-11-04 10:00:00+02'::timestamptz,
  'a ticket that arrives on a Tuesday is due on Wednesday at the same time');
select is(public.support_first_reply_due('2026-11-07 10:00:00+02'), '2026-11-09 10:00:00+02'::timestamptz,
  'a ticket that arrives on a Saturday is due on Monday');
update public.settings set value = '2' where key = 'support_first_reply_target_working_days';
select is(public.support_first_reply_due('2026-11-06 10:00:00+02'), '2026-11-10 10:00:00+02'::timestamptz,
  'the target comes from the setting: two working days from a Friday is Tuesday');

/* ---------- 2. Views and counts ---------- */

insert into public.support_tickets (number, requester_user_id, subject, channel, status, assigned_to_user_id, last_message_at) values
  (900001, '00000000-0000-4000-8000-000000000001', 'Mine', 'in_app', 'open', '00000000-0000-4000-8000-000000000011', now()),
  (900002, '00000000-0000-4000-8000-000000000001', 'Nobody''s', 'in_app', 'new', null, now()),
  (900003, '00000000-0000-4000-8000-000000000001', 'Waiting long', 'in_app', 'pending_on_user', null, now() - interval '8 days'),
  (900004, '00000000-0000-4000-8000-000000000001', 'Waiting a little', 'in_app', 'pending_on_user', null, now() - interval '3 days'),
  (900005, '00000000-0000-4000-8000-000000000001', 'Done', 'in_app', 'solved', null, now());
-- In-app tickets queue an acknowledgement; these were made by hand, so the queue starts empty.
update public.support_ticket_emails set sent_at = now() where sent_at is null;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(public.admin_support_view_counts(),
  '{"mine": 1, "unassigned": 3, "all_open": 4, "pending_on_user": 2, "solved": 1, "spam": 0}'::jsonb,
  'each view counts its tickets for the support persona');
select ok((select first_reply_due_at is not null and first_replied_at is null
           from public.admin_support_inbox() where number = 900002),
  'the inbox gives a new ticket its due time, not yet answered');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_support_view_counts() $$, '42501', null, 'a moderator can''t read the counts');

/* ---------- 3. Auto-solve ---------- */

reset role;
select is(public.auto_solve_support_tickets(), 1, 'one ticket has waited longer than 7 days');
select is((select status::text from public.support_tickets where number = 900003), 'solved', 'it is solved');
select is((select status::text from public.support_tickets where number = 900004), 'pending_on_user',
  'the one waiting 3 days is left alone');
select is((select actor_user_id from public.support_ticket_events as events
           join public.support_tickets as tickets on tickets.id = events.ticket_id
           where tickets.number = 900003 and events.change = 'status'), null,
  'its history says the system solved it');
select is((select kind from public.support_ticket_emails as emails
           join public.support_tickets as tickets on tickets.id = emails.ticket_id
           where tickets.number = 900003 and emails.sent_at is null), 'auto_solved',
  'and a polite email is queued');
select is((select item ->> 'kind' from jsonb_array_elements(public.support_email_worker_claim(
             (select decrypted_secret from vault.decrypted_secrets where name = 'email_worker_key'))) as item
           where (item ->> 'number')::bigint = 900003), 'auto_solved', 'the worker sends it');

select * from finish();
rollback;
