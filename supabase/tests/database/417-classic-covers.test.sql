-- Database tests for classic covers (Robert, 26 Nov 2026: every classic a plain solid Label
-- cover, except The Raven, Luceafărul and Goblin Market, which keep their artwork).
-- What it proves:
-- - a new classic with an automatic or drawn cover is saved as a solid colour Label, the same
--   colour for the same ID, and always one of the ten classic colours;
-- - the three classics with artwork get their backdrop design;
-- - anyone else's story is refused the classic-only designs and colours, on insert and update,
--   while the writer's own colours still save.
-- Test data: the seed persona "teacher" stands in for the classics account (the setting is
-- pointed at it inside this transaction, which is rolled back); adult_writer is everyone else.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- The SQLSTATE and hint a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  raised_state text;
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_state = returned_sqlstate, raised_hint = pg_exception_hint;
  return raised_state || ' ' || coalesce(raised_hint, '');
end;
$$;

update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';

-- Three classics by teacher (automatic, drawn, and The Raven by its slug) and
-- one story by adult_writer with a writer's own drawn cover.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  cover_kind, cover_design, cover_background, cover_accent)
values
  ('00000000-0000-4000-9417-000000000001', '00000000-0000-4000-8000-000000000007', 'cc1',
   'Clasic unu', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages',
   'automatic', null, null, null),
  ('00000000-0000-4000-9417-000000000002', '00000000-0000-4000-8000-000000000007', 'cc2',
   'Clasic doi', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages',
   'drawn', 'sparkles', 'gold', 'plum'),
  ('00000000-0000-4000-9417-000000000003', '00000000-0000-4000-8000-000000000007',
   'the-raven-classic', 'The Raven', 'en', (select id from public.categories where slug = 'fiction'),
   'all_ages', 'automatic', null, null, null),
  ('00000000-0000-4000-9417-000000000005', '00000000-0000-4000-8000-000000000001', 'my-own',
   'Al meu', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages',
   'drawn', 'stripes', 'plum', 'gold');

/* ---------- 1. New classics ---------- */

select is(
  (select cover_kind::text || ' ' || cover_style::text || ' ' || cover_accent
   from public.stories where slug = 'cc1'),
  'drawn label paper',
  'a new classic with an automatic cover is saved as a drawn Label cover');

select ok(
  (select cover_design = cover_background
     and cover_design = public.classic_cover_colour(id)
   from public.stories where slug = 'cc1'),
  'its design and background are the solid colour its ID picks');

select is(
  (select cover_design from public.stories where slug = 'cc2'),
  public.classic_cover_colour('00000000-0000-4000-9417-000000000002'),
  'a new classic with a drawn pattern becomes its solid colour too');

select is(
  (select cover_design || ' ' || cover_background from public.stories where slug = 'the-raven-classic'),
  'classic_the_raven plum',
  'The Raven keeps its artwork backdrop, with plum underneath');

select ok(
  (select bool_and(public.classic_cover_colour(gen_random_uuid()) = any (array['plum', 'violet',
     'ink', 'gold', 'crimson', 'seaglass', 'peach', 'pistachio', 'candy', 'linkblue']))
   from generate_series(1, 200)),
  'the colour is always one of the ten classic colours');

select is(
  public.classic_cover_colour('00000000-0000-4000-9417-000000000001'),
  public.classic_cover_colour('00000000-0000-4000-9417-000000000001'),
  'the same ID always picks the same colour');

/* ---------- 2. What the rule leaves alone ---------- */

select is(
  (select cover_design from public.stories where slug = 'my-own'),
  'stripes',
  'a writer''s own story keeps the cover the writer chose');

select is(
  public.classic_cover_design('some-other-classic'),
  null,
  'a classic without artwork gets no backdrop design');

/* ---------- 3. Classic-only covers are refused on other stories ---------- */

select is(
  pg_temp.refusal($$update public.stories set cover_design = 'crimson', cover_background = 'crimson'
    where slug = 'my-own'$$),
  '23514 classic_cover_only',
  'a writer''s story is refused a classic-only colour');

select is(
  pg_temp.refusal($$insert into public.stories (user_id, slug, title, language_code, category_id,
    rating, cover_kind, cover_design, cover_background, cover_accent) values
    ('00000000-0000-4000-8000-000000000001', 'my-raven', 'Corb', 'ro',
     (select id from public.categories where slug = 'fiction'), 'all_ages', 'drawn',
     'classic_the_raven', 'plum', 'paper')$$),
  '23514 classic_cover_only',
  'a writer''s new story is refused a classic artwork design');

select is(
  pg_temp.refusal($$update public.stories set cover_design = 'plum', cover_background = 'plum',
    cover_accent = 'gold' where slug = 'my-own'$$),
  null,
  'a writer''s story still saves a colour from the writer''s palette');

select * from finish();
rollback;
