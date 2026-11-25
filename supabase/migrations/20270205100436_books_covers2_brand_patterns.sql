-- books_covers2_brand_patterns: lets a drawn cover use the brand page's three new patterns,
-- Blush dots, Sky lines and Gold grid.
--
-- Story: design books, covers part 2 (Robert liked the brand page's Label covers and pattern
-- backgrounds, 23 Nov 2026, 20:26 UTC; he chose the writer's accent colour for the pattern on
-- the decision card of 24 Nov 2026).
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes: the list of design keys the stories table accepts gains 'blushdots',
-- 'skylines' and 'goldgrid', after the 19 it had. The palette check stays as it is, because the
-- new designs use the same 9 colours. No row changes: existing covers keep their design, and
-- automatic covers never pick the new three.

-- The check is dropped and put back with the longer list, in the same order as coverDesignKeys
-- in src/components/covers/coverDesigns.ts.
alter table public.stories drop constraint if exists stories_cover_design_is_approved;
alter table public.stories add constraint stories_cover_design_is_approved check (
  cover_design is null or cover_design = any (array[
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'stripes', 'dots', 'grid', 'waves', 'starry', 'sparkles', 'twotone',
    'arches', 'rings', 'forestwaves',
    'blushdots', 'skylines', 'goldgrid'
  ])
);
comment on constraint stories_cover_design_is_approved on public.stories is
  'A drawn cover uses one of the designs the app can draw (src/components/covers/coverDesigns.ts); "doodles" was renamed "sparkles" in NO-DOODLES, G9c added arches, rings and forestwaves, and the design books added blushdots, skylines and goldgrid.';
