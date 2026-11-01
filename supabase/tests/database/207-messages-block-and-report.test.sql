-- Database tests for blocking and reporting inside messages (story S1-E9-02; CLAUDE.md rule 6).
-- What it proves:
-- - criterion 1: after a block from a chat neither person can message or follow the other, the
--   follows both ways are gone and the blocked person gets no notification;
-- - criterion 2: a reported message reaches the case page with up to the 20 messages before it,
--   oldest first, and nothing after it; a message near the start of a chat brings only what there
--   is; the safeguarding evidence pack (case_item_content) holds the same context;
-- - admin_case_message() is for moderation staff only (support and the chat's own members are
--   refused), returns nothing for a case about something else, and each read is logged as a
--   sensitive read; message_with_context() can't be called from a screen.
-- Personas: adult_writer (…01) and teacher (…07), in the seeded chat; moderator (…10) and
-- support (…11). adults_only is switched off, as when minors join.
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = false where key = 'adults_only';

/* ---------- Setup: 22 more messages in the seeded chat, taking it to 25 ---------- */

-- Message n is sent n minutes after the start, from adult_writer when n is even, teacher when odd.
insert into public.messages (conversation_id, user_id, body, created_at)
select '00000000-0000-4000-a000-000000000901',
  case when step % 2 = 0 then '00000000-0000-4000-8000-000000000001'::uuid
       else '00000000-0000-4000-8000-000000000007'::uuid end,
  'Message ' || step, now() - interval '2 hours' + make_interval(mins => step)
from generate_series(1, 22) as step;

-- The labelled rows the tests use, readable by every role.
create temp table named (label text primary key, id uuid);
insert into named
select 'reported', id from public.messages where body = 'Message 21'
union all select 'after', id from public.messages where body = 'Message 22'
union all select 'first_seeded', (select messages.id from public.messages
  where messages.conversation_id = '00000000-0000-4000-a000-000000000901' order by messages.created_at limit 1);
grant select on named to authenticated;

/* ---------- 1. Reporting a message brings its context to the case ---------- */

select pg_temp.sign_in('01');
select ok((select report_reference from public.report_item('message', (select id::text from named where label = 'reported'),
  'harassment')) like 'R-%', 'adult_writer reports teacher''s message from the chat');
select pg_temp.as_owner();
insert into named select 'case', cases.id from public.cases
  where cases.item_type = 'message' and cases.item_id = (select id from named where label = 'reported');
insert into named select 'other_case', cases.id from public.cases where cases.item_type <> 'message' limit 1;

select pg_temp.sign_in('10');
create temp table seen as select public.admin_case_message((select id from named where label = 'case')) as answer;
select is(jsonb_array_length((select answer -> 'messages' from seen)), 21,
  'the case page gets the reported message and the 20 before it');
select is((select answer -> 'messages' -> 20 ->> 'id' from seen), (select id::text from named where label = 'reported'),
  'the reported message comes last');
select is((select answer -> 'messages' -> 20 ->> 'is_reported' from seen), 'true', 'and is marked as the reported one');
select is((select answer -> 'messages' -> 19 ->> 'is_reported' from seen), 'false', 'the others aren''t');
select is((select answer -> 'messages' -> 0 ->> 'text' from seen), 'Message 1',
  'the oldest of the 21 is Message 1, so the three seeded messages fall outside');
select is((select count(*)::integer from jsonb_array_elements((select answer -> 'messages' from seen)) as item
  where item ->> 'id' = (select id::text from named where label = 'after')), 0, 'nothing sent after it is included');
select is((select answer -> 'messages' -> 20 ->> 'from_handle' from seen), 'teacher', 'each message says who wrote it');
select is((select answer -> 'between' from seen), '["adult_writer", "teacher"]'::jsonb, 'and the case names the two people');
select is(public.admin_case_message((select id from named where label = 'other_case')), null,
  'a case about something else has no messages');

select pg_temp.as_owner();
select is((select count(*)::integer from public.audit_log where action = 'sensitive_read.case_message'
  and target_id = (select id::text from named where label = 'reported')
  and target_user_id = '00000000-0000-4000-8000-000000000007'), 1,
  'reading the messages is logged as a sensitive read about their writer');
select is(jsonb_array_length(public.case_item_content((select cases from public.cases
  where id = (select id from named where label = 'case'))) -> 'context'), 21,
  'the evidence pack holds the same 21 messages');
select is(jsonb_array_length(public.message_with_context((select id from named where label = 'first_seeded'))), 1,
  'the first message of a chat has no messages before it');

/* ---------- 2. Who may read a message case ---------- */

select pg_temp.sign_in('11');
select throws_ok(format($$ select public.admin_case_message(%L) $$, (select id from named where label = 'case')),
  '42501', null, 'support staff can''t read a message case');
select pg_temp.sign_in('01');
select throws_ok(format($$ select public.admin_case_message(%L) $$, (select id from named where label = 'case')),
  '42501', null, 'the person who reported it can''t read the case page''s copy');
select throws_ok(format($$ select public.message_with_context(%L) $$, (select id from named where label = 'reported')),
  '42501', null, 'no screen can call message_with_context() directly');

/* ---------- 3. Blocking from the chat ---------- */

select pg_temp.as_owner();
insert into public.follows_users (user_id, followed_user_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007'),
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;
create temp table notifications_before as
  select count(*)::integer as total from public.notifications where user_id = '00000000-0000-4000-8000-000000000007';
grant select on notifications_before to authenticated;

select pg_temp.sign_in('01');
select is(public.set_block('teacher', true) ->> 'blocked', 'true', 'adult_writer blocks teacher from the chat');
select throws_ok($$ select public.send_message('teacher', 'One more thing') $$, '42501', null,
  'adult_writer can''t message teacher any more');
select is(public.follow_writer('teacher', true) ->> 'following', 'false',
  'adult_writer''s follow of teacher silently does nothing (S1-E6-05)');
select pg_temp.sign_in('07');
select throws_ok($$ select public.send_message('adult_writer', 'Hello?') $$, 'P0002', null,
  'teacher can''t message adult_writer, and is told only that there is nobody by that name');
select throws_ok($$ select public.follow_writer('adult_writer', true) $$, 'P0002', null,
  'teacher can''t follow adult_writer either, who looks missing to them');
select pg_temp.as_owner();
select is((select count(*)::integer from public.follows_users
  where (user_id, followed_user_id) in (('00000000-0000-4000-8000-000000000001'::uuid, '00000000-0000-4000-8000-000000000007'::uuid),
    ('00000000-0000-4000-8000-000000000007'::uuid, '00000000-0000-4000-8000-000000000001'::uuid))), 0,
  'the follows both ways are gone');
select is((select count(*)::integer from public.notifications where user_id = '00000000-0000-4000-8000-000000000007'),
  (select total from notifications_before), 'teacher isn''t told about the block');

select * from finish();
rollback;
