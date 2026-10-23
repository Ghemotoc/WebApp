-- Staging top-up for story S1-E3-01 (Create a story), 23 Oct 2026.
--
-- What it adds: the three seed stories and their tags from supabase/seed.sql (two for
-- adult_writer, one for teen_17), on a staging database that was seeded before this story.
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only the fixed seed story
-- IDs, and is safe to run twice (stories that exist are skipped; tags are replaced with the same).
-- How to check it worked: the last query should show seed_stories 3.
begin;

insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id,
  cover_kind, cover_design, cover_background, cover_accent)
select seed.id::uuid, seed.user_id::uuid, seed.slug, seed.title, seed.blurb, seed.language_code,
  (select id from public.categories where slug = seed.category_slug),
  seed.cover_kind::public.cover_kind, seed.cover_design, seed.cover_background, seed.cover_accent
from (values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   'statia-meteo-seed01', 'Stația meteo',
   'Bunica mea notează vremea în fiecare dimineață din 1971. În ziua în care a ajuns la spital, am găsit restul săptămânii deja completat.',
   'ro', 'fiction', 'drawn', 'waves', 'sky', 'violet'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
   'the-girl-who-fixed-radios-seed02', 'The Girl Who Fixed Radios',
   'Ana spends her summer in her grandfather’s repair shop in Ploiești. One old radio keeps picking up a station that stopped broadcasting in 1989, and tonight it said her name.',
   'en', 'fiction', 'automatic', null, null, null),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002',
   'scrisori-din-cutia-postala-seed03', 'Scrisori din cutia poștală',
   'Poeme scurte despre un bloc din Brașov și oamenii care trec prin el.',
   'ro', 'poetry', 'drawn', 'dots', 'lilac', 'violet')
) as seed (id, user_id, slug, title, blurb, language_code, category_slug, cover_kind, cover_design, cover_background, cover_accent)
where not exists (select 1 from public.stories where stories.id = seed.id::uuid);

select public.set_story_tags('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
  array['bunici', 'familie', 'set in Romania']);
select public.set_story_tags('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
  array['mystery', 'set in Romania', 'family']);
select public.set_story_tags('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002',
  array['oraș', 'vecini']);

select count(*) as seed_stories from public.stories where slug like '%-seed0_';

commit;
