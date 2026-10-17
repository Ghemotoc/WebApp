# Retention schedule

How long each kind of personal data is kept and what removes it (architecture 1.10: "Retention schedule in `docs/retention.md`, enforced by `pg_cron` jobs"). Started by S1-E1-02; every story that stores a new kind of personal data adds its row in the same pull request (Definition of Done, Privacy).

Rows marked **proposal** wait for Robert and the lawyer (docs/for-the-lawyer.md). The data protection impact assessment and the record of processing come with the legal stories (S1-E14-01).

| Data | Where | Kept for | Removed by | Source |
| --- | --- | --- | --- | --- |
| Year of birth, and the month only when the year leaves the age unclear at 13 or 16 | `profiles.birth_year`, `profiles.birth_month` | the life of the account | account deletion (S1-E13-05); the 14-day clean-up when no age check passes (S1-E2-08) | architecture 1.10; S1-E2-02 |
| Age check result, date and method | `profiles.age_check_result`, `age_checked_at`, `age_check_method` | the life of the account | account deletion (S1-E13-05) | architecture 1.10; S1-E2-08 |
| Interface language (ro or en) | `profiles.locale` | the life of the account | account deletion (S1-E13-05) | S1-E1-04 |
| Interface language and light or night mode on a device | the browser's localStorage (`interface-language`, `theme-preference`) | until the person clears their browser; never sent to us | the person's browser | S1-E1-03, S1-E1-04 |
| Which version of the terms and the privacy notice a person accepted, and when | `consents` | the life of the account (proof of consent, GDPR Art 7(1)); how long after deletion is **OPEN** for the lawyer | account deletion (S1-E13-05); nobody can change or delete a row through the API | S1-E14-01; privacy notice, section 5 |
| Invites (who made it, a private note, uses, expiry; the code only as a hash; never who used it) | `invites` | 90 days after the invite expires (**proposal**, S1-E11-17) | a purge job in S1-E13-04; until then nothing is deleted | S1-E2-01, S1-E11-17 |
| Staff roles | `staff_roles` | while the person is staff | role removal (S1-E2-07a) | architecture 1.8.3 |
| Audit log rows (who acted, on whose account) | `audit_log` | 3 years from the action; never edited by any role | a purge job in the retention jobs story (S1-E13-04, piece B17); until it exists nothing is deleted. The append-only triggers refuse deletes for every role, the owner included, so that job needs one deliberate, audited way to remove rows older than 3 years | decided 17 Oct 2026, 17:41 (Robert); architecture 1.6; S1-E11-01 |
| IP addresses | not stored yet | scrambled, kept 30 days | the job that stores them (S1-E10-12) | decided 16 Oct 2026, Q48 |
| Class certificates with a real name | not stored yet | deleted 30 days after the class is archived | S1-E8-12 | decided 17 Oct 2026, 12:44 |
