-- Database tests for the landing page hero of board A10 (BOOKS-A10, user story 1.10).
-- What it proves:
-- - a hero's new fields have limits (the kicker, the violet second line and the two buttons);
-- - a hero with a button needs a safe link; a hero without one doesn't;
-- - landing_words_this_month() says nothing under five writers and gives the total from five,
--   and visitors may call it but never read writing_days themselves.
-- Personas: five seeded profiles write this month. Test data: rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Step 1: the hero's text rules.
select is(
  (select longest from public.landing_block_field_rules() where block_kind = 'hero' and field_name = 'title_accent'),
  80, 'the title''s second line holds up to 80 characters');
select is(
  (select longest from public.landing_block_field_rules() where block_kind = 'hero' and field_name = 'button_label'),
  40, 'a hero button holds up to 40 characters');

-- Step 2: a hero's link, only when it has a button.
select is(public.landing_block_extra_problems(
  '{"kind": "hero", "ro": {"title": "T"}, "en": {"title": "T"}}'::jsonb, 'blocks.0'),
  '{}'::text[], 'a hero without a button needs no link');
select is(public.landing_block_extra_problems(
  '{"kind": "hero", "ro": {"button_label": "Intră"}, "en": {"button_label": "Join"}, "link": ""}'::jsonb, 'blocks.0'),
  array['blocks.0.link:empty'], 'a hero with a button and no link can''t be published');
select is(public.landing_block_extra_problems(
  '{"kind": "hero", "ro": {}, "en": {"member_button_label": "Join"}, "link": "//elsewhere.example"}'::jsonb, 'blocks.0'),
  array['blocks.0.link:bad_link'], 'a hero''s link to another site through "//" is refused');
select is(public.landing_block_extra_problems(
  '{"kind": "hero", "ro": {"button_label": "Intră"}, "en": {"button_label": "Join"}, "link": "/hub"}'::jsonb, 'blocks.0'),
  '{}'::text[], 'a hero with a button and one of our pages is fine');

-- Step 3: the live count. Start from an empty month so seeded rows don't count.
delete from public.writing_days where day >= date_trunc('month', public.romania_today())::date;
insert into public.writing_days (user_id, day, words)
select id, public.romania_today(), 1000 from public.profiles order by id limit 4;
select is(public.landing_words_this_month(), null::bigint,
  'with four writers this month the live count says nothing');
insert into public.writing_days (user_id, day, words)
select id, public.romania_today(), 1000 from public.profiles order by id offset 4 limit 1;
select is(public.landing_words_this_month(), 5000::bigint,
  'from five writers the live count is the month''s total');

-- Step 4: a visitor can ask for the total, but can't read the rows behind it.
set local role anon;
select throws_ok('select count(*) from public.writing_days', '42501', null,
  'a visitor can''t read writing_days');
reset role;

select * from finish();
rollback;
