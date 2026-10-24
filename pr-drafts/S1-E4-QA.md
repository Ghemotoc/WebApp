## Story
S1-E4-QA: Epic check: Reading

Closes #45.

**Base branch:** `main`. Merge last in Lane A's S1-E4 chain, after [Ghemotoc/WebApp#191](https://github.com/Ghemotoc/WebApp/pull/191), [Ghemotoc/WebApp#192](https://github.com/Ghemotoc/WebApp/pull/192), S1-E4-06a and S1-E4-04: this branch is cut from S1-E4-04, so until they merge the diff here shows their changes too; merged in order, this one adds only its own commit.

## What changed
No feature. It walks the epic's main journeys across S1-E4-01a, 01b, 06a and 04, and writes the epic report.
- **`e2e/epic-s1-e4.spec.ts`** (browser):
  - **Journey 1:** teen_17 goes from the story page into chapter one, can't copy its text (the notice says why), reads on to chapter two, reaches "That's the latest chapter so far." and goes back through Contents. Each read is counted once.
  - **Journey 2:** a shared link's HTML has the preview and noindex. A visitor gets the story card and the teaser, can't copy it, counts no read and presses "Log in". Signed in as teen_17, the same address is the whole chapter.
  - **Journey 3:** at 16+ teen_17 still reads; kid_14_ok and kid_14_waiting are told it isn't available; a visitor sees the title and "No preview for this story" naming 16+.
  - **Journey 4:** the reader, the teaser and the 18+ notice at 390, 768 and 1440 px, at night and in Romanian, checked with axe, for sideways scrolling and for doodle overlaps.
- **`supabase/tests/database/093-epic-s1-e4.test.sql`** (database, 26 tests): the writer publishes two chapters through `publish_chapter()`.
  - A visitor gets the preview and 550 of 648 words, and can't count a read.
  - teen_17, kid_14_ok and kid_14_waiting each count one; the writer's own read doesn't count. The writer sees the total and never who read.
  - At 16+ only teen_17 reads, and the preview shows the title only. At 18+ only the writer reads. A deleted story is gone, preview included.
  - Numbered `093` because Lane C's chain uses `092` and `093` for its epic tests.
- **`docs/epic-reports/S1-E4.md`:** what was delivered, the journeys, the axe screens, the tables and policies with their tests, what works, the breaks found where stories met, the known gaps, the stubs still on, and **Lane A's by-hand list for staging (S1-E3 and S1-E4 together)**.
- **`docs/epic-reports/S1-E3.md`:** its two gaps that S1-E4 closed are struck through with a pointer (US dates, chapter rows without links), and the stub row for chapter rows is marked done.
- **`docs/code-tour.md`:** "Epic S1-E4 at a glance", with one main journey through the whole epic.

## Acceptance criteria and tests
| Criterion | Test | Result |
| --- | --- | --- |
| Playwright walks the main journeys across the epic's stories with adult_writer, teen_17, kid_14_ok and kid_14_waiting, and every journey passes | `e2e/epic-s1-e4.spec.ts` (journeys 1 to 4) and `093` (the writer's side and every persona's reads) | Pass |
| A break where two stories meet is fixed here or ticketed | Three found while building, all fixed (listed in the report). Two older specs flaked once in full runs and pass alone; Lane D owns test isolation. Nothing ticketed | Pass |
| axe at 390, 768 and 1440 px on every screen of the epic | Each story's spec (the report's table) plus journey 4 | Pass |
| Every policy on every table the epic touches has an allowed and a denied test | `chapter_reads_select_owner` in `141`; `check-policy-tests` passes; the report's table | Pass |
| The code tour covers the epic | "Epic S1-E4 at a glance" and "A shared link, before and after it opens" | Pass |
| The pull request includes a short epic report | `docs/epic-reports/S1-E4.md` | Pass |

## Definition of Done
- [x] **Code quality:** no feature code. The spec and the test have header comments naming the stories each journey crosses, and step comments.
- **Tests:**
  - [x] The epic's journeys pass.
  - [x] No new policy.
  - [ ] CI green (CI paused until 1 Nov; full checks run locally, below).
- [x] **Accessibility:** journey 4, plus each story's 12 views.
- [x] **Privacy:** seed personas only. The epic test checks the read totals hold no reader.
- [x] **Documentation:** the epic report, the S1-E3 report's corrections and the code tour.
- [ ] **Review:** Robert walks journeys 1 to 3 on staging and does the by-hand list.

## Screenshots against the board
No screen changed. The epic's screenshots are in S1-E4-01a's and S1-E4-04's pull requests.

## Readable code
Header comments on the spec and the test name each journey and the stories it crosses. Step comments explain each check. The keyboard-drag retry says why it is safe.

## Checks from a clean start
`npx supabase db reset`, then:
```
npm run lint          clean
npm run typecheck     clean
npm run build         clean
npm run types:check   generated types match the committed file
npm test              68 files, 399 tests passed
npx supabase test db  40 files, 749 tests passed (093: 26)
npm run test:e2e      414 passed, 1 skipped, 1 failed, 23 not run (18.6 min); the database suite passed again afterwards
npm run i18n:check    ro and en have the same keys; ș and ț used
```

The one failure is an axe view of S1-E3-05's story settings (390 px, light, Romanian); that spec's 23 later views didn't run because it runs in order. The spec then passed alone (28 of 28). It and the Manage chapters keyboard drag (S1-E4-04's run) are state leaking between tests, which Lane D owns. After the final edits (the test back at 093), the database suite, lint and `epic-s1-e4.spec.ts` (4 of 4) passed again.

## Hand-test steps (as a non-developer)
1. Walk journeys 1 to 3 from `docs/epic-reports/S1-E4.md` on staging, at phone width:
   - as `teen_17`, read a story's two chapters;
   - in a private window, open a chapter link;
   - rate the story 16+ and open it as `kid_14_ok` and signed out.
2. Do the by-hand list in the same report: the S1-E3 top-ups and jobs, the Cloudflare variables for link previews, the WhatsApp preview, the phone speed check, a screen reader, and reading the new Romanian text.

## By hand (staging)
The full Lane A list is in `docs/epic-reports/S1-E4.md`, "What Robert does by hand on staging". Nothing new comes from this story.

## Follow-ups (for the CTO; none opened as issues)
- **Lane C's migration versions:** their chain still uses `20261023100001` to `20261023140001`, which Lane A's migrations use on `main`. They need new versions when Lane C rebases onto `main`.
- **Lane C's test `042`:** it will fail once both chains are on `main` unless someone adds `story` and `chapter` branches to `reportable_item_owner()` and `reportable_item_summary()` (S1-E3-01 and S1-E3-02a registered both types). I propose Lane C adds them in that rebase; the alternative is the first S1-E6 PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01UNTELkhUhzdarejsvQSfeb
