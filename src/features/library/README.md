# Library

The reader's library and their place in every chapter. Built by READ-4a: S1-E4-03 (library and continue reading).

- `components/LibraryPage.tsx`: screen 3.7 at `/library` (header with the "Private" note, ContinueReading, LibraryShelves, ReadingListsCard, FollowingSection). Board: `design/boards/Library.dc.html`.
- `components/ContinueReadingCard.tsx`: one story to carry on with: the place, the kind of screen, "Chapter 15 is out", Contents and Continue (a glass card since bundle G7d2).
- `components/LibraryShelves.tsx`: the Reading, Saved for later, Finished and My stories chips and the chosen shelf as the shared Shelf (See all at `/library/<shelf>`, the discovery feature's StoryListPage).
- `components/MyStoriesShelf.tsx`: the "My stories" shelf, the writer's own stories with drafts, each opening its chapters in the writing tools, plus a link to Your writing (bundle NAV-1).
- `components/FollowingSection.tsx`: the writers and stories the reader follows, with the shared FollowButton.
- `components/StoryReadingActions.tsx`: "Start reading" / "Continue chapter n" and the Library drop-down on the story page.
- `hooks/`, `api/library.ts`: `my_library()`, `my_follows()`, `story_library_state()`, `set_library_shelf()`, `my_place_in_chapter()`, `save_reading_position()`.
- `lib/places.ts` (where Continue leads, "Chapter 15 is out"), `lib/deviceKind.ts` (phone, tablet or computer from the window width).
- The reader screen's side lives in `src/features/reading/`: `hooks/useSavedPlace.ts` and `components/SavedPlaceOffer.tsx`.
- The database side: `supabase/migrations/…_s1_e4_03_library.sql`; test `179`.
- `components/FinishedThanksButton.tsx` and `hooks/useFinishedThanks.ts` (IDEAS-1 part c): "Tell the writer you finished it" on a story on the Finished shelf, through `send_finished_thanks()`; it reads "Sent" once it went.
- `components/ReadingHabitNote.tsx` and `ReadingHabitSettings.tsx` (IDEAS-1 part b): "Your reading days", the private reading streak, from `src/features/reading-habit/`.
- Reading lists (GAPS-6; the board's "Your lists"): `components/ReadingListsCard.tsx` (the Library's rows and "New list"), `components/NewReadingListForm.tsx`, `components/ReadingListPage.tsx` at `/library/lists/:listId` with `components/ReadingListOwnerTools.tsx` (rename, who sees it, remove a story, delete), and `components/AddToReadingList.tsx` on the story page. `hooks/useReadingLists.ts`, `api/readingLists.ts`: `my_reading_lists()`, `reading_list()`, `story_reading_lists()`, `create_reading_list()`, `update_reading_list()`, `delete_reading_list()`, `set_story_in_reading_list()`. `lib/readingListAddress.ts`. The database side: `supabase/migrations/…_gaps6_reading_lists.sql`; test `328`.
