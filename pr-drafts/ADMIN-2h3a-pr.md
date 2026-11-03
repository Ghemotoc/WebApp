<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, part h3a: the support inbox's saved views with counts, the first-reply timer and auto-solve (S1-E11-13 criteria 6 and 7). Canned replies follow in h3b.

## What changed

- **Views with counts** above the filters: My tickets, Unassigned, All open, Pending on user and Solved, as chips with their counts (`admin_support_view_counts()`). Each view sets the status and assignee filters, and the chip of the current view is pressed. Spam joins in part h4, with marking spam.
- **First-reply timer.** Each inbox row shows "Answer by …" until staff first answer, and "First answer overdue since …" once late. The target is 1 working day (the story's proposal), Monday to Friday in Romanian time, in the new setting `support_first_reply_target_working_days` (Staff › Settings). Public holidays are not skipped yet.
- **Auto-solve.** Every hour, a ticket left pending on the person for 7 days (`support_auto_solve_days`) is solved by the system ("The system" in its history) and the person gets a polite email saying how to reopen it by answering. Their answer reopens it, as before.
- **Records:** decisions, scheduled jobs and the code tour.

## How it was tested

- Database test 256 (12 tests): due times from a weekday, a Saturday and with a 2-day setting; each view's count for the support persona; the inbox's due time; a moderator refused; auto-solve takes the ticket waiting 8 days, leaves the one waiting 3 days, writes the system's history line and queues the email, which the worker sends.
- Unit tests: the timer (due, overdue, nothing once answered or finished) and the auto-solved email.
- e2e `e2e/support-emails.spec.ts`: the views with counts and pressing Unassigned, the "Answer by" pill, and a waiting ticket solved with its email in Mailpit.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None new (no board draws the support screens yet).

## Questions for Robert

None. Proposals to look at: 1 working day for the first answer and 7 days before auto-solve, both changeable in Staff › Settings.

## Follow-ups

- Skip Romanian public holidays in the first-reply timer once a holiday list exists.
- Part h3b: canned replies. Part h4: merge, Convert to report, Open data request, spam, retention and the export.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
