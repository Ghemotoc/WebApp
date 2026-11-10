/*
 * Enum value for the home page comment invitation (bundle GAPS-13; story S1-E5-13; board
 * Website-Home, the reader comment card on the cover wall).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100043) uses it in its functions and tests.
 * - notification_kind 'home_comment_invited': the one in-app notification a reader gets when
 *   staff ask to show one of their comments on the home page.
 */
alter type public.notification_kind add value if not exists 'home_comment_invited';
