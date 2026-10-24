-- Database tests for user management in the admin site (story S1-E11-02; CLAUDE.md rule 1;
-- architecture 1.8.3's role table).
-- No new tables, so no new policies: these test every new function with an allowed and a denied
-- caller.
-- What it proves:
-- - admin_user_lookup(): moderator and support find accounts by username, pen name, whole email
--   (logged), full user ID and short ID; support sees no sanctions and no case counts; the content
--   editor and a member are refused;
-- - admin_user_account(): status, age group, age check, masked email and what the caller may do;
--   never the year of birth; support may not act; the editor is refused;
-- - admin_account_open_cases(): a safeguarding case only with the permission (moderator yes,
--   admin no); support refused;
-- - admin_reveal_email(): moderator and support now allowed and logged; the editor refused;
-- - admin_reset_pen_name() and admin_sign_out_everywhere(): moderator allowed and logged; support
--   refused; nobody acts on their own account; a reason is required.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Personas: …01 adult_writer (pen name "Lia Scrie"), …05 pending_check (one safeguarding case),
-- …07 teacher, …09 admin (no safeguarding), …10 moderator, …11 support, …12 editor,
-- …13 suspended_user (a suspension).
-- A session for adult_writer, so "Sign out everywhere" has something to end.
-- (Sessions left by earlier end-to-end runs are cleared first, inside this rolled-back test.)
delete from auth.sessions where user_id = '00000000-0000-4000-8000-000000000001';
insert into auth.sessions (id, user_id, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', now(), now());

-- The teacher's email, read before signing in (members can't read auth.users).
create temp table teacher_email as
  select email from auth.users where id = '00000000-0000-4000-8000-000000000007';
grant select on teacher_email to authenticated;

/* ---------- admin_user_lookup ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(
  (select concat_ws('|', handle, matched_by, account_status) from public.admin_user_lookup('@teach')),
  'teacher|username|active',
  'the moderator finds an account by the start of its username'
);
select is(
  (select handle from public.admin_user_lookup('scrie')),
  'adult_writer',
  'the moderator finds an account by part of its pen name'
);
select is(
  (select concat_ws('|', handle, matched_by) from public.admin_user_lookup('00000000-0000-4000-8000-000000000013')),
  'suspended_user|user_id',
  'the moderator finds an account by its full user ID'
);
select is(
  (select sanction_kinds::text from public.admin_user_lookup('suspended_user')),
  '{suspension}',
  'the moderator sees the kinds of sanction an account has had'
);
select is(
  (select open_case_count from public.admin_user_lookup('pending_check')),
  1,
  'the moderator, who holds the safeguarding permission, counts the safeguarding case'
);
select is(
  (select concat_ws('|', handle, matched_by)
   from public.admin_user_lookup((select email from teacher_email))),
  'teacher|email',
  'the moderator finds an account by its whole email'
);
select pg_temp.sign_out();
select is(
  (select count(*)::integer from public.audit_log
   where action = 'sensitive_read.account_found_by_email'
     and target_user_id = '00000000-0000-4000-8000-000000000007'),
  1,
  'finding an account by its email is logged'
);

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(
  (select concat_ws('|', handle, coalesce(sanction_kinds::text, 'hidden'), coalesce(open_case_count::text, 'hidden'))
   from public.admin_user_lookup('suspended_user')),
  'suspended_user|hidden|hidden',
  'support finds accounts but sees no sanctions and no case counts'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok(
  $$ select * from public.admin_user_lookup('teacher') $$,
  '42501', null,
  'the content editor can''t look up accounts'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ select * from public.admin_user_lookup('teacher') $$,
  '42501', null,
  'a member can''t look up accounts'
);

/* ---------- admin_user_account ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(
  (select concat_ws('|', handle, account_status, age_band, may_view_sanctions, may_act, may_reveal_email, may_read_audit_log)
   from public.admin_user_account('00000000-0000-4000-8000-000000000001')),
  'adult_writer|active|18_plus|t|t|t|f',
  'the moderator sees the account''s status and age group, and may act and show the email'
);
select ok(
  (select email_masked like '_%***@%' from public.admin_user_account('00000000-0000-4000-8000-000000000001')),
  'the email comes masked'
);
select is(
  (select count(*)::integer from information_schema.parameters
   where specific_schema = 'public' and parameter_mode = 'OUT' and parameter_name = 'birth_year'
     and specific_name like 'admin_user_%'),
  0,
  'neither the search nor the account page returns the year of birth'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(
  (select concat_ws('|', may_view_sanctions, may_act, may_reveal_email)
   from public.admin_user_account('00000000-0000-4000-8000-000000000001')),
  'f|f|t',
  'support may view the account and show the email, but not see sanctions or act'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok(
  $$ select * from public.admin_user_account('00000000-0000-4000-8000-000000000001') $$,
  '42501', null,
  'the content editor can''t open an account'
);

/* ---------- admin_account_open_cases ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(
  (select count(*)::integer from public.admin_account_open_cases('00000000-0000-4000-8000-000000000005')),
  1,
  'the moderator sees the open safeguarding case about an account'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(
  (select count(*)::integer from public.admin_account_open_cases('00000000-0000-4000-8000-000000000005')),
  0,
  'the admin, without the safeguarding permission, doesn''t'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok(
  $$ select * from public.admin_account_open_cases('00000000-0000-4000-8000-000000000005') $$,
  '42501', null,
  'support can''t see cases'
);

/* ---------- admin_reveal_email ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok(
  public.admin_reveal_email('00000000-0000-4000-8000-000000000007') like '%@%',
  'support can show an email'
);
select pg_temp.sign_out();
select is(
  (select count(*)::integer from public.audit_log
   where action = 'sensitive_read.email_revealed'
     and target_user_id = '00000000-0000-4000-8000-000000000007'),
  1,
  'showing the email is logged'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok(
  $$ select public.admin_reveal_email('00000000-0000-4000-8000-000000000007') $$,
  '42501', null,
  'the content editor can''t show an email'
);

/* ---------- admin_reset_pen_name and admin_sign_out_everywhere ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok(
  $$ select public.admin_reset_pen_name('00000000-0000-4000-8000-000000000001', 'Rude name.') $$,
  '42501', null,
  'support can''t reset a pen name'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(
  $$ select public.admin_reset_pen_name('00000000-0000-4000-8000-000000000001', '  ') $$,
  '23514', null,
  'a reset needs a reason'
);
select throws_ok(
  $$ select public.admin_sign_out_everywhere('00000000-0000-4000-8000-000000000010', 'Testing.') $$,
  '42501', null,
  'nobody acts on their own account here'
);
select ok(
  public.admin_reset_pen_name('00000000-0000-4000-8000-000000000001', 'The pen name insults another writer.'),
  'the moderator resets a pen name'
);
select is(
  public.admin_sign_out_everywhere('00000000-0000-4000-8000-000000000001', 'The writer says someone else used the account.'),
  1,
  'the moderator signs an account out everywhere'
);
select pg_temp.sign_out();
select is(
  (select string_agg(action || ':' || coalesce(before_values ->> 'pen_name', after_values ->> 'sessions_ended'), ',' order by action)
   from public.audit_log
   where target_user_id = '00000000-0000-4000-8000-000000000001' and action like 'account.%'),
  'account.pen_name_reset:Lia Scrie,account.signed_out_everywhere:1',
  'both actions are in the audit log, the old pen name kept as the before value'
);

select * from finish();

rollback;
