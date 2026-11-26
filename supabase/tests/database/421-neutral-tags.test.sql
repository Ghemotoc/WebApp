-- Database tests for neutral tags (story S1-E3-01; Robert, 26 Nov 2026: "from tags, remove
-- setting Romania. Keep only neutral tags", since "Set in" holds the country).
-- What it proves:
-- - no recommended tag names a place ("set in <place>"), so the tag box and onboarding never
--   suggest one;
-- - "Set in Romania" stays an approved tag, so a story that carries it keeps its tag page;
-- - the seed stories say where they take place in "Set in", not with a tag.
-- No new table or policy. Test data: none added.
begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

select is_empty(
  $$ select name from public.tags where is_recommended and normalised_name ~ '^set in ' $$,
  'no recommended tag names a place');
select ok((select count(*) from public.tags where is_recommended and status = 'approved') >= 40,
  'the neutral recommended tags are all still there');
select is((select status::text from public.tags where normalised_name = 'set in romania'), 'approved',
  '"Set in Romania" stays an approved tag, so a story that carries it loses nothing');
select is(
  (select set_in_countries from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  array['RO'], 'a seed story says it is set in Romania through "Set in", not a tag');

select * from finish();
rollback;
