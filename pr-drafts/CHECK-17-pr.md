<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 17 CHECK, the last builder bundle: "every epic check run again on the finished app in one go, every built story's GitHub issue closed (or left open with a note saying what remains), a report for every epic, files that aren't app code moved out of the repository, and the final GO-LIVE list". This PR holds the parts that live in the repository; the rest is listed below.

## What changed

- **`docs/epic-reports/whole-app-check.md`:** the whole-app run on `main` after bundle 14f, every result, the seven e2e failures and what each one was, and every epic's re-run.
- **A report for every epic:** S1-E9, S1-E12 and S1-E17 had theirs only in pull request descriptions (#250, #326 and #240), and S1-E16 had none; they now have files like the others. Every report links to the whole-app check.
- **Files that aren't app code moved out:** `prompts/` (the starter kit's session prompts) and `docs/history/` (the record of how the plan and designs were made). Robert keeps both with the project's files, unchanged. `README.md` and `CLAUDE.md` say where they went.

## Done in other pull requests during this check

- #346: the one real bug the run found. The search page scrolled sideways on phones because the rank pill's hidden "Rank:" escaped a shelf's scrolling.
- #347: S1-E2-07b, staff Google Workspace sign-in, the Must story the check found was never built. Off until GO-LIVE step 7.2.

## Outside the repository

- Story issues: the built stories' issues are closed with a comment each; those with work left stay open with a note saying what remains.
- The GO-LIVE list in `by-hand-for-robert.md` is rewritten in the order to do it.

## Local check run

The whole-app run itself is in `whole-app-check.md`. On this branch, after bringing in main with #346 and #347 (GitHub Actions is blocked by billing):

- Prettier, lint, `tsc -b`, `i18n:check` and `migrations:check`: passed.
- The build: passed.
- Vitest: 237 files, 1,485 tests passed.
- This branch changes only docs and removes `prompts/` and `docs/history/`, which no code, test or workflow reads, so the database and e2e runs from the whole-app check still stand.

## By hand

Nothing new; GO-LIVE is in `by-hand-for-robert.md`.

## Follow-ups

- Run "Sync story issues" once GitHub billing is fixed: S1-E11-01b, S1-E11-19, S1-E2-12, S1-E2-13 and the S1-E17 stories have no issue yet.
- Main's e2e CI job can't finish in 40 minutes (the suite takes over two hours on one worker); sharding it is still Robert's call.
- `src/lib/platform/` (CLAUDE.md rule 16) doesn't exist yet; it arrives with the desktop app (bundle 15/16).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
