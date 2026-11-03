<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #107 (S1-E11-09, part 09b: PDF files; the issue was closed by #290 with part 09a)

Bundle 12 ADMIN-2, part d: PDF files wherever a Word file is offered (Robert, 2 Nov 2026, 15:35: stories and every download that includes the plan from Story Atlas).

## What changed
- **One shared PDF builder** (`src/lib/pdf/`): `storyToPdf()`, `planToPdf()` and `chapterTextToPdf()` take exactly the same `WordStory`, `WordPlan`, pictures and labels as the Word builder, so a story reads the same in both files: title, pen name, user ID, dates and status, then each chapter on a new page with its heading, details and text (headings, bold, italic, quotes, lists, scene breaks, allowed links, pictures fitted to the page, music and video as links). The file carries the story's language (`ro-RO`, `en-GB`) and title. Roboto has every Romanian letter.
- **Built in the browser**, like the Word files (ADR 0012, updated). `loadPdfMake.ts` loads pdfmake and its fonts (about 1.7 MB) only when the first PDF is built, so no other page carries them, and it blocks every web address while building: pictures arrive as bytes we already loaded.
- **Download my stories** gets "Format": Word (.docx), PDF or Both, for the chapters and the plan (the JSON copy stays JSON). Word stays the default. One story in PDF is a single `.pdf`; Word and PDF together come in one ZIP. The database remembers the format (`exports.document_format`), names the file from it and only offers an earlier copy again when the format matches (migration `20261218100001`).
- **Download my data and staff data request copies** now hold every story and every plan as both a Word file and a PDF (`stories/<slug>.pdf`, `stories/<slug>-plan.pdf`); staff can send a PDF on its own. Texts in Settings, the notification and the staff copy screen say so.
- **docs/decisions.md** logs Robert's 2 Nov decisions: Restrict stays the lighter step, who can read a story (Public, Unlisted, Private, App only; bundle 14b), every new feature after bundle 14, the comment limits and the gentle nudge (part 12d3), and this PDF part.

## How it was tested
- Unit: `src/lib/pdf/storyToPdf.test.ts` (content for every piece of text; a real PDF with `/Lang` and the display title, for a story and an empty plan); `runStoriesExport.test.ts` (one story as a single PDF; Word and PDF side by side in a ZIP); `runDataExport.test.ts` and `runDataRequestCopy.test.ts` (both formats in the ZIP and sent file by file).
- Database: `245-pdf-downloads` (13 tests: file kinds by format, unknown format refused, reuse only for the same format, the bucket, staff PDF names).
- End to end: `download-my-stories` downloads a story's chapters as a PDF and checks it is a real PDF in the story's language; `download-my-data` finds the PDF beside the Word file in the ZIP; the label changes are followed in `epic-s1-e13`.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
- Nothing on staging: the migration arrives with the merge. Robert may want to open one PDF in Preview or Acrobat to check the look.

## Board mismatches
- Board 6.3 has no format choice; "Format" uses the same radio style as "All chapters" and sits under "What to include".

## Questions for Robert
1. **Which PDF tool (Q49, OPEN).** I used pdfmake as a proposal: free (MIT), runs in the browser with no server, handles Romanian letters, pictures and page breaks. Its PDFs aren't fully tagged for screen readers, so the Format hint says Word is the easiest for screen readers. Swapping the tool later changes only `src/lib/pdf/`. Keep pdfmake?
2. **Class certificates (#281).** My recommendation is to leave them as the browser's "Print or save as PDF": the browser keeps the text tagged, which is better for accessibility than pdfmake would be. No change made.

## Follow-ups
- A tagged-PDF upgrade once pdfmake (or the tool Robert picks) writes a full reading structure.
- Download my data takes about twice as long now that each story is built twice; fine at today's sizes, worth watching for writers with many long stories.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
