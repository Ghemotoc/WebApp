-- Database tests for the Layout per chapter (LAYOUTS-1; Robert, 27 Nov 2026, 17:34 UTC).
-- What it proves:
-- - every poem made with MUST-2's switch keeps its shape (is_poem and layout agree);
-- - a new chapter takes its layout from the story's form: Poetry a poem, Plays a play, Fiction
--   prose;
-- - only the writer changes it: another member gets 'not_found', a visitor is refused, an
--   unknown layout is refused, and changing it never touches the words;
-- - is_poem follows the layout, and MUST-2's set_chapter_poem_mode() still moves the layout;
-- - the writer's chapter list (story_chapter_progress()) says each chapter's layout.
-- No new table or policy: chapters' policies are tested elsewhere; set_chapter_layout() checks
-- the owner itself.
-- Personas: adult_writer (…01, the seed stories' writer), teacher (…07, another member).
-- Test data: chapters inserted directly; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- Inserts a chapter of one of the two seed stories, as the editor's "New chapter" does.
create function pg_temp.new_chapter(story_number integer, chapter_code text, place integer)
returns void language sql as $$
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body)
  values (('00000000-0000-4000-9000-00000000000' || story_number)::uuid,
    '00000000-0000-4000-8000-000000000001', chapter_code, place, 'Test', 'Cuvinte.');
$$;

/* ---------- 1. The old poems and the form's default ---------- */

select is((select count(*)::integer from public.chapters where is_poem <> (layout = 'poem')), 0,
  'every chapter''s layout says the same as its old poem switch');

select pg_temp.new_chapter(1, 'laypro01', 96);
select is((select layout from public.chapters where code = 'laypro01'), 'prose',
  'a new chapter of a Fiction story starts as prose');

update public.stories set category_id = (select id from public.categories where slug = 'plays')
where id = '00000000-0000-4000-9000-000000000002';
select pg_temp.new_chapter(2, 'laypla01', 97);
select is((select layout from public.chapters where code = 'laypla01'), 'play',
  'a new chapter of a Plays story starts as a play');

update public.stories set category_id = (select id from public.categories where slug = 'poetry')
where id = '00000000-0000-4000-9000-000000000002';
select pg_temp.new_chapter(2, 'laypoe01', 98);
select is((select layout || '/' || is_poem::text from public.chapters where code = 'laypoe01'),
  'poem/true', 'a new chapter of a Poetry story starts as a poem, and is_poem follows');

/* ---------- 2. Who may change it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_chapter_layout('laypro01', 'play'), 'not_found',
  'another member can''t change someone else''s chapter');
select pg_temp.sign_out();
select throws_ok($$select public.set_chapter_layout('laypro01', 'play')$$, '42501', null,
  'a visitor who isn''t signed in can''t change a chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_chapter_layout('laypro01', 'sonnet'), 'unknown_layout',
  'a layout that isn''t prose, play or poem is refused');
select is(public.set_chapter_layout('laypro01', 'play'), 'ok',
  'the writer changes their chapter to a play');
select is(public.set_chapter_layout('no-such1', 'play'), 'not_found',
  'a chapter that doesn''t exist answers not_found');

/* ---------- 3. The old switch and the list ---------- */

select is(public.set_chapter_layout('laypro01', 'poem'), 'ok', 'the writer makes it a poem');
select is((select is_poem from public.chapters where code = 'laypro01'), true,
  'is_poem follows the layout');
select is(public.set_chapter_poem_mode('laypro01', false), 'ok', 'the old poem switch still works');
select is((select layout || '/' || draft_body from public.chapters where code = 'laypro01'),
  'prose/Cuvinte.', 'switching the poem off makes it prose again, and the words are untouched');

select is((select chapter ->> 'layout'
           from jsonb_array_elements(public.story_chapter_progress(
             (select slug from public.stories where id = '00000000-0000-4000-9000-000000000002'))
             -> 'chapters') as chapter
           where chapter ->> 'code' = 'laypla01'), 'play',
  'the writer''s chapter list says each chapter''s layout');

select * from finish();
rollback;
