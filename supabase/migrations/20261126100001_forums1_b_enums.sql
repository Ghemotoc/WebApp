/*
 * Enum values for forum threads and posts (bundle FORUMS-1, part b; story S1-E8-02).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20261126100002) uses them in its functions and tests.
 * - reportable_type 'forum_thread': a thread (its title) is an item anyone can report and staff
 *   can hide or remove (CLAUDE.md rule 6).
 * - reportable_type 'forum_post': one post in a thread, the same.
 */
alter type public.reportable_type add value if not exists 'forum_thread';
alter type public.reportable_type add value if not exists 'forum_post';
