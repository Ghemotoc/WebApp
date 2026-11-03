-- Epic check for S1-E11, round two: the admin stories of bundle ADMIN-2 working together
-- (story S1-E11-QA; stories S1-E11-07, S1-E11-08, S1-E11-09 and S1-E11-13).
-- One journey in the database, with the personas the stories name:
-- - blocker writes to support about adult_writer's story; support converts the ticket into a
--   report that lands as a case on that story (S1-E11-13 × S1-E10-02 × S1-E10-03a);
-- - the moderator finds the story in the Stories list and restricts it with a reason; support
--   can see the story but not change it (S1-E11-07 × S1-E11-08);
-- - the moderator can't read the ticket and the content editor can't touch either area;
-- - support opens a data request from the same ticket; the staff copy for it holds the ticket
--   without the internal note (S1-E11-13 × S1-E11-09 × S1-E13-02);
-- - the audit log names each step on behalf of the right staff member (S1-E11-01);
-- - two years after the ticket closes it is deleted, while the case's notice and the data
--   request keep their own records (S1-E13-04 retention).
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- Staff claims with a fresh sign-in (amr), as the admin shell's rules expect (S1-E11-01).
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint)))::text, true);
$$;

-- adult_writer's seed story Stația meteo gets a published chapter, so its address is public.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epice11b', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
  where id = '00000000-0000-4000-9000-000000000001';

-- blocker's ticket, with their message, support's answer and a staff note.
insert into public.support_tickets (number, requester_user_id, subject, channel, status, last_message_at)
values (900401, '00000000-0000-4000-8000-000000000015', 'This story copies mine', 'in_app', 'open', now());
insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
select id, 'from_requester'::public.support_message_kind, requester_user_id, 'Stația meteo is my poem.', 'in_app'::public.support_ticket_channel
  from public.support_tickets where number = 900401
union all
select id, 'internal_note'::public.support_message_kind, '00000000-0000-4000-8000-000000000011', 'Staff only: compare dates', 'in_app'::public.support_ticket_channel
  from public.support_tickets where number = 900401;

/* ---------- 1. Support → moderation ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temp table converted on commit drop as
  select public.admin_convert_ticket_to_report(900401, '/s/statia-meteo-seed01', 'copyright',
    'The person says the story copies their poem.') as result;
reset role;
select is((select cases.item_id from public.cases join public.public_notices on public_notices.case_id = cases.id
           where public_notices.reference = (select result ->> 'reference' from converted)),
  '00000000-0000-4000-9000-000000000001'::uuid,
  'support converts the ticket and the case is about adult_writer''s story');

/* ---------- 2. The Stories area ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok(public.admin_search_stories('statia') -> 'stories' @> '[{"id": "00000000-0000-4000-9000-000000000001"}]'
  or public.admin_search_stories('meteo')::text like '%00000000-0000-4000-9000-000000000001%',
  'the moderator finds the story in the Stories list');
select lives_ok($$ select public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001', 'restricted',
  'copyright', 'Checking a copyright notice.') $$, 'the moderator restricts it with a reason');
reset role;
select is(public.admin_story_visibility('00000000-0000-4000-9000-000000000001'), 'restricted', 'the story is restricted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_support_ticket(900401) $$, '42501', null,
  'the moderator can''t read the support ticket');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001', 'shown',
  'other', 'Support tries.') $$, '42501', null, 'support sees stories but can''t change one');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_convert_ticket_to_report(900401, '', 'other', 'Editor tries.') $$, '42501', null,
  'the content editor can''t convert a ticket');
select throws_ok($$ select public.admin_search_stories('') $$, '42501', null,
  'nor search the stories');

/* ---------- 3. Support → data request → the copy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temp table opened on commit drop as select public.admin_open_ticket_data_request(900401, 'copy') as result;
create temp table copy on commit drop as
  select public.admin_data_request_export((select id from public.data_requests
    where reference = (select result ->> 'reference' from opened))) as document;
select ok((select document #> '{tables,support_tickets}' @> '[{"number": 900401, "messages": [{"from": "you"}]}]' from copy)
  and (select position('Staff only' in document::text) = 0 from copy),
  'the staff copy for the data request holds the ticket without the staff note');

/* ---------- 4. The audit log ---------- */

reset role;
select is((select array_agg(action order by action) from public.audit_log
           where user_id = '00000000-0000-4000-8000-000000000011'
             and target_user_id = '00000000-0000-4000-8000-000000000015'
             and action in ('support_ticket.converted_to_report', 'data_request.opened', 'data_request.copy_read')),
  '{data_request.copy_read,data_request.opened,support_ticket.converted_to_report}'::text[],
  'the audit log names support''s three steps against blocker''s account');
select ok(exists (select 1 from public.audit_log
           where user_id = '00000000-0000-4000-8000-000000000010'
             and target_id = '00000000-0000-4000-9000-000000000001'),
  'and the moderator''s change to the story');

/* ---------- 5. Retention ---------- */

update public.support_tickets set status = 'closed', closed_at = now() - interval '3 years' where number = 900401;
select ok(public.purge_old_support_tickets() >= 1, 'the nightly job runs');
select ok(not exists (select 1 from public.support_tickets where number = 900401),
  'two years after it closes, the ticket is deleted');
select is((select support_ticket_number from public.public_notices where reference = (select result ->> 'reference' from converted)),
  900401::bigint, 'the case''s notice keeps the ticket''s number');
select ok(exists (select 1 from public.data_requests where reference = (select result ->> 'reference' from opened)),
  'and the data request keeps its own record');

select * from finish();
rollback;
