-- Migration: the notification kinds for a parent's separate yes to suggestions (story S1-E2-03b,
-- bundle LOOK-4c; Robert, 6 Nov 2026, answer D4: under-16s are suggested to other people only
-- with their parent's expressed consent).
--
-- What it adds: two notification kinds, so the writer is told in plain words when their parent
-- or guardian agrees to, or withdraws, being suggested to other people. A new enum value can't be
-- used in the migration that adds it, so this file only adds them; the next one uses them.
-- Who reads them: notification_category() and the notifications list (src/features/notifications).

alter type public.notification_kind add value if not exists 'spotlight_consent_agreed';
alter type public.notification_kind add value if not exists 'spotlight_consent_withdrawn';
