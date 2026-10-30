# Sharing

Sharing a chapter (S1-E4-05) and the quote-share card (S1-E4-07), built by READ-4c. Board 3.6 Share. No doodles on sharing screens.

- `components/ShareButtonWhenNear.tsx` fetches `components/ShareButton.tsx` when the end of the chapter nears (src/lib/use-is-near.ts). `ShareButton`: "Share" in the reader's end-of-chapter row. On a touch screen with a share menu it opens the system share sheet; otherwise it copies the link and opens `ShareDialog` ("Share this chapter"), fetched on the first press through `LoadedShareDialog`. Each share then fetches `lib/countShare.ts`, which calls `record_chapter_share()`.
- `components/QuoteShareWatcher.tsx`: under the chapter; it fetches `QuoteShareBar` on the first selection in the chapter text. `components/QuoteShareBar.tsx`: while a passage is selected in the text it shows "Share quote" (up to 280 characters) or how far over the limit it is. It never shows when `quote_card_state()` says not allowed (a visitor, or the writer switched quote cards off). The first press fetches `LoadedQuoteDialog`, which shows `QuoteCardDialog` or, after a card from this chapter, `QuoteLimitDialog` (one per chapter, Q17).
- `components/QuoteCardDialog.tsx`: the card (`QuoteCardCanvas`, drawn by `lib/quoteCard.ts`), `BackgroundPicker` (Purple and nine palette colours), the alt text we write and the reader may change, Copy image and Save image (`hooks/useQuoteCardActions.ts`, which calls `make_quote_card()` the first time).
- `components/SharingModal.tsx`: the native `<dialog>` frame all three dialogs use.
- `lib/shareLink.ts`: the link, the chapter's public address with nothing added (no sharer ID, no tracking code). `lib/quoteSelection.ts`: the passage selected inside the chapter text. `lib/clipboard.ts`: copying text and pictures. `lib/sharedChapter.ts`: what sharing knows about a chapter (never an ID).
- `api/sharing.ts`: `record_chapter_share()`, `quote_card_state()`, `make_quote_card()`.
- Texts: everything uses `sharing.json` (the buttons under `button.*`), registered when each piece first loads (`registerSharingTranslations.ts`), so the reader stays inside its 40 KB script budget.
- The database side: `supabase/migrations/…_s1_e4_05_07_share_and_quote_cards.sql`; tests in `supabase/tests/database/181-share-and-quote-cards.test.sql` and `e2e/share.spec.ts`.
