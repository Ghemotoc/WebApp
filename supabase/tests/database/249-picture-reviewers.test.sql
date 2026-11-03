-- Database tests for who may review pictures and the alert when staff open one (bundle ADMIN-2,
-- part e2a; Robert's brief of 2 Nov 2026, section 5).
-- What it proves:
-- - the picture review permission is refused for a staff member under 18 and for an intern, and
--   marking someone an intern takes it away;
-- - only reviewers list Pictures to check, read a waiting picture's file, see it on a case page
--   and decide a picture case;
-- - handing out a picture's file writes 'picture.opened' to the audit log once per ten minutes and
--   alerts every owner and the usernames in picture_open_alert_handles, by email too;
-- - the intern markers' read policies.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- A fresh password sign-in, as Supabase's tokens carry it in "amr": staff changes need one.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password',
                                                     'timestamp', extract(epoch from now())::bigint)))::text, true);
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
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

-- Staff for this test: support (…11) also gets the moderator role but no picture review, and
-- teen_17 (…02) gets the moderator role, to prove the age rule. Owner …08, admin …09 and
-- moderator …10 review pictures (seed.sql).
insert into public.staff_roles (user_id, role) values
  ('00000000-0000-4000-8000-000000000011', 'moderator'),
  ('00000000-0000-4000-8000-000000000002', 'moderator');

-- Two pictures by adult_writer (…01) in their All ages seed story: both wait for a person.
insert into public.picture_checks (id, user_id, bucket, path, kind, story_id) values
  ('00000000-0000-4000-9000-000000002491', '00000000-0000-4000-8000-000000000001', 'covers',
   '00000000-0000-4000-9000-000000000001/t249a.png', 'cover', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-9000-000000002492', '00000000-0000-4000-8000-000000000001', 'covers',
   '00000000-0000-4000-9000-000000000001/t249b.png', 'cover', '00000000-0000-4000-9000-000000000001');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select pg_temp.pass('00000000-0000-4000-9000-000000002491');
select pg_temp.pass('00000000-0000-4000-9000-000000002492');
reset role;

/* ---------- 1. Giving the permission ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.error_hint($$select public.admin_set_permission('00000000-0000-4000-8000-000000000002',
    'picture_review', true, 'Joining the picture team.')$$), 'picture_review_not_allowed',
  'a staff member under 18 can never get picture review');
select is(public.admin_set_permission('00000000-0000-4000-8000-000000000011', 'picture_review', true,
    'Joining the picture team.'), true,
  'an adult staff member who isn''t an intern can get picture review');
select is(public.admin_set_intern('00000000-0000-4000-8000-000000000011', true, 'Summer intern.'), true,
  'an admin marks a staff member as an intern');
reset role;
select is((select count(*)::integer from public.staff_permissions
           where user_id = '00000000-0000-4000-8000-000000000011' and permission = 'picture_review'), 0,
  'marking someone an intern takes picture review away');
select is((select count(*)::integer from public.audit_log
           where action in ('staff.intern_marked', 'staff.permission_removed')
             and target_user_id = '00000000-0000-4000-8000-000000000011'), 2,
  'the marker and the removed permission are both in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.error_hint($$select public.admin_set_permission('00000000-0000-4000-8000-000000000011',
    'picture_review', true, 'Back on the team.')$$), 'picture_review_not_allowed',
  'an intern can never get picture review');
select is((select is_intern from public.admin_list_staff() where handle = 'support'), true,
  'the staff list shows the intern marker');

/* ---------- 2. Reading the intern markers ---------- */

select is((select count(*)::integer from public.staff_interns), 1,
  'allowed: staff_interns_select_roles: an admin reads every intern marker');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.staff_interns), 0,
  'denied: staff_interns_select_roles: a moderator reads nobody else''s marker');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.staff_interns), 1,
  'allowed: staff_interns_select_own: an intern reads their own marker');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.staff_interns), 0,
  'denied: staff_interns_select_own: a member reads no marker');

/* ---------- 3. Only reviewers see and decide pictures ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(pg_temp.error_hint('select public.admin_pictures_to_check()'), 'not_picture_reviewer',
  'a moderator without picture review can''t open Pictures to check');
select is(public.picture_reader_may_see('covers', '00000000-0000-4000-9000-000000000001/t249a.png'), false,
  'a moderator without picture review can''t read a waiting picture''s file');
select is(public.admin_case_picture((select case_id from public.picture_checks
                                     where id = '00000000-0000-4000-9000-000000002491')) ->> 'canSee', 'false',
  'the case page tells a moderator without picture review they can''t see the picture');
select is(pg_temp.error_hint($$select public.admin_decide_case((select case_id from public.picture_checks
    where id = '00000000-0000-4000-9000-000000002491'), 'no_action', 'Looks fine.')$$), 'not_picture_reviewer',
  'a moderator without picture review can''t decide a picture case from the queue');

/* ---------- 4. Opening a picture is logged and alerted ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.picture_reader_may_see('covers', '00000000-0000-4000-9000-000000000001/t249a.png'), true,
  'a picture reviewer reads a waiting picture''s file');
select is((select count(*)::integer from public.admin_pictures_to_check() as listed
           where listed ->> 'pictureId' like '00000000-0000-4000-9000-00000000249%'), 2,
  'a picture reviewer sees both waiting pictures');
select count(*) from public.admin_pictures_to_check();
reset role;
select is((select count(*)::integer from public.audit_log
           where action = 'picture.opened' and user_id = '00000000-0000-4000-8000-000000000010'
             and target_id like '00000000-0000-4000-9000-00000000249%'), 2,
  'each picture handed out is in the audit log once, even when the page loads again');
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000008' and kind = 'picture_opened_by_staff'), 1,
  'the owner gets one alert for the moderator''s openings this hour');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000008', 'picture_opened_by_staff'), 'required',
  'the alert is always emailed');
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000009' and kind = 'picture_opened_by_staff'), 0,
  'an admin who isn''t in the setting isn''t alerted');

update public.settings set value = '["admin"]'::jsonb where key = 'picture_open_alert_handles';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select public.admin_case_picture((select case_id from public.picture_checks
                                  where id = '00000000-0000-4000-9000-000000002492'));
reset role;
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000009' and kind = 'picture_opened_by_staff'), 1,
  'a username added to picture_open_alert_handles is alerted too');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(jsonb_array_length(public.admin_recent_picture_openings()) >= 2, true,
  'the owner''s staff home lists who opened pictures this week');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_recent_picture_openings(), null,
  'someone who isn''t alerted doesn''t see the list');
select is(public.admin_decide_case((select case_id from public.picture_checks
    where id = '00000000-0000-4000-9000-000000002491'), 'no_action', 'A drawing of a lighthouse.'), true,
  'a picture reviewer decides a picture case from the queue');

select * from finish();
rollback;
