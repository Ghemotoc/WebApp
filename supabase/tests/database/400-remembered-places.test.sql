-- Database tests for remembered places (design books review, item 17, "Don't start from zero").
-- What it proves:
-- - remembered_places is readable by its owner only (allowed and denied tests for its policy);
-- - a signed-out visitor can't keep a place, and the table can't be written directly;
-- - the first save creates the row, a later save for the same story replaces it, and another
--   kind or story gets a row of its own;
-- - an empty key and an oversized place are refused;
-- - Download my data includes the table and deleting the account deletes it.
-- Test data: teen_17 and adult_writer's places; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Saving ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.remember_place('atlas_section', 'some-story', '{"section": "characters"}') $$),
  '42501', 'a signed-out visitor can''t keep a place in the account');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select lives_ok($$ select public.remember_place('atlas_section', 'some-story', '{"section": "characters"}') $$,
  'a writer keeps the Atlas section they had open');
select lives_ok($$ select public.remember_place('atlas_section', 'some-story', '{"section": "storyline"}') $$,
  'opening another section replaces it');
select lives_ok($$ select public.remember_place('write_caret', 'some-story', '{"chapterCode": "abcd1234", "position": 42}') $$,
  'the caret in Write is kept beside it');
select is((select count(*)::integer from public.remembered_places), 2,
  'one row per kind and story: the section was replaced, the caret has its own row');
select is((select place ->> 'section' from public.remembered_places where kind = 'atlas_section'), 'storyline',
  'the writer reads back the section they opened last');
select is(pg_temp.refusal($$ select public.remember_place('atlas_hint', '', '{"visits": 1}') $$), '23514',
  'an empty key is refused');
select is(pg_temp.refusal($$ select public.remember_place('write_caret', 'some-story',
  jsonb_build_object('padding', repeat('x', 3000))) $$), '23514',
  'a place over 2 KB is refused, so the table can''t be used as storage');
select is(pg_temp.refusal($$ update public.remembered_places set place = '{}' $$), '42501',
  'the table can''t be written directly, only through remember_place()');

/* ---------- 2. Reading (remembered_places_select_own) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.remembered_places), 0,
  'denied: another person sees none of the reader''s places');
select lives_ok($$ select public.remember_place('story_edition', 'some-story', '{"slug": "some-story-en"}') $$,
  'allowed: a second person keeps a place of their own');
select is((select count(*)::integer from public.remembered_places), 1,
  'allowed: each person reads only their own places');

/* ---------- 3. The account registries ---------- */

reset role;
select is((select is_included::text || ' ' || action
  from public.data_export_tables() as exported
  join public.account_deletion_rules() as deleted using (table_name)
  where table_name = 'remembered_places'), 'true delete',
  'Download my data includes the places, and deleting the account deletes them');

select * from finish();
rollback;
