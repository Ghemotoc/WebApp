/*
 * Enums for staff data requests (bundle ADMIN-2, part c1; story S1-E11-09, part 09a; screen 8.12).
 * In its own file because Postgres can't use a value added to an enum in the same transaction that
 * adds it; the next migration (20261215100002) uses the notification kinds.
 * - data_request_type: what the person asked for (criterion 1): a copy of their data (GDPR art. 15),
 *   to move it (art. 20), to correct it (art. 16), to delete it (art. 17), or something else.
 * - data_request_channel: how it arrived: in the app, by email or by post.
 * - data_request_state: open until staff close it.
 * - data_request_identity: where the identity check stands (criterion 4, GDPR art. 12(6)):
 *   not_needed for a request made inside the signed-in account; asked once staff ask the person to
 *   confirm; confirmed or denied by the person, signed in to their own account.
 * - notification kinds 'data_request_confirm' (please confirm this request was yours) and
 *   'data_request_extended' (we need more time; GDPR art. 12(3) says to tell them within the first
 *   month). Both are always sent, by email too, because they are about the person's own rights.
 */
create type public.data_request_type as enum ('copy', 'move', 'correct', 'delete', 'other');
comment on type public.data_request_type is
  'What a data request asks for (S1-E11-09): copy (art. 15), move (art. 20), correct (art. 16), delete (art. 17) or other.';

create type public.data_request_channel as enum ('in_app', 'email', 'post');
comment on type public.data_request_channel is
  'How a data request arrived (S1-E11-09 criterion 1).';

create type public.data_request_state as enum ('open', 'closed');
comment on type public.data_request_state is
  'Whether staff are still working on a data request (S1-E11-09).';

create type public.data_request_identity as enum ('not_needed', 'not_asked', 'asked', 'confirmed', 'denied');
comment on type public.data_request_identity is
  'Where a data request''s identity check stands (S1-E11-09 criterion 4; GDPR art. 12(6)).';

alter type public.notification_kind add value if not exists 'data_request_confirm';
alter type public.notification_kind add value if not exists 'data_request_extended';
