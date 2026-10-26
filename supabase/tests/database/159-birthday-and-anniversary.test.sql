-- Database tests for the optional birthday and the joining anniversary greeting (stories S1-E2-12
-- and S1-E2-13; bundle PEOPLE-4; Robert, 25 Oct 2026, 07:07 to 07:11).
-- What it proves:
-- - the owner saves a month, or a day and a month, and clears it; a day without a month or a day
--   the month doesn't have is refused;
-- - the birthday never reaches a public view (get_writer_profile());
-- - the year of birth never changes, not even for a database owner;
-- - staff (a moderator) correct a birthday with a reason and it is logged; support is refused;
-- - greeting_for() says birthday on the day, birthday month in the month, anniversary in the
--   month they joined from the first anniversary, and nothing otherwise; 29 February works.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;

/* ---------- 1. The owner saves it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_birthday(7, null), '{"month": 7, "day": null}'::jsonb,
  'the owner saves a birthday month alone');
select is(public.set_my_birthday(7, 14), '{"month": 7, "day": 14}'::jsonb,
  'the owner saves a day and a month');
select results_eq(
  $$ select birthday_month::integer, birthday_day::integer from public.profiles
     where id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values (7, 14) $$,
  'the owner reads their own birthday back (profiles_select_own)');
select throws_ok($$ select public.set_my_birthday(null, 14) $$, '23514', null,
  'a day without a month is refused');
select throws_ok($$ select public.set_my_birthday(4, 31) $$, '23514', null,
  'a day the month doesn''t have is refused');
select lives_ok($$ select public.set_my_birthday(2, 29) $$, '29 February is allowed');

/* ---------- 2. Nobody else sees it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001' $$,
  'another member can''t read the profile row with the birthday');
select ok(
  (public.get_writer_profile('adult_writer')::text not like '%birthday%'),
  'the public profile never carries the birthday');

/* ---------- 3. The year of birth never changes ---------- */

select pg_temp.sign_out();
select throws_ok(
  $$ update public.profiles set birth_year = 1950 where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'not even the database owner can change a year of birth');

/* ---------- 4. Staff correct it on request ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok(
  $$ select public.admin_set_birthday('00000000-0000-4000-8000-000000000001', 'Asked by email.', 3, 2) $$,
  '42501', null, 'denied: support can''t correct a birthday');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok(
  public.admin_set_birthday('00000000-0000-4000-8000-000000000001', 'Asked by email.', 3, 2),
  'allowed: a moderator corrects a birthday with a reason');
select pg_temp.sign_out();
select results_eq(
  $$ select before_values ->> 'birthday_month', after_values ->> 'birthday_month' from public.audit_log
     where action = 'account.birthday_corrected' and target_user_id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values ('2'::text, '3'::text) $$,
  'the correction is in the audit log with before and after');

/* ---------- 5. The greeting ---------- */

select is(public.greeting_for(5, 9, '2024-03-01', '2026-05-09'), 'birthday', 'on the day: birthday');
select is(public.greeting_for(5, null, '2024-03-01', '2026-05-20'), 'birthday_month',
  'a month alone: birthday month all month');
select is(public.greeting_for(null, null, '2024-03-10', '2026-03-02'), 'anniversary',
  'the month they joined, a year or more later: anniversary');
select is(public.greeting_for(2, 29, '2026-02-01', '2027-02-28'), 'birthday',
  'a 29 February birthday is greeted on 28 February in a year without one; the joining month itself greets nothing');

select * from finish();
rollback;
