# ADMIN-2h3b plan: canned replies (S1-E11-13 criterion 8)

- Migration `20261229100001_admin2_h3b_canned_replies.sql`: `support_canned_replies` (title, body_ro, body_en, soft delete; kind platform), a select policy for the support_tickets area, `admin_save_canned_reply()` and `admin_delete_canned_reply()` (audit log with before and after), three starting replies, the display name in `admin_support_ticket()`.
- Front end: `api/cannedReplies.ts`, `hooks/useCannedReplies.ts`, `/staff/support/canned` (`CannedRepliesPage`, `CannedReplyItem`, `CannedReplyForm`), `CannedReplyPicker` in `SupportReplyForm`'s new `renderTools`, `lib/fillCannedReply.ts`.
- Tests: database 257 (14 tests, both policy sides), 021 list, unit tests for the fill, e2e `support-canned-replies.spec.ts` with axe at three widths.
- Docs: decisions, code tour, the feature README.
