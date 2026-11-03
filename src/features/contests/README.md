# Contests

Contests that writers enter with one of their stories (story S1-E11-15). Built in bundle
CONTESTS-13b1 (set-up, opening and entries) and 13b2a (the staff entries list and disqualifying);
results and certificates come in 13b2b. Every contest belongs to one contest landing page (`src/features/landing-pages/`), which
tells visitors about it.

- `api/contests.ts`: the one way the app reads and writes contests: the `contests` table and the
  `admin_*_contest*` functions for staff, `contest_entry_options()`, `enter_contest()` and
  `withdraw_contest_entry()` for writers. Failures become a `ContestError` with the server's reason.
- `api/contestEntries.ts` and `hooks/useContestEntries.ts`: one contest's entries for staff and
  disqualifying an entry (part 13b2a), shown by `components/staff/ContestEntriesSection.tsx` and
  `DisqualifyForm.tsx`.
- `hooks/useStaffContests.ts` (the staff list and one contest's editor) and
  `hooks/useStoryContests.ts` (the card in a story's settings).
- `components/StoryContestCard.tsx`: the Contests card in a story's settings.
- `components/staff/`: Staff › Contests, the editor and the panel that opens a contest.
- `lib/contestWords.ts`: names, days and countries in the reader's language.

The field limits and problem codes are in `src/schemas/contests.ts`, mirrored by the database. The
interface text is the `contests` namespace, registered by `registerContestTranslations.ts`.
