# Restoring the database: the quarterly drill and a real restore (QA-8)

Written by QA-8 (independent QA check, 5 Nov 2026, finding H1; architecture 1.12, "a restore drill
every quarter into a scratch project"). A backup is only proven once it has been restored and the
copy checked, so this page is both the drill and the real thing.

## What exists today, and what doesn't

| Backup | State on 6 Nov 2026 |
| --- | --- |
| Supabase's daily backups | Depend on the plan: the Pro plan keeps daily backups (check the retention there); check which plan staging is on before the first drill. Production doesn't exist yet. |
| Point-in-time recovery | Not on. A paid add-on, budget approved (Q53); switch it on for production before real users. |
| Our own nightly `pg_dump` to a separate EU bucket | **Not built.** Planned in architecture 1.12 so a lost Supabase account isn't a lost company. Needs the bucket, a key and a scheduled job outside Supabase (GO-LIVE). |
| Storage files (covers, avatars, pictures) | **Not copied.** Database backups don't include them (GO-LIVE, with the nightly dump). |

## The drill (every quarter, about an hour)

Done by an owner or the engineer, from their own machine. Never from a Claude Code session: it
needs the staging and scratch projects' passwords (CLAUDE.md, Safety while building).

1. **Make a scratch project.** In the Supabase dashboard, a new project in the same organisation
   and region (West EU, Ireland), named `restore-drill-<yyyy-mm>`. Free plan is enough.
2. **Restore into it.** Either:
   - from Supabase's backup: staging project › Database › Backups › pick last night's › "Restore
     to a new project", choosing the scratch project; or
   - from our own dump (once the nightly dump exists): download last night's file, then
     `pg_restore --no-owner --dbname "$TARGET_URL" <file>`. A handful of errors about `cron`,
     `vault` and default privileges are expected; those parts belong to Supabase itself and exist
     in the new project already.
3. **Check the copy.** With staging quiet (no deploy running), from the repository:
   ```
   SOURCE_URL='<staging connection string>' TARGET_URL='<scratch connection string>' \
     bash scripts/ops/compare-restore.sh
   ```
   It compares the row count of every public table and of `auth.users`, and must print
   "compare-restore passed". A difference of a few rows in busy tables (notifications, reads)
   means staging changed after the backup; rerun against a backup taken while staging was quiet,
   or compare those tables against the backup's time by hand.
4. **Open the app against it.** In a local checkout, point `VITE_SUPABASE_URL` and the anon key at
   the scratch project, `npm run dev`, sign in as `adult_writer` and open a story and a chapter.
5. **Write it up** in the table below: the date, who, which backup, how long the restore took,
   and anything that went wrong.
6. **Delete the scratch project** the same day (it holds a copy of staging's data).

## A real restore (something was lost or broken)

1. **Stop writes first**: turn on the `maintenance_mode` flag (Staff › Settings, the flags section): the app shows the maintenance page, so people stop
   writing into a database you are about to replace.
2. **Decide what to restore to**: point-in-time recovery to the minute before the damage if it is
   on; otherwise the last daily backup (anything written after it is lost: note what, for the
   incident write-up).
3. **Restore into a new project first, never over the live one**, and run `compare-restore.sh`
   and step 4 of the drill against it.
4. **Switch over**: change the Supabase address and keys in Cloudflare Pages (production
   environment variables) and the Edge Function secrets, then redeploy. Migrations keep coming
   from the GitHub integration, so connect the new project to it.
5. **Turn maintenance mode off** and follow the incident plan (`incident-and-breach.md`, still to
   write): if personal data was lost or exposed, the 72-hour notice to ANSPDCP (GDPR art. 33).

## Drill log

| Date | Who | Backup used | Restore time | Result |
| --- | --- | --- | --- | --- |
| 6 Nov 2026 | QA-8 (local rehearsal only) | `pg_dump -Fc` of the local database, restored into a scratch database on the same server | under a minute (5 MB) | `compare-restore.sh` passed on all 153 tables with nothing else writing, and failed as it should after one audit_log row was deleted from the copy on purpose. pg_restore reported 52 errors, all in Supabase's own schemas and settings (pg_cron lives only in the `postgres` database, default privileges of `supabase_admin`), none in our tables: expected when restoring into a second database on the same server. Not a real drill: staging's backups were not used. The first real drill is a GO-LIVE step. |
