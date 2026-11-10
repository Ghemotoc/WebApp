/*
 * Enum value for a reader's own reading list (bundle GAPS-6; the liquid glass Library board
 * draws "Your lists").
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100028) uses it in its functions and tests.
 * - reportable_type 'reading_list': a list of stories a reader names and may open to others. Its
 *   name is text a person writes for others once the list is public, so it can be reported like
 *   any other (CLAUDE.md rule 6).
 */
alter type public.reportable_type add value if not exists 'reading_list';
