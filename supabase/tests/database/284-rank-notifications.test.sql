-- Database tests for the quiet "You're now a Storyteller" notification (bundle IDEAS-3, part a;
-- idea IDEA-20261102-1).
-- What it proves:
-- - reaching a rank above New writer sends the writer one rank_reached notification with that
--   rank, under the stories filter, linking to their own profile (criterion 1); New writer, the
--   rank of a first chapter, is never announced;
-- - a rank that drops (a story hidden by a moderator) and comes back is not announced again,
--   while a higher rank still is (criterion 2);
-- - the row names nobody else and is not a required notice;
-- - a story card carries the writer's rank (IDEA-20261102-2), but not for a reader the writer
--   blocked (criterion 2), and the helper behind it is internal.
-- No new table or policy. Personas: adult_writer (…01), teacher (…07), blocker (…15),
-- moderator (…10). Test data rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- adult_writer's rank_reached notifications, oldest first, as rank names.
-- The signed-in person's rank_reached row for one rank, as the notifications page gets it.
create function pg_temp.rank_row(rank_name text) returns jsonb language sql as $$
  select row_json from (select jsonb_array_elements(public.my_notifications() -> 'notifications') as row_json) as listed
  where row_json ->> 'kind' = 'rank_reached' and row_json ->> 'writer_rank' = rank_name;
$$;
create function pg_temp.announced() returns text language sql security definer as $$
  select coalesce(string_agg(writer_rank::text, ',' order by created_at, writer_rank), '')
  from public.notifications
  where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'rank_reached';
$$;
-- Publishes n more chapters of the test story, each with the given number of words.
create function pg_temp.publish(how_many integer, words integer) returns void language sql as $$
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  select '28400000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
    'rnot' || lpad((existing + step)::text, 4, '0'), existing + step, 'Capitol', 'x', words,
    'published', 'Capitol', 'Text.', words, now()
  from generate_series(1, how_many) as step,
       (select count(*)::integer as existing from public.chapters
        where story_id = '28400000-0000-4000-9000-000000000001') as counted;
$$;
-- The test story's card as the signed-in reader gets it in a shelf (story_card_json() is internal;
-- the shelves call it with the reader's own sign-in, which this wrapper keeps).
create function pg_temp.card_rank() returns text language sql security definer as $$
  select public.story_card_json('28400000-0000-4000-9000-000000000001') #>> '{writer,rank}';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Start from a writer with no rank and nothing announced, whatever the seed holds.
update public.chapters set status = 'draft' where user_id = '00000000-0000-4000-8000-000000000001'
  and status = 'published';
delete from public.writer_ranks where user_id = '00000000-0000-4000-8000-000000000001';
update public.profiles set highest_rank_notified = null where id = '00000000-0000-4000-8000-000000000001';
delete from public.notifications where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'rank_reached';

insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  first_published_at, last_chapter_published_at)
values ('28400000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ranguri-284',
  'Ranguri', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());

/* ---------- 1. A new rank is announced once (criterion 1) ---------- */

select pg_temp.publish(1, 1000);
select is(pg_temp.announced(), '', 'the first published chapter (New writer) announces nothing: it isn''t a milestone worked for');
select pg_temp.publish(1, 1000);
select is(pg_temp.announced(), '', 'another chapter at the same rank announces nothing');
select pg_temp.publish(1, 30000);
select is(pg_temp.announced(), 'storyteller',
  'reaching Storyteller (30,000 words, skipping Writer) announces Storyteller once');

-- What the writer sees.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from jsonb_array_elements(public.my_notifications() -> 'notifications') as row_json
           where row_json ->> 'kind' = 'rank_reached'),
  1, 'the writer sees the row, carrying its rank for the sticker');
select is(pg_temp.rank_row('storyteller') ->> 'own_handle',
  (select handle from public.profiles where id = '00000000-0000-4000-8000-000000000001')::text,
  'and the writer''s own handle, for the link to their profile');
select is(pg_temp.rank_row('storyteller') ->> 'category',
  'stories', 'it sits under the stories filter');
select pg_temp.as_postgres();
select is((select array_length(actor_user_ids, 1) is null and not is_required from public.notifications
           where kind = 'rank_reached' and writer_rank = 'storyteller'),
  true, 'it names nobody else and can be switched off like other story news');

/* ---------- 2. A rank that drops and comes back isn't announced twice (criterion 2) ---------- */

select pg_temp.as_postgres();
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'story', '28400000-0000-4000-9000-000000000001', 'hidden',
  '00000000-0000-4000-8000-000000000010', 'Rank notice test.');
select is((select rank::text from public.writer_ranks where user_id = '00000000-0000-4000-8000-000000000001'),
  null, 'hiding the story takes the rank away');
update public.moderated_items set restored_at = now(), restored_by_user_id = '00000000-0000-4000-8000-000000000010'
where item_id = '28400000-0000-4000-9000-000000000001';
select is(pg_temp.announced(), 'storyteller',
  'restoring it brings Storyteller back without a second notification');
select pg_temp.publish(3, 25000);
select is(pg_temp.announced(), 'storyteller,novelist', 'a higher rank, Novelist, is still announced');

/* ---------- 3. The rank pill on story cards (IDEA-20261102-2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.card_rank(), 'novelist',
  'another reader sees the writer''s rank on the story card');
select pg_temp.as_postgres();
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000015');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.card_rank(), null,
  'a reader the writer blocked sees no rank on the card (criterion 2)');
select pg_temp.as_postgres();
select is((select count(*)::integer from pg_proc where proname = 'story_card_writer_rank'
           and has_function_privilege('authenticated', oid, 'execute')),
  0, 'the rank helper is internal: only story_card_json() calls it');

select * from finish();
rollback;
