-- Database tests for the record of chapter moves and the "was chapter 13" note
-- (bundle GAPS-11; story S1-E3-04).
-- What it proves:
-- - an arrow press records both chapters whose number changed, and marks the one the writer
--   moved; pressing again keeps the number the chapter had before its first move; a chapter put
--   back where it was shows no note; a press at the edge records nothing;
-- - a drag records every chapter whose number changed and marks the dragged one; a dragged code
--   that isn't in the list marks nobody; a refused list records nothing;
-- - the note counts the last 7 days only, a deleted chapter has none, and rows over 90 days old
--   or beyond the story's newest 2,000 go at its next reorder;
-- - chapter_moves_select_own: the writer reads their own rows (allowed), another writer reads
--   none and gets no notes, a visitor can't read the table or call the function (denied);
--   nobody can call the internal helpers or write to the table;
-- - Download my data and account deletion list the table.
-- Personas: adult_writer (…01, owns the seed story), teacher (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- Created before anyone signs in, so they run with the test's own rights.
create function pg_temp.code_of(chapter_title text) returns text language sql security definer as $$
  select code from public.chapters where draft_title = chapter_title
  and story_id = '00000000-0000-4000-9000-000000000001' $$;
create function pg_temp.move_count() returns integer language sql security definer as $$
  select count(*)::integer from public.chapter_moves
  where story_id = '00000000-0000-4000-9000-000000000001' $$;
-- The notes as the signed-in caller gets them: "C:3:picked,B:2:shifted", in reading order.
create function pg_temp.notes() returns text language sql as $$
  select coalesce(string_agg(chapters.draft_title || ':' || notes.was_position || ':'
           || case when notes.was_picked then 'picked' else 'shifted' end, ',' order by chapters.position), '')
  from public.chapter_move_notes('statia-meteo-seed01') as notes
  join public.chapters on chapters.code = notes.chapter_code $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Five chapters, A B C D E, on adult_writer's seed story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_chapter('statia-meteo-seed01') from generate_series(1, 5);
reset role;
update public.chapters set draft_title = chr(64 + position)
  where story_id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

/* ---------- 1. The arrows ---------- */

select is(pg_temp.notes(), '', 'a story nobody reordered has no notes');
select public.move_chapter(pg_temp.code_of('C'), -1);
select is(pg_temp.move_count(), 2, 'one arrow press records both chapters whose number changed');
select is(pg_temp.notes(), 'C:3:picked,B:2:shifted', 'the chapter the writer moved and the one that made room each say where they were');
select public.move_chapter(pg_temp.code_of('C'), -1);
select is(pg_temp.notes(), 'C:3:picked,A:1:shifted,B:2:shifted',
  'a second press keeps the number the chapter had before its first move');
select public.move_chapter(pg_temp.code_of('C'), -1);
select is(pg_temp.move_count(), 4, 'a press at the edge records nothing');
select public.move_chapter(pg_temp.code_of('C'), 1);
select public.move_chapter(pg_temp.code_of('C'), 1);
select is(pg_temp.notes(), '', 'chapters put back where they were show no note');
select is(pg_temp.move_count(), 8, 'while every move stays in the record');

/* ---------- 2. Dragging ---------- */

select public.set_chapter_order('statia-meteo-seed01',
  array[pg_temp.code_of('E'), pg_temp.code_of('A'), pg_temp.code_of('B'), pg_temp.code_of('C'), pg_temp.code_of('D')],
  pg_temp.code_of('E'));
select is(pg_temp.notes(), 'E:5:picked,A:1:shifted,B:2:shifted,C:3:picked,D:4:shifted',
  'a drag records every chapter whose number changed; C keeps "picked" from its own moves this week');
select is(pg_temp.move_count(), 13, 'five rows for five changed numbers');
select is((public.set_chapter_order('statia-meteo-seed01',
  array[pg_temp.code_of('A'), pg_temp.code_of('B'), pg_temp.code_of('C'), pg_temp.code_of('D')], pg_temp.code_of('A'))) ->> 'outcome',
  'wrong_list', 'a list missing a chapter is still refused');
select is(pg_temp.move_count(), 13, 'and records nothing');
select is((public.set_chapter_order('statia-meteo-seed01',
  array[pg_temp.code_of('E'), pg_temp.code_of('A'), pg_temp.code_of('B'), pg_temp.code_of('D'), pg_temp.code_of('C')], 'zzzzzzzz')) ->> 'outcome',
  'ok', 'a dragged code that isn''t in the list doesn''t stop the reorder');
reset role;
select is((select count(*)::integer from public.chapter_moves where created_at = (select max(created_at) from public.chapter_moves) and was_picked),
  0, 'and then no chapter is marked as the one that moved');
select is((select count(*)::integer from public.chapter_moves as moves join public.chapters on chapters.id = moves.chapter_id
           where moves.user_id <> chapters.user_id or moves.story_id <> chapters.story_id), 0,
  'every row carries its chapter''s writer and story');

/* ---------- 3. Time ---------- */

-- Every move so far happened 8 days ago: the notes are gone, the record stays.
update public.chapter_moves set created_at = created_at - interval '8 days';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.notes(), '', 'the note counts the last 7 days only');
select public.move_chapter(pg_temp.code_of('E'), 1);
select is(pg_temp.notes(), 'A:2:shifted,E:1:picked', 'a new move starts from the numbers as they were before it');
select public.delete_chapter(pg_temp.code_of('E'));
select is(pg_temp.notes(), 'A:2:shifted', 'a deleted chapter has no note, while the chapter it swapped with keeps its own');
reset role;
update public.chapter_moves set created_at = created_at - interval '91 days'
  where created_at < now() - interval '7 days';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.move_chapter(pg_temp.code_of('A'), 1);
select is(pg_temp.move_count(), 4, 'rows over 90 days old go at the story''s next reorder');

-- 2,100 more rows from today: the next reorder keeps the newest 2,000.
reset role;
insert into public.chapter_moves (user_id, story_id, chapter_id, from_position, to_position, created_at)
select chapters.user_id, chapters.story_id, chapters.id, 8, 9, now() - make_interval(secs => step)
from public.chapters, generate_series(1, 2100) as step
where chapters.code = pg_temp.code_of('A');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.move_chapter(pg_temp.code_of('A'), -1);
select is(pg_temp.move_count(), 2000, 'a story keeps its newest 2,000 rows at most');
reset role;
delete from public.chapter_moves where from_position = 8 and to_position = 9;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

/* ---------- 4. Who reads the record ---------- */

select is((select count(*)::integer from public.chapter_moves), 6, 'allowed: chapter_moves_select_own lets the writer read the moves of their own chapters');
select throws_ok($$ insert into public.chapter_moves (user_id, story_id, chapter_id, from_position, to_position)
  select user_id, story_id, id, 9, 8 from public.chapters limit 1 $$, '42501', null, 'the writer can''t write to the record directly');
select throws_ok($$ select public.record_chapter_moves('00000000-0000-4000-9000-000000000001', '{}'::jsonb, null) $$,
  '42501', null, 'nor call the internal recorder');
select throws_ok($$ select public.chapter_positions('00000000-0000-4000-9000-000000000001') $$,
  '42501', null, 'nor the internal position reader');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.chapter_moves), 0, 'denied: chapter_moves_select_own shows another writer none of them');
select is(pg_temp.notes(), '', 'and gets no notes for a story that isn''t theirs');
select pg_temp.sign_out();
select throws_ok($$ select count(*) from public.chapter_moves $$, '42501', null, 'denied: a visitor can''t read the table');
select throws_ok($$ select * from public.chapter_move_notes('statia-meteo-seed01') $$, '42501', null,
  'or call chapter_move_notes()');
reset role;

/* ---------- 5. Download my data and account deletion ---------- */

select is((select count(*)::integer from public.data_export_tables() where table_name = 'chapter_moves' and is_included)
        + (select count(*)::integer from public.account_deletion_rules() where table_name = 'chapter_moves' and action = 'delete'),
  2, 'Download my data includes the record and deleting the account deletes it');

select * from finish();
rollback;
