<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E2-06 (onboarding: set up your profile). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 6 ACCOUNTS-2, part d: S1-E2-06, the "Set up your profile" steps at `/setup` (board Onboarding 2.5), the "Picked for you" shelf they fill, and Settings › What you like.

## What changed

- **Database:** `20261107100001_s1_e2_06_onboarding.sql`.
  - `profiles.onboarded_at`: empty for a new account until it finishes or skips setup. Existing accounts get their `created_at`, so nobody already here is asked again, and every seed persona counts as set up.
  - `regions`: Romania's 41 counties and Bucharest (ISO 3166-2). Everyone reads it, nobody writes it. `profiles.region_code` is optional.
  - `reading_preferences`: the person's own picks (categories to read and write, recommended topics). The owner reads them; nobody writes them directly.
  - `profiles.adults_may_message`: off by default; only a 16 or 17-year-old can turn it on (S1-E9-03 reads it).
  - `my_onboarding()` (never the year of birth), `onboarding_topics(language)`, `save_my_region()`, `save_my_preferences()` (at most 30 topics), `set_adults_may_message()` and `finish_onboarding()` (needs the username).
  - Setup is due only once the account is past the age check, so it follows the age check as the story asks.
  - `browse_stories('picked')`: stories in a liked category or with a picked topic. Discover's `discover_shelves` setting gets `picked` after `following`.
- **Screens:** `src/features/onboarding/`.
  - `/setup` is now `OnboardingPage`. Step 1 covers the username (only when missing), the interface language, the country line and the optional county. Step 2 covers likes, as chips with a live count. Step 3, "Staying safe here", is for under-18s only: block, report, who can message you (a line for under-16s, "Let adults message me" for 16 and 17), and the guidelines in short. Finishing or skipping goes to Discover. Focus moves to each new step's heading.
  - An older account without a username still gets the username form alone, which goes home as before.
  - `SetupProfileNotice` also says "Finish setting up your profile" while setup is due.
  - Settings gets "What you like": the county, the likes and, for 16 and 17-year-olds, the adult messages switch.
  - Discover and See all know the `picked` list. Both personal shelves (Following, Picked for you) are hidden when signed out.
  - `Select` gains an optional `descriptionId`.
- **Text:** `account.json` (`onboarding.*`), `discovery.json` and `settings.json`, in ro and en.
- **Docs:** `docs/retention.md` (county, likes and the adult messages switch), `docs/code-tour.md`, `supabase/README.md`, `docs/board-fixes.md` and the new feature README. `SetupPage` is gone: `SetupForm` now takes `onDone`.

## How it was tested

- **pgTAP `202-onboarding` (31 tests):**
  - when setup is due (new, done, age check pending, signed out);
  - the county (kept, refused when unknown, cleared);
  - the likes (kept, an unknown category or a non-recommended tag refused);
  - "Picked for you" holds only matching stories;
  - the adult messages switch, for 16 and 17 only;
  - finishing;
  - `regions_select_everyone` and `reading_preferences_select_own`, each allowed and denied.
  - `021-signed-out-reads` is updated.
- **e2e `onboarding.spec.ts` (28 tests):**
  - a new adult sees the notice, goes through two steps (county Cluj, Poetry), and lands on Discover, where "Picked for you" shows the poem and not the fiction;
  - Settings shows the picks and saves changes;
  - a 17-year-old gets step 3 with the switch off, ticks it (saved) and skips to Discover; the switch is in Settings too;
  - axe on steps 2 and 3, and axe with no sideways scroll on `/setup` and `/settings` at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye in Romanian: steps 1 to 3 at 390 (light) and 1440 (night), and Settings › Ce îți place at both widths. The adult messages switch in Settings sat loose under Save, so it got its own "Who can message you" heading and a dividing line.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 966 of 966.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 112 files, 2,478 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** with `--workers=1`, `onboarding` passes 28 of 28. `usernames`, `sign-up`, `discover`, `epic-s1-e2`, `age-check`, `parent-consent`, `settings-admin` and `home` pass too (211 of 211 with `onboarding`). `sign-up` needed one change: after confirming, the home page now also shows "Finish setting up your profile", so its "Continue" link is matched exactly. The full run comes at the end of the bundle (part f).

## By hand

- Nothing for staging: the migration marks every existing account, the personas included, as set up.

## Board mismatches (Onboarding 2.5)

- On step 1, the username and pen name show only for an older account without a username. The username has been chosen at sign-up since 25 Oct 2026, and the pen name is in Settings (already in `docs/board-fixes.md`).
- On step 3, the board's "Who can message you" offers Everyone, People I follow or Nobody. Here it's a line for under-16s and one "Let adults message me" switch for 16 and 17-year-olds. The wider message settings come with S1-E9-03.
- The board's "Three short steps" includes "Step 3 of 3 · for adults", which is the Teacher badge step. For now adults have two steps ("A few short steps"). The Teacher badge step joins in part f (S1-E2-11).
- The progress line above the card (Your account, Age check, Your profile) is left out. Sign-up and the age check are separate screens, so the card's own "Step n of n" shows the progress.

## Follow-ups

- The county's hint says it is used only for a "Popular in your area" shelf, and that shelf doesn't exist yet. It needs a story, or the hint should change until it does.
- `adults_may_message` is stored but not used until private messages arrive (S1-E9-03, bundle 7).
- Story issues for S1-E2 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
