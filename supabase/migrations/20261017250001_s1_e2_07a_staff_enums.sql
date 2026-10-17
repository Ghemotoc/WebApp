-- Staff permissions and the "staff account" state (story S1-E2-07a).
--
-- Why its own migration: Postgres can't use a new enum value in the same transaction that adds it.
-- What it adds:
--   staff_permission     the three permissions an owner or admin ticks per person, on top of a
--                        role (architecture 1.8.3): safeguarding (trained staff only, S1-E10-10),
--                        teacher_checks (S1-E2-11) and on_call for removal orders (S1-E10-09)
--   account_status       gains staff_account: an account with a staff role is read-only as a
--                        member, which keeps staff powers off the account people know as a writer
--                        (decided 17 Oct 2026, 19:43, Q14a)
-- Member roles: "user" is never stored (every account is one), and space_moderator will be a role
-- inside space membership (S1-E8-07), not a staff role (architecture 1.8.3).

create type public.staff_permission as enum ('safeguarding', 'teacher_checks', 'on_call');

comment on type public.staff_permission is
  'Per-person staff permissions on top of a role, ticked by an owner or admin (architecture 1.8.3, S1-E2-07a).';

comment on type public.staff_role is
  'Stage 1 staff roles (architecture 1.8.3). Member roles are not stored here: "user" is every account, space_moderator belongs to space membership (S1-E8-07).';

alter type public.account_status add value if not exists 'staff_account' before 'legal_acceptance_required';
