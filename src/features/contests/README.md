# Contests

Contests that writers enter with one of their stories (story S1-E11-15). Built in bundle
CONTESTS-13b1 (set-up, opening and entries); the staff entries list, results and certificates come
in 13b2. Every contest belongs to one contest landing page (`src/features/landing-pages/`), which
tells visitors about it.

- `api/contests.ts`: the one way the app reads and writes contests: the `contests` table and the
  `admin_*_contest*` functions for staff, `contest_entry_options()`, `enter_contest()` and
  `withdraw_contest_entry()` for writers. Failures become a `ContestError` with the server's reason.
- `hooks/useStaffContests.ts` (the staff list and one contest's editor) and
  `hooks/useStoryContests.ts` (the card in a story's settings).
- `components/StoryContestCard.tsx`: the Contests card in a story's settings.
- `components/staff/`: Staff › Contests, the editor and the panel that opens a contest.
- `lib/contestWords.ts`: names, days and countries in the reader's language.

The field limits and problem codes are in `src/schemas/contests.ts`, mirrored by the database. The
interface text is the `contests` namespace, registered by `registerContestTranslations.ts`.
