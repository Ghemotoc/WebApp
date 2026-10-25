# PEOPLE-2 plan: Discover, story lists and sorting (S1-E5-01, S1-E5-09, S1-E5-02)

Written 25 Oct 2026 by the builder, from main at aaa20b5. Not waiting for approval (builder brief).
Issues to find: S1-E5-01, S1-E5-09, S1-E5-02 (S1-E5-08 moves, below).

## Order change (Decisions taken)
- **S1-E5-08 (public home page) moves to CMS-1.** Its text comes only from the CMS (S1-E11-06 and
  S1-E11-12, decided 17 Oct 2026, 19:14), and those are built in CMS-1. Building the page first would
  mean hard-coding copy the rules forbid. CMS-1 builds it straight after S1-E11-12.
- **S1-E5-02 ships every sort but popularity now.** Popularity needs the score from S1-E5-03 (PEOPLE-3);
  PEOPLE-3 adds it as the default. Until then the default is "Recently updated".

## Database (one function, shared by every list)
- `story_card_json(stories)`: one story as a card: slug, title, blurb, writer {handle, display_name},
  category, language, status, rating, cover, chapter count, last update. Never a user ID.
- `browse_stories(list_kind, list_key, category, completion, language, sort_order, page_size, page_offset)`
  answers {total, stories}. Kinds: `updated` (Recently updated), `new` (newest first published),
  `completed`, `category` (key = slug), `tag` (key = tag name), `following` (writers the caller follows),
  `writer` (key = username; the profile's See all). Every list leaves out: deleted, unpublished,
  moderated away, ratings above the reader's age (`rating_allows()`: visitors see All ages and 13+),
  writers either side blocks.
- Sort (S1-E5-02): newest, oldest, A to Z, Z to A, by writer; titles and names compared with "ro-x-icu";
  ties broken by the newer story, then the slug.
- `discover_shelves()`: not needed; Discover calls `browse_stories` once per shelf (21 rows to know if
  there are more, plus the total for "View all 54 in …").
- pgTAP 151 (lists, filters, ratings, blocks, moderation, the following list, no user ID) and 152 (sorts,
  Romanian alphabet, ties). No new table, so no new policy; 021 and 003 unchanged.

## Screens (src/features/discovery/)
- `/discover`: Discover. Eyebrow and heading, the category chips, then shelves: New from writers you
  follow (signed in, when not empty), Recently updated, New stories, Completed, and one per category.
  Each shelf is the shared `Shelf` (one line, at most 20, View more).
- `/discover/all/:listKind`, `/discover/c/:category`, `/discover/t/:tag`, `/u/:handle/stories`: one
  list page (board 3.10 See all): breadcrumb, eyebrow, title, "n stories", filters (category chips where
  it isn't the category page, status chips, language drop-down) and Sort, the grid of cards, "Load more".
  Filters and sort live in the address, so a list can be shared; the last sort is kept for the session.
- Category accent colours from the tokens (fiction plum, poetry gold, essays sage).
- Tags on the story page become links to their tag page. "Discover" joins the top bar.

## Not in PEOPLE-2
- Featured hero, continue reading, ad slot, popular in your area, writers to follow (other stories or
  after March). The rating chips on See all (the database already hides what a reader may not see).
