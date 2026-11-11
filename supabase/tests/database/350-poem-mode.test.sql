-- Database tests for poem mode (bundle MUST-2; IDEA-20261106-1).
-- What it proves:
-- - a chapter starts as prose, and a new chapter of a Poetry story starts in poem mode;
-- - only the writer can switch their chapter: another member gets 'not_found', a visitor is
--   refused, and switching never touches the words;
-- - the reader's answer from get_chapter() says whether the chapter is a poem, and the poem's
--   lines, blank lines and leading spaces come back exactly as stored.
-- No new table or policy: chapters' policies are tested elsewhere; set_chapter_poem_mode() checks
-- the owner itself.
-- Personas: adult_writer (…01, the seed stories' writer), teacher (…07, another member and a
-- reader). Test data: chapters inserted directly; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- A published chapter of the seed story (fiction), whose body is a short poem: two stanzas, a
-- line that starts with two non-breaking spaces, hard breaks as Markdown writes them.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'poemone1',
  96, 'Ploaie', E'Plouă pe acoperiș,  \n' || chr(160) || chr(160) || E'încet.\n\nApoi tace.', 6,
  'published', 'Ploaie',
  E'Plouă pe acoperiș,  \n' || chr(160) || chr(160) || E'încet.\n\nApoi tace.', 6, now());
update public.stories set first_published_at = now()
where id = '00000000-0000-4000-9000-000000000001' and first_published_at is null;

-- The starting point.
select is((select is_poem from public.chapters where code = 'poemone1'), false,
  'a chapter of a fiction story starts as prose');

-- A Poetry story's new chapter starts in poem mode (the second seed story, moved to Poetry here).
update public.stories set category_id = (select id from public.categories where slug = 'poetry')
where id = '00000000-0000-4000-9000-000000000002';
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body)
values ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'poemtwo2',
  97, 'Vers', '');
select is((select is_poem from public.chapters where code = 'poemtwo2'), true,
  'a new chapter of a Poetry story starts in poem mode');

-- Who may switch it.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_chapter_poem_mode('poemone1', true), 'not_found',
  'another member can''t switch someone else''s chapter');
select pg_temp.sign_out();
select throws_ok($$select public.set_chapter_poem_mode('poemone1', true)$$, '42501', null,
  'a visitor who isn''t signed in can''t switch a chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_chapter_poem_mode('poemone1', true), 'ok',
  'the writer switches their chapter to poem mode');
select is(public.set_chapter_poem_mode('no-such1', true), 'not_found',
  'a chapter that doesn''t exist answers not_found');
reset role;
select is((select is_poem from public.chapters where code = 'poemone1'), true,
  'the switch is saved');
select is((select published_body from public.chapters where code = 'poemone1'),
  E'Plouă pe acoperiș,  \n' || chr(160) || chr(160) || E'încet.\n\nApoi tace.',
  'switching never touches the words');

-- What a reader gets.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.get_chapter('statia-meteo-seed01', 'poemone1') ->> 'is_poem')::boolean, true,
  'the reader is told the chapter is a poem');
select is(public.get_chapter('statia-meteo-seed01', 'poemone1') ->> 'body',
  E'Plouă pe acoperiș,  \n' || chr(160) || chr(160) || E'încet.\n\nApoi tace.',
  'and gets every line, the blank line between stanzas and the leading spaces as stored');

select * from finish();
rollback;
