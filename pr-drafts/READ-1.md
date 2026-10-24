**Title:** READ-1: Reading (S1-E4-01a, 01b, 06a, 04, QA)

## Story
Bundle READ-1, the whole S1-E4 reading epic for March (bundle plan of 24 Oct 2026):

| Story | Issue | Commits |
| --- | --- | --- |
| S1-E4-01a Chapter reader (reader, navigation, phone width) | Closes #34 (with 01b) | `get_chapter()`, daily read totals and the blocks stub; the reader; British dates (two commits) |
| S1-E4-01b Chapter reader (speed budget, 200% zoom, banner slot) | Closes #34 | one commit |
| S1-E4-06a Right-click and copy off on the web | Part of #39 (S1-E4-06b, the apps' capture protection, is after March) | one commit |
| S1-E4-04 Web teaser for shared links | Closes #37 | two commits (the second moves its migration to `20261025090001`) |
| S1-E4-QA Epic check: Reading | Closes #45 | one commit |

Closes #34
Closes #37
Closes #45
Part of #39

**Base branch:** `main`. One branch, Lane A's nine commits in story order plus one wording commit, rebased on `main` at `3b4cd18` (after TOOL-1, Ghemotoc/WebApp#195). It replaces the closed Ghemotoc/WebApp#191 and Ghemotoc/WebApp#192 and Lane A's three unopened branches (`claude/s1-e4-06a-copy-off`, `claude/s1-e4-04-teaser`, `claude/s1-e4-qa`), whose branches are kept. Each story's full write-up (every criterion, its test and the screenshots against the board) is in those PRs and in `pr-drafts/S1-E4-06a.md`, `S1-E4-04.md` and `S1-E4-QA.md`; this description is the bundle's summary.

## What changed

### S1-E4-01a: the chapter reader (board 3.5)
- **Database (`20261024120001`):**
  - `get_chapter(story_slug, chapter_code)` is the only way to a chapter's text (ADR 0004). It answers null unless the story is live and not moderated away, the reader's age allows the rating (`rating_allows()`, rule 18), neither side blocks the other, and the chapter is published and not moderated away. The owner always reads their own chapters. It returns the text, "chapter n of N", previous and next codes (drafts skipped), dates, minutes to read, the story's language and the pen name, never the user ID.
  - `chapter_reads` holds **daily totals per chapter, never who read**; `record_chapter_read()` adds one by the Romanian date (Q7) and leaves out the writer's own reads. One policy, `chapter_reads_select_owner`: a writer reads their own chapters' totals.
  - `is_blocked_with()` is the blocks stub (Q8): it answers false and is created guarded, so S1-E5-05's real function is never overwritten.
- **Reader** at `/s/<story>/<chapter>`: the chapter bar with Contents, Previous and Next and the gold progress line; "Chapter n of N", the title as the H1, "by <pen name> · <date> · n min read"; real HTML text at Inter 19 px / 1.7, about 680 px wide, `lang` set; "End of chapter n" and "Read chapter n+1 ›", or "That's the latest chapter so far." No doodles.
- **Story page:** a published chapter's title links to the reader (the "plain rows" stub is gone from `docs/mocks.md`).
- **Reads** are sent once per chapter per tab; the tab keeps chapter codes only.
- **British dates** in English (CTO, 24 Oct 2026): "5 Sep 2026", "Saved at 14:05", through one helper, `dateLocaleFor()` in `src/lib/romania-time.ts`.

### S1-E4-01b: speed, 200% zoom and the banner slot
- The route's loader starts `get_chapter()` early (`prefetchChapter()`), so the data and the reader's code load side by side.
- `e2e/reader-performance.spec.ts` keeps the budget on the production build (Q12): first paragraph within 2,000 ms on a throttled phone (CPU ×4, Fast 4G, median of three), and the reader adds under 40 KB of script (12.4 KB).
- 200% zoom (WCAG 1.4.4, 1.4.10): nothing scrolls sideways at 640 px and twice the pixel density.
- `ChapterBannerSlot` sits after the `<article>`, never inside the text, and shows nothing until `pick_banner()` (S1-E12-01, after March), so the demo has no placeholder ad.

### S1-E4-06a: right-click and copy off
- `ProtectedChapterText` cancels `contextmenu`, `copy`, `cut` and `dragstart` on the chapter text only. `user-select: none` is **not** used: readers can still select, find and use a screen reader; zoom and text size are untouched (WCAG 2.2).
- `CopyNotice` under the chapter: "…That makes copying harder, but it can't stop screenshots. <pen name> keeps all the rights to this story."
- The Publish panel tells the writer readers read in the browser until the apps exist, and that screenshots still work.
- `copyWording.test.ts` fails on any locale text promising what the web can't keep ("can't be copied", "screenshots are blocked", and the Romanian forms). Q9.
- No migration.

### S1-E4-04: the teaser and link previews (board 3.8)
- **Database (`20261025090001`):** the setting `teaser_length` = 600; `teaser_of()`; `get_chapter()` now sends a signed-out visitor **only** the first whole paragraphs up to 600 words (the cut is in the database, so the rest never reaches the browser); `get_link_preview()` gives the title and rating always, and the blurb, pen name, cover and chapter title only for All ages and 13+ (visitors count as under 16, Q6). Never the user ID or chapter text.
- **Teaser page:** the story card, "Shared with you · chapter 1 of 2", the teaser fading out, "Log in to read on" with the March invited-adults wording, the copy notice. Two widget doodles from 1000 px up, clear of all text (decided 18 Oct 2026).
- **16+ and 18+:** the title and "No preview for this story", naming the rating, on the chapter and the story page.
- **Link previews and search engines** (`functions/s/[[path]].ts` → `server/link-preview.ts`): Open Graph and Twitter tags, JSON-LD on story pages (title, blurb, pen name only), `noindex` and `X-Robots-Tag` on chapters (Q36), every value HTML-escaped, the page still loads if the database can't be reached. `server/pages-functions-plugin.ts` runs the same code locally.
- **Picture: Q13 fallback B**, a plain 400 × 400 square in the cover's colour with the full title beside it as text (`scripts/make-link-preview-images.ts`, nine files of about 1 KB). No new dependency.

### S1-E4-QA: epic check
- `e2e/epic-s1-e4.spec.ts`: four journeys across the epic: teen_17 reads two chapters; a shared link's preview, the teaser and signing in; the rating rules for teen_17, kid_14_ok, kid_14_waiting and a visitor; the reader, teaser and 18+ notice at 390, 768 and 1440 px, at night and in Romanian, with axe, sideways-scroll and doodle-overlap checks.
- `supabase/tests/database/093-epic-s1-e4.test.sql` (26 tests): the writer publishes, every persona's reads, the rating rules and a deleted story.
- `docs/epic-reports/S1-E4.md`: what works, the gaps, the stubs and Lane A's by-hand list. `docs/epic-reports/S1-E3.md`: the two gaps S1-E4 closed are struck through.

## Acceptance criteria and tests
| Story | Criterion | Test | Result |
| --- | --- | --- | --- |
| 01a | The text is real HTML with previous, next and contents navigation | e2e `chapter-reader.spec.ts`; pgTAP `140` | Pass |
| 01a | 320 px: nothing scrolls sideways (WCAG 1.4.10) | e2e at 320 px; axe in 12 views | Pass |
| 01a | (plan) Only readers who may see the chapter get it | `140` (drafts, wrong story, deleted story, kid_14_ok on 16+, never the user ID); e2e "This chapter isn't available" | Pass |
| 01a | (plan) A read is a daily total, once per tab, never the writer's own | `141`; `useRecordRead.test.tsx`; e2e | Pass |
| 01b | A mid-range phone on 4G reads the text within 2 seconds | e2e `reader-performance.spec.ts`; `chapterPrefetch.test.ts` | Pass |
| 01b | 200% zoom: nothing scrolls sideways | e2e at 640 px, 2× density | Pass |
| 01b | The banner slot sits only below the chapter text | `ChapterReaderPage.test.tsx` | Pass |
| 06a | Right-click and copy off on the chapter text, with a note; screen readers, zoom and text size still work (Q35) | e2e `copy-protection.spec.ts`; `ProtectedChapterText.test.tsx`; the 200% zoom and 12 axe views run with it on | Pass (screen reader by hand) |
| 06a | The writer is told at Publish | e2e | Pass |
| 06a | Copy says "makes copying harder", never "can't be copied" (Q9) | `copyWording.test.ts` over every locale file | Pass |
| 04 | A signed-in reader whose age allows it reads the whole chapter (Q35) | `142`; e2e as `teacher` | Pass |
| 04 | A signed-out visitor sees the blurb and the first one to two pages, then a prompt | `142` (550 of 648 words, the third paragraph never sent); e2e `teaser.spec.ts` | Pass |
| 04 | Link previews show the title, pen name, blurb and cover from server-rendered tags | `server/link-preview.test.ts` (11); e2e plain HTTP fetch of `/s/…` | Pass ("cover" is the cover's colour, Q13 B) |
| 04 | 16+ and 18+: nothing beyond the title for visitors | `142`; e2e on both ratings, chapter and story page, and the shared link's HTML | Pass |
| 04 | Only story pages indexable; chapters `noindex`; no chapter text in structured data (Q36) | unit tests; e2e on the served HTML | Pass (no sitemap yet; Follow-ups) |
| 04 | The full title fits on the preview picture | Q13 B: no title on the picture, the full title beside it as text (allowed by the DoD) | Pass |
| QA | Playwright walks the main journeys with adult_writer, teen_17, kid_14_ok and kid_14_waiting | `epic-s1-e4.spec.ts`; `093` | Pass |
| QA | A break where two stories meet is fixed or ticketed | three found while building, all fixed (epic report) | Pass |
| QA | axe at 390, 768 and 1440 px on every screen of the epic | each story's spec plus journey 4 | Pass |
| QA | Every policy on every table the epic touches has an allowed and a denied test | `chapter_reads_select_owner` in `141`; `check-policy-tests` | Pass |
| QA | The code tour covers the epic; the PR has an epic report | "Epic S1-E4 at a glance"; `docs/epic-reports/S1-E4.md` | Pass |

## Definition of Done
- **Code quality:** [x] strict TypeScript, ESLint (with jsx-a11y and the complexity limits), Prettier; [x] header, doc and step comments on every new file and SQL function, sources named; [x] code tour ("Reading a chapter", "A shared link, before and after it opens", "Epic S1-E4 at a glance") and `src/features/reading/README.md`; [x] `types:check` passes.
- **Tests:** [x] every criterion above; [x] the one new policy has its allowed and denied test (`141`); [x] `021` lists `chapter_reads` (visitors see none); [ ] CI green (runs when this PR opens); [x] `docs/mocks.md`: plain rows and the signed-out stub removed; the blocks stub, the empty banner and the Q13 B picture recorded.
- **Accessibility:** [x] axe in 12 views per screen; one H1; the chapter is a named `<article>`; labelled progress bar and "Chapters" navigation; `lang` on story text; 44 px targets; 320 px and 200% zoom; text stays selectable and in the accessibility tree with copy off.
- **Design rules:** [x] no doodles on the reader; the teaser's two widget doodles pass the overlap check at 390, 768 and 1440 px; the full title on every drawn cover; no placeholder ad.
- **Privacy:** [x] `chapter_reads` keeps totals only (row in `docs/retention.md`); no user ID in any answer or preview; shared-link addresses drop any query; no watermark (OPEN, not built).
- **Security:** [x] every reading rule is in `get_chapter()` (readers have no table access); the teaser is cut in the database, not hidden with CSS; every preview value HTML-escaped; the Pages Function uses the anon key only.
- **Internationalisation:** [x] `reader.*`, `teaser.*`, `linkPreview.*`, `reader.copyNotice`, `publish.webReadingNote` in ro and en with Romanian plurals; ș and ț; dates in Romania time, British order in English.
- **Moderation hooks:** [x] `is_moderated_away()` for the story and chapter in `get_chapter()` and `get_link_preview()`; the reader keeps a hook comment where SAFE-1's `<ReportButton>` goes.
- **Documentation:** [x] code tour, mocks, retention, board fixes, decisions (Q13 B), the supabase and reading READMEs, the epic report.
- **Review:** [ ] Robert checks it on staging (steps below).

## Screenshots against the board
In Ghemotoc/WebApp#191 (reader at 390, 768 and 1440 px, signed out) and in `pr-drafts/S1-E4-06a.md` and `S1-E4-04.md` (the copy notice, the teaser, the 16+ / 18+ notice, the link card). Every difference from boards 3.5 and 3.8 is logged in `docs/board-fixes.md`. One new mismatch: the Publish panel's extra line about web reading (asked for by S1-E4-06, not drawn on board 4.3).

## Readable code
Header comments on both migrations, tests `140`, `141`, `142` and `093`, `server/link-preview.ts`, the Pages Function, the image script, each hook and component and each spec. Step comments in `get_chapter()`, `record_chapter_read()`, `teaser_of()`, `get_link_preview()`, `handleSharedLink()`, `useRecordRead` and `useReadingProgress`. Sources named: ADR 0004, rules 7, 15 and 18, Q6, Q7, Q8, Q9, Q12, Q13, Q35, Q36, WCAG 1.4.4, 1.4.10 and 3.1.2, boards 3.5 and 3.8, the 18 Oct doodle decision.

## Local check run (the merge gate, 24 Oct 2026)
Commit `7d7e936` on `claude/affectionate-galileo-wfsc0h`, rebased on `main` at `3b4cd18` (TOOL-1, Ghemotoc/WebApp#195). Clean start: `npm ci`, `npx supabase stop --no-backup && npx supabase start` (every migration applied from empty), then `npm run build` and `npm run checks` (which resets the database before the database tests):
```
npm run lint          clean
npm run typecheck     clean
npm run types:check   generated types match the committed file
npm run build         clean
npm test              70 files, 424 tests passed, 0 failed
npx supabase db reset done
npx supabase test db  41 files, 780 tests passed, 0 failed (140, 141, 142, 093 included)
npm run test:e2e      454 passed, 0 failed, 1 skipped (the whole suite with axe, 21.7 min)
npm run i18n:check    ro and en have the same keys; ș and ț used
```
`npm run checks` ended with "All checks passed." GitHub CI may not run or may stop part-way (Actions minutes for October are nearly used up); this local run is the gate.

**Rebase notes:** on 24 Oct onto `4d85da5`, two conflicts, both resolved by keeping both sides: `src/lib/database.types.ts` (`generate_invite_code` from S1-E11-17 next to `get_chapter`; confirmed by regenerating the types) and `docs/code-tour.md` (Lane B's demo-content section next to "Epic S1-E4 at a glance"). Lane A's merge commit of `main` is gone; the history is linear. Onto `3b4cd18` (TOOL-1): no conflicts. One small commit on top: two lines say "the demo" (the epic report and the banner hook's comment).

## Hand-test steps (as a non-developer)
Once merged, on staging, on your phone where it says so:
1. **Read on a phone.** Sign in as `teen_17` on your phone over mobile data. Open a story with at least two published chapters and tap the first chapter's title. You see "Chapter 1 of 2", the title, "by <pen name> · <date> · n min read", and the text within about 2 seconds. Nothing scrolls sideways.
2. **Move between chapters.** Tap **Read chapter 2**, then **Chapters › Contents**: you're back on the story page. At the end of the last chapter: "That's the latest chapter so far."
3. **Copying is made harder.** On a laptop, as `teacher`, select a sentence of the chapter, press Ctrl+C (Cmd+C on a Mac) and paste into a note: nothing arrives. Right-click the text: no menu. Under the chapter, a note says copying is made harder and screenshots still work. Ctrl+F still finds words in the chapter.
4. **A shared link, signed out.** Copy the chapter's address and open it in a private window. You see the story card, "Shared with you · chapter 1 of 2", the first part of the chapter fading out and **Log in to read on**. Sign in as `teen_17` at the same address: the whole chapter.
5. **The WhatsApp preview.** Paste the chapter's link into WhatsApp: the card shows "<story> · <chapter>", "de <pen name> · <blurb>" and a small square in the cover's colour.
6. **Ratings hold.** As `adult_writer`, in one of your stories' settings, rate it 16+. Then: as `teen_17` it still opens; as `kid_14_ok` you see "This chapter isn't available"; signed out you see only the title and "No preview for this story" naming 16+. Set the rating back.
7. **Languages.** Switch to English: dates read "9 Oct 2026". Switch back and read the Romanian text: "Capitolul 1 din 2", the copy note, "Trimis ție", "Conectează-te ca să citești mai departe", "Nicio previzualizare pentru această poveste".

## By hand (staging)
- Migrations `20261024120001` and `20261025090001` reach staging through Supabase's GitHub integration; no seed change and no top-up.
- Cloudflare → Workers & Pages → `ghemotoc` → Settings → Variables and Secrets: check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set for **Production and Preview** (Pages Functions read them for link previews; without them links open, with no preview card).
- After deploy, check one shared link in WhatsApp and in a preview debugger (Facebook's Sharing Debugger or opengraph.xyz).
- Read every new Romanian line yourself (decided 17 Oct 2026, 19:33): `reading.json` `reader.*`, the copy notice, the Publish line, `teaser.*`, `linkPreview.*`.

## Follow-ups (for the CTO; none opened as issues)
- **Link-preview picture back to the real cover (Robert's choice):** draw it on request in a Pages Function with satori and resvg (needs a Cloudflare plan with more processor time a request; about 1 day), or draw it once at publish in a Supabase edge function and store it in a `link-previews` bucket (about 2 days). Details in `pr-drafts/handover/lane-a.md`.
- **Sign-in doesn't return the reader to the chapter** ("Log in to read on" goes to `/sign-in`); a "return to" address belongs to S1-E2-05's owner.
- **Sitemap** with story pages only (Q36): not built; its home is S1-E5-08.
- **`record_chapter_read()`** trusts the browser to send it once per tab; S1-E10-12's rate limits or a per-account daily cap would close it. Low risk with invited adults.
- **Start-up script** is 174 KB compressed because the router imports some pages eagerly; loading them on demand would speed every first visit (S1-E1 owner).
- **Report button on the reader:** the hook comment becomes SAFE-1's `<ReportButton>` in READ-2 (S1-E6-01), once SAFE-1 is merged.
- `teaser_length` stays a proposal in `docs/decisions.md`; changing it is one migration until S1-E11-03.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01YZpK6GUr7g7814uWUUgA7r
