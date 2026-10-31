<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #102

This is part (g), the last part of the READ-4 bundle in Robert's full-app plan: S1-E11-04, metrics and compliance logs (board AdminMetrics, screen 8.7).

## What changed

- **Live numbers on `/staff/metrics` (criterion 1).** `admin_metrics_overview()` (owner and admin only) returns totals:
  - sign-ups by age group (13 to 15, 16 to 17, 18 or over, not given), counted from the year of birth; the year itself is never returned;
  - age checks passed, failed and not finished. "Appealed" shows "Not yet" until manual age checks exist (S1-E2-08, after March);
  - moderation cases of the last 30 days by tier (setting `tier_numbers_days`), with the share handled within each tier's time limit. A case counts once it is decided or its deadline has passed.
- **The compliance log (criterion 2).**
  - New table `compliance_log_entries` (kind staff; `user_id` is who logged it). Each entry has a reference (LR-001), what it is (authority order, legal request or the ANCOM launch notice), the authority, when it arrived, the content, the action taken and the times.
  - Removal orders from the public form (TCO-…, S1-E10-09) are listed beside them with their decision, without being logged twice.
  - "Log a request", "Record the action" and "Export DSA log (CSV)" go through `admin_*` functions that write the audit log in the same transaction. An export is logged as a sensitive read.
  - A done entry is proof, so it can't be changed afterwards.
- **The ANCOM launch task (Law 50/2024).** The card shows the due date 45 days after the `launch_date` setting, which the owner or an admin sets on the card, and "Done" once a launch notice is logged as done.
- **Two cards with no database call:**
  - "Cookieless analytics" says whether events are sent (off until Q49 is decided);
  - "Event catalogue" counts the event names in the code.
- **A static card:** transparency reports are not required for us yet (DSA art. 15(2)).
- **Shared code:** `downloadCsv` now serves both the audit log export and this one. `romaniaNowFields()` gives the form's "now" in Romania time.
- **Docs:**
  - board-fixes, six new AdminMetrics rows: top events stay in the tool's own dashboard; there is no retention panel, because `docs/retention.md` is the one schedule; and others;
  - retention: a new row, `compliance_log_entries` kept 5 years after done (**proposal**);
  - code-tour and the staff README.

## How it was tested

- pgTAP `184-metrics-and-compliance-log` (22 tests):
  - the age groups and the year never returned;
  - the age check totals;
  - the tier maths: in time, late, overdue and still in time;
  - moderators and support refused;
  - logging, finishing and locking an entry, and impossible times refused;
  - allowed and denied for `compliance_log_entries_select_staff`;
  - removal orders in the log;
  - the due date;
  - every action and the export in the audit log.
- `021-signed-out-reads` lists the new table.
- Unit tests:
  - `metricsOverview.test.ts`: parsing and the share;
  - `complianceLogCsv.test.ts`: quoting, a decision as the action, empty open times;
  - `complianceEntryForm.test.ts`: Romania time to a moment, missing fields, done before received.
- e2e `staff-compliance-log.spec.ts` (6 tests), run as the admin:
  - the numbers show, with no user ID on the page;
  - logging, recording the action and the CSV download;
  - the launch date gives the due date;
  - axe and widths at 390 px (Romanian), 768 and 1440 px, each with an open entry and the form open.
- `staff-metrics.spec.ts` (owner, every view, theme and language) and `epic-s1-e15.spec.ts` still pass.
- Screenshots were checked by eye at 390 px (Romanian) and 1440 px. They caught the Romanian "Record the action" button running off a phone screen. It now wraps, and the 390 px e2e covers it.

## Local check run

Full clean-start run for the READ-4 bundle on `dfa2075` (fresh `npm ci`, fresh Supabase, build, `npm run checks`, functions build):

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 128 files, 783 passed |
| db reset + test db | 94 files, 1,998 tests, PASS |
| functions build | compiled |
| e2e, whole suite | 1,198 passed, 2 failed (see below). The run stopped at the session's 1-hour limit after 961 tests, as it has before, so the remaining specs (story-settings to year-of-birth) ran in a second call: 244 passed |

The failures, neither from this change:
- `reader-performance`: the throttled cold load measured 2.28 s against the 2.0 s budget. This is known on main on this machine (2.3 to 2.4 s).
- `legal.spec.ts`: one test failed in each parallel run, a different one each time (an axe view, then the new-terms notice). The spec passes on its own, 51 of 51. It publishes a new terms version while other specs run, so this is a race between specs; I have noted it as a follow-up.

The new spec `staff-compliance-log` passed, and so did `staff-metrics` and `epic-s1-e15`.

## By hand

- Nothing on staging: no SQL top-up and no new secrets.
- Before launch, set the launch date on Staff › Metrics so the ANCOM due date shows. Log the notice there once it is sent.
- Your call: the compliance log's retention (5 years after an entry is done) is my proposal, for the lawyer's list.
- Optional: read the new Romanian lines (`metrics.overview`, `analytics`, `compliance`, `launch` and `transparency` in `staff.json`).

## Follow-ups

- `legal.spec.ts` races other specs when the whole suite runs in parallel (it changes the current terms version). It should run on its own or use a version that only its own persona sees.
- The retention panel on the board, with the purge job's last run, fits best with the retention jobs (S1-E13-04).
- GitHub Actions won't run on this pull request until 1 November (the account's Actions minutes are used up for this billing period). The full local check run is pasted above instead, and Cloudflare's preview build is the live check.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
