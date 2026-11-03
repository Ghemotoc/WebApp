<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, part h2: support emails in and out, the second of four parts of S1-E11-13 (criteria 1, 2, 3 and the follow-up in 7). The helpdesk product stays OPEN, so email goes through Brevo (already decided) behind two of our own server handlers; an outside helpdesk could replace those handlers later without touching the screens.

## What changed

- **Acknowledgements.** A new in-app ticket, and a new ticket that arrives by email, gets an email from the support inbox with `[#1042]` in the subject and how to add something. Contact us keeps the acknowledgement it already sends with the number. Someone without an account, writing by email in a language we can't tell, gets Romanian then English.
- **Staff answers go out by email** with `Re: <subject> [#1042]`, our own Message-ID and In-Reply-To/References pointing at the person's last email, so mail apps keep one thread. Internal notes are never emailed. The ticket page says "Waiting to be emailed" and then "Emailed" under each answer.
- **Email in.** `/api/support-inbound?key=…` takes Brevo's inbound parsing webhook, signs each email (`SUPPORT_TICKET_SECRET`, as Contact us) and `receive_support_email()` files it: by our Message-ID or the number in the subject, but only when it comes from that ticket's person (a stranger quoting a number gets a ticket of their own); a waiting or solved ticket opens again; a reply to a closed ticket starts a follow-up linked to it ("Follows up the closed ticket #…" on the staff page); anything else starts an email ticket, "email only" when no account uses the address. A repeat of the same email (Brevo retries) is saved once.
- **No loops.** Out-of-office and bulk mail (`Auto-Submitted`, `Precedence`) are saved but never acknowledged, and an address gets at most 3 acknowledgements an hour.
- **Sending.** A new outbox, `support_ticket_emails` (no address or words, kept with its ticket so answers keep threading), and `run-support-email-worker` every minute through pg_net, reusing the notification emails' worker key and address, so sending needs nothing new on Cloudflare.
- **Records:** decisions, retention (the outbox goes with its ticket), scheduled jobs, code tour and the Contact us runbook (section 5: the inbound set-up). Email texts are in `email.json` (`supportTickets`), so admins can change them in Interface text with the number and links locked.

## How it was tested

- Database test 255 (27 tests): what is queued and what isn't (a note never); only the worker key claims; a claim carries the confirmed address, the number, the answer and our Message-ID token; marking stops a resend; an unsigned email is refused; an unknown address makes an email-only ticket acknowledged in both languages; threading by number and by Message-ID, which reopens the ticket; a stranger quoting the number gets their own ticket; a repeat is saved once; a follow-up of a closed ticket; no acknowledgement for an automatic reply; the ticket page's "emailed"; allowed and denied for the outbox policy. Test 021 lists the new table.
- Unit tests `server/support-emails.test.ts` (13): writing both emails, the English part only on email-only acknowledgements, the threading headers, reading Brevo's items, spotting automatic replies, both handlers' keys, signing for the database and asking Brevo to retry when the database is down.
- e2e `e2e/support-emails.spec.ts`: the acknowledgement and a staff answer reach Mailpit with the number and our Message-ID, the page goes from "Waiting to be emailed" to "Emailed", an emailed answer lands in the same ticket "by email" and reopens it, an unknown address gets an email-only ticket and a two-language acknowledgement, a wrong key is refused. `e2e/support-tickets.spec.ts` no longer deletes the shared local Vault secret.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- To have answers to support emails land back in their tickets: `SUPPORT_INBOUND_KEY` on Cloudflare, Brevo's inbound parsing pointed at `/api/support-inbound?key=…`, and a forward of the support inbox to Brevo's inbound address (`docs/runbooks/contact-form.md`, section 5). Sending needs nothing new once the notification emails' worker is set up.

## Board mismatches

- None new (no board draws the support screens yet).

## Questions for Robert

None. Proposals to look at: Romanian and English together in the acknowledgement to an unknown address; at most 3 acknowledgements an hour per address.

## Follow-ups

- Part h3: views with counts, the first-reply timer, auto-solve after 7 days with its email, canned replies.
- Part h4: merge, Convert to report, Open data request, spam (the Spam view and later emails going there), retention and the export.
- Attachments on incoming emails are not kept; the ticket gets the words only. Worth a line in the acknowledgement once a helpdesk product is chosen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
