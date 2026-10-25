-- Epic check for S1-E6, comments, reactions and follows (story S1-E6-QA).
-- It adds no feature: it walks the epic's main journeys through the database, crossing its March
-- stories, with the seed personas the story names.
-- Journey (S1-E6-03 × S1-E6-01 × S1-E6-02 × S1-E6-04 × S1-E6-05): teacher, an adult member, likes
--   adult_writer's chapter, comments, reacts to pending_check's comment, downvotes it and follows
--   the writer and the story; teen_17 then reads the comments with the counts, never the downvote.
-- Minors (the account gate × every write): teen_17, kid_14_ok and kid_14_waiting read the chapter
--   and its comments but can't like, comment, react, downvote or follow (in March only invited
--   adults write; adults_only, decided 17 Oct 2026, 12:44).
-- Ratings (S1-E3-06 × S1-E6-01): at 16+ teen_17 still reads the comments; kid_14_ok doesn't.
-- Blocks (S1-E5-05 × the whole epic): once adult_writer blocks teacher, teacher can do none of it
--   to the writer's chapter, and the writer's comments vanish for teacher.
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A published chapter on adult_writer's "Stația meteo" (All ages) and pending_check's comment.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epics601', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
insert into named select 'other', (public.post_comment('statia-meteo-seed01', 'epics601',
  'Abia aștept al doilea.') ->> 'id')::uuid;

/* ---------- 1. An adult reader does everything ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.like_chapter('statia-meteo-seed01', 'epics601', true) ->> 'like_count')::integer, 1,
  'teacher likes the chapter (S1-E6-03)');
select lives_ok($$ select public.post_comment('statia-meteo-seed01', 'epics601', 'Un început bun.') $$,
  'teacher comments on it (S1-E6-01)');
select is(public.react_to_comment((select id from named where label = 'other'), 'heart') #>> '{counts,heart}', '1',
  'teacher reacts to pending_check''s comment (S1-E6-02)');
select is(public.downvote_comment((select id from named where label = 'other'), true), true,
  'and downvotes it privately (S1-E6-04)');
select lives_ok($$ select public.follow_writer('adult_writer', true) $$, 'teacher follows the writer (S1-E6-05)');
select lives_ok($$ select public.follow_story('statia-meteo-seed01', true) $$, 'and the story');

/* ---------- 2. Another reader sees the result, never the downvote ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.chapter_comments('statia-meteo-seed01', 'epics601') ->> 'total')::integer, 2,
  'teen_17 reads both comments');
select is((select c #>> '{reactions,counts,heart}' from jsonb_array_elements(
    public.chapter_comments('statia-meteo-seed01', 'epics601') -> 'comments') as c
  where c #>> '{author,handle}' = 'pending_check'), '1', 'with the heart counted');
select ok(public.chapter_comments('statia-meteo-seed01', 'epics601')::text !~ 'downvote(s|_count)"',
  'and no downvote count anywhere');
select is((public.chapter_like_state('statia-meteo-seed01', 'epics601') ->> 'like_count')::integer, 1,
  'and the like total');

/* ---------- 3. The minors read but don't write ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'epics601', 'Și eu!') $$, '42501', null,
  'teen_17 can''t comment yet');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'epics601', true) $$, '42501', null,
  'or like');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'other'), 'star') $$, '42501', null,
  'or react');
select throws_ok($$ select public.downvote_comment((select id from named where label = 'other'), true) $$, '42501', null,
  'or downvote');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((public.chapter_comments('statia-meteo-seed01', 'epics601') ->> 'total')::integer, 2,
  'kid_14_ok reads the comments on an All ages chapter');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'epics601', 'Și eu!') $$, '42501', null,
  'but can''t comment');
select throws_ok($$ select public.follow_writer('adult_writer', true) $$, '42501', null,
  'or follow');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.chapter_comments('statia-meteo-seed01', 'epics601') ->> 'total')::integer, 2,
  'kid_14_waiting reads them too');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'epics601', 'Și eu!') $$, '42501', null,
  'but can''t comment');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'epics601', true) $$, '42501', null,
  'or like');

/* ---------- 4. Ratings ---------- */

reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.chapter_comments('statia-meteo-seed01', 'epics601') ->> 'total')::integer, 2,
  'at 16+ teen_17 still reads the comments');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.chapter_comments('statia-meteo-seed01', 'epics601'), null,
  'kid_14_ok doesn''t: there is no chapter for them, so no comments');
reset role;
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 5. A block stops all of it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.set_block('teacher', true) $$, 'adult_writer blocks teacher');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.chapter_comments('statia-meteo-seed01', 'epics601'), null,
  'teacher can no longer open the writer''s chapter or its comments');
select throws_ok($$ select public.like_chapter('statia-meteo-seed01', 'epics601', true) $$, 'P0002', null,
  'or like it');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'epics601', 'Din nou.') $$, 'P0002', null,
  'or comment');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'other'), 'star') $$, 'P0002', null,
  'or react to a comment there');
select throws_ok($$ select public.downvote_comment((select id from named where label = 'other'), false) $$, 'P0002', null,
  'or downvote one');
select throws_ok($$ select public.follow_writer('adult_writer', true) $$, 'P0002', null,
  'or follow the writer');
reset role;
select is((select count(*)::integer from public.follows_users
  where user_id = '00000000-0000-4000-8000-000000000007' and followed_user_id = '00000000-0000-4000-8000-000000000001'), 0,
  'and the block ended teacher''s follow');

select * from finish();
rollback;
