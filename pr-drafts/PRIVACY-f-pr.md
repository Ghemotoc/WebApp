<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-05 (Download my stories). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part f: the EPUB of a completed story, for Kindle and other e-readers. Robert added it on 1 Nov 2026, between 06:31 and 06:40. Only the story's writer can make it, and only when the story is Completed. A short form comes first:

- **The name on the book.** The pen name is filled in, but any name is allowed, the legal one too. It is typed each time and never stored or sent (rule 5).
- **The title.** Filled in from the story.
- **The cover.** The story's own cover, or a JPEG or PNG from the device. A picked picture goes into the book only and is never uploaded.

The book holds, in order: the cover, a title page, a copyright page, the table of contents and every published chapter. It never holds the plan from Story Atlas. The writer's browser builds the whole book and saves it straight to the device: there is no export row, no upload and no notification.

## What changed
- **`src/lib/epub/`**, a new EPUB 3 builder that knows nothing about the database:
  - `buildEpub()` writes `mimetype` first and uncompressed, then `META-INF/container.xml`, `content.opf` (title, name, language, identifier, modified date, the cover marked as such), `nav.xhtml` (the table of contents, which is also a page), `toc.ncx` for older readers, a plain stylesheet and every page;
  - `chapterTextToXhtml()` turns the stored Markdown subset into XHTML. It keeps paragraphs, headings, bold, italic, quotes, lists and scene breaks. It keeps only allowed links. Chapter pictures go in with their alt text, and music or video cards become a line with their link. Every piece of text is escaped.
- **`src/features/data-export/lib/runEpub.ts`** gathers the book:
  - it reads the writer's own data file, narrowed to the story;
  - it refuses a story that isn't Completed, or one with no published chapter;
  - it takes the published chapters in reading order and numbers them from 1;
  - it loads their pictures and fills in the words.
- **`src/features/data-export/lib/epubCover.ts`** makes the cover as a JPEG of up to 1000 × 1600 pixels. A drawn or automatic cover is drawn on a canvas with the board's design, colours, title box and contrast rule, using the title and name as typed. An uploaded cover, or a picture the writer picked, is redrawn instead. A cover a moderator removed is never used.
- **The form:**
  - `EpubSection` shows in Download my stories when one Completed story is chosen;
  - `EpubDialog` is a native dialog with the name, the title and `EpubCoverField` (the two cover choices, the file field and a live preview);
  - `useMakeEpub` makes the book and saves it.
- **The words.** `dataExport.json` gets an `epub` block in English and Romanian:
  - the form's words;
  - `epub.book.*`, the words printed in the book: the copyright lines, the contents heading, the chapter headings and the byline.

  The book's words follow the story's language when it is Romanian or English. `applyLocaleOverrides()` (new, in `src/lib/interface-text-overrides.ts`) lays staff edits over that language's file text, even when the screen is in the other language.
- **The copyright page**, proposed wording that admins can edit in Interface text:
  - "© {{year}} {{author}}. All rights reserved.";
  - "No part of this book may be copied, shared or published again in any form without written permission from {{author}}.";
  - "Every right to this work belongs to {{author}}. {{productName}} prepared this file and holds no rights to the work.";
  - "This edition was prepared through {{productName}} ({{siteUrl}}) on {{date}}."

  The product name and site come from the brand config.
- **Types.** `ExportedStory` gains the cover columns and `ExportedChapter` gains `published_body`, both already in the data file.
- **Docs:** `docs/code-tour.md` and the data-export README.

## How it was tested
- `src/lib/epub/buildEpub.test.ts`, 7 tests:
  - `mimetype` is first and stored;
  - the spine is in reading order and the package lists the cover, the pictures, the language, the creator and the modified date;
  - the table of contents is in order;
  - the copyright lines are escaped;
  - every page is well-formed XHTML in the story's language;
  - bold, pictures, quotes, scene breaks and links are kept, while `javascript:` links and raw HTML are dropped;
  - a book without a cover works.
- `src/features/data-export/lib/runEpub.test.ts`, 7 tests:
  - only published chapters go in, in order and numbered, without drafts or deleted chapters;
  - the plan and other stories never go in;
  - the typed name and the filled-in copyright lines are printed;
  - the automatic cover is drawn with the confirmed title and name, and a picked picture is used when chosen;
  - ongoing stories and stories with no published chapter are refused.
- `e2e/epub.spec.ts`:
  - an Ongoing story offers no EPUB and a Completed one does;
  - an empty name is refused with a plain line;
  - "Make EPUB" saves `statia-meteo-seed01.epub`. The test opens it: `mimetype` comes first, a real cover JPEG is drawn in the browser, the published chapters are in order without the draft, and the typed name and the Romanian copyright line are there. The name is stored nowhere;
  - axe with the dialog open at 390, 768 and 1440 px, light and night, ro and en, with no sideways scroll.
- Screenshots of the section, the dialog at three widths and the cover drawn in the book, checked by eye.

## Local check run
All run locally on this branch, with main merged in:
- Vitest: 175 files and 1,037 tests passed.
- Database (pgTAP, after a reset): 123 files and 2,847 tests passed.
- Playwright: `epub` 15 passed; `download-my-stories`, `download-my-data` and `interface-text` 59 passed.
- Lint, typecheck, `types:check`, `i18n:check`, `migrations:check`, the build, the third-party check and the Wrangler build all passed.
- The full e2e run for bundle 8 comes with the epic check, before the bundle's last part merges.

## By hand
None. Nothing is stored and there is no migration.

## Board mismatches
The Settings board has no EPUB yet. The section and dialog reuse the board's Download my stories block, the tint box and the shared dialog style.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **Published chapters only.** Drafts never go in, because the book is what readers can read. Say if writers should be able to add drafts.
- **The copyright wording above is a draft.** Admins can change it in Interface text without a release. A lawyer should read it before launch, together with the terms (S1-E14-01).
- **The book's language.** The copyright page, the contents heading and "Chapter 3" follow the story's language (Romanian or English), not the screen's. A story in another language uses the screen's language.
- **No ISBN.** The book has a stable identifier (the story's ID), but no ISBN. Writers who publish elsewhere get their own.

## Follow-ups
- From today's ideas: a sample EPUB of chosen chapters for an ongoing story (IDEA-20261101-3), and an "About the writer" page at the back (IDEA-20261101-4).
- epubcheck, the reference validator, isn't run. It needs Java, which this machine doesn't have. The structure follows its rules, and the tests check the parts readers reject most often.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
