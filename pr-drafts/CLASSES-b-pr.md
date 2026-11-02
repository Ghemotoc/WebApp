<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #77

Bundle 11 CLASSES, part b: teachers start a class space from the form, the class locks at the end of the school year, the teacher sees who is still waiting to read, and students can type a code (S1-E8-11). Part c adds the staff pilot set-up and class-only stories; part d is certificates (S1-E8-12) and the forums epic check.

## What changed
- **"What kind of space?" on the new space form (criterion 1).** A teacher with the Teacher badge, 16 or over, picks Open space or Class space. Class space hides the reading, posting and joining choices and creates the private class straight away. Everyone else sees the form as before.
- **The end of the school year.**
  - Every class gets a lock date: the next 1 July at 00:00, Romanian time.
  - Once it passes, nobody can start a thread, reply or edit a post, the class code stops working and nobody new joins. Members still read everything.
  - Nothing runs on a timer; the time itself is the switch.
  - In the class's settings a "When the class locks" card lets the teacher (or anyone with the settings power) pick another day up to two years ahead, "Lock the space now" or "Unlock the space". Each change goes in the space's log.
  - On the class page: a "Locked" pill, "This space is locked." above the threads, and a side card with "How a class space starts" and "When the school year ends", with the lock date.
- **Waiting to join (criterion 5).** The settings page lists members who joined but can't read yet, with the reason in plain words: age check not finished, waiting for a parent or guardian, or account not ready. It never shows an age.
- **Typing a code.** "Join a class" on the Forums page's Spaces card and on the Spaces page opens `/class`, a form for the code the teacher wrote on the board. Spaces and lower case are fine.

## How it was tested
- Database: `233-class-tools.test.sql` (25 tests):
  - the default lock date;
  - lock now, unlock and change the date, each logged;
  - a date more than two years ahead and an open space are refused;
  - only the settings power may lock;
  - a locked class refuses new threads, replies, edits, codes and joins, while members still read;
  - the waiting list with its reasons, for the members power only;
  - the waiting list function is volatile, because a read-only call from the app was refused (found by the end-to-end test).
- Unit: `classTools.test.ts`: refusals, the calls and the lock date helpers (summer time included).
- End to end: `e2e/class-tools.spec.ts`:
  - the teacher starts a class from the form;
  - a student types the code from Forums › Join a class;
  - the teacher sees who waits and why (while the test is adults-only, an under-18 shows as "Account not ready yet");
  - lock and unlock, with posting stopping and coming back;
  - axe and the doodle check at 390, 768 and 1440 px, light and night, ro and en.
  - The class, space and forum specs run too.
- Screenshots of the form, the settings cards, a locked class and the code form at 1440 and 390 px, checked by eye.

## Local check run
LOCALRUN

## By hand
- Nothing. No seed change, so no staging top-up.

## Board mismatches
- ClassSpace: the board draws the teacher tools in one panel on the class page. They are cards on the settings page, and the class page keeps the "How a class space starts" and "When the school year ends" cards.
- ClassSpace: "Forums › Join a class" is a link on the Forums page's Spaces card (and the Spaces page) to a code form at `/class`.
- ClassSpace: the "end of term" and "end of the school year" code choices are not added. The code keeps its 7 days to a year choices, and the class lock does the end of year.
- All three are in `docs/board-fixes.md`.

## Questions for Robert
These are my proposals; say if you want any changed:
- A class locks on 1 July at 00:00, Romanian time. The teacher can pick any day up to two years ahead, lock it now or unlock it.
- A locked class can be unlocked at any time by the teacher. The board only says it locks.
- Our moderation team can still act in a locked class (hide or remove posts).

## Follow-ups
- After a year locked, should a class be archived (which starts the 30-day clock on real names on certificates)? That fits part d with the certificates.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
