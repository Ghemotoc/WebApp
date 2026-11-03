-- Database tests for the picture check on upload (story S1-E10-05; CLAUDE.md rules 1, 6, 19).
-- What it proves:
-- - a picture is private until its check: signed-out visitors and other members can't read the
--   file, the uploader and moderation staff can (criterion 1);
-- - only a result signed with the Vault secret counts, so nobody can mark their own picture passed;
-- - both checks pass: the picture shows, and a profile picture becomes the profile's (criterion 2);
-- - a check flags it: held, a picture_check case opens, readers see "being checked" and the
--   uploader "waiting for a person" (criterion 3); an Arachnid Shield match is a same-day
--   safeguarding case, preserved six months, that only safeguarding staff see (criterion 4);
-- - a service that is down leaves it pending and private;
-- - the moderator's decision: no action approves it, remove removes it with a statement of reasons;
-- - an uploaded cover must be a picture the writer registered;
-- - the shared reporting contract has its picture branches;
-- - policies picture_checks_select_own, picture_checks_select_moderation, avatars_insert_own,
--   pictures_select_visible and pictures_select_uploader_and_staff: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- A result as server/picture-check.ts signs it, with the test secret below.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-picture-secret', 'sha256'), 'hex');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Uploads on, the signing secret in Vault, and two files adult_writer (…01) uploaded: a profile
-- picture and a cover under their first seed story. blocker (…15) uploaded one too.
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';
insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', '11111111-1111-4111-8111-111111111111.png', '00000000-0000-4000-8000-000000000001'),
  ('avatars', '22222222-2222-4222-8222-222222222222.png', '00000000-0000-4000-8000-000000000001'),
  ('avatars', '33333333-3333-4333-8333-333333333333.png', '00000000-0000-4000-8000-000000000015'),
  ('covers', '00000000-0000-4000-9000-000000000001/tall.png', '00000000-0000-4000-8000-000000000001');

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. Registering, private until checked (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values ('avatar', public.register_picture('avatars', '11111111-1111-4111-8111-111111111111.png', 'avatar'));
insert into named values ('match', public.register_picture('avatars', '22222222-2222-4222-8222-222222222222.png', 'avatar'));
insert into named values ('cover', public.register_picture('covers', '00000000-0000-4000-9000-000000000001/tall.png', 'cover'));
select is((select status::text from public.picture_checks where id = (select id from named where label = 'avatar')), 'pending',
  'a registered picture starts pending');
select throws_ok($$ select public.register_picture('avatars', '33333333-3333-4333-8333-333333333333.png', 'avatar') $$,
  '23514', null, 'nobody can register a file someone else uploaded');
select throws_ok($$ select public.register_picture('covers', '00000000-0000-4000-9000-000000000001/tall.png', 'avatar') $$,
  '23514', null, 'a cover path can''t be registered as a profile picture');
select is((select count(*)::integer from public.picture_checks where user_id = '00000000-0000-4000-8000-000000000001'), 3,
  'allowed: picture_checks_select_own: the uploader reads their own pictures'' checks');
select is((select count(*)::integer from storage.objects where name = '11111111-1111-4111-8111-111111111111.png'), 1,
  'allowed: pictures_select_uploader_and_staff: the uploader reads their own pending picture');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.picture_checks where user_id = '00000000-0000-4000-8000-000000000001'), 0,
  'denied: picture_checks_select_own: another member reads nobody else''s checks');
select is((select count(*)::integer from storage.objects where name = '11111111-1111-4111-8111-111111111111.png'), 0,
  'denied: pictures_select_uploader_and_staff: another member can''t read a pending picture');
select pg_temp.sign_out();
select is((select count(*)::integer from storage.objects where name = '11111111-1111-4111-8111-111111111111.png'), 0,
  'denied: pictures_select_visible: a signed-out visitor can''t read a pending picture');

/* ---------- 2. Profile pictures can't be uploaded (ADMIN-2g) ---------- */

-- Avatars are built or initials only since ADMIN-2g (Robert, 2 Nov 2026): no insert policy is left.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('avatars', '44444444-4444-4444-8444-444444444444.webp') $$,
  '42501', null, 'a member can''t upload a profile picture any more');

/* ---------- 3. The signed result ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(format($$ select public.record_picture_check(%L, 'not-a-signature') $$,
    json_build_object('pictureId', (select id from named where label = 'avatar'), 'outcome', 'passed')::text),
  '42501', null, 'a result not signed with the secret is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select throws_ok(format($$ select public.record_picture_check(%L, pg_temp.signed(%L)) $$,
    json_build_object('pictureId', (select id from named where label = 'avatar'), 'outcome', 'passed')::text,
    json_build_object('pictureId', (select id from named where label = 'avatar'), 'outcome', 'passed')::text),
  '42501', null, 'another member can''t record a result for someone else''s picture');

/* ---------- 4. Passed (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table payloads (label text primary key, body text) on commit drop;
grant all on payloads to anon, authenticated;
insert into payloads values
  ('down', json_build_object('pictureId', (select id from named where label = 'cover'), 'outcome', 'unavailable')::text),
  ('pass', json_build_object('pictureId', (select id from named where label = 'avatar'), 'outcome', 'passed',
     'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text),
  ('match', json_build_object('pictureId', (select id from named where label = 'match'), 'outcome', 'flagged',
     'provider', 'stub', 'isKnownAbuseMatch', true, 'flags', json_build_object('arachnid', 'match'))::text);
select is(public.record_picture_check((select body from payloads where label = 'down'),
    pg_temp.signed((select body from payloads where label = 'down')))::text, 'pending',
  'a service that is down leaves the picture pending');
select is((select attempts from public.picture_checks where id = (select id from named where label = 'cover')), 1,
  'and counts the attempt, so the screen can try again');
select is((select count(*)::integer from public.my_pending_pictures()), 3,
  'my_pending_pictures lists the three still waiting');
select is(public.record_picture_check((select body from payloads where label = 'pass'),
    pg_temp.signed((select body from payloads where label = 'pass')))::text, 'passed',
  'both checks pass: the picture passes');
select is((select avatar_picture_id from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  (select id from named where label = 'avatar'), 'and becomes the profile''s picture');
select pg_temp.sign_out();
select is((select count(*)::integer from storage.objects where name = '11111111-1111-4111-8111-111111111111.png'), 1,
  'allowed: pictures_select_visible: a signed-out visitor reads a passed picture');
select is(public.profile_avatar_picture('adult_writer') ->> 'state', 'visible', 'the profile shows it as visible');
select is(public.profile_avatar_picture('adult_writer') ->> 'path', '11111111-1111-4111-8111-111111111111.png',
  'with the file''s path, for a signed URL');

/* ---------- 5. Flagged: an Arachnid Shield match (criteria 3 and 4) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.record_picture_check((select body from payloads where label = 'match'),
    pg_temp.signed((select body from payloads where label = 'match')))::text, 'held',
  'a known-abuse match holds the picture');
select is(public.profile_avatar_picture('adult_writer') ->> 'state', 'waiting_for_person',
  'the uploader is told it is waiting for a person');
select is(public.record_picture_check((select body from payloads where label = 'pass'),
    pg_temp.signed((select body from payloads where label = 'pass')))::text, 'passed',
  'a result for a picture already checked changes nothing');
reset role;
insert into named select 'match_case', case_id from public.picture_checks where id = (select id from named where label = 'match');
select results_eq(
  $$ select item_type::text, source::text, tier::text, is_safeguarding, preserve_until is null
     from public.cases where id = (select id from named where label = 'match_case') $$,
  $$ values ('picture', 'picture_check', 'same_day', true, true) $$,
  'the match opens a same-day safeguarding picture case; the file isn''t preserved, only its evidence (ADMIN-2e2b)');
select is(public.reportable_item_summary('picture', (select id from named where label = 'match')), 'Profile picture of @adult_writer',
  'the queue says what the picture is');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.picture_checks where id = (select id from named where label = 'match')), 0,
  'denied: picture_checks_select_moderation: an admin without the safeguarding permission doesn''t see a match');
select is((select count(*)::integer from storage.objects where name = '22222222-2222-4222-8222-222222222222.png'), 0,
  'nor its file');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.picture_checks where id = (select id from named where label = 'match')), 1,
  'allowed: picture_checks_select_moderation: the safeguarding moderator sees the match');
select is((select count(*)::integer from storage.objects where name = '22222222-2222-4222-8222-222222222222.png'), 1,
  'allowed: pictures_select_uploader_and_staff: and its file, to decide');
select is(public.admin_case_picture((select id from named where label = 'match_case')) #>> '{flags,arachnid}', 'match',
  'the case page shows what was flagged');

/* ---------- 6. A person decides (criterion 3) ---------- */

select lives_ok($$ select public.admin_decide_case((select id from named where label = 'match_case'), 'remove',
  'Matched a known image; referred under S1-E10-10.', null, 'Your picture broke our rules and was removed.') $$,
  'the moderator removes it');
select is((select status::text from public.picture_checks where id = (select id from named where label = 'match')), 'removed',
  'the picture is removed');
select ok(exists (select 1 from public.statements_of_reasons where case_id = (select id from named where label = 'match_case')
    and ground_key = 'picture_check' and automated_detection),
  'with a statement of reasons that says an automated check found it');
reset role;
select is((select avatar_picture_id from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  (select id from named where label = 'avatar'), 'the passed profile picture stays the profile''s');

-- A nudity flag on the cover, then approved.
reset role;
update public.picture_checks set status = 'pending' where id = (select id from named where label = 'cover');
insert into payloads values ('nudity', json_build_object('pictureId', (select id from named where label = 'cover'),
  'outcome', 'flagged', 'provider', 'stub', 'flags', json_build_object('nudity', 0.97))::text);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.record_picture_check((select body from payloads where label = 'nudity'),
    pg_temp.signed((select body from payloads where label = 'nudity')))::text, 'held', 'a nudity flag holds the cover');
select lives_ok($$ select public.update_my_story('statia-meteo-seed01',
  '{"cover": {"kind": "upload", "tall_path": "00000000-0000-4000-9000-000000000001/tall.png"}}'::jsonb) $$,
  'the writer may set the registered picture as the cover');
select throws_ok($$ select public.update_my_story('statia-meteo-seed01',
  '{"cover": {"kind": "upload", "tall_path": "00000000-0000-4000-9000-000000000001/other.png"}}'::jsonb) $$,
  '23514', null, 'but not a file that skipped the check');
reset role;
update public.stories set first_published_at = now() where id = '00000000-0000-4000-9000-000000000001';
insert into named select 'cover_case', case_id from public.picture_checks where id = (select id from named where label = 'cover');
select pg_temp.sign_out();
select is(public.story_cover_picture('statia-meteo-seed01'), '{"state": "waiting_for_person", "bucket": null, "path": null}'::jsonb,
  'readers see only that the cover is being checked, never the file');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok($$ select public.admin_decide_case((select id from named where label = 'cover_case'), 'no_action',
  'A painting; not nudity.') $$, 'the moderator approves it');
select pg_temp.sign_out();
select is(public.story_cover_picture('statia-meteo-seed01') ->> 'state', 'visible', 'and the cover shows to readers');

/* ---------- 7. The shared reporting contract (rule 6) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok(format($$ select * from public.report_item('picture', %L, 'other', 'Not a cover') $$,
    (select id from named where label = 'cover')),
  'a visible picture can be reported');
select throws_ok(format($$ select * from public.report_item('picture', %L, 'other', null) $$,
    (select id from named where label = 'match')),
  '23514', null, 'a removed picture can''t: its existence never leaks');

select * from finish();

rollback;
