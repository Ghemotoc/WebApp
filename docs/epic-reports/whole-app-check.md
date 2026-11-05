# The whole-app check (bundle 17 CHECK, 5 November 2026)

Every epic check run again on the finished app in one go, on `main` at `dcbf056` (after bundles 1 to 14f), one test at a time. The epic reports in this folder each point here for that re-run.

Test data: seed personas only; the database was reset before the database tests and before re-running any failure.

## What ran

| Check | Result |
| --- | --- |
| Build without env, `third-party:check` | passed |
| Prettier, lint, `tsc -b`, `types:check`, `i18n:check`, `migrations:check` | passed |
| Vitest | 236 files, 1,481 tests passed |
| Database (`supabase test db`) | 200 files, 4,594 tests passed |
| Wrangler compile, build with env | passed |
| e2e, every file, in three shards with one worker | 2,379 passed, 7 failed, 1 skipped (2 h 19 min) |

## The seven e2e failures

Each failing file was run again on its own after a database reset.

| Test | Alone | What it was |
| --- | --- | --- |
| `chapter-editor`: the toolbar works by keyboard | passed (17 of 17) | timing under the long run |
| `download-my-stories`: the "ready" notification opens the block in Settings | passed (19 of 19) | timing: the page scrolled before the block finished loading |
| `forum-sticky-and-locked`: axe on a locked thread | passed (4 of 4) | Chromium logged a crash-handler error during it |
| `onboarding`: step 2 passes axe | passed (28 of 28) | timing under the long run |
| `support-tickets`: a visitor's Contact us message becomes a ticket | passed (30 of 30) | timing under the long run |
| `search`: axe at 390 px, light, ro | **failed again** | **a real bug, fixed in #346** (below) |
| `reader-performance`: first paragraph within 2 seconds on a throttled phone | failed again | known: this build machine is slower than the 2-second budget assumes, and the test has failed on it in earlier full runs too. Worth checking on a normal machine or staging |

### The real bug: the search page scrolled sideways on phones

At 390 px the search results page was 4,252 px wide. The rank pill on story cards (IDEAS-3a, #336) reads "Rank:" to screen readers through an absolutely positioned `sr-only` span. Nothing around it was positioned, so the span escaped the shelf's sideways scrolling and widened the page. #346 makes the pill's wrapper and every shelf cell `relative`; the search, shelf, Discover, Classics, home, library and rank e2e files then passed (112 of 112).

## Every epic, again

Every epic's own check file (`e2e/epic-s1-eN.spec.ts`, and the later rounds) passed in this run.

| Epic | Epic check file(s) | Report | Re-run |
| --- | --- | --- | --- |
| S1-E1 Foundations | `epic-s1-e1` | [S1-E1.md](S1-E1.md) | passed |
| S1-E2 Accounts and the age gate | `epic-s1-e2` | [S1-E2.md](S1-E2.md) | passed |
| S1-E3 Writing | `epic-s1-e3` | [S1-E3.md](S1-E3.md) | passed |
| S1-E4 Reading | `epic-s1-e4` | [S1-E4.md](S1-E4.md) | passed (the 2-second speed test aside, above) |
| S1-E5 Discovery | `epic-s1-e5` | [S1-E5.md](S1-E5.md) | passed; the search page bug above fixed in #346 |
| S1-E6 Social | `epic-s1-e6` | [S1-E6.md](S1-E6.md) | passed |
| S1-E7 Notifications | `epic-s1-e7` | [S1-E7.md](S1-E7.md) | passed |
| S1-E8 Forums, spaces and classes | `epic-s1-e8` | [S1-E8.md](S1-E8.md) | passed |
| S1-E9 Private messages | `epic-s1-e9` | [S1-E9.md](S1-E9.md) | passed |
| S1-E10 Safety | `epic-s1-e10`, `epic-s1-e10-round-2` | [S1-E10.md](S1-E10.md) | passed |
| S1-E11 Admin | `epic-s1-e11`, rounds 2 and 3 | [S1-E11.md](S1-E11.md) | passed |
| S1-E12 Banners, sponsors and ads | `epic-s1-e12` | [S1-E12.md](S1-E12.md) | passed |
| S1-E13 Data rights | `epic-s1-e13` | [S1-E13.md](S1-E13.md) | passed |
| S1-E14 Legal | `epic-s1-e14` | [S1-E14.md](S1-E14.md) | passed |
| S1-E15 The March numbers | `epic-s1-e15` | [S1-E15.md](S1-E15.md) | passed |
| S1-E16 Apps | none: S1-E16-01 and 02 wait for bundle 15/16 (an engineer) | [S1-E16.md](S1-E16.md) | nothing to re-run |
| S1-E17 Story Atlas | `epic-s1-e17` | [S1-E17.md](S1-E17.md) | passed |

## Found by the check, outside the tests

- **S1-E2-07b (staff Google Workspace sign-in) was never built.** It is a Must on the minors' launch gate. Built in #347, switched off until an owner sets the Vault secret `staff_email_domain` (GO-LIVE step 7.2).
- **Story issues the sync job never made:** S1-E11-01b, S1-E11-19, S1-E2-12, S1-E2-13 and every S1-E17 story are built but have no GitHub issue, because the "Sync story issues" job can't run while Actions is blocked by billing. Run it once billing is fixed (GO-LIVE step 0).
- **Main's e2e job** times out in CI (40 minutes for a suite that takes over two hours on one worker); the decision on sharding it is still Robert's.
