<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #36

This is part (a) of the READ-4 bundle in Robert's full-app plan: S1-E4-03, the library and continue reading. Reading settings, sharing, the writer dashboard and the numbers follow in parts b to e.

## What changed

- **The reader's place, on every device:**
  - The chapter reader saves how far the reader got 3 seconds after they stop scrolling, and again when they leave or switch tab. Only a reader who scrolled saves, so a quick look never overwrites a place further on.
  - The kind of screen is kept for "on your phone": phone, tablet or computer, from the window width only. No device name, model or address is ever sent.
  - Next time, on any device, the chapter says "You stopped 45% of the way through this chapter" with "Go back there". It offers and never jumps on its own.
- **Library page (`/library`, board 3.7; Library joins the top bar):**
  - "Continue reading": up to 4 stories, most recently read first, each showing "You stopped halfway through chapter 14 on your phone, 2 hours ago", a progress line, "Chapter 15 is out" or "Completed story", and Continue. Continue opens the next chapter once the reader finished theirs.
  - "Stories in your library": Reading, Saved for later and Finished chips with their sizes. The chosen shelf is the shared Shelf (one line of at most 20, "View more" to `/library/<shelf>`), and each card says "Chapter n of N".
  - "What you follow": the writers and stories the reader follows, each with its Following button.
  - "Private. Only you can see your library." A visitor gets a log-in card instead.
- **Shelves fill themselves:**
  - A story joins Reading the first time the reader keeps a place in it.
  - At the end of the last chapter of a completed story, it moves to Finished.
  - Reading a story saved for later moves it to Reading.
  - A writer's own story never fills their library.
- **Story page:**
  - "Start reading" (the first chapter) or "Continue chapter n".
  - A Library drop-down: Not in your library, Reading, Saved for later or Finished. It saves at once.
- **Database:**
  - New `library_shelf` enum.
  - New tables `library_entries` and `reading_positions` (kind `user_action`, `user_id` not null). Each has one select policy for its owner only, `select` granted to `authenticated`, and no write policies: writes go only through the functions.
  - New functions: `save_reading_position()`, `set_library_shelf()`, `my_place_in_chapter()`, `story_library_state()`, `my_library()` and `my_follows()`, plus internal helpers.
  - The `library` story list in `list_holds_story()`, `is_story_list_kind()` and `list_default_sort()`: the caller's own shelf, and nobody else's.
  - Ratings, blocks and moderation apply everywhere, through `reader_visible_story()` and `listed_stories()`.
- **Privacy:** reading history is personal data. It is readable by its owner only and never shared with advertisers or sponsors (S1-E4-03 legal note). `docs/retention.md` has the new row.
- **Docs:**
  - `docs/code-tour.md`: a section on how a place travels.
  - `docs/board-fixes.md`: three new rows.
  - A new `src/features/library/README.md`.

## Board mismatches (in docs/board-fixes.md)

- These are left out until their stories exist:
  - the ad slot (S1-E12-01);
  - "Your lists" (no story builds reading lists);
  - "Downloaded to read offline" (the apps, S1-E4-08);
  - "Change" beside Private (S1-E13-01);
  - "Notification settings" (S1-E7-02).
- The shelf is the shared Shelf of card links rather than a grid of cards with Continue buttons, because of CLAUDE.md rule 20.
- The story page's "Library" is a drop-down, so every shelf is one step away by keyboard.

## How it was tested

- `supabase/tests/database/179-library.test.sql` (22 checks):
  - allowed and denied tests for both policies;
  - saving a place, filling Reading and Finished, and a saved story moving to Reading;
  - an unknown device refused, and a signed-out visitor refused;
  - the writer's own story staying out of their library;
  - adding to and removing from a shelf, with the place kept;
  - shelves listed for the owner only;
  - the counts and Continue in `my_library()`;
  - a blocked story refused;
  - `my_follows()`.
- `021-signed-out-reads` now lists both tables (0 rows for a visitor).
- `e2e/library.spec.ts` (6 tests):
  - scroll, leave, then on a fresh browser "You stopped …" and "Go back there", Continue on the Library and "Continue chapter 1" on the story page;
  - the drop-down saving for later, the shelf chips and counts, and the `/library/saved` See all page;
  - the visitor's log-in card;
  - no doodle overlap at 1440, 768 and 390 px;
  - axe at 390 px in ro and en.
- Unit tests: `lib/places.test.ts`, `lib/deviceKind.test.ts`, `reading/lib/savedPlace.test.ts` (the scroll position matches the progress line's measure) and `useSavedPlace.test.ts`.

## Follow-ups

- "Your lists" (reading lists) on the board has no story yet. It would be a new user-content type (it needs reporting if lists can be shared).
- The retention of old places is a proposal: places could be purged after 2 years. It is in `docs/retention.md` for the lawyer.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
