-- Database tests for ranks (bundle FORUMS-2, part e; story S1-E8-09).
-- What it proves:
-- - the ladder: New writer at the first chapter, Writer at 5, Storyteller at 15 chapters or 30,000
--   words, Novelist at 100,000 words (criterion 2);
-- - the rank is worked out again when a chapter is published, unpublished, deleted, hidden by a
--   moderator or its story deleted, and forum posts never count (criteria 1 and 2);
-- - there is no way for staff to set a rank (criterion 2);
-- - the profile and a post carry the rank, never a user ID; a blocked reader gets nothing;
-- - only the person reads their own row (policy writer_ranks_select_own, allowed and denied).
-- Personas: adult_writer (…01), teacher (…07), blocker (…15), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- adult_writer's rank as saved, read past the policies; 'none' when there is no row.
create function pg_temp.writer_rank() returns text language sql security definer as $$
  select coalesce((select rank::text from public.writer_ranks
                   where user_id = '00000000-0000-4000-8000-000000000001'), 'none');
$$;
-- Publishes n more chapters of the test story, each with the given number of words.
create function pg_temp.publish(how_many integer, words integer) returns void language sql as $$
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  select '23100000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
    'rank' || lpad((existing + step)::text, 4, '0'), existing + step, 'Capitol', 'x', words,
    'published', 'Capitol', 'Text.', words, now()
  from generate_series(1, how_many) as step,
       (select count(*)::integer as existing from public.chapters
        where story_id = '23100000-0000-4000-9000-000000000001' and code <> 'rankdraf') as counted;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  first_published_at, last_chapter_published_at)
values ('23100000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ranguri-231',
  'Ranguri', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());

/* ---------- 1. The ladder (criterion 2) ---------- */

select is(public.rank_for(0, 0), null, 'no published chapter, no rank');
select is(public.rank_for(1, 10)::text, 'new_writer', 'the first chapter makes a New writer');
select is(public.rank_for(5, 100)::text, 'writer', '5 chapters make a Writer');
select is(public.rank_for(15, 100)::text, 'storyteller', '15 chapters make a Storyteller');
select is(public.rank_for(2, 30000)::text, 'storyteller', '30,000 words make a Storyteller too');
select is(public.rank_for(3, 100000)::text, 'novelist', '100,000 words make a Novelist');

/* ---------- 2. Worked out again as chapters change ---------- */

select is(pg_temp.writer_rank(), 'none', 'before any chapter there is no rank');
-- A draft chapter doesn't count.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
values ('23100000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rankdraf', 99,
  'Ciornă', 'x', 50000);
select is(pg_temp.writer_rank(), 'none', 'a draft chapter doesn''t count, however long');
select pg_temp.publish(1, 1000);
select is(pg_temp.writer_rank(), 'new_writer', 'publishing the first chapter gives New writer');
select pg_temp.publish(4, 1000);
select is(pg_temp.writer_rank(), 'writer', 'the fifth chapter gives Writer');
select pg_temp.publish(10, 1000);
select is(pg_temp.writer_rank(), 'storyteller', 'the fifteenth chapter gives Storyteller');

-- Forum posts never count (criterion 1).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table thread_numbers (value bigint) on commit drop;
grant all on thread_numbers to anon, authenticated;
select lives_ok($$ insert into thread_numbers
  select (public.start_forum_thread('first-chapters', 'Ranguri de test', 'Prima postare.') ->> 'thread_number')::bigint $$,
  'the writer posts in the forums');
select pg_temp.as_postgres();
select is((select chapter_count from public.writer_ranks where user_id = '00000000-0000-4000-8000-000000000001'),
  15, 'forum posts never count towards the rank');

-- Unpublishing and deleting count straight away.
update public.chapters set status = 'draft'
where code in ('rank0015', 'rank0014', 'rank0013', 'rank0012', 'rank0011', 'rank0010', 'rank0009', 'rank0008', 'rank0007', 'rank0006', 'rank0005');
select is(pg_temp.writer_rank(), 'new_writer', 'unpublishing chapters lowers the rank at once');
update public.chapters set deleted_at = now() where code in ('rank0001', 'rank0002', 'rank0003', 'rank0004');
select is(pg_temp.writer_rank(), 'none', 'deleting the last published chapters takes the rank away');
update public.chapters set deleted_at = null where code in ('rank0001', 'rank0002', 'rank0003', 'rank0004');

-- A moderator hiding the story, then restoring it (criterion 2: "removed").
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'story', '23100000-0000-4000-9000-000000000001', 'hidden',
  '00000000-0000-4000-8000-000000000010', 'Rank test.');
select is(pg_temp.writer_rank(), 'none', 'a story hidden by a moderator doesn''t count');
update public.moderated_items set restored_at = now(), restored_by_user_id = '00000000-0000-4000-8000-000000000010'
where item_id = '23100000-0000-4000-9000-000000000001';
select is(pg_temp.writer_rank(), 'new_writer', 'restoring it counts its chapters again');

-- Staff never set a rank: no function writes one, and the table takes no writes from anyone.
select is((select count(*)::integer from pg_proc
           where proname like 'admin%rank%' and pronamespace = 'public'::regnamespace),
  0, 'there is no staff function to hand out a rank');

/* ---------- 3. Where the rank shows, and who reads the row ---------- */

select pg_temp.sign_out();
select is(public.profile_rank('adult_writer'), '{"rank": "new_writer", "words": 4000, "chapters": 4}'::jsonb,
  'the profile shows the rank with its chapters and words to anyone, signed out included');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.forum_thread((select value from thread_numbers))
            #>> '{posts,0,author_rank}',
  'new_writer', 'a post carries its author''s rank');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.writer_ranks), 1,
  'allowed: writer_ranks_select_own: a person reads their own rank row');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.writer_ranks), 0,
  'denied: writer_ranks_select_own: nobody else reads it (so no user ID is ever shown)');

select * from finish();
rollback;
