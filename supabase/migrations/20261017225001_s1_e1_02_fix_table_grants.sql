-- Migration: explicit table privileges for the Data API roles (story S1-E1-02 fix; Robert, 17 Oct
-- 2026: /legal/terms showed "Nu am putut încărca această pagină" on staging).
--
-- Why: row-level security decides which rows a role sees, but Postgres first asks whether the role
-- may use the table at all (a table privilege, from GRANT). The hosted staging and production
-- projects don't grant new public tables to the Data API roles (anon, authenticated), while the
-- local stack did (auto_expose_new_tables, unset in supabase/config.toml, defaulted to true). So
-- every local test passed, and on staging every direct table read returned 401 "permission denied".
-- supabase/config.toml now sets auto_expose_new_tables = false, so local matches staging.
--
-- What it does:
--   1. stops future tables and sequences in public from handing any privilege to anon or
--      authenticated by default (the hosted default still gave TRUNCATE, REFERENCES, TRIGGER and
--      MAINTAIN, which RLS doesn't cover);
--   2. takes every privilege on every existing public table and sequence back from anon and
--      authenticated;
--   3. grants back exactly what each RLS policy needs: the role and the command the policy names.
-- Who checks it: supabase/tests/database/003-table-grants-match-policies.test.sql fails when a
-- policy names a role and command without the matching grant, when a grant has no policy, and when
-- anon or authenticated hold TRUNCATE, REFERENCES, TRIGGER or MAINTAIN.
-- From now on: every migration that adds a table grants its table privileges explicitly
-- (CLAUDE.md, Conventions).
-- Functions: each function the app calls is already granted by name. Two relied on the local
-- auto-grant and are granted explicitly at the end: log_staff_action() and is_staff().
-- service_role is untouched: it bypasses RLS and is used only by Edge Functions; each Edge
-- Function story grants what it needs.

/* ---------- 1. No privileges by default for new tables and sequences ---------- */

-- Applies to objects that postgres (the role migrations run as) creates in public from now on.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

/* ---------- 2. Take everything back ---------- */

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

/* ---------- 3. Grant exactly what each policy needs ---------- */
-- Every policy on these tables is a SELECT policy; all writes go through security definer
-- functions, which run as their owner and need no table grant for the caller.
-- No sequence grants: every table uses uuid keys (CLAUDE.md, Conventions).

-- legal_documents_select_public, legal_document_versions_select_published (anon, authenticated)
-- and legal_document_versions_select_admin (authenticated): the Legal centre is public (S1-E14-01).
grant select on public.legal_documents to anon, authenticated;
grant select on public.legal_document_versions to anon, authenticated;

-- feature_flags_select_public and settings_select_public (anon, authenticated), plus the
-- *_select_admin policies (authenticated): the app hides buttons by public flags while signed out.
grant select on public.feature_flags to anon, authenticated;
grant select on public.settings to anon, authenticated;

-- profiles_select_own: a member reads their own profile.
grant select on public.profiles to authenticated;

-- consents_select_own: a member reads which legal versions they accepted.
grant select on public.consents to authenticated;

-- staff_roles_select_own and staff_roles_select_admin: a member reads their own roles; owners and
-- admins read everyone's.
grant select on public.staff_roles to authenticated;

-- audit_log_select_admin: owners and admins read the audit log (S1-E11-01).
grant select on public.audit_log to authenticated;

-- invites_select_admin: owners and admins read the invites (S1-E2-01).
grant select on public.invites to authenticated;

/* ---------- 4. Functions that relied on the auto-grant ---------- */

-- log_staff_action(): its migration revoked it from public and anon and meant authenticated to
-- keep it (staff log a sensitive read); the function itself refuses anyone without a staff session.
grant execute on function public.log_staff_action(text, text, text, uuid, text, jsonb, jsonb)
  to authenticated;

-- is_staff(): every *_select_admin policy calls it as the reader, so authenticated must be able to
-- run it; granted by name so the policies don't depend on Postgres's default PUBLIC grant.
grant execute on function public.is_staff(public.staff_role) to authenticated;
