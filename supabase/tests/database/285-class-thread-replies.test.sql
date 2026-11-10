-- Database tests for "Who has replied" in a class thread (bundle 14d IDEAS-3, part b; idea
-- IDEA-20261102-5).
-- What it proves:
-- - the teacher sees the class split into who has posted in a thread and who hasn't yet, by name
--   only and without themselves (criterion 1);
-- - a student in the class, someone outside it and a visitor get nothing (criterion 2);
-- - a removed post no longer counts as a reply;
-- - a thread outside any class gets nothing, even for its own writer.
-- No new table or policy. Personas: adult_writer (…01), kid_14_ok (…03), kid_14_waiting (…04),
-- teacher (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The handles in one of the two lists, in order, for the class thread.
create function pg_temp.handles(answer jsonb, list text) returns text language sql as $$
  select string_agg(entry ->> 'handle', ',' order by ordinality)
  from jsonb_array_elements(answer -> list) with ordinality as listed (entry, ordinality);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class, so this test runs with the age gate on (as in test 233).
update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

-- Codes and threads kept between steps.
create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- Set-up: a class, a thread, two students, one reply ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a VII-a', 'Atelier de scris.');
insert into kept select 'thread', public.start_forum_thread('space-clasa-a-vii-a', 'Tema 1', 'Scrieți o pagină.') ->> 'thread_number';
insert into kept select 'code', public.make_class_invite('clasa-a-vii-a', 30, 10) ->> 'code';
insert into kept select 'other', public.start_forum_thread('first-chapters', 'Nu e o clasă', 'Un fir obișnuit.') ->> 'thread_number';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space((select value from kept where name = 'code'));
select public.reply_to_forum_thread((select value from kept where name = 'thread')::integer, 'Gata!');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select public.join_class_space((select value from kept where name = 'code'));

select pg_temp.as_postgres();
insert into kept select 'thread_id', id::text from public.forum_threads
  where thread_number = (select value from kept where name = 'thread')::integer;
insert into kept select 'other_id', id::text from public.forum_threads
  where thread_number = (select value from kept where name = 'other')::integer;

/* ---------- 1. The teacher sees both lists ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.handles(public.class_thread_replies((select value::uuid from kept where name = 'thread_id')), 'replied'),
  'kid_14_ok', 'the teacher sees who has replied');
select is(pg_temp.handles(public.class_thread_replies((select value::uuid from kept where name = 'thread_id')), 'not_yet'),
  'kid_14_waiting', 'and who hasn''t yet, without the teacher in either list');
select is((select count(*)::integer from jsonb_object_keys(
    public.class_thread_replies((select value::uuid from kept where name = 'thread_id')) -> 'replied' -> 0)),
  3, 'each name is a handle, a display name and whether it came after the due date (MUST-1d), never an age or an ID');

/* ---------- 2. Nobody else sees them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_thread_replies((select value::uuid from kept where name = 'thread_id')), null,
  'a student in the class gets nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.class_thread_replies((select value::uuid from kept where name = 'thread_id')), null,
  'someone outside the class gets nothing');
select pg_temp.as_postgres();
select ok(not has_function_privilege('anon', 'public.class_thread_replies(uuid)', 'execute'),
  'a visitor can''t ask at all');

/* ---------- 3. Removed posts and threads outside a class ---------- */

update public.forum_posts set deleted_at = now()
where thread_id = (select value::uuid from kept where name = 'thread_id')
  and user_id = '00000000-0000-4000-8000-000000000003';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.handles(public.class_thread_replies((select value::uuid from kept where name = 'thread_id')), 'replied'),
  null, 'a removed post no longer counts as a reply');
select is(pg_temp.handles(public.class_thread_replies((select value::uuid from kept where name = 'thread_id')), 'not_yet'),
  'kid_14_ok,kid_14_waiting', 'so that student is back on the "not yet" list');
select is(public.class_thread_replies((select value::uuid from kept where name = 'other_id')), null,
  'a thread outside any class gets nothing, even for its own writer');

select * from finish();
rollback;
