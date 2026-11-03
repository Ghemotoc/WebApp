<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #113

Bundle 13 CONTESTS, part b2c: certificates for a contest's participants, finalists and winners (S1-E11-15 criterion 9, through S1-E8-12). The admin epic check and the bundle's full test run follow in part b2d.

## What changed

- **Issuing.** Once a contest's results are published, the Results panel in Staff › Contests offers "Issue certificates". Every valid entry gets one under My certificates: winners and finalists by their placing, everyone else as a participant. Withdrawn and disqualified entries get none. Running it again after a placing changes updates only that certificate, never adds a second. Only the owner and admins can issue, and it is in the audit log.
- **The writer.** Each writer is notified ("you have a certificate from …", leading to My certificates). The list marks it as a writing contest. The printable sheet names the contest in the language chosen for printing, carries only our signature (no teacher signs a contest) and a contest footer. There is no real-name form: a real name is stored only with a class certificate (CLAUDE.md rule 5), so a contest certificate always prints the pen name. The public check page works as for any certificate.
- **Database.** `certificates.contest_id` (a certificate comes from a class or a contest, never both; class and teacher are required only for a class certificate), one certificate per writer and contest, `admin_issue_contest_certificates()`, and `my_certificates()` returns `is_contest` and the contest's name in both languages.
- **Records:** a builder proposal row in decisions, the code tour and both features' READMEs.

## How it was tested

- Database test 268 (15 tests): certificates wait for published results; a moderator and a writer can't issue; an admin issues one per valid entry, winner as winner and an unplaced entry as participant, none for a withdrawn entry; a contest certificate has no class, teacher or real name; each writer is notified with the contest's page; issuing is logged; issuing again changes only the changed certificate and keeps one per writer; the writer's list marks it as a contest certificate with both names; a real name is refused; a signed-out visitor can check the code; a certificate without a contest still needs a class and teacher. The class certificate tests (236, 237) still pass.
- e2e `e2e/contests.spec.ts` (new fifth test): the admin issues certificates ("1 certificate issued or updated."); the winner sees "Writing contest" under My certificates, opens it, finds no real-name field and the sentence "for winning the writing contest “The trial contest”.", axe on the page.
- Vitest: the list reads a contest certificate's names and leaves a class certificate's empty.

## Local check run

LOCALRUN

## By hand

- Nothing.

## Board mismatches

- The certificate boards draw class certificates only. A contest certificate reuses the same sheet without the school, class and teacher's signature.

## Questions for Robert

None blocking. The decision row is a proposal (issued only after results; pen name only; our signature alone). Please read the new Romanian text in `src/locales/ro/certificates.json` (the contest sentences and footer), `contests.json` (staff.results) and `notifications.json`.

## Follow-ups

- Staff › Schools › Certificates shows a contest certificate with empty class and teacher fields; a "Contest" label there would read better.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
