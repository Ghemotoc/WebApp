/*
 * Enums for sending a data request's copy (bundle ADMIN-2, part c2; story S1-E11-09, part 09a;
 * screen 8.12). In its own file because Postgres can't use a value added to an enum in the same
 * transaction that adds it; the next migration (20261216100002) uses both.
 * - export_kind 'data_request': a file staff built for a data request, owned by the person it is
 *   about and downloaded by them, signed in, for seven days (criterion "the files are ready").
 * - notification kind 'data_request_copy_ready': your copy is ready. Always sent, by email too,
 *   because it answers the person's own request (GDPR art. 12(3) and 15).
 */
alter type public.export_kind add value if not exists 'data_request';
alter type public.notification_kind add value if not exists 'data_request_copy_ready';
