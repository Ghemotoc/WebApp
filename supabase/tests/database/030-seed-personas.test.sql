-- Database test: the seed personas exist with years of birth from the current year
-- (story S1-E1-02 acceptance criterion; architecture 1.7.2).
-- Runs against the seeded local database (`npx supabase start` or `db reset` loads seed.sql).
begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

-- 1. All sixteen personas have an account, a confirmed email and a profile.
select set_eq(
  $$ select split_part(users.email, '@', 1)
     from auth.users join public.profiles on profiles.id = users.id
     where users.email like '%@personas.test' and users.email_confirmed_at is not null $$,
  $$ values ('adult_writer'), ('teen_17'), ('kid_14_ok'), ('kid_14_waiting'), ('pending_check'),
            ('failed_check'), ('teacher'), ('owner'), ('admin'), ('moderator'), ('support'),
            ('editor'), ('suspended_user'), ('banned_user'), ('blocker'), ('blocked') $$,
  'every seed persona from architecture 1.7.2 exists with a confirmed email'
);

-- 2. Years of birth follow the current year, so each persona stays in its age group.
select results_eq(
  $$ select split_part(users.email, '@', 1),
            public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
                                       profiles.age_check_result,
                                       (now() at time zone 'Europe/Bucharest')::date)::text
     from auth.users join public.profiles on profiles.id = users.id
     where split_part(users.email, '@', 1) in ('adult_writer', 'teen_17', 'kid_14_ok', 'kid_14_waiting')
     order by 1 $$,
  $$ values ('adult_writer', '18_plus'), ('kid_14_ok', '13_to_15'),
            ('kid_14_waiting', '13_to_15'), ('teen_17', '16_to_17') $$,
  'the age-group personas sit in their groups this year'
);

select is(
  (select birth_year::integer from public.profiles where id = '00000000-0000-4000-8000-000000000002'),
  extract(year from (now() at time zone 'Europe/Bucharest'))::integer - 18,
  'teen_17''s year of birth is worked out from the current year'
);

-- 3. The staff personas hold their roles.
select set_eq(
  $$ select split_part(users.email, '@', 1), staff_roles.role::text
     from public.staff_roles join auth.users on users.id = staff_roles.user_id $$,
  $$ values ('owner', 'owner'), ('admin', 'admin'), ('moderator', 'moderator'),
            ('support', 'support'), ('editor', 'content_editor') $$,
  'the staff personas hold their staff roles'
);

select * from finish();

rollback;
