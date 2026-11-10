-- Database tests for "This week" on the Writers' hub (bundle GAPS-12b; board WritersHub).
-- What it proves:
-- - my_week_numbers() refuses a signed-out caller;
-- - a writer with a quiet week gets four zeros;
-- - chapters posted is exact and counts only chapters first published in the last 7 days that
--   are still published (an older chapter, a draft, a chapter taken back to draft and a deleted
--   chapter don't count);
-- - reads, comments and new followers from 1 to 4 come back as null ("fewer than 5"), 5 or more
--   show, and anything older than 7 days is left out;
-- - the writer's own comments never count;
-- - another writer never gets these numbers, and no user ID is ever returned.
-- No new table or policy: the function reads only counts about the caller.
-- Test data: chapters on adult_writer's (…01) seed story statia-meteo-seed01; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

-- A quiet week to start from: whatever the seed gave adult_writer happened long ago.
alter table public.follows_users disable trigger user;
alter table public.comments disable trigger user;
alter table public.chapters disable trigger user;
update public.follows_users set created_at = now() - interval '40 days'
where followed_user_id = pg_temp.persona(1);
update public.comments set created_at = now() - interval '40 days'
where chapter_id in (select chapters.id from public.chapters join public.stories on stories.id = chapters.story_id
                     where stories.user_id = pg_temp.persona(1));
update public.chapters set first_published_at = now() - interval '40 days'
where first_published_at is not null
  and story_id in (select id from public.stories where user_id = pg_temp.persona(1));
delete from public.chapter_reads
where chapter_id in (select chapters.id from public.chapters join public.stories on stories.id = chapters.story_id
                     where stories.user_id = pg_temp.persona(1));

/* ---------- 1. Who may ask, and a quiet week ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.my_week_numbers() $$), '42501', 'a visitor who isn''t logged in gets no week');
select pg_temp.sign_in(pg_temp.persona(1)::text);
select is(public.my_week_numbers(),
  '{"chapters_posted": 0, "reads": 0, "comments": 0, "followers": 0}'::jsonb,
  'a writer with a quiet week gets four zeros');
reset role;

/* ---------- 2. Chapters posted ---------- */

-- Two chapters this week, one 20 days ago, one draft and one posted this week but deleted since.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, deleted_at)
select '00000000-0000-4000-9000-000000000001', pg_temp.persona(1), made.code, made.position,
  'Titlu', 'x', 3, 'published', 'Titlu', 'Text.', 1,
  now() - made.age, made.deleted_at
from (values
  ('week0001', 901, interval '1 day', null::timestamptz),
  ('week0002', 902, interval '6 days', null),
  ('week0003', 903, interval '20 days', null),
  ('week0005', 905, interval '2 days', now())
) as made (code, position, age, deleted_at);
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values ('00000000-0000-4000-9000-000000000001', pg_temp.persona(1), 'week0004', 904, 'Ciornă', 'x', 1, 'draft');
-- And one posted 3 days ago that the writer took back to draft.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status, first_published_at)
values ('00000000-0000-4000-9000-000000000001', pg_temp.persona(1), 'week0006', 906, 'Retras', 'x', 1, 'draft', now() - interval '3 days');

select pg_temp.sign_in(pg_temp.persona(1)::text);
select is((public.my_week_numbers() ->> 'chapters_posted')::integer, 2,
  'chapters posted counts only chapters first published in the last 7 days that are still published');
reset role;

/* ---------- 3. Reads, comments and followers follow the "fewer than 5" rule ---------- */

-- 3 reads today, 2 comments from readers (and one by the writer), 4 new followers.
insert into public.chapter_reads (chapter_id, read_on, total)
select id, (now() at time zone 'Europe/Bucharest')::date, 3 from public.chapters where code = 'week0001';
insert into public.comments (user_id, chapter_id, body)
select pg_temp.persona(author.number), chapters.id, 'Frumos.'
from public.chapters, (values (1), (2), (3)) as author (number) where chapters.code = 'week0001';
delete from public.follows_users where followed_user_id = pg_temp.persona(1);
insert into public.follows_users (user_id, followed_user_id)
select pg_temp.persona(follower), pg_temp.persona(1) from unnest(array[2, 3, 7, 8]) as follower;

select pg_temp.sign_in(pg_temp.persona(1)::text);
select is(public.my_week_numbers() -> 'reads', 'null'::jsonb, '3 reads answer null: fewer than 5');
select is(public.my_week_numbers() -> 'comments', 'null'::jsonb, '2 comments answer null, and the writer''s own doesn''t count');
select is(public.my_week_numbers() -> 'followers', 'null'::jsonb, '4 new followers answer null');
reset role;

-- Up to 12 reads, 5 readers' comments and 5 followers; plus reads, a comment and a follower from
-- 10 days ago, which must not count.
update public.chapter_reads set total = 12
where chapter_id = (select id from public.chapters where code = 'week0001');
insert into public.chapter_reads (chapter_id, read_on, total)
select id, (now() at time zone 'Europe/Bucharest')::date - 10, 50 from public.chapters where code = 'week0003';
insert into public.comments (user_id, chapter_id, body)
select pg_temp.persona(author.number), chapters.id, 'Și mie.'
from public.chapters, (values (7), (8), (9)) as author (number) where chapters.code = 'week0001';
insert into public.comments (user_id, chapter_id, body, created_at)
select pg_temp.persona(10), chapters.id, 'Mai demult.', now() - interval '10 days'
from public.chapters where chapters.code = 'week0003';
insert into public.follows_users (user_id, followed_user_id) values (pg_temp.persona(9), pg_temp.persona(1));
insert into public.follows_users (user_id, followed_user_id, created_at)
values (pg_temp.persona(10), pg_temp.persona(1), now() - interval '10 days');

select pg_temp.sign_in(pg_temp.persona(1)::text);
select is((public.my_week_numbers() ->> 'reads')::integer, 12, '12 reads this week show, older reads are left out');
select is((public.my_week_numbers() ->> 'comments')::integer, 5, '5 readers'' comments show, an older one is left out');
select is((public.my_week_numbers() ->> 'followers')::integer, 5, '5 new followers show, an older follow is left out');
select is(public.my_week_numbers()::text ~ '[0-9a-f]{8}-[0-9a-f]{4}-', false, 'no user ID is ever returned');

/* ---------- 4. Nobody else's week ---------- */

select pg_temp.sign_in(pg_temp.persona(7)::text);
select is((public.my_week_numbers() ->> 'chapters_posted')::integer, 0, 'another writer never gets these chapters');
select isnt((public.my_week_numbers() ->> 'reads')::integer, 12, 'or these reads');

select * from finish();
rollback;
