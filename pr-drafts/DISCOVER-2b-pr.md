<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #51
Closes #114

This is part (b) of the DISCOVER-2 bundle in Robert's full-app plan. It covers S1-E5-06, the classics shelf, and S1-E11-16b, the rest of staff Classics work. S1-E11-16a (adding, checking and publishing a work) was merged earlier in PEOPLE-4, so this closes #114.

## What changed

- **Discover:**
  - A "Public-domain classics" shelf ("Clasici din domeniul public") holds the stories that carry a real author's byline. Like every shelf, it is one line of at most 20 with "View more" to `/discover/all/classics`.
  - It goes through `listed_stories()`, so ratings, blocks and moderation apply.
  - The shelf sits before the category shelves through the `discover_shelves` setting (only when staff haven't changed it), and staff can move or hide it in the Discover mix.
- **Import a research list (Staff › Classics):**
  - Staff open a CSV from `content/classics` (research G5). Each row becomes a draft owned by the classics account, with the author (found or added), kind, language, category (poems to Poetry, essays and travel prose to Nonfiction and essays, the rest to Fiction) and source (Wikisource, Project Gutenberg or the link's host).
  - A work already listed (same title and author) is skipped.
  - A bad row (unknown kind, another year of death for a known author, a missing field) is refused on its own and named with its line and reason.
  - Both research lists import cleanly (303 rows, checked locally).
- **Checked before publishing:**
  - Imported drafts are rated All ages and marked "Check the details before publishing" (`classic_works.details_checked`).
  - Publishing is refused until staff open and save the details, so a person always sets the rating (Ion isn't All ages) and checks the source.
- **1 January suggestions:**
  - "Newly in the public domain" lists the authors who died 71 years before this year (free since 1 January) and those who become free next 1 January, with their works and whether each is published.
  - Once the lists are imported, on 1 January 2027 that shows Nicolae Labiș and A. A. Milne.
- **Typo fixes:**
  - On a published work, "Fix a typo" opens a chapter's live text. Staff correct it and give a reason.
  - The fix goes live at once. A `chapter_revisions` row (reason `edited`) keeps the version, and the audit log keeps the reason.
  - Anything more than 3 words or 2% of the length is refused as more than a typo, because staff never rewrite or abridge a work.
- **Database:** functions only, plus one column.
  - Redefined: `list_holds_story()` (adds `classics`), `browse_stories()` (now uses the new `is_story_list_kind()`), `classic_work_json()` (adds `details_checked` and chapter codes), `admin_save_classic_work()` and `admin_publish_classic()`.
  - New: `admin_import_classics()`, `admin_classic_suggestions()`, `admin_classic_chapter()` and `admin_fix_classic_typo()`, plus internal helpers.
  - Every admin function checks the Classics area (owner and admin) and writes the audit log.
- **No new table and no new policy.**

## How it was tested

- `supabase/tests/database/178-classics-shelf-and-import.test.sql` (17 checks):
  - the classics list for a visitor and an adult (16+ hidden from the visitor, never the account's own stories);
  - the shelf in the default setting;
  - the import (added, repeated, refused rows with reasons, the filled-in kind, source and category);
  - publishing blocked until the details are saved;
  - the suggestions for this year and next;
  - typo fixes (live, versioned, too big, no reason, not a classic);
  - a moderator refused.
- `e2e/classics-shelf.spec.ts` (7 tests):
  - the Discover shelf and its See all page;
  - an admin imports a CSV and sees the summary, the refused row, the draft's "Check the details" pill and next year's suggestion;
  - an admin fixes a typo, and the live text changes;
  - axe on the Classics page and the classics list at 390 px in ro and en.
- `src/features/staff/lib/parseClassicsCsv.test.ts`: quoted commas, doubled quotes, missing columns, and both research lists.
- The existing discover, settings, classics and classic-authors specs pass (68 tests).
- The full local check run: see below.

## Local check run

- lint, typecheck and types:check: pass
- unit tests: 713 passed (113 files)
- db reset and test db: PASS
- e2e: 1111 passed; legal.spec had one browser crash and passed 51/51 on a rerun; reader-performance fails on main too
- classics-shelf.spec: 7 passed
- i18n:check and migrations:check: pass
- functions build: compiled

## Follow-ups

- Per-market hiding: a work is published only when it is free in Romania, the one open market. Hiding a work from readers in a market where it isn't free yet (for example a US-only title) is needed before a second market opens.
- The import makes empty drafts. Each work's text still has to be added from its source; fetching texts automatically from Wikisource or Gutenberg would be a separate tool.
- Production needs the classics account (handle in the setting `classics_account_handle`) before staff can import or publish. This is already listed in By hand (PEOPLE-4).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
