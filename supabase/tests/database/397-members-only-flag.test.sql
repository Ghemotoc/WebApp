-- Database tests for the trial's members-only switch (TRIAL-WALL; migration
-- 20270205100429_trial_wall_and_preview.sql).
-- What it proves:
-- - the members_only flag exists, starts off and is public;
-- - a signed-out visitor can read it, as the app's front door needs it before anyone signs in.
begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

select is((select count(*)::integer from public.feature_flags
           where key = 'members_only' and not is_enabled and is_public), 1,
  'members_only exists, public and off');
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is((select count(*)::integer from public.feature_flags where key = 'members_only'), 1,
  'a signed-out visitor reads the flag, so the front door works before anyone signs in');

select * from finish();
rollback;
