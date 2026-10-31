<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #38
Closes #40

This is part (c) of the READ-4 bundle in Robert's full-app plan: S1-E4-05 (share a chapter) and S1-E4-07 (the quote-share card). Board 3.6 Share.

## What changed

- **Database** (`20261102120001_s1_e4_05_07_share_and_quote_cards.sql`):
  - `chapter_shares` (kind: platform): a share total per chapter per day, never who shared. Readable by the chapter's writer only (`chapter_shares_select_owner`), for the writer dashboard;
  - `record_chapter_share()` counts a share. The writer's own share, a chapter the caller can't read and shares past the hourly limit aren't counted, and none of them is an error;
  - `stories.quote_cards_enabled` (default on), saved through `update_my_story()`;
  - `quote_cards` (kind: user_action): which chapters a reader made a card from, for the limit of one per chapter (Q17). Owner-only (`quote_cards_select_own`). The passage and the picture are never stored;
  - `quote_card_state()` and `make_quote_card()` (one per chapter, the writer's switch, counted as a share);
  - the hourly ranking now counts shares (`story_share_points()` with the `ranking_weight_shares` setting that was waiting for them);
  - hourly limits `chapter_share` and `quote_card` in `rate_limits`.
- **Share** (S1-E4-05):
  - "Share" after Like at the end of a chapter;
  - on a touch screen with a share menu it opens the system share sheet. On a computer it copies the link and opens "Share this chapter": the link with Copy link, the privacy line, other ways, and how the link looks in a chat;
  - the link is the chapter's public address on the brand's website, with no query string: no sharer ID and no tracking code.
- **Quote card** (S1-E4-07):
  - selecting text in the chapter shows a small bar at the bottom: "Share quote" with "n of 280 characters", or how many to drop;
  - the card is drawn on the device (a 1080 px square): the passage, the story's title, "by <pen name>", the link and the product's name;
  - backgrounds: Purple (default, no gold glow) and the nine palette colours. Every choice is a toggle with a tick and aria-pressed;
  - alt text is written for the reader, and they can change it;
  - Copy image and Save image. The first of them records the card. A second card from the same chapter opens the "One quote card per chapter" pop-up, with "Copy the link instead".
- **Writer**: a "Quote cards" switch under Comments in story settings. Off hides "Share quote"; sharing the link still works.
- **Reader script budget** (40 KB). Everything new is fetched only when needed:
  - the Share button when the end of the chapter nears (the same way as comments; `src/lib/use-is-near.ts` is now shared);
  - the quote bar on the first selection in the text;
  - the dialogs on first open, with their own `sharing` texts.
  - The library's cache key moved to its own small file, so the reader no longer fetches the library's hooks for one constant (about 2 KB saved).
- A fix in READ-4b's reading settings: while the panel's file loads, an empty stand-in carries its id, so `aria-controls` never points at nothing. axe caught this once under load.
- Docs:
  - code tour "Sharing a chapter and the quote card";
  - retention row for `quote_cards`;
  - 6 board-fixes rows;
  - `src/features/sharing/README.md`;
  - the reading README and `supabase/README.md`.

## Board mismatches (in docs/board-fixes.md)

- "Send in Messages" waits for private messages (S1-E9-01).
- "Share a quote" in the share dialog is a hint, because a card starts from selected text.
- The chat preview shows the chapter, not the blurb and cover. The real preview comes from the link-preview function.
- "Story cover" and "Your own picture" backgrounds are left for S1-E4-11, with blurring and the image check.
- The product's name stands in for "[Logo]", and the button says "Save image".
- The selection menu is a bar fixed to the bottom of the screen, so it never covers the text.

## How it was tested

- `supabase/tests/database/181-share-and-quote-cards.test.sql` (20 checks):
  - allowed and denied tests for both policies;
  - counting rules (a signed-out visitor is refused, the writer isn't counted, an unknown chapter isn't counted);
  - one card per chapter, the switch, and a visitor;
  - neither table can be written directly;
  - shares lift the ranking.
- `021-signed-out-reads` lists both tables.
- Unit tests: `shareLink` (no query string, escaping), `quoteSelection` (only inside the chapter text, the 280 limit counted in characters) and `quoteCard` (line wrapping, sizes, the palette).
- `e2e/share.spec.ts` (6 tests):
  - computer: copy, dialog, clean link, count, Escape returns focus;
  - phone: the system share sheet;
  - a card with Gold, Save image, the limit pop-up;
  - over 280 characters;
  - axe on both dialogs at 390 px in ro and en, fitting at 320 px;
  - the writer's switch hides Share quote.

## Local check run

Fast checks for this part (Robert, 30 Oct: the full e2e suite runs once at the end of the READ-4 bundle):

- lint, typecheck and types:check: pass
- unit tests: 747 passed (121 files)
- db reset and test db: PASS (91 files, 1,932 tests)
- i18n:check and migrations:check: pass
- functions build: compiled
- e2e for this part and the screens it touches:
  - specs: share, reader-performance, chapter-reader, story-settings, epic-s1-e4, copy-protection, ratings, teaser, reading-settings, comments, library, publish and ranking;
  - result: 93 passed, including the reader's 40 KB budget and the 200% zoom check.
- reader-performance's throttled cold load measured 2.18 to 2.53 s on this machine across runs. That is known on main (about 2.3 s), and nothing in this part loads before the first paragraph.
- Screenshots of the share dialog (1440 and 390 px) and the quote card (purple and gold, and at 390 px): checked by eye. Nothing overlaps, and the full title and link show on the card.

## Follow-ups

- Story cover and own-picture backgrounds for the card, with S1-E4-11 and the image check.
- The writer dashboard (READ-4d) can show `chapter_shares`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
