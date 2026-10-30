-- Database tests for the reader's reading settings (story S1-E4-02).
-- What it proves:
-- - reading_settings is readable by its owner only (allowed and denied tests for its policy);
-- - a signed-out visitor can't save settings, and the table can't be written directly;
-- - the first save creates the row, a later save replaces it, and a null size means "follow the
--   device"; a size outside the slider's 14 to 28 is refused.
-- Test data: teen_17 and adult_writer's settings; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Saving ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.save_reading_settings('serif', 20::smallint, 'wide', 'narrow', 'sepia') $$),
  '42501', 'a signed-out visitor can''t save reading settings');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select lives_ok($$ select public.save_reading_settings('dyslexia_friendly', null, 'wide', 'narrow', 'sepia') $$,
  'a reader saves their settings for the first time');
select is((select font::text || ' ' || coalesce(text_size::text, 'device') || ' ' || theme::text from public.reading_settings),
  'dyslexia_friendly device sepia', 'a missing size means "follow the device"');
select lives_ok($$ select public.save_reading_settings('serif', 24::smallint, 'compact', 'wide', 'night') $$,
  'a later save replaces the settings');
select is((select font::text || ' ' || text_size::text || ' ' || line_spacing::text || ' ' || line_width::text || ' ' || theme::text
  from public.reading_settings), 'serif 24 compact wide night', 'the reader reads back the settings they saved last');
select is(pg_temp.refusal($$ select public.save_reading_settings('serif', 40::smallint, 'compact', 'wide', 'night') $$),
  '23514', 'a size outside 14 to 28 is refused');
select is(pg_temp.refusal($$ update public.reading_settings set theme = 'light' $$), '42501',
  'the table can''t be written directly, only through save_reading_settings()');

/* ---------- 2. Row-level security ---------- */

select is((select count(*)::integer from public.reading_settings), 1,
  'allowed: reading_settings_select_own (the reader sees their own settings)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.reading_settings where user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'denied: reading_settings_select_own (nobody else sees how a reader reads)');

select * from finish();
rollback;
