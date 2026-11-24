-- Database tests for the brand page's three cover patterns (design books, covers part 2;
-- Robert, 23 Nov 2026, and his pick of the writer's accent colour, 24 Nov 2026).
-- What it proves: a drawn cover may use blushdots, skylines and goldgrid with palette colours
-- (allowed), and a design key the app can't draw is still refused (denied).
-- Seed story …9000…01 belongs to adult_writer. Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select lives_ok(
  $$update public.stories set cover_kind = 'drawn', cover_design = 'blushdots',
      cover_background = 'blush', cover_accent = 'plum'
    where id = '00000000-0000-4000-9000-000000000001'$$,
  'a drawn cover can use Blush dots'
);
select lives_ok(
  $$update public.stories set cover_design = 'skylines', cover_background = 'sky', cover_accent = 'violet'
    where id = '00000000-0000-4000-9000-000000000001'$$,
  'a drawn cover can use Sky lines'
);
select lives_ok(
  $$update public.stories set cover_design = 'goldgrid', cover_background = 'gold', cover_accent = 'paper'
    where id = '00000000-0000-4000-9000-000000000001'$$,
  'a drawn cover can use Gold grid'
);
select is(
  (select cover_design from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'goldgrid',
  'the story now has the Gold grid cover'
);
select throws_ok(
  $$update public.stories set cover_design = 'tartan'
    where id = '00000000-0000-4000-9000-000000000001'$$,
  '23514',
  null,
  'a design the app cannot draw is refused'
);

select * from finish();
rollback;
