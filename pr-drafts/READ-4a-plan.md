# READ-4a plan: S1-E4-03 library and continue reading (#36)

- Migration `20261102100001_s1_e4_03_library.sql`: enum `library_shelf`; tables `library_entries` and `reading_positions` (owner-only select policy, no write policies, select granted to authenticated); functions `save_reading_position`, `set_library_shelf`, `my_place_in_chapter`, `story_library_state`, `my_library`, `my_follows`; the `library` list kind.
- Tests: pgTAP 179 (allowed and denied for both policies, the shelf rules, blocks, follows); 021 lists the new tables.
- Screens: `/library` (board 3.7), `/library/:shelf` (the See all page), the story page's Start or Continue and Library drop-down, and the reader's saved place and offer.
- Acceptance criteria: 1, the place is saved and offered (e2e plus pgTAP); 2, the three shelves (e2e); 3, private (RLS tests plus the visitor e2e); 4, full titles on covers (the shared cover components); 5, a shelf of 20 with View more (the shared Shelf plus the See all route).
