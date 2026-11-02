-- Epic check for S1-E8, forums and spaces (story S1-E8-QA; bundle CLASSES, part f).
-- It adds no feature: it walks the epic's main journeys through the database, crossing its
-- twelve stories with each other, with the seed personas the story names.
-- 1. One forum thread, every age (S1-E8-02 × 03 × 04 × 05 × 10, with S1-E2-03): adult_writer
--    starts a thread; kid_14_waiting reads it but can't reply until a parent agrees; kid_14_ok
--    replies quoting the first post; teen_17 finds it under "New for you", reads it, and a new
--    reply makes it unread again from that reply; forum search finds kid_14_ok's words; a
--    moderator locks the thread and the server refuses the next reply.
-- 2. A space with its moderator, signature and rank (S1-E8-06 × 07 × 08 × 09): adult_writer sets
--    a signature and starts a 16+ space; teen_17 joins and is made a moderator; kid_14_ok, under
--    16, can't join; a post in the space carries its author's signature and rank, never a user ID.
-- 3. A class and its certificates (S1-E8-11 × 12, with S1-E2-03 and S1-E2-11): the teacher
--    starts a class and makes a code; kid_14_ok joins and reads; kid_14_waiting joins but waits
--    for a parent; adult_writer, not in the class, never sees it; the teacher signs kid_14_ok's
--    certificate, kid_14_ok finds it and a signed-out visitor checks the code without the name.
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), kid_14_waiting (…04),
-- teacher (…07), moderator (…10). Test data: made here and rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
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
-- Values the journeys keep between steps (a thread number, a code).
create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept_value(wanted text) returns text language sql as $$
  select value from kept where name = wanted;
$$;
-- The test thread as listed in its forum for the caller.
create function pg_temp.listed() returns jsonb language sql as $$
  select thread from jsonb_array_elements((public.forum_thread_list('first-chapters')) -> 'threads') as thread
  where (thread ->> 'number')::bigint = pg_temp.kept_value('thread')::bigint;
$$;
-- A post's ID by its number in the test thread (the posts table isn't read directly).
create function pg_temp.post_id(number integer) returns uuid language sql security definer as $$
  select forum_posts.id from public.forum_posts
  join public.forum_threads on forum_threads.id = forum_posts.thread_id
  where forum_threads.thread_number = pg_temp.kept_value('thread')::bigint and forum_posts.post_number = number;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adults_only keeps minors read-only in March; the journeys run as they will once minors join.
-- parental_consent stays on, so kid_14_waiting waits for a parent (S1-E2-03).
update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.feature_flags set is_enabled = true where key = 'parental_consent';
-- The seed accounts are new, so the new-account limits apply; the journeys post more than they allow.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';
update public.settings set value = value || '{"space_create": {"new_account": 20, "older_account": 20}}'::jsonb
where key = 'rate_limits';

/* ---------- 1. One forum thread, every age ---------- */

select pg_temp.sign_in('01');
insert into kept select 'thread', public.start_forum_thread('first-chapters', 'Epic opt început',
  'Cum vă începeți primul capitol?') ->> 'thread_number';
select isnt(pg_temp.kept_value('thread'), null, 'adult_writer starts a thread (S1-E8-02)');

select pg_temp.sign_in('04');
select is(public.forum_thread(pg_temp.kept_value('thread')::bigint) #>> '{posts,0,body}',
  'Cum vă începeți primul capitol?', 'kid_14_waiting reads the thread while a parent hasn''t agreed');
select isnt(pg_temp.hint_of(format($$select public.reply_to_forum_thread(%s, 'Eu încep cu un vis.')$$,
  pg_temp.kept_value('thread'))), null, 'but the server refuses their reply until a parent agrees (S1-E2-03 × S1-E8-02)');

select pg_temp.sign_in('03');
select is((public.reply_to_forum_thread(pg_temp.kept_value('thread')::bigint, 'Eu încep cu un zmeu portocaliu.',
  array[pg_temp.post_id(1)])) ->> 'post_number', '2', 'kid_14_ok replies quoting the first post (S1-E8-03)');
select is(public.forum_thread(pg_temp.kept_value('thread')::bigint) #>> '{posts,1,quotes,0,author,handle}',
  'adult_writer', 'the quote shows its author''s handle');

select pg_temp.sign_in('02');
select ok(jsonb_path_query_array(public.forum_new_for_you(), '$[*].number')
    @> jsonb_build_array(pg_temp.kept_value('thread')::bigint),
  'teen_17 finds the thread under "New for you" (S1-E8-04)');
select public.mark_forum_thread_read(pg_temp.kept_value('thread')::bigint, 2);
select is((pg_temp.listed() ->> 'is_unread')::boolean, false, 'reading it to the last post marks it read');
select is((public.search_forum_posts('zmeu portocaliu')) #>> '{results,0,author,handle}', 'kid_14_ok',
  'forum search finds kid_14_ok''s words (S1-E8-10)');

select pg_temp.sign_in('01');
select public.reply_to_forum_thread(pg_temp.kept_value('thread')::bigint, 'Ce idee bună!');
select pg_temp.sign_in('02');
select is((pg_temp.listed() ->> 'first_unread_post')::integer, 3, 'a new reply makes it unread again from #3');

select pg_temp.sign_in('10');
select lives_ok(format($$select public.admin_lock_forum_thread(%s, 'Discuția s-a încheiat.')$$,
  pg_temp.kept_value('thread')), 'a moderator locks the thread (S1-E8-05)');
select pg_temp.sign_in('03');
select is(pg_temp.hint_of(format($$select public.reply_to_forum_thread(%s, 'Încă ceva.')$$, pg_temp.kept_value('thread'))),
  'thread:locked', 'and the server refuses kid_14_ok''s next reply');
select is(public.forum_thread(pg_temp.kept_value('thread')::bigint)::text like '%00000000-0000-4000-8000%', false,
  'the thread never shows a user ID');

/* ---------- 2. A space with its moderator, signature and rank ---------- */

select pg_temp.sign_in('01');
select lives_ok($$select public.set_my_signature('Scriu despre zmei.')$$, 'adult_writer sets a signature (S1-E8-08)');
select is(public.create_space('Cercul epic opt', 'Despre începuturi.', 'Fii amabil.', 'anyone', 'open') ->> 'slug',
  'cercul-epic-opt', 'and starts a space (S1-E8-06)');
select is((select age_group::text from public.spaces where spaces.slug = 'cercul-epic-opt'), '16_plus',
  'a space started by an adult is a 16+ space');

select pg_temp.sign_in('02');
select is(public.join_space('cercul-epic-opt') ->> 'status', 'active', 'teen_17 joins the open space');
select pg_temp.sign_in('03');
select is(pg_temp.hint_of($$select public.join_space('cercul-epic-opt')$$), 'space:age',
  'kid_14_ok, under 16, can''t join a 16+ space');

select pg_temp.sign_in('01');
select is(public.set_space_moderator('cercul-epic-opt', 'teen_17', array['posts']::public.space_power[]) ->> 'outcome',
  'appointed', 'adult_writer makes teen_17 a moderator of the space (S1-E8-07)');
insert into kept select 'space_thread', public.start_forum_thread('space-cercul-epic-opt', 'Bun venit epic',
  'Prezentați-vă.') ->> 'thread_number';
select pg_temp.sign_in('02');
select is(public.forum_thread(pg_temp.kept_value('space_thread')::bigint) #>> '{posts,0,signature,text}',
  'Scriu despre zmei.', 'the space post carries its author''s signature');
select is(public.forum_thread(pg_temp.kept_value('space_thread')::bigint) #>> '{posts,0,author_rank}',
  public.profile_rank('adult_writer') ->> 'rank', 'and the same rank as their profile (S1-E8-09)');
select is((public.forum_thread(pg_temp.kept_value('space_thread')::bigint) -> 'thread' ->> 'can_moderate')::boolean, true,
  'teen_17 gets the moderator tools in that space');

/* ---------- 3. A class and its certificates ---------- */

select pg_temp.sign_in('07');
select is(public.create_class_space('Clasa epic opt', 'Cercul de lectură.') ->> 'slug', 'clasa-epic-opt',
  'the teacher starts a class (S1-E8-11)');
insert into kept select 'code', public.make_class_invite('clasa-epic-opt', 30, 10) ->> 'code';

select pg_temp.sign_in('03');
select is(public.join_class_space(pg_temp.kept_value('code')) ->> 'can_read', 'true',
  'kid_14_ok joins with the code and reads the class');
select pg_temp.sign_in('04');
select is(public.join_class_space(pg_temp.kept_value('code')) ->> 'can_read', 'false',
  'kid_14_waiting joins but reads only once a parent agrees');
select pg_temp.sign_in('07');
select is(jsonb_path_query_array(public.class_waiting_members('clasa-epic-opt'), '$[*].handle'),
  '["kid_14_waiting"]'::jsonb, 'the teacher sees who is still waiting and why');
select pg_temp.sign_in('01');
select is(public.space_page('clasa-epic-opt'), null, 'adult_writer, not in the class, never sees it');

select pg_temp.sign_in('07');
select is(public.issue_class_certificates('clasa-epic-opt', 'Cercul epic 2027',
  '[{"handle": "kid_14_ok", "result": "participant"}]') ->> 'issued', '1',
  'the teacher signs kid_14_ok''s certificate (S1-E8-12)');
select pg_temp.sign_in('03');
insert into kept select 'certificate', public.my_certificates() -> 0 ->> 'code';
select is(jsonb_array_length(public.my_certificates()), 1, 'kid_14_ok finds it under My certificates');
select pg_temp.sign_out();
select is(public.verify_certificate(pg_temp.kept_value('certificate')) ->> 'status', 'valid',
  'a signed-out visitor checks the code');
select is(public.verify_certificate(pg_temp.kept_value('certificate'))::text like '%kid_14_ok%', false,
  'and never sees the student');

select * from finish();
rollback;
