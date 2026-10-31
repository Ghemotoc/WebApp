<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #61

## What changed

Readers can now comment on one paragraph of a chapter, as board 3.5 draws it.

- **The marker.** Every plain paragraph has a speech-bubble button beside it. It shows the count, or a dashed outline with a plus when there are no comments. Its name says the count ("3 comments on this paragraph", or "Comment on this paragraph"), and `aria-expanded` says whether the thread is open. Headings, quotes, lists and pictures get no marker.
- **The thread.** Pressing a marker opens a card across the row under the paragraph, labelled "Comments on paragraph N".
  - It has the title, a Close button, the comments with their replies, reactions, downvote and Report, and a "Comment on this paragraph" box.
  - Only one thread is open at a time.
  - Close and Escape shut it and give focus back to the marker.
  - The thread is fetched only when first opened, so the reader keeps its script budget.
- **The main list.** Paragraph comments still appear under the chapter, with "On paragraph 4" (or "On an earlier version") above the name.
- **When the writer edits (criterion 2).** Each comment stores the paragraph's number and a fingerprint of its words (an md5, never the words).
  - When the writer moves the paragraph, its comments follow it.
  - When the writer changes its words or takes it out, the comments move to a "N comments on an earlier version of this chapter" button under the text. That thread has no comment box.
  - Changing only line breaks inside a paragraph keeps its comments.
- **Copy protection and quotes.** The thread sits inside the protected chapter text. It is marked so that copying, pasting and "Share quote" work normally there, because those are readers' words.
- **Database** (`…_s1_e6_06_paragraph_comments.sql`):
  - new columns `comments.paragraph_key` and `comments.paragraph_number`, with a trigger that gives a reply its comment's paragraph;
  - new functions `paragraph_comment_counts()`, `paragraph_comments()` and `post_paragraph_comment()`, which use the same gate, limit, text check and `comment_posted` job as `post_comment()`;
  - `chapter_comments()` now says which paragraph each comment is on;
  - internal helpers `paragraph_key_of()`, `chapter_paragraphs()`, `paragraph_now()` and `comment_paragraph_json()`;
  - no new table and no new personal data.

## How it was tested

- **Database:** `189-paragraph-comments.test.sql` has 24 tests. It covers:
  - posting on one paragraph, the counts, the thread and other paragraphs staying empty;
  - the fingerprint is stored and the words are not;
  - replies count in the same thread;
  - the main list's label;
  - a moved paragraph, a line-break change and a changed paragraph;
  - the earlier-version thread;
  - a missing paragraph, blocks, comments off, visitors refused, and no user IDs.
- **Unit tests:**
  - `ChapterText.test.tsx`: markers sit beside top-level paragraphs only;
  - `reading/api/paragraphComments.test.ts`: the counts lookup.
- **Browser:** `e2e/paragraph-comments.spec.ts` has 14 tests:
  - commenting on paragraph 2 only, the count, Close and Escape returning focus, and the main-list label;
  - the moved paragraph and the changed paragraph;
  - axe and no sideways scroll with a thread open, at 390, 768 and 1440 px, in light and night, in Romanian and English.
- **Screenshots:** checked by eye at 390 and 1440 px, with a thread open.

## Local check run

- lint, typecheck, types:check, i18n:check, migrations:check: pass
- `npx vitest run`: 140 files, 854 tests pass
- `npx supabase db reset` + `npx supabase test db`: 99 files, 2,116 tests pass
- `npx wrangler pages functions build`: compiles
- **e2e with `--workers=1`:**
  - `paragraph-comments`, `comments`, `comment-reactions`, `comment-downvotes`, `share-passages`, `copy-protection`, `chapter-reader` and `reader-performance` pass, apart from the known timing below.
  - An earlier run showed that the markers arriving after the text replaced the paragraphs, so a shared passage lost its focus. Fixed: the paragraph elements now stay the same, and the marker column appears only once the marker is drawn.
- **Full e2e run for bundle 5:** FULLRUN
- **Known failure:** `reader-performance`'s 2-second first-paragraph timing fails on this machine. It fails on `main` too, so the cause is the machine, not this change. The 40 KB script-budget test passes.

## By hand

Nothing. No new setting, secret or staging top-up.

## Board mismatches

These are added to `docs/board-fixes.md`:
- Only plain paragraphs get a marker, not headings, quotes, lists or pictures.
- The board doesn't show what happens when the writer edits. Comments follow a moved paragraph and go to "comments on an earlier version" when its words change.

## Follow-ups

- **Gentler matching.** A typo fix moves a paragraph's comments to the earlier version. Fuzzy matching (for example, most words unchanged) could keep them attached.
- **Writer dashboard.** It could show which paragraphs get the most comments (S1-E3-07).
- **Long threads.** A thread shows at most 100 top-level comments. "Show more" can come when a paragraph gets that busy.
- **Markers on quotes and lists.** These could get markers too, if writers want them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
