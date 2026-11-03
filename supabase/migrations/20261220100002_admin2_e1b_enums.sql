/*
 * Migration: the enum value for pictures waiting for a moderator (bundle ADMIN-2, part e1b;
 * Robert's brief of 2 Nov 2026, 08:39, section 2, changed at 08:41, 08:48 and 08:50).
 *
 * case_source gains 'picture_review': the case a picture opens when the rules say a person must
 * look at it before anyone else sees it (every picture in an All ages or 13+ story, and every
 * picture from someone under 16), as opposed to 'picture_check', where a tool flagged it. The
 * statement of reasons then says no automated tool found it (DSA art. 17(3)(c)).
 * Postgres can't use a new enum value in the transaction that adds it, so the value has a
 * migration of its own; 20261220100003_admin2_e1b_pictures_to_check.sql uses it.
 * Who reads it: open_picture_review_case() and the moderation queue (src/features/moderation/).
 */

alter type public.case_source add value if not exists 'picture_review';
