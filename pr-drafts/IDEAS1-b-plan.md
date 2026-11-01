# IDEAS-1b plan: private reading streak

Idea IDEA-20261031-13 (Robert's comments of 31 Oct 2026). Branch `claude/ideas1-b-reading-streak`.

- Migrations: `notification_kind` gains `reading_reminder` (own file); tables `reading_habits` (target, reminder, time zone; only while on) and `reading_minutes` (one row per reader per day), both owner-read only, written only by functions; `my_reading_habit()`, `start_/save_/stop_reading_habit()`, `add_reading_minute()`, `send_reading_reminders()` (pg_cron every 5 min), `purge_old_reading_minutes()` in the nightly retention run (14 days); both tables in `data_export_tables()` and `account_deletion_rules()`.
- Quiet hours for under-18s (22:00 to 07:00, Q50) on save and in the job; no email.
- Front end: `src/features/reading-habit/` (api, hooks, rules); the Library's "Your reading days" note; the reader's minute counter; the reminder's notification row.
- Tests: database 216 (26 tests), 021 and 212 updated; unit tests for the form rules and active reading; e2e `reading-streak.spec.ts` (5 behaviour tests, 12 axe views).
- Docs: retention, scheduled jobs, code tour, READMEs.
