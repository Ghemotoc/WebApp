-- Database tests for the ad slots and how the server fills them (story S1-E12-01; bundle
-- SPONSORS-a1).
-- What it proves:
-- - anyone can read the slot catalogue, and nobody writes to it directly (ad_slots_select_all,
--   allowed and denied);
-- - a page never has more than two slots;
-- - every slot of a public page is filled, never with the same ad twice, and a live landing page
--   of ours comes first;
-- - the choice uses only the page's context: a signed-out visitor and a signed-in reader get the
--   same ads, and "Why this ad?" echoes only category, tag and language;
-- - a class space, a class-only story and an unknown page get no slot (Q70).
-- Personas: adult_writer (…01), teen_17 (…02), teacher (…07).
-- Test data: a live landing page and a class space with one class-only story, made here; rolled
-- back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- What the anonymous and signed-in calls return, to compare them.
create temporary table kept (label text primary key, words jsonb) on commit drop;
grant all on kept to authenticated, anon;

-- No other live landing page, so the test knows which house ad comes first.
update public.landing_pages set archived_at = now() where archived_at is null;
with page as (
  insert into public.landing_pages (slug, page_type) values ('pagina-reclama', 'information') returning id
)
insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
  '{"id": "h", "kind": "hero", "ro": {"title": "Atelier de toamnă", "intro": ""}, "en": {"title": "Autumn workshop", "intro": ""}}'::jsonb)),
  public.romania_today(), now()
from page;

-- A class space, and a story shared only with a class (adult_writer's second seed story).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa reclame', 'Cercul clasei.', 'Fii amabil.');
reset role;
-- The story becomes class-only; its address is kept for the check below.
with shared as (
  update public.stories set class_only = true
  where id = '00000000-0000-4000-9000-000000000002'
  returning slug
)
insert into kept (label, words) select 'class_story', to_jsonb(shared.slug) from shared;

/* ---------- 1. The catalogue (policy ad_slots_select_all) ---------- */

select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select ok((select count(*) from public.ad_slots) >= 16, 'allowed: ad_slots_select_all (a signed-out visitor can read the slot catalogue)');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into public.ad_slots (slot_key, page_key, position, format) values ('extra_slot', 'discover', 2, 'wide') $$,
  '42501', null, 'denied: ad_slots_select_all (it only reads: nobody adds a slot directly)');

reset role;
select throws_ok($$ insert into public.ad_slots (slot_key, page_key, position, format) values ('third_slot', 'discover', 3, 'wide') $$,
  '23514', null, 'a page never has a third slot');
select throws_ok($$ insert into public.ad_slots (slot_key, page_key, position, format) values ('second_wide', 'discover', 1, 'wide') $$,
  '23505', null, 'nor two slots in one position');

/* ---------- 2. Filling a page ---------- */

select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
insert into kept values ('anon', public.page_ads('discover', '{"category": "fiction", "language": "ro"}'));
select is(jsonb_array_length((select words from kept where label = 'anon')), 2, 'Discover has its two slots');
select ok(
  (select words -> 0 -> 'ad' ->> 'key' <> words -> 1 -> 'ad' ->> 'key' from kept where label = 'anon'),
  'the two slots never show the same ad');
select is(
  (select words -> 0 -> 'ad' ->> 'key' || ' ' || (words -> 0 -> 'ad' ->> 'label') || ' ' || (words -> 0 -> 'ad' ->> 'title_en')
   from kept where label = 'anon'),
  'landing:pagina-reclama house Autumn workshop',
  'our live landing page fills the first slot as a house ad');
select ok(
  not exists (select 1 from jsonb_array_elements(public.page_ads('classics')) as slot
              where slot -> 'ad' ->> 'key' = 'house:classics'),
  'the classics page never advertises the classics');

/* ---------- 3. Only the page's context (criterion 2) ---------- */

reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.page_ads('discover', '{"category": "fiction", "language": "ro"}'),
  (select words from kept where label = 'anon'),
  'a signed-in teenager gets exactly what a signed-out visitor gets');
select is(
  public.page_ads('chapter', '{"category": "fiction", "tag": "mister", "language": "ro", "reader": "x", "age": 15}') -> 0 -> 'matched',
  '{"category": "fiction", "tag": "mister", "language": "ro"}'::jsonb,
  '"Why this ad?" shows only the category, tag and language');

/* ---------- 4. Where there is never an ad (criterion 4, Q70) ---------- */

select is(public.page_ads('space', '{"space_slug": "clasa-reclame"}'), '[]'::jsonb, 'a class space has no slot');
select is(public.page_ads('story', jsonb_build_object('story_slug', (select words #>> '{}' from kept where label = 'class_story'))), '[]'::jsonb,
  'a story shared only with a class has no slot');
select is(public.page_ads('settings'), '[]'::jsonb, 'a page that isn''t public has no slot');

select * from finish();
rollback;
