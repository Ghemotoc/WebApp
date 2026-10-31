-- Migration: the enum values music and video cards need (story S1-E3-10).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the values come first and the next migration uses them.
-- What it adds:
--   reportable_type  embed: a music or video card in a chapter is an item a reader can report and
--                    a moderator can remove on its own, without unpublishing the chapter
--                    (S1-E3-10 criterion 4; rule 6, the shared reporting contract)
--   embed_service    the services a writer may add from (S1-E3-10 criterion 1; "Lumo" is Loom, Q22)
-- Who uses them: …_s1_e3_10_music_and_video.sql and the screens through the generated types.

alter type public.reportable_type add value if not exists 'embed';

/**
 * embed_service: where a music or video card plays from. The same list lives in
 * src/lib/embed-links.ts, which also fixes each service's player address.
 */
create type public.embed_service as enum ('youtube', 'vimeo', 'loom', 'spotify', 'apple_music');

comment on type public.embed_service is
  'The services a chapter''s music and video cards may play from (S1-E3-10 criterion 1).';
