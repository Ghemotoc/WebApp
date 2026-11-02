/*
 * Enum for staff changing a story (bundle ADMIN-2, part b1; story S1-E11-08, part 08a).
 * In its own file because Postgres can't use a value added to an enum in the same transaction that
 * adds it; the next migration (20261212100002) uses it.
 * - notification_kind 'story_changed_by_staff': staff changed something about a story that
 *   restricts nothing (a corrected category or tag, comments switched, a story shown again), so the
 *   writer is told what changed and why (S1-E11-08 criterion 4). A change that restricts content
 *   sends a statement of reasons instead (criterion 3).
 */
alter type public.notification_kind add value if not exists 'story_changed_by_staff';
