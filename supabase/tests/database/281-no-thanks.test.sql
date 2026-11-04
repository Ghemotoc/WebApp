-- Database tests for a kind "No thanks" to a message request (bundle IDEAS-2, part c2; idea
-- IDEA-20261101-7).
-- What it proves:
-- - "No thanks" closes the request: it leaves the recipient's lists, and the sender's chat says
--   so (said_no_thanks, the day they may ask again) instead of "waiting" (criterion 1);
-- - the sender can't send another request for 30 days, and after them may write once, which opens
--   a new request, not an accepted chat;
-- - only the recipient of a request can say it, and only to a request;
-- - "Delete request" still tells the sender nothing (criterion 2);
-- - a message email waiting for the recipient about that request is dropped.
-- Personas: adult_writer (…01), blocker (…15) and teacher (…07), adults; nobody follows anybody.
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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
delete from public.follows_users where user_id in ('00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000001');
update public.profiles set messages_from = null where id in ('00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000001');
delete from public.conversations where '00000000-0000-4000-8000-000000000015' in (user_id, recipient_user_id);

/* ---------- 1. "No thanks" ---------- */

select pg_temp.sign_in('01');
select is(public.send_message('blocker', 'Would you read my first chapter?') ->> 'status', 'request',
  'adult_writer sends blocker a request');
select pg_temp.sign_in('07');
select throws_ok($$ select public.say_no_thanks_to_request('adult_writer') $$, 'P0002', null,
  'someone with no request from that person can''t say "No thanks"');
select pg_temp.sign_in('01');
select throws_ok($$ select public.say_no_thanks_to_request('blocker') $$, 'P0002', null,
  'the sender can''t answer their own request');

select pg_temp.sign_in('15');
select is(public.say_no_thanks_to_request('adult_writer') ->> 'status', 'declined',
  'the recipient answers "No thanks" and the request closes');
select is((select count(*) from public.my_conversations() where other_handle = 'adult_writer'), 0::bigint,
  'it leaves the recipient''s lists');
select pg_temp.as_owner();
select is((select count(*) from public.email_outbox
           where user_id = '00000000-0000-4000-8000-000000000015' and delivery = 'message' and sent_at is null),
  0::bigint, 'a message email still waiting about it is dropped');

select pg_temp.sign_in('01');
select is(public.conversation_with('blocker') ->> 'said_no_thanks', 'true',
  'the sender''s chat says the other person said no thanks (criterion 1)');
select is(public.conversation_with('blocker') ->> 'is_waiting', 'false', 'not that it is still waiting');
select is((select said_no_thanks from public.my_conversations() where other_handle = 'blocker'), true,
  'and so does their list');
select is((public.conversation_with('blocker') ->> 'ask_again_from')::timestamptz::date,
  (now() + interval '30 days')::date, 'they may ask again in 30 days');
select throws_ok($$ select public.send_message('blocker', 'Are you sure?') $$, '42501', null,
  'until then they can''t send another request (criterion 1)');

/* ---------- 2. After 30 days ---------- */

select pg_temp.as_owner();
update public.conversations set said_no_thanks_at = now() - interval '31 days'
  where '00000000-0000-4000-8000-000000000015' in (user_id, recipient_user_id);
select pg_temp.sign_in('01');
select is(public.send_message('blocker', 'A month on: would you like to swap feedback?') ->> 'status', 'request',
  'after 30 days the sender may write once more, which opens a new request');
select pg_temp.sign_in('15');
select is((select is_request_to_me from public.my_conversations() where other_handle = 'adult_writer'), true,
  'it is back in the recipient''s requests');

/* ---------- 3. Delete request still tells nobody ---------- */

select public.answer_message_request('adult_writer', false);
select pg_temp.sign_in('01');
select is(public.conversation_with('blocker') ->> 'said_no_thanks', 'false',
  'after "Delete request" the sender isn''t told (criterion 2)');

select * from finish();
rollback;
