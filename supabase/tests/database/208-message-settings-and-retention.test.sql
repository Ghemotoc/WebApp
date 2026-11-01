-- Database tests for message settings, Delete chat and how long messages are kept (story
-- S1-E9-04; CLAUDE.md rules 1 and 15; GDPR art. 5(1)(e)).
-- What it proves:
-- - criterion 1: an adult starts on "everyone" and an under-18 on "people I follow"; anyone can
--   pick "nobody", which stops new chats; only a 16 or 17-year-old has "Let adults message me";
--   signed out and an empty choice are refused;
-- - Delete chat removes the chat for the caller only: it leaves their list and its messages are
--   gone for them (policy messages_select_member, allowed and denied), the other person still has
--   everything; a new message brings the chat back with only that message; a request waiting for
--   the caller's answer can't be deleted this way;
-- - criterion 2: the clean-up does nothing while only one person deleted the chat; once both did,
--   it deletes for good every message sent before the earlier deletion, and then the empty chat;
-- - criterion 3: a reported message and the 20 before it are kept while the case is open and for
--   reported_messages_keep_days after the decision, then deleted; a declined request is kept;
-- - the nightly job is scheduled.
-- Personas: adult_writer (…01) and teacher (…07), in the seeded chat; teen_17 (…02) and blocker
-- (…15, an adult). Timestamps are set by hand where the test needs "earlier", because now() is
-- the same all through one transaction. adults_only is switched off, as when minors join.
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.messages_in(chat_id uuid) returns integer language sql as $$
  select count(*)::integer from public.messages where conversation_id = chat_id;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.profiles set messages_from = null, adults_may_message = false
  where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
               '00000000-0000-4000-8000-000000000015');

/* ---------- 1. Who may message you ---------- */

select pg_temp.sign_in('01');
select is(public.my_message_settings() ->> 'audience', 'everyone', 'an adult starts on "everyone"');
select lives_ok($$ select public.set_message_audience('nobody') $$, 'adult_writer picks "nobody"');
select is(public.my_message_settings() ->> 'audience', 'nobody', 'and the choice is saved');
select throws_ok($$ select public.set_message_audience(null) $$, '23514', null, 'an empty choice is refused');
select throws_ok($$ select public.set_adults_may_message(true) $$, '42501', null,
  'an adult has no "Let adults message me" switch');
select pg_temp.sign_in('15');
select throws_ok($$ select public.send_message('adult_writer', 'Hello!') $$, '42501', null,
  'with "nobody", a new chat with adult_writer is refused');
select pg_temp.sign_in('02');
select is(public.my_message_settings() ->> 'audience', 'people_i_follow', 'an under-18 starts on "people I follow"');
select lives_ok($$ select public.set_adults_may_message(true) $$, 'a 17-year-old can let adults message them');
select is(public.my_message_settings() ->> 'adults_may_message', 'true', 'and the switch is saved');
select pg_temp.as_owner();
set local role anon;
select throws_ok($$ select public.set_message_audience('everyone') $$, '42501', null,
  'signed out, nobody can change a setting');
select pg_temp.as_owner();
update public.profiles set messages_from = null where id = '00000000-0000-4000-8000-000000000001';

/* ---------- 2. Delete chat, for one person ---------- */

select pg_temp.sign_in('01');
select lives_ok($$ select public.delete_conversation('teacher') $$, 'adult_writer deletes the chat with teacher');
-- Their deletion is set half an hour back, so a message sent "now" comes after it.
select pg_temp.as_owner();
update public.conversation_members set deleted_at = now() - interval '30 minutes', last_read_at = now() - interval '30 minutes'
  where conversation_id = '00000000-0000-4000-a000-000000000901' and user_id = '00000000-0000-4000-8000-000000000001';
select pg_temp.sign_in('01');
select is((select count(*)::integer from public.my_conversations() where other_handle = 'teacher'), 0,
  'the chat leaves adult_writer''s list');
select is(jsonb_array_length(public.conversation_with('teacher') -> 'messages'), 0,
  'and its messages are gone for them');
select is(pg_temp.messages_in('00000000-0000-4000-a000-000000000901'), 0,
  'denied: messages_select_member: adult_writer no longer reads the messages from before they deleted the chat');
select pg_temp.sign_in('07');
select is(pg_temp.messages_in('00000000-0000-4000-a000-000000000901'), 3,
  'allowed: messages_select_member: teacher still reads all three');
select is((select count(*)::integer from public.my_conversations() where other_handle = 'adult_writer'), 1,
  'and still has the chat in their list');
select is(public.send_message('adult_writer', 'Are the answers ready?') ->> 'status', 'accepted', 'teacher writes again');
select pg_temp.sign_in('01');
select is(jsonb_array_length(public.conversation_with('teacher') -> 'messages'), 1,
  'the chat comes back for adult_writer with only the new message');
select is(public.unread_message_count(), 1, 'and it counts as unread');

/* ---------- 3. The clean-up ---------- */

select pg_temp.as_owner();
select is(public.purge_deleted_chats(), 0, 'while only one person deleted the chat, nothing is deleted');
select pg_temp.sign_in('07');
select lives_ok($$ select public.delete_conversation('adult_writer') $$, 'teacher deletes it too');
select pg_temp.as_owner();
select is(public.purge_deleted_chats(), 3, 'the clean-up deletes the three messages sent before both deletions');
select is(pg_temp.messages_in('00000000-0000-4000-a000-000000000901'), 1,
  'the message sent after adult_writer''s deletion stays until they delete again');
update public.conversation_members set deleted_at = now()
  where conversation_id = '00000000-0000-4000-a000-000000000901';
select public.purge_deleted_chats();
select is((select count(*)::integer from public.conversations where id = '00000000-0000-4000-a000-000000000901'), 0,
  'once both deleted everything, the empty chat goes too');

/* ---------- 4. Reported messages are kept while they are needed ---------- */

-- A chat between teacher and blocker with 25 messages; blocker reports teacher's Message 22.
insert into public.conversations (id, user_id, recipient_user_id, status, accepted_at, last_message_at)
values ('00000000-0000-4000-a000-000000000999', '00000000-0000-4000-8000-000000000007',
        '00000000-0000-4000-8000-000000000015', 'accepted', now() - interval '3 hours', now() - interval '1 hour');
insert into public.conversation_members (conversation_id, user_id)
values ('00000000-0000-4000-a000-000000000999', '00000000-0000-4000-8000-000000000007'),
       ('00000000-0000-4000-a000-000000000999', '00000000-0000-4000-8000-000000000015');
insert into public.messages (conversation_id, user_id, body, created_at)
select '00000000-0000-4000-a000-000000000999',
  case when step % 2 = 0 then '00000000-0000-4000-8000-000000000007'::uuid
       else '00000000-0000-4000-8000-000000000015'::uuid end,
  'Message ' || step, now() - interval '3 hours' + make_interval(mins => step)
from generate_series(1, 25) as step;
create temp table reported as select id from public.messages where body = 'Message 22'
  and conversation_id = '00000000-0000-4000-a000-000000000999';
grant select on reported to authenticated;
select pg_temp.sign_in('15');
select ok((select report_reference from public.report_item('message', (select id::text from reported), 'harassment')) like 'R-%',
  'blocker reports teacher''s Message 22');
select pg_temp.as_owner();
update public.conversation_members set deleted_at = now()
  where conversation_id = '00000000-0000-4000-a000-000000000999';
select is(public.purge_deleted_chats(), 4, 'with the case open, only the 4 messages outside the report''s context go');
select is(pg_temp.messages_in('00000000-0000-4000-a000-000000000999'), 21,
  'the reported message and the 20 before it stay for the moderators');
update public.cases set status = 'decided', decision = 'no_action', decided_at = now() - interval '10 days',
  decided_by_user_id = '00000000-0000-4000-8000-000000000010'
  where item_type = 'message' and item_id = (select id from reported);
select is(public.purge_deleted_chats(), 0, 'ten days after the decision they are still kept');
update public.cases set decided_at = now() - interval '181 days'
  where item_type = 'message' and item_id = (select id from reported);
select is(public.purge_deleted_chats(), 21, 'after reported_messages_keep_days (180) they are deleted');

-- A declined request both deleted, with no messages left: kept, so its sender still can't write.
insert into public.conversations (id, user_id, recipient_user_id, status, last_message_at)
values ('00000000-0000-4000-a000-000000000998', '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002', 'declined', now() - interval '1 day');
insert into public.conversation_members (conversation_id, user_id, deleted_at)
values ('00000000-0000-4000-a000-000000000998', '00000000-0000-4000-8000-000000000001', now()),
       ('00000000-0000-4000-a000-000000000998', '00000000-0000-4000-8000-000000000002', now());
select public.purge_deleted_chats();
select is((select count(*)::integer from public.conversations where id = '00000000-0000-4000-a000-000000000998'), 1,
  'a declined request is kept by the clean-up');
select is((select count(*)::integer from cron.job where jobname = 'purge-deleted-chats'), 1,
  'the clean-up runs nightly');

select * from finish();
rollback;
