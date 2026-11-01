-- Migration: the enum values private messages need (story S1-E9-01; bundle MESSAGES, part b).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the values come first and the next migration uses them.
-- What it adds:
--   reportable_type      message: a private message is user content, so the person who received
--                        it can report it and a moderator can hide or remove it on its own
--                        (CLAUDE.md rule 6; architecture 1.7.11).
--   conversation_status  request (the first message waits in the recipient's "Message requests"),
--                        accepted (both can write) and declined (the recipient deleted the
--                        request; the sender is never told).
-- Who uses it: …_s1_e9_01_private_messages.sql and the screens through the generated types.

alter type public.reportable_type add value if not exists 'message';

create type public.conversation_status as enum ('request', 'accepted', 'declined');

comment on type public.conversation_status is
  'Where a one-to-one chat stands: a request waiting for the recipient, accepted, or declined (S1-E9-01).';
