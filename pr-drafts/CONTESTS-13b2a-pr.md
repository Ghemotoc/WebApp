<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #113

Bundle 13 CONTESTS, part b2a: the staff entries list and disqualifying an entry (S1-E11-15 criteria 5 and 6). Results on the landing page, certificates and the prize consent check follow in part b2b.

## What changed

- **Entries in Staff › Contests.** Once a contest is open, its editor lists every entry with the writer's pen name and age group only (never the year of birth or the user ID), the story with a link to read it, its rating, its published words, the day it was entered and its status (Valid, Withdrawn, Disqualified). Staff never edit an entry's words; the only action is Disqualify.
- **Disqualifying.** The owner or an admin writes the reason, which is required. The writer gets a statement of reasons resting on the contest's rules, with a notification, and can appeal it for six months from My reports and decisions like any other decision. The audit log keeps who did it and why.
- **Appeals.** The appeal goes to the usual appeals queue and names the admin who disqualified as the decider, so another moderator decides it where possible. Overturning it makes the entry valid again.
- **The writer's card.** A disqualified entry keeps the writer's one place in the contest, so their story card says it was disqualified, with the decision's reference and a link to read it and appeal, instead of offering to enter again.
- **Records:** a builder proposal row in decisions, the code tour and the feature's README. The statement text ("We disqualified your contest entry", the rule "the contest's rules") is in both languages.

## How it was tested

- Database test 266 (17 tests): a moderator and a writer can't read the entries; an admin sees one by pen name and age group with the rating, words and status, and never the user ID or year of birth; a reason is required; a moderator can't disqualify; disqualifying returns the statement's reference, marks the entry with who and when, gives the writer a statement on the contest's rules in staff's words and a notification, and is logged; a second disqualification is refused; the writer's card shows the disqualified entry with its reference and they can't enter again; the appeal names the admin as decider; a moderator overturning it makes the entry valid again and the card shows it entered.
- e2e `e2e/contests.spec.ts` (new third test): the writer enters, the admin sees the entry as 18 and over and Valid next to the earlier Withdrawn one, disqualifies it with a reason (axe on the form), sees Disqualified with the S- reference, and the writer's card then says it was disqualified and links to the decision.

## Local check run

LOCALRUN

## By hand

- Nothing.

## Board mismatches

- None: no board draws contest entries yet; plain staff components.

## Questions for Robert

None blocking. The decision row is a proposal (owner and admins disqualify; a disqualified entry keeps the writer's one place). Please read the new Romanian text in `src/locales/ro/contests.json` (staff.entries, card.disqualified) and `statements.json`.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
