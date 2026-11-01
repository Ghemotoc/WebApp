-- Database tests for read and unread in the forums (bundle FORUMS-1, part d; story S1-E8-04;
-- CLAUDE.md rules 1 and 15).
-- What it proves:
-- - a thread with posts the reader hasn't seen is unread in the list, its forum and the
--   category above it show new posts, and "New for you" lists it (criterion 1); one's own posts
--   are never new; a visitor gets no unread state at all;
-- - the list opens an unread thread at its first new post, and reading a thread moves that
--   point forward, never back (criterion 2);
-- - "Mark as read" on a category covers every forum inside it, and "Mark all as read" covers the
--   whole board (criterion 3);
-- - policies forum_read_marks_select_own and forum_thread_reads_select_own: allowed and denied.
-- Download my data and account deletion cover both tables through tests 210 and 211's checks
-- that every user table is listed.
-- Personas: adult_writer (…01) and teacher (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
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
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns text language sql as $$
  select value from named where label = wanted;
$$;
-- The test's thread as the caller's forum list shows it.
create function pg_temp.listed() returns jsonb language sql as $$
  select thread from jsonb_array_elements((public.forum_thread_list('first-chapters')) -> 'threads') as thread
  where (thread ->> 'number') = pg_temp.named('thread');
$$;
-- Whether the index shows new posts in one forum for the caller.
create function pg_temp.forum_is_new(forum_slug text) returns boolean language sql as $$
  select has_unread from public.forum_index('ro') where slug = forum_slug;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. New posts (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'thread', (public.start_forum_thread('first-chapters', 'Ce e nou?', 'Prima postare.')) ->> 'thread_number';
select is((pg_temp.listed() ->> 'is_unread')::boolean, false, 'one''s own thread is never new to oneself');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((pg_temp.listed() ->> 'is_unread')::boolean, true, 'a thread written after the reader''s account is unread');
select is((pg_temp.listed() ->> 'first_unread_post')::integer, 1, 'and opens at its first post');
select is(pg_temp.forum_is_new('first-chapters'), true, 'its forum shows new posts');
select is(pg_temp.forum_is_new('writing-craft'), true, 'and so does the category above it');
select is(pg_temp.forum_is_new('book-talk'), false, 'another forum doesn''t');
select is(jsonb_path_query_array(public.forum_new_for_you(), '$[*].number'),
  jsonb_build_array(pg_temp.named('thread')::bigint), '"New for you" lists the thread');

select pg_temp.sign_out();
select is(pg_temp.listed() -> 'is_unread', 'null'::jsonb, 'a visitor gets no unread state');
select is(pg_temp.forum_is_new('first-chapters'), null, 'nor dots on the index');
select is(public.forum_new_for_you(), '[]'::jsonb, 'nor anything new for them');

/* ---------- 2. Reading moves the first new post (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.mark_forum_thread_read(pg_temp.named('thread')::bigint, 1);
select is((pg_temp.listed() ->> 'is_unread')::boolean, false, 'a thread read to its last post is read');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'A doua postare.');
select public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'A treia postare.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((pg_temp.listed() ->> 'first_unread_post')::integer, 2, 'a new reply makes it unread from #2, the first new post');
select is((public.forum_new_for_you(5, 'en')) -> 0 -> 'new_count', '2'::jsonb, '"New for you" counts the two new posts');
select public.mark_forum_thread_read(pg_temp.named('thread')::bigint, 2);
select is((pg_temp.listed() ->> 'first_unread_post')::integer, 3, 'reading #2 moves it to #3');
select public.mark_forum_thread_read(pg_temp.named('thread')::bigint, 1);
select is((pg_temp.listed() ->> 'first_unread_post')::integer, 3, 'an older permalink never moves it back');

/* ---------- 3. Mark as read (criterion 3) ---------- */

select public.mark_forums_read('writing-craft');
select is((pg_temp.listed() ->> 'is_unread')::boolean, false, '"Mark as read" on a category covers the forums inside it');
select is(pg_temp.forum_is_new('first-chapters'), false, 'and the index shows no new posts there');
-- The category's mark an hour ago: the thread is new again, until "Mark all as read".
reset role;
update public.forum_read_marks set marked_at = now() - interval '1 hour'
where user_id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((pg_temp.listed() ->> 'is_unread')::boolean, true, 'posts after a mark are new again');
select public.mark_forums_read(null);
select is((pg_temp.listed() ->> 'is_unread')::boolean, false, '"Mark all as read" covers the whole board');
select is(pg_temp.hint_of($$ select public.mark_forums_read('no-such-forum') $$), 'forum:missing',
  'marking a forum that isn''t there is refused');
select pg_temp.sign_out();
select throws_ok($$ select public.mark_forums_read(null) $$, '42501', null, 'a visitor has nothing to mark');

/* ---------- 4. Policies ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok((select count(*) from public.forum_read_marks) >= 2,
  'allowed: forum_read_marks_select_own: a person reads their own read marks');
select is((select last_read_post_number from public.forum_thread_reads), 2,
  'allowed: forum_thread_reads_select_own: and their own thread reads');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.forum_read_marks), 0,
  'denied: forum_read_marks_select_own: nobody else''s read marks');
select is((select count(*)::integer from public.forum_thread_reads), 0,
  'denied: forum_thread_reads_select_own: nor what someone else has read');

select * from finish();
rollback;
