-- Seed data for local and staging databases (stories S1-E1-01 and S1-E1-02).
--
-- Who runs it: `npx supabase start` and `npx supabase db reset` load it after the migrations
-- (config.toml, [db.seed]). Staging gets the same file once, pasted into the Supabase SQL editor
-- (docs/runbooks/README.md, "staging-reset-and-seed").
--
-- Rule: synthetic data only. Never copy production data, real people or real email addresses into
-- this file or into staging (S1-E1-01 acceptance criterion; CLAUDE.md, Safety while building).
-- Every email address must use a reserved test domain (example.com, example.org or .test); the test
-- scripts/seed-is-synthetic.test.ts fails otherwise.
--
-- What it creates: the seed personas from docs/architecture.md, section 1.7.2. Years of birth are
-- worked out from the current year, so the personas never age out of their group.
-- Every persona signs in with its email and the shared test password in supabase/README.md
-- (Robert, 17 Oct 2026: one shared, documented password, the same locally and on staging).
--
-- Persona states held in tables that later stories create are added by those stories:
--   every persona's acceptance of the terms and privacy notice v0.1      S1-E14-01 (below)
--   kid_14_ok's agreed consent and kid_14_waiting's pending consent  S1-E2-03
--   teacher's Teacher badge                                           S1-E2-11
--   suspended_user's and banned_user's sanctions                      S1-E10-06
--   blocker blocking blocked                                          S1-E5-05
--   staff personas' Google Workspace sessions                         S1-E2-07b

do $$
declare
  current_year integer := extract(year from (now() at time zone 'Europe/Bucharest'))::integer;
  shared_password text := 'Persona-Test-2026!';
  persona record;
begin
  -- One row per persona: fixed user ID (so tests can name it), handle-like name, years old by
  -- year of birth, the age check result and, for staff, the role.
  for persona in
    select *
    from (values
      ('00000000-0000-4000-8000-000000000001'::uuid, 'adult_writer',   30, '18_or_over', null),
      ('00000000-0000-4000-8000-000000000002'::uuid, 'teen_17',        18, '13_or_over', null),
      ('00000000-0000-4000-8000-000000000003'::uuid, 'kid_14_ok',      15, '13_or_over', null),
      ('00000000-0000-4000-8000-000000000004'::uuid, 'kid_14_waiting', 15, '13_or_over', null),
      ('00000000-0000-4000-8000-000000000005'::uuid, 'pending_check',  25, 'pending',    null),
      ('00000000-0000-4000-8000-000000000006'::uuid, 'failed_check',   25, 'failed',     null),
      ('00000000-0000-4000-8000-000000000007'::uuid, 'teacher',        40, '18_or_over', null),
      ('00000000-0000-4000-8000-000000000008'::uuid, 'owner',          35, '18_or_over', 'owner'),
      ('00000000-0000-4000-8000-000000000009'::uuid, 'admin',          35, '18_or_over', 'admin'),
      ('00000000-0000-4000-8000-000000000010'::uuid, 'moderator',      35, '18_or_over', 'moderator'),
      ('00000000-0000-4000-8000-000000000011'::uuid, 'support',        35, '18_or_over', 'support'),
      ('00000000-0000-4000-8000-000000000012'::uuid, 'editor',         35, '18_or_over', 'content_editor'),
      ('00000000-0000-4000-8000-000000000013'::uuid, 'suspended_user', 28, '18_or_over', null),
      ('00000000-0000-4000-8000-000000000014'::uuid, 'banned_user',    28, '18_or_over', null),
      ('00000000-0000-4000-8000-000000000015'::uuid, 'blocker',        30, '18_or_over', null),
      ('00000000-0000-4000-8000-000000000016'::uuid, 'blocked',        17, '13_or_over', null)
    ) as personas (user_id, persona_name, years_by_birth_year, check_result, staff_role)
  loop
    -- 1. The Supabase Auth account, with a confirmed email so the persona can sign in.
    --    Empty strings instead of nulls in the token columns: Supabase Auth expects them.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', persona.user_id, 'authenticated', 'authenticated',
      persona.persona_name || '@personas.test',
      extensions.crypt(shared_password, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
      '', '', '', ''
    );

    -- 2. The email identity Supabase Auth signs in with.
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    ) values (
      persona.user_id::text, persona.user_id,
      jsonb_build_object(
        'sub', persona.user_id::text,
        'email', persona.persona_name || '@personas.test',
        'email_verified', true
      ),
      'email', now(), now()
    );

    -- 3. The profile: year of birth from the current year. No month: none of these years leaves
    --    the age unclear at 13 or 16 (S1-E2-02). The check date is set when there is a result.
    insert into public.profiles (id, birth_year, age_check_result, age_checked_at, age_check_method)
    values (
      persona.user_id,
      current_year - persona.years_by_birth_year,
      persona.check_result::public.age_check_result,
      case when persona.check_result = 'pending' then null else now() end,
      case when persona.check_result = 'pending' then null else 'facial_estimation'::public.age_check_method end
    );

    -- 4. Staff personas get their role (S1-E2-07a later adds permissions).
    if persona.staff_role is not null then
      insert into public.staff_roles (user_id, role)
      values (persona.user_id, persona.staff_role::public.staff_role);
    end if;

    -- 5. Every persona accepted version 0.1 of the terms and the privacy notice at sign-up, in
    --    English (S1-E14-01), so nobody is asked to accept again until a new important version.
    insert into public.consents (user_id, legal_document_version_id, method)
    select persona.user_id, versions.id, 'sign_up'
    from public.legal_document_versions as versions
    join public.legal_documents as documents on documents.id = versions.document_id
    where documents.needs_acceptance and versions.version_label = '0.1' and versions.language = 'en';
  end loop;
end;
$$;
