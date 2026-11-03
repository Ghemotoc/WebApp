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

- Staff › Schools › Certificates shows a contest certificate with empty class and teacher fields; a "Contest" label there would read better.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
