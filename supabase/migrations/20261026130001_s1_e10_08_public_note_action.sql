-- Story S1-E10-08: "Copied from a published work" report.
-- What this migration does: adds the moderation action public_note, "Add a public note", which
-- puts a note on a story whose copying a moderator confirmed. A new enum value can't be used in
-- the transaction that adds it, so it has its own migration; the next one
-- (…_s1_e10_08_copied_work.sql) uses it.
-- Who runs it: Supabase's GitHub integration when main changes (never from a session).
alter type public.moderation_action add value if not exists 'public_note';
