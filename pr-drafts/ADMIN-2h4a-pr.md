<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, part h4a: merging support tickets and marking spam (S1-E11-13 criteria 9 and 13). Part h4b follows with Convert to report, Open data request, retention and the export.

## What changed

- **Merge.** A new Actions panel on the staff ticket: "Merge into ticket number". Only open tickets from the same person (the same account or address) merge. Every message moves to the ticket that stays and the tags join; the merged ticket closes and says "Merged into #N"; both histories say so. The person gets an email with the new number, their old request in the app says "This request continues as #N" with a link, and an email answering the old number lands in the ticket that stayed.
- **Spam.** "Mark as spam" moves a ticket to the new Spam view (a chip with its count, and a choice in the status filter) and out of every other view, cancels its emails still waiting, and stops answers (notes still work). Later emails from the same address, or the same account, go straight to Spam with no acknowledgement. "Not spam" undoes it. Both are in the audit log and the ticket's history.
- **Records:** decisions, the code tour and the support README.

## How it was tested

- Database test 258 (22 tests): the merge (messages, pointer, closed, tags, history, the email with the new number, the member's view, a reply to the old number threading into the new one), refusals (two people, into itself, a moderator), and spam (Spam view only, the count, no answer but a note, the waiting email cancelled, the sender's next email unacknowledged and in Spam, "Not spam"). Test 256 counts the Spam view.
- Unit test: the merged email's subject, words and link.
- e2e `e2e/support-merge-spam.spec.ts`: merging from the ticket page and following the member's link; marking spam, finding it only in the Spam view, and taking it back.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None new (no board draws the support screens yet).

## Questions for Robert

None. Please read the new Romanian text: the merged email (`supportTickets.mergedSubject` and `mergedBody` in `src/locales/ro/email.json`) and `staff.actions`, `staff.isSpam`, `staff.mergedInto` and `ticket.mergedInto` in `src/locales/ro/support.json`.

## Follow-ups

- Part h4b: Convert to report, Open data request, 2-year retention and the data export.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
