-- Database tests for the chat header's writer line, the line that says why the message box is
-- gone, and New chat's list of people (user stories 4.2 and 4.3, boards E12 and E13; migration
-- books_e12_e13_chat_partner_and_new_chat).
-- What it proves:
-- - latest_story names the other person's latest story only when the caller may open it: a
--   rating above the caller's age or a private story leaves it out, and a writer with nothing
--   readable gets null;
-- - adults_switch_stops is true only for the 16 or 17-year-old whose own "Let adults message me"
--   switch is off; the adult on the other side never learns why (S1-E9-03), and it turns false
--   once the teen switches it on;
-- - new_chat_people lists only people the caller follows and may write to now: not someone who
--   isn't followed (even with a chat going), a 14-year-old, a teen whose adults switch is off, a
--   staff account or someone who blocked the caller;
-- - chat_partner_story and my_adults_switch_stops_chat are internal: members can't call them;
-- - signed out, both member functions are refused.
-- No rule is loosened: the tests read can_message(), blocks and the under-18 defaults as they are.
-- Personas: adult_writer (…01, writes The Salt Mine Choir), teen_17 (…02, follows adult_writer),
-- kid_14_waiting (…04), teacher (…07, in the seeded chat with adult_writer), support (…11),
-- blocker (…15). adults_only is switched off, as when minors join.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The handles New chat offers, in order, as one comma-separated line.
create function pg_temp.offered() returns text language sql as $$
  select coalesce(string_agg(person ->> 'handle', ',' order by ordinality), '')
  from jsonb_array_elements(public.new_chat_people()) with ordinality as offered(person, ordinality);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.profiles set messages_from = null, adults_may_message = false
  where id in ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007',
               '00000000-0000-4000-8000-000000000015');
delete from public.follows_users where user_id = '00000000-0000-4000-8000-000000000001';
insert into public.follows_users (user_id, followed_user_id)
  select '00000000-0000-4000-8000-000000000001', followed.id
  from public.profiles as followed
  where followed.handle in ('teacher', 'teen_17', 'kid_14_waiting', 'blocker', 'support');

/* ---------- 1. The writer line in the chat header ---------- */

select pg_temp.sign_in('02');
select is(public.conversation_with('adult_writer') -> 'latest_story' ->> 'title', 'The Salt Mine Choir',
  'a 17-year-old sees the adult writer''s latest story they may read');
select is((public.conversation_with('adult_writer') -> 'latest_story' ->> 'chapter_count')::integer, 7,
  'with the number of chapters the reader can open');
select pg_temp.as_owner();
update public.stories set rating = '18_plus' where slug = 'salt-mine-choir-look';
select pg_temp.sign_in('02');
select is(public.conversation_with('adult_writer') -> 'latest_story', 'null'::jsonb,
  'an 18+ story is never named to a 17-year-old');
select pg_temp.sign_in('07');
select is(public.conversation_with('adult_writer') -> 'latest_story' ->> 'title', 'The Salt Mine Choir',
  'an adult still sees the 18+ story named');
select pg_temp.as_owner();
update public.stories set rating = '13_plus', visibility = 'private' where slug = 'salt-mine-choir-look';
select pg_temp.sign_in('07');
select is(public.conversation_with('adult_writer') -> 'latest_story', 'null'::jsonb,
  'a private story is never named');
select pg_temp.as_owner();
update public.stories set visibility = 'public' where slug = 'salt-mine-choir-look';
select pg_temp.sign_in('01');
select is(public.conversation_with('teacher') -> 'latest_story', 'null'::jsonb,
  'someone with no readable story gets no writer line');

/* ---------- 2. Why the message box is gone ---------- */

select pg_temp.sign_in('02');
select is(public.conversation_with('adult_writer') ->> 'can_send', 'false',
  'a 17-year-old whose adults switch is off can''t write to an adult');
select is(public.conversation_with('adult_writer') ->> 'adults_switch_stops', 'true',
  'and is told it is their own switch, so they can change it');
select pg_temp.sign_in('01');
select is(public.conversation_with('teen_17') ->> 'adults_switch_stops', 'false',
  'the adult on the other side is never told why (S1-E9-03)');
select pg_temp.sign_in('01');
select is(public.conversation_with('kid_14_waiting') ->> 'adults_switch_stops', 'false',
  'an adult and a 14-year-old: no switch can change it, so nothing is said');
select pg_temp.as_owner();
update public.profiles set adults_may_message = true where handle = 'teen_17';
select pg_temp.sign_in('02');
select is(public.conversation_with('adult_writer') ->> 'adults_switch_stops', 'false',
  'once the teen switches adults on, the line goes');

/* ---------- 3. New chat's people ---------- */

select pg_temp.as_owner();
update public.profiles set adults_may_message = false where handle = 'teen_17';
select pg_temp.sign_in('01');
select is(pg_temp.offered(), 'blocker,teacher',
  'New chat offers only followed people the caller may write to: no 14-year-old, no teen with adults off, no staff');
select pg_temp.as_owner();
update public.profiles set adults_may_message = true where handle = 'teen_17';
select pg_temp.sign_in('01');
select is(pg_temp.offered(), 'blocker,teacher,teen_17',
  'a 17-year-old who lets adults message them is offered');
select pg_temp.as_owner();
delete from public.follows_users
  where user_id = '00000000-0000-4000-8000-000000000001'
    and followed_user_id = '00000000-0000-4000-8000-000000000007';
insert into public.blocks (user_id, blocked_user_id)
  values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001');
select pg_temp.sign_in('01');
select is(pg_temp.offered(), 'teen_17',
  'someone not followed (even with a chat going) and someone who blocked the caller are not offered');

/* ---------- 4. Internal helpers and signed out ---------- */

select pg_temp.sign_in('01');
select throws_ok($$ select public.chat_partner_story('00000000-0000-4000-8000-000000000007') $$,
  '42501', null, 'a member can''t call chat_partner_story directly');
select throws_ok($$ select public.my_adults_switch_stops_chat('00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001') $$, '42501', null,
  'a member can''t ask about someone else''s adults switch');
select pg_temp.sign_out();
select throws_ok($$ select public.new_chat_people() $$, '42501', null, 'signed out, New chat is refused');
select throws_ok($$ select public.conversation_with('adult_writer') $$, '42501', null,
  'signed out, a chat is refused');

select * from finish();
rollback;
