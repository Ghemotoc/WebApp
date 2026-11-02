/*
 * Enum value for spaces (bundle FORUMS-2, part a; story S1-E8-06).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20261201100002) uses it in its functions and tests.
 * - reportable_type 'space': a space people create (its name, description and rules) is an item
 *   anyone can report and staff can hide or remove (CLAUDE.md rule 6). Its threads and posts are
 *   already 'forum_thread' and 'forum_post'.
 */
alter type public.reportable_type add value if not exists 'space';
