/**
 * Migration: the retention schedule's clean-up jobs (story S1-E13-04; GDPR art. 5(1)(e)).
 *
 * What it adds:
 * - settings for every keep time this story sets (docs/retention.md is the schedule);
 * - retention_runs: one row per clean-up per night saying how many rows went, so staff can show
 *   the schedule is kept (no personal data in it);
 * - accounts: an account erased because its age check never finished is now deleted completely,
 *   like a deleted account (S1-E13-03), and an account whose email is never confirmed is deleted
 *   after 7 days (criterion 2);
 * - expired exports, soft-deleted pictures and old staff records (invites, the on-call rota,
 *   moderator mail, safety contact checks, the compliance log) on their schedule;
 * - audit_log: one deliberate way to delete rows older than 3 years (decided 17 Oct 2026, 17:41);
 *   everything else is still refused for every role;
 * - daily totals (chapter_reads, chapter_shares): the daily detail older than 3 years is folded
 *   into one row per chapter (criterion 4, proposal), so all-time counts stay right;
 * - run_retention_jobs(): the one nightly job that runs all of the above;
 * - the Storage sweep: storage_files_to_sweep() lists files that no row points at any more (a
 *   deleted picture, an expired export, a deleted account's files), and run_storage_sweep() asks
 *   the storage-sweep Edge Function to delete them through the Storage API, because deleting
 *   rows in storage.objects leaves the files themselves behind.
 *
 * Not here: the reports' and cases' keep time is OPEN (rule 13); class certificates have no table
 * yet (S1-E8-12 adds their 30-day rule); IP addresses are not stored at all (docs/retention.md).
 * Who calls it: pg_cron (jobs run-retention-jobs and run-storage-sweep). What it calls next:
 * delete_account_data() from S1-E13-03 and, through pg_net, supabase/functions/storage-sweep.
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('unconfirmed_account_days', '7'::jsonb, false,
   'Days after sign-up before an account whose email was never confirmed is deleted (S1-E13-04; canvas 8.7).'),
  ('invites_keep_days', '90'::jsonb, false,
   'Days an invite is kept after it expires or is revoked (S1-E13-04, proposal).'),
  ('on_call_rota_keep_days', '365'::jsonb, false,
   'Days an on-call shift is kept after it ends (S1-E13-04, proposal).'),
  ('moderator_mail_keep_days', '365'::jsonb, false,
   'Days a moderator mail thread is kept after its last message or change (S1-E13-04, proposal).'),
  ('safety_contact_checks_keep_years', '2'::jsonb, false,
   'Years a monthly safety contact check is kept (S1-E13-04, proposal).'),
  ('compliance_log_keep_years', '5'::jsonb, false,
   'Years a compliance log entry is kept after it is done (S1-E13-04, proposal).'),
  ('audit_log_keep_years', '3'::jsonb, false,
   'Years an audit log row is kept (decided 17 Oct 2026, 17:41).'),
  ('daily_totals_keep_years', '3'::jsonb, false,
   'Years the daily read and share totals are kept day by day before folding into one total (S1-E13-04; decided 17 Oct 2026, 12:34).'),
  ('storage_sweep_grace_hours', '24'::jsonb, false,
   'Hours a file may sit in Storage with no row pointing at it before the sweep deletes it, so an upload in progress is never caught (S1-E13-04).')
on conflict (key) do nothing;

/**
 * keep_setting: one keep time from the settings, or the default when it is missing.
 * Inputs: the setting's key and the default. Returns: the number. Internal: every purge below.
 */
create or replace function public.keep_setting(setting_key text, default_value integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.setting_value(setting_key))::integer, default_value);
$$;

comment on function public.keep_setting(text, integer) is
  'Internal: a keep time from the settings, or its default (S1-E13-04).';
revoke execute on function public.keep_setting(text, integer) from public, anon, authenticated;

/* ---------- The record of each night's clean-up ---------- */

create table public.retention_runs (
  id uuid primary key default gen_random_uuid(),
  -- Which clean-up ran, for example 'purge_expired_exports'.
  job_name text not null,
  -- How many rows (or accounts) it removed; never which ones.
  rows_removed integer not null,
  ran_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retention_runs_job_is_named check (btrim(job_name) <> ''),
  constraint retention_runs_count_not_negative check (rows_removed >= 0)
);

comment on table public.retention_runs is
  'kind: platform
One row per clean-up job per night: its name and how many rows it removed, never which rows or whose (S1-E13-04; GDPR art. 5(2), being able to show the schedule is kept).';

create index retention_runs_by_time on public.retention_runs (ran_at desc);

create trigger retention_runs_set_updated_at
  before update on public.retention_runs
  for each row execute function public.set_updated_at();

alter table public.retention_runs enable row level security;

/**
 * Policy retention_runs_select_admin: owner and admin read the clean-up record.
 * Why: it is evidence for the record of processing and the lawyer, like the audit log, which
 * only owner and admin read (architecture 1.8.3). Only the jobs write it.
 */
create policy retention_runs_select_admin
  on public.retention_runs
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy retention_runs_select_admin on public.retention_runs is
  'Allows owner and admin to read the clean-up record; nobody else (S1-E13-04).';

grant select on public.retention_runs to authenticated;

/**
 * record_retention_run: writes one line of the clean-up record.
 * Inputs: the job's name and how many rows it removed. Internal: run_retention_jobs().
 */
create or replace function public.record_retention_run(run_job_name text, removed_count integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.retention_runs (job_name, rows_removed) values (run_job_name, removed_count);
$$;

comment on function public.record_retention_run(text, integer) is
  'Internal: records how many rows one clean-up removed (S1-E13-04).';
revoke execute on function public.record_retention_run(text, integer) from public, anon, authenticated;

/* ---------- Accounts ---------- */

/**
 * erase_unchecked_account: an account whose age check never finished (S1-E2-08b) or whose parent
 * never agreed (S1-E2-03) is now deleted completely, the same way as a deleted account: its
 * content and rows go and the profile and login stay as an empty tombstone (S1-E13-03). Before,
 * only the profile and login were emptied and "the rest of its rows" was a follow-up.
 * Input: the user ID. Internal: erase_unchecked_accounts() (job erase-unchecked-accounts).
 */
create or replace function public.erase_unchecked_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Mark it deleted first, so it is hidden everywhere while the rest goes.
  update public.profiles set deleted_at = coalesce(profiles.deleted_at, now())
  where profiles.id = target_user_id;
  -- Then the full deletion, which also removes the age check and consent rows.
  perform public.delete_account_data(target_user_id);
end;
$$;

comment on function public.erase_unchecked_account(uuid) is
  'Internal: deletes an account whose age check or parental consent never came, like a deleted account (S1-E2-08b, S1-E13-04).';
revoke execute on function public.erase_unchecked_account(uuid) from public, anon, authenticated;

-- Catch-up, once: tombstones the earlier erase left with their other rows still in place. A
-- closing account (an open deletion request) is not one of them; it waits for its 14 days.
do $$
declare
  leftover record;
begin
  for leftover in
    select profiles.id from public.profiles
    where profiles.deleted_at is not null
      and not exists (select 1 from public.account_deletions
                      where account_deletions.user_id = profiles.id
                        and account_deletions.cancelled_at is null
                        and account_deletions.completed_at is null)
  loop
    perform public.delete_account_data(leftover.id);
  end loop;
end;
$$;

/**
 * purge_unconfirmed_accounts: deletes accounts whose email was never confirmed 7 days after sign-up
 * (criterion 2; canvas 8.7, "unverified accounts: 7 days"). Such an account could never write,
 * so there is little to delete; it becomes a tombstone like any deleted account (S1-E13-03).
 * Seed personas are never touched. Returns: how many were deleted. Internal: run_retention_jobs().
 */
create or replace function public.purge_unconfirmed_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep_days integer := public.keep_setting('unconfirmed_account_days', 7);
  person record;
  deleted_count integer := 0;
begin
  for person in
    select profiles.id from public.profiles
    join auth.users on users.id = profiles.id
    where profiles.deleted_at is null
      and users.email_confirmed_at is null
      and users.created_at <= now() - make_interval(days => keep_days)
      and coalesce(users.raw_app_meta_data ->> 'seed_persona', 'false') <> 'true'
  loop
    update public.profiles set deleted_at = now() where profiles.id = person.id;
    perform public.delete_account_data(person.id);
    deleted_count := deleted_count + 1;
  end loop;
  return deleted_count;
end;
$$;

comment on function public.purge_unconfirmed_accounts() is
  'Job: deletes accounts whose email was not confirmed within unconfirmed_account_days (7) (S1-E13-04).';
revoke execute on function public.purge_unconfirmed_accounts() from public, anon, authenticated;

/* ---------- Exports and pictures ---------- */

/**
 * purge_expired_exports: deletes "Download my data" rows once their seven days are over, and a
 * copy whose making stopped half-way after a day (criterion 2: "expired exports, 7 days"). The
 * files go with the Storage sweep below, because nothing points at them any more.
 * Returns: how many rows went. Internal: run_retention_jobs().
 */
create or replace function public.purge_expired_exports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.exports
  where (exports.state = 'ready' and exports.expires_at <= now())
     or (exports.state = 'building' and exports.created_at < now() - interval '1 day');
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_expired_exports() is
  'Job: deletes expired exports and exports left half-made for a day (S1-E13-04).';
revoke execute on function public.purge_expired_exports() from public, anon, authenticated;

/**
 * purge_deleted_pictures: deletes the record of a picture its owner removed (a character's
 * picture, S1-E17-08) 30 days later, like other deleted content (setting content_purge_days),
 * unless a case or an authority's order keeps it. The file goes with the Storage sweep.
 * Returns: how many rows went. Internal: run_retention_jobs().
 */
create or replace function public.purge_deleted_pictures()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep_days integer := public.keep_setting('content_purge_days', 30);
  deleted_count integer;
begin
  delete from public.picture_checks
  where picture_checks.deleted_at < now() - make_interval(days => keep_days)
    and coalesce(picture_checks.preserve_until, '-infinity'::timestamptz) <= now()
    and not public.content_is_held_for_moderation('picture', picture_checks.id);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_deleted_pictures() is
  'Job: deletes removed pictures after content_purge_days (30) unless a case holds them (S1-E13-04).';
revoke execute on function public.purge_deleted_pictures() from public, anon, authenticated;

/* ---------- Staff records ---------- */

/**
 * purge_old_staff_records: the staff records docs/retention.md gives a keep time (all proposals
 * for Robert and the lawyer): invites 90 days after they end, on-call shifts a year after they
 * end, moderator mail a year after its last message, safety contact checks 2 years, and done
 * compliance log entries 5 years.
 * Returns: how many rows went in all. Internal: run_retention_jobs().
 */
create or replace function public.purge_old_staff_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  step_count integer;
  deleted_count integer := 0;
begin
  -- Step 1: invites, counted from when they stopped working (revoked or expired).
  delete from public.invites
  where coalesce(invites.revoked_at, invites.expires_at)
        < now() - make_interval(days => public.keep_setting('invites_keep_days', 90));
  get diagnostics step_count = row_count;
  deleted_count := deleted_count + step_count;
  -- Step 2: on-call shifts, from when the shift ended.
  delete from public.on_call_rota
  where on_call_rota.ends_at < now() - make_interval(days => public.keep_setting('on_call_rota_keep_days', 365));
  get diagnostics step_count = row_count;
  deleted_count := deleted_count + step_count;
  -- Step 3: moderator mail, from the last message or change; its messages and notices go with it.
  delete from public.moderator_mail_threads
  where greatest(moderator_mail_threads.last_message_at, moderator_mail_threads.updated_at)
        < now() - make_interval(days => public.keep_setting('moderator_mail_keep_days', 365));
  get diagnostics step_count = row_count;
  deleted_count := deleted_count + step_count;
  -- Step 4: monthly safety contact checks, from the month they were for.
  delete from public.safety_contact_checks
  where safety_contact_checks.check_month
        < now() - make_interval(years => public.keep_setting('safety_contact_checks_keep_years', 2));
  get diagnostics step_count = row_count;
  deleted_count := deleted_count + step_count;
  -- Step 5: compliance log entries, from when they were done; an open one is always kept.
  delete from public.compliance_log_entries
  where compliance_log_entries.completed_at
        < now() - make_interval(years => public.keep_setting('compliance_log_keep_years', 5));
  get diagnostics step_count = row_count;
  return deleted_count + step_count;
end;
$$;

comment on function public.purge_old_staff_records() is
  'Job: deletes old invites, on-call shifts, moderator mail, safety contact checks and compliance log entries (S1-E13-04).';
revoke execute on function public.purge_old_staff_records() from public, anon, authenticated;

/* ---------- The audit log ---------- */

/**
 * refuse_audit_log_change: the audit log stays append-only (architecture 1.6), with one exception
 * the retention schedule needs (decided 17 Oct 2026, 17:41: "3 years from the action"): a delete
 * of a row older than audit_log_keep_years, while purge_old_audit_log() has switched
 * audit_log.retention_purge on for its own transaction. Updates and truncates are always
 * refused. API roles can't delete rows at all (their grants were revoked in S1-E1-02), so only
 * the job's own function reaches this path.
 * Returns: the old row for an allowed delete. Errors: insufficient_privilege otherwise.
 */
create or replace function public.refuse_audit_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Nested on purpose: the row is only looked at for a row delete with the switch on.
  if tg_op = 'DELETE' and tg_level = 'ROW' then
    if current_setting('audit_log.retention_purge', true) = 'on' then
      if old.created_at < now() - make_interval(years => public.keep_setting('audit_log_keep_years', 3)) then
        return old;
      end if;
    end if;
  end if;
  raise exception 'audit_log is append-only: rows can never be changed or deleted (architecture 1.6).'
    using errcode = 'insufficient_privilege';
end;
$$;

comment on function public.refuse_audit_log_change() is
  'Trigger: refuses any update, delete or truncate on audit_log, owner included, except the retention job''s delete of rows past audit_log_keep_years (S1-E1-02, S1-E13-04).';
revoke execute on function public.refuse_audit_log_change() from public, anon, authenticated;

/**
 * purge_old_audit_log: deletes audit log rows older than 3 years, the one deliberate way past the
 * append-only rule. The switch it sets lasts only until its transaction ends; the count goes to
 * retention_runs, so every purge is itself on record.
 * Returns: how many rows went. Internal: run_retention_jobs().
 */
create or replace function public.purge_old_audit_log()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  -- Step 1: the switch the trigger checks, for this transaction only.
  perform set_config('audit_log.retention_purge', 'on', true);
  -- Step 2: the old rows; the trigger refuses any row that isn't old enough.
  delete from public.audit_log
  where audit_log.created_at < now() - make_interval(years => public.keep_setting('audit_log_keep_years', 3));
  get diagnostics deleted_count = row_count;
  -- Step 3: the switch off again, so nothing later in the job can use it.
  perform set_config('audit_log.retention_purge', 'off', true);
  return deleted_count;
end;
$$;

comment on function public.purge_old_audit_log() is
  'Job: deletes audit log rows older than audit_log_keep_years (3), the one allowed delete (S1-E13-04).';
revoke execute on function public.purge_old_audit_log() from public, anon, authenticated;

/* ---------- Daily totals ---------- */

/**
 * fold_old_daily_totals: the daily read and share totals older than 3 years are folded into one
 * row per chapter, dated the last day folded (criterion 4; Robert's default for aggregated data,
 * decided 17 Oct 2026, 12:34). The day-by-day detail is deleted; the chapter's all-time count on
 * the writer's profile and dashboard stays right (proposal, docs/retention.md). Nothing in these
 * rows is about a person. daily_metrics already deletes its own old rows (S1-E15-02).
 * Returns: how many daily rows were folded away. Internal: run_retention_jobs().
 */
create or replace function public.fold_old_daily_totals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff date := (now() - make_interval(years => public.keep_setting('daily_totals_keep_years', 3)))::date;
  folded_reads integer;
  folded_shares integer;
begin
  -- Step 1: reads. Only chapters with more than one old row, so a folded total isn't rewritten.
  with old_rows as (
    delete from public.chapter_reads
    where chapter_reads.read_on < cutoff
      and chapter_reads.chapter_id in (select old.chapter_id from public.chapter_reads as old
                                       where old.read_on < cutoff
                                       group by old.chapter_id having count(*) > 1)
    returning chapter_reads.chapter_id, chapter_reads.read_on, chapter_reads.total)
  insert into public.chapter_reads (chapter_id, read_on, total)
  select old_rows.chapter_id, max(old_rows.read_on), sum(old_rows.total) from old_rows
  group by old_rows.chapter_id;
  get diagnostics folded_reads = row_count;
  -- Step 2: shares, the same way.
  with old_rows as (
    delete from public.chapter_shares
    where chapter_shares.shared_on < cutoff
      and chapter_shares.chapter_id in (select old.chapter_id from public.chapter_shares as old
                                        where old.shared_on < cutoff
                                        group by old.chapter_id having count(*) > 1)
    returning chapter_shares.chapter_id, chapter_shares.shared_on, chapter_shares.total)
  insert into public.chapter_shares (chapter_id, shared_on, total)
  select old_rows.chapter_id, max(old_rows.shared_on), sum(old_rows.total) from old_rows
  group by old_rows.chapter_id;
  get diagnostics folded_shares = row_count;
  return folded_reads + folded_shares;
end;
$$;

comment on function public.fold_old_daily_totals() is
  'Job: folds daily read and share totals older than daily_totals_keep_years (3) into one row per chapter (S1-E13-04).';
revoke execute on function public.fold_old_daily_totals() from public, anon, authenticated;

/* ---------- The nightly job ---------- */

/**
 * run_retention_jobs: runs every clean-up this story adds, in order, and records each count in
 * retention_runs. The older purges keep their own jobs (docs/runbooks/scheduled-jobs.md).
 * Returns: the total removed. Runs nightly (job run-retention-jobs, 03:47 UTC).
 */
create or replace function public.run_retention_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_name text;
  removed_count integer;
  total_removed integer := 0;
begin
  -- Accounts first, so their exports and pictures are caught by the purges after them.
  foreach job_name in array array[
    'purge_unconfirmed_accounts', 'purge_expired_exports', 'purge_deleted_pictures',
    'purge_old_staff_records', 'purge_old_audit_log', 'fold_old_daily_totals']
  loop
    execute format('select public.%I()', job_name) into removed_count;
    perform public.record_retention_run(job_name, removed_count);
    total_removed := total_removed + removed_count;
  end loop;
  return total_removed;
end;
$$;

comment on function public.run_retention_jobs() is
  'Job: runs the retention clean-ups and records each count in retention_runs (S1-E13-04).';
revoke execute on function public.run_retention_jobs() from public, anon, authenticated;

/* ---------- The Storage sweep ---------- */

/**
 * storage_files_to_sweep: the files in Storage that no row points at any more, older than the
 * grace time (setting storage_sweep_grace_hours, 24), so an upload in progress is never caught:
 * - a picture (covers, avatars, chapter-images, atlas-images) with no picture_checks row: the
 *   picture was replaced, removed or its account deleted (S1-E13-03);
 * - an export with no export row that is still being built or ready and unexpired;
 * - a teacher's proof with no request still waiting for a decision.
 * Input: the most files to return (at most 1000). Returns: (bucket_id, name) rows.
 * Who calls it: only the storage-sweep Edge Function, as service_role; never a browser.
 */
create or replace function public.storage_files_to_sweep(max_files integer default 500)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select objects.bucket_id, objects.name from storage.objects
  where objects.created_at < now() - make_interval(hours => public.keep_setting('storage_sweep_grace_hours', 24))
    and (
      (objects.bucket_id in ('covers', 'avatars', 'chapter-images', 'atlas-images')
        and not exists (select 1 from public.picture_checks
                        where picture_checks.bucket = objects.bucket_id
                          and picture_checks.path = objects.name))
      or (objects.bucket_id = 'exports'
        and not exists (select 1 from public.exports
                        where exports.file_name = objects.name
                          and (exports.state = 'building'
                               or (exports.state = 'ready' and exports.expires_at > now()))))
      or (objects.bucket_id = 'teacher-proofs'
        and not exists (select 1 from public.teacher_checks
                        where teacher_checks.proof_path = objects.name
                          and teacher_checks.decided_at is null)))
  order by objects.created_at
  limit least(greatest(max_files, 1), 1000);
$$;

comment on function public.storage_files_to_sweep(integer) is
  'Lists Storage files no row points at any more, for the storage-sweep Edge Function (S1-E13-04).';
revoke execute on function public.storage_files_to_sweep(integer) from public, anon, authenticated;
grant execute on function public.storage_files_to_sweep(integer) to service_role;

/**
 * run_storage_sweep: asks the storage-sweep Edge Function to delete the files above, through
 * pg_net, with the key in the Vault secret storage_sweep_key (the function holds the same value
 * as STORAGE_SWEEP_KEY). Does nothing while either secret is unset, as locally and in CI, or when
 * there is nothing to sweep.
 * Returns: true when the call was sent. Runs nightly (job run-storage-sweep, 04:17 UTC), after
 * the purges that leave files behind.
 */
create or replace function public.run_storage_sweep()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  sweep_url text;
  sweep_key text;
begin
  select decrypted_secret into sweep_url from vault.decrypted_secrets where name = 'storage_sweep_url';
  select decrypted_secret into sweep_key from vault.decrypted_secrets where name = 'storage_sweep_key';
  if coalesce(sweep_url, '') = '' or coalesce(sweep_key, '') = ''
     or not exists (select 1 from public.storage_files_to_sweep(1)) then
    return false;
  end if;
  perform net.http_post(
    url := sweep_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || sweep_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;

comment on function public.run_storage_sweep() is
  'Internal: calls the storage-sweep Edge Function through pg_net when files are due (S1-E13-04); pg_cron nightly.';
revoke execute on function public.run_storage_sweep() from public, anon, authenticated;

-- Naming each job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('run-retention-jobs', '47 3 * * *', 'select public.run_retention_jobs()');
select cron.schedule('run-storage-sweep', '17 4 * * *', 'select public.run_storage_sweep()');
