<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #113

Bundle 13 CONTESTS, part b2d, the last part: the admin epic check, round three (S1-E11-QA), and the bundle's full test run. With this, every story of the admin epic is built.

## What changed

- **Journey 8** (`e2e/epic-s1-e11-round-3.spec.ts`). In a real browser:
  1. adult_writer enters a story in an open contest from its settings.
  2. An admin disqualifies the entry with a reason.
  3. The writer follows the story card to the decision and appeals.
  4. A moderator overturns the appeal, and the entry is back in the contest.
  5. After entries close, the admin picks the winner, publishes the results and issues certificates.
  6. A signed-out visitor sees the winner on the landing page.
  7. The writer opens the certificate, and the visitor checks its code.
- **Journey 9** (`supabase/tests/database/269-epic-s1-e11-round-3.test.sql`, 17 tests). The same path in the database, plus the refusals:
  - support and the content editor can't read the entries;
  - the admin who disqualified can't decide the appeal.

  It also checks what comes out:
  - the landing page never carries a user ID;
  - a contest certificate that staff revoke through Schools stays revoked when certificates are issued again;
  - the writer was told of the decision, the appeal's outcome and the certificate;
  - the audit log names every staff step.
- **Round three in `docs/epic-reports/S1-E11.md`.** It lists the stories, the journeys, the axe coverage, the tables with their policy tests, and the two breaks found where stories meet. Both were fixed in earlier parts: the appeal decider for a disqualification (13b2a) and certificates without a class (13b2c).

- **What the full run found, and the fixes.**
  - A real bug in data requests (S1-E11-09): the admin site fills "Date received" with today's date in Romania, but the database compared it with its own UTC date. From 00:00 to 02:00 Romanian time every new request, including one opened from a support ticket, was refused as "in the future". The new migration `…_contests_b2d_romanian_dates.sql` makes `admin_open_data_request()`, the deadline pills and the "first month is over" check use `romania_today()`, like every other deadline in the app. Database test 242 now uses the Romanian date throughout.
  - Two specs still expected the staff menu without Contests (added in 13b1): `staff-shell.spec.ts` and `epic-s1-e11.spec.ts` now list it for the owner and admins.
  - Two axe loops (`chapter-likes.spec.ts`, `notifications.spec.ts`) could switch a Romanian view to English, because an earlier test left the account in English and the account's language wins once the page reads it. Each view now puts its own language on the account first.

## How it was tested

The bundle's full run, all of `npm run checks` with every end-to-end spec:

LOCALRUN

## By hand

- Nothing.

## Board mismatches

- None: no screen changes.

## Questions for Robert

None.

## Follow-ups

- A few other functions still count days by the database's UTC date (safety contacts' monthly check, the moderation queue's deadlines, sanctions' end dates, the reading streak and claiming). None refuses anything at night the way data requests did, but they could be a day out between 00:00 and 02:00 Romanian time; worth moving them to `romania_today()` in the CHECK bundle.
- Staff › Schools › Certificates shows a contest certificate with empty class and teacher fields; a "Contest" label there would read better.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
