-- Staging top-up for S1-E3-06 (ratings and labels). Run by hand on staging after the migration
-- 20261023130001 has reached it (Supabase's GitHub integration applies it when main changes).
-- What it does: gives the three seed stories the ratings supabase/seed.sql now gives them, so
-- staging matches local: the first two All ages, the third (teen_17's poems) 13+. The
-- migration itself backfills All ages on every existing story, so this only moves the third.
-- Safe to run twice; adds no accounts. How to check it worked: the last query shows 13_plus.
update public.stories set rating = '13_plus'
where id = '00000000-0000-4000-9000-000000000003' and rating <> '13_plus';

select slug, rating from public.stories where id = '00000000-0000-4000-9000-000000000003';
