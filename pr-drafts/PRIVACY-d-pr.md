<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-04 (Retention schedule and log minimisation). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part d: the nightly clean-ups that keep `docs/retention.md` true, and a Storage sweep that deletes the files a deleted row leaves behind. No screens. Law: GDPR art. 5(1)(e) and art. 30.

## What changed

- **Database** (`20261117100001_s1_e13_04_retention_jobs.sql`):
  - **One nightly job, `run-retention-jobs`** (03:47 UTC), runs each clean-up below and writes its count to the new table **`retention_runs`** (kind: platform; owner and admin read it through `retention_runs_select_admin`). It holds the job's name and a number, never which rows or whose, so we can show the schedule is kept (GDPR art. 5(2)).
  - **Accounts (criterion 2):**
    - `purge_unconfirmed_accounts()` deletes an account whose email still isn't confirmed 7 days after sign-up (`unconfirmed_account_days`, canvas 8.7);
    - `erase_unchecked_account()` (the 14-day age check and parental consent clean-up) now deletes everything, the same way as Delete my account. Before, it only emptied the profile and login and left "the rest of its rows" as a follow-up;
    - a one-off catch-up in the migration finishes any tombstones the old version left;
    - both leave the usual tombstone, so the user ID is never reused. Seed personas are never touched.
  - **Exports and pictures (criterion 2):**
    - `purge_expired_exports()` deletes a "Download my data" row once its seven days are over, or a day after its making stopped;
    - `purge_deleted_pictures()` deletes a removed picture's row after 30 days (`content_purge_days`), unless a case or an authority's order keeps it.
  - **Staff records**, all on the keep times `docs/retention.md` already gave as proposals, each now a setting. `purge_old_staff_records()` deletes:
    - invites 90 days after they end;
    - on-call shifts a year after they end;
    - moderator mail a year after its last message;
    - safety contact checks after 2 years;
    - done compliance log entries after 5 years. An open entry is always kept.
  - **The audit log (decided 17 Oct 2026, 17:41: 3 years):**
    - `refuse_audit_log_change()` lets exactly one delete through: a row older than `audit_log_keep_years`, while `purge_old_audit_log()` has switched `audit_log.retention_purge` on for its own transaction;
    - every update, truncate and other delete is still refused for every role, the owner included;
    - API roles still have no delete grant at all.
  - **Daily totals (criterion 4):** `fold_old_daily_totals()` folds `chapter_reads` and `chapter_shares` rows older than 3 years into one row per chapter (`daily_totals_keep_years`). The day-by-day detail is deleted, and the all-time reads on a writer's profile stay right. `daily_metrics` already deleted its own rows after 3 years (S1-E15-02).
  - **The Storage sweep:**
    - why it's needed: deleting a row doesn't delete its file, and SQL can't reach the file itself;
    - `storage_files_to_sweep()` (service role only) lists the files no row points at, more than a day old (`storage_sweep_grace_hours`) so an upload in progress is never caught. That means pictures with no `picture_checks` row (replaced, removed, or a deleted account's), exports with no live export row, and teacher proofs with no request waiting;
    - `run_storage_sweep()` (job `run-storage-sweep`, 04:17 UTC) calls the Edge Function below through pg_net, with the Vault secrets `storage_sweep_url` and `storage_sweep_key`;
    - locally and in CI those secrets are unset, so nothing is called.
- **Edge Function `supabase/functions/storage-sweep/`**, the repository's first:
  - `sweep.ts` holds the logic in plain TypeScript: check the sweep key, list the files, then delete them through the Storage API, bucket by bucket, 100 names a call;
  - a failed call is counted, and its files are listed again the next night;
  - it never logs file names (they hold user IDs) or keys;
  - `index.ts` only hands it Deno's settings: Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to every Edge Function, so the service key stays out of the app (rule 2);
  - `config.toml` turns off the user-token check for this one function, because the sweep key is the check;
  - Vitest now also runs `supabase/functions/**/*.test.ts`, and `tsconfig.node.json` type-checks the folder.
- **Seed:** the expired and revoked test invites now end "yesterday" instead of on fixed dates, so the 90-day invite clean-up never removes them. `supabase/staging-topups/S1-E13-04.sql` does the same on staging.
- **Docs:**
  - `docs/retention.md`:
    - every row that said "a purge job in S1-E13-04" now names its job;
    - new rows for unconfirmed accounts, Storage files and `retention_runs`;
    - the IP address and class certificate rows say what this story checked.
  - Also updated: `docs/runbooks/scheduled-jobs.md` (the two new jobs, plus `purge-closed-accounts`, which was missing), `docs/code-tour.md`, `supabase/README.md` and `docs/mocks.md` (the sweep is off until GO-LIVE).

## How it was tested

- **Database test `212-retention-jobs` (29 tests):**
  - **Accounts:** an unconfirmed account from 8 days ago becomes a tombstone, while ones from 6 days ago and the seed personas stay. An account erased for a missing age check loses its other rows.
  - **Exports and pictures:** an expired export and one left half-made go; a ready one stays. A picture removed 31 days ago goes; one removed 10 days ago stays.
  - **Staff records:** each kind goes on its schedule, and a newer one stays; an open compliance entry stays.
  - **The audit log:**
    - the owner can't delete an old row without the job;
    - with the job's switch on, a recent row still can't be deleted;
    - no row can be changed;
    - the job deletes only the 4-year-old row.
  - **Daily totals:** two daily totals from 4 years ago fold into one, yesterday is untouched, and the all-time count is unchanged.
  - **The record:** `run_retention_jobs()` writes one record row per clean-up. Policy `retention_runs_select_admin` is tested both ways (allowed and denied).
  - **The sweep:**
    - it lists only an orphaned avatar, an expired export and a left-behind proof;
    - it skips a picture that still has its row, an upload an hour old and a live export;
    - even the owner's session can't call it;
    - `run_storage_sweep()` sends nothing without its secrets.
- **Signed-out reads (`021`)** includes `retention_runs`.
- **Vitest `sweep.test.ts` (5 tests):**
  - a wrong key is refused;
  - nothing runs while the key is unset;
  - files are deleted per bucket and counted;
  - a failed delete is counted;
  - 250 names become calls of 100, 100 and 50.
- **End to end:** sign-up (it uses the seed invites), delete-my-account, download-my-data, sign-in and legal.

## Local check run

On Node 24, locally:

- Static checks all pass: lint, typecheck (which now includes `supabase/functions`), types:check, i18n:check, migrations:check, Prettier and the third-party build check. Prettier first flagged `vite.config.ts`, and the fix is in the second commit.
- Vitest: 1,016 of 1,016 pass, including the new `sweep.test.ts`.
- Database (pgTAP): 122 files and 2,819 tests, all pass, including the new `212-retention-jobs` (29 tests).
- Wrangler compiles the Pages Functions.
- End to end (`sign-up`, `delete-my-account`, `download-my-data`, `sign-in`, `legal`): 171 passed.

## By hand

- **Staging, once:** run `supabase/staging-topups/S1-E13-04.sql` in the SQL Editor before the first night. Otherwise the job deletes the seed's expired and revoked invites, and the sign-up tests on staging miss them.
- **GO-LIVE:** set up the Storage sweep. Until then, files of deleted rows stay in Storage:
  - deploy the function with `npx supabase functions deploy storage-sweep --no-verify-jwt`;
  - set a long random key with `npx supabase secrets set STORAGE_SWEEP_KEY=…`;
  - add two Vault secrets: `storage_sweep_key` (the same value) and `storage_sweep_url` (`https://<project>.supabase.co/functions/v1/storage-sweep`).

## Board mismatches

None: no screens. Canvas 8.7's retention panel gives the 30, 7 and 7 days used here.

## Questions for Robert (OPEN or not in the story, built as proposals)

- **Old daily totals are folded, not deleted.** Deleting reads older than 3 years outright would make the all-time read count on a writer's profile drop. So the daily detail goes and one total per chapter stays. It holds nothing about any person. Say if you'd rather they go completely.
- **Unconfirmed accounts become tombstones,** like every deleted account. That means their username stays reserved, so someone can't sign up with a fake email to hold a name and then let it lapse. The other choice is to free the username after 7 days.
- **The staff keep times** stay proposals for you and the lawyer: invites 90 days, on-call shifts and moderator mail 1 year, safety contact checks 2 years, the compliance log 5 years. Each is now a setting, so a change is one migration.
- **`retention_runs` is kept for good for now.** It holds no personal data. A 3-year limit like the audit log is the other option.
- **Still OPEN, not touched (rule 13):** how long reports, cases, statements of reasons, appeals and safeguarding referrals are kept, and consents after an account is deleted.

## Follow-ups

- **The record of processing (GDPR art. 30)** doesn't exist in the repository yet, so criterion 5 is met by `docs/retention.md` alone. It arrives with the legal stories (S1-E14-01, which said so), and should copy this schedule.
- **Class certificates (criterion 3):** there is no certificates table yet. S1-E8-12 adds the real name, and with it the 30-days-after-archiving delete in `run_retention_jobs()`.
- **Scrambled IP addresses (criterion 1):** we store none, as checked again here. The first story that stores one adds the keyed hash and its 30-day purge.
- **Whoever adds a table that points at Storage files must add it to `storage_files_to_sweep()`.** Otherwise the sweep deletes its files after a day. This is written in `supabase/README.md` and the code tour. A database test that compares buckets to this list could enforce it later.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
