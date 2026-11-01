<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #71

Bundle 9 FORUMS-1, part e: sticky and locked threads, and "Don't bump" (S1-E8-05).

## What changed
- **Sticky threads (criterion 1).** A moderator can make a thread sticky from the thread page. It then sits above the other threads in its forum's list, with board 5.2's gold "Pinned" pill. The other threads stay in order of latest activity. A sticky thread shows only on the first page of the list, never twice. "Remove sticky" puts it back in its normal place.
- **Locked threads (criterion 2).** A moderator can lock a thread with a reason. Everyone can still read every post. Nobody can reply: the server refuses, and the reply box gives way to board 5.2's "This thread is locked" card, which shows the date and the reason. The forum's list shows a "Locked" pill. "Unlock thread" opens it again.
- **"Don't bump" (criterion 3).** A tick box under the reply box: "Your reply won’t move this thread to the top of the list." The list is now ordered by when a thread last moved up (`bumped_at`). "Latest post" still shows when the newest post was written, so the unread dots from part d stay right.
- **Moderators only, checked on the server.** The tools card appears only to moderation staff. Each change needs a reason and is written to the audit log in the same transaction. A member who called the functions directly is refused.
- **A flaky test fixed.** `server/canva/canva-parts.test.ts` tampered with a token by overwriting its last two characters with "AA". About 1 time in 256 they already were "AA", so the test failed at random. It failed main's quick checks after #269 merged. It now changes one character in the middle for certain.
- **Docs:** `docs/code-tour.md`, the forums README and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/225-forum-sticky-and-locked.test.sql` (20 tests) covers:
  - sticky order, a sticky thread never on a later page, and removing sticky;
  - a lock with its public reason (who locked it is never shown), a refused reply, unlocking, and the moderator tools flag;
  - "Don't bump" keeping the thread's place while "Latest post" still moves;
  - members refused, the reason required, and the audit log rows.
- Unit: `forumModeration.test.ts` (which function each tool calls, and how refusals read).
- `e2e/forum-sticky-and-locked.spec.ts` covers:
  - a moderator makes a thread sticky and removes it, with the list order and the Pinned pill checked;
  - a lock seen by a member: the reason, "the moderation team", no reply box, no tools and the Locked pill; then unlocking;
  - "Don't bump" leaving the order as it was;
  - axe on a locked thread at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check.
- The forums, thread, quotes and read-marks specs still pass.

## Local check run
LOCALRUN

## By hand
- Nothing.

## Board mismatches
- **Moderator's name.** The board says "Locked by Andrei Mureșan, moderator". We say "Locked by the moderation team", because staff names aren't shown to readers. The audit log keeps who did it.
- **Left out:**
  - the pinned rules strip above the posts;
  - "Go to the October prompt";
  - Preview.
  The strip and the link need things the story doesn't have: a way to mark one sticky thread as a forum's rules, and a way to point a locked thread at another. Sticky threads lead the forum's list instead.
- **Padlock doodle.** It sits inside the locked card's top band, not over its edge, so it never touches the post above.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **Only moderation staff** can pin and lock, as the story says. Space moderators get these tools with spaces (FORUMS-2).
- **The lock reason is public.** It shows on the thread for everyone, as on the board. The reason for making a thread sticky goes only to the audit log.
- **"Don't bump" is open to every member**, as on the board. Say if you would rather keep it for the thread starter.

## Follow-ups
- A "rules thread" setting per forum would allow board 5.2's pinned strip on every thread page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
