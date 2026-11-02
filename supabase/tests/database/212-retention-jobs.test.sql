-- Database tests for the retention schedule's clean-up jobs (story S1-E13-04; GDPR art. 5(1)(e)).
-- What it proves:
-- - criterion 2: an account whose email isn't confirmed 7 days after sign-up is deleted, a newer
--   one is kept; expired exports and exports left half-made for a day go, a ready one stays; a
--   picture removed 30 days ago goes, a newer one stays; an account erased for a missing age
--   check loses its other rows too;
-- - criterion 4: daily read and share totals older than 3 years fold into one row per chapter,
--   so the all-time count doesn't change;
-- - the staff records go on their schedule (invites, on-call shifts, moderator mail, safety
--   contact checks, done compliance log entries), and an open compliance entry stays;
-- - the audit log: only the job deletes, only rows older than 3 years; every other change is
--   still refused;
-- - run_retention_jobs() runs them all and records each count; the Storage sweep lists only files
--   no row points at, after the grace time, and only the service role may ask;
-- - policy retention_runs_select_admin: allowed and denied.
-- Personas: adult_writer (…01), owner (…08), admin (…09). Test data: three new sign-ups, exports,
-- pictures, staff records, audit rows, daily totals and Storage rows; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

-- Inserts an account the way Supabase Auth does (as in test 023); returns its user ID.
create function pg_temp.sign_up(email text, days_ago integer) returns uuid language sql as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    email, 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'invite_code', 'PERSONAS-TEST-INVITE', 'birth_year', '1990', 'locale', 'en',
      'accepted_terms_version_id', (
        select versions.id from public.legal_document_versions as versions
        join public.legal_documents as documents on documents.id = versions.document_id
        where documents.slug = 'terms' and versions.language = 'en'),
      'accepted_privacy_version_id', (
        select versions.id from public.legal_document_versions as versions
        join public.legal_documents as documents on documents.id = versions.document_id
        where documents.slug = 'privacy' and versions.language = 'en')),
    now() - make_interval(days => days_ago), now(), '', '', '', '')
  returning id;
$$;
create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', '00000000-0000-4000-8000-0000000000' || persona_suffix, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- Accounts (criterion 2) ---------- */

create temp table people as
select pg_temp.sign_up('unconfirmed.old@example.com', 8) as old_id,
       pg_temp.sign_up('unconfirmed.new@example.com', 6) as new_id,
       pg_temp.sign_up('unchecked@example.com', 0) as unchecked_id;
grant select on people to authenticated;
insert into public.reading_settings (user_id) select unchecked_id from people;

select is(public.purge_unconfirmed_accounts(), 1,
  'an account whose email is still unconfirmed 7 days after sign-up is deleted, and only that one');
select results_eq(
  $$ select profiles.deleted_at is not null, users.email like '%@deleted.invalid'
     from public.profiles join auth.users on users.id = profiles.id
     where profiles.id = (select old_id from people) $$,
  $$ values (true, true) $$,
  'the unconfirmed account becomes an empty tombstone, its email gone');
select is((select deleted_at from public.profiles where id = (select new_id from people)), null,
  'an account signed up 6 days ago still has time to confirm its email');
select is((select count(*)::integer from public.profiles
           where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005')
             and deleted_at is null), 2,
  'the seed personas are never touched');

select public.erase_unchecked_account((select unchecked_id from people));
select is((select count(*)::integer from public.reading_settings where user_id = (select unchecked_id from people)), 0,
  'an account erased for a missing age check loses its other rows, like a deleted account');

/* ---------- Exports and pictures (criterion 2) ---------- */

insert into public.exports (user_id, kind, state, file_name, file_size, ready_at, expires_at, created_at) values
  ('00000000-0000-4000-8000-000000000001', 'all_my_data', 'ready', 'aaaaaaaa-0000-4000-8000-000000000001.zip', 10,
   now() - interval '8 days', now() - interval '1 day', now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000001', 'all_my_data', 'ready', 'aaaaaaaa-0000-4000-8000-000000000002.zip', 10,
   now() - interval '1 day', now() + interval '6 days', now() - interval '1 day');
insert into public.exports (user_id, kind, state, file_name, created_at) values
  ('00000000-0000-4000-8000-000000000001', 'all_my_data', 'building', 'aaaaaaaa-0000-4000-8000-000000000003.zip',
   now() - interval '2 days');

select is(public.purge_expired_exports(), 2, 'an expired export and one left half-made for two days are deleted');
select is((select file_name from public.exports where user_id = '00000000-0000-4000-8000-000000000001'),
  'aaaaaaaa-0000-4000-8000-000000000002.zip', 'a ready export inside its seven days stays');

insert into public.picture_checks (user_id, bucket, path, kind, status, deleted_at) values
  ('00000000-0000-4000-8000-000000000001', 'atlas-images', 'test/removed-long-ago.jpg', 'atlas_image', 'approved', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000001', 'atlas-images', 'test/removed-lately.jpg', 'atlas_image', 'approved', now() - interval '10 days');

select is(public.purge_deleted_pictures(), 1, 'a picture removed more than 30 days ago is deleted');
select is((select count(*)::integer from public.picture_checks where path = 'test/removed-lately.jpg'), 1,
  'a picture removed 10 days ago stays, so it can still be restored');

/* ---------- Staff records ---------- */

insert into public.invites (user_id, code_hash, expires_at, note) values
  ('00000000-0000-4000-8000-000000000009', 'retention-test-old', now() - interval '91 days', 'test: ended long ago'),
  ('00000000-0000-4000-8000-000000000009', 'retention-test-new', now() - interval '30 days', 'test: ended lately');
insert into public.on_call_rota (user_id, starts_at, ends_at, created_by_user_id) values
  ('00000000-0000-4000-8000-000000000008', now() - interval '2 years 1 hour', now() - interval '2 years',
   '00000000-0000-4000-8000-000000000008');
insert into public.moderator_mail_threads (reference, user_id, subject, last_message_at, updated_at) values
  ('RT-OLD', '00000000-0000-4000-8000-000000000001', 'Old question', now() - interval '13 months', now() - interval '13 months'),
  ('RT-NEW', '00000000-0000-4000-8000-000000000001', 'New question', now() - interval '1 month', now() - interval '1 month');
insert into public.safety_contact_checks (country_code, check_month)
values ('RO', date_trunc('month', now() - interval '3 years')::date);
insert into public.compliance_log_entries (user_id, entry_kind, authority, received_at, content,
                                           action_taken, completed_at, completed_by_user_id) values
  ('00000000-0000-4000-8000-000000000009', 'legal_request', 'Test authority', now() - interval '7 years',
   'Done long ago', 'Answered', now() - interval '6 years', '00000000-0000-4000-8000-000000000009');
insert into public.compliance_log_entries (user_id, entry_kind, authority, received_at, content) values
  ('00000000-0000-4000-8000-000000000009', 'legal_request', 'Test authority', now() - interval '7 years', 'Still open');

select public.purge_old_staff_records();
select is((select array_agg(note order by note) from public.invites where code_hash like 'retention-test-%'),
  array['test: ended lately'], 'an invite goes 90 days after it ends, a newer one stays');
select is((select count(*)::integer from public.on_call_rota where ends_at < now() - interval '1 year'), 0,
  'an on-call shift goes a year after it ends');
select is((select array_agg(reference) from public.moderator_mail_threads where reference like 'RT-%'),
  array['RT-NEW'], 'a moderator mail thread goes a year after its last message, a newer one stays');
select is((select count(*)::integer from public.safety_contact_checks
           where check_month = date_trunc('month', now() - interval '3 years')::date), 0,
  'a safety contact check goes after 2 years');
select is((select array_agg(content) from public.compliance_log_entries where authority = 'Test authority'),
  array['Still open'], 'a done compliance entry goes 5 years after it was done; an open one always stays');

/* ---------- The audit log ---------- */

insert into public.audit_log (user_id, action, target_type, created_at) values
  ('00000000-0000-4000-8000-000000000009', 'test.old', 'test', now() - interval '4 years'),
  ('00000000-0000-4000-8000-000000000009', 'test.recent', 'test', now() - interval '1 year');

select throws_ok($$ delete from public.audit_log where action = 'test.old' $$, '42501', null,
  'even the owner can''t delete an old audit row without the retention job');
select throws_ok(
  $$ select set_config('audit_log.retention_purge', 'on', true);
     delete from public.audit_log where action = 'test.recent' $$,
  '42501', null, 'with the job''s switch on, a row younger than 3 years still can''t be deleted');
select set_config('audit_log.retention_purge', 'off', true);
select throws_ok($$ update public.audit_log set reason = 'changed' where action = 'test.old' $$, '42501', null,
  'an audit row can never be changed');
select is(public.purge_old_audit_log(), 1, 'the retention job deletes the audit row older than 3 years');
select is((select array_agg(action) from public.audit_log where target_type = 'test'), array['test.recent'],
  'the audit row from a year ago stays');

/* ---------- Daily totals (criterion 4) ---------- */

-- A draft chapter on adult_writer's seed story; totals are counted the same for any chapter.
create temp table test_chapter as
with new_chapter as (
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'retain01', 1,
          'Totals', 'Some words.', 2, 'draft')
  returning chapters.id)
select id from new_chapter;
insert into public.chapter_reads (chapter_id, read_on, total)
select id, day, total from test_chapter,
  (values ((now() - interval '4 years 2 days')::date, 3), ((now() - interval '4 years')::date, 4),
          ((now() - interval '1 day')::date, 5)) as rows (day, total);

select is(public.fold_old_daily_totals() >= 1, true, 'the job folds daily totals older than 3 years');
select results_eq(
  $$ select read_on, total from public.chapter_reads where chapter_id = (select id from test_chapter) order by read_on $$,
  $$ values ((now() - interval '4 years')::date, 7), ((now() - interval '1 day')::date, 5) $$,
  'the old days become one total on the last day folded, and yesterday is untouched');
select is((select sum(total)::integer from public.chapter_reads where chapter_id = (select id from test_chapter)), 12,
  'the chapter''s all-time reads stay the same');

/* ---------- The nightly job and its record ---------- */

select is(public.run_retention_jobs() >= 0, true, 'run_retention_jobs() runs every clean-up');
select is((select count(*)::integer from public.retention_runs where ran_at = now()), 8, 'each clean-up writes one line of the record (the eighth is CLASSES-e''s certificate names)');

select pg_temp.sign_in('09');
select is((select count(*)::integer from public.retention_runs where ran_at = now()), 8,
  'allowed: retention_runs_select_admin: an admin reads the clean-up record');
select pg_temp.sign_in('01');
select is((select count(*)::integer from public.retention_runs), 0,
  'denied: retention_runs_select_admin: a member sees none of it');
select pg_temp.as_owner();

/* ---------- The Storage sweep ---------- */

insert into public.picture_checks (user_id, bucket, path, kind, status) values
  ('00000000-0000-4000-8000-000000000001', 'avatars', 'sweep-test/kept.jpg', 'avatar', 'approved');
insert into storage.objects (bucket_id, name, owner, created_at) values
  ('avatars', 'sweep-test/kept.jpg', '00000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('avatars', 'sweep-test/orphan.jpg', '00000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('avatars', 'sweep-test/uploading.jpg', '00000000-0000-4000-8000-000000000001', now() - interval '1 hour'),
  ('exports', 'aaaaaaaa-0000-4000-8000-000000000001.zip', '00000000-0000-4000-8000-000000000001', now() - interval '8 days'),
  ('exports', 'aaaaaaaa-0000-4000-8000-000000000002.zip', '00000000-0000-4000-8000-000000000001', now() - interval '1 day 1 hour'),
  ('teacher-proofs', 'sweep-test/left-behind.pdf', '00000000-0000-4000-8000-000000000007', now() - interval '3 days');

select results_eq(
  $$ select bucket_id, name from public.storage_files_to_sweep(1000)
     where name like 'sweep-test/%' or name like 'aaaaaaaa-%' order by bucket_id, name $$,
  $$ values ('avatars'::text, 'sweep-test/orphan.jpg'::text),
            ('exports', 'aaaaaaaa-0000-4000-8000-000000000001.zip'),
            ('teacher-proofs', 'sweep-test/left-behind.pdf') $$,
  'the sweep lists only files no row points at, older than a day: a replaced picture, an expired export, a proof left behind');

select pg_temp.sign_in('08');
select throws_ok($$ select * from public.storage_files_to_sweep(10) $$, '42501', null,
  'only the service role may list the files to sweep, not even the owner''s session');
select pg_temp.as_owner();

select is(public.run_storage_sweep(), false, 'without the sweep''s address and key (locally, in CI) nothing is sent');

select * from finish();
rollback;
