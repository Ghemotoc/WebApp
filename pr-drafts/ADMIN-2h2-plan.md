# ADMIN-2h2 plan: support emails in and out (S1-E11-13, part 13a)

Criteria covered: 1 (an email creates a ticket; unknown address = email only), 2 (acknowledgement with the number in the subject), 3 (staff replies go out with the number and threading headers; the person's reply lands in the same ticket), 7 in part (a reply to a closed ticket makes a follow-up ticket linked to it; a solved one reopens).

The helpdesk product stays OPEN (rule 13): email goes through Brevo (decided 17 Oct 2026, 19:43) behind two small server handlers, so an outside helpdesk could replace them without touching the screens.

## Migration `…_admin2_h2_support_emails.sql`
- `support_ticket_messages.email_message_id` (the Message-ID of an email that came in or went out; unique) and `support_tickets.follow_up_of_ticket_id`.
- `support_ticket_emails`: the outbox (ticket, kind acknowledgement or staff_reply, the staff message, a token `support-<uuid>` that becomes the Message-ID, claimed_at, sent_at, attempts). RLS on; support staff read; no address or words stored.
- Triggers: a new in-app ticket queues an acknowledgement (Contact us already sends its own); a staff reply queues an email; a note never does.
- `support_email_worker_claim(worker_key, batch_size)` and `support_email_worker_mark_sent(worker_key, email_ids)`: the same worker key as the notification emails; the address is read at send time (the ticket's, or the account's confirmed sign-in email).
- `run_support_email_worker()` every minute through pg_net, at the notification worker's address with the path changed to /api/support-emails.
- `receive_support_email(payload, signature)`: signed by our server like Contact us; drops a repeat Message-ID; finds the ticket by our Message-ID in In-Reply-To/References or by "[#1042]" in the subject, only when the sender is that ticket's person; a closed ticket gets a linked follow-up; a solved or waiting one reopens; otherwise a new email ticket, acknowledged unless it is an automatic reply or the address already had 3 acknowledgements in the hour.
- `admin_support_ticket()` messages gain `emailed` (sent, waiting or not emailed) and the follow-up link.

## Server
- `server/support-emails.ts`: the worker (texts from email.json `supportTickets` with admin overrides, Romanian and English together for an email-only ticket in Romanian, In-Reply-To and References, Message-ID `<support-…@support-domain>`) and the inbound handler (`/api/support-inbound?key=SUPPORT_INBOUND_KEY`, Brevo's inbound parsing JSON, signs each email with SUPPORT_TICKET_SECRET).
- `functions/api/support-emails.ts`, `functions/api/support-inbound.ts`, local wiring in the Pages Functions plugin.

## Front end
- Staff ticket page: each answer says "Emailed" or "Waiting to be emailed"; email messages say "by email"; a follow-up links to the earlier ticket.

## Tests
- DB 255: outbox queued and not queued; worker key; claim and mark; inbound unsigned, new email-only ticket, threading by subject and by Message-ID, a stranger quoting a number gets a new ticket, repeats dropped, follow-up of a closed ticket, no acknowledgement for automatic replies; allowed and denied for the outbox policy. 021 lists the new table.
- Unit: composing both emails, the inbound mapping, the key check.
- e2e `support-emails.spec.ts`: acknowledgement and staff reply in Mailpit with the number; an inbound reply lands in the ticket; a wrong key is refused.

## Docs
- Contact us runbook: the inbound route (by hand: Brevo inbound parsing, SUPPORT_INBOUND_KEY, forwarding hello@ to it), scheduled jobs, code tour, decisions.
