-- Database tests for forum search (bundle FORUMS-1, part f; story S1-E8-10).
-- What it proves:
-- - a search finds threads by their title and posts by their words, a thread title first
--   (criterion 1);
-- - without diacritics ("povesti" finds "povești"), with Romanian stemming ("povestea" finds
--   "poveștile") and by part of a word;
-- - the forum filter (with the forums inside it) and the author filter (with or without "@");
-- - deleted, hidden and removed posts and posts by a blocked person are never found, and a post
--   is found again once the block is gone (criterion 2);
-- - a term under 2 characters finds nothing, and no result carries a user ID.
-- No new table or policy: search reads forum_posts only through search_forum_posts().
-- Personas: adult_writer (…01), teacher (…07), moderator (…10), blocker (…15), blocked (…16).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The thread titles and post numbers a search finds, as "title #n", in order, keeping only this
-- test's threads (their titles end in "zq").
create function pg_temp.found(term text, forum_slug text default null, author text default null) returns jsonb language sql as $$
  select coalesce(jsonb_agg((result ->> 'thread_title') || ' #' || (result ->> 'post_number') order by position), '[]'::jsonb)
  from jsonb_array_elements((public.search_forum_posts(term, forum_slug, author)) -> 'results') with ordinality as found(result, position)
  where result ->> 'thread_title' like '%zq';
$$;
-- A post's ID by its thread's title and its number.
create function pg_temp.post_id(thread_title text, number integer) returns uuid language sql security definer as $$
  select forum_posts.id from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
  where forum_threads.title = thread_title and forum_posts.post_number = number;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The seed accounts are new, so the new-account post limit applies; this test posts more than it allows.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

/* ---------- 1. Threads and posts to find ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
insert into named select 'thread', (public.start_forum_thread('first-chapters', 'Poveștile cu dragoni zq',
  'Cum încep o poveste fără prolog?')) ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(
  (select value::bigint from named where label = 'thread'),
  'Eu încep cu un dragon care strănută.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.reply_to_forum_thread(
  (select value::bigint from named where label = 'thread'),
  'Și eu scriu despre dragoni, dar cu hărți.');
-- A thread in another forum, to test the forum filter.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.start_forum_thread('worldbuilding',
  'Hărți pentru lumi noi zq', 'Desenez harta înainte de primul capitol, cu dragoni pe margini.');

/* ---------- 2. Finding (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.found('dragoni') -> 0, '"Poveștile cu dragoni zq #1"'::jsonb,
  'a thread whose title matches comes first');
select is(jsonb_array_length(pg_temp.found('dragoni')), 4,
  'posts are found too: "dragon" by its stem, "dragoni", and the other thread''s post');
select ok(pg_temp.found('povesti') ? 'Poveștile cu dragoni zq #1', 'without diacritics: "povesti" finds "Poveștile"');
select ok(pg_temp.found('povestea') ? 'Poveștile cu dragoni zq #1', 'with Romanian stemming: "povestea" finds "Poveștile"');
select is(pg_temp.found('strănut'), '["Poveștile cu dragoni zq #2"]'::jsonb, 'part of a word finds the post');
select is((select (result ->> 'kind') from jsonb_array_elements((public.search_forum_posts('strănută')) -> 'results') as result
  where result ->> 'thread_title' like '%zq' limit 1), 'post', 'a match in a reply is a post result');
select is(pg_temp.found('d'), '[]'::jsonb, 'a single letter finds nothing');
select is((select count(*)::integer from jsonb_array_elements((public.search_forum_posts('dragoni')) -> 'results') as result
  where result::text ~ '00000000-0000-4000-8000'), 0, 'no result carries a user ID');

/* ---------- 3. Filters ---------- */

select is(jsonb_array_length(pg_temp.found('dragoni', 'first-chapters')), 3, 'the forum filter keeps one forum''s results');
select is(pg_temp.found('dragoni', null, '@teacher'), '["Hărți pentru lumi noi zq #1", "Poveștile cu dragoni zq #2"]'::jsonb,
  'the author filter keeps one person''s posts, "@" or not');

/* ---------- 4. What is never found (criterion 2) ---------- */

-- blocked (…16) is blocked by blocker (…15): blocker's reply is never in their results.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(pg_temp.found('hărți', 'first-chapters'), '[]'::jsonb, 'a post by someone who blocks the reader is not found');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.found('hărți', 'first-chapters'), '["Poveștile cu dragoni zq #3"]'::jsonb, 'its author finds it');
-- teacher deletes their reply.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.delete_forum_post(pg_temp.post_id('Poveștile cu dragoni zq', 2));
select is(pg_temp.found('strănut'), '[]'::jsonb, 'a deleted post is not found');
-- Staff remove one post and hide the other thread.
reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select '00000000-0000-4000-8000-000000000015', 'forum_post', forum_posts.id, 'removed', '00000000-0000-4000-8000-000000000010', 'Test remove'
from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
where forum_threads.title = 'Poveștile cu dragoni zq' and forum_posts.post_number = 3;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select '00000000-0000-4000-8000-000000000007', 'forum_thread', forum_threads.id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Test hide'
from public.forum_threads where forum_threads.title = 'Hărți pentru lumi noi zq';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.found('hărți'), '[]'::jsonb, 'a removed post and a hidden thread are not found');
select is(pg_temp.found('dragoni'), '["Poveștile cu dragoni zq #1"]'::jsonb, 'what is left is still found');
-- A visitor can search too.
select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select is(pg_temp.found('povesti'), '["Poveștile cu dragoni zq #1"]'::jsonb, 'a signed-out visitor can search');

select * from finish();
rollback;
