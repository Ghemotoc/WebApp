-- Database tests for Moderation › Pictures to check (bundle ADMIN-2, part e1b; Robert's brief of
-- 2 Nov 2026, sections 2 and 3).
-- What it proves:
-- - who waits for a person: a picture in an All ages or 13+ story, and any picture from someone
--   under 16, is held with a picture_review case once the check passes; an adult's picture in a
--   16+ story goes live at once;
-- - lowering a story to 13+ sends its live pictures back to a moderator;
-- - the page lists the waiting pictures with the uploader's handle and age group, for the
--   moderation team only;
-- - green approves; yellow raises the story first (never down, never 18+ for a picture from
--   someone under 18, never past what the story owner's age allows); red removes it with a reason
--   from the admin-editable list (no longer "a photograph", PICTURES-1) and a statement of
--   reasons the uploader is told about;
-- - support staff can't decide pictures.
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- A passed result as server/picture-check.ts signs it, with the test secret below.
create function pg_temp.pass(picture_id uuid) returns public.picture_status language plpgsql as $$
declare
  body text := '{"pictureId": "' || picture_id || '", "outcome": "passed", "provider": "stub", "flags": {}, "isKnownAbuseMatch": false}';
begin
  return public.record_picture_check(body, encode(extensions.hmac(body, 'test-picture-secret', 'sha256'), 'hex'));
end;
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
create function pg_temp.status_of(picture_id text) returns text language sql as $$
  select status::text from public.picture_checks where id = picture_id::uuid;
$$;
create function pg_temp.case_of(picture_id text) returns uuid language sql as $$
  select case_id from public.picture_checks where id = picture_id::uuid;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

-- Stories: adult_writer's (…01) seed story 1 is All ages; a new 16+ story of theirs; teen_17's
-- (…02) 13+ story. Pictures (…9000…00248N): an adult's cover in the 16+ story (1) and in the
-- All ages story (2); kid_14_ok's (…03) profile picture (3); teen_17's cover (4).
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, content_note)
values
  ('00000000-0000-4000-9000-000000002481', '00000000-0000-4000-8000-000000000001', 'adult-story-t248', 'Zidul',
   'ro', (select id from public.categories where slug = 'fiction'), '16_plus', 'Violență.'),
  ('00000000-0000-4000-9000-000000002482', '00000000-0000-4000-8000-000000000002', 'teen-story-t248', 'Late bus',
   'en', (select id from public.categories where slug = 'fiction'), '13_plus', '');
insert into public.picture_checks (id, user_id, bucket, path, kind, story_id) values
  ('00000000-0000-4000-9000-000000002481', '00000000-0000-4000-8000-000000000001', 'covers',
   '00000000-0000-4000-9000-000000002481/a.png', 'cover', '00000000-0000-4000-9000-000000002481'),
  ('00000000-0000-4000-9000-000000002482', '00000000-0000-4000-8000-000000000001', 'covers',
   '00000000-0000-4000-9000-000000000001/b.png', 'cover', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-9000-000000002483', '00000000-0000-4000-8000-000000000003', 'avatars',
   '48484848-4848-4848-8484-484848484848.png', 'avatar', null),
  ('00000000-0000-4000-9000-000000002484', '00000000-0000-4000-8000-000000000002', 'covers',
   '00000000-0000-4000-9000-000000002482/d.png', 'cover', '00000000-0000-4000-9000-000000002482');

/* ---------- 1. Who waits for a person ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.pass('00000000-0000-4000-9000-000000002481')::text, 'passed',
  'an adult''s picture in a 16+ story goes live once the check passes');
select is(pg_temp.pass('00000000-0000-4000-9000-000000002482')::text, 'held',
  'a picture in an All ages story waits for a moderator');
reset role;
select is((select source::text from public.cases where id = pg_temp.case_of('00000000-0000-4000-9000-000000002482')),
  'picture_review', 'with a picture_review case, not a picture_check one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.pass('00000000-0000-4000-9000-000000002483')::text, 'held',
  'any picture from someone under 16 waits for a moderator');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.pass('00000000-0000-4000-9000-000000002484')::text, 'held',
  'a 17-year-old''s cover in a 13+ story waits too');

/* ---------- 2. The list ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.admin_pictures_to_check() as item
           where item ->> 'pictureId' like '00000000-0000-4000-9000-00000000248%'), 3,
  'the moderation team sees the three waiting pictures');
select is((select item ->> 'uploaderAgeBand' from public.admin_pictures_to_check() as item
           where item ->> 'pictureId' = '00000000-0000-4000-9000-000000002483'), '13_to_15',
  'with the uploader''s age group, never their year of birth');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_pictures_to_check() $$, '42501', null,
  'a member can''t see the list');
select is((select count(*)::integer from public.settings where key = 'picture_reject_reasons' and is_public), 0,
  'the reject reasons are a staff setting');

/* ---------- 3. Green ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok(format($$ select public.admin_approve_picture(%L, 'Hand-drawn landscape.') $$,
  pg_temp.case_of('00000000-0000-4000-9000-000000002482')), 'a moderator approves a picture');
select is(pg_temp.status_of('00000000-0000-4000-9000-000000002482'), 'approved', 'and it shows');

/* ---------- 4. A lower rating sends pictures back ---------- */

reset role;
update public.stories set rating = '13_plus' where id = '00000000-0000-4000-9000-000000002481';
select is(pg_temp.status_of('00000000-0000-4000-9000-000000002481'), 'held',
  'lowering a story to 13+ holds its live cover again');

/* ---------- 5. Yellow ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok(format($$ select public.admin_approve_picture(%L, 'Clothed, suggestive drawing.', '16_plus') $$,
  pg_temp.case_of('00000000-0000-4000-9000-000000002481')), 'a moderator approves and raises the rating');
reset role;
select is((select rating::text from public.stories where id = '00000000-0000-4000-9000-000000002481'), '16_plus',
  'the story is now 16+');
select is((select count(*)::integer from public.statements_of_reasons
           where story_id = '00000000-0000-4000-9000-000000002481'), 1,
  'and the writer gets a statement of reasons for the raised rating');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.error_hint(format($$ select public.admin_approve_picture(%L, 'Nudity.', '18_plus') $$,
    pg_temp.case_of('00000000-0000-4000-9000-000000002484'))), 'uploader_under_18',
  'a picture from someone under 18 can''t make a story 18+');
select throws_ok(format($$ select public.admin_approve_picture(%L, 'Suggestive.', '16_plus') $$,
    pg_temp.case_of('00000000-0000-4000-9000-000000002483')), '23514', null,
  'a profile picture has no story to raise');

/* ---------- 6. Red ---------- */

select throws_ok(format($$ select public.admin_reject_picture(%L, 'nonsense', 'Removed.', 'Photo.') $$,
    pg_temp.case_of('00000000-0000-4000-9000-000000002483')), '23514', null,
  'a reject needs a reason from the list');
select throws_ok(format($$ select public.admin_reject_picture(%L, 'photograph', 'Removed.', 'Photo.') $$,
    pg_temp.case_of('00000000-0000-4000-9000-000000002483')), '23514', null,
  'a photograph is no longer a reason to reject: photos of places and things are allowed (PICTURES-1)');
select lives_ok(format($$ select public.admin_reject_picture(%L, 'real_person',
    'Your picture wasn''t approved because it doesn''t follow our community guidelines.', 'A photo of a face.') $$,
  pg_temp.case_of('00000000-0000-4000-9000-000000002483')), 'a moderator rejects a picture of a real person');
select is(pg_temp.status_of('00000000-0000-4000-9000-000000002483'), 'removed', 'the picture is removed');
select is((select ground_key from public.statements_of_reasons
           where case_id = pg_temp.case_of('00000000-0000-4000-9000-000000002483')), 'picture_check',
  'the uploader''s statement names the picture rules');

/* ---------- 7. Support can't decide ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok(format($$ select public.admin_approve_picture(%L, 'Fine.') $$,
    pg_temp.case_of('00000000-0000-4000-9000-000000002484')), '42501', null,
  'support staff can''t decide a picture');

select * from finish();
rollback;
