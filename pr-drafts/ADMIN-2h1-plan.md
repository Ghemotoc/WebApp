# ADMIN-2h1 plan: support tickets, part 1 (S1-E11-13, part 13a: inbox and ticket view; issue #111)

S1-E11-13 is L, so the story splits it: 13a inbox, ticket view and email in and out; 13b views, timers, canned replies, merge and reports. The builder splits 13a again so each PR stays reviewable:
- **h1 (this part):** the tables, the staff inbox and ticket page, statuses and fields with history, internal notes, the requester panel with the age group and the under-16 banner, "Your support requests" in Settings for members, and Contact us messages saved as numbered tickets.
- **h2:** email in and out: the acknowledgement for every ticket, staff replies by email with the ticket number and threading headers, and the inbound-email webhook (a reply lands in the same ticket; an unknown address makes an "email only" ticket).
- **h3 (13b):** views with counts, the first-reply timer, auto-solve after 7 days pending, reopen and follow-up tickets, canned replies.
- **h4 (13b):** merge, Convert to report, Open data request, spam, retention and the data export.

## OPEN, not chosen (rule 13)
The helpdesk product is OPEN. Our own tables hold the tickets; h2 puts email in and out behind an adapter (Brevo out, a signed webhook in) so an outside helpdesk can sit behind it later without changing the screens.

## Database (one migration)
- Enums `support_ticket_status` (new, open, pending_on_user, on_hold, solved, closed), `support_ticket_priority` (low, normal, high, urgent), `support_ticket_category` (account, writing, reading, safety_question, school_or_university, bug, other), `support_ticket_channel` (email, contact_form, in_app).
- `support_tickets` (kind: platform; the requester may have no account, like public_notices): number from a sequence starting at 1001, `requester_user_id` (null = email only), `requester_email` (null for an in-app ticket: the account's email is used), language, subject, channel, status, priority, category, `assigned_to_user_id`, tags, `first_replied_at`, `last_message_at`, `solved_at`, `closed_at`.
- `support_ticket_messages`: from the requester, a staff reply or an internal note; `author_user_id` null for an email-only requester.
- `support_ticket_events`: every change of status, priority, category, assignee and tags (the ticket's history, criterion 4).
- Staff area `support_tickets`: owner, admin and support act (proposal; section 1.8.3 has no tickets row; moderators reach a ticket through Convert to report in h4).
- RLS: staff in the area read all three; members only through `my_support_tickets()` and `my_support_ticket()` (no notes, no staff names). Writes only through functions.
- Member: `create_my_support_ticket(subject, body, category)` (rate-limited, `support_ticket` key), `reply_my_support_ticket(number, body)` (a solved ticket reopens; closed refuses until h3's follow-up).
- Contact us: `submit_contact_ticket(payload, signature)` for anon, signed by the server with `support_ticket_secret` (Vault) like the public notice form; links the account when the email matches one.
- Staff: `admin_support_inbox(status, assigned)`, `admin_support_ticket(number)` (logged as a view), `admin_update_support_ticket(number, changes)`, `admin_reply_support_ticket(number, body, is_note)`, `admin_reveal_ticket_email(number)` (logged).
- pgTAP: allowed and denied per policy and function; history rows; notes never reach the member; age group, never the year.

## Server
- `server/contact.ts`: when `SUPPORT_TICKET_SECRET` is set, the message is saved as a ticket and the reference is the ticket number (`#1042`) in both emails; without it, the old C- reference (so Contact us keeps working before the by-hand step).

## Front end
- `src/features/support/` (README): member pages `/support`, `/support/new`, `/support/:number`, a Settings card "Your support requests"; staff pages `/staff/support` and `/staff/support/:number` with the fields panel, history, requester panel, under-16 banner and the reply box with "Internal note".
- Locales `support.json` (en and ro), staff menu and home card.
- e2e `e2e/support-tickets.spec.ts` plus axe at 12 views; contact spec updated for the number.
