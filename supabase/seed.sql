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
--   four test invite codes (one that works, one expired, used up, revoked) S1-E2-01 (end of file)
--   kid_14_ok's agreed consent and kid_14_waiting's pending consent  S1-E2-03
--   teacher's Teacher badge                                           S1-E2-11
--   suspended_user's and banned_user's sanctions                      S1-E10-06 (the decided cases at the end)
--   blocker blocking blocked                                          S1-E5-05
--   owner's and moderator's safeguarding permission, 20 cases        S1-E10-03a (end of file)
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
    --    "seed_persona" in the app metadata tells the sign-up trigger (S1-E2-01) that this file
    --    makes the profile itself; only the server can write app metadata.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', persona.user_id, 'authenticated', 'authenticated',
      persona.persona_name || '@personas.test',
      extensions.crypt(shared_password, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"], "seed_persona": true}', '{}', now(), now(),
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
    --    Every persona has chosen a username (its persona name, S1-E2-04), so the account gate
    --    doesn't stop it at handle_missing; adult_writer also has a pen name.
    insert into public.profiles (
      id, birth_year, age_check_result, age_checked_at, age_check_method, handle, pen_name,
      country_code
    )
    values (
      persona.user_id,
      current_year - persona.years_by_birth_year,
      persona.check_result::public.age_check_result,
      case when persona.check_result = 'pending' then null else now() end,
      case when persona.check_result = 'pending' then null else 'facial_estimation'::public.age_check_method end,
      persona.persona_name,
      case when persona.persona_name = 'adult_writer' then 'Lia Scrie' end,
      -- Every persona joined from Romania, so country-specific blocks (safety contacts,
      -- S1-E10-13a) have a country to show; real sign-ups record it from the connection (S1-E2-10).
      'RO'
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

-- Test invites for the March test's invite-only sign-up (S1-E2-01). Local and staging only: this
-- file never runs in production, so no known code ever reaches real users. The admin persona made
-- them; the codes are in supabase/README.md. S1-E11-17 adds the admin screen that makes real ones.
insert into public.invites (user_id, code_hash, max_uses, use_count, expires_at, revoked_at, note)
values
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('PERSONAS-TEST-INVITE'),
   1000, 0, '2100-01-01', null, 'Seed: works for every test sign-up'),
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('EXPIRED-TEST-INVITE'),
   5, 0, '2026-01-01', null, 'Seed: expired'),
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('USED-UP-TEST-INVITE'),
   1, 1, '2100-01-01', null, 'Seed: used up'),
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('REVOKED-TEST-INVITE'),
   5, 0, '2100-01-01', '2026-10-17', 'Seed: revoked');


-- A local-only Vault secret so a ban can hash the banned email (S1-E10-06; decided 23 Oct 2026,
-- Q8). Staging and production set their own value by hand; this one never leaves a developer's
-- machine. Secrets never go in migrations.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'banned_email_secret') then
    perform vault.create_secret('local-only-banned-email-secret-not-for-staging', 'banned_email_secret',
      'Keyed hash for banned emails (S1-E10-06). Local seed value; staging and production set their own by hand.');
  end if;
end;
$$;

-- The safeguarding permission for owner and moderator (S1-E10-03a; decided 23 Oct 2026, Q6), so
-- the safeguarding cases below are visible to them and hidden from the admin persona, which lets
-- tests and hand checks see both sides.
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values
  ('00000000-0000-4000-8000-000000000008', 'safeguarding', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000010', 'safeguarding', '00000000-0000-4000-8000-000000000008');

-- Twenty moderation cases across the tiers (S1-E10-03a, Robert, 23 Oct 2026): 14 open (one
-- authority order on the one-hour clock, four same-day cases, three 48-hour cases and six 7-day
-- cases) and 6 decided. Report cases are made the real way, through report_item() as each
-- reporter, so they carry the reporter's age group and group onto one case per item (Q4); the
-- order and the two picture checks are inserted directly, as S1-E10-09 and S1-E10-05 will do.
-- Every item is a persona's profile (the one reportable type today, Q1). The teacher persona's
-- profile is left without an open case for the end-to-end test to report. Afterwards the cases
-- are re-dated so the queue shows a spread of deadlines, one of them past.
do $$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  admin_id constant uuid := '00000000-0000-4000-8000-000000000009';
  moderator_id constant uuid := '00000000-0000-4000-8000-000000000010';
  one_case record;
  one_report record;
  decided record;
  dated record;
begin
  -- Step 1: the six decided cases, each one report decided by the moderator or the admin.
  for decided in
    select * from (values
      ('adult_writer',   'teacher',      'other'::public.report_reason,      'Bio says they sell essays. Not clearly against a rule.',  moderator_id, 'no_action'::public.moderation_action, 'Looked at the bio: an offer of writing help, no sale. Nothing to act on.'),
      ('blocked',        'blocker',      'harassment',                       'Keeps calling me a copycat in replies.',                  moderator_id, 'warn',      'First upheld case. Warned about name-calling; the reply was removed by the writer meanwhile.'),
      ('teen_17',        'adult_writer', 'spam',                             'Posted the same link in six threads.',                    admin_id,     'no_action', 'The link is to their own story on this site; not spam under our rule.'),
      ('suspended_user', 'teacher',      'harassment',                       'Threatening private replies after I reported them.',      moderator_id, 'suspend',   'Second upheld case in 30 days. Next step on the ladder: a 7-day suspension.'),
      ('banned_user',    'teacher',      'hate',                             'Profile text attacks an ethnic group.',                   admin_id,     'ban',       'Repeat hate speech after a suspension. Ban; the email can''t be used to sign up again.'),
      ('kid_14_ok',      'teacher',      'illegal_content',                  'Posted someone''s home address.',                         moderator_id, 'remove',    'Personal data of another member. Removed the passage; the writer was told.')
    ) as rows (reported_handle, reporter_handle, reason, details, decided_by, action, note)
  loop
    perform set_config('request.jwt.claims', json_build_object(
      'sub', (select id from public.profiles where handle = decided.reporter_handle), 'role', 'authenticated')::text, true);
    perform public.report_item('profile', decided.reported_handle, decided.reason, decided.details);
    perform set_config('request.jwt.claims', json_build_object('sub', decided.decided_by, 'role', 'authenticated')::text, true);
    -- The decision carries the action out (S1-E10-06): the suspend on suspended_user becomes a
    -- 7-day suspension, the ban on banned_user a ban, the remove on kid_14_ok a removed profile.
    perform public.admin_decide_case(
      (select cases.id from public.cases join public.profiles on profiles.id = cases.user_id
        where profiles.handle = decided.reported_handle and cases.status = 'open'),
      decided.action, decided.note, case when decided.action = 'suspend' then 7 end);
  end loop;

  -- Step 2: the open report cases, one row per report; reports of one profile join one case.
  for one_report in
    select * from (values
      ('failed_check',   'kid_14_ok',      'child_sexual_content'::public.report_reason, 'An adult asked me for my phone number and photos.'),
      ('pending_check',  'teen_17',        'self_harm',             'Their bio says they want to hurt themselves tonight.'),
      ('banned_user',    'adult_writer',   'terrorism',             'The bio links to a group that calls for attacks.'),
      ('suspended_user', 'adult_writer',   'copied_published_work', 'Their bio is the back cover text of a published novel, word for word.'),
      ('suspended_user', 'blocker',        'copied_published_work', 'Copied from a book I own.'),
      ('editor',         'teacher',        'copyright',             'The profile picture is a photographer''s copyrighted work.'),
      ('blocked',        'adult_writer',   'harassment',            'Replies "nobody asked for your opinion, your chapters are cringe".'),
      ('blocked',        'teacher',        'harassment',            'Keeps replying to the same member with insults.'),
      ('blocked',        'kid_14_waiting', 'harassment',            'This is the third time they replied to me like this. I just want it to stop.'),
      ('teen_17',        'blocker',        'hate',                  'Bio calls another member "a talentless copycat" and worse.'),
      ('admin',          'blocked',        'spam',                  '"Get 1,000 readers free, click my link"'),
      ('admin',          'kid_14_ok',      'spam',                  'Same link again.'),
      ('admin',          'teen_17',        'spam',                  'Spam link in the bio.'),
      ('admin',          'adult_writer',   'spam',                  'Promotional link, posted everywhere.'),
      ('moderator',      'teacher',        'undisclosed_ai',        'Readers say the bio and the stories are AI-written; the profile says "No AI".'),
      ('kid_14_ok',      'suspended_user', 'harassment',            'Mocked my pen name in three replies.'),
      ('adult_writer',   'blocker',        'spam',                  'Bio is one long advert.')
    ) as rows (reported_handle, reporter_handle, reason, details)
  loop
    perform set_config('request.jwt.claims', json_build_object(
      'sub', (select id from public.profiles where handle = one_report.reporter_handle), 'role', 'authenticated')::text, true);
    perform public.report_item('profile', one_report.reported_handle, one_report.reason, one_report.details);
  end loop;
  perform set_config('request.jwt.claims', '', true);

  -- Step 3: the authority order (one-hour clock, TCO regulation art. 3(3); the removal orders
  -- screen is S1-E10-09) and the two picture checks (S1-E10-05: a known-abuse-image match is a
  -- same-day safeguarding case, nudity a 48-hour one), inserted as those stories will.
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  select 'TCO-0001', id, 'profile', id, 'authority_order', 'one_hour', now() + interval '1 hour', false
  from public.profiles where handle = 'blocker';
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  select 'P-0001', id, 'profile', id, 'picture_check', 'same_day', now() + interval '24 hours', true
  from public.profiles where handle = 'support';
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  select 'P-0002', id, 'profile', id, 'picture_check', 'two_days', now() + interval '48 hours', false
  from public.profiles where handle = 'kid_14_waiting';

  -- Step 4: re-date the open cases so the queue shows a spread: hours ago each was received, and
  -- its deadline from that moment. The same-day case on failed_check is already past its deadline.
  for dated in
    select * from (values
      ('blocker', 20), ('failed_check', 30), ('pending_check', 17), ('banned_user', 14), ('support', 15),
      ('suspended_user', 1), ('editor', 3), ('kid_14_waiting', 5),
      ('blocked', 1), ('teen_17', 2), ('admin', 4), ('moderator', 6), ('kid_14_ok', 8), ('adult_writer', 26)
    ) as rows (reported_handle, hours_ago)
  loop
    update public.cases set
      received_at = now() - make_interval(hours => dated.hours_ago),
      deadline_at = now() - make_interval(hours => dated.hours_ago) + make_interval(hours => public.tier_hours(tier))
    where status = 'open' and user_id = (select id from public.profiles where handle = dated.reported_handle);
  end loop;
  update public.reports set created_at = cases.received_at
  from public.cases where cases.id = reports.case_id and cases.status = 'open';
  -- The decided cases were received nine days ago and decided three days ago.
  update public.cases set received_at = now() - interval '9 days', deadline_at = now() - interval '2 days',
    decided_at = now() - interval '3 days' where status = 'decided';
  update public.reports set created_at = cases.received_at, closed_at = cases.decided_at
  from public.cases where cases.id = reports.case_id and cases.status = 'decided';
  update public.case_actions set created_at = cases.decided_at
  from public.cases where cases.id = case_actions.case_id;
end;
$$;
