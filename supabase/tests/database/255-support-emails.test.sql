-- Database tests for support tickets, part 2: email in and out (story S1-E11-13, part 13a;
-- bundle ADMIN-2h2).
-- What it proves:
-- - a new in-app ticket queues an acknowledgement; a staff answer queues an email; a note never;
-- - only our worker key claims the due emails; a claim carries the address, the number, the
--   answer and the person's last Message-ID; marking stops them being sent again;
-- - an unsigned email isn't saved; an email from an unknown address makes an "email only" ticket
--   in Romanian with both languages in its acknowledgement;
-- - an answer threads into its ticket by "[#number]" or by our Message-ID, and reopens it; a
--   stranger quoting the number gets a ticket of their own; a repeat of the same email is dropped;
-- - a reply to a closed ticket starts a follow-up linked to it; an automatic reply isn't acknowledged;
-- - the staff ticket page says which answers were emailed (allowed and denied for the outbox policy).
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- An incoming email as server/support-emails.ts builds and signs it.
create function pg_temp.receive(sender text, subject text, body text, message_id text,
  thread_headers text default '', automatic boolean default false) returns jsonb language sql as $$
  select public.receive_support_email(payload, encode(extensions.hmac(payload, 'test-support-secret', 'sha256'), 'hex'))
  from (select json_build_object('from', sender, 'subject', subject, 'text', body, 'messageId', message_id,
          'threadHeaders', thread_headers, 'automatic', automatic, 'sentAt', now())::text as payload) as built;
$$;

delete from vault.secrets where name in ('support_ticket_secret');
select vault.create_secret('test-support-secret', 'support_ticket_secret');
delete from public.rate_limit_events where user_id = '00000000-0000-4000-8000-000000000001';
create temporary table worker as
  select decrypted_secret as worker_key from vault.decrypted_secrets where name = 'email_worker_key';
grant select on worker to anon, authenticated;
-- Earlier tests' emails are out of the way, so the claims below see only these.
update public.support_ticket_emails set sent_at = now() where sent_at is null;

/* ---------- 1. Out: what is queued ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table app_ticket on commit drop as
  select (public.create_my_support_ticket('Email test', 'Do I get an email?', 'other') ->> 'number')::bigint as number;
grant select on app_ticket to anon, authenticated;
reset role;
select is((select count(*)::integer from public.support_ticket_emails as emails
           join public.support_tickets as tickets on tickets.id = emails.ticket_id
           where tickets.number = (select number from app_ticket) and emails.kind = 'acknowledgement'), 1,
  'a new in-app ticket queues an acknowledgement');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok(public.admin_reply_support_ticket((select number from app_ticket), 'A note for staff.', true), 'support adds a note');
select ok(public.admin_reply_support_ticket((select number from app_ticket), 'Yes, this is your email.'), 'support answers');
reset role;
select is((select array_agg(emails.kind order by emails.kind) from public.support_ticket_emails as emails
           join public.support_tickets as tickets on tickets.id = emails.ticket_id
           where tickets.number = (select number from app_ticket)),
  array['acknowledgement', 'staff_reply'], 'the answer queues an email and the note doesn''t');

/* ---------- 2. Out: the worker ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.support_email_worker_claim('wrong-key') $$, '42501', null, 'a wrong key claims nothing');
create temporary table claimed on commit drop as
  select public.support_email_worker_claim((select worker_key from worker)) as emails;
grant select on claimed to anon, authenticated;
select is(jsonb_array_length((select emails from claimed)), 2, 'our worker claims the two due emails');
select is((select emails -> 0 ->> 'to' from claimed), 'adult_writer@personas.test',
  'an account''s email goes to its confirmed sign-in address');
select is((select emails -> 0 ->> 'number' from claimed)::bigint, (select number from app_ticket), 'with the ticket number');
select is((select emails -> 1 ->> 'body' from claimed), 'Yes, this is your email.', 'the answer carries its words');
select ok((select emails -> 1 ->> 'message_token' from claimed) ~ '^support-[0-9a-f-]{36}$', 'and our Message-ID token');
select is(jsonb_array_length(public.support_email_worker_claim((select worker_key from worker))), 0,
  'a claimed email isn''t claimed twice');
select is(public.support_email_worker_mark_sent((select worker_key from worker),
  array(select (item ->> 'email_id')::uuid from claimed, jsonb_array_elements(emails) as item)), 2,
  'the worker marks both as sent');

/* ---------- 3. In: new tickets ---------- */

select throws_ok($$ select public.receive_support_email('{"from": "a@b.test", "sentAt": "2099-01-01T00:00:00Z"}', 'bad') $$,
  '42501', null, 'an unsigned email isn''t saved');
create temporary table stranger on commit drop as
  select pg_temp.receive('Stranger@Example.test', 'Is it free?', 'Hello, is reading free?', '<m1@example.test>') as answer;
grant select on stranger to anon, authenticated;
select is((select (answer ->> 'created')::boolean and (answer ->> 'acknowledged')::boolean from stranger), true,
  'an email from an unknown address makes a ticket and acknowledges it');
reset role;
select is((select requester_user_id is null and requester_email = 'stranger@example.test' and channel = 'email' and language = 'ro'
           from public.support_tickets where number = (select (answer ->> 'number')::bigint from stranger)), true,
  'it is an email-only ticket in Romanian');
select is((select (item ->> 'both_languages')::boolean
           from jsonb_array_elements(public.support_email_worker_claim((select worker_key from worker))) as item
           where (item ->> 'number')::bigint = (select (answer ->> 'number')::bigint from stranger)), true,
  'its acknowledgement carries both languages');

/* ---------- 4. In: threading ---------- */

select pg_temp.sign_out();
select is((pg_temp.receive('stranger@example.test', 'Re: Is it free? [#' || (select answer ->> 'number' from stranger) || ']',
            'Thanks!', '<m2@example.test>') ->> 'number')::bigint,
  (select (answer ->> 'number')::bigint from stranger), 'an answer with the number in the subject joins its ticket');
select is((pg_temp.receive('stranger@example.test', 'Re: Is it free? [#' || (select answer ->> 'number' from stranger) || ']',
            'Thanks!', '<m2@example.test>') ->> 'created')::boolean, false, 'the same email twice is saved once');
reset role;
select is((select count(*)::integer from public.support_ticket_messages where email_message_id = '<m2@example.test>'), 1,
  'only one copy is kept');
select pg_temp.sign_out();
select isnt((pg_temp.receive('someone.else@example.test', 'About [#' || (select answer ->> 'number' from stranger) || ']',
             'Let me in', '<m3@example.test>') ->> 'number')::bigint,
  (select (answer ->> 'number')::bigint from stranger), 'a stranger quoting the number gets a ticket of their own');
-- adult_writer answers our email: no number in the subject, our Message-ID in In-Reply-To.
select is((pg_temp.receive('adult_writer@personas.test', 'Re: something', 'It worked, thanks.', '<m4@example.test>',
            '<' || (select emails -> 1 ->> 'message_token' from claimed) || '@support.example.test>') ->> 'number')::bigint,
  (select number from app_ticket), 'an answer threads by our Message-ID');
reset role;
select is((select status::text from public.support_tickets where number = (select number from app_ticket)), 'open',
  'and the ticket waiting for the person opens again');

/* ---------- 5. In: follow-ups and automatic replies ---------- */

update public.support_tickets set status = 'closed', closed_at = now() where number = (select number from app_ticket);
select pg_temp.sign_out();
create temporary table follow_up on commit drop as
  select pg_temp.receive('adult_writer@personas.test', 'Re: Email test [#' || (select number from app_ticket) || ']',
    'One more thing.', '<m5@example.test>') as answer;
grant select on follow_up to anon, authenticated;
reset role;
select is((select earlier.number from public.support_tickets as tickets
           join public.support_tickets as earlier on earlier.id = tickets.follow_up_of_ticket_id
           where tickets.number = (select (answer ->> 'number')::bigint from follow_up)),
  (select number from app_ticket), 'a reply to a closed ticket starts a follow-up linked to it');
select pg_temp.sign_out();
select is((pg_temp.receive('robot@example.test', 'Out of office', 'I am away.', '<m6@example.test>', '', true) ->> 'acknowledged')::boolean,
  false, 'an automatic reply isn''t acknowledged');

/* ---------- 6. The staff page and the outbox policy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok((select count(*) from public.support_ticket_emails) >= 2,
  'allowed: support_ticket_emails_select_support_staff: support sees which emails left');
select is((select item ->> 'emailed' from jsonb_array_elements(public.admin_support_ticket((select number from app_ticket)) -> 'messages') as item
           where item ->> 'kind' = 'staff_reply'), 'sent', 'the ticket page says the answer was emailed');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.support_ticket_emails), 0,
  'denied: support_ticket_emails_select_support_staff: a moderator sees none');

select * from finish();
rollback;
