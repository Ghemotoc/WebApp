-- Database tests for staff uploads (bundle G12a) and the removed Seasonal looks page.
-- What it proves:
-- - the seasonal weeks, and the staff tool that changed them, are gone (flat themes bundle,
--   part 3: the seasonal themes were removed);
-- - a picture staff upload for the website skips the moderator step; a sponsor creative and a
--   picture on an All ages story still wait for one.
-- Personas: adult_writer (…01), admin (…09). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

/* ---------- 1. The seasonal weeks are gone ---------- */

-- The flat themes bundle (part 3) removed the seasonal themes, so the staff tool and the weeks
-- it changed went with them.
select hasnt_function('public', 'admin_set_seasonal_look_dates', array['jsonb'],
  'staff have no seasonal weeks to change any more');
select hasnt_function('public', 'seasonal_window_problem', array['jsonb'],
  'and the check behind that tool is gone too');
select is_empty($$ select key from public.settings where key = 'seasonal_look_dates' $$,
  'and the seasonal weeks are no longer a public setting');

/* ---------- 2. Staff uploads skip the moderator step ---------- */

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
