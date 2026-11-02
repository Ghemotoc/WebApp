<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #75

Bundle 10 FORUMS-2, part e (the last): writer ranks from published chapters and words (S1-E8-09), plus the full test run for the bundle.

## What changed
- **Ranks worked out in the database (criteria 1 and 2).** Four ranks, given automatically: New writer at the first published chapter, Writer at 5, Storyteller at 15 chapters or 30,000 words, Novelist at 100,000 words.
  - Only published chapters count, in stories that aren't deleted and that no moderator hid or removed. Forum posts never count.
  - Triggers count again whenever a chapter is published, unpublished, deleted or changes its published words, a story is deleted, or a moderator hides or restores something. The result is kept in a new `writer_ranks` table, one row per writer.
  - Nobody can hand out a rank: there is no staff function for it, and the table takes no writes from anyone.
  - Only the writer reads their own row. Everyone else gets the rank through `profile_rank(handle)` (null for a blocked reader or a private profile) or a post's `author_rank`, never a user ID.
  - Data export and account deletion list the new table.
- **On the profile (criteria 3 and 4; board 6.1).**
  - A gold "Rank: Storyteller" pill beside the name.
  - A "Rank" card at the top of the side column: the rank's name, the line saying where ranks come from, the four ranks with their stickers (the current one highlighted, the ones not reached faded) and a progress bar to the next rank, for example "41,200 of 100,000 words to Novelist".
  - The rank's own sticker on the top edge of the profile picture (pencil, quill and ink, open book with sparkles, crown), hidden on phones like every doodle there. Before the first chapter the picture keeps its open-book doodle.
- **On forum posts (criterion 5; board 5.2).** The author's rank sits in the same gold pill next to their name, at every width.
- **Doodle check back on for the profile.** The initials on the profile picture now sit in their own one-line box, so the sticker no longer touches their text box. The profile's doodle check, skipped in part d, is switched on again.

## How it was tested
- Database: `231-writer-ranks.test.sql` (22 tests): the ladder; a draft never counting; the rank rising at 1, 5 and 15 chapters; a forum post not counting; unpublishing and deleting lowering it at once; a moderator's hide and restore; no staff function; the profile and a post carrying the rank; the owner-only policy, allowed and denied. Test 021 lists the new table.
- Unit: `writerRanks.test.ts` (the ladder, stickers, progress to the next rank).
- End to end: `e2e/writer-ranks.spec.ts`: the profile's pill, card, ladder and progress; a post's pill, at phone width too; unpublishing lowering the rank; no rank for a writer with nothing published; axe and the doodle check at 390, 768 and 1440 px, light and night, ro and en.
- Screenshots of the profile and a thread at 1440 and 390 px, checked by eye.

## Local check run
LOCALRUN

## By hand
- Nothing. No seed change, so no staging top-up.

## Board mismatches
- Profile (6.1): the chip uses the shared gold information pill (12 px text, the board says 13 px) and leaves out the 14 px book icon. The card says "on the profile picture" rather than "on your profile picture", because visitors read it too.
- Forum thread (5.2): the board's chip says "15 chapters"; it shows the rank's name instead, so a post and the profile say the same thing.
- Both are in `docs/board-fixes.md`.

## Questions for Robert
- **The Romanian rank names are my proposal:** Debut, Condei, Condei de povești, Condei de roman. They are gender-neutral (a "condei" is a pen, not a person), unlike "scriitor" or "povestitor". Change them in Interface text or tell me better ones.

## Follow-ups
- A rank pill on story cards and the writer card on the story page, now that the rank is kept per writer.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
