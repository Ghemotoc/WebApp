-- Database tests for support tickets, part 4b: Convert to report, Open data request, retention and
-- the data export (story S1-E11-13, part 13b; bundle ADMIN-2h4b; criteria 10, 11 and 14).
-- What it proves:
-- - support turns a ticket about a story we host into a notice that opens a case in the reason's
--   tier, and a worry about a child into a safeguarding case; a ticket without an address waits
--   in the unmatched notices; both are linked to the ticket and in its history;
-- - an empty explanation, a spam ticket and a moderator (no support area) are refused;
-- - support opens a data request from a ticket, received on the day the ticket arrived, so its
--   deadline counts from then; a ticket from someone without an account is refused (no_account);
-- - the ticket page lists what was started from it;
-- - a ticket closed more than two years ago is deleted at night, a newer one stays, and the
--   notice it started keeps its record;
-- - the person's data export holds their tickets with both sides of the conversation, never a
--   staff note.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;

-- adult_writer's (…01) first seed story gets a published chapter, so it has a public address.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ticketa1', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
  where id = '00000000-0000-4000-9000-000000000001';

insert into public.support_tickets (number, requester_user_id, subject, channel, status, created_at, last_message_at) values
  (900301, '00000000-0000-4000-8000-000000000002', 'A story copied mine', 'in_app', 'open', now() - interval '3 days', now()),
  (900302, '00000000-0000-4000-8000-000000000002', 'Worried about a friend', 'in_app', 'open', now(), now());
insert into public.support_tickets (number, requester_email, subject, channel, last_message_at, is_spam) values
  (900303, 'stranger@example.test', 'Please delete my data', 'email', now(), false),
  (900304, 'spammer@example.test', 'Buy now', 'email', now(), true);
insert into public.support_tickets (number, requester_user_id, subject, channel, status, closed_at, last_message_at) values
  (900305, '00000000-0000-4000-8000-000000000002', 'Old question', 'in_app', 'closed', now() - interval '3 years', now() - interval '3 years'),
  (900306, '00000000-0000-4000-8000-000000000002', 'Recent question', 'in_app', 'closed', now() - interval '1 year', now() - interval '1 year');
insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  select id, 'from_requester'::public.support_message_kind, requester_user_id, 'My words in ' || subject, channel from public.support_tickets
  where number = 900301
  union all
  select id, 'staff_reply'::public.support_message_kind, '00000000-0000-4000-8000-000000000011', 'We are looking into it.', 'in_app'
  from public.support_tickets where number = 900301
  union all
  select id, 'internal_note'::public.support_message_kind, '00000000-0000-4000-8000-000000000011', 'Staff only: check the writer', 'in_app'
  from public.support_tickets where number = 900301;

/* ---------- 1. Convert to report ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temp table converted on commit drop as
  select public.admin_convert_ticket_to_report(900301, '/s/statia-meteo-seed01', 'copyright', 'They say this copies their story.') as result;
select ok((select (result ->> 'matched')::boolean from converted), 'support converts a ticket about a story we host');
reset role;
select is((select cases.tier::text from public.cases join public.public_notices on public_notices.case_id = cases.id
           where public_notices.reference = (select result ->> 'reference' from converted)),
  'two_days', 'the notice opens a case in the reason''s tier');
select is((select tickets.number from public.public_notices
           join public.support_tickets as tickets on tickets.id = public_notices.support_ticket_id
           where public_notices.reference = (select result ->> 'reference' from converted)),
  900301::bigint, 'the notice is linked to the ticket');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temp table worried on commit drop as
  select public.admin_convert_ticket_to_report(900302, '', 'threat_to_minor', 'A friend may be in danger.') as result;
select is((select (result ->> 'matched')::boolean from worried), false,
  'a ticket without an address waits in the unmatched notices');
reset role;
select is((select content_url from public.public_notices where reference = (select result ->> 'reference' from worried)),
  'support ticket #900302', 'and names the ticket instead of an address');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temp table child on commit drop as
  select public.admin_convert_ticket_to_report(900302, 'http://localhost/s/statia-meteo-seed01', 'child_sexual_content', 'Reported by a reader.') as result;
reset role;
select ok((select cases.is_safeguarding from public.cases join public.public_notices on public_notices.case_id = cases.id
           where public_notices.reference = (select result ->> 'reference' from child)),
  'a child-safety reason opens a safeguarding case');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok(public.admin_support_ticket(900301) -> 'history' @> jsonb_build_array(jsonb_build_object(
  'change', 'converted_to_report', 'after', (select result ->> 'reference' from converted))),
  'the ticket''s history keeps the notice''s reference');
select throws_ok($$ select public.admin_convert_ticket_to_report(900301, '', 'other', '  ') $$, '23514', null,
  'an empty explanation is refused');
select throws_ok($$ select public.admin_convert_ticket_to_report(900304, '', 'other', 'Spam') $$, '23514', null,
  'a spam ticket can''t become a report');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_convert_ticket_to_report(900301, '', 'other', 'Hi') $$, '42501', null,
  'a moderator without the support area can''t convert a ticket');

/* ---------- 2. Open data request ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temp table opened on commit drop as select public.admin_open_ticket_data_request(900301, 'copy') as result;
reset role;
select is((select received_on from public.data_requests where reference = (select result ->> 'reference' from opened)),
  ((now() - interval '3 days') at time zone 'Europe/Bucharest')::date,
  'support opens a data request received on the day the ticket arrived');
select is((select user_id from public.data_requests where reference = (select result ->> 'reference' from opened)),
  '00000000-0000-4000-8000-000000000002'::uuid, 'for the ticket''s account');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_open_ticket_data_request(900303, 'delete') $$, '23514', null,
  'a ticket from someone without an account can''t open one');

/* ---------- 3. The ticket's links ---------- */

select is(jsonb_array_length(public.admin_ticket_links(900301) -> 'notices'), 1, 'the ticket page lists its notice');
select is(public.admin_ticket_links(900301) #>> '{data_requests,0,reference}', (select result ->> 'reference' from opened),
  'and its data request');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_ticket_links(900301) $$, '42501', null, 'a member can''t read the links');

/* ---------- 4. Retention ---------- */

reset role;
update public.public_notices set support_ticket_id = (select id from public.support_tickets where number = 900305)
  where reference = (select result ->> 'reference' from worried);
select is(public.purge_old_support_tickets() >= 1, true, 'the nightly job deletes old tickets');
select is((select array_agg(number order by number) from public.support_tickets where number in (900305, 900306)),
  '{900306}'::bigint[], 'a ticket closed three years ago is gone, one closed a year ago stays');
select is((select coalesce(support_ticket_id::text, 'no link') || ' #' || support_ticket_number from public.public_notices
           where reference = (select result ->> 'reference' from worried)),
  'no link #900302', 'the notice it started keeps its record and the ticket''s number, without the link');

/* ---------- 5. The data export ---------- */

select ok(public.export_tables_of('00000000-0000-4000-8000-000000000002') -> 'support_tickets' @> jsonb_build_array(jsonb_build_object(
    'number', 900301, 'messages', jsonb_build_array(
      jsonb_build_object('from', 'you', 'body', 'My words in A story copied mine'),
      jsonb_build_object('from', 'support_team', 'body', 'We are looking into it.'))))
  and position('Staff only' in (public.export_tables_of('00000000-0000-4000-8000-000000000002') ->> 'support_tickets')) = 0,
  'the person''s data export holds both sides of their ticket and never a staff note');

select * from finish();
rollback;
