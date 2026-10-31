# READ-4e plan: S1-E7-02 email notifications and digests (issue #64)

Board: Settings 6.3, Notifications tab.

## Contract
- Migration `20261102140001_s1_e7_02_notification_emails.sql`:
  - pg_net; enum `email_delivery` (instant, daily, off);
  - tables `notification_email_settings`, `email_unsubscribe_keys`, `email_outbox`, each select-own, cascade with the profile;
  - `profiles.marketing_email_opt_in`;
  - defaults: replies instant; new chapters, comments on my chapters and new followers daily; reactions off; a moderation decision is always sent;
  - `my_notification_email_settings()`, `set_notification_email()`, `unsubscribe_from_emails(key)` (anon too);
  - the marketing gate `marketing_email_allowed()` and `set_marketing_email_opt_in()` (refused under 18);
  - the outbox trigger, `queue_daily_digests()` (06:00 UTC), the worker functions behind the Vault key `email_worker_key`, `run_email_worker()` (pg_net, every 5 minutes, only when the Vault has `email_worker_url`), `purge_sent_emails()` (30 days).
- The worker reads each email as its recipient (`email_worker_act_as`), so blocks, ratings and moderation apply as on the Notifications page.

## Server
- `server/notification-emails.ts`: `/api/notification-emails` (Bearer worker key; Brevo on Cloudflare, Mailpit locally) and `/api/unsubscribe` (RFC 8058 one-click).
- Texts in `email.json` under `notificationEmails`, with admin overrides.

## Screens
- Settings › Notifications: a table of the 4 kinds with Instant, Daily digest or Off, then "Account, safety and legal: Always sent".
- `/unsubscribe?key=` page with one button.

## Tests
- pgTAP 183: allowed and denied for the 3 policies, defaults, queueing, digest, block filter, key refusal, unsubscribe, the marketing gate, purge.
- Unit tests for the worker and the unsubscribe handler.
- e2e `notification-emails.spec.ts`.
