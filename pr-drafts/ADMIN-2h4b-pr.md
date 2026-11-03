<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, part h4b: support tickets to the moderation team and to data requests, 2-year retention and the data export (S1-E11-13 criteria 10, 11 and 14). This is the last part of the support tickets story; the admin epic check follows.

## What changed

- **Convert to report.** A new "Moderation and data requests" panel on the staff ticket. Staff give the address of what is reported (optional), a reason and what the ticket says is wrong. The notice is linked to the ticket and written up by staff, so the person isn't asked for the good-faith statement or a name. An address we host joins or opens that item's case in the reason's tier (a child-safety reason opens a safeguarding case); no address, or one we don't host, waits in the moderators' unmatched notices. Spam tickets can't be converted.
- **Open data request.** Starts a data request for the ticket's account, received on the day the ticket arrived, so the one-month deadline counts from then. A ticket from someone without an account says to answer by email (as in March).
- **Started from this ticket.** The panel lists the reports and data requests made from the ticket; a data request links to its page. Both are in the ticket's history and the audit log.
- **Retention.** A ticket closed or solved more than 2 years ago is deleted at night with its messages, history and emails (`support_ticket_keep_years`, proposal). A notice started from it keeps its record and the ticket's number.
- **Data export.** "Download my data" and the staff copy for a data request now hold the person's tickets: subject, status, dates and both sides of the conversation, never staff notes or which staff member wrote.
- **Records:** decisions, retention, the code tour and the support README.

## How it was tested

- Database test 259 (20 tests): converting with a hosted address (case in the reason's tier, linked to the ticket), without one (unmatched, names the ticket), a child-safety reason (safeguarding case), the history line, refusals (empty explanation, spam, a moderator); the data request (received date, account, no account refused); the links (and a member denied); the purge (old ticket gone, newer one kept, the notice keeps its number); the export (both sides, no note). Tests 145, 210, 214, 242, 243 and 254 to 258 still pass.
- The test found two bugs before they shipped: converting without an address failed, and purging a ticket broke its notice's checks. Both are fixed (the notice now keeps the ticket's number).
- e2e `e2e/support-reports-data.spec.ts`: converting a child-safety ticket, opening a data request and following its link, and the no-account line.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None new (no board draws the support screens yet).

## Questions for Robert

None blocking. Please read the new Romanian text under `staff.links` in `src/locales/ro/support.json`.

## Follow-ups

- The data export leaves out staff's internal notes on a ticket. A GDPR access request can reach notes about the person, so the lawyer may want them included on request: added to the lawyer's list as a question, not built.
- Attachments on incoming support emails are still not kept (from part h2).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
