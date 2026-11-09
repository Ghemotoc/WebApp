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
--   kid_14_ok's agreed consent and kid_14_waiting's pending consent  S1-E2-03 (end of file)
--   every persona counted as set up (onboarded_at)                   S1-E2-06 (end of file)
--   teacher's Teacher badge, moderator's teacher checks permission   S1-E2-11 (end of file)
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
      country_code, country_chosen_at
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
      'RO',
      -- ... and chose it themselves, so the app doesn't ask them once more (MARKETS-1, S1-E2-21).
      now()
    );

    -- 4. Staff personas get their role (S1-E2-07a later adds permissions).
    if persona.staff_role is not null then
      insert into public.staff_roles (user_id, role)
      values (persona.user_id, persona.staff_role::public.staff_role);
      -- Every staff persona reads Română and English, so both languages have moderators on the
      -- rota and stay open (S1-E11-05).
      insert into public.staff_languages (user_id, language_code)
      values (persona.user_id, 'ro'), (persona.user_id, 'en');
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
-- The expired and revoked ones ended yesterday, so the retention job (90 days after an invite
-- ends, S1-E13-04) never removes them from a fresh database.
insert into public.invites (user_id, code_hash, max_uses, use_count, expires_at, revoked_at, note)
values
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('PERSONAS-TEST-INVITE'),
   1000, 0, '2100-01-01', null, 'Seed: works for every test sign-up'),
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('EXPIRED-TEST-INVITE'),
   5, 0, now() - interval '1 day', null, 'Seed: expired'),
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('USED-UP-TEST-INVITE'),
   1, 1, '2100-01-01', null, 'Seed: used up'),
  ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('REVOKED-TEST-INVITE'),
   5, 0, '2100-01-01', now() - interval '1 day', 'Seed: revoked');


-- Lane A: writing and reading (S1-E3-01 onwards). Two stories for adult_writer (one drawn cover,
-- one automatic) and a draft for teen_17, so the demo and every test have something to open.
-- Fixed IDs and addresses so tests can name them; later stories of the lane add chapters and
-- publish some of them. Titles and blurbs are synthetic, never real users' text.
-- Every story has a rating and an AI answer (S1-E3-06): the first two are All ages, the
-- third is 13+ so the seed has one story a reader's age can hide.
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id,
  cover_kind, cover_design, cover_background, cover_accent, rating, ai_disclosure)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   'statia-meteo-seed01', 'Stația meteo',
   'Bunica mea notează vremea în fiecare dimineață din 1971. În ziua în care a ajuns la spital, am găsit restul săptămânii deja completat.',
   'ro', (select id from public.categories where slug = 'fiction'),
   'drawn', 'waves', 'sky', 'violet', 'all_ages', 'no_ai'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
   'the-girl-who-fixed-radios-seed02', 'The Girl Who Fixed Radios',
   'Ana spends her summer in her grandfather’s repair shop in Ploiești. One old radio keeps picking up a station that stopped broadcasting in 1989, and tonight it said her name.',
   'en', (select id from public.categories where slug = 'fiction'),
   'automatic', null, null, null, 'all_ages', 'no_ai'),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002',
   'scrisori-din-cutia-postala-seed03', 'Scrisori din cutia poștală',
   'Poeme scurte despre un bloc din Brașov și oamenii care trec prin el.',
   'ro', (select id from public.categories where slug = 'poetry'),
   'drawn', 'dots', 'lilac', 'violet', '13_plus', 'no_ai');

-- Their tags, through the same function the app uses, so look-alikes merge the same way.
select public.set_story_tags('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
  array['bunici', 'familie', 'set in Romania']);
select public.set_story_tags('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
  array['mystery', 'set in Romania', 'family']);
select public.set_story_tags('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002',
  array['oraș', 'vecini']);

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

-- A local-only key for the notification email worker (S1-E7-02): the same value goes in
-- EMAIL_WORKER_KEY for the local Pages Functions and the e2e tests. email_worker_url is left unset,
-- so pg_cron never calls out from a developer's machine; staging and production set both by hand.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'email_worker_key') then
    perform vault.create_secret('local-only-email-worker-key-not-for-staging', 'email_worker_key',
      'Key the email worker shows the database (S1-E7-02). Local seed value; staging and production set their own by hand.');
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

-- The owner is on call for removal orders for the next 30 days (S1-E10-09), so the seeded order
-- below alerts someone by name and the On call page has a shift to show. The other staff
-- personas have no on-call permission, so the test of "only people with it take a shift" has
-- someone to refuse.
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values ('00000000-0000-4000-8000-000000000008', 'on_call', '00000000-0000-4000-8000-000000000008');

-- The owner, admin and moderator personas review pictures (ADMIN-2e2a: only holders of the
-- picture review permission see uploaded pictures before readers do and decide picture cases).
-- support and editor don't, so the tests have staff to refuse.
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values
  ('00000000-0000-4000-8000-000000000008', 'picture_review', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000009', 'picture_review', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000010', 'picture_review', '00000000-0000-4000-8000-000000000008');
insert into public.on_call_rota (user_id, starts_at, ends_at, created_by_user_id)
values ('00000000-0000-4000-8000-000000000008', now() - interval '1 hour', now() + interval '30 days',
        '00000000-0000-4000-8000-000000000008');

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

-- People (PEOPLE-1: S1-E5-05 profiles and blocks, S1-E6-05 follows). Synthetic bios for two
-- personas so the profile page has something to show; blocker blocks blocked, so the "blocks
-- everywhere" checks and hand tests have a pair; teen_17 follows adult_writer and their first
-- story, so the follower count and "Following" have something to show.
update public.profiles set bio = 'Scriu povești scurte despre orașe mici și oamenii care le țin minte.'
  where id = '00000000-0000-4000-8000-000000000001';
update public.profiles set bio = 'Poems on the night bus. Mostly about weather.'
  where id = '00000000-0000-4000-8000-000000000015';
insert into public.blocks (user_id, blocked_user_id)
  values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000016');
insert into public.follows_users (user_id, followed_user_id)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');
insert into public.follows_stories (user_id, story_id)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000001');

-- Parental consent (S1-E2-03): kid_14_ok's parent agreed, so the account is active once adults_only
-- is off; kid_14_waiting's parent hasn't answered yet. The token hashes stand for links nobody holds.
insert into public.parental_consents (user_id, parent_email, language, token_hash, status,
  is_guardian_confirmed, decided_at)
values
  ('00000000-0000-4000-8000-000000000003', 'parent.kid14ok@example.com', 'ro',
   encode(extensions.digest('seed-kid-14-ok-consent', 'sha256'), 'hex'), 'agreed', true, now()),
  ('00000000-0000-4000-8000-000000000004', 'parent.kid14waiting@example.com', 'ro',
   encode(extensions.digest('seed-kid-14-waiting-consent', 'sha256'), 'hex'), 'waiting', false, null);

-- Onboarding (S1-E2-06): every persona has set up already, so the steps and the "Finish setting up"
-- notice never get in a test's way. e2e/onboarding.spec.ts makes its own new accounts.
update public.profiles set onboarded_at = now() where onboarded_at is null;

-- Teacher badge (S1-E2-11): the teacher persona holds the badge through an approved school email
-- check, so class spaces (S1-E8-11) and the profile's "Teacher" have someone to show; the
-- moderator persona holds the teacher checks permission, so Schools › Teacher checks has a
-- moderator who may use it (support and content editor stay refused).
update public.profiles set teacher_badge_since = now() where id = '00000000-0000-4000-8000-000000000007';
insert into public.teacher_checks (user_id, way, school_domain, status, decided_at)
values ('00000000-0000-4000-8000-000000000007', 'school_email', 'liceul-exemplu.edu.ro', 'approved', now());
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values ('00000000-0000-4000-8000-000000000010', 'teacher_checks', '00000000-0000-4000-8000-000000000008');

-- Private messages (S1-E9-01): one accepted chat between teacher and adult_writer, so Messages has
-- something to show on staging and in screenshots. Tests that need their own chats make them.
insert into public.conversations (id, user_id, recipient_user_id, status, accepted_at, last_message_at)
values ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000007',
        '00000000-0000-4000-8000-000000000001', 'accepted', now() - interval '2 hours', now() - interval '1 hour');
insert into public.conversation_members (conversation_id, user_id, last_read_at)
values ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000007', now() - interval '1 hour'),
       ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000001', now() - interval '1 hour');
insert into public.messages (conversation_id, user_id, body, created_at)
values ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000007',
        'Hi! My class is reading your story this week. Would you answer a few questions from them?', now() - interval '2 hours'),
       ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000001',
        'Of course. Send them over whenever you like.', now() - interval '90 minutes'),
       ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000007',
        'Thank you! I’ll collect them on Friday.', now() - interval '1 hour');

-- Spaces (S1-E8-06): a 16+ space by adult_writer and an under-16 space by kid_14_ok, so /spaces
-- and the forum index's Spaces card have something to show. supabase/staging-topups/FORUMS-2a.sql
-- holds the same block for staging; change both together.
do $$
begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001') then
    raise notice 'No seed personas here: nothing to do.';
    return;
  end if;

  -- 1. The spaces: a 16+ one by adult_writer (members-only posting, the owner approves) and an
  --    under-16 one by kid_14_ok (read by its members only, anyone under 16 may post and join).
  insert into public.spaces (id, user_id, slug, name, name_key, description, rules, age_group, readers, posting, joining, banner)
  values
    ('00000000-0000-4000-a000-000000000a01', '00000000-0000-4000-8000-000000000001', 'fantasy-writers-circle',
     'Fantasy writers’ circle', public.space_name_key('Fantasy writers’ circle'),
     'For people who write fantasy: magic systems, invented worlds and stories based on Romanian folklore. Share chapters, ask for feedback and take part in the monthly prompt.',
     E'Fantasy only. Science fiction goes in the main forums.\nWhen you ask for feedback, say what kind you want.\nMark spoilers for published books.',
     '16_plus', 'everybody', 'members', 'approve', 'plum'),
    ('00000000-0000-4000-a000-000000000a02', '00000000-0000-4000-8000-000000000003', 'young-poets',
     'Young poets', public.space_name_key('Young poets'),
     'Poems by and for writers under 16. Post one, read others, say something kind.',
     E'Poems only.\nBe kind and specific.',
     'under_16', 'members', 'anyone', 'open', 'butter')
  on conflict (id) do nothing;

  -- 2. Each space's hidden forum, named after it.
  insert into public.forums (id, slug, space_id)
  values ('00000000-0000-4000-a000-000000000a11', 'space-fantasy-writers-circle', '00000000-0000-4000-a000-000000000a01'),
         ('00000000-0000-4000-a000-000000000a12', 'space-young-poets', '00000000-0000-4000-a000-000000000a02')
  on conflict (id) do nothing;
  perform public.write_space_forum_names('00000000-0000-4000-a000-000000000a01', 'Fantasy writers’ circle');
  perform public.write_space_forum_names('00000000-0000-4000-a000-000000000a02', 'Young poets');

  -- 3. The owners, and teacher as a member of the 16+ space.
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-a000-000000000a01', 'owner', 'active', now()),
         ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-a000-000000000a02', 'owner', 'active', now()),
         ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-a000-000000000a01', 'member', 'active', now())
  on conflict on constraint space_members_once do nothing;
end;
$$;

-- Featured this week (S1-E5-10, LOOK-4a): two picks, so Discover shows the band locally. Picked by
-- the admin persona from the first two All ages stories that may be featured (adult_writer's).
insert into public.featured_picks (story_id, position, user_id)
select picked.id, picked.place, '00000000-0000-4000-8000-000000000009'
from (
  select stories.id, row_number() over (order by stories.id)::integer as place
  from public.stories
  where stories.rating = 'all_ages' and public.featured_ineligible_reason(stories.id) is null
  order by stories.id
  limit 2
) as picked
where not exists (select 1 from public.featured_picks where removed_at is null);
