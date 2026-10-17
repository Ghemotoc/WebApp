-- Database tests for feature_flags and settings (story S1-E1-02).
-- Policies covered, each allowed and denied (CLAUDE.md rule 1):
--   feature_flags_select_public, feature_flags_select_admin,
--   settings_select_public, settings_select_admin.
-- The private rows below exist only inside this test (rolled back at the end).
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- Test rows: one private flag, one public and one private setting.
insert into public.feature_flags (key, is_enabled, is_public, description)
values ('example_private_flag', true, false, 'Test only');
insert into public.settings (key, value, is_public, description) values
  ('example_public_setting', '1'::jsonb, true, 'Test only'),
  ('example_private_setting', '2'::jsonb, false, 'Test only');

-- 1. The March switches are seeded by the migration (decided 17 Oct 2026, 12:44).
select results_eq(
  $$ select key, is_enabled from public.feature_flags
     where key in ('invite_only', 'adults_only', 'social_login', 'maintenance_mode') order by key $$,
  $$ values ('adults_only', true), ('invite_only', true), ('maintenance_mode', false), ('social_login', false) $$,
  'the March flags exist with invite_only and adults_only on'
);

-- Signed out.
set local role anon;
select ok(
  (select count(*) from public.feature_flags where key = 'invite_only') = 1,
  'allowed: feature_flags_select_public: a signed-out visitor reads a public flag'
);
select is_empty(
  $$ select key from public.feature_flags where key = 'example_private_flag' $$,
  'denied: feature_flags_select_public: a signed-out visitor cannot read a private flag'
);
select ok(
  (select count(*) from public.settings where key = 'example_public_setting') = 1,
  'allowed: settings_select_public: a signed-out visitor reads a public setting'
);
select is_empty(
  $$ select key from public.settings where key = 'example_private_setting' $$,
  'denied: settings_select_public: a signed-out visitor cannot read a private setting'
);

-- A moderator is staff but not owner or admin.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';
select is_empty(
  $$ select key from public.feature_flags where key = 'example_private_flag' $$,
  'denied: feature_flags_select_admin: a moderator cannot read a private flag'
);
select is_empty(
  $$ select key from public.settings where key = 'example_private_setting' $$,
  'denied: settings_select_admin: a moderator cannot read a private setting'
);

-- The owner reads everything.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000008", "role": "authenticated"}';
select ok(
  (select count(*) from public.feature_flags where key = 'example_private_flag') = 1,
  'allowed: feature_flags_select_admin: the owner reads a private flag'
);
select ok(
  (select count(*) from public.settings where key = 'example_private_setting') = 1,
  'allowed: settings_select_admin: the owner reads a private setting'
);

-- Nobody changes a flag through the API: changes come by migration until S1-E11-03.
select throws_ok(
  $$ update public.feature_flags set is_enabled = false where key = 'adults_only' returning key $$,
  '42501',
  null,
  'not even the owner can switch a flag through the API (no update grant)'
);

select * from finish();

rollback;
