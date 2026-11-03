<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, last part: the admin epic check, round two (S1-E11-QA), and the bundle's full test run. It adds no feature.

## What changed

- **One journey across the admin stories of this bundle**, in the browser (`e2e/epic-s1-e11-round-2.spec.ts`): blocker asks support for help because a story copies theirs → support answers with a canned reply and converts the ticket into a report → the moderator finds the case in the queue, then the story in Staff › Stories, and restricts it with a reason → adult_writer reads the statement of reasons → support opens a data request from the same ticket and follows it to its page. Stories crossed: S1-E11-13, S1-E10-02, S1-E10-03a, S1-E11-07, S1-E11-08, S1-E10-04, S1-E11-09.
- **The same path in the database** (`supabase/tests/database/260-epic-s1-e11-round-2.test.sql`, 15 tests), plus who is refused (the moderator can't read the ticket, support can't change a story, the content editor can do neither), the staff copy without the staff note, the audit log rows, and retention (the ticket goes after two years; the notice and the data request keep their records).
- **The epic report** `docs/epic-reports/S1-E11.md` gains "Round two: ADMIN-2", with the stories, journeys, axe coverage, tables and the breaks found where the stories meet (both were fixed in #305 before it merged). The code tour points at the new tests.

## How it was tested

- The two new tests pass on their own and in the runs below.
- The bundle's full e2e run: every spec file on one local database. The parallel first pass clashed where specs share seed personas, so every file then ran again one worker at a time after a fresh reset: all 643 tests of the last pass and the earlier pass pass except two. `writer-ranks` › axe, every view, failed on a language left by another file and passes when run alone (5 passed). `reader-performance` › first paragraph within 2 seconds on a throttled phone measured about 2.8 s; it fails on main too on this machine (known since #210).

## Local check run

Run on the branch head before opening (Node 24, local Supabase):

- lint, prettier, typecheck, types:check, i18n:check, migrations:check, third-party check: pass
- `npm test` (Vitest): 219 files, 1365 tests, all pass
- `npx supabase db reset && npx supabase test db`: 170 files, 4098 tests, all pass
- `npm run test:e2e` for this part (`e2e/epic-s1-e11-round-2.spec.ts`): 1 passed
- Wrangler build of the Pages Functions and the production build: pass

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None new.

## Questions for Robert

None.

## Follow-ups

- S1-E11-14 (landing pages) and S1-E11-15 (contests) are bundle 13, next.
- Attachments on incoming support emails aren't kept, and the first-reply timer doesn't skip public holidays.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
