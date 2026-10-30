<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #49

This is part (a) of the DISCOVER-2 bundle in Robert's full-app plan: S1-E5-04, search. Part (b) (the classics shelf and S1-E11-16b) follows in its own pull request.

## What changed

- **Search field:** Discover gets a search field ("Search stories, writers and tags"). It opens `/search?q=…`, which also has the field at the top. Two letters are the minimum.
- **Matching:**
  - stories match on their title, blurb, the writer's username and pen name, a classic's author, and every language's name of their approved tags;
  - capitals and diacritics don't matter ("povesti" finds "Povești"; ş and ţ are corrected);
  - Romanian and English word endings match ("povestea" finds "povești"; "story radio" finds "Stories about old radios");
  - a word typed only in part still matches.
- **One set of rules:** search is a new list kind on the existing story list machinery: `browse_stories('search', term)` → `listed_stories()` → `list_holds_story()` → `story_matches_search()`. Age ratings, blocks, moderation and drafts are therefore checked in the same place as on every other list, and filters and Load more work unchanged.
- **Results page:**
  - three groups (Stories, Writers, Tags) as chips with their counts;
  - the chosen group is one line of at most 20, with a "View more" card to its See all page (DoD shelf rule);
  - Stories See all is the shared list page at `/search/stories`, sorted by a new "Best match" (`relevance`) order: title matches first, then the text rank. Only search accepts it; other lists refuse it, and it is never remembered as the reader's sort;
  - Writers and Tags See all are `/search/writers` and `/search/tags`, 24 a page with Load more;
  - nothing found shows an empty state with "Browse Discover".
- **Writers and tags:**
  - `search_writers()` lists only writers with at least one story this reader may see, so a search never turns up a minor's (or any reader's) account. It returns the handle and display name, never a user ID;
  - `search_tags()` finds approved tags by any of their names.
- **Database:**
  - new functions only: `search_fold()`, `search_query()`, `search_like_pattern()`, `story_search_text()`, `story_search_document()`, `story_matches_search()`, `story_search_rank()`, `search_writers()` and `search_tags()`;
  - `list_holds_story()`, `list_default_sort()` and `browse_stories()` were redefined with the search branch.
- **No new table and no new policy.**

## Departures from the board (Search 3.2)

- No Forum posts group: forums come with S1-E8, and S1-E8-10 adds post search.
- No ad slot: ads come with S1-E12.
- Tags are the third group instead.
- No doodles on the search page.

## How it was tested

- `supabase/tests/database/177-search.test.sql` (18 checks):
  - title, blurb, tag in another language and pen name matches;
  - diacritics, capitals and both languages' word endings;
  - partial words, and a single letter finds nothing;
  - 16+ hidden from a visitor and shown to an adult;
  - a blocked writer's and a hidden story never found;
  - relevance refused on other lists;
  - writers by pen name, no user ID, and no account without a visible story;
  - tags in any language.
- `e2e/search.spec.ts` (29 tests):
  - searching from Discover without diacritics;
  - 16+ hidden;
  - 21 results end with View more, which opens the stories list sorted by Best match;
  - the Writers group opens a profile;
  - nothing found offers Discover;
  - axe on `/search` and `/search/writers` at 390, 768 and 1440 px, light and night, ro and en.
- Unit tests: `src/features/search/lib/searchAddresses.test.ts` and the new "search list" cases in `listAddresses.test.ts`.
- The full local check run: see below.

## Local check run

- lint, typecheck, types:check: passed.
- Unit tests: 708 passed (112 files).
- Database: `db reset`, then `test db`: 87 files, 1864 checks, PASS.
- End to end: the full run reached test 777 before the background time limit stopped it. Two failures before that point:
  - `legal.spec.ts` (a browser crash): it passed on the rerun;
  - `reader-performance.spec.ts` (throttled first paragraph): this one also fails on main.
- The remaining spec files from `sign-in.spec.ts` on, plus `legal.spec.ts`, were rerun: 388 passed.
- `search.spec.ts`: 29 passed.
- i18n:check and migrations:check: passed. The functions build compiled.

## Follow-ups

- No index yet: search scans the listed stories, which is fine for the test's few hundred stories. A stored search document with a GIN index is the step when the catalogue grows.
- S1-E8-10 adds a Forum posts group.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
