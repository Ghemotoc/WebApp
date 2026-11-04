/*
 * Enum value for a note with a request to join a space (bundle 14d IDEAS-3, part d; idea
 * IDEA-20261102-9).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270125100002) uses it in its functions and tests.
 * - reportable_type 'space_join_note': the short note someone sends with a request to join a space
 *   that approves each request. The owner and moderators with the members power read it, so it is
 *   text people write for others and can be reported like any other (CLAUDE.md rule 6).
 */
alter type public.reportable_type add value if not exists 'space_join_note';
