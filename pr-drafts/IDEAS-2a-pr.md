<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part a: downloads and privacy (ideas IDEA-20261101-1, -2 and -5 from `feature-ideas/2026-11-01.md`, approved by Robert on 2 Nov 2026, 22:00). These ideas have no story issue.

## What changed

- **A "READ ME FIRST" guide in Download my data (idea 1):**
  - The ZIP now starts with `READ ME FIRST.txt` (`CITEȘTE ÎNTÂI.txt` in Romanian), in the person's language. It names each file and folder in the ZIP and each part of `data.json`, and gives one line for every group under `tables`. Groups that are empty for that person are marked "(empty)".
  - Staff copies sent as a ZIP for a data request get the same guide, in the person's language.
  - The lines are interface text in `dataExport.json` (`guide.*`), so admins can reword them. A unit test reads the newest `data_export_tables()` and `export_tables_of()` from the migrations and fails when an exported table has no line in both languages (the idea's second criterion).
- **"Download your stories first" on the Delete your account step (idea 2):**
  - A writer sees a box above the delete buttons. Its button makes every story's files with Download my stories' defaults (chapters and plan, as Word files), then shows "Your files are ready" and Download.
  - The person stays on the same delete step, so nothing is lost. Someone with no stories doesn't see the box.
- **"How long we keep things" in Settings › Privacy (idea 5):**
  - A list that opens and closes, showing how long we keep notifications, deleted stories and comments, reported messages, moderation mail, support tickets, reading minutes, the scrambled sign-up address, invites and an account waiting to be deleted. Private messages are listed as kept "until both people delete the chat".
  - The list ends with a link to the privacy notice.
  - The periods come from the new `retention_periods()`, which reads the same settings the clean-up jobs use. A staff change shows the next time the list opens, with no release.
  - Only those settings are read; the settings table stays closed to members.

## Tests

- The new database test `279-retention-periods` (7 tests):
  - the kinds, in order;
  - each period is its setting;
  - years are shown as years;
  - a staff change shows at once;
  - a value that isn't a whole number is left out;
  - visitors are refused;
  - the settings table stays closed to members.
- The new `exportGuide.test.ts` covers the file lines, the table lines, "(empty)", ș and ț, and the coverage check in both languages.
- The run tests (`runDataExport.test.ts`, `runDataRequestCopy.test.ts`) check that the guide comes first in the ZIP.
- The new e2e test `downloads-and-privacy.spec.ts`:
  - the Romanian ZIP starts with the guide;
  - a writer downloads their stories from the delete step and stays on it;
  - a person without stories doesn't see the box;
  - the periods show and follow a staff change;
  - axe and no sideways scrolling at 390, 768 and 1440 px.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 228 files, 1,432 tests passed.
- Database (`supabase test db`): 189 files, 4,430 tests passed, the new 279 included.
- Wrangler compile and the build with and without env, plus `third-party:check`: passed.
- e2e (downloads-and-privacy, delete-my-account, privacy-settings, download-my-data, download-my-stories, data-requests): 146 passed.

## By hand

Nothing.

## Questions for Robert

None. The wording of the guide and the periods list is draft text, and you read all new Romanian text.

## Follow-ups

- Add an age-check attempts line (6 months) once that period moves into a setting. Today it is fixed in the job, so it is left off rather than shown in a way that could drift.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
