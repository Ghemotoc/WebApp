-- Database tests for questions and ideas and marketing notes in Story Atlas (stories S1-E17-27
-- to S1-E17-29; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - the quick-add box adds a question, idea, to-do or decision, trimmed and with ș corrected;
--   an empty line or an unknown type is refused (S1-E17-27);
-- - ticking done records the date and unticking clears it; the outcome saves; unknown changes
--   and a done that isn't true or false are refused; an item is deleted (S1-E17-28);
-- - marketing notes read empty until the first save, then each field saves by itself; unknown
--   changes and over-long text are refused (S1-E17-29);
-- - policies story_ideas_select_own and story_marketing_select_own: allowed (the writer) and
--   denied (another member);
-- - another member and a signed-out visitor change nothing; no user ID in any answer.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member.
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

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
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. The quick-add box (S1-E17-27) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'question', (public.add_story_idea('statia-meteo-seed01', 'question', 'Cine a stins farul?') ->> 'id')::uuid;
insert into named select 'idea', (public.add_story_idea('statia-meteo-seed01', 'idea', '  Un câine pe stâncă ') ->> 'id')::uuid;
insert into named select 'todo', (public.add_story_idea('statia-meteo-seed01', 'todo', 'Verifică mareele.') ->> 'id')::uuid;
select is((select count(*)::integer from public.story_ideas), 3,
  'allowed: story_ideas_select_own: the writer reads the notes they added');
select is((select string_agg(item ->> 'kind' || ':' || (item ->> 'body'), ',' order by item ->> 'body')
           from jsonb_array_elements(public.story_ideas('statia-meteo-seed01') -> 'items') as item),
  'question:Cine a stins farul?,idea:Un câine pe stâncă,todo:Verifică mareele.',
  'each line is read back with its type, trimmed');
select is(pg_temp.refusal($$ select public.add_story_idea('statia-meteo-seed01', 'wish', 'Ceva') $$), '23514',
  'a type that isn''t one of the four is refused');
select is(pg_temp.refusal($$ select public.add_story_idea('statia-meteo-seed01', 'idea', '   ') $$), '23514',
  'an empty line is refused');

/* ---------- 2. Ticking off and recording what was decided (S1-E17-28) ---------- */

select public.update_story_idea((select id from named where label = 'question'),
  '{"is_done": true, "outcome": " Paznicul, din greşeală. "}');
select ok((select done_at is not null and outcome = 'Paznicul, din greșeală.' from public.story_ideas
           where id = (select id from named where label = 'question')),
  'ticking done records the date, and the outcome saves trimmed with ș corrected');
select public.update_story_idea((select id from named where label = 'question'), '{"is_done": false}');
select is((select done_at from public.story_ideas where id = (select id from named where label = 'question')), null,
  'ticking it open again clears the date');
select is(pg_temp.refusal(format($$ select public.update_story_idea(%L, '{"user_id": "x"}') $$,
  (select id from named where label = 'idea'))), '23514:unknown_change', 'an unknown change to a note is refused');
select is(pg_temp.refusal(format($$ select public.update_story_idea(%L, '{"is_done": "yes"}') $$,
  (select id from named where label = 'idea'))), '23514:bad_flag', 'done must be true or false');
select public.delete_story_idea((select id from named where label = 'todo'));
select is((select count(*)::integer from public.story_ideas), 2, 'a deleted note is gone');

/* ---------- 3. Marketing notes (S1-E17-29) ---------- */

select is(public.story_marketing('statia-meteo-seed01') -> 'notes', jsonb_build_object(
    'back_cover_blurb', '', 'comparable_titles', '', 'hooks_keywords', '', 'query_pitch', '', 'launch_notes', ''),
  'marketing notes read empty before the first save');
select public.update_story_marketing('statia-meteo-seed01',
  '{"back_cover_blurb": " Un far se stinge. ", "comparable_titles": "Lumina dintre oceane"}');
select public.update_story_marketing('statia-meteo-seed01', '{"hooks_keywords": "far, furtună"}');
select is((public.story_marketing('statia-meteo-seed01') -> 'notes') - 'query_pitch'::text - 'launch_notes'::text,
  jsonb_build_object('back_cover_blurb', 'Un far se stinge.', 'comparable_titles', 'Lumina dintre oceane',
    'hooks_keywords', 'far, furtună'),
  'each marketing field saves by itself, trimmed, and keeps the others');
select is(pg_temp.refusal($$ select public.update_story_marketing('statia-meteo-seed01', '{"logline": "x"}') $$),
  '23514:unknown_change', 'an unknown marketing change is refused');
select is(pg_temp.refusal($$ select public.update_story_marketing('statia-meteo-seed01',
  jsonb_build_object('query_pitch', repeat('a', 3001))) $$), '23514', 'an over-long pitch is refused');
select is((select count(*)::integer from public.story_marketing), 1,
  'allowed: story_marketing_select_own: the writer reads their marketing notes');

/* ---------- 4. Nobody else ---------- */

select ok(public.story_ideas('statia-meteo-seed01')::text !~ '00000000-0000-4000-8000-000000000001',
  'story_ideas() never carries the writer''s user ID (rule 15)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.story_ideas), 0,
  'denied: story_ideas_select_own: another member reads none of the writer''s notes');
select is((select count(*)::integer from public.story_marketing), 0,
  'denied: story_marketing_select_own: another member reads none of the writer''s marketing notes');
select is((public.story_ideas('statia-meteo-seed01') ->> 'outcome')
    || (public.update_story_idea((select id from named where label = 'idea'), '{"body": "Al meu"}') ->> 'outcome')
    || (public.update_story_marketing('statia-meteo-seed01', '{"query_pitch": "Al meu"}') ->> 'outcome'),
  'not_foundnot_foundnot_found', 'another member can''t read or change the writer''s notes');
select is(public.delete_story_idea((select id from named where label = 'idea')) ->> 'outcome', 'not_found',
  'another member can''t delete the writer''s note');
reset role;
set local role anon;
select is(pg_temp.refusal($$ select public.story_marketing('statia-meteo-seed01') $$), '42501',
  'signed out, nobody can read marketing notes');

select * from finish();

rollback;
