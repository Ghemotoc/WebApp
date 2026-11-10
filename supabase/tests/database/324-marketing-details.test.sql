-- Database tests for a writer's own marketing details (bundle GAPS-2b; CLAUDE.md rule 1).
-- What it proves:
-- - a writer adds a detail, story_marketing() lists it in the order added, with its name trimmed
--   and no text yet;
-- - a detail never takes another detail's name, capitals aside, though it may change its own
--   capitals (break test, 10 Nov 2026);
-- - a detail's name and text change one at a time; an empty name, an over-long text and an
--   unknown change are refused;
-- - search finds a detail by its text, as one result named by the detail, and no longer offers the
--   list itself as a note;
-- - a detail is deleted and the others keep their order;
-- - at most 12 details;
-- - another writer can't add, change or delete, and a visitor can't call the functions.
-- Personas: adult_writer (…01, owns the seed story …9000-…01), teen_17 (…02).
-- Test data: details in adult_writer's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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
-- The seed story's address; its details as "name=text" in order; one detail's ID by its name.
create function pg_temp.slug() returns text language sql as $$
  select slug from public.stories where id = '00000000-0000-4000-9000-000000000001';
$$;
create function pg_temp.details() returns text language sql as $$
  select coalesce(string_agg((detail ->> 'name') || '=' || (detail ->> 'text'), '; ' order by place), '')
  from jsonb_array_elements(public.story_marketing(pg_temp.slug()) -> 'own_details')
    with ordinality as listed(detail, place);
$$;
create function pg_temp.detail_id(detail_name text) returns text language sql as $$
  select detail ->> 'id'
  from jsonb_array_elements(public.story_marketing(pg_temp.slug()) -> 'own_details') as detail
  where detail ->> 'name' = detail_name;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Adding a detail ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

select is(pg_temp.details(), '', 'a story starts with no details of the writer''s own');
select is(public.add_marketing_detail(pg_temp.slug(), '  Newsletter ') ->> 'outcome', 'ok',
  'a writer adds a marketing detail');
select public.add_marketing_detail(pg_temp.slug(), 'Reading dates');
select is(pg_temp.details(), 'Newsletter=; Reading dates=',
  'the details come in the order added, names trimmed, with no text yet');
select is(pg_temp.refusal(format('select public.add_marketing_detail(%L, %L)', pg_temp.slug(), '  ')),
  '23514:name_length', 'a detail with an empty name is refused');
select is(pg_temp.refusal(format('select public.add_marketing_detail(%L, %L)', pg_temp.slug(), ' NEWSLETTER ')),
  '23514:name_taken', 'a detail with another detail''s name is refused, capitals aside (break test, 10 Nov 2026)');
select is(pg_temp.refusal(format('select public.update_marketing_detail(%L, %L, %L)', pg_temp.slug(),
    pg_temp.detail_id('Reading dates'), '{"name": "newsletter"}')),
  '23514:name_taken', 'a detail can''t take another detail''s name');
select is(public.update_marketing_detail(pg_temp.slug(), pg_temp.detail_id('Reading dates'),
    '{"name": "Reading Dates"}') ->> 'outcome', 'ok', 'a detail may change its own capitals');
select public.update_marketing_detail(pg_temp.slug(), pg_temp.detail_id('Reading Dates'), '{"name": "Reading dates"}');

/* ---------- 2. Changing a detail ---------- */

select is(public.update_marketing_detail(pg_temp.slug(), pg_temp.detail_id('Newsletter'),
    '{"text": "Send the zeppelin chapter on Friday."}') ->> 'outcome', 'ok',
  'a writer saves a detail''s text');
select is(public.update_marketing_detail(pg_temp.slug(), pg_temp.detail_id('Reading dates'),
    '{"name": "Readings"}') ->> 'outcome', 'ok', 'a writer renames a detail');
select is(pg_temp.details(), 'Newsletter=Send the zeppelin chapter on Friday.; Readings=',
  'each change touches only its own part, and the order stays');
select is(pg_temp.refusal(format('select public.update_marketing_detail(%L, %L, %L)', pg_temp.slug(),
    pg_temp.detail_id('Readings'), '{"name": " "}')), '23514:name_length',
  'renaming a detail to nothing is refused');
select is(pg_temp.refusal(format('select public.update_marketing_detail(%L, %L, %L)', pg_temp.slug(),
    pg_temp.detail_id('Readings'), jsonb_build_object('text', repeat('a', 5001)))), '23514:text_length',
  'a text over 5,000 characters is refused');
select is(pg_temp.refusal(format('select public.update_marketing_detail(%L, %L, %L)', pg_temp.slug(),
    pg_temp.detail_id('Readings'), '{"id": "x"}')), '23514:unknown_change',
  'an unknown change is refused');
select is(public.update_marketing_detail(pg_temp.slug(), 'no-such-detail', '{"text": "x"}') ->> 'outcome',
  'not_found', 'a detail the story does not have is not found');

/* ---------- 3. Search ---------- */

select is(
  (select jsonb_agg(jsonb_build_object('kind', result ->> 'kind', 'title', result ->> 'title',
      'ref', result ->> 'ref'))
   from jsonb_array_elements(public.search_story(pg_temp.slug(), 'zeppelin') -> 'results') as result),
  jsonb_build_array(jsonb_build_object('kind', 'marketing', 'title', 'Newsletter',
    'ref', 'detail-' || pg_temp.detail_id('Newsletter'))),
  'search finds a detail by its text, as one result named by the detail');
select is(
  (select count(*) from jsonb_array_elements(public.search_story(pg_temp.slug(), 'Readings') -> 'results') as result
   where result ->> 'ref' = 'own_details'),
  0::bigint, 'the list of details is not offered as a note of its own');

/* ---------- 4. Deleting a detail ---------- */

select public.add_marketing_detail(pg_temp.slug(), 'Agents');
select is(public.delete_marketing_detail(pg_temp.slug(), pg_temp.detail_id('Readings')) ->> 'outcome', 'ok',
  'a writer deletes a detail');
select is(pg_temp.details(), 'Newsletter=Send the zeppelin chapter on Friday.; Agents=',
  'the others keep their order');

/* ---------- 5. At most 12 details ---------- */

select public.add_marketing_detail(pg_temp.slug(), 'Extra ' || number) from generate_series(1, 10) as number;
select is(pg_temp.refusal(format('select public.add_marketing_detail(%L, %L)', pg_temp.slug(), 'One too many')),
  '23514:too_many_details', 'a 13th detail is refused');

/* ---------- 6. Somebody else and visitors ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');

select is(public.add_marketing_detail(pg_temp.slug(), 'Mine now') ->> 'outcome', 'not_found',
  'another writer can''t add a detail to the story');
select is(public.delete_marketing_detail(pg_temp.slug(), 'anything') ->> 'outcome', 'not_found',
  'another writer can''t delete a detail');

select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);

select is(pg_temp.refusal($$select public.add_marketing_detail('a-story', 'Visitor')$$), '42501',
  'a visitor can''t add a detail');

select * from finish();
rollback;
