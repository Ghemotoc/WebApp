-- Database tests for class space tools (bundle CLASSES, part b; story S1-E8-11).
-- What it proves:
-- - a new class locks at the end of the school year: the next 1 July, Romanian time (criterion 8);
-- - only whoever holds the settings power sets the date, locks now or unlocks; a plain member and
--   an open space are refused, and a date more than two years ahead too;
-- - a locked class: nobody posts, edits a post, joins with a code or gets a new code, but every
--   member still reads it (criterion 8: read access for life);
-- - unlocking opens it again, and every change is in the space's log;
-- - the teacher's "waiting to read" list names who can't read yet and why, never an age, and is
--   closed to a plain member.
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), kid_14_waiting (…04), teacher
-- (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement raises, or null when it runs.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
-- The class's log actions, oldest first, read past the policies.
create function pg_temp.log_actions() returns text language sql security definer as $$
  select string_agg(action, ' ' order by created_at, action) from public.space_moderation_log
  where space_id = (select id from public.spaces where slug = 'clasa-a-viii-a');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class, so this test runs with the age gate on (as in test 232).
update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

-- Codes, threads and posts kept between steps.
create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- 1. A new class and its lock date ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.create_class_space('Clasa a VIII-a', 'Cercul de lectură.') ->> 'slug', 'clasa-a-viii-a',
  'the teacher starts a class');
select is((public.space_page('clasa-a-viii-a') ->> 'locks_at')::timestamptz,
  make_timestamptz(extract(year from (now() at time zone 'Europe/Bucharest'))::integer
    + case when extract(month from (now() at time zone 'Europe/Bucharest')) >= 7 then 1 else 0 end,
    7, 1, 0, 0, 0, 'Europe/Bucharest'),
  'it locks on the next 1 July, Romanian time');
select is(public.space_page('clasa-a-viii-a') ->> 'is_locked', 'false', 'and is open until then');
insert into kept select 'thread', public.start_forum_thread('space-clasa-a-viii-a', 'Tema', 'Citiți capitolul.') ->> 'thread_number';
insert into kept select 'code', public.make_class_invite('clasa-a-viii-a', 30, 10) ->> 'code';

-- Two students join: one who can read, one still waiting for a parent.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select lives_ok(format($$select public.join_class_space(%L)$$, (select value from kept where name = 'code')),
  'a student joins');
select lives_ok(format($$select public.reply_to_forum_thread(%s, 'Am citit!')$$, (select value from kept where name = 'thread')),
  'and replies');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select lives_ok(format($$select public.join_class_space(%L)$$, (select value from kept where name = 'code')),
  'a student waiting for a parent joins too');

/* ---------- 2. The waiting list ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_waiting_members('clasa-a-viii-a'),
  jsonb_build_array(jsonb_build_object('handle', 'kid_14_waiting', 'reason', 'parental_consent',
    'display_name', 'kid_14_waiting')),
  'the teacher sees who waits to read and why, never an age');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.hint_of($$select public.class_waiting_members('clasa-a-viii-a')$$), 'space:not_allowed',
  'a plain member can''t read the list');

/* ---------- 3. Who sets the lock ---------- */

select is(pg_temp.hint_of($$select public.set_class_lock('clasa-a-viii-a', now())$$), 'space:not_allowed',
  'a plain member can''t lock the class');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.set_class_lock('clasa-a-viii-a', now() + interval '3 years')$$), 'lock:date',
  'a date more than two years ahead is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$select public.set_class_lock('fantasy-writers-circle', now())$$), 'space:not_class',
  'an open space never locks');

/* ---------- 4. Locked ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_class_lock('clasa-a-viii-a', now() - interval '1 day') ->> 'is_locked', 'true',
  'the teacher locks the class now');
select is(pg_temp.hint_of(format($$select public.reply_to_forum_thread(%s, 'Încă ceva')$$, (select value from kept where name = 'thread'))),
  'space:locked', 'nobody replies in a locked class, the teacher included');
select is(pg_temp.hint_of($$select public.start_forum_thread('space-clasa-a-viii-a', 'Nou', 'Text.')$$),
  'space:locked', 'nor starts a thread');
select is(pg_temp.hint_of($$select public.make_class_invite('clasa-a-viii-a')$$), 'space:locked',
  'and a locked class makes no codes');

-- The student's reply, found past the policies, for the edit below.
select pg_temp.as_postgres();
insert into kept select 'post', forum_posts.id::text from public.forum_posts
  join public.forum_threads on forum_threads.id = forum_posts.thread_id
  where forum_threads.thread_number = (select value::bigint from kept where name = 'thread') and forum_posts.post_number = 2;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select isnt(public.forum_thread((select value::bigint from kept where name = 'thread')), null,
  'a member still reads its threads');
select is(pg_temp.hint_of(format($$select public.edit_forum_post(%L, 'Schimbat')$$, (select value from kept where name = 'post'))),
  'space:locked', 'but can''t change a post''s words');
select is(public.space_page('clasa-a-viii-a') #>> '{viewer,can_post}', 'false', 'the page says nobody posts');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.class_invite_preview((select value from kept where name = 'code')) ->> 'status', 'ended',
  'the class''s code reads as ended');
select is(pg_temp.hint_of(format($$select public.join_class_space(%L)$$, (select value from kept where name = 'code'))),
  'invite:ended', 'and nobody new joins');

/* ---------- 5. Unlocked again ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_class_lock('clasa-a-viii-a', null) ->> 'is_locked', 'false', 'the teacher unlocks the class');
select lives_ok(format($$select public.reply_to_forum_thread(%s, 'Din nou deschis.')$$, (select value from kept where name = 'thread')),
  'and posting works again');
select is((public.set_class_lock('clasa-a-viii-a', now() + interval '30 days') ->> 'is_locked'), 'false',
  'a date ahead keeps it open until then');
select pg_temp.as_postgres();
select is(pg_temp.log_actions(), 'invite_made member_joined member_joined class_locked class_unlocked lock_date_changed',
  'every lock change is in the space''s log');

-- The app calls class_waiting_members() as a read (GET), which PostgREST runs read-only for a
-- stable function; it locks the space's row, so it must be volatile to work from the app.
select is(
  (select provolatile::text from pg_proc where oid = 'public.class_waiting_members(text)'::regprocedure),
  'v',
  'class_waiting_members is volatile, so the app''s call isn''t refused as read-only'
);

select * from finish();
rollback;
