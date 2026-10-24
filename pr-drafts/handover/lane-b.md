# Hand-over: Lane B (doodles, classics, demo content), 24 Oct 2026

From the Lane B session to the new thread "Ghemotoc · Tooling and merges". Everything below is
pushed. Nothing has a new pull request: GitHub Actions minutes are paused until 1 Nov (CTO, 24 Oct
2026). Already merged: Ghemotoc/WebApp#188 (demo content 2a with 19 classics, `4d85da5` on main).

## Branches

| Branch | Tip | What's in it | Checks | Unfinished |
| --- | --- | --- | --- | --- |
| `claude/practical-lovelace-vo00ia-topup-parts` | `bb6f313` | `npm run demo:build` also writes the demo top-up as 7 parts, `supabase/staging-topups/demo-content-2a/part-01..07.sql`. The largest is 447,199 bytes and the limit is 450,000. The generator splits at statement boundaries. Each part has its own begin/commit and the personas guard. Part 01 holds the settings and accounts, and part 07 ends with the check query. The single file is unchanged. Unit tests are in `scripts/demo-content-parts.test.ts`. `npm run demo:compare-parts` checks the rows on a local database. The README gives the SQL Editor run order. | lint, typecheck, Vitest (scripts project, 101 tests) and pgTAP (688 tests) pass. `demo:compare-parts` gives the same counts and md5 checksums for the single file and the parts, and a second run of the parts changes nothing. e2e was not re-run because no app code changed. | No PR. The CTO asked for the branch only. Open the PR after 1 Nov if it is wanted on main. |
| `claude/practical-lovelace-vo00ia-rebased-for-1-nov` | `49f5a8a` | **Parked head of Ghemotoc/WebApp#181** (doodles take their colours from the tokens), rebased on `4d85da5`. Both labelled blocks are kept in `docs/code-tour.md`. | All CLAUDE.md checks passed locally after the rebase. | On 1 Nov: force-push `49f5a8a` to `claude/practical-lovelace-vo00ia`, the PR branch, which is still `5d35a06` and conflicting. Rebase again first if main has moved, then run the checks and tell the CTO when CI is green. Robert clicks merge. |
| `claude/practical-lovelace-vo00ia-classics-followup` | `fd586bd` | **Classics follow-up.** Adds Capra cu trei iezi (Wikisource rev 138620, edition 1875, so 20 of 20 classics) and fixes `<dd>` verse lines in the converter. | Local checks passed when it was pushed. | Open the PR on 1 Nov. The years for Sara pe deal, Balada and Neghiniță are still blank because Wikisource returned 429. Add them only if Wikisource confirms them, never guess. Keep requests serial, with the GhemotocBot/0.1 (hello@themagiccoffin.com) User-Agent and maxlag, about 1 s apart. |

The local `claude/practical-lovelace-vo00ia` branch is the same commit as the parked one (`49f5a8a`).
It was not pushed, as the CTO asked.

## Waiting on Robert

- **Ratings for Capra cu trei iezi (All ages) and Neghiniță (13+).** The CTO asked whether one rule
  should apply to both. Leave both ratings as they are until Robert answers.

## Flaky e2e tests (for Lane D)

- **`e2e/usernames.spec.ts:127`**, "usernames and pen names (S1-E2-04) › accessibility › axe: /setup
  at 1440 px, night, ro". The test failed on `expect(locator).toHaveAttribute(...)` before the axe
  run started. It failed in 1 of the last 2 full local runs and passed on the re-run.
- **`e2e/manage-chapters.spec.ts:254`**, "Manage chapters (S1-E3-04) › dragging by keyboard: Space
  picks up, arrows move, Space drops". The test failed after about 7 s, and the chapter order was
  wrong after the drop. It failed in 2 of about 6 full local runs and passed on the re-run. Neither
  test touches Lane B files.

## Later

- Part 2b (likes, comments and follows for the demo content) waits for the S1-E6 stories.
