-- The brand names a username or pen name may not imitate (story S1-E2-04).
--
-- Why a settings row: names and domains are settings, not code (CLAUDE.md, decided 17 Oct 2026,
-- 12:47). The back end reads brand values from the settings table, and this file is the one place
-- in supabase/ allowed to hold them (decided 17 Oct 2026, 19:43, Q5;
-- scripts/find-hard-coded-brand-values.ts lists this exact path). Renaming the product means a new
-- migration that updates this row, plus src/config/brand.ts and the locale files.
-- Who reads it: name_reserved_reason() in …_s1_e2_04_handles.sql, which folds each name and refuses it
-- anywhere in a username or pen name (6 letters or more) or as a whole word (shorter).

insert into public.settings (key, value, is_public, description) values
  ('reserved_brand_words',
   '["Ghemotoc", "The Magic Coffin", "Magic Coffin"]'::jsonb,
   false,
   'Brand names refused in usernames and pen names (S1-E2-04). Update when the product is renamed.');
