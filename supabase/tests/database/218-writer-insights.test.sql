-- Database tests for the writer's most-loved lines and where readers stop (bundle IDEAS-1, part d;
-- ideas IDEA-20261031-1 and -5).
-- What it proves, by the ideas' criteria:
-- - a passage link's share counts once for the chapter and once for each paragraph it covers,
--   never who; a wrong range, the writer's own share and a signed-out caller count nothing;
-- - the writer sees the top five paragraphs of a chapter with share and comment counts, "fewer
--   than 5" below five, and their own comments never count (idea 1);
-- - where readers stop comes in tenths, only from five readers, and the writer's own place never
--   counts (idea 5);
-- - only the chapter's writer gets any of it;
-- - paragraph_shares_select_owner: allowed and denied.
-- Personas: adult_writer (…01, writes statia-meteo-seed01), teacher (…07) and blocker (…15)
-- share; personas …02 to …08 keep reading places. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A published chapter with six paragraphs.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select '21800000-0000-4000-8000-000000000001', stories.id, stories.user_id, 'lines001', 1, 'Unu', 'x', 30,
  'published', 'Unu',
  E'Primul rând.\n\nAl doilea rând.\n\nAl treilea *rând*.\n\nAl patrulea.\n\nAl cincilea.\n\n![Un far](picture:21800000-0000-4000-8000-0000000000a1)',
  30, now()
from public.stories where stories.slug = 'statia-meteo-seed01';
delete from public.rate_limit_events where user_id in
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015');

/* ---------- 1. Counting a passage share ---------- */

select set_config('role', 'anon', true);
select throws_ok($$ select public.record_passage_share('statia-meteo-seed01', 'lines001', 1, 1) $$,
  '42501', null, 'a visitor who isn''t logged in can''t count a share');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.record_passage_share('statia-meteo-seed01', 'lines001', 2, 3),
  'a reader''s passage link is counted');
select ok(public.record_passage_share('statia-meteo-seed01', 'lines001', 3, 3),
  'and another, on one paragraph');
select ok(not public.record_passage_share('statia-meteo-seed01', 'lines001', 1, 6),
  'more than five paragraphs is not counted');
select ok(not public.record_passage_share('statia-meteo-seed01', 'lines001', 3, 2),
  'a range ending before it starts is not counted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select ok(public.record_passage_share('statia-meteo-seed01', 'lines001', 3, 3), 'a third share counts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(not public.record_passage_share('statia-meteo-seed01', 'lines001', 1, 1),
  'the writer sharing their own passage isn''t counted');

select pg_temp.as_owner();
select is((select sum(total)::integer from public.chapter_shares
  where chapter_id = '21800000-0000-4000-8000-000000000001'), 3,
  'each counted passage share is also one share of the chapter');
select is((select sum(total)::integer from public.paragraph_shares
  where chapter_id = '21800000-0000-4000-8000-000000000001'), 4,
  'and one for each paragraph it covered (2 + 1 + 1)');

/* ---------- 2. paragraph_shares_select_owner ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.paragraph_shares
  where chapter_id = '21800000-0000-4000-8000-000000000001'), 2::bigint,
  'allowed: paragraph_shares_select_owner, the writer reads their paragraphs'' totals');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*) from public.paragraph_shares), 0::bigint,
  'denied: paragraph_shares_select_owner, a reader sees no totals');

/* ---------- 3. Most-loved lines ---------- */

select pg_temp.as_owner();
-- Five other people comment on paragraph 4, and the writer once (which never counts).
insert into public.comments (user_id, chapter_id, body, paragraph_key, paragraph_number)
select persona.id, '21800000-0000-4000-8000-000000000001', 'Frumos.', public.paragraph_key_of('Al patrulea.'), 4
from (values ('00000000-0000-4000-8000-000000000002'::uuid), ('00000000-0000-4000-8000-000000000003'::uuid),
  ('00000000-0000-4000-8000-000000000007'::uuid), ('00000000-0000-4000-8000-000000000015'::uuid),
  ('00000000-0000-4000-8000-000000000016'::uuid), ('00000000-0000-4000-8000-000000000001'::uuid)) as persona (id);

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(jsonb_array_length(public.writer_chapter_insights('statia-meteo-seed01', 'lines001') -> 'loved_lines'), 3,
  'only paragraphs with an action are listed');
select is(public.writer_chapter_insights('statia-meteo-seed01', 'lines001') -> 'loved_lines' -> 0,
  jsonb_build_object('number', 4, 'excerpt', 'Al patrulea.', 'shares', 0, 'comments', 5, 'total', 5),
  'the most-loved paragraph comes first, with five comments from other people');
select is(public.writer_chapter_insights('statia-meteo-seed01', 'lines001') -> 'loved_lines' -> 1,
  jsonb_build_object('number', 3, 'excerpt', 'Al treilea rând.', 'shares', null, 'comments', 0, 'total', null),
  'three shares read "fewer than 5", and the excerpt drops Markdown marks');

/* ---------- 4. Where readers stop ---------- */

select pg_temp.as_owner();
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
select persona.id, chapters.story_id, chapters.id, persona.percent, 'phone'
from public.chapters,
  (values ('00000000-0000-4000-8000-000000000002'::uuid, 15), ('00000000-0000-4000-8000-000000000003'::uuid, 18),
    ('00000000-0000-4000-8000-000000000004'::uuid, 55), ('00000000-0000-4000-8000-000000000001'::uuid, 50)) as persona (id, percent)
where chapters.id = '21800000-0000-4000-8000-000000000001';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.writer_chapter_insights('statia-meteo-seed01', 'lines001') -> 'stops',
  '{"readers": null, "tenths": null}'::jsonb,
  'below five readers there is no bar, only "fewer than 5" (the writer''s own place never counts)');

select pg_temp.as_owner();
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
select persona.id, chapters.story_id, chapters.id, 100, 'computer'
from public.chapters,
  (values ('00000000-0000-4000-8000-000000000005'::uuid), ('00000000-0000-4000-8000-000000000006'::uuid)) as persona (id)
where chapters.id = '21800000-0000-4000-8000-000000000001';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.writer_chapter_insights('statia-meteo-seed01', 'lines001') -> 'stops',
  '{"readers": 5, "tenths": [0, 40, 0, 0, 0, 20, 0, 0, 0, 40]}'::jsonb,
  'from five readers the bar shows tenths as shares of readers, the end in the last');

/* ---------- 5. Only the writer ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.writer_chapter_insights('statia-meteo-seed01', 'lines001'), null,
  'a reader gets nothing about another writer''s chapter');
select is(public.writer_chapter_insights('statia-meteo-seed01', 'nosuch01'), null,
  'nor does anyone for a chapter that doesn''t exist');
select set_config('role', 'anon', true);
select throws_ok($$ select public.writer_chapter_insights('statia-meteo-seed01', 'lines001') $$,
  '42501', null, 'a visitor who isn''t logged in gets nothing');
select pg_temp.as_owner();
select ok(not exists (select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'paragraph_shares' and column_name like '%user%'),
  'paragraph_shares holds no one''s ID');

select * from finish();
rollback;
