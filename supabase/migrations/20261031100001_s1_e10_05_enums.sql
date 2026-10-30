-- Migration: the enum values the second safety round needs (stories S1-E10-05 picture check,
-- S1-E10-07 appeals and S1-E10-11 moderator mail).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the values come first and the next migrations use them.
-- What it adds:
--   reportable_type    picture: an uploaded picture is an item a case can be about (the picture
--                      check opens the case, S1-E10-05; rule 6, the shared reporting contract)
--   notification_kind  appeal_decided: the person who appealed hears the outcome (S1-E10-07;
--                      DSA art. 20(5)); moderator_mail_reply: the moderation team answered a
--                      member's message (S1-E10-11)
--   picture_kind       which screen a picture belongs to (S1-E10-05 criterion 1)
--   picture_status     where a picture is in its check
-- Who uses them: the picture check, appeals and moderator mail migrations that follow, and the
-- screens through the generated types.

alter type public.reportable_type add value if not exists 'picture';
alter type public.notification_kind add value if not exists 'appeal_decided';
alter type public.notification_kind add value if not exists 'moderator_mail_reply';

/**
 * picture_kind: what an uploaded picture is for (S1-E10-05 criterion 1). Cover and avatar have
 * upload screens today; the others are listed so their stories only add a screen. Teachers' proof
 * files are not pictures here: only staff ever see them (S1-E2-11).
 */
create type public.picture_kind as enum (
  'cover', 'avatar', 'chapter_picture', 'drawing', 'quote_card', 'space_banner'
);

comment on type public.picture_kind is
  'What an uploaded picture is for; every kind goes through the picture check (S1-E10-05).';

/**
 * picture_status: where a picture is in its check (S1-E10-05).
 *   pending   uploaded, the check hasn't answered yet (or a service was down); only the uploader
 *             and staff see it
 *   passed    both checks passed: everyone may see it
 *   held      a check flagged it: private, a case is open for a person to decide
 *   approved  a moderator looked and approved it: everyone may see it
 *   removed   a moderator removed it: nobody but staff sees it
 */
create type public.picture_status as enum ('pending', 'passed', 'held', 'approved', 'removed');

comment on type public.picture_status is
  'Where an uploaded picture is in its check: pending, passed, held, approved or removed (S1-E10-05).';
