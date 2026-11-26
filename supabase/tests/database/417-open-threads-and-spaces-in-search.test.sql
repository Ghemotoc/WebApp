-- Database tests for open forum threads and fully public spaces in search, and the visitor's
-- limit of three posts (GROWTH-4; Robert, GROWTH thread, 26 Nov 2026, 19:45 to 19:48 UTC: "after
-- the 2nd reply to the poster they need to log in to read the rest", "Private spaces and classes
-- are not indexable and uncrawlable. But fully public spaces can be crawlable and indexable").
-- What it proves:
-- - a signed-out visitor reads the opening post and 2 replies, is told the rest is for members,
--   and never gets a later post, not by paging and not by a permalink;
-- - paging still works within those three, and a thread of three posts or fewer asks nothing;
-- - a member reads every post and is never told the rest is for members;
-- - space_search_head() lets a fully public space (open, 16 and over) be indexed, never a space
--   for under-16s or an unknown name;
-- - the sitemap lists an open thread, a fully public space and its threads, and leaves them out
--   once the space is for under-16s;
-- - space_is_searchable() is closed to visitors and members (internal).
-- Personas: adult_writer (…01, owner of fantasy-writers-circle), teacher (…07), moderator (…10).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Numbers the test names later, kept where every role can read them.
create temporary table named (label text primary key, value bigint) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns bigint language sql as $$
  select value from named where label = wanted;
$$;
-- The post numbers one read of a thread answers with, in order.
create function pg_temp.numbers(page jsonb) returns integer[] language sql as $$
  select coalesce(array_agg((post ->> 'number')::integer order by (post ->> 'number')::integer), '{}')
  from jsonb_array_elements(page -> 'posts') as post;
$$;
-- Whether the sitemap lists a path.
create function pg_temp.listed(wanted_path text) returns boolean language sql as $$
  select exists (select 1 from public.sitemap_entries() as entries where entries.path = wanted_path);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A thread of five posts and one of three in the main forums, and one in the public space.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'long', ((public.start_forum_thread('first-chapters', 'Cinci postări zq', 'Prima.')) ->> 'thread_number')::bigint;
insert into named select 'short', ((public.start_forum_thread('first-chapters', 'Trei postări zq', 'Prima.')) ->> 'thread_number')::bigint;
insert into named select 'space', ((public.start_forum_thread('space-fantasy-writers-circle', 'În spațiu zq', 'Prima.')) ->> 'thread_number')::bigint;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.named('long'), 'A doua.');
select public.reply_to_forum_thread(pg_temp.named('short'), 'A doua.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.reply_to_forum_thread(pg_temp.named('long'), 'A treia.');
select public.reply_to_forum_thread(pg_temp.named('short'), 'A treia.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.named('long'), 'A patra.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.reply_to_forum_thread(pg_temp.named('long'), 'A cincea.');

/* ---------- 1. A visitor reads three posts ---------- */

select pg_temp.sign_out();
select is(pg_temp.numbers(public.forum_thread(pg_temp.named('long'))), array[1, 2, 3],
  'a visitor reads the opening post and 2 replies');
select is(public.forum_thread(pg_temp.named('long')) -> 'more_for_members', 'true'::jsonb,
  'and is told the rest is for members');
select is(public.forum_thread(pg_temp.named('long')) -> 'has_more', 'false'::jsonb,
  'with no "Show more replies" to press');
select is(pg_temp.numbers(public.forum_thread(pg_temp.named('long'), 1)), array[2, 3],
  'paging still works within the three');
select is(pg_temp.numbers(public.forum_thread(pg_temp.named('long'), 3)), '{}'::integer[],
  'but reading on after the third gets nothing');
select is(pg_temp.numbers(public.forum_thread(pg_temp.named('long'), 0, 5)), array[1, 2, 3],
  'and a permalink to a later post still stops at the third');
select is(public.forum_thread(pg_temp.named('short')) -> 'more_for_members', 'false'::jsonb,
  'a thread of three posts asks a visitor nothing');

/* ---------- 2. A member reads every post ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.numbers(public.forum_thread(pg_temp.named('long'))), array[1, 2, 3, 4, 5],
  'a member reads every post');
select is(public.forum_thread(pg_temp.named('long')) -> 'more_for_members', 'false'::jsonb,
  'and is never told the rest is for members');

/* ---------- 3. Spaces in search ---------- */

select pg_temp.sign_out();
select is(public.space_search_head('fantasy-writers-circle') ->> 'indexable', 'true',
  'a fully public space may be indexed');
select is(public.space_search_head('young-poets') ->> 'indexable', 'false',
  'a space for under-16s never is');
select is(public.space_search_head('no-such-space-zq') ->> 'indexable', 'false',
  'nor an unknown name');
select throws_ok($$ select public.space_is_searchable('00000000-0000-4000-a000-000000000a01') $$,
  '42501', null, 'space_is_searchable() is internal');

/* ---------- 4. The sitemap ---------- */

select ok(pg_temp.listed('/forums/first-chapters/' || pg_temp.named('long')),
  'the sitemap lists an open thread');
select ok(pg_temp.listed('/spaces/fantasy-writers-circle')
    and pg_temp.listed('/forums/space-fantasy-writers-circle/' || pg_temp.named('space')),
  'and a fully public space with its threads');
select ok(not pg_temp.listed('/spaces/young-poets'), 'but not a space for under-16s');
reset role;
update public.spaces set age_group = 'under_16' where slug = 'fantasy-writers-circle';
select pg_temp.sign_out();
select ok(not pg_temp.listed('/spaces/fantasy-writers-circle')
    and not pg_temp.listed('/forums/space-fantasy-writers-circle/' || pg_temp.named('space')),
  'and the space and its threads leave once it is for under-16s');

select * from finish();
rollback;
