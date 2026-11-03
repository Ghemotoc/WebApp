<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #113

Bundle 13 CONTESTS, part b1: setting up and opening a contest, and writers entering one (S1-E11-15 criteria 1 to 4). The staff entries list, disqualifying, results and certificates follow in part b2.

## What changed

- **Staff › Contests** (owner and admins, like the rest of the website CMS). A contest starts on a contest landing page that has none yet. The editor holds the name in both languages, the entry window, the results day, the age groups, markets and languages, what counts in both languages, the word limit, the prize in both languages, who delivers it, the judges and the address of the rules help page.
- **Opening.** The editor lists what still stops the contest from opening: a missing detail, dates out of order, the landing page not live, its Rules block not linking to the rules help page, or that help page not published in Romanian and English for every contest market. "Open the contest" works once nothing does. An open contest can still be changed, but never into a state that would stop it opening.
- **Entering.** A writer's story settings gain a Contests card listing open contests taking entries today. It says why a story can't enter (not readable, class only, wrong language, rating, over the word limit, the writer's age group or country) or offers "Enter <contest>". One entry per writer per contest; they can withdraw while entries are open and enter another story.
- **Rules in the database:** entries from the open day to the close day, both included, in Romanian time; when 13 to 15 is one of the age groups, only All ages and 13+ stories may enter; the word limit counts published chapters.
- **Records:** retention row for `contest_entries`, two builder proposal rows in decisions, the code tour and the feature's README. Download my data includes a writer's entries and deleting an account deletes them.
- The Sponsor field comes with bundle 14b.

## How it was tested

- Database test 265 (44 tests): only owner and admins create, save and open; a page that isn't a contest page or already has one is refused; bad values (age group, market, language, word limit, rules address, too long) are refused; opening is refused while details are missing, the rules exist in one language only or aren't linked from the page; opened once complete, then a save that would break it is refused; a writer enters, can't enter twice, withdraws and enters again; the rating rule for 13 to 15; nothing after the window closes; allowed and denied tests for all three policies; nobody writes the tables directly; the export and deletion lists. Test 021 lists both tables as invisible to visitors.
- e2e `e2e/contests.spec.ts`: an admin creates a contest, fills every field, saves, sees nothing left to fix and opens it; a writer enters a story from its settings and withdraws it; axe on both screens.

## Local check run

Run on the branch head (Node 24, local Supabase), after rebasing onto main with #310:

- lint, prettier, typecheck, types:check, i18n:check, migrations:check, third-party check: pass
- `npm test` (Vitest): 221 files, 1389 tests, all pass
- `npx supabase db reset && npx supabase test db`: 175 files, 4223 tests, all pass
- `wrangler pages functions build`: compiles
- `npx playwright test e2e/contests.spec.ts e2e/story-settings.spec.ts e2e/landing-pages.spec.ts`: 56 passed, 1 failed on the first run (the test ticked the first market, Australia, where the rules page wasn't published, so the screen rightly refused to open the contest); the test now ticks Romania and `e2e/contests.spec.ts` passes (2 passed)

The full end-to-end run comes once at the end of bundle 13 (Robert's choice, 30 Oct 2026). GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None: no board draws Staff › Contests or the Contests card yet; both use the plain staff and settings components.

## Questions for Robert

None blocking. The two decision rows are proposals (owner and admins only; one entry per writer; the 13 to 15 rating rule). Please read the new Romanian text in `src/locales/ro/contests.json`.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
