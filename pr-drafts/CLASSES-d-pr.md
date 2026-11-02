<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #77

Bundle 11 CLASSES, part d: staff set up pilot classes from the admin site, and a class can be archived for good (S1-E8-11 criteria 8 and 10). Part e is certificates (S1-E8-12) and the forums epic check, with the bundle's full end-to-end run.

## What changed
- **Staff › Schools › Class spaces (criterion 10, the manual pilot mode).** A new tab next to Verify teachers, for the same staff (owner, admin, moderators with the teacher checks permission).
  - "Set up a class": the teacher's username (they need the Teacher badge first), the class's name, the school's name and what the class is for.
  - The teacher owns the class from the start, so every teacher tool works as if they had made it. The class locks on the next 1 July.
  - Every class is listed with its school, teacher, members and status (open until, locked or archived).
  - "Make a code to print" shows the code once, with Copy and Print, through the same panel teachers use.
  - "Change the school" corrects the school's name.
  - "Archive the class" works here too.
  - Setting up a class and changing its school go in the audit log.
- **Archive the class (criterion 8).** A card in a class's settings for the teacher (and staff). After a "for good" question, the class locks now and for good:
  - nobody posts, reacts, joins or is invited;
  - nobody can unlock it again;
  - every member still reads it, and students keep their stories and drafts.
  - The class page says "This class is archived."
  - It goes in the space's log (and the audit log when staff do it).
- **The school's name** is stored on the class. Class certificates (part e) print it with a student's real name, and the 30 days before those names are deleted count from the day the class is archived.

## How it was tested
- Database: `235-class-pilot-setup.test.sql` (22 tests):
  - support staff and members are refused;
  - only a teacher with the badge can be named, and the school is required;
  - the teacher owns the class, and the set-up is in the audit log;
  - staff list classes, correct the school (logged) and make the code;
  - a plain member can't archive;
  - archiving locks the class: no unlocking, no second archive, no codes, no posts, while members still read;
  - archiving is in the space's log, and an open space is never archived.
  - The whole database suite runs too.
- Unit: `staffClassSpaces.test.ts` (6 tests) and two new archive tests in `classTools.test.ts`.
- End to end: `e2e/class-pilot-setup.spec.ts`:
  - a moderator sets up a class, makes the code and changes the school;
  - the teacher archives it, and the page says so with no "Start a thread" and no "Unlock the space";
  - axe and the doodle check on the staff page and the class settings at 390, 768 and 1440 px, light and night, ro and en.
  - The class, teacher badge and spaces specs run too.
- Screenshots at 1440 and 390 px, checked by eye.

## Local check run
LOCALRUN

## By hand
- Nothing on staging: no SQL top-up and no new secrets.
- Optional: read the new Romanian lines (`classSpaces` and `schoolsTabs` in `staff.json`; `classArchive` in `spaces.json`).

## Board mismatches
- AdminSchools 8.9: class spaces are a tab next to Verify teachers rather than a section on the same page. Licences come later.
- ClassSpace: "Archive the class" is its own card in the settings, beside "When the class locks".
- Both are noted in `docs/board-fixes.md`.

## Questions for Robert
These are my proposals; say if you want any changed:
- Archiving is final: nobody, staff included, can unlock an archived class from the app.
- A teacher's own class has no school's name until staff add one. Teachers can't type it themselves, so what prints on certificates is checked by us.
- Codes made by staff work for 30 days and admit 40 students, the same as the teacher's defaults. The teacher can make a new one at any time.

## Follow-ups
- Part e: the email and notice to the teacher when a class is archived (keep your certificate copies within 30 days), then the deletion of printed names.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
