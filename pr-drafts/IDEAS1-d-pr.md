<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 8b IDEAS-1 (ideas IDEA-20261031-1 and -5, with your comments of 31 Oct 2026). The ideas have no story issue, and the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8b IDEAS-1, part d: two panels for writers, totals only.

## What changed
- **"Lines and stops" on Your writing.** A new section between "Story by story" and "Latest on your chapters", headed "Only you see this". A drop-down picks one of the writer's published chapters (the first one at the start).
- **Most-loved lines (idea 1).** The five paragraphs readers shared and commented on most, each with its number, its first words and "Shares: n · Paragraph comments: n". Counts from 1 to 4 read "fewer than 5", as on the rest of the dashboard. It never says who.
- **Where readers stop (idea 5).** Readers' saved places in the chapter, in tenths, each written out ("30 to 40%: 50% of readers") with a plain bar beside it. The last tenth includes readers who reached the end. Below five readers there is no bar, only "Fewer than 5 readers have a saved place in this chapter". The writer's own place doesn't count.
- **Counting shared passages.** A passage link or a picture card now also adds one to a per-paragraph daily total. It still counts as one chapter share, under the same hourly limit. Nothing records who shared, and the writer's own shares don't count.
- **Database.** `paragraph_shares` (chapter, paragraph fingerprint, day, total; no user column; only the chapter's writer can read it), `record_passage_share()`, and `writer_chapter_insights()`, which answers only the chapter's own writer. Paragraph comments count only when they are other people's and still shown.
- **Docs:** `docs/code-tour.md` ("Lines and stops, for writers") and the writing and sharing READMEs.

## How it was tested
- `supabase/tests/database/218-writer-insights.test.sql` (20 tests): signed out refused; a passage share adds one chapter share and one for each paragraph in range; more than five paragraphs, a backwards range or the writer's own share are not counted; `paragraph_shares_select_owner` allowed and denied; only paragraphs with shares or comments are listed, the most-loved first, counting only other people's comments; three shares read "fewer than 5" and the excerpt drops Markdown marks; the writer's own place never counts, and below five readers there is no bar; the tenths for five readers; another writer's chapter or a missing one gives nothing; the new table has no user column. Test `021` gained the new table.
- `e2e/writer-dashboard.spec.ts`: "Lines and stops" shows the shared paragraph with 7 shares and "fewer than 5" comments, "From 6 readers" and the two tenths; the page's axe, width and doodle checks at 390, 768 and 1440 px now cover the new section. The share and passage specs still pass with the new counting.
- Screenshots checked by eye at 390 and 1440 px.

## Local check run
LOCALRUN

## By hand
- Nothing. No new personal data: the new table holds totals per paragraph, with no reader in it.

## Board mismatches
- Board 4.1 has no "Lines and stops". It sits under "Story by story", in the dashboard's own style.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **Five lines and tenths** are proposals. Say if you'd like more lines or a finer bar.
- **Shares are kept as daily totals for good**, like chapter shares. Say if they should be trimmed after a while.
- **A picture card counts for its picture's paragraph**, so a much-shared picture can be a "most-loved line". Its first words show as the picture's description in brackets.

## Follow-ups
- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
