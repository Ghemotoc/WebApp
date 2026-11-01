<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 8b IDEAS-1 (ideas IDEA-20261031-3, -11 and -10, with your comments of 31 Oct 2026). The ideas have no story issue, and the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8b IDEAS-1, part c: three small ways for readers to reach writers.

## What changed
- **"I finished it" (idea 3).** On a story on the reader's Finished shelf, the story page shows "Tell the writer you finished it", with the line "The writer sees your name and that you finished their story. No message, just thanks." One press sends the writer a fixed notification, "<name> finished <story> and says thank you for writing it.", with "Open the story". There is no text box, so nothing to write or moderate. It works once per story, then reads "Sent". It isn't offered on another shelf or on one's own story, and nothing crosses a block either way (the database refuses it, and `notify()` skips blocks too). No email.
- **Share a whole story (idea 11).** Every public story's page has Share next to Follow. On a phone it opens the phone's share menu; on a computer it copies the link and opens "Share this story". The link is the story page's address with nothing added. "How the link looks in a chat" shows what the existing link preview sends: the cover colour, the title, "by <pen name>" and the blurb. For a 16+ or 18+ story it shows only the title and the rating, as for chapters. Whole-story shares aren't counted.
- **A writer's card colour (idea 10).** Story settings has a new drop-down, "Colour for quote and picture cards": our default or one of the nine palette colours. Readers' new quote and picture cards for the story start in it, and each reader can still pick another. The picture card now has the same Background picker as the quote card (before, it was always paper).
- **Database.** `stories.card_colour` (palette keys only), returned by `share_options()` and saved by `update_my_story()`; `finished_thanks` (the reader's own rows only, written only by `send_finished_thanks()`), in Download my data and deleted with the account; `story_library_state()` says whether the thanks went; new notification kind `story_finished`.
- **Tidy-up.** The link row and privacy line of the chapter's share dialog moved to their own components, and the share-sheet check to `lib/systemShare.ts`, so both share buttons use the same code.
- **Docs:** `docs/code-tour.md` ("Readers to writers"), `docs/retention.md` (one line) and three feature READMEs.

## How it was tested
- `supabase/tests/database/217-readers-to-writers.test.sql` (22 tests): signed out refused; not before the Finished shelf; nothing across a block and nothing recorded; sent once, then "already sent"; the writer gets one notification and no email; not for one's own story; `finished_thanks_select_own` allowed and denied (the writer can't list who thanked them); the card colour saved, refused off the palette and handed to the reader's cards; the export and deletion lists. Tests `188` (share options now carry `card_colour`) and `021` updated.
- Unit: `lib/sharedStory.test.ts` (preview colour and the 16+ rule) and `lib/shareLink.test.ts` (the story link has no query string).
- `e2e/readers-to-writers.spec.ts`: the thank-you goes once and reads "Sent" after a reload; the writer's notification opens the story; nothing on another shelf or on one's own story; Share on a computer copies the clean link and shows the preview (with axe on the dialog); a 16+ story's preview has no blurb or pen name; Share on a phone uses the share sheet; the writer picks Sage, the reader's quote card starts in Sage and can switch to Gold (axe on the settings page at 390 px); axe on the story page at 390, 768 and 1440 px, light and night, ro and en.
- Screenshots checked by eye at 390 and 1440 px.

## Local check run
LOCALRUN

## By hand
- The record of processing could note one more small item: which stories a reader thanked (no words of theirs), kept for the life of the account.

## Board mismatches
- Board 3.4 has no Share or thank-you button on the story page. Share sits next to Follow; the thank-you sits under the Library drop-down, only on the Finished shelf.
- Board 3.6's picture card had no colour choice; it now has the quote card's Background picker, because the idea says picture cards start in the writer's colour too.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **The thank-you's words** are fixed and kind: "finished <story> and says thank you for writing it." Say if you'd like other wording.
- **It sits with Replies** in the writer's notification filters. Say if it should be under Stories instead.
- **Whole-story shares aren't counted** for the ranking, because only chapter shares are today. Say if they should count too.

## Follow-ups
- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
