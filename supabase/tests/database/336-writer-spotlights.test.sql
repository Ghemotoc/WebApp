-- Database tests for writer of the week (bundle GAPS-12e; board WritersHub).
-- What it proves:
-- - writer_spotlights_select_own: the picked writer reads their own invitation, another member
--   reads none;
-- - writer_spotlights_select_contest_staff: staff with the contests area read the picks, a
--   moderator (no contests area) reads none;
-- - only that staff invites and deletes, each in the audit log; an unknown username, a minor, a
--   suspended account, an empty line and a day already taken are refused;
-- - nothing shows on the hub until the writer agrees; agreeing shows it, declining takes it down
--   and the answer can be changed; nobody else can answer for the writer;
-- - the hub shows the pick only during its 7 days, never to a signed-out caller, never to
--   someone the writer blocked, and never the user ID;
-- - the table is in Download my data and goes with the account.
-- Personas: adult_writer (…01), teacher (…07), admin (…09), moderator (…10), suspended_user
-- (…13), blocker (…15, blocks …16), blocked (…16), teen_17 (…02). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or 'ok' when it runs.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
-- Pick IDs the test names later, kept where every role can read them.
create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept(wanted text) returns uuid language sql as $$
  select id from kept where label = wanted;
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The audit log is append-only, so the test counts from what was there before it.
create temporary table audit_before on commit drop as
  select pg_temp.audit_count('writer_spotlight.invited') as invited, pg_temp.audit_count('writer_spotlight.deleted') as deleted;
grant select on audit_before to authenticated;

/* ---------- 1. Who may invite, and whom ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('teacher', public.romania_today(), 'Motiv zq', 'Reason zq') $$),
  '42501', 'a member can''t pick the writer of the week');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('teacher', public.romania_today(), 'Motiv zq', 'Reason zq') $$),
  '42501', 'a moderator, who has no contests area, can''t either');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('nobody_zq_here', public.romania_today(), 'Motiv zq', 'Reason zq') $$),
  '23514', 'an unknown username is refused');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('teen_17', public.romania_today(), 'Motiv zq', 'Reason zq') $$),
  '23514', 'a 17-year-old is never picked');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('suspended_user', public.romania_today(), 'Motiv zq', 'Reason zq') $$),
  '23514', 'a suspended account is never picked');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('adult_writer', public.romania_today(), ' ', 'Reason zq') $$),
  '23514', 'a pick needs its line in both languages');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('adult_writer', null, 'Motiv zq', 'Reason zq') $$),
  '23514', 'a pick needs its first day');

insert into kept select 'this_week', public.admin_invite_writer_spotlight('@adult_writer', public.romania_today() - 6, ' Motiv zq ', ' Reason zq ');
select is(pg_temp.audit_count('writer_spotlight.invited') - (select invited from audit_before), 1, 'inviting a writer is in the audit log');
select is(pg_temp.refusal($$ select public.admin_invite_writer_spotlight('teacher', public.romania_today() - 6, 'Motiv zq', 'Reason zq') $$),
  '23505', 'two picks can''t start on the same day');

/* ---------- 2. Who reads the table ---------- */

select is((select count(*)::integer from public.writer_spotlights), 1,
  'allowed: writer_spotlights_select_contest_staff: staff with the contests area read the picks');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.writer_spotlights), 0,
  'denied: writer_spotlights_select_contest_staff: a moderator reads none');
select is(pg_temp.refusal($$ select * from public.admin_writer_spotlights() $$), '42501',
  'and can''t list them through the staff function');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select btrim(reason_en) from public.writer_spotlights), 'Reason zq',
  'allowed: writer_spotlights_select_own: the picked writer reads their own invitation, trimmed');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.writer_spotlights), 0,
  'denied: writer_spotlights_select_own: another member reads none');

/* ---------- 3. The writer's agreement comes first ---------- */

select is((select count(*)::integer from public.writers_hub_spotlight()), 0,
  'nothing shows on the hub before the writer agrees');
select is(pg_temp.refusal($$ select public.answer_writer_spotlight(pg_temp.kept('this_week'), true) $$), 'P0002',
  'another member can''t agree for the writer');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select answer from public.my_writer_spotlights()), 'waiting', 'the writer sees the invitation waiting');
select is(public.answer_writer_spotlight(pg_temp.kept('this_week'), true), 'agreed', 'the writer agrees');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select handle || '|' || display_name || '|' || reason_en || '|' || is_me from public.writers_hub_spotlight()),
  'adult_writer|Lia Scrie|Reason zq|false', 'once agreed, a member sees the writer on the last of the 7 days');
select ok(not exists (
    select 1 from public.writers_hub_spotlight() as shown
    where to_jsonb(shown)::text like '%00000000-0000-4000-8000-000000000001%'),
  'the card never carries the user ID');
select pg_temp.sign_out();
select is(pg_temp.refusal($$ select * from public.writers_hub_spotlight() $$), '42501', 'a signed-out caller is refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.answer_writer_spotlight(pg_temp.kept('this_week'), false), 'declined', 'the writer can change the answer');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.writers_hub_spotlight()), 0, 'declining takes the card down at once');

/* ---------- 4. The 7 days, blocks and deleting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_delete_writer_spotlight(pg_temp.kept('this_week'));
select is(pg_temp.audit_count('writer_spotlight.deleted') - (select deleted from audit_before), 1, 'deleting a pick is in the audit log');
insert into kept select 'ended', public.admin_invite_writer_spotlight('adult_writer', public.romania_today() - 7, 'Motiv zq', 'Reason zq');
insert into kept select 'blocker', public.admin_invite_writer_spotlight('blocker', public.romania_today(), 'Motiv zq', 'Reason zq');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.answer_writer_spotlight(pg_temp.kept('ended'), true) $$), 'P0002',
  'a pick whose 7 days ended can''t be answered');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.answer_writer_spotlight(pg_temp.kept('blocker'), true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select handle from public.writers_hub_spotlight()), 'blocker', 'a member sees this week''s pick');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is((select count(*)::integer from public.writers_hub_spotlight()), 0,
  'someone the writer blocked never sees the pick');

/* ---------- 5. Download my data and account deletion ---------- */

-- The two rule lists are internal, so the test reads them as the database owner.
reset role;

select is((select is_included from public.data_export_tables() where table_name = 'writer_spotlights'), true,
  'the picks are in Download my data');
select is((select action from public.account_deletion_rules() where table_name = 'writer_spotlights'), 'delete',
  'and they go with the account');

select * from finish();
rollback;
