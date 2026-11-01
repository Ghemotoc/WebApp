<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 8b IDEAS-1 (ideas IDEA-20261031-2 and -9, with your comments of 31 Oct 2026). The ideas have no story issue, and the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8b IDEAS-1, part e: two small paths to the right place.

## What changed
- **Notifications open the paragraph (idea 2).** A notification about a comment on a paragraph (a new comment, a reply or reactions) now opens the chapter with that paragraph's thread already open. The paragraph's marker is scrolled to the middle of the screen and has focus, so Escape or Close works as usual. If the writer has since changed the paragraph, it opens "Comments on an earlier version" instead. If the paragraph only moved, the link follows it. A comment on the whole chapter opens the chapter as before.
- **"Most shared this week" (idea 9).** A new Discover shelf after "New and rising": stories shared at least once in the last 7 days, most shared first. It follows the shelf rules (one line, at most 20, then "View more"), and its See all page opens in that order. Every reader rule applies as on the other shelves: age ratings, blocks and moderation. It uses the chapter share totals we already count, never who shared.
- **Staff settings.** The Discover shelf editor lists "Most shared this week", so staff can move or hide it.
- **Database.** `notification_json()` adds `comment_place` (the paragraph's number, "earlier" or nothing). The new story list `shared` comes with its own sort, which no other list accepts, and an internal `story_shares_this_week()`. The `discover_shelves` setting gains the shelf, unless staff had already changed it.
- **Test fix.** `e2e/ranking.spec.ts` used to put back an old shelf setting when it finished, without the classics and "Picked for you" shelves. It now puts back today's setting.
- **Docs:** `docs/code-tour.md` ("Paragraph links and Most shared this week") and the discovery, notifications and reading READMEs.

## How it was tested
- `supabase/tests/database/219-paragraph-links-and-most-shared.test.sql` (15 tests). Notifications: the paragraph a comment is on, "earlier" for a changed paragraph, nothing for the whole chapter, a reply takes its comment's paragraph, and a moved paragraph moves the link. The shelf: this week's most shared first, nothing shared only before the week, the total, no 16+ story for a 14-year-old or a visitor, no user ID. Also: the list's own sort, other sorts still allowed, the shares sort refused on other lists, the setting has the shelf, and the helper can't be called from the app.
- Unit: `src/lib/paragraph-link.test.ts`, `notificationText.test.ts` (three new cases) and `listAddresses.test.ts` (the new list and its sort).
- `e2e/paragraph-links-most-shared.spec.ts`. The writer opens a notification about paragraph 2: the thread is open, in view, and its marker has focus. A notification about a changed paragraph opens the earlier-version thread. An adult sees both stories on the shelf; a 14-year-old doesn't see the 16+ one. The See all page is in "Most shared this week" order and passes axe at 390, 768 and 1440 px, light and night, ro and en.
- Screenshots checked by eye at 390 and 1440 px.

## Local check run
LOCALRUN

## By hand
- Nothing. No new personal data.

## Board mismatches
- Board 3.1 has no "Most shared this week" shelf. It uses the same shelf design as the others.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **"This week" is the last 7 days**, by the Romanian date, not Monday to Sunday, so the shelf never empties on a Monday. Say if you'd like a calendar week.
- **Place on Discover:** after "New and rising". Staff can move it in Settings.
- **Romanian title:** "Cele mai distribuite săptămâna asta", with the eyebrow "Recomandate de cititori". Please check the wording.

## Follow-ups
- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
