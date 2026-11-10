-- Database tests for the page of comments on a writer's chapters (GAPS-5; story S1-E3-07;
-- CLAUDE.md rule 15).
-- What it proves:
-- - only a signed-in person may ask, and each writer gets only the comments on their own chapters;
-- - the list is newest first, a page at a time, and says whether older comments are left;
-- - comments written at the very same moment are all shown across two pages, none skipped
--   (break test, 10 Nov 2026), and each carries its own ID;
-- - the writer's own comments, a deleted comment and one from a person the writer blocked are
--   left out, as on the dashboard;
-- - one story can be picked, and the stories to pick from are the ones with a published chapter;
-- - a long comment is shortened and says so; no answer carries a user ID.
-- Personas: adult_writer (…01) writes; teacher (…07) and teen_17 (…02) comment; the writer blocks
-- …16 for this test. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- A persona's ID from its number.
create function pg_temp.persona(persona_number integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-' || lpad(persona_number::text, 12, '0'))::uuid;
$$;
-- The bodies in an answer, in order, each cut to its first 12 characters.
create function pg_temp.bodies(answer jsonb) returns text language sql as $$
  select coalesce(string_agg(left(item ->> 'body', 12), ',' order by place), '')
  from jsonb_array_elements(answer -> 'comments') with ordinality as listed (item, place);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's seed story gets a published chapter; a second story gets one too, and a third
-- has only a draft.
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating)
values ('32700000-0000-4000-9000-000000000002', pg_temp.persona(1), 'a-doua-poveste-327', 'A doua poveste', 'x', 'ro',
        (select id from public.categories where slug = 'fiction'), 'all_ages'),
       ('32700000-0000-4000-9000-000000000003', pg_temp.persona(1), 'ciorna-327', 'Ciornă', 'x', 'ro',
        (select id from public.categories where slug = 'fiction'), 'all_ages');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', pg_temp.persona(1), 'c327aaaa', 1,
        'Unu', 'x', 1, 'published', 'Unu', 'Primul capitol.', 2, now() - interval '9 days'),
       ('32700000-0000-4000-9000-000000000002', pg_temp.persona(1), 'c327bbbb', 1,
        'Alt unu', 'x', 1, 'published', 'Alt unu', 'Alt capitol.', 2, now() - interval '9 days'),
       ('32700000-0000-4000-9000-000000000003', pg_temp.persona(1), 'c327cccc', 1,
        'Ciornă', 'x', 1, 'draft', null, null, null, null);
update public.stories set first_published_at = now() - interval '9 days'
where id in ('00000000-0000-4000-9000-000000000001', '32700000-0000-4000-9000-000000000002');

-- Comments, oldest to newest: three from readers on the first story, one on the second, then the
-- writer's own, a blocked person's and a deleted one, which must all stay out.
insert into public.comments (user_id, chapter_id, body, created_at)
select pg_temp.persona(wanted.number), chapters.id, wanted.body, now() - wanted.age
from (values
  (7, 'c327aaaa', 'Primul comentariu', interval '5 days'),
  (2, 'c327aaaa', repeat('lung ', 140), interval '4 days'),
  (7, 'c327bbbb', 'Pe a doua poeste', interval '3 days'),
  (7, 'c327aaaa', 'Cel mai nou', interval '1 day'),
  (1, 'c327aaaa', 'Răspunsul autoarei', interval '2 hours'),
  (16, 'c327aaaa', 'De la cineva blocat', interval '1 hour')
) as wanted (number, code, body, age)
join public.chapters on chapters.code = wanted.code;
insert into public.comments (user_id, chapter_id, body, created_at, deleted_at, deleted_by)
select pg_temp.persona(7), chapters.id, 'Șters', now() - interval '30 minutes', now(), 'author'
from public.chapters where chapters.code = 'c327aaaa';
insert into public.blocks (user_id, blocked_user_id) values (pg_temp.persona(1), pg_temp.persona(16))
on conflict do nothing;

/* ---------- 1. Who may ask ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.my_chapter_comments() $$), '42501',
  'a signed-out visitor can''t read a writer''s comments');

/* ---------- 2. The writer's list ---------- */

select pg_temp.sign_in(pg_temp.persona(1)::text);
select is(pg_temp.bodies(public.my_chapter_comments()), 'Cel mai nou,Pe a doua po,lung lung lu,Primul comen',
  'the writer sees readers'' comments newest first, without their own, a blocked person''s or a deleted one');
select is(public.my_chapter_comments() -> 'has_more', 'false'::jsonb, 'and nothing older is left');
select is(public.my_chapter_comments() -> 'comments' -> 0 ->> 'story_title', 'Stația meteo',
  'each comment names its story');
select is(public.my_chapter_comments() -> 'comments' -> 0 ->> 'chapter_position', '1', 'and its chapter');
select ok(char_length(public.my_chapter_comments() -> 'comments' -> 2 ->> 'body') = 600
  and (public.my_chapter_comments() -> 'comments' -> 2 -> 'is_shortened')::boolean,
  'a long comment is shortened to 600 characters and says so');
select is(public.my_chapter_comments() -> 'comments' -> 0 -> 'is_shortened', 'false'::jsonb,
  'a short comment is whole');
select ok(position('00000000-0000-4000-8000' in public.my_chapter_comments()::text) = 0,
  'the answer carries no user ID');

/* ---------- 3. A page at a time ---------- */

select is(pg_temp.bodies(public.my_chapter_comments(null, null, 2)), 'Cel mai nou,Pe a doua po',
  'a page of two holds the newest two');
select is(public.my_chapter_comments(null, null, 2) -> 'has_more', 'true'::jsonb, 'and says older ones are left');
select is(pg_temp.bodies(public.my_chapter_comments(
    (public.my_chapter_comments(null, null, 2) -> 'comments' -> 1 ->> 'created_at')::timestamptz, null, 2)),
  'lung lung lu,Primul comen', 'the next page starts after the oldest one shown');

/* ---------- 4. One story ---------- */

select is(pg_temp.bodies(public.my_chapter_comments(null, 'a-doua-poveste-327')), 'Pe a doua po',
  'picking a story keeps only its comments');
select is((select string_agg(story ->> 'slug', ',' order by place)
           from jsonb_array_elements(public.my_chapter_comments() -> 'stories') with ordinality as listed (story, place)
           where story ->> 'slug' in ('a-doua-poveste-327', 'ciorna-327', 'statia-meteo-seed01')),
  'a-doua-poveste-327,statia-meteo-seed01',
  'the stories to pick from are the ones with a published chapter, by title');

/* ---------- 5. Another writer ---------- */

select pg_temp.sign_in(pg_temp.persona(7)::text);
select is(pg_temp.bodies(public.my_chapter_comments(null, 'statia-meteo-seed01')), '',
  'another person gets none of this writer''s comments, even by the story''s address');

/* ---------- 6. Comments written at the very same moment ---------- */

-- Three comments with one timestamp (now() is the same all through a transaction) join the one
-- already on the second story, so a page of two ends in the middle of them.
reset role;
insert into public.comments (user_id, chapter_id, body, created_at)
select pg_temp.persona(7), chapters.id, 'Deodată ' || number, now() - interval '10 days'
from public.chapters, generate_series(1, 3) as number
where chapters.code = 'c327bbbb';
select pg_temp.sign_in(pg_temp.persona(1)::text);

create temp table first_page on commit drop as
select public.my_chapter_comments(null, 'a-doua-poveste-327', 2) as answer;
select is((select count(distinct item ->> 'id')
           from (select jsonb_array_elements(answer -> 'comments') as item from first_page
                 union all
                 select jsonb_array_elements(public.my_chapter_comments(
                   (answer -> 'comments' -> 1 ->> 'created_at')::timestamptz, 'a-doua-poveste-327', 2,
                   (answer -> 'comments' -> 1 ->> 'id')::uuid) -> 'comments')
                 from first_page) as both_pages),
  4::bigint, 'two pages of two show all four comments, though three were written at the same moment');
select ok((select answer -> 'comments' -> 0 ->> 'id' from first_page) ~ '^[0-9a-f-]{36}$'
  and position('00000000-0000-4000-8000' in (select answer::text from first_page)) = 0,
  'each comment carries its own ID, and still nobody''s user ID');

select * from finish();

rollback;
