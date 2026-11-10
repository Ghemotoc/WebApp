-- Database tests for live sessions on the Writers' hub (bundle GAPS-12h; board WritersHub).
-- What it proves:
-- - live_sessions_select_contest_staff: staff with the contests area read the sessions, a member
--   and a visitor read none from the table;
-- - only staff with the contests area add, change and delete a session, each change in the audit
--   log; an empty title, an unknown language, a link that isn't https and a missing start are
--   refused;
-- - writers_hub_sessions() gives the sessions coming up, soonest first, never a past or deleted
--   one and never one for an older age group;
-- - a member asks for a reminder, asking twice changes nothing and it comes off again; a session
--   for an older age group, a past one and an unknown one are refused with one answer, and a
--   signed-out caller is refused;
-- - live_session_reminders_select_own: a member reads their own reminders, another member and
--   staff read none;
-- - the job sends nothing more than an hour before the start, then exactly one
--   'live_session_soon' notification, and never a second one; a member who is no longer old
--   enough gets none; the notification names the session and loses it once the session is
--   deleted;
-- - deleting a session takes its waiting reminders with it;
-- - the reminders are in Download my data and go with the account.
-- Personas: adult_writer (…01), teen_17 (…02), teacher (…07), admin (…09), moderator (…10).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or 'ok' when it runs.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
-- A session as JSON: a title for both languages, how far away it starts and its age group.
create function pg_temp.session(title text, starts_in interval, rating text) returns jsonb language sql as $$
  select jsonb_build_object('title_ro', title, 'title_en', title, 'starts_at', now() + starts_in,
    'language_code', 'en', 'rating', rating, 'place_ro', 'Sala zq', 'place_en', 'Room zq');
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
-- How many 'live_session_soon' notifications a persona has (read as the table's owner).
create function pg_temp.soon_count(persona_id text) returns integer language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = persona_id::uuid and notifications.kind = 'live_session_soon';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The audit log is append-only, so the test counts from what was there before it.
create temporary table audit_before on commit drop as
  select pg_temp.audit_count('live_session.saved') as saved, pg_temp.audit_count('live_session.deleted') as deleted;
-- The sessions this test makes, by a short label.
create temporary table kept (label text primary key, id uuid) on commit drop;
grant select on audit_before to authenticated;
grant select, insert on kept to authenticated;
delete from public.live_sessions;

/* ---------- 1. Who may list a session ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select count(*) from public.live_sessions $$), '42501',
  'a visitor who isn''t logged in can''t read the sessions');
select is(pg_temp.refusal($$ select * from public.writers_hub_sessions() $$), '42501', 'nor through the hub''s function');
select is(pg_temp.refusal($$ select public.set_live_session_reminder(gen_random_uuid(), true) $$), '42501',
  'nor ask for a reminder');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.admin_save_live_session(null, pg_temp.session('Zq', '2 days', 'all_ages')) $$),
  '42501', 'a writer can''t add a session');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select public.admin_save_live_session(null, pg_temp.session('Zq', '2 days', 'all_ages')) $$),
  '42501', 'nor can a moderator, who doesn''t have the contests area');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept select 'later', public.admin_save_live_session(null, pg_temp.session('Later zq', '3 days', 'all_ages'));
insert into kept select 'soon', public.admin_save_live_session(null, pg_temp.session('Soon zq', '2 hours', 'all_ages'));
insert into kept select 'adults', public.admin_save_live_session(null, pg_temp.session('Adults zq', '1 day', '18_plus'));
insert into kept select 'sixteen', public.admin_save_live_session(null, pg_temp.session('Sixteen zq', '4 days', '16_plus'));
select is((select count(*)::integer from public.live_sessions), 4,
  'allowed: live_sessions_select_contest_staff: an admin adds four sessions and reads them');
select is(pg_temp.audit_count('live_session.saved') - (select saved from audit_before), 4, 'each one in the audit log');
select is(pg_temp.refusal($$ select public.admin_save_live_session(null, pg_temp.session('  ', '2 days', 'all_ages')) $$),
  '23514', 'an empty title is refused');
select is(pg_temp.refusal($$ select public.admin_save_live_session(null,
  pg_temp.session('Zq', '2 days', 'all_ages') || '{"language_code": "xx"}') $$), '23514', 'so is an unknown language');
select is(pg_temp.refusal($$ select public.admin_save_live_session(null,
  pg_temp.session('Zq', '2 days', 'all_ages') || '{"link_url": "javascript:alert(1)"}') $$), '23514',
  'and a link that isn''t https');
select is(pg_temp.refusal($$ select public.admin_save_live_session(null,
  pg_temp.session('Zq', '2 days', 'all_ages') - 'starts_at') $$), '23514', 'and a session with no start');
select is(pg_temp.refusal($$ select public.admin_save_live_session(gen_random_uuid(), pg_temp.session('Zq', '2 days', 'all_ages')) $$),
  'P0002', 'changing a session that doesn''t exist is refused');

/* ---------- 2. What the hub shows ---------- */

-- One session that started an hour ago (made as the table's owner, since staff could also list
-- a past one by mistake).
reset role;
insert into public.live_sessions (title_ro, title_en, starts_at, language_code, place_ro, place_en)
values ('Past zq', 'Past zq', now() - interval '1 hour', 'ro', 'Sala', 'Room');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.live_sessions), 0,
  'denied: live_sessions_select_contest_staff: a writer reads nothing from the table');
select is((select string_agg(title_en, ',' order by starts_at) from public.writers_hub_sessions()),
  'Soon zq,Adults zq,Later zq,Sixteen zq',
  'an adult gets the sessions coming up, soonest first, without the one that started');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select string_agg(title_en, ',' order by starts_at) from public.writers_hub_sessions()),
  'Soon zq,Later zq,Sixteen zq', 'a 17-year-old never gets the session for adults');

/* ---------- 3. Remind me ---------- */

select is(pg_temp.refusal(format($$ select public.set_live_session_reminder(%L, true) $$, (select id from kept where label = 'adults'))),
  'P0002', 'a 17-year-old can''t ask for a reminder of the session for adults');
select is(public.set_live_session_reminder((select id from kept where label = 'soon'), true), true,
  'the 17-year-old asks for a reminder of a session for everyone');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_live_session_reminder((select id from kept where label = 'soon'), true)
  and public.set_live_session_reminder((select id from kept where label = 'soon'), true), true,
  'a writer asks for a reminder, and asking twice changes nothing');
select is((select count(*)::integer from public.live_session_reminders), 1,
  'allowed: live_session_reminders_select_own: the writer reads their one reminder, not the 17-year-old''s');
select is((select string_agg(title_en, ',') from public.writers_hub_sessions() where is_reminded), 'Soon zq',
  'the hub marks the session as reminded');
select is(public.set_live_session_reminder((select id from kept where label = 'later'), true)
  and not public.set_live_session_reminder((select id from kept where label = 'later'), false), true,
  'a reminder comes off again');
select is(pg_temp.refusal($$ select public.set_live_session_reminder(null, true) $$), 'P0002',
  'a session with no ID is refused');
select is(pg_temp.refusal($$ select public.set_live_session_reminder(gen_random_uuid(), true) $$), 'P0002',
  'so is an unknown session');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.live_session_reminders), 0,
  'denied: live_session_reminders_select_own: another member reads nobody''s reminders');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.live_session_reminders), 0, 'nor does an admin');

/* ---------- 4. The job ---------- */

reset role;
-- The session then moves to half an hour away and staff make it adults only, so the
-- 17-year-old's reminder is for a session they may no longer see.
select is(public.send_live_session_reminders(), 0, 'two hours before the start the job sends nothing');
update public.live_sessions set starts_at = now() + interval '30 minutes', rating = '18_plus'
where id = (select id from kept where label = 'soon');
select is(public.send_live_session_reminders(), 1, 'half an hour before, it sends the adult''s reminder');
select is(pg_temp.soon_count('00000000-0000-4000-8000-000000000001') || '|' || pg_temp.soon_count('00000000-0000-4000-8000-000000000002'),
  '1|0', 'one notification for the writer and none for the 17-year-old, who is no longer old enough');
select is(public.send_live_session_reminders() || '|' || pg_temp.soon_count('00000000-0000-4000-8000-000000000001'),
  '0|1', 'the job never sends a second one');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select item -> 'live_session' ->> 'title_en' from jsonb_array_elements(public.my_notifications() -> 'notifications') as item
           where item ->> 'kind' = 'live_session_soon'), 'Soon zq', 'the notification names the session');

/* ---------- 5. Deleting a session ---------- */

select public.set_live_session_reminder((select id from kept where label = 'later'), true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_delete_live_session((select id from kept where label = 'later'))
  and public.admin_delete_live_session((select id from kept where label = 'soon')), true, 'an admin deletes two sessions');
select is(pg_temp.audit_count('live_session.deleted') - (select deleted from audit_before), 2, 'both in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.live_session_reminders where notified_at is null)
  || '|' || (select coalesce(item ->> 'live_session', 'none') from jsonb_array_elements(public.my_notifications() -> 'notifications') as item
             where item ->> 'kind' = 'live_session_soon'),
  '0|none', 'the waiting reminder went with its session, and the notification no longer names the deleted one');

/* ---------- 6. Download my data and deleting an account ---------- */

reset role;
select is((select is_included::text from public.data_export_tables() where table_name = 'live_session_reminders')
    || '|' || (select action from public.account_deletion_rules() where table_name = 'live_session_reminders'),
  'true|delete', 'the reminders are in Download my data and go with the account');

select * from finish();
rollback;
