-- Database tests for the Seasonal looks page and staff uploads (bundle G12a; the canvas's
-- StaffWebsiteSeasonal board).
-- What it proves:
-- - an admin changes when each seasonal look shows, and the change is in the audit log;
-- - a moderator and a member can't (admin_set_seasonal_look_dates is owner and admin only);
-- - a set with a missing look, a day that doesn't exist or two windows on the same day is refused;
--   a window across the new year is fine; extra parts are left out of what is saved;
-- - a picture staff upload for the website skips the moderator step; a sponsor creative and a
--   picture on an All ages story still wait for one.
-- Personas: adult_writer (…01), admin (…09), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Who changes the dates ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(
  public.admin_set_seasonal_look_dates('[{"look": "winter", "from": "12-01", "to": "02-29"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}, {"look": "autumn", "from": "09-01", "to": "11-30"}]'::jsonb) -> 0 ->> 'from',
  '12-01', 'an admin moves the start of winter to 1 December, across the new year');
reset role;
select is((select value -> 0 ->> 'from' from public.settings where key = 'seasonal_look_dates'), '12-01',
  'and the public setting holds the new dates');
select is((select count(*)::int from public.audit_log where action = 'website.seasonal_looks' and created_at >= now()), 1,
  'and the change is in the audit log');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_set_seasonal_look_dates((select value from public.settings where key = 'seasonal_look_dates')) $$,
  '42501', null, 'a moderator can''t change the dates');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_seasonal_look_dates('[]'::jsonb) $$,
  '42501', null, 'a member can''t change the dates');

/* ---------- 2. What can be saved ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_like($$ select public.admin_set_seasonal_look_dates('[{"look": "winter", "from": "12-01", "to": "02-28"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}]'::jsonb) $$,
  '%(not_a_list)%', 'a set without autumn is refused');
select throws_like($$ select public.admin_set_seasonal_look_dates('[{"look": "winter", "from": "12-01", "to": "02-30"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}, {"look": "autumn", "from": "09-01", "to": "11-30"}]'::jsonb) $$,
  '%(bad_day)%', 'a day that doesn''t exist (30 February) is refused');
select throws_like($$ select public.admin_set_seasonal_look_dates('[{"look": "winter", "from": "11-15", "to": "02-28"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}, {"look": "autumn", "from": "09-01", "to": "11-30"}]'::jsonb) $$,
  '%(overlap)%', 'winter starting inside autumn is refused');

select is(public.admin_set_seasonal_look_dates('[{"look": "winter", "from": "12-01", "to": "02-29", "note": "<b>extra</b>"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}, {"look": "autumn", "from": "09-01", "to": "11-30"}]'::jsonb) -> 0,
  '{"look": "winter", "from": "12-01", "to": "02-29"}'::jsonb, 'anything beyond the look and its two days is left out of the public setting');

/* ---------- 3. Staff uploads skip the moderator step ---------- */

reset role;
select ok(not public.picture_needs_person(jsonb_populate_record(null::public.picture_checks,
    '{"user_id": "00000000-0000-4000-8000-000000000009", "bucket": "landing-pictures", "kind": "landing_picture"}')),
  'a landing page picture an admin uploads doesn''t wait for a moderator');
select ok(public.picture_needs_person(jsonb_populate_record(null::public.picture_checks,
    '{"user_id": "00000000-0000-4000-8000-000000000009", "bucket": "sponsor-creatives", "kind": "sponsor_creative"}')),
  'a sponsor creative still waits for a moderator');
select ok(public.picture_needs_person(jsonb_populate_record(null::public.picture_checks,
    jsonb_build_object('user_id', '00000000-0000-4000-8000-000000000001', 'bucket', 'covers', 'kind', 'cover',
      'story_id', (select id from public.stories where rating = 'all_ages' limit 1)))),
  'a cover on an All ages story still waits for a moderator');

select * from finish();
rollback;
