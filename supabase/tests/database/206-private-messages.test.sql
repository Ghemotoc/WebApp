-- Database tests for private messages and message requests (story S1-E9-01; CLAUDE.md rules 1,
-- 6 and 15).
-- What it proves:
-- - a first message to someone who doesn't follow the sender is a request: it waits in their
--   requests, and the sender can't send more until it is accepted (criterion 2); one to someone
--   who follows the sender starts accepted;
-- - accepting lets both write; deleting a request hides it from the recipient, the sender isn't
--   told and still can't write; writing back to a request accepts it;
-- - the rules of S1-E9-03 gate the first message (an adult can't write to a 14-year-old) with the
--   same neutral refusal; an accepted chat goes on after the recipient changes their setting, but
--   a block stops it and hides it from both lists;
-- - a staff account can't be written to (members use moderator mail);
-- - text only, 1 to 2,000 characters; an unknown username is refused; nobody can write directly;
-- - the unread count and marking a chat read;
-- - policies conversations_select_member, conversation_members_select_own and
--   messages_select_member, allowed and denied; a hidden message is gone for the other person
--   while its writer still sees it;
-- - reporting (rule 6): the person who received a message can report it, someone outside the chat
--   can't, the writer can't report their own, and the queue reads "Private message from @…".
-- Personas: adult_writer (…01), kid_14_waiting (…04; kid_14_ok's profile is hidden by a seeded case), teacher (…07, in the seeded chat with
-- adult_writer), moderator (…10), support (…11), blocker (…15, an adult) and blocked (…16, 17),
-- with teen_17 (…02, who follows adult_writer). adults_only is switched off, as when minors join.
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.status_with(other_handle text) returns text language sql as $$
  select public.conversation_with(other_handle) ->> 'status';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = false where key = 'adults_only';
delete from public.follows_users where user_id in ('00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000016');
update public.profiles set messages_from = null, adults_may_message = false
  where id in ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015',
               '00000000-0000-4000-8000-000000000002');

/* ---------- 1. A request, then accepted ---------- */

select pg_temp.sign_in('01');
select is(public.send_message('blocker', 'Hello! Do you swap feedback?') ->> 'status', 'request',
  'a first message to someone who doesn''t follow the sender is a request');
select is(public.conversation_with('blocker') ->> 'is_waiting', 'true', 'the sender sees that it waits');
select throws_ok($$ select public.send_message('blocker', 'Are you there?') $$, '42501', null,
  'the sender can''t send more until it is accepted');
select pg_temp.sign_in('15');
select is((select is_request_to_me from public.my_conversations() where other_handle = 'adult_writer'), true,
  'it is in the recipient''s requests');
select is(public.unread_message_count(), 1, 'the request counts as unread');
select is(public.answer_message_request('adult_writer', true) ->> 'status', 'accepted', 'the recipient accepts it');
select is(public.unread_message_count(), 0, 'answering it reads it');
select pg_temp.sign_in('01');
select is(public.send_message('blocker', 'Thank you!') ->> 'status', 'accepted', 'once accepted, the sender can write again');

/* ---------- 2. Deleting a request; writing back to one ---------- */

select pg_temp.sign_in('07');
select is(public.send_message('blocker', 'Hi, would your class like a visit?') ->> 'status', 'request',
  'teacher''s first message to blocker is a request');
select pg_temp.sign_in('15');
select is(public.answer_message_request('teacher', false) ->> 'status', 'declined', 'blocker deletes the request');
select is((select count(*)::integer from public.my_conversations() where other_handle = 'teacher'), 0,
  'a deleted request leaves the recipient''s lists');
select pg_temp.sign_in('07');
select is(pg_temp.status_with('blocker'), 'declined', 'the sender''s own view still has the chat');
select is(public.conversation_with('blocker') ->> 'is_waiting', 'true', 'and it still only says it waits');
select throws_ok($$ select public.send_message('blocker', 'Hello again?') $$, '42501', null,
  'the sender of a deleted request still can''t write');
select pg_temp.as_owner();
update public.profiles set messages_from = 'everyone' where handle = 'teen_17';
select pg_temp.sign_in('16');
select is(public.send_message('teen_17', 'Hi! Loved your poem.') ->> 'status', 'request',
  'one 17-year-old writes to another who takes messages from everyone: a request');
select pg_temp.sign_in('02');
select is(public.send_message('blocked', 'Thank you so much!') ->> 'status', 'accepted',
  'writing back to a request accepts it');

/* ---------- 3. Following, and the rules of S1-E9-03 ---------- */

select pg_temp.as_owner();
update public.profiles set adults_may_message = true where handle = 'teen_17';
select pg_temp.sign_in('01');
select is(public.send_message('teen_17', 'Thanks for following my story!') ->> 'status', 'accepted',
  'a first message to someone who follows the sender starts accepted (a 17-year-old who lets adults message them)');
select throws_ok($$ select public.send_message('kid_14_waiting', 'Hello') $$, '42501', 'This person isn''t taking messages right now.',
  'an adult can''t write to a 14-year-old, and the refusal never says why');
select is(public.conversation_with('kid_14_waiting') ->> 'can_send', 'false', 'the chat panel says only that sending is off');
select is((select count(*)::integer from public.conversations
           where recipient_user_id = '00000000-0000-4000-8000-000000000004'), 0, 'nothing was stored');
select throws_ok($$ select public.send_message('support', 'Hello') $$, '42501', null,
  'a staff account isn''t an inbox: members write to the team through moderator mail');
select pg_temp.as_owner();
update public.profiles set messages_from = 'nobody' where handle = 'teacher';
select pg_temp.sign_in('01');
select is(public.send_message('teacher', 'One more thing about Friday.') ->> 'status', 'accepted',
  'a chat already going carries on after the recipient changes who may message them');

/* ---------- 4. Blocks ---------- */

select pg_temp.as_owner();
insert into public.blocks (user_id, blocked_user_id)
  values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001');
select pg_temp.sign_in('01');
select throws_ok($$ select public.send_message('teacher', 'Hello?') $$, 'P0002', null,
  'a block stops a chat already going: to the blocked person it is as if there were nobody by that name');
select is((select count(*)::integer from public.my_conversations() where other_handle = 'teacher'), 0,
  'and hides it from the blocked person''s list');
select is(public.conversation_with('teacher'), null, 'someone who blocks the caller can''t be opened at all');
select pg_temp.sign_in('07');
select is((select count(*)::integer from public.my_conversations() where other_handle = 'adult_writer'), 0,
  'the one who blocked doesn''t see it either');
select pg_temp.as_owner();
delete from public.blocks where user_id = '00000000-0000-4000-8000-000000000007';

/* ---------- 5. The words and the person ---------- */

select pg_temp.sign_in('01');
select throws_ok($$ select public.send_message('teacher', '   ') $$, '23514', null, 'an empty message is refused');
select throws_ok($$ select public.send_message('teacher', repeat('a', 2001)) $$, '23514', null,
  'a message over 2,000 characters is refused');
select throws_ok($$ select public.send_message('nobody_here_at_all', 'Hello') $$, 'P0002', null, 'an unknown username is refused');
select throws_ok($$ insert into public.messages (conversation_id, user_id, body)
  values ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000001', 'Direct') $$,
  '42501', null, 'nobody writes to the table directly');

/* ---------- 6. Reading: unread and the policies ---------- */

select pg_temp.sign_in('07');
select is((select has_unread from public.my_conversations() where other_handle = 'adult_writer'), true,
  'teacher has an unread message from adult_writer');
select public.mark_conversation_read('adult_writer');
select is((select has_unread from public.my_conversations() where other_handle = 'adult_writer'), false,
  'opening the chat reads it');
-- allowed: conversations_select_member: one of the two people reads their chat.
select is((select count(*)::integer from public.conversations where id = '00000000-0000-4000-a000-000000000901'), 1,
  'allowed: conversations_select_member: teacher reads the chat they are in');
-- allowed: messages_select_member: one of the two people reads its messages.
select is((select count(*)::integer from public.messages where conversation_id = '00000000-0000-4000-a000-000000000901'), 4,
  'allowed: messages_select_member: teacher reads the chat''s messages');
-- allowed: conversation_members_select_own: one's own membership row.
select is((select count(*)::integer from public.conversation_members where conversation_id = '00000000-0000-4000-a000-000000000901'), 1,
  'allowed: conversation_members_select_own: teacher reads only their own membership');
select pg_temp.sign_in('11');
-- denied: conversations_select_member, messages_select_member and conversation_members_select_own.
select is((select count(*)::integer from public.conversations where id = '00000000-0000-4000-a000-000000000901'), 0,
  'denied: conversations_select_member: support can''t read a chat they aren''t in');
select is((select count(*)::integer from public.messages where conversation_id = '00000000-0000-4000-a000-000000000901'), 0,
  'denied: messages_select_member: support can''t read its messages');
select is((select count(*)::integer from public.conversation_members
           where user_id = '00000000-0000-4000-8000-000000000007'), 0,
  'denied: conversation_members_select_own: support can''t read teacher''s memberships');

/* ---------- 7. Reporting and moderation ---------- */

select pg_temp.as_owner();
create temp table reported as
  select id from public.messages where body = 'One more thing about Friday.';
grant select on reported to authenticated;
select pg_temp.sign_in('07');
select ok((select report_reference from public.report_item('message', (select id::text from reported), 'harassment')) like 'R-%',
  'the person who received a message can report it');
select pg_temp.sign_in('11');
select throws_ok($$ select * from public.report_item('message', (select id::text from reported), 'spam') $$, '23514', null,
  'someone outside the chat can''t, so the message''s existence never leaks');
select pg_temp.as_owner();
select is(public.reportable_item_summary('message', (select id from reported)),
  'Private message from @adult_writer: One more thing about Friday.', 'the queue says whose message it is and its words');
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
  select '00000000-0000-4000-8000-000000000001', 'message', id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Test'
  from reported;
select pg_temp.sign_in('07');
select is((select count(*)::integer from public.messages where id = (select id from reported)), 0,
  'denied: messages_select_member: a hidden message is gone for the other person');
select pg_temp.sign_in('01');
select is((select count(*)::integer from public.messages where id = (select id from reported)), 1,
  'allowed: messages_select_member: its writer still sees a hidden message');

select * from finish();
rollback;
