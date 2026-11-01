-- Epic check for S1-E13, privacy and data rights (story S1-E13-QA).
-- It adds no feature: it walks the epic's main journeys through the database, crossing its five
-- stories with each other, with the seed personas the story names.
-- 1. Privacy settings × Download my data (S1-E13-01 × S1-E13-02): kid_14_ok, an under-16, starts
--    on the most private value of every setting, changes one, and the data file holds the change
--    and only kid_14_ok's own rows.
-- 2. Rights don't wait for a parent (S1-E13-01 × S1-E13-02 × S1-E2-03): kid_14_waiting, read-only
--    until a parent agrees, can still make their profile more private and ask for their data
--    (GDPR art. 15 and 25).
-- 3. Download my stories × the clean-ups (S1-E13-05 × S1-E13-04): adult_writer's copies of their
--    data and their stories both go when their seven days are over, and the nightly run records it.
-- 4. Delete my account × Download my data × the clean-ups (S1-E13-03 × S1-E13-02 × S1-E13-04):
--    teen_17 asks for their data, then closes the account; once the 14 days pass the purge
--    deletes the export with everything else, and the nightly clean-ups still run.
-- 5. The two lists agree: every table Download my data names also has a rule in Delete my
--    account, so a new table can't be exported but forgotten on deletion, or the other way round
--    (exports, the copy itself, is the one table only deletion names).
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), kid_14_waiting (…04).
-- Test data: made here and rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- A sign-in as Supabase's tokens carry it, with the log-in time in "amr" (minutes ago), because
-- closing an account needs a fresh log-in (S1-E13-03).
create function pg_temp.sign_in(persona_suffix text, minutes_ago integer default 0) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', '00000000-0000-4000-8000-0000000000' || persona_suffix, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password',
             'timestamp', extract(epoch from now() - make_interval(mins => minutes_ago))::bigint)))::text, true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adults_only keeps minors read-only in March; the journeys run as they will once minors join.
update public.feature_flags set is_enabled = false where key = 'adults_only';
delete from public.rate_limit_events where action in ('data_export', 'stories_export');

/* ---------- 1. An under-16's privacy settings and their data file ---------- */

select pg_temp.sign_in('03');
select is(public.my_privacy_settings() ->> 'profile_audience', 'people_i_follow',
  'kid_14_ok starts with the whole profile kept to people they follow (S1-E13-01, criterion 2)');
select is(public.my_privacy_settings() ->> 'library_audience', 'only_me',
  'and the library kept to themselves');
select is((public.my_privacy_settings() ->> 'shows_online_status')::boolean, false,
  'and online status off');
select lives_ok($$ select public.set_library_audience('people_i_follow') $$,
  'kid_14_ok shows their library to people they follow');
select is(public.my_data_export() #>> '{account,profile,library_visible_to}', 'people_i_follow',
  'the data file holds the new choice (S1-E13-01 × S1-E13-02)');
select is(public.my_data_export() ->> 'user_id', '00000000-0000-4000-8000-000000000003',
  'the data file is kid_14_ok''s own');
select is(
  (select count(*)::integer
   from jsonb_each(public.my_data_export() -> 'tables') as listed,
        jsonb_array_elements(listed.value) as stored
   where stored ? 'user_id' and stored ->> 'user_id' <> '00000000-0000-4000-8000-000000000003'),
  0, 'no row in it belongs to anyone else');

/* ---------- 2. Read-only while a parent hasn't agreed, but the rights still work ---------- */

select pg_temp.sign_in('04');
select lives_ok($$ select public.set_profile_audience('people_i_follow') $$,
  'kid_14_waiting, waiting for a parent, can still make their profile more private (GDPR art. 25)');
select lives_ok($$ select public.request_data_export() $$,
  'and can ask for their data (GDPR art. 15 doesn''t wait for consent; S1-E2-03 × S1-E13-02)');
select is(public.my_data_export() ->> 'user_id', '00000000-0000-4000-8000-000000000004',
  'and gets their own data file');

/* ---------- 3. Both kinds of copy go when their seven days are over ---------- */

select pg_temp.sign_in('01');
select lives_ok($$ select public.request_data_export() $$, 'adult_writer asks for their data (S1-E13-02)');
select is(
  public.request_stories_export('00000000-0000-4000-9000-000000000001') ->> 'outcome', 'new',
  'and for Stația meteo as Word files (S1-E13-05)');
select pg_temp.as_owner();
-- Made and finished seven days ago: both copies are now past their expiry.
update public.exports set state = 'ready', file_size = 1024, story_count = 1, ready_at = now() - interval '8 days',
  expires_at = now() - interval '1 day', created_at = now() - interval '8 days'
where user_id = '00000000-0000-4000-8000-000000000001';
select is(
  (select string_agg(kind::text, ',' order by kind::text) from public.exports
   where user_id = '00000000-0000-4000-8000-000000000001'),
  'all_my_data,my_stories', 'adult_writer has one copy of each kind');
select ok(public.run_retention_jobs() >= 2, 'the nightly clean-up runs (S1-E13-04)');
select is(
  (select count(*)::integer from public.exports where user_id = '00000000-0000-4000-8000-000000000001'),
  0, 'and both expired copies are gone, the stories one as well as the data one (S1-E13-05 × S1-E13-04)');
select ok(
  (select rows_removed >= 2 from public.retention_runs
   where job_name = 'purge_expired_exports' order by ran_at desc limit 1),
  'the run records how many copies it removed');

/* ---------- 4. A closed account's export goes with it after 14 days ---------- */

select pg_temp.sign_in('02', 1);
select lives_ok($$ select public.request_data_export() $$, 'teen_17 asks for their data');
select lives_ok($$ select public.request_account_deletion() $$,
  'then closes the account, with a log-in from a minute ago (S1-E13-03)');
select throws_ok($$ select public.my_data_export() $$, '42501', null,
  'a closing account can''t build a data file; logging in and keeping the account brings it back (known gap in the epic report)');
select pg_temp.as_owner();
update public.account_deletions set requested_at = now() - interval '15 days', delete_after = now() - interval '1 day'
where user_id = '00000000-0000-4000-8000-000000000002' and cancelled_at is null;
select is(public.purge_closed_accounts(), 1, 'once the 14 days pass the nightly job deletes the account');
select is(
  (select count(*)::integer from public.exports where user_id = '00000000-0000-4000-8000-000000000002'),
  0, 'and the export went with it (S1-E13-03 × S1-E13-02)');

/* ---------- 5. Download my data and Delete my account name the same tables ---------- */

-- One table is left out on purpose, as in test 210: exports is the copy itself, so the data file
-- doesn't list it, but deleting an account deletes it.

select is(
  (select coalesce(string_agg(name, ', ' order by name), '') from (
     (select listed.table_name as name from public.data_export_tables() as listed
      except select rules.table_name from public.account_deletion_rules() as rules)
     union
     (select rules.table_name from public.account_deletion_rules() as rules
      except select listed.table_name from public.data_export_tables() as listed)) as differences
   where name <> 'exports'),
  '', 'every table in data_export_tables() has a rule in account_deletion_rules(), and the other way round');

select * from finish();
rollback;
