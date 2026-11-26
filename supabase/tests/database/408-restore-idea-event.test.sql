-- Database tests for Undo after deleting a note or a timeline event (user stories bundle 6,
-- stories 6.10 and 6.12; design books item 14, "Undo").
-- What it proves:
-- - delete_story_idea() and delete_story_event() hand back the removed row without user_id or
--   story_id;
-- - restore_story_idea() puts a ticked note back with the same id, outcome and "Done on" date;
-- - restore_story_event() puts an event back with the same id, "Keep private" and the chapter it
--   waits for, and without that chapter once the chapter is deleted;
-- - a second Undo changes nothing;
-- - another member can't restore either into the writer's story, nor can a visitor.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member.
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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

create temporary table named (label text primary key, id uuid, removed jsonb) on commit drop;
grant all on named to anon, authenticated;

-- The writer's story has one published chapter that an event can wait for.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                             published_title, published_body, first_published_at, last_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c408aaaa', 1,
        'Unu', 'Unu.', 'published', 'Unu', 'Unu.', now(), now());

-- adult_writer's notes and timeline: a ticked question with an outcome, a private event that
-- waits for chapter one.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named (label, id) values
  ('idea', (public.add_story_idea('statia-meteo-seed01', 'question', 'Cine a completat caietul?') ->> 'id')::uuid),
  ('event', (public.add_story_event('statia-meteo-seed01', 'Furtuna', 'Iulie 1971', 1971.5, 'Prima notă.') ->> 'id')::uuid);
select public.update_story_idea((select id from named where label = 'idea'),
  '{"is_done": true, "outcome": "Bunica, cu o zi înainte."}'::jsonb);
select public.set_plan_item_privacy((select id from named where label = 'event'), true);
select public.set_plan_item_show_from((select id from named where label = 'event'), 'c408aaaa');
create temporary table kept on commit drop as
  select (select done_at from public.story_ideas where id = (select id from named where label = 'idea')) as done_at;

/* ---------- 1. The deletes hand the rows back ---------- */

update named set removed = public.delete_story_idea(id) -> 'idea' where label = 'idea';
update named set removed = public.delete_story_event(id) -> 'event' where label = 'event';
select is((select removed ->> 'id' from named where label = 'idea'),
  (select id::text from named where label = 'idea'), 'the note''s delete hands back the removed row');
select is((select removed ->> 'id' from named where label = 'event'),
  (select id::text from named where label = 'event'), 'the event''s delete hands back the removed row');
select ok((select bool_and(not (removed ? 'user_id') and not (removed ? 'story_id')) from named),
  'without the owner''s id or the story''s id');

/* ---------- 2. Others can't put them back ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.restore_story_idea('statia-meteo-seed01', (select removed from named where label = 'idea')) ->> 'outcome',
  'not_found', 'denied: another member can''t restore a note into the writer''s story');
select is(public.restore_story_event('statia-meteo-seed01', (select removed from named where label = 'event')) ->> 'outcome',
  'not_found', 'denied: another member can''t restore an event into the writer''s story');
set local role anon;
select is(pg_temp.refusal($$ select public.restore_story_idea('statia-meteo-seed01', '{}'::jsonb) $$), '42501',
  'denied: a visitor can''t restore a note');
select is(pg_temp.refusal($$ select public.restore_story_event('statia-meteo-seed01', '{}'::jsonb) $$), '42501',
  'denied: a visitor can''t restore an event');

/* ---------- 3. The writer's Undo ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.restore_story_idea('statia-meteo-seed01', (select removed from named where label = 'idea')) ->> 'outcome',
  'ok', 'allowed: the writer puts the note back');
select is((select row(id, kind, outcome, done_at)::text from public.story_ideas
           where id = (select id from named where label = 'idea')),
  row((select id from named where label = 'idea'), 'question', 'Bunica, cu o zi înainte.',
      (select done_at from kept))::text,
  'with the same id, type, outcome and "Done on" date');
select is(public.restore_story_idea('statia-meteo-seed01', (select removed from named where label = 'idea')) ->> 'outcome',
  'ok', 'a second Undo of the note changes nothing');
select is((select count(*)::integer from public.story_ideas
           where story_id = '00000000-0000-4000-9000-000000000001' and body = 'Cine a completat caietul?'), 1,
  'and leaves one note');

select is(public.restore_story_event('statia-meteo-seed01', (select removed from named where label = 'event')) ->> 'outcome',
  'ok', 'allowed: the writer puts the event back');
select is((select row(id, title, is_private, show_from_chapter_id)::text from public.story_events
           where id = (select id from named where label = 'event')),
  row((select id from named where label = 'event'), 'Furtuna', true,
      (select id from public.chapters where code = 'c408aaaa'))::text,
  'with the same id, "Keep private" and the chapter it waits for');

-- Deleted again, and its chapter deleted meanwhile: the event comes back without the chapter.
select public.delete_story_event((select id from named where label = 'event'));
reset role;
update public.chapters set deleted_at = now() where code = 'c408aaaa';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.restore_story_event('statia-meteo-seed01', (select removed from named where label = 'event'));
select is((select show_from_chapter_id from public.story_events where id = (select id from named where label = 'event')),
  null, 'an event whose chapter was deleted comes back without it');

select * from finish();
rollback;
