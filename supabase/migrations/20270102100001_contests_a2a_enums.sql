/*
 * Migration: the picture kind for landing pages (bundle CONTESTS, part a2a; story S1-E11-14
 * criterion 5).
 *
 * picture_kind gains 'landing_picture': a picture in a landing page's Hero or Text block, kept in
 * the `landing-pictures` bucket and checked like every other upload (CLAUDE.md rule 19).
 * Postgres can't use a new enum value in the transaction that adds it, so the value has a
 * migration of its own; 20270102100002_contests_a2a_pictures_featured.sql uses it.
 * Who reads it: register_landing_picture(), picture_needs_person() and the picture check.
 */

alter type public.picture_kind add value if not exists 'landing_picture';
