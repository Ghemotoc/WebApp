/*
 * Enum values for staff hiding a story's title or cover (bundle ADMIN-2, part b3; story
 * S1-E11-08 criterion "hide the cover or the title").
 * In its own file because Postgres can't use a value added to an enum in the same transaction that
 * adds it; the next migration (20261214100002) uses them.
 * - statement_action 'title_hidden': staff hid a story's title on public screens behind "Title
 *   hidden by the moderation team" until the writer changes it. It restricts what readers see, so
 *   the writer gets a statement of reasons (DSA art. 17; S1-E11-08 criterion 3).
 * - statement_action 'cover_hidden': staff hid a story's cover; readers see the automatic cover
 *   (S1-E3-13) until the writer picks another. Also a statement of reasons.
 */
alter type public.statement_action add value if not exists 'title_hidden';
alter type public.statement_action add value if not exists 'cover_hidden';
