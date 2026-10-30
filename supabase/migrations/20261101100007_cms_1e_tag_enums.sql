-- Migration: the enum values tag approval needs (CMS-1e: Robert's tag task, 30 Oct 2026, 10:43).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the values come first and the tags migration that follows uses them.
-- What it adds:
--   tag_status         where a tag is: waiting for a member of staff, approved, or rejected
--   notification_kind  tag_rejected: a writer hears that a tag on their story wasn't approved and
--                      was taken off it (Robert, 30 Oct 2026: "the writer is told")
-- Who uses them: 20261101100008_cms_1e_tags.sql and the screens through the generated types.

/**
 * tag_status: a tag a writer types for the first time waits for staff (Robert, 30 Oct 2026:
 * "Users can add additional tags, however, they need to be approved by a member of staff").
 * Readers, Discover and search only ever see approved tags.
 */
create type public.tag_status as enum ('waiting', 'approved', 'rejected');

comment on type public.tag_status is
  'Where a tag is: waiting for staff, approved (readers see it) or rejected (taken off every story) (CMS-1e).';

alter type public.notification_kind add value if not exists 'tag_rejected';
