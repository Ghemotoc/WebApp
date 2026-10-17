-- Database tests for staff_roles (story S1-E1-02).
-- Policies covered: staff_roles_select_own and staff_roles_select_admin, each allowed and denied
-- (CLAUDE.md rule 1). Persona IDs are listed in supabase/README.md.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Sign in as moderator: sees their own role only.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';

select results_eq(
  $$ select role::text from public.staff_roles $$,
  $$ values ('moderator') $$,
  'allowed: staff_roles_select_own: a moderator reads their own role'
);

select is_empty(
  $$ select role from public.staff_roles where user_id = '00000000-0000-4000-8000-000000000009' $$,
  'denied: staff_roles_select_own: a moderator cannot read the admin''s role'
);

-- A member with no staff role sees nothing.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is_empty(
  $$ select role from public.staff_roles $$,
  'denied: staff_roles_select_admin: a member with no staff role reads no roles'
);

-- Sign in as admin: sees every role.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}';
select set_eq(
  $$ select role::text from public.staff_roles $$,
  $$ values ('owner'), ('admin'), ('moderator'), ('support'), ('content_editor') $$,
  'allowed: staff_roles_select_admin: the admin reads every staff role'
);

-- Nobody grants themselves a role through the API: there is no insert policy.
select throws_ok(
  $$ insert into public.staff_roles (user_id, role)
     values ('00000000-0000-4000-8000-000000000009', 'owner') $$,
  '42501',
  null,
  'nobody can grant a staff role through the API, not even an admin'
);

select * from finish();

rollback;
