-- Database tests for the setting behind the personal details heads-up (bundle MUST-1, part b;
-- IDEA-20261108-6; story S1-E13-01).
-- What it proves:
-- - an adult starts with the heads-up off and may turn it on and off again;
-- - someone under 18 has it on and can't turn it off (hint under_18);
-- - signed out, nobody can change it; an empty choice is refused;
-- - only the on/off choice is kept: the profile has no other column for it.
-- Personas: adult_writer (…01), teen_17 (…02). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. An adult ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_privacy_settings() ->> 'checks_personal_details', 'false', 'an adult starts with it off');
select lives_ok($$ select public.set_checks_personal_details(true) $$, 'an adult turns it on');
select is(public.my_privacy_settings() ->> 'checks_personal_details', 'true', 'and it is on');
select lives_ok($$ select public.set_checks_personal_details(false) $$, 'and off again');
select throws_ok($$ select public.set_checks_personal_details(null) $$, '23514', null, 'an empty choice is refused');

/* ---------- 2. Under 18 ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.my_privacy_settings() ->> 'checks_personal_details', 'true', 'a 17-year-old has it on');
select is(pg_temp.error_hint($$ select public.set_checks_personal_details(false) $$), 'under_18',
  'and can''t turn it off');

/* ---------- 3. Signed out, and what is kept ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.set_checks_personal_details(true) $$, '42501', null,
  'signed out, nobody can change it');

reset role;
select is((select count(*)::integer from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles' and column_name like '%personal_details%'),
  1, 'only the on/off choice is kept, never what was typed');

select * from finish();
rollback;
