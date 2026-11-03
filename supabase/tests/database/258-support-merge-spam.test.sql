-- Database tests for support tickets, part 4a: merging and spam (story S1-E11-13, part 13b;
-- bundle ADMIN-2h4a; criteria 9 and 13).
-- What it proves:
-- - support merges two tickets from the same person: every message moves, the merged one closes
--   and points to the other, both histories say so, the tags join, the person is emailed the new
--   number, and their reply to the old ticket lands in the one that stayed;
-- - tickets from two different people, a ticket into itself, and a moderator are refused;
-- - the member sees where their merged request went;
-- - marking spam moves a ticket to the Spam view only, cancels its waiting emails, stops answers
--   (notes still work), and the sender's later emails go to Spam without an acknowledgement;
--   "Not spam" puts it back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
-- An incoming email as server/support-emails.ts builds and signs it.
create function pg_temp.receive(sender text, subject text, body text, message_id text) returns jsonb language sql as $$
  select public.receive_support_email(payload, encode(extensions.hmac(payload, 'test-support-secret', 'sha256'), 'hex'))
  from (select json_build_object('from', sender, 'subject', subject, 'text', body, 'messageId', message_id,
          'threadHeaders', '', 'automatic', false, 'sentAt', now())::text as payload) as built;
$$;

delete from vault.secrets where name in ('support_ticket_secret');
select vault.create_secret('test-support-secret', 'support_ticket_secret');
-- Only this test's tickets count, and only its emails wait to be sent.
update public.support_tickets set status = 'closed', closed_at = now();
update public.support_ticket_emails set sent_at = now() where sent_at is null;

insert into public.support_tickets (number, requester_user_id, subject, channel, status, tags, last_message_at) values
  (900201, '00000000-0000-4000-8000-000000000001', 'Drafts gone', 'in_app', 'open', '{drafts}', now() - interval '1 day'),
  (900202, '00000000-0000-4000-8000-000000000001', 'Drafts still gone', 'in_app', 'new', '{lost-work}', now()),
  (900203, '00000000-0000-4000-8000-000000000002', 'Someone else', 'in_app', 'new', '{}', now());
insert into public.support_tickets (number, requester_email, subject, channel, last_message_at) values
  (900204, 'spammer@example.test', 'Buy now', 'email', now());
insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  select id, 'from_requester', requester_user_id, 'Message of ' || subject, channel from public.support_tickets
  where number in (900201, 900202, 900204);
-- In-app tickets queue an acknowledgement; these were made by hand, so the queue starts empty.
update public.support_ticket_emails set sent_at = now() where sent_at is null;

/* ---------- 1. Merge ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(public.admin_merge_support_tickets(900202, 900201), 900201::bigint, 'support merges #900202 into #900201');
select ok((public.admin_support_ticket(900201) -> 'messages') @> '[{"body": "Message of Drafts gone"}, {"body": "Message of Drafts still gone"}]',
  'the messages of both are in the ticket that stays');
select is(public.admin_support_ticket(900202) ->> 'merged_into', '900201', 'the merged ticket points to it');
select is(public.admin_support_ticket(900202) ->> 'status', 'closed', 'and is closed');
select is((select tags from public.support_tickets where number = 900201), '{drafts,lost-work}'::text[], 'the tags join');
select ok(public.admin_support_ticket(900201) -> 'history' @> '[{"change": "merged_from", "after": "900202"}]',
  'the history of the ticket that stays says what joined it');
select throws_ok($$ select public.admin_merge_support_tickets(900203, 900201) $$, '23514', null,
  'tickets from two different people can''t be merged');
select throws_ok($$ select public.admin_merge_support_tickets(900201, 900201) $$, '23514', null,
  'a ticket can''t be merged into itself');

reset role;
select is((select item ->> 'merged_into' from jsonb_array_elements(public.support_email_worker_claim(
             (select decrypted_secret from vault.decrypted_secrets where name = 'email_worker_key'))) as item
           where item ->> 'kind' = 'merged' and (item ->> 'number')::bigint = 900202), '900201',
  'the person is emailed the new number');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_support_ticket(900202) ->> 'merged_into', '900201', 'the member''s old request says where it went');

reset role;
select is((pg_temp.receive('adult_writer@personas.test', 'Re: Drafts still gone [#900202]', 'Any news?', '<m-merge@example.test>')) ->> 'number',
  '900201', 'their answer to the old number lands in the ticket that stayed');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_merge_support_tickets(900203, 900201) $$, '42501', null, 'a moderator can''t merge');

/* ---------- 2. Spam ---------- */

reset role;
insert into public.support_ticket_emails (ticket_id, kind) select id, 'acknowledgement' from public.support_tickets where number = 900204;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok(public.admin_mark_support_spam(900204, true), 'support marks a ticket as spam');
select is((select count(*)::integer from public.admin_support_inbox('all') where number = 900204), 0,
  'it leaves the other views');
select is((select count(*)::integer from public.admin_support_inbox('spam') where number = 900204), 1,
  'and shows in the Spam view');
select is((public.admin_support_view_counts() ->> 'spam')::integer, 1, 'the Spam view counts it');
select throws_ok($$ select public.admin_reply_support_ticket(900204, 'Hello', false) $$, '23514', null,
  'staff can''t answer a spam ticket');
select ok(public.admin_reply_support_ticket(900204, 'Obvious spam', true), 'a note still works');

reset role;
select is((select count(*)::integer from public.support_ticket_emails as emails
           join public.support_tickets as tickets on tickets.id = emails.ticket_id
           where tickets.number = 900204 and emails.sent_at is null), 0, 'its waiting acknowledgement is cancelled');
select is((pg_temp.receive('Spammer@example.test', 'Buy more', 'Cheap!', '<m-spam@example.test>')) ->> 'acknowledged',
  'false', 'a later email from the sender isn''t acknowledged');
select ok((select is_spam from public.support_tickets where subject = 'Buy more'), 'and goes straight to Spam');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select public.admin_mark_support_spam(900204, false);
select is((select count(*)::integer from public.admin_support_inbox('all') where number = 900204), 1,
  '"Not spam" puts it back');

select * from finish();
rollback;
