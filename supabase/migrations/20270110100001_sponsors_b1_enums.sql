/*
 * Migration: the picture kind for sponsor creatives (bundle SPONSORS, part b1; story S1-E12-02
 * criterion 1).
 *
 * picture_kind gains 'sponsor_creative': a sponsor campaign's picture, kept in the private
 * `sponsor-creatives` bucket and checked like every other upload (CLAUDE.md rule 19).
 * Postgres can't use a new enum value in the transaction that adds it, so the value has a
 * migration of its own; 20270110100002_sponsors_b1_campaigns.sql uses it.
 * Who reads it: register_sponsor_creative(), picture_needs_person() and the picture check.
 */

alter type public.picture_kind add value if not exists 'sponsor_creative';
