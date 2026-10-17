-- Database tests for the append-only audit log (story S1-E1-02; architecture 1.6, B03).
-- Policy covered: audit_log_select_admin (allowed and denied, CLAUDE.md rule 1).
-- Also proves: only staff can write through log_staff_action(), and nobody, the table's owner
-- included, can change, delete or empty the log.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- A moderator (staff) records an action.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';
select lives_ok(
  $$ select public.log_staff_action(
       'profile.viewed', 'profiles', '00000000-0000-4000-8000-000000000001',
       '00000000-0000-4000-8000-000000000001', 'test reason') $$,
  'a staff member writes to the audit log through log_staff_action()'
);

-- A moderator is not owner or admin, so cannot read the log back.
select is_empty(
  $$ select id from public.audit_log $$,
  'denied: audit_log_select_admin: a moderator cannot read the audit log'
);

-- A member without a staff role cannot write.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ select public.log_staff_action('profile.viewed', 'profiles') $$,
  '42501',
  'Only staff can write to the audit log.',
  'a member without a staff role cannot write to the audit log'
);
select throws_ok(
  $$ insert into public.audit_log (user_id, action, target_type)
     values ('00000000-0000-4000-8000-000000000001', 'fake', 'profiles') $$,
  '42501',
  null,
  'nobody inserts into the audit log directly'
);

-- The admin reads the moderator's row, with who did it. (Only this test's action is compared:
-- rows written by end-to-end runs on the same local database can't be deleted, by design.)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}';
select results_eq(
  $$ select user_id, action from public.audit_log where action = 'profile.viewed' $$,
  $$ values ('00000000-0000-4000-8000-000000000010'::uuid, 'profile.viewed') $$,
  'allowed: audit_log_select_admin: the admin reads the audit log, including who acted'
);

-- Through the API, even the admin can't change or delete rows.
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501',
  null,
  'the admin cannot delete audit rows'
);

-- As the table's owner (postgres): still refused, by the triggers.
reset role;
select throws_ok(
  $$ update public.audit_log set reason = 'changed' $$,
  '42501',
  'audit_log is append-only: rows can never be changed or deleted (architecture 1.6).',
  'the table owner cannot change an audit row'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501',
  'audit_log is append-only: rows can never be changed or deleted (architecture 1.6).',
  'the table owner cannot delete an audit row'
);
select throws_ok(
  $$ truncate public.audit_log $$,
  '42501',
  'audit_log is append-only: rows can never be changed or deleted (architecture 1.6).',
  'the table owner cannot empty the audit log'
);

select * from finish();

rollback;
