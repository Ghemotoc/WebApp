/*
 * Enum values for readers' thank-yous (bundle IDEAS-1, part c; idea IDEA-20261031-3).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20261121100002) uses it.
 * - notification_kind 'story_finished': a reader who put the story on their Finished shelf
 *   tells the writer, in fixed kind words, that they finished it.
 */
alter type public.notification_kind add value if not exists 'story_finished';
