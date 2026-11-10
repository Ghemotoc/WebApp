-- g9c_cover_designs: lets a drawn cover use the three new patterns, Arches, Rings and Forest waves.
--
-- Story: bundle G9 WRITING, part c (the liquid glass New story board, approved by Robert on
-- 7 Nov 2026, 19:51 UTC, draws three new backgrounds marked "New").
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes: the list of design keys the stories table accepts gains 'arches', 'rings' and
-- 'forestwaves', after the 16 it had. The palette check (stories_cover_colours_are_in_the_palette)
-- stays as it is, because the new designs use the same 9 colours. No row changes: existing covers
-- keep their design, and automatic covers (worked out in the app from the story ID) never pick
-- the new three, so they keep their look too.

-- The check is dropped and put back with the longer list, in the same order as coverDesignKeys
-- in src/components/covers/coverDesigns.ts.
alter table public.stories drop constraint if exists stories_cover_design_is_approved;
alter table public.stories add constraint stories_cover_design_is_approved check (
  cover_design is null or cover_design = any (array[
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'stripes', 'dots', 'grid', 'waves', 'starry', 'sparkles', 'twotone',
    'arches', 'rings', 'forestwaves'
  ])
);
comment on constraint stories_cover_design_is_approved on public.stories is
  'A drawn cover uses one of the designs the app can draw (src/components/covers/coverDesigns.ts); "doodles" was renamed "sparkles" in NO-DOODLES, and G9c added arches, rings and forestwaves.';
