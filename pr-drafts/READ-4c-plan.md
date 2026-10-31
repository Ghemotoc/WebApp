# READ-4c plan: share a chapter (S1-E4-05, #38) and the quote card (S1-E4-07, #40)

Board: design/boards/Share.dc.html (3.6). Issues have no comments.

## Database (20261102120001_s1_e4_05_07_share_and_quote_cards.sql)
- `chapter_shares` (kind: platform): chapter, day, total. Policy `chapter_shares_select_owner` (the chapter's writer). Grant select to authenticated.
- `stories.quote_cards_enabled` (default true), saved through `update_my_story()`.
- `quote_cards` (kind: user_action): user, chapter, unique pair. Policy `quote_cards_select_own`. Grant select to authenticated.
- `record_chapter_share()`, `quote_card_state()`, `make_quote_card()`; internal `shareable_chapter()` and `add_chapter_share()`.
- Ranking: `story_share_points()`, `compute_story_scores()` uses `ranking_weight_shares`.
- Rate limits `chapter_share` and `quote_card` (10 new, 30 older accounts).

## Tests
- pgTAP 181: allowed and denied for both policies; counting rules; one card per chapter; the switch; the ranking. 021 lists both tables.
- Unit: shareLink, quoteSelection, quoteCard.
- e2e/share.spec.ts: criteria of both stories, axe in ro and en at 390, 320 fit.

## Front end
- src/features/sharing/: ShareButton (system sheet on touch, copy and dialog on computers), ShareDialog, QuoteShareBar, QuoteCardDialog (canvas, Purple and nine colours, alt text, Copy and Save), QuoteLimitDialog. Dialogs lazy-loaded with their own namespace (40 KB budget).
- Writer: "Quote cards" switch in StoryStatusSection.

## Deferred (board-fixes and follow-ups)
- Story cover and own picture backgrounds (with S1-E4-11 and the image check).
- Send in Messages (S1-E9-01).
