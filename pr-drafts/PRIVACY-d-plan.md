# PRIVACY-d plan: S1-E13-04 retention schedule and clean-up jobs

## Migration `20261117100001_s1_e13_04_retention_jobs.sql`
- Settings: unconfirmed_account_days 7, invites_keep_days 90, on_call_rota_keep_days 365,
  moderator_mail_keep_days 365, safety_contact_checks_keep_years 2, compliance_log_keep_years 5,
  audit_log_keep_years 3, daily_totals_keep_years 3, storage_sweep_grace_hours 24.
- Table `retention_runs` (kind: platform): one row per job per night with the rows removed. RLS, select for owner and admin.
- Accounts: erase_unchecked_account() now deletes everything (delete_account_data); a one-off
  catch-up for tombstones it left; purge_unconfirmed_accounts() (7 days, criterion 2).
- purge_expired_exports() (criterion 2); purge_deleted_pictures() (soft-deleted pictures, 30 days).
- Staff records: invites, on_call_rota, moderator mail, safety_contact_checks, compliance_log_entries.
- audit_log: the append-only trigger lets one path delete rows older than 3 years
  (purge_old_audit_log(), with a transaction-local switch); update and truncate still refused.
- Daily totals (criterion 4): chapter_reads and chapter_shares older than 3 years fold into one
  row per chapter, so the daily detail goes and all-time totals stay right (proposal).
- run_retention_jobs(): the one nightly job, records each purge in retention_runs.
- Storage sweep: storage_files_to_sweep() (service_role only) lists files no row points at;
  run_storage_sweep() calls the `storage-sweep` Edge Function through pg_net with a Vault key;
  does nothing locally.
## Edge Function `supabase/functions/storage-sweep/` (index.ts Deno wrapper; sweep.ts logic, Vitest).
## Tests: 212-retention-jobs.test.sql; 021 adds retention_runs; Vitest for sweep.ts.
## Docs: retention.md, code-tour, supabase/README, runbooks/scheduled-jobs.md, mocks? GO-LIVE list.
## Not done (rule 13 / no table yet): reports and cases retention OPEN; certificates (S1-E8-12); IPs not stored.
