-- Database tests for the storyline in Story Atlas: the board, the timeline and the point-of-view
-- lanes (stories S1-E17-19 to S1-E17-22; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - story_storyline() reads the chapters in book order with their planning, the acts and the
--   events sorted by their sort value (S1-E17-20);
-- - events are added, changed and deleted; a missing sort value, unknown changes and non-numbers
--   are refused;
-- - a board move saves the new order and the act; a move that changes the order of published
--   chapters waits for the writer's confirmation; a draft moving never asks; an out-of-date list
--   and an act of another story are refused (S1-E17-19, S1-E3-04);
-- - "Add chapter" puts a draft at the end of its act, or at the end of the book for "No act";
-- - policy story_events_select_own: allowed (the writer) and denied (another member);
-- - another member, a suspended writer and a signed-out visitor change nothing; no user ID in
--   any answer.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member with a
-- story of their own; suspended_user (…13) is sanctioned. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The SQLSTATE a statement raises, or null; with the hint when there is one.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  error_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint;
  return sqlstate || coalesce(':' || nullif(error_hint, ''), '');
end;
$$;
-- The writer's live chapter codes in book order (read as the owner, past RLS).
create function pg_temp.book_order() returns text language sql security definer as $$
  select string_agg(code, ',' order by position) from public.chapters
  where story_id = '00000000-0000-4000-9000-000000000001' and deleted_at is null;
$$;
-- The ID of the writer's act at a place, as text.
create function pg_temp.act(place integer) returns text language sql security definer as $$
  select id::text from public.story_plan_acts
  where story_id = '00000000-0000-4000-9000-000000000001' and position = place;
$$;
-- The ID of an act of the other writer's story, as text.
create function pg_temp.other_act() returns text language sql security definer as $$
  select id::text from public.story_plan_acts
  where story_id = '19500000-0000-4000-8000-000000000001' and position = 1;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
-- The codes of the chapters "Add chapter" makes.
create temporary table added (label text primary key, code text) on commit drop;
grant all on added to anon, authenticated;
-- A chapter's place in the book (read as the owner, past RLS).
create function pg_temp.place_of(chapter_code text) returns integer language sql security definer as $$
  select position from public.chapters where code = chapter_code;
$$;
grant execute on function pg_temp.place_of(text) to authenticated;

-- Three chapters for the writer: one and three are published, two is a draft.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                             published_title, published_body, first_published_at, last_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c195aaaa', 1,
        'Unu', 'Unu.', 'published', 'Unu', 'Unu.', now(), now()),
       ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c195bbbb', 2,
        'Doi', 'Doi.', 'draft', null, null, null, null),
       ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c195cccc', 3,
        'Trei', 'Trei.', 'published', 'Trei', 'Trei.', now(), now());
-- Another writer's story, with its plan and acts made by the triggers.
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating)
values ('19500000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 't195-alta',
  'Alta', 'Alta.', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages');

/* ---------- 1. Reading the storyline ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select string_agg(chapter ->> 'code' || ':' || (chapter ->> 'status') || ':' || (chapter ->> 'kind'), ',')
           from jsonb_array_elements(public.story_storyline('statia-meteo-seed01') -> 'chapters') as chapter),
  'c195aaaa:published:chapter,c195bbbb:draft:chapter,c195cccc:published:chapter',
  'the storyline lists the chapters in book order with their status and type');
select is(jsonb_array_length(public.story_storyline('statia-meteo-seed01') -> 'acts'), 3,
  'the storyline carries the plan''s three acts');

/* ---------- 2. The timeline (S1-E17-20) ---------- */

insert into named select 'storm', (public.add_story_event('statia-meteo-seed01', ' Furtuna mare ', 'Primăvara 2055',
  2055.3, 'Farul se stinge.') ->> 'id')::uuid;
insert into named select 'war', (public.add_story_event('statia-meteo-seed01', 'Războiul', '2054', 2054, '') ->> 'id')::uuid;
insert into named select 'peace', (public.add_story_event('statia-meteo-seed01', 'Pacea', '2056', 2056, '') ->> 'id')::uuid;
select is((select count(*)::integer from public.story_events where story_id = '00000000-0000-4000-9000-000000000001'), 3,
  'allowed: story_events_select_own: the writer reads the events on their timeline');
select is((select string_agg(event ->> 'title', ',')
           from jsonb_array_elements(public.story_storyline('statia-meteo-seed01') -> 'events') as event),
  'Războiul,Furtuna mare,Pacea', 'events sort by their sort value, titles trimmed');
select is(pg_temp.refusal($$ select public.add_story_event('statia-meteo-seed01', 'Fără dată', '', null, '') $$),
  '23514:sort_value_required', 'an event without a sort value is refused');
select public.update_story_event((select id from named where label = 'war'),
  '{"title": "Războiul cel lung", "sort_value": 2057, "display_date": "Iarna 2057"}');
select is((select string_agg(event ->> 'title' || '@' || (event ->> 'display_date'), ',')
           from jsonb_array_elements(public.story_storyline('statia-meteo-seed01') -> 'events') as event),
  'Furtuna mare@Primăvara 2055,Pacea@2056,Războiul cel lung@Iarna 2057',
  'a changed event saves and takes its new place');
select is(pg_temp.refusal(format($$ select public.update_story_event(%L, '{"user_id": "x"}') $$,
  (select id from named where label = 'war'))), '23514:unknown_change', 'an unknown change to an event is refused');
select is(pg_temp.refusal(format($$ select public.update_story_event(%L, '{"sort_value": "în curând"}') $$,
  (select id from named where label = 'war'))), '23514:bad_number', 'a sort value that isn''t a number is refused');
select public.delete_story_event((select id from named where label = 'peace'));
select is((select count(*)::integer from public.story_events where story_id = '00000000-0000-4000-9000-000000000001'), 2,
  'a deleted event is gone');

/* ---------- 3. The board (S1-E17-19) ---------- */

select is(public.place_chapter_on_board('c195bbbb', pg_temp.act(2), '{c195aaaa,c195bbbb,c195cccc}', false) ->> 'outcome',
  'ok', 'a chapter moved to another act without a new order saves at once');
select is((select act_id::text from public.chapter_plans join public.chapters on chapters.id = chapter_plans.chapter_id
           where chapters.code = 'c195bbbb'), pg_temp.act(2), 'the moved chapter is in its new act');
select is(public.place_chapter_on_board('c195bbbb', pg_temp.act(2), '{c195bbbb,c195aaaa,c195cccc}', false) ->> 'outcome',
  'ok', 'a draft moving in front of published chapters doesn''t ask: readers see the same order');
select is(pg_temp.book_order(), 'c195bbbb,c195aaaa,c195cccc', 'the new order saves and the numbers follow');
select is(public.place_chapter_on_board('c195cccc', '', '{c195bbbb,c195cccc,c195aaaa}', false) ->> 'outcome',
  'needs_confirmation', 'a move that changes the order of published chapters asks first');
select is(pg_temp.book_order(), 'c195bbbb,c195aaaa,c195cccc', 'until the writer confirms, nothing moves');
select is(public.place_chapter_on_board('c195cccc', '', '{c195bbbb,c195cccc,c195aaaa}', true) ->> 'outcome',
  'ok', 'once confirmed, the move saves');
select is(public.place_chapter_on_board('c195aaaa', '', '{c195aaaa,c195bbbb}', true) ->> 'outcome',
  'wrong_list', 'a list missing a chapter is refused: the board was out of date');
select is(pg_temp.refusal($$ select public.place_chapter_on_board('c195aaaa', pg_temp.other_act(),
  '{c195bbbb,c195cccc,c195aaaa}', true) $$), '23514:other_story', 'an act of another story is refused');

/* ---------- 4. "Add chapter" on an act ---------- */

-- Put chapter one first, in Act I: the book is aaaa (Act I), bbbb (Act II), cccc (no act).
select public.place_chapter_on_board('c195aaaa', pg_temp.act(1), '{c195aaaa,c195bbbb,c195cccc}', true);
insert into added select 'act-one', public.add_chapter_to_act('statia-meteo-seed01', pg_temp.act(1)) ->> 'code';
select is(pg_temp.book_order(), 'c195aaaa,' || (select code from added where label = 'act-one') || ',c195bbbb,c195cccc',
  'a chapter added to Act I goes after Act I''s last chapter, the rest moving down');
insert into added select 'act-three', public.add_chapter_to_act('statia-meteo-seed01', pg_temp.act(3)) ->> 'code';
select is(pg_temp.place_of((select code from added where label = 'act-three')), 4,
  'a chapter added to an empty act goes after the earlier acts'' chapters');
select is((public.add_chapter_to_act('statia-meteo-seed01', '') ->> 'position')::integer, 6,
  'a chapter added to "No act" goes at the end of the book');

/* ---------- 5. Nobody else ---------- */

select ok(public.story_storyline('statia-meteo-seed01')::text !~ '00000000-0000-4000-8000-000000000001',
  'story_storyline() never carries the writer''s user ID (rule 15)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.story_events), 0,
  'denied: story_events_select_own: another member reads none of the writer''s events');
select is((public.story_storyline('statia-meteo-seed01') ->> 'outcome')
    || (public.place_chapter_on_board('c195aaaa', '', '{c195aaaa}', true) ->> 'outcome')
    || (public.update_story_event((select id from named where label = 'war'), '{"title": "Al meu"}') ->> 'outcome'),
  'not_foundnot_foundnot_found', 'another member can''t read the storyline, move a chapter or change an event');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select is(public.place_chapter_on_board('c195aaaa', '', '{c195aaaa}', true) ->> 'outcome', 'not_active',
  'a suspended writer can''t change the order readers see');
reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.story_storyline('statia-meteo-seed01') $$), '42501',
  'signed out, nobody can read a storyline');

select * from finish();

rollback;
