<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #64

This is part (e) of the READ-4 bundle in Robert's full-app plan: S1-E7-02, email notifications and daily digests. Board Settings 6.3, the Notifications tab.

## What changed

- **Database** (`20261102140001_s1_e7_02_notification_emails.sql`).
  - Three new tables. Each has a select-own policy and explicit grants, and its rows are deleted with the account:
    - `notification_email_settings`: one choice per kind: Instant, Daily digest or Off;
    - `email_unsubscribe_keys`: a 48-character random key per person, for the one-click link;
    - `email_outbox`: which notifications go or went by email. It never holds an address or any words.
  - **Defaults (criterion 1).**
    - Replies to my comments: Instant.
    - New chapters, comments on my chapters and new followers: Daily digest.
    - Reactions: never emailed.
    - A moderation decision is always sent, and the database refuses to switch it off.
  - **Queueing.**
    - A trigger on `notifications` queues the Instant and required emails.
    - `queue_daily_digests()` (pg_cron, 06:00 UTC) queues one digest per person for the day's unread notifications.
  - **Sending.** Cloudflare Pages has no scheduler, so `run_email_worker()` (pg_cron, every 5 minutes) calls `/api/notification-emails` through pg_net with a worker key.
    - The key is the Vault secret `email_worker_key`, and the same value goes in Cloudflare's `EMAIL_WORKER_KEY`.
    - `email_worker_claim()` checks the key and hands over the address, the language and the items.
    - It reads them as the recipient, so blocks, ratings and moderation apply exactly as on their Notifications page.
    - No service key is used anywhere.
  - **Unsubscribe (criterion 2).** `unsubscribe_from_emails(key)` works signed out. It turns every optional kind off and stops emails already waiting. Required ones still go.
  - **Marketing (criterion 3; Q50).** The gate exists before any marketing sender does:
    - `marketing_email_allowed()` is true only for an adult who opted in;
    - `set_marketing_email_opt_in()` refuses anyone under 18.
  - Sent rows are purged after 30 days.
- **Server** (`server/notification-emails.ts`, with `functions/api/notification-emails.ts` and `functions/api/unsubscribe.ts`).
  - Plain-text emails in the person's language.
  - The texts live in `email.json` under `notificationEmails`, so admins can override them from Interface text with the placeholders locked.
  - Every optional email carries an unsubscribe link plus the `List-Unsubscribe` and `List-Unsubscribe-Post` headers (RFC 8058). Account, safety and legal emails say they are always sent.
  - `OutgoingEmail` gains optional `headers` for Brevo and Mailpit.
- **Screens.**
  - Settings › Notifications: a table of four kinds, each with a drop-down, then "Account, safety and legal: Always sent", the no-marketing note and the unsubscribe note.
  - `/unsubscribe?key=…`: one button. It isn't automatic, because mail scanners open links.
- **Docs:** code-tour, the notifications README, retention (three rows), the scheduled-jobs runbook (three jobs), mocks and four board-fixes rows:
  - no Push column until S1-E7-03;
  - the rows that exist today;
  - a panel instead of a tab;
  - the mail doodle.

## How it was tested

- pgTAP `183-notification-emails` (28 tests):
  - allowed and denied tests for all three policies;
  - the defaults;
  - a moderation decision can't be switched off;
  - Instant queues, daily kinds and reactions don't, and the digest carries both followers;
  - nothing is sent twice;
  - the worker is refused without the key, gets the address but no user ID, and leaves out someone the person blocked;
  - claimed emails aren't handed out twice;
  - signed-out unsubscribe, after which a waiting email stops but a moderation decision is still queued;
  - a 17-year-old can't opt in to marketing;
  - the 30-day purge.
- Unit `server/notification-emails.test.ts` (10 tests):
  - the key is required;
  - English and Romanian lines, including the plural verb for several people;
  - the headers;
  - a decision email has no unsubscribe;
  - admin overrides win;
  - only the emails that left are marked sent;
  - the unsubscribe handler.
- e2e `notification-emails.spec.ts` (5 tests):
  - Settings shows the defaults and saves a change;
  - a reply reaches Mailpit with the one-click header;
  - the link's page stops the emails signed out, and the header's POST works too;
  - axe and widths at 390, 768 and 1440 px.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 765 passed |
| db reset + test db | 93 files, 1,976 tests, PASS |
| functions build | compiled |
| e2e: notification-emails plus the specs for Settings, notifications and emails (notifications, epic-s1-e7, birthday, contact, contact-form, copied-work, country, email-change, epic-s1-e2, usernames, writer-profile, public-notice, statements) | 170 passed, 1 failed. The failure was notifications.spec's clean-up: deleting a test account was blocked by its outbox rows. The new tables now cascade with the account, and notifications and notification-emails then passed again (18 passed) |

The full e2e suite runs once before the bundle's last part merges.

## By hand (GO-LIVE)

Nothing is sent from staging until these are set:

1. Make one long random value (for example `openssl rand -hex 32`).
2. Put it in Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets as `EMAIL_WORKER_KEY`.
3. In the Supabase SQL editor (staging, then production), run:
   - `select vault.create_secret('<the same value>', 'email_worker_key');`
   - `select vault.create_secret('https://<site>/api/notification-emails', 'email_worker_url');`
4. `BREVO_API_KEY` must already be set (the Contact us by-hand step).
5. Optional: read the new Romanian lines (`notificationEmails` in `email.json`, `emailSettings` and `unsubscribe` in `notifications.json`).

## Follow-ups

- A Settings switch for marketing email, once a marketing email exists. The rule is already in the database.
- Push notifications in the browser, and the board's Push column and quiet hours (S1-E7-03).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
