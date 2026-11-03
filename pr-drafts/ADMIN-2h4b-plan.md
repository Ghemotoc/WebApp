# ADMIN-2h4b plan: support tickets to reports and data requests, retention and the export

Story S1-E11-13 part 13b, criteria 10, 11 and 14. Branch `claude/admin2-h4b-support-reports-data`.

## Migration `20261231100001_admin2_h4b_support_reports_data.sql`
- `public_notices.support_ticket_id` (on delete set null) and `support_ticket_number` (kept after the ticket goes); the notifier and good-faith checks accept a notice written up by staff from a ticket.
- `data_requests.support_ticket_id`.
- History changes `converted_to_report` and `data_request_opened`.
- `admin_convert_ticket_to_report(ticket_number, content_address, reason, explanation)`: a notice linked to the ticket; a hosted address joins or opens the item's case (`attach_notice_to_case()`), otherwise unmatched. Spam and empty explanations refused. Audit log and history.
- `admin_open_ticket_data_request(ticket_number, request_type)`: through `admin_open_data_request()`, received on the ticket's first day (Bucharest); no account: check_violation, hint `no_account`.
- `admin_ticket_links(ticket_number)`.
- Setting `support_ticket_keep_years` (2), `purge_old_support_tickets()` on pg_cron `purge-old-support-tickets` (03:41 UTC).
- `export_support_tickets_of()` inside `export_tables_of()`: tickets and both sides of the conversation, never internal notes or staff names.

## Screens
- `TicketLinksPanel` on the staff ticket page with `ConvertToReportForm` and `OpenDataRequestForm`, and the list of what was started from the ticket (data requests link to their page).
- History words for the two new changes. Locale keys in ro and en.

## Tests
- Database 259 (20): criteria 10, 11, 14, allowed and denied.
- e2e `support-reports-data.spec.ts`: convert, open a request and follow the link, the no-account line.

## Docs
- Code tour, decisions, retention, support README.
