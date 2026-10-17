-- Migration: staff_roles, who on the team holds which staff role (story S1-E1-02, minimal version).
--
-- What it adds: one row per person and role. is_staff() reads it (next migration).
-- Why minimal: the account gate and the audit log need a source of staff roles now (Robert,
-- 17 Oct 2026: minimal tables now). S1-E2-07a adds permissions (safeguarding, teacher checks,
-- on call), the functions that grant and remove roles, and the staff screens.
-- Rule: nobody changes their own role; roles change only through audited admin functions
-- (architecture 1.8.3), so there are no write policies here.

create table public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  -- The staff member (CLAUDE.md rule 15: owner column user_id, not null, references profiles).
  user_id uuid not null references public.profiles (id),
  role public.staff_role not null,
  -- Who granted it; null for roles created by a migration or the seed.
  granted_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_one_row_per_role unique (user_id, role)
);

comment on table public.staff_roles is
  'kind: staff
Staff roles per person (architecture 1.8.3). Minimal in S1-E1-02; S1-E2-07a adds permissions.';

create trigger staff_roles_set_updated_at
  before update on public.staff_roles
  for each row execute function public.set_updated_at();

create trigger staff_roles_refuse_user_id_change
  before update on public.staff_roles
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.staff_roles enable row level security;

/**
 * Policy staff_roles_select_own: a staff member reads their own roles.
 * Who: the person the role belongs to. Why: the admin menu shows only the areas their role can use
 * (architecture 1.8.2); seeing other people's roles needs owner or admin (next migrations).
 */
create policy staff_roles_select_own
  on public.staff_roles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy staff_roles_select_own on public.staff_roles is
  'Allows a staff member to read their own roles, so the admin menu can show their areas (1.8.2).';
