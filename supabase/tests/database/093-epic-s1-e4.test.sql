-- Epic check for S1-E4, reading (story S1-E4-QA).
-- It adds no feature: it walks the epic's main journeys through the database, crossing its March
-- stories, with the seed personas the story names.
-- Journey (S1-E3-03 × S1-E4-01a × S1-E4-04): adult_writer publishes two chapters → a signed-out
--   visitor gets the link preview and only the teaser, and can't count a read → teen_17,
--   kid_14_ok and kid_14_waiting (read-only accounts may read) read the whole chapter and each
--   adds one to today's total; the writer's own read doesn't count and the writer sees the total.
-- Ratings across the stories (S1-E3-06 × S1-E4-01a × S1-E4-04): at 16+ teen_17 still reads,
--   kid_14_ok, kid_14_waiting and the visitor don't, and the preview shows the title only; at
--   18+ teen_17 is out too and the writer still reads their own; a deleted story is gone for all.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- Created before anyone signs in, so they run with the test's own rights.
create function pg_temp.words(any_text text) returns integer language sql as $$
  select coalesce(array_length(regexp_split_to_array(btrim(any_text), '\s+'), 1), 0);
$$;
create function pg_temp.reads_today(chapter_code text) returns integer language sql security definer as $$
  select coalesce(sum(chapter_reads.total), 0)::integer from public.chapter_reads
  join public.chapters on chapters.id = chapter_reads.chapter_id
  where chapters.code = chapter_code $$;

-- Two drafts on adult_writer's "Stația meteo" (All ages): a 650-word chapter in three paragraphs
-- (the last one marked "ultimul") and a short one.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epice4aa', 1, 'Caietele',
   repeat('unu ', 299) || 'unu' || E'\n\n' || repeat('doi ', 249) || 'doi' || E'\n\n' || repeat('ultimul ', 99) || 'ultimul',
   650, 'draft'),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epice4bb', 2, 'Vântul',
   'Vântul se întoarce.', 3, 'draft');

-- 1. The writer publishes both (S1-E3-03).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.publish_chapter('epice4aa') ->> 'outcome', 'ok', 'adult_writer publishes chapter one');
select is(public.publish_chapter('epice4bb') ->> 'outcome', 'ok', 'and chapter two');

-- 2. A signed-out visitor follows a shared link (S1-E4-04).
select pg_temp.sign_out();
select is(public.get_link_preview('statia-meteo-seed01', 'epice4aa') -> 'chapter' ->> 'title', 'Caietele',
  'the link preview names the chapter');
select is(public.get_link_preview('statia-meteo-seed01', 'epice4aa') -> 'writer' ->> 'display_name', 'Lia Scrie',
  'and the pen name');
select is(pg_temp.words(public.get_chapter('statia-meteo-seed01', 'epice4aa') ->> 'body'), 550,
  'the visitor reads whole paragraphs up to 600 words');
select ok((public.get_chapter('statia-meteo-seed01', 'epice4aa') ->> 'body') not like '%ultimul%',
  'and never the rest of the chapter');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa') ->> 'next_code', 'epice4bb',
  'the teaser still knows chapter two is next');
select throws_ok($$ select public.record_chapter_read('statia-meteo-seed01', 'epice4aa') $$, '42501', null,
  'a teaser isn''t a read: the visitor can''t count one (no grant to visitors)');

-- 3. The personas read the whole chapter and each read counts (S1-E4-01a).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa') ->> 'is_teaser', 'false', 'teen_17 gets the whole chapter');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epice4aa'), 'and the read counts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok((public.get_chapter('statia-meteo-seed01', 'epice4aa') ->> 'body') like '%ultimul%',
  'kid_14_ok reads an All ages chapter to the end');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epice4aa'), 'and the read counts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select isnt(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null,
  'kid_14_waiting, read-only until a parent agrees, may still read');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epice4aa'), 'and the read counts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(not public.record_chapter_read('statia-meteo-seed01', 'epice4aa'), 'the writer''s own read doesn''t count');
select is((select sum(total)::integer from public.chapter_reads), 3,
  'the writer sees today''s total for their chapter: 3 (chapter_reads_select_owner)');
select is(pg_temp.reads_today('epice4aa'), 3, 'and the table holds exactly that total, never who read');

-- 4. 16+ (S1-E3-06 × S1-E4-01a × S1-E4-04).
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select isnt(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null, 'at 16+ teen_17 still reads');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null, 'kid_14_ok doesn''t');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null, 'nor does kid_14_waiting');
select pg_temp.sign_out();
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null, 'nor a visitor, who gets no teaser');
select ok(public.get_link_preview('statia-meteo-seed01', 'epice4aa') ->> 'hides_text' = 'true'
  and public.get_link_preview('statia-meteo-seed01', 'epice4aa') ->> 'blurb' is not null,
  'and the link preview keeps the story''s details but says the text is hidden (S1-E11-36)');

-- 5. 18+.
reset role;
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null, 'at 18+ teen_17 is out too');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa') ->> 'is_owner', 'true',
  'the writer still reads their own chapter');

-- 6. A deleted story is gone for everyone, preview included.
reset role;
update public.stories set rating = 'all_ages', deleted_at = now() where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.get_chapter('statia-meteo-seed01', 'epice4aa'), null, 'a deleted story''s chapter isn''t there');
select pg_temp.sign_out();
select is(public.get_link_preview('statia-meteo-seed01'), null, 'and it has no link preview');

select * from finish();
rollback;
