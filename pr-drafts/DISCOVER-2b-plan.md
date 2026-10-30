# DISCOVER-2b plan: classics shelf (S1-E5-06, #51) and S1-E11-16b (#114)

Neither issue has comments. S1-E11-16a (the staff Classics page) is merged.

## Database (one migration)
- `list_holds_story`: a new kind `classics`, for stories with a `classic_author_id` (the official account's public-domain works). `browse_stories` accepts it, and it sorts by popular like the other shelves.
- Setting `discover_shelves`: add `classics` before `categories`, but only when the setting is still the default.
- `classic_works.details_checked boolean`. Imported rows start as false. `admin_save_classic_work` sets it to true. `admin_publish_classic` refuses with the hint `details_unchecked`, because staff must check the rating, category and source first.
- `admin_import_classics(rows jsonb)`: rows of {title, author, author_died, type, language, source_url}, the CSV columns.
  - Finds or adds the author (a different year of death for the same name is refused for that row).
  - Skips a work that is already listed (same title and author).
  - Makes a draft: kind mapped from type (fairy tale, short story, short story cycle, poetry, play, essay, novel), language, rating all_ages, category (poem → poetry, essay → nonfiction_essays, else fiction), source title from the link's site (Wikisource or Project Gutenberg, else the host).
  - Returns {added, already_listed, refused: [{line, title, reason}]}. Logged once with the counts.
- `admin_classic_suggestions()`:
  - authors whose works became free on 1 January this year (died this year − 71), with their draft works and how many are published;
  - next year's too, as "from 1 January <next year>".
- `admin_fix_classic_typo(chapter_code, corrected_body, reason)`:
  - for a published classic chapter, it replaces the live text and keeps the old one as a chapter version with the reason;
  - it refuses a change of more than 3 words in the word count or more than 2% of the length (a typo fix, never a rewrite), and a missing reason;
  - it is logged.
  - Check `chapter_revisions` for where versions live.

## Screens
- Discover: the Classics shelf ("Public-domain classics" / "Clasici din domeniul public"); See all at `/discover/all/classics`; Discover mix word `classics`.
- Staff › Classics:
  - an "Import a list (CSV)" panel (file input, client-side CSV parser in `lib/parseClassicsCsv.ts` with tests, result summary);
  - a "Newly free this year" panel;
  - on a published work, "Fix a typo" per chapter (textarea with the current text, reason, save) and a version count.
- Imported cards show "Check the details before publishing".

## Tests
- pgTAP 178:
  - the classics list and shelf for visitors;
  - the import (added, duplicate, refused year, kind map);
  - details_checked blocks publishing until saved;
  - the suggestions;
  - the typo fix (allowed, too big, no reason, not staff).
- e2e:
  - the Discover shelf and its See all;
  - staff import a small CSV and see the drafts;
  - a typo fix;
  - axe.
- Unit: the CSV parser.
