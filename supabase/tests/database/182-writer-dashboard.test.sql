-- Database tests for the writer dashboard (story S1-E3-07).
-- What it proves:
-- - writer_dashboard() refuses a signed-out caller and an unknown period;
-- - any total from 1 to 4 comes back as null ("fewer than 5"), 0 stays 0 and 5 or more shows;
-- - read-through is the share of readers at 95% or more, and null below 5 readers;
-- - the writer's own reads, places and likes never count;
-- - the last 30 days leave out older likes; the per-chapter table stays all time;
-- - another writer's dashboard never shows these numbers, and no user ID is ever returned;
-- - a comment from someone the writer blocked is left out of the latest comments.
-- No new table or policy: the function reads only totals and counts (criterion 3).
-- Test data: one published chapter on adult_writer's seed story statia-meteo-seed01, read by
-- seeded personas; rolled back at the end.
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
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) seed story gets one published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', pg_temp.persona(1), 'dash0001', 1,
  'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '60 days');

-- Reads: 12 openings today. Places: 6 readers (2, 3, 7, 8, 9, 10), 3 of them at the end, plus the
-- writer's own place at the end, which must not count.
insert into public.chapter_reads (chapter_id, read_on, total)
select id, (now() at time zone 'Europe/Bucharest')::date, 12 from public.chapters where code = 'dash0001';
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
select pg_temp.persona(reader.number), chapters.story_id, chapters.id, reader.percent, 'computer'
from public.chapters,
  (values (1, 100), (2, 100), (3, 96), (7, 95), (8, 40), (9, 10), (10, 0)) as reader (number, percent)
where chapters.code = 'dash0001';

-- Likes: five readers, three of them 40 days ago; and the writer's own like, which must not count.
insert into public.chapter_likes (user_id, chapter_id, created_at)
select pg_temp.persona(liker.number), chapters.id, now() - liker.age
from public.chapters,
  (values (1, interval '1 day'), (2, interval '1 day'), (7, interval '1 day'), (8, interval '40 days'),
    (9, interval '40 days'), (10, interval '40 days'))
    as liker (number, age)
where chapters.code = 'dash0001';

-- Followers: exactly five people follow the writer (the seed's follows are cleared first).
delete from public.follows_users where followed_user_id = pg_temp.persona(1);
insert into public.follows_users (user_id, followed_user_id)
select pg_temp.persona(follower), pg_temp.persona(1) from unnest(array[2, 3, 7, 8, 9]) as follower;

-- Comments: teacher's and the blocked persona's (…16) on the chapter.
insert into public.comments (user_id, chapter_id, body)
select pg_temp.persona(author.number), chapters.id, author.body
from public.chapters,
  (values (7, 'Ce final!'), (16, 'Comentariu de la cineva blocat.')) as author (number, body)
where chapters.code = 'dash0001';

/* ---------- 1. Who may ask ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.writer_dashboard('all') $$), '42501',
  'a signed-out visitor can''t open a dashboard');
select pg_temp.sign_in(pg_temp.persona(1)::text);
select is(pg_temp.refusal($$ select public.writer_dashboard('this_year') $$), '22023',
  'an unknown period is refused');

/* ---------- 2. The totals, all time ---------- */

-- adult_writer blocks the blocked persona for this test only.
set local role postgres;
insert into public.blocks (user_id, blocked_user_id) values (pg_temp.persona(1), pg_temp.persona(16))
on conflict do nothing;
select pg_temp.sign_in(pg_temp.persona(1)::text);

create temporary table dashboard as select public.writer_dashboard('all') as body;

select is((select (body -> 'totals' ->> 'reads')::integer from dashboard), 12,
  'reads show when there are 5 or more');
select is((select (body -> 'totals' ->> 'read_through')::integer from dashboard), 50,
  'read-through is 3 of 6 readers at the end (the writer''s own place left out)');
select is((select (body -> 'totals' ->> 'likes')::integer from dashboard), 5,
  '5 likes from readers show (the writer''s own like left out)');
select is((select (body -> 'totals' ->> 'followers')::integer from dashboard), 5,
  '5 followers show');
select is((select (body -> 'totals' ->> 'shares')::integer from dashboard), 0,
  'no shares stay 0, which can''t point to anyone');

/* ---------- 3. The per-chapter table and the latest comments ---------- */

select is((select (body -> 'chapters' -> 0 ->> 'reads')::integer from dashboard), 12,
  'the chapter''s reads show in its row');
select is((select body -> 'chapters' -> 0 -> 'comments' from dashboard), 'null'::jsonb,
  'one shown comment comes back as "fewer than 5"');
select is((select jsonb_array_length(body -> 'latest_comments') from dashboard), 1,
  'the latest comments leave out the blocked persona''s comment');
select is((select body -> 'latest_comments' -> 0 ->> 'body' from dashboard), 'Ce final!',
  'and show teacher''s words');
select ok((select body::text !~ '0000-4000-8000' from dashboard),
  'no user ID appears anywhere in the dashboard (criterion 3)');

/* ---------- 4. Fewer than 5 readers ---------- */

-- Two readers leave; four places remain, so the read-through can't be shown.
set local role postgres;
delete from public.reading_positions where user_id in (pg_temp.persona(9), pg_temp.persona(10));
select pg_temp.sign_in(pg_temp.persona(1)::text);
select is(public.writer_dashboard('all') -> 'totals' -> 'read_through', 'null'::jsonb,
  'read-through from fewer than 5 readers comes back as "fewer than 5"');

/* ---------- 5. The last 30 days ---------- */

select is((public.writer_dashboard('last_30_days') -> 'totals' -> 'likes'), 'null'::jsonb,
  'the last 30 days count 2 likes (the 40-day-old ones left out): "fewer than 5"');
select is((public.writer_dashboard('last_30_days') -> 'chapters' -> 0 ->> 'reads')::integer, 12,
  'the chapter table stays all time');

/* ---------- 6. Another writer ---------- */

select pg_temp.sign_in(pg_temp.persona(7)::text);
select is(jsonb_array_length(public.writer_dashboard('all') -> 'chapters'), 0,
  'another writer''s dashboard never lists adult_writer''s chapters');

select * from finish();

rollback;
