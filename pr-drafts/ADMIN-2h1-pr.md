<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, part h1: the first of four parts of S1-E11-13 (support tickets inside the admin site). The story splits itself into 13a (inbox, ticket view, email in and out) and 13b (views, timers, canned replies, merge and reports); 13a is split again here so each pull request stays readable: h1 is the inbox and ticket page, h2 email in and out, h3 and h4 are 13b.

## What changed

- **Numbered tickets in our own tables.** `support_tickets` (#1001 and up), `support_ticket_messages` and `support_ticket_events` (the history). The helpdesk product is still OPEN, so nothing is chosen: part h2 puts email in and out behind an adapter so an outside helpdesk can sit behind these screens later.
- **Your support requests** (`/support`, linked from Settings): a member asks for help (what it is about, a subject, a message), gets a number, reads the answers from "The support team" (never a staff name, never an internal note) and answers; a solved ticket, or one waiting for them, opens again. A closed one says to ask again. A line points to 112 and to Report, because a ticket never replaces a report.
- **Contact us saves a ticket.** The server signs each message (`SUPPORT_TICKET_SECRET`, same value in Vault) and the reference becomes the ticket number in both emails; a message from an address no account uses is an "email only" ticket, one from an account's address joins it. Without the secret the form works as before with the C- reference.
- **Staff › Support tickets** (owner, admin and support; a new `support_tickets` area, proposal, as section 1.8.3 had no row): the inbox (not yet solved first, most urgent and longest waiting first, filters for status and assignee) and the ticket page: status, priority, category, assignee and tags, each change kept in the ticket's history and the audit log; answers and internal notes; who is asking with the age group only, the email behind a logged "Show", and a safeguarding banner for someone under 16. Opening a ticket is logged too.
- **Records:** decisions, retention (2 years after closing, the story's proposal; the job comes in h4), code tour, the Contact us runbook (the by-hand step) and a README for `src/features/support/`. The privacy notice draft already covers support messages and their 2 years.

## How it was tested

- Database test 254 (34 tests): a member starts, reads and answers their own ticket and no one else's; a signed-out visitor can't; allowed and denied for each table's policy; support and admin read the inbox, a moderator can't read or answer; field changes go into the history and the audit log; tags are cleaned; assigning to someone who can't answer is refused; a reply marks the ticket pending on the person, a note never reaches them; a solved ticket reopens and a closed one refuses; the age group, never the year of birth; showing the email; an unsigned Contact us message is refused, a signed one joins the account with that email, an unknown address makes an email-only ticket in the sender's language. Test 040 now lists the new area for support.
- Unit tests: the fields panel sends only what changed and cleans tags; history words; the under-16 check; the Contact us handler saves the ticket, signs it, puts the number in both emails and falls back to the old reference when the database can't be reached.
- e2e `e2e/support-tickets.spec.ts`: the whole member and staff flow, a visitor's Contact us message as an email-only ticket, the under-16 banner, a moderator refused, and axe on Ask for help and the ticket page at 390, 768 and 1440 px, light and night, ro and en (30 tests). The staff menu lists and the Contact us reference check are updated. Checked by eye at 390 and 1440 px.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- To have Contact us messages saved as tickets on staging: set `SUPPORT_TICKET_SECRET` in Cloudflare Pages and the same value in Supabase Vault as `support_ticket_secret` (`docs/runbooks/contact-form.md`, section 3). Until then the form works as before.

## Board mismatches

- No board draws the support inbox or ticket page yet (architecture 1.8.2 names canvas 8.13); built from the moderator mail screens' pattern with plain staff components.

## Questions for Robert

None. Two proposals to look at: owner, admin and support answer tickets (moderators reach a ticket's problem through Convert to report in h4); tickets are kept 2 years after closing (the story's proposal).

## Follow-ups

- Part h2: the acknowledgement for in-app tickets, staff answers by email with the number and threading headers, and the inbound-email webhook.
- Parts h3 and h4: views with counts, the first-reply timer, auto-solve, canned replies, merge, Convert to report, Open data request, spam, retention and the data export.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
