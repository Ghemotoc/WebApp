-- Migration: the enum value public Story Atlas items need (story S1-E17-34; bundle ATLAS, part i).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the value comes first and the next migration uses it.
-- What it adds:
--   reportable_type  atlas_item: a part of a story's plan the writer made public (a character, a
--                    relationship, a world section or entry, a timeline event) is user content
--                    readers see, so a reader can report it and a moderator can hide or remove it
--                    on its own (CLAUDE.md rule 6; architecture 1.7.11). One value covers the five
--                    kinds: their row IDs never repeat, and the functions find the kind by ID.
-- Who uses it: …_s1_e17_32_public_plan.sql and the screens through the generated types.

alter type public.reportable_type add value if not exists 'atlas_item';
