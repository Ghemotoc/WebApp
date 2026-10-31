/*
 * Migration: the enum value Story Atlas's character pictures need (story S1-E17-11; bundle ATLAS,
 * part b). An enum value must be committed before a later migration can use it, so it has its
 * own file; the tables and functions are in …_s1_e17_08_characters.sql.
 *
 * What it adds: picture_kind 'atlas_image', a portrait or mood picture a writer uploads to their
 * own Story Atlas. Like every other picture it goes through the picture check (CLAUDE.md rule 19).
 */

alter type public.picture_kind add value if not exists 'atlas_image';
