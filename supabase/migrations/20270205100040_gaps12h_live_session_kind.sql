/*
 * Enum value for the live session reminder (bundle GAPS-12h; board WritersHub, "Live sessions ·
 * Remind me").
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100041) uses it in its functions and tests.
 * - notification_kind 'live_session_soon': the one in-app notification a member who pressed
 *   Remind me gets shortly before a live session starts.
 */
alter type public.notification_kind add value if not exists 'live_session_soon';
