# CLASSES-e plan: writing certificates (S1-E8-12, issue #78)

Issue #78 has no comments. Contests (S1-E12-02) don't exist yet, so certificates come from class programmes only.

## Database (`20261210100001_classes_e_enums.sql`, `20261210100002_classes_e_certificates.sql`)
- `certificate_result` enum; notification kinds `certificate_issued` and `class_archived`.
- `certificates` (kind user_action; user_id not null; space, teacher, programme, result, printed class/school/teacher names, unique code, printed_name, signed_at, revoked_*). RLS: select own (allowed and denied tests). Grants: select to authenticated.
- `retired_certificate_codes` (kind platform; no grants, no policies) filled by an after-delete trigger.
- Functions: issue_class_certificates, class_certificates, my_certificates, set_certificate_printed_name, verify_certificate (anon), admin_certificate, admin_revoke_certificate (audit), purge_class_certificate_names (run_retention_jobs), archive_class_space (+ notify), email_delivery_for (class_archived required), notification_category, data_export_tables, account_deletion_rules.
- Setting `certificate_signatory_name`.

## Screens
- `/certificates`, `/certificates/:id` (PrintedNameForm, CertificateSheet, language choice, print), `/verify`, `/spaces/:slug/certificates` (ClassResultsForm), ClassCertificatesCard in class settings, Staff › Schools › Certificates.
- Print CSS: only the sheet, A4.
- Notifications and the archived-class email.

## Tests (criteria)
- 236-certificates.test.sql: criteria 1, 2, 3, 5, 6, 7, 8; 021 updated.
- Unit: api parsers and errors, dates, picked results, the email.
- e2e/certificates.spec.ts: criteria 1, 2, 4, 5, 6, 7, 3 (notice and email queued); axe on five screens.

## Proposals (rule 13)
- Teacher's signature = logged approval (Q71). PDF = browser print (Q49 open). Pen name after deletion. Teacher's display name prints.
