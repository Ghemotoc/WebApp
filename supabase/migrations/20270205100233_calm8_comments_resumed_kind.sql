/*
 * Enum value for pausing new comments (bundle CALM-8; IDEA-20261109-8; story S1-E6-01; Robert's
 * go-ahead, 20 Nov 2026, 08:48 and 13:03 UTC, Builder thread).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100234_calm8_pause_comments.sql) uses it in end_comment_pauses().
 * - notification_kind 'comments_resumed': the quiet in-app note a writer gets when a pause of new
 *   comments on their story ends by itself ("New comments are open again on …"). In the app only:
 *   no email (default_email_delivery() has no row for it, so it is never sent at once nor put in
 *   a daily digest) and no push.
 */
alter type public.notification_kind add value if not exists 'comments_resumed';
