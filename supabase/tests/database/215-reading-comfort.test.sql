-- Database tests for the reading comfort settings (bundle IDEAS-1, part a; ideas
-- IDEA-20261031-6, 7 and 8).
-- What it proves:
-- - Atkinson Hyperlegible can be saved as the reading font (idea 6);
-- - Night by the clock keeps the two times the reader picks, past midnight included, and starts
--   with no times at all, because there is no preset hour (idea 7, Robert, 31 Oct 2026);
-- - the reading ruler is kept, off at first (idea 8);
-- - a call with only the first five settings still works and leaves the new ones off;
-- - reading_settings_select_own: allowed (the reader reads their own times) and denied (nobody
--   else does).
-- Test data: teen_17's settings; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

delete from public.reading_settings where user_id = '00000000-0000-4000-8000-000000000002';

/* ---------- 1. The first five settings alone ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select lives_ok($$ select public.save_reading_settings('serif', null, 'normal', 'medium', 'light') $$,
  'a save with only the first five settings still works');
select is(
  (select night_by_clock::text || ' ' || coalesce(night_from::text, 'none') || ' ' || reading_ruler::text
   from public.reading_settings),
  'false none false', 'Night by the clock and the ruler start off, with no preset hour');

/* ---------- 2. The new settings ---------- */

select lives_ok(
  $$ select public.save_reading_settings('atkinson_hyperlegible', 20::smallint, 'wide', 'narrow', 'light',
       true, '22:30', '06:00', true) $$,
  'the reader picks Atkinson Hyperlegible, Night from 22:30 to 06:00 and the ruler');
select is((select font::text from public.reading_settings), 'atkinson_hyperlegible',
  'the font is kept (idea 6)');
select is(
  (select night_by_clock::text || ' ' || night_from::text || ' ' || night_until::text from public.reading_settings),
  'true 22:30:00 06:00:00', 'both times are kept as the reader set them, past midnight included (idea 7)');
select is((select reading_ruler from public.reading_settings), true, 'the ruler is kept (idea 8)');
select is((select count(*)::integer from public.reading_settings), 1,
  'allowed: reading_settings_select_own (the reader reads their own times)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.reading_settings
           where user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'denied: reading_settings_select_own (nobody else sees when someone reads at night)');

select * from finish();
rollback;
