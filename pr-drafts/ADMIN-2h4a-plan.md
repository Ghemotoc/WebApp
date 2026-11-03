# ADMIN-2h4a plan: merging support tickets and spam (S1-E11-13 criteria 9 and 13)

- Migration `20261230100001_admin2_h4a_support_merge_spam.sql`: is_spam, marked_spam_at and merged_into_ticket_id on support_tickets; the 'merged' email kind; new history changes; `admin_mark_support_spam()`, `admin_merge_support_tickets()`, `support_sender_is_spam()`, `refuse_reply_to_spam()`; the email intake follows merges and routes known spam; the Spam view in the inbox and counts; merged and spam in the staff and member tickets.
- Server: the 'merged' email (`server/support-emails.ts`, `email.json` mergedSubject and mergedBody).
- Front end: `TicketActionsPanel`, the Spam chip and filter, lines on the staff ticket, the member's "continues as" link.
- Tests: database 258 (22), 256 updated, unit test for the merged email, e2e `support-merge-spam.spec.ts`.
- Then h4b: Convert to report, Open data request, retention and the export.
