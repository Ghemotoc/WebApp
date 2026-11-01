<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-QA (Epic check: Privacy and data rights). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part g, the last part: the five privacy and data rights stories tested together, end to end, with the seed personas the story names. The epic report is `docs/epic-reports/S1-E13.md`.

## What changed
- **`e2e/epic-s1-e13.spec.ts`**, five journeys:
  - kid_14_ok, an under-16, finds every privacy setting on its most private value, shows their library to people they follow, then downloads their data: `data.json` is theirs and holds the new choice (S1-E13-01 × S1-E13-02);
  - kid_14_waiting, read-only until a parent agrees, still gets their data (S1-E2-03 × S1-E13-02);
  - adult_writer downloads a completed story as a Word file and makes its EPUB from the same block; eight days on, the nightly clean-up removes the Word copy and the block no longer offers it (S1-E13-05 × S1-E13-04);
  - teen_17 closes their account, the closing page stands in front of Settings and Download my data, and after "Keep my account" the download works again (S1-E13-03 × S1-E13-02);
  - the epic's four Settings sections at 390, 768 and 1440 px, at night, in Romanian, as kid_14_ok, with axe.
- **`supabase/tests/database/214-epic-s1-e13.test.sql`**, 22 tests: the same journeys through the functions, both kinds of copy removed by `run_retention_jobs()` once expired (with the count in `retention_runs`), teen_17's export deleted with the account after 14 days, and `data_export_tables()` and `account_deletion_rules()` naming the same tables (`exports`, the copy itself, is the one table only deletion names).
- **`docs/epic-reports/S1-E13.md`**: what works, the known gaps and the stubs still on.
- **`docs/code-tour.md`**: one journey through the whole epic.
- **`docs/mocks.md`**: the "online status, no switch yet" line is gone; S1-E13-01 built the switch.

## How it was tested
See the local check run. The full browser run for bundle 8 ran before this merge.

## Local check run
All run locally on this branch:
- Vitest: 175 files and 1,037 tests passed (the policy-test check included).
- Database (pgTAP, after a reset): 124 files and 2,869 tests passed, `214` with 22.
- Playwright, fast checks: `epic-s1-e13`, `privacy-settings`, `delete-my-account`, `download-my-data`, `download-my-stories` and `epub`, 117 passed.
- Playwright, the bundle 8 full run: 3 parallel shards then `legal.spec.ts` alone; 1,201 passed in parallel and 68 failed in 57 files from shards sharing one database. After a `db reset`, those 57 files ran again one at a time: 1,011 passed and 2 failed. One was the disk filling up with traces (`manual-age-check`, 28 of 28 passed after clearing `test-results`). The other is the known reader timing, "first paragraph within 2 seconds", which fails on main too.
- Lint, typecheck, `types:check`, `i18n:check`, `migrations:check`, the build, the third-party check and the Wrangler build all passed.

## By hand
None.

## Board mismatches
None new.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **A closing account can't download its data** during its 14 days; the person can choose "Keep my account", download and close it again. Say if the closing page should offer the download itself. IDEA-20261101-2 covers the confirm step before closing.

## Follow-ups
- `data.json` shows a privacy choice nobody made as empty (it means the age group's default). IDEA-20261101-1, the "What's in this file" guide, is the place to explain it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
