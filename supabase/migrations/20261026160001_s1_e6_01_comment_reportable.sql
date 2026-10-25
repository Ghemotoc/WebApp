/*
 * Migration: "comment" becomes a reportable type (story S1-E6-01; CLAUDE.md rule 6: every new
 * user-content type is registered as reportable).
 *
 * Alone in its own file because Postgres can't use a new enum value in the transaction that adds
 * it; the comments migration that follows (…160002) uses it in its functions and tests.
 * Who reads it: reportable_item_owner() and reportable_item_summary() (their 'comment' branches,
 * next migration), report_item(), the moderation queue and moderated_items.
 */
alter type public.reportable_type add value if not exists 'comment';
