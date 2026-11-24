/*
 * Enum value for the end of a story (BOOKS B06, user story 2.6, board B06-ReaderLast).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100441_books_b06_story_completed.sql) uses it.
 * - notification_kind 'story_completed': "inkwolf finished The Salt Mine Choir." The one
 *   notification followers get when the chapter the writer marked as the last goes live (CALM-6),
 *   in place of the usual new-chapter one.
 */
alter type public.notification_kind add value if not exists 'story_completed';
