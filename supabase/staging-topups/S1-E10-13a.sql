-- Staging top-up for story S1-E10-13a (safety contacts), 23 Oct 2026.
--
-- What it adds: the one part of supabase/seed.sql that arrived after the test personas were
-- loaded on staging: every persona's country, Romania, so the "Is someone in danger right now?"
-- block shows Romania's contacts for them (real sign-ups record the country from the connection,
-- S1-E2-10). The safety contacts themselves arrive by migration, not by this file.
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only @personas.test rows,
-- and is safe to run twice (it changes only rows that still have no country).
-- How to check it worked: the last query should show test_accounts_with_country 16.
begin;

update public.profiles
  set country_code = 'RO'
  where country_code is null
    and id in (select id from auth.users where email like '%@personas.test');

select count(*) as test_accounts_with_country
from public.profiles
where country_code = 'RO'
  and id in (select id from auth.users where email like '%@personas.test');

commit;
