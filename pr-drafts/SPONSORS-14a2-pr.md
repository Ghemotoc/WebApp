<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #117

Bundle 14 SPONSORS, part a2: the ad slots from part a1 on every remaining public page (S1-E12-01 criterion 5), so each public page now has at least one slot and never more than two. Sponsor campaigns come in part b.

## What changed

- **Search:** a wide slot after the results (never above them) and, from 1200 px, a portrait beside them.
- **Forums:** a wide slot after the forums and a side box in the side column on desktop.
- **A forum thread:** a wide slot below the reply box, never between replies (Robert, 17 Oct 2026), and a side box on desktop.
- **A public space:** a wide slot after the threads. A class space has none, on the screen and in the database (Q70).
- **A writer profile:** a wide slot after the stories and library.
- **The teaser:** a wide slot after the sign-up prompt, never inside the text.
- **The list pages:** a wide banner on the classics list; on every other See all list, a card the size of a story card after the stories (never the first card). Only the list's category, tag and language are sent, never the search term or anyone's username.
- **Records:** the code tour, the ads README and the board-fixes rows for the teaser, Forums, the thread and the space.

## How it was tested

- e2e `e2e/ads.spec.ts` (seven new tests): at 1440 px a signed-out visitor sees Search's wide and portrait slots, Forums' wide slot and side box, and one slot each on a public space, a profile, the teaser, the classics list (wide) and a See all list (card), and no page has more than two. The existing axe and layout specs for these pages ran with the slots in place.

## Local check run

LOCALRUN

## By hand

- Nothing.

## Board mismatches

- The AdFormats board puts the See all card among the story cards; this part puts it after them, so it is never the first card and never splits a row of results. The story's "at most one per 12 items" can move it inside the grid later if Robert prefers.

## Questions for Robert

None blocking.

## Follow-ups

- The app-only story page (S1-E3-08) gets its side ad with the apps (bundle 15).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
