-- Database tests for the staff dashboard and the "sign in again" message (bundle DASH-1).
-- What it proves:
-- - staff_dashboard() refuses a member and a visitor (42501), and a staff member whose session
--   is older than staff_session_hours;
-- - each role gets numbers only for the areas it may open: the owner gets every key, a
--   moderator gets moderation and appeals but no data requests or logs, support gets data
--   requests and support tickets but no moderation;
-- - the numbers are counts: a new open report adds one to "waiting", and a report past its
--   deadline adds one to "overdue";
-- - my_staff_session_ended() is false for a member and a fresh staff session, and true for a
--   staff session older than 12 hours; a visitor can't call it.
-- Policies: this bundle adds no table and no policy.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Persona IDs (supabase/README.md).
create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support;
grant select on ids to authenticated, anon;

-- A sign-in as Supabase's tokens carry it, optionally with the session_id of an auth.sessions row.
create function pg_temp.sign_in_as(user_id uuid, session_id uuid default null) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated', 'session_id', session_id)::text, true);
$$;

-- Two sessions for the admin: one fresh, one 13 hours old.
insert into auth.sessions (id, user_id, created_at, updated_at)
values ('20000000-0000-4000-8000-000000000001', (select admin from ids), now(), now()),
       ('20000000-0000-4000-8000-000000000002', (select admin from ids), now() - interval '13 hours', now());

/* ---------- 1. Who may ask ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select throws_ok($$ select public.staff_dashboard() $$, '42501', null,
  'a member gets no dashboard');
select is(public.my_staff_session_ended(), false,
  'a member is never told their staff session ended');

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok($$ select public.staff_dashboard() $$, '42501', null,
  'a visitor can''t ask for the dashboard');
select throws_ok($$ select public.my_staff_session_ended() $$, '42501', null,
  'a visitor can''t ask whether a staff session ended');

/* ---------- 2. The session's age ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select admin from ids), '20000000-0000-4000-8000-000000000001');
select is(public.my_staff_session_ended(), false, 'a fresh staff session has not ended');
select ok(public.staff_dashboard() ? 'moderation', 'a fresh staff session gets its numbers');

select pg_temp.sign_in_as((select admin from ids), '20000000-0000-4000-8000-000000000002');
select is(public.my_staff_session_ended(), true,
  'a staff session older than 12 hours has ended, so the page can ask for a new sign-in');
select throws_ok($$ select public.staff_dashboard() $$, '42501', null,
  'an ended staff session gets no numbers');

/* ---------- 3. Each role sees only its own areas ---------- */

select pg_temp.sign_in_as((select owner from ids));
select ok(
  public.staff_dashboard() ?& array['moderation', 'appeals', 'schools', 'dataRequests',
    'supportTickets', 'metrics', 'logs'],
  'the owner gets the numbers of every area');

select pg_temp.sign_in_as((select moderator from ids));
select ok(public.staff_dashboard() ?& array['moderation', 'appeals'],
  'a moderator gets the moderation and appeals numbers');
select ok(not (public.staff_dashboard() ?| array['dataRequests', 'supportTickets', 'logs']),
  'a moderator gets no data request, support ticket or log numbers');

select pg_temp.sign_in_as((select support from ids));
select ok(public.staff_dashboard() ?& array['dataRequests', 'supportTickets'],
  'support gets the data request and support ticket numbers');
select ok(not (public.staff_dashboard() ?| array['moderation', 'appeals', 'logs']),
  'support learns nothing about the moderation queue, appeals or logs');

/* ---------- 4. The numbers are counts of open work ---------- */

select pg_temp.sign_in_as((select owner from ids));
create temp table before_numbers as
  select (public.staff_dashboard() -> 'moderation') as moderation;
grant select on before_numbers to authenticated;

-- Two open reports (the counts read only the case rows, so the items need not exist): one due
-- tomorrow, one already past its deadline.
reset role;
insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
values ('D-309001', (select adult_writer from ids), 'comment', gen_random_uuid(),
        'report', 'two_days', now() + interval '1 day'),
       ('D-309002', (select adult_writer from ids), 'comment', gen_random_uuid(),
        'report', 'two_days', now() - interval '1 hour');

set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select is(
  (public.staff_dashboard() -> 'moderation' ->> 'waiting')::integer,
  (select (moderation ->> 'waiting')::integer + 2 from before_numbers),
  'two new open reports add two to "waiting"');
select is(
  (public.staff_dashboard() -> 'moderation' ->> 'overdue')::integer,
  (select (moderation ->> 'overdue')::integer + 1 from before_numbers),
  'the report past its deadline adds one to "overdue"');
select ok(
  jsonb_typeof(public.staff_dashboard() -> 'logs' -> 'failedCalls') = 'number',
  'the log numbers are plain counts');

select * from finish();
rollback;
