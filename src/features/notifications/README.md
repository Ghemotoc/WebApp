# Notifications

In-app notifications (S1-E7-01), built by READ-3: the bell in the top bar and the Notifications page at `/notifications` (board 6.2).

- `components/NotificationBell.tsx`: the bell with the unread count, in the top bar while signed in (`src/app/shell/AppLayout.tsx`); its words are in `common.json` because it is on every page.
- `components/NotificationsPage.tsx`: "What's new", the unread line, "Mark all as read", the filter chips, the list and "Show older".
- `components/NotificationFilters.tsx`: All, Replies, Follows, Stories and Staff, each with its count.
- `components/NotificationList.tsx`, `NotificationRow.tsx`, `NotificationIcon.tsx`: the rows under Today, Yesterday, Earlier this week and Older; opening one marks it as read.
- `components/NotificationsEmpty.tsx`: "You're all caught up".
- `components/DecisionsCard.tsx`: "Decisions about your posts": they always arrive and can't be switched off.
- `lib/notificationText.ts`: what each kind says and where it leads; `lib/dayGroups.ts`: the day headings, in Romanian time.
- `api/notifications.ts` and the hooks: `my_notifications()`, `my_unread_notification_count()`, `mark_notifications_read()`. The bell asks every minute and on focus (no Realtime yet).
- `registerNotificationsTranslations.ts`: the `notifications` text namespace, added when the page first renders.
- The database side: `supabase/migrations/…_s1_e7_01_notifications.sql`; tests `154-notifications.test.sql`, `e2e/notifications.spec.ts`.

Notification emails (S1-E7-02), built by READ-4e:

- `components/NotificationEmailsSection.tsx` and `NotificationEmailRow.tsx`: "Notifications" in Settings (board 6.3): Instant, Daily digest or Off per kind; account, safety and legal emails are always sent.
- `components/UnsubscribePage.tsx`: `/unsubscribe?key=…`, the page behind every optional email's link; one press stops every optional email, signed out.
- `api/emailSettings.ts` and `hooks/useEmailSettings.ts`: `my_notification_email_settings()`, `set_notification_email()`, `unsubscribe_from_emails()`.
- The sending: `server/notification-emails.ts` (`/api/notification-emails`, woken by pg_cron through pg_net, and `/api/unsubscribe`, the one-click header). Texts in `src/locales/*/email.json` under `notificationEmails`, editable by admins as `email:` overrides.
- The database side: `supabase/migrations/…_s1_e7_02_notification_emails.sql`; tests `183-notification-emails.test.sql`, `server/notification-emails.test.ts`, `e2e/notification-emails.spec.ts`.
- Paragraph links (IDEAS-1 part e): a row about a comment on a paragraph opens the chapter at that paragraph's thread (`#paragraph-4`, or `#paragraph-earlier` once the writer changed it), from `comment_place` in `notification_json()` and `src/lib/paragraph-link.ts`.
