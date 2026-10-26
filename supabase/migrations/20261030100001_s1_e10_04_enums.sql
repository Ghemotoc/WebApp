-- Migration: the enum values statements of reasons need (story S1-E10-04; DSA art. 17 and
-- art. 16(5)).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the values come first and the next migration (…_s1_e10_04_statements_of_reasons.sql)
-- uses them.
-- What it adds:
--   notification_kind   report_outcome: a reporter is told what came of their report (S1-E10-04
--                       criterion 2); the reported person keeps moderation_decision
--   statement_action    what a statement of reasons says was done: a case's decision (a removal
--                       order's too, S1-E10-09), a sanction from the account page, a raised
--                       rating or the undisclosed-AI label
--   statement_ground    whether the decision rests on our terms (the community rules) or on a law
--                       (DSA art. 17(3)(d) and (e) ask for one or the other)
-- Who uses them: the statements migration, the statement page (src/features/statements/) and the
-- notifications page, through the generated types.

alter type public.notification_kind add value if not exists 'report_outcome';

/** statement_action: what was done, as the statement of reasons names it (S1-E10-04). */
create type public.statement_action as enum (
  'hide', 'remove', 'restrict', 'warn', 'suspend', 'ban', 'public_note', 'reporting_pause',
  'rating_raised', 'ai_label_added'
);

comment on type public.statement_action is
  'What a statement of reasons says was done: a case decision, a sanction, a raised rating or the AI label (S1-E10-04).';

/** statement_ground: the kind of rule a decision rests on (DSA art. 17(3)(d) and (e)). */
create type public.statement_ground as enum ('terms', 'law');

comment on type public.statement_ground is
  'terms: our community rules (DSA art. 17(3)(e)); law: an illegal-content rule or an authority order (art. 17(3)(d)) (S1-E10-04).';
