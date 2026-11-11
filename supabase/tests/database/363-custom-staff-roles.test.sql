-- Database test: custom staff roles (story S1-E11-33, bundle CMS-2a).
-- Covers: an owner or admin makes a role from a fixed list of areas (criterion 1); an admin can't
-- give more than they hold or the Roles area (2); safeguarding, removal orders and opening a market
-- are never offered (3); a holder gets exactly the role's access (4); nobody changes their own
-- roles (5); a change or removal applies at once (6); every change is logged (7); members,
-- visitors and other staff are refused (8). Each new policy has an allowed and a denied test.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

-- Leftovers from an earlier run that didn't roll back.
delete from public.staff_custom_roles where name in ('Marketing e2e test', 'Role managers test');

create temporary table ids on commit drop as
select '00000000-0000-4000-8000-000000000008'::uuid as owner,
       '00000000-0000-4000-8000-000000000009'::uuid as admin,
       '00000000-0000-4000-8000-000000000010'::uuid as moderator,
       '00000000-0000-4000-8000-000000000015'::uuid as helper,
       '00000000-0000-4000-8000-000000000001'::uuid as member;
grant select on ids to authenticated, anon;

create temporary table made (name text primary key, id uuid) on commit drop;
grant all on made to authenticated, anon;

-- A fresh password sign-in, as Supabase's tokens carry it in "amr": role changes need one.
create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint))
  )::text, true);
$$;

-- A signed-out visitor: the claims from an earlier sign-in last for the whole transaction.
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;

-- Runs a statement and returns the hint of the error it raised, or 'no error'.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  error_hint text;
  error_state text;
begin
  execute statement;
  return 'no error';
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint, error_state = returned_sqlstate;
  return coalesce(nullif(error_hint, ''), error_state);
end;
$$;

set local role authenticated;

-- 1. An admin makes a role from areas they hold (criterion 1).
select pg_temp.sign_in_as((select admin from ids));
insert into made
select 'marketing', public.admin_save_custom_role(null, 'Marketing e2e test', 'Builds campaign pages',
  '[{"area": "featured", "access": "act"}, {"area": "stories", "access": "view"}]'::jsonb, 'New marketing hire');
select isnt((select id from made where name = 'marketing'), null, 'an admin makes a custom role');
select is(
  (select jsonb_array_length(roles -> 'areas') from jsonb_array_elements(public.admin_custom_roles() -> 'roles') as roles
   where roles ->> 'name' = 'Marketing e2e test'),
  2, 'the Roles page lists the role with its two areas');

-- Policies: allowed for staff who may see roles.
select is((select count(*)::int from public.staff_custom_roles where name = 'Marketing e2e test'), 1,
  'allowed: staff_custom_roles_select_role_staff lets an admin read custom roles');
select is((select count(*)::int from public.staff_custom_role_areas
           where custom_role_id = (select id from made where name = 'marketing')), 2,
  'allowed: staff_custom_role_areas_select_role_staff lets an admin read a role''s areas');

-- 2 and 3. What an admin may not put in a role.
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'Role managers test', '',
  '[{"area": "roles", "access": "act"}]', 'Try')$$), 'area_out_of_reach:roles',
  'an admin can''t put the Roles area in a custom role');
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'Role managers test', '',
  '[{"area": "safeguarding", "access": "view"}]', 'Try')$$), 'area_out_of_reach:safeguarding',
  'safeguarding never goes in a custom role');
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'Role managers test', '',
  '[{"area": "open_market", "access": "act"}]', 'Try')$$), 'area_out_of_reach:open_market',
  'opening a market never goes in a custom role');
select ok(not exists (select 1 from jsonb_array_elements(public.admin_custom_roles() -> 'assignable') as offered
                      where offered ->> 'area' in ('safeguarding', 'removal_orders', 'open_market', 'roles')),
  'the area list offered to an admin leaves those out, and Roles');
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'marketing E2E TEST ', '',
  '[{"area": "featured", "access": "view"}]', 'Try')$$), 'name_taken',
  'two live roles can''t share a name, whatever the capitals');
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'Role managers test', '',
  '[]', 'Try')$$), 'no_areas', 'a role needs at least one area');
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'Role managers test', '',
  '[{"area": "featured", "access": "act"}]', ' ')$$), 'reason_missing', 'a change needs a reason');

-- 4. Giving the role: the holder gets exactly its access.
select ok(public.admin_set_custom_role_holder((select helper from ids), (select id from made where name = 'marketing'),
  true, 'Starts today'), 'an admin gives the role to an account');
select is(pg_temp.hint_of($$select public.admin_set_custom_role_holder((select admin from ids),
  (select id from made where name = 'marketing'), true, 'Me too')$$), 'own_role',
  'nobody gives a role to themselves (criterion 5)');

select pg_temp.sign_in_as((select helper from ids));
select ok(public.is_staff(), 'a custom role holder counts as staff');
select ok(public.staff_may('featured', 'act'), 'the holder may change Featured');
select ok(public.staff_may('stories', 'view') and not public.staff_may('stories', 'act'),
  'the holder may look at Stories but not change them');
select ok(not public.staff_may('settings', 'view'), 'the holder gets nothing the role doesn''t hold');
select is((select array_agg(area order by area) from public.my_staff_areas()), array['featured', 'stories'],
  'the admin menu shows the holder exactly the role''s areas');
select is((select count(*)::int from public.staff_custom_role_holders), 1,
  'allowed: staff_custom_role_holders_select_role_staff lets a holder read their own row');
select is((select count(*)::int from public.staff_custom_roles), 0,
  'denied: staff_custom_roles_select_role_staff hides custom roles from a holder without Roles');
select is((select count(*)::int from public.staff_custom_role_areas), 0,
  'denied: staff_custom_role_areas_select_role_staff hides role areas from a holder without Roles');
select is(pg_temp.hint_of('select public.admin_custom_roles()'), 'not_allowed',
  'a holder without Roles can''t read the roles list (criterion 8)');

-- Denied for a member who holds nothing.
select pg_temp.sign_in_as((select member from ids));
select is((select count(*)::int from public.staff_custom_role_holders), 0,
  'denied: staff_custom_role_holders_select_role_staff hides other people''s roles from a member');
select is(pg_temp.hint_of($$select public.admin_save_custom_role(null, 'Role managers test', '',
  '[{"area": "featured", "access": "act"}]', 'Try')$$), 'not_allowed', 'a member can''t make a role');

-- An owner's role with Roles in it sits outside an admin's reach.
select pg_temp.sign_in_as((select owner from ids));
insert into made
select 'managers', public.admin_save_custom_role(null, 'Role managers test', '',
  '[{"area": "roles", "access": "act"}]'::jsonb, 'Only the owner may');
select pg_temp.sign_in_as((select admin from ids));
select is(pg_temp.hint_of($$select public.admin_set_custom_role_holder((select moderator from ids),
  (select id from made where name = 'managers'), true, 'Try')$$), 'role_out_of_reach',
  'an admin can''t give a role that holds more than they do');
select is(pg_temp.hint_of($$select public.admin_remove_custom_role((select id from made where name = 'managers'), 'Try')$$),
  'role_out_of_reach', 'an admin can''t remove a role that holds more than they do');

-- 6. A change and a removal apply at once.
select ok(public.admin_save_custom_role((select id from made where name = 'marketing'), 'Marketing e2e test', '',
  '[{"area": "stories", "access": "view"}]'::jsonb, 'Featured moves to the editors') is not null,
  'an admin changes the role');
select pg_temp.sign_in_as((select helper from ids));
select ok(not public.staff_may('featured', 'view'), 'the holder loses Featured as soon as the role changes');
select pg_temp.sign_in_as((select admin from ids));
select ok(public.admin_remove_custom_role((select id from made where name = 'marketing'), 'Role no longer needed'),
  'an admin removes the role');
select pg_temp.sign_in_as((select helper from ids));
select ok(not public.is_staff() and not public.staff_may('stories', 'view'),
  'removing the role takes it from its holder at once');

-- 8. A signed-out visitor can't even call the functions.
select pg_temp.sign_out();
set local role anon;
select is(pg_temp.hint_of('select public.admin_custom_roles()'), '42501', 'a signed-out visitor is refused');

-- 7. The audit log has every change.
reset role;
select is((select count(*)::int from public.audit_log
           where action in ('staff.custom_role_created', 'staff.custom_role_changed', 'staff.custom_role_removed',
                            'staff.custom_role_granted')
             and created_at >= now() - interval '1 minute'), 5,
  'making, changing, removing and giving roles are all in the audit log');

select * from finish();
rollback;
