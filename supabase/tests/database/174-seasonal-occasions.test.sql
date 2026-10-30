-- Database tests for the seasonal doodle schedule (stories S1-E11-11 and S1-E5-07; CLAUDE.md rule 1).
-- What it proves:
-- - the seeded seasons cover every day, and an occasion beats its season (S1-E5-07 criterion 1);
-- - a yearly range wraps over New Year and covers 29 February; a one-off range covers only its
--   own year;
-- - when two occasions overlap, the shorter one wins (S1-E11-11 criterion 3);
-- - a place shows only what is meant for it (Discover or Search);
-- - visitors and members read today's doodle, but only owner and admin read the schedule
--   (seasonal_occasions_select_admin) or change it; a moderator, a content editor and a member are
--   refused (S1-E11-11, admin-only, decided 17 Oct 2026, 19:19);
-- - a broken occasion is refused with the fields named; every save and removal is in the audit
--   log (S1-E11-11 criterion 5).
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
-- The doodle a place shows on a day, as the app reads it.
create function pg_temp.doodle_on(on_date date, place text) returns text language sql as $$
  select doodle::text from public.current_seasonal_doodle(on_date, place);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- The seeded schedule, read by a visitor ---------- */

set local role anon;
select is(pg_temp.doodle_on('2026-04-10', 'discover'), 'cherry_blossom', 'spring shows its default doodle');
select is(pg_temp.doodle_on('2026-10-30', 'discover'), 'jack_o_lantern', 'an occasion beats its season');
select is(pg_temp.doodle_on('2026-11-05', 'search'), 'autumn_leaf', 'after the occasion the season comes back');
select is(pg_temp.doodle_on('2027-01-15', 'discover'), 'hot_chocolate', 'winter wraps over New Year');
select is(pg_temp.doodle_on('2028-02-29', 'discover'), 'hot_chocolate', 'and covers 29 February in a leap year');
select is((select count(*)::integer from generate_series('2026-01-01'::date, '2026-12-31', '1 day') as day
    where pg_temp.doodle_on(day::date, 'discover') is null), 0,
  'the four seasons leave no day without a doodle');
reset role;

/* ---------- Who reads and changes the schedule ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.seasonal_occasions), 0,
  'denied: seasonal_occasions_select_admin hides the schedule from a member');
select is(pg_temp.doodle_on('2026-04-10', 'search'), 'cherry_blossom', 'a member still gets today''s doodle');
select throws_ok($$ select public.admin_save_occasion('Test', 'Test', '2026-05-01', '2026-05-02', false, 'bee', 'both', false) $$,
  '42501', null, 'a member can''t add an occasion');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_occasion('Test', 'Test', '2026-05-01', '2026-05-02', false, 'bee', 'both', false) $$,
  '42501', null, 'a moderator can''t add an occasion');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_remove_occasion((select id from public.seasonal_occasions limit 1)) $$,
  '42501', null, 'a content editor can''t remove one (admin role only)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is((select count(*)::integer from public.seasonal_occasions), 6,
  'allowed: seasonal_occasions_select_admin lets the owner read the whole schedule');

/* ---------- An admin changes it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_save_occasion(' ', 'Bees', '2026-05-10', '2026-05-01', false, 'bee', 'both', false) $$),
  'nameRo:empty,endsOn:before_start', 'a broken occasion is refused with each field named');

-- A week of bees inside a month of butterflies, only on Search: the shorter one wins there.
select public.admin_save_occasion('Fluturi', 'Butterflies', '2026-05-01', '2026-05-31', false, 'butterfly', 'search', false);
select public.admin_save_occasion('Albine', 'Bees', '2026-05-10', '2026-05-16', false, 'bee', 'search', false);
select is(pg_temp.doodle_on('2026-05-12', 'search'), 'bee', 'when two occasions overlap, the shorter one wins');
select is(pg_temp.doodle_on('2026-05-20', 'search'), 'butterfly', 'outside the shorter one, the longer one shows');
select is(pg_temp.doodle_on('2026-05-12', 'discover'), 'cherry_blossom', 'an occasion only for Search leaves Discover alone');
select is(pg_temp.doodle_on('2027-05-12', 'search'), 'cherry_blossom', 'a one-off occasion doesn''t come back next year');
select ok(exists (select 1 from public.audit_log where action = 'seasonal.saved'
    and before_values is null and after_values ->> 'name_en' = 'Bees' and after_values ->> 'doodle' = 'bee'),
  'adding an occasion is logged with what was added');

select public.admin_remove_occasion((select id from public.seasonal_occasions where name_en = 'Bees'));
select is(pg_temp.doodle_on('2026-05-12', 'search'), 'butterfly', 'a removed occasion stops showing at once');
select ok(exists (select 1 from public.audit_log where action = 'seasonal.removed'
    and before_values ->> 'name_en' = 'Bees' and after_values is null),
  'removing it is logged with what was removed');
reset role;

select * from finish();
rollback;
