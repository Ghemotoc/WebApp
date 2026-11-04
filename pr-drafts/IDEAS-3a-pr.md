<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14d IDEAS-3, part a of 6: ranks. These are ideas 1 and 2 from the 2 November list, which Robert approved on 2 Nov 2026 at 22:01. The ideas have no story issue.

## What changed

- **A notice when a writer's rank goes up.**
  - `refresh_writer_rank()` gains a last step, `announce_writer_rank()`. It sends one quiet `rank_reached` notification, such as "Your rank: you’re now a Storyteller. Well done.", with a link to the writer's profile. The notification is in the "stories" category and has no email by default.
  - The notice is sent only when the new rank is above the new `profiles.highest_rank_notified`. A writer who drops a rank and climbs back is not told twice. A jump of two ranks sends one notice.
  - Existing writers are backfilled to their current rank, so nobody gets a notice for a rank they already had.
  - The bell shows the rank's sticker in the notice's icon.
- **The rank on story cards and the story page.**
  - `story_card_json()` gains `writer.rank` through `story_card_writer_rank()`.
  - The rank is left out for classics, for profiles the reader may not open, and when the writer blocked the reader.
  - See all and Discover cards show the compact rank pill. The writer card beside a story shows the rank chip.
- The enum value has its own migration, because Postgres can't use a new value in the same transaction that adds it.
- `docs/code-tour.md` has a section on this part.

## Tests

- `supabase/tests/database/284-rank-notifications.test.sql` (13 tests) covers:
  - one notice on reaching a rank, none for another chapter at the same rank, and one notice for a jump past Writer to Storyteller;
  - no notice when a rank drops (a moderator hides the story) and comes back, while a higher rank is still announced;
  - the notice's category and link, and that it names nobody else;
  - the card's rank, none for a reader the writer blocked, and the helper staying internal.
- `notificationText.test.ts` covers the rank notice's words and link.
- `e2e/rank-notifications.spec.ts` covers:
  - the notice with its sticker and link;
  - the rank on the story page's writer card and on a See all card;
  - axe on the notifications page at 390, 768 and 1440 px, light and night, ro and en, with no doodle overlap.

## Local check run

LOCALRUN

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
