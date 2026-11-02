<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #77

Bundle 11 CLASSES, part a: private class spaces and their invite codes (S1-E8-11). Part b adds the class option on the form for teachers, class stories, archiving and the staff pilot set-up; part c is certificates (S1-E8-12) and the forums epic check.

## What changed
- **Class spaces in the database (criteria 1 and 3).** A space now has a kind, open or class. A class space is an ordinary space, so threads, posts, moderators and the log all work as before.
  - Only an adult with the Teacher badge can start one (`create_class_space()`). The button for it comes in part b.
  - Nobody outside the class finds it: it isn't in the list of spaces, its address says it isn't here, its threads don't open and "Join" is refused. A new rule keeps it members-only even against a direct update.
  - Members read and post once their account is fully active. A 14-year-old still waiting for a parent's consent sees the class's card and is told why they wait.
  - Our moderation team can open any class space and act in it; their actions also go in the audit log.
- **Invite codes (criterion 4).** The teacher, or a moderator with the members power, opens the class's settings and gets an "Invite your class" card:
  - choose how long the code works (7, 14, 30 or 90 days, or a year) and how many places it has (1 to 200);
  - the code and its link (`/class/<code>`) show once, with Copy and Print, because only a scrambled copy is kept;
  - the card then says until when the code works and how many places are used, never the code itself;
  - "Make a new code" stops the old one at once, and "Stop the code" ends it;
  - every code and every join is in the space's moderation log.
- **Joining (criterion 5).** The link opens "Join a class". It shows the class's name only while the code works, and says plainly when a code has ended or is unknown. A signed-in student taps "Join the class" and lands in the class; one whose account isn't ready yet is told they are in. Students of any age join the same class, never split at 16.
- **On the space's own screens.**
  - A "Class space" pill on the header, with no age group pill.
  - The settings form shows a short "A class space" note in place of the reading, posting and joining choices.
  - No join requests card.
- **A fix on every space's header.** The banner band was drawn over the top of the space's round badge, hiding half its letters (since bundle 10). The badge now sits above the band.

## How it was tested
- Database: `232-class-spaces.test.sql` (41 tests): teacher-only creation; privacy from visitors, other adults and the list; the code's limits, reset, stop and used-up places; the preview; joins by a 14-year-old with consent, one still waiting and a 17-year-old; the log; a staff moderator plus the audit log; the members-only rule; `invites_select_admin` allowed and denied. `228` expects the two new viewer fields.
- Unit: `classSpaces.test.ts`: how refusals read, the link and how the answers are read.
- End to end: `e2e/class-spaces.spec.ts`: the teacher makes a code and sees it once; another adult never finds the class; a student joins with the link and reads; a waiting student is told why; a used-up code and a stopped code say so; axe and the doodle check at 390, 768 and 1440 px, light and night, ro and en. The other three space specs run too.
- Screenshots of the invite card and the join page at 1440 and 390 px, checked by eye.

## Local check run
LOCALRUN

## By hand
- Nothing. No seed change, so no staging top-up.

## Board mismatches
- Space (5.3): the boards don't draw a class's invite card or join page. Both use the spaces' plain card style.
- Space (5.3): a class space shows a sage "Class space" pill first and no age group pill.
- Both are in `docs/board-fixes.md`.

## Questions for Robert
These are my proposals; say if you want any of them changed:
- A code works for 30 days and admits 40 people by default; teachers can choose 1 day to a year and 1 to 200 places.
- The code shows only once, like staff invite links. If a teacher loses it, they make a new one.
- Inside a class, blocks don't stop classmates seeing each other's posts, because the teacher runs the room. Reporting still works everywhere.

## Follow-ups
- Signing up from a class link: today a student without an account still needs a platform invitation first. That fits the March test (invited adults only); when minors open, the class link should be able to stand in for the platform invitation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
