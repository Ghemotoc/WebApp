<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 8b IDEAS-1 (idea IDEA-20261031-12, with your comments of 31 Oct 2026). The idea has no story issue, and the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8b IDEAS-1, part f, the last part: library shelves in Download my data.

## What changed
- **Library shelves in the data file.** `data.json` now has a `library` list: the shelf, the story's title, the writer's name, a full link to the story and when it was shelved. Before, the shelves were there only as raw rows with story IDs. A story the reader can no longer open (deleted, hidden by moderators, or a writer either side blocks) keeps its title but has no link.
- **A spreadsheet copy.** The ZIP also holds `library.csv`: one line per story with the shelf, title, writer, link and date, its headings in the reader's language. It is saved as UTF-8 with a byte-order mark, so Excel and Numbers show ș and ț correctly.
- **Settings.** "What’s in it" lists the library shelves.
- **Database.** `export_library_of()` (internal), and `my_data_export()` adds `library`. Nothing new is stored. The full links are made in the browser from the brand's website address, because the database doesn't know it.
- **Docs:** `docs/code-tour.md` ("Library shelves in Download my data") and the data-export README.

## How it was tested
- `supabase/tests/database/220-library-in-my-data.test.sql` (7 tests): the shelves in order with title, writer, address and dates; a blocked writer's story and a deleted story keep their title but have no address; never a user ID and only the reader's own shelves; the helper can't be called from the app. Test `210` still passes.
- Unit: `runDataExport.test.ts` checks the full link in `data.json` and the exact lines of `library.csv`, including a title with a comma.
- `e2e/download-my-data.spec.ts`: adult_writer's real download holds the saved story with its full link, and `library.csv` has its line.

## Local check run
LOCALRUN

## By hand
- Nothing. The privacy notice already says Download my data holds everything about the account.

## Board mismatches
- Board 6.3's "What’s in it" list has no library line. It is added after "Messages you sent".

## Questions for Robert (OPEN or not in the story, built as proposals)
- **The spreadsheet** is an extra I added so the list is easy to read outside the app. Say if you'd rather keep only the data file.

## Follow-ups
- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
