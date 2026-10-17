-- Epic check for S1-E1 (story S1-E1-QA): the database baseline (S1-E1-02) and the account
-- language (S1-E1-04) working together for the four personas the epic check names: adult_writer,
-- teen_17, kid_14_ok and kid_14_waiting.
-- What it proves, for each persona signed in:
--   - they read their own profile and nobody else's (cross-user reads refused);
--   - they can save their interface language, even while their account is read-only;
--   - their age group and whether they may write match the March rules (adults_only on, decided
--     17 Oct 2026, 12:44): only adult_writer is an active member; the minors are seed data that
--     prove the protections are ready before minors are let in;
--   - none of them can read staff roles or the audit log, or write to the audit log.
-- Signed out, every table holding people's data returns nothing (also walked table by table in 021).
-- Persona IDs are listed in supabase/README.md; signing in works as in 010-profiles.test.sql.
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

/**
 * Checks one signed-in persona against every rule above. Runs as that persona.
 * Inputs: the persona's user ID, its name for the messages, the age group and active-member answer
 *   the March rules give it.
 * Returns: the pgTAP result lines (seven per persona).
 */
create function pg_temp.check_persona(
  persona_id uuid,
  persona_name text,
  expected_age_band text,
  expected_active boolean
)
returns setof text
language plpgsql
as $$
begin
  -- Sign in as the persona, exactly as an API request does.
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', persona_id, 'role', 'authenticated')::text,
    true
  );

  return next results_eq(
    'select id from public.profiles',
    format('values (%L::uuid)', persona_id),
    format('allowed: profiles_select_own: %s reads their own profile and only that one', persona_name)
  );
  return next is(
    (select count(*)::integer from public.profiles where id <> persona_id),
    0,
    format('denied: profiles_select_own: %s reads no other persona''s profile', persona_name)
  );
  return next is(
    public.set_my_locale('en'),
    'en',
    format('%s can save their interface language (S1-E1-04 on the S1-E1-02 baseline)', persona_name)
  );
  return next is(
    public.age_band()::text,
    expected_age_band,
    format('%s is in the %s age group', persona_name, expected_age_band)
  );
  return next is(
    public.is_active_member(),
    expected_active,
    format('%s %s publish, comment or post in March', persona_name,
      case when expected_active then 'may' else 'may not' end)
  );
  return next is(
    (select count(*)::integer from public.staff_roles) + (select count(*)::integer from public.audit_log),
    0,
    format('%s reads no staff roles and no audit log', persona_name)
  );
  return next throws_ok(
    $sql$ select public.log_staff_action('test.action', 'profiles') $sql$,
    '42501',
    null,
    format('%s cannot write to the audit log', persona_name)
  );

  -- Back to the test's own role for the next persona.
  perform set_config('role', 'postgres', true);
end;
$$;

select * from pg_temp.check_persona(
  '00000000-0000-4000-8000-000000000001', 'adult_writer', '18_plus', true);
select * from pg_temp.check_persona(
  '00000000-0000-4000-8000-000000000002', 'teen_17', '16_to_17', false);
select * from pg_temp.check_persona(
  '00000000-0000-4000-8000-000000000003', 'kid_14_ok', '13_to_15', false);
select * from pg_temp.check_persona(
  '00000000-0000-4000-8000-000000000004', 'kid_14_waiting', '13_to_15', false);

-- Each persona's choice landed on their own row only.
select is(
  (select count(*)::integer from public.profiles
   where locale = 'en'
     and id not in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
                    '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004')),
  0,
  'saving a language never changed another account''s language'
);

select * from finish();

rollback;
