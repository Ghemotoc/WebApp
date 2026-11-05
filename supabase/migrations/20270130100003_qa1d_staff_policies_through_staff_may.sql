-- QA-1d: the last two staff read policies go through staff_may() (independent QA check,
-- 5 Nov 2026, finding X2; architecture 1.8.1: "every staff rule checks a staff session").
--
-- What it does: retention_runs_select_admin and retired_certificate_codes_select_admin asked only
-- is_staff('owner') or is_staff('admin'). That skips is_staff_session(), so once staff sign-in
-- moves to Google Workspace (S1-E2-07b) an owner or admin signed in with a personal writer login
-- could still read them. Both now ask staff_may('compliance_log', 'view'): the same two roles
-- today (owner and admin), plus the staff-session check and any later change to who holds the
-- area, from the one table staff_role_areas.
-- Who calls it: nobody calls these policies directly; Postgres applies them to every read of the
-- two tables (the Metrics and logs page and the Schools area read them through the app).

/* ---------- The clean-up record ---------- */

drop policy retention_runs_select_admin on public.retention_runs;

/**
 * Policy retention_runs_select_admin: staff who may view the compliance log read the clean-up
 * record (owner and admin today).
 * Why: it is evidence for the record of processing and the lawyer, like the compliance log
 * (architecture 1.8.3), and staff_may() adds the staff-session check (QA-1d). Only the jobs write.
 */
create policy retention_runs_select_admin
  on public.retention_runs
  for select
  to authenticated
  using ((select public.staff_may('compliance_log', 'view')));

comment on policy retention_runs_select_admin on public.retention_runs is
  'Allows staff who may view the compliance log (owner and admin) to read the clean-up record, in a staff session; nobody else (S1-E13-04, QA-1d).';

/* ---------- Retired certificate codes ---------- */

drop policy retired_certificate_codes_select_admin on public.retired_certificate_codes;

/**
 * Policy retired_certificate_codes_select_admin: staff who may view the compliance log (owner and
 * admin today) read the retired codes, to answer a school asking about one; everyone else uses
 * verify_certificate(). No one writes: only the trigger adds.
 * Why compliance_log: a retired code outlives a deleted account, so it is kept as a record, and
 * this keeps the same two roles as before rather than widening it to the Schools area (QA-1d).
 */
create policy retired_certificate_codes_select_admin
  on public.retired_certificate_codes
  for select
  to authenticated
  using ((select public.staff_may('compliance_log', 'view')));

comment on policy retired_certificate_codes_select_admin on public.retired_certificate_codes is
  'Allows staff who may view the compliance log (owner and admin) to read retired certificate codes, in a staff session; everyone else uses verify_certificate() (S1-E8-12, QA-1d).';
