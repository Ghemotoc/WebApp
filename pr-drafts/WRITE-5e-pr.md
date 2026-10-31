<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #44

## What changed

Readers can now share a part of a chapter, not only the whole chapter.

- **Copy link to this passage.** When a reader selects lines, the bar with "Share quote" now also has "Copy link to this passage". The link is the chapter's address plus the paragraphs, for example `/s/farul/pasaj001/p2-3`. It never says who shared it and has no tracking code, and copying it counts as one share. A link covers at most five paragraphs.
- **Share picture.** Every chapter picture that has passed its check gets a "Share picture" button. It opens a picture card with the picture, the story's title, "by <pen name>" and the link to that picture, plus alt text we write for the reader (they can change it). The reader can copy the link, copy the image or save it.
- **Opening a spot link.** The chapter opens with the passage highlighted (a soft tint with a bar at the side). The page scrolls to it and moves focus there. A line above the text says it is highlighted and offers "Read from the start". If the writer has since changed the chapter and the passage is gone, the line says so.
- **Link preview.** For a spot link, WhatsApp and other apps show the passage in quotation marks instead of the blurb, or "Picture: <alt text>" for a picture.
- **The writer's switches.**
  - "Quote cards" is now "Quote cards and passage links".
  - The new "Sharing pictures" switch is on by default and sits in story settings.
- **16+ and 18+.** These stories share only a plain link: no quote cards, no passage links, no picture cards, and no passage in the preview.
- **Database** (`…_s1_e4_11_share_passages_and_pictures.sql`):
  - new: `stories.picture_sharing_enabled`, `share_options()` and `get_shared_passage()`, plus the internal `chapter_blocks()`, `shared_block()` and `story_shares_content()`;
  - changed: `shareable_chapter()` now says no for 16+ and 18+, and `update_my_story()` takes the picture switch.
  - No new table.
- **How a paragraph is counted.** A chapter is cut into blocks at blank lines. The SQL `chapter_blocks()` and `src/lib/chapter-blocks.ts` do it the same way, so "paragraph 3" means the same text on screen and in the preview.

## How it was tested

- **Database:** `188-share-passages-and-pictures.test.sql` has 27 tests. It covers:
  - the block cutting;
  - `share_options()` for a signed-out visitor, a signed-in reader, each switch off and 16+;
  - `get_shared_passage()` for text, a passed picture, a picture still being checked, a music card, the 400-character cap, bad ranges and switches off;
  - no quote card for 16+;
  - `update_my_story()` keeping the switch when it is left out;
  - the internal helper refused to visitors.
- **Unit tests:**
  - `src/lib/chapter-blocks.test.ts`, which checks the same examples as the database;
  - `server/shared-passage.test.ts`;
  - new cases in `link-preview.test.ts`, `shareLink.test.ts` and `quoteSelection.test.ts`.
- **Browser:** `e2e/share-passages.spec.ts` has 8 tests:
  - the passage link is clean and counted;
  - a spot link opens highlighted and focused, and "Read from the start" works;
  - a passage that is gone is reported;
  - the preview shows the passage or the picture;
  - the picture card saves;
  - with the switches off, neither button appears;
  - a 16+ story shares a plain link only;
  - the writer's new switch saves.
  - axe passes and nothing scrolls sideways at 390, 768 and 1440 px.
- **Screenshots:** checked by eye at 390 and 1440 px (the highlighted passage, the bar, the picture card and the settings switch).

## Local check run

- lint, typecheck, types:check, i18n:check, migrations:check: pass
- `npx vitest run`: 139 files, 850 tests pass
- `npx supabase db reset` + `npx supabase test db`: 98 files, 2,092 tests pass
- `npx wrangler pages functions build`: compiles
- e2e, `--workers=1`: 87 tests pass across `share-passages`, `share`, `story-settings`, `create-story`, `epic-s1-e4`, `music-and-video` and `reading-settings`. A further 54 pass across `share`, `chapter-reader`, `teaser`, `story-settings`, `chapter-pictures` and `copy-protection`.
- One known failure: `reader-performance`'s 2-second first-paragraph timing failed on this machine at about 3.0 s. It also fails on `main` without this change (about 2.8 s), so the machine is slow today, not the code. The 40 KB script-budget test in the same file passes. The full e2e run happens once at the end of bundle 5, with 5f.

## By hand

Nothing. No new setting, secret or staging top-up.

## Board mismatches

These are added to `docs/board-fixes.md`:
- The board's passage link ends in `#p14`. Ours is a path, `/p14`, because a `#` part never reaches the server, so the preview couldn't show the passage.
- "Copy link to this passage" sits in the selection bar next to "Share quote". A picture has its own "Share picture" button.
- Whole paragraphs are highlighted, not single lines, because the link points to paragraphs.
- A visitor who isn't logged in and opens a spot link still sees the normal teaser from the start of the chapter. The passage shows in the link preview.

## Follow-ups

- **App-only stories (S1-E3-08).** When they are built, they join the 16+ and 18+ rule in `story_shares_content()`.
- **A preview image of the picture.** For a picture link, the preview could use the picture itself as `og:image`, once there is a safe public copy of a passed picture.
- **Visitors and spot links.** A signed-out visitor could see the shared passage highlighted when it falls inside the teaser.
- **Test files left in storage.** `e2e/share-passages.spec.ts` and `chapter-pictures.spec.ts` leave their test picture files in the local stack's storage, because writers can't delete chapter pictures through Storage. A staff or service clean-up for test files would tidy this.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
