-- Database tests for staff roles and permissions (story S1-E2-07a; architecture 1.8.3).
-- What it proves:
-- - staff_may() follows the roles table: a moderator acts on moderation but not settings, support
--   only views users, the website CMS and interface text are owner and admin only, a permission-gated area needs the permission, a member may do nothing;
-- - an owner grants any role; an admin grants moderator, support and content editor only;
-- - nobody changes their own role; a reason is required; the last owner can't be removed;
-- - every change is in the audit log with before and after values;
-- - an account with a staff role is read-only as a member (staff_account);
-- - with is_staff_session() false (as S1-E2-07b will make it outside Google sign-in), every staff
--   rule refuses;
-- - bootstrap_first_owner() works once, and never through the API;
-- - allowed and denied tests for the new policies.
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- Persona IDs (supabase/README.md).
create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support;
grant select on ids to authenticated, anon;

-- The seed gives the moderator the safeguarding (S1-E10-03a) and teacher checks (S1-E2-11)
-- permissions; this test proves the permissions' own rules, so it starts without them.
delete from public.staff_permissions where user_id = (select moderator from ids)
  and permission in ('safeguarding', 'teacher_checks');

-- A fresh password sign-in, as Supabase's tokens carry it in "amr": changing a role needs one
-- within staff_fresh_sign_in_minutes (S1-E11-01).
create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint))
  )::text, true);
$$;

-- 1. What each role may do.
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select ok(public.staff_may('moderation', 'act'), 'a moderator acts on the moderation queue');
select ok(not public.staff_may('settings', 'view'), 'a moderator can''t see settings and flags');
select ok(not public.staff_may('safeguarding', 'act'), 'safeguarding needs the safeguarding permission too');
select ok(not public.staff_may('schools', 'act'), 'a moderator needs the teacher checks permission for schools');
select pg_temp.sign_in_as((select support from ids));
select ok(public.staff_may('users', 'view'), 'support views users');
select ok(not public.staff_may('users', 'act'), 'support can''t act on users');
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000012');
select ok(not public.staff_may('website_cms', 'act'),
  'a content editor has no website CMS area: owner and admin only (decided 17 Oct 2026, 19:19)');
select pg_temp.sign_in_as((select admin from ids));
select ok(public.staff_may('interface_text', 'act'), 'an admin edits interface text');
select pg_temp.sign_in_as((select adult_writer from ids));
select ok(not public.staff_may('moderation', 'view'), 'a member may use no staff area');
select is_empty($$ select id from public.staff_role_areas $$,
  'denied: staff_role_areas_select_staff: a member reads no role map');
select is_empty($$ select id from public.staff_permissions $$,
  'denied: staff_permissions_select_own: a member has no permissions to read');

-- 2. An admin's reach.
select pg_temp.sign_in_as((select admin from ids));
select isnt_empty($$ select id from public.staff_role_areas $$,
  'allowed: staff_role_areas_select_staff: staff read the role map');
select ok(public.admin_grant_role((select teacher from ids), 'moderator', 'Joins the moderation team'),
  'an admin grants the moderator role');
select throws_ok($$ select public.admin_grant_role((select teacher from ids), 'admin', 'Promotion') $$,
  '42501', null, 'an admin can''t grant the admin role');
select throws_ok($$ select public.admin_grant_role((select teacher from ids), 'owner', 'Promotion') $$,
  '42501', null, 'an admin can''t grant the owner role');
select throws_ok($$ select public.admin_remove_role((select admin from ids), 'admin', 'Stepping down') $$,
  '42501', null, 'nobody changes their own role');
select throws_ok($$ select public.admin_grant_role((select support from ids), 'content_editor', '  ') $$,
  '23514', null, 'a reason is required');
select ok(public.admin_set_permission((select moderator from ids), 'safeguarding', true, 'Finished the training'),
  'an admin ticks the safeguarding permission');
select isnt_empty($$ select id from public.staff_permissions where user_id = (select moderator from ids) $$,
  'allowed: staff_permissions_select_roles: an admin reads other staff members'' permissions');
select throws_ok($$ select public.admin_set_permission((select adult_writer from ids), 'on_call', true, 'On call') $$,
  '23514', null, 'permissions are only for staff');

-- 3. The moderator now has safeguarding, and the teacher is staff (so read-only as a member).
select pg_temp.sign_in_as((select moderator from ids));
select ok(public.staff_may('safeguarding', 'act'), 'with the permission, a moderator handles safeguarding cases');
select isnt_empty($$ select id from public.staff_permissions $$,
  'allowed: staff_permissions_select_own: a moderator reads their own permission');
select is_empty($$ select id from public.staff_permissions where user_id <> (select moderator from ids) $$,
  'denied: staff_permissions_select_roles: a moderator reads nobody else''s permissions');
reset role;
select is(public.account_state((select teacher from ids))::text, 'staff_account',
  'an account with a staff role can''t publish, comment, post or message as a member');
select is(public.account_state((select adult_writer from ids))::text, 'active',
  'a writer account without a role is unaffected');

-- 4. The owner's reach and the last owner.
set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select ok(public.admin_grant_role((select admin from ids), 'owner', 'Co-founder'), 'an owner grants the owner role');
select ok(public.admin_remove_role((select admin from ids), 'owner', 'Back to admin only'), 'an owner removes another owner');
select throws_ok($$ select public.admin_remove_role((select owner from ids), 'owner', 'Leaving') $$,
  '42501', null, 'the owner can''t remove their own role either');
reset role;
select is((select count(*)::integer from public.staff_roles where role = 'owner'), 1,
  'one owner always remains: the last one can''t remove themselves, and nobody else can reach them');
-- Only this test's rows (written in this transaction, so created_at = now()): rows written by
-- end-to-end runs on the same local database can't be deleted, by design.
select set_eq(
  $$ select action, coalesce(after_values ->> 'role', before_values ->> 'role', after_values ->> 'permission')
     from public.audit_log where action like 'staff.%' and created_at = now() $$,
  $$ values ('staff.role_granted', 'moderator'), ('staff.permission_granted', 'safeguarding'),
            ('staff.role_granted', 'owner'), ('staff.role_removed', 'owner') $$,
  'every change is in the audit log with its before and after values'
);

-- 5. Outside a staff session (S1-E2-07b), every staff rule refuses.
create or replace function public.is_staff_session() returns boolean language sql stable as $$ select false $$;
set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select ok(not public.staff_may('settings', 'view'), 'without a staff session, the admin may use no area');
select is_empty($$ select id from public.audit_log union all select id from public.invites
  union all select id from public.feature_flags where not is_public $$,
  'without a staff session, the audit log, invites and private flags are hidden');

-- 6. The first owner, from the SQL editor only.
select throws_ok($$ select public.bootstrap_first_owner((select teacher from ids)) $$,
  '42501', null, 'nobody can make the first owner through the API');
reset role;
select throws_ok($$ select public.bootstrap_first_owner((select teacher from ids)) $$,
  '23514', null, 'once an owner exists, bootstrap_first_owner refuses');

select * from finish();

rollback;
