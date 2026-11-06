-- Staging top-up: the seed personas have chosen their country (bundle MARKETS-1, story S1-E2-21),
-- as seed.sql now says locally, so staging doesn't ask them "Which country do you live in?".
--
-- What it does: sets profiles.country_chosen_at for the 16 seed personas that have none yet. Their
-- country stays Romania. Adds no accounts.
-- Rules (supabase/staging-topups/README.md): safe to run twice (it touches only rows still empty);
-- never production (step 1). Run it after the MARKETS-1 migrations reach staging.
-- How to check it worked: the last query shows 16.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

-- 2. The personas chose Romania themselves.
update public.profiles set country_chosen_at = now()
where profiles.country_chosen_at is null
  and profiles.id in (select users.id from auth.users where users.email like '%@personas.test');

commit;

-- 3. The check: every persona has an answer.
select count(*) from public.profiles
where profiles.country_chosen_at is not null
  and profiles.id in (select users.id from auth.users where users.email like '%@personas.test');
