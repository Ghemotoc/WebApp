-- Database tests for calls for submissions (bundle GAPS-12d; board WritersHub).
-- What it proves:
-- - submission_calls_select_contest_staff: staff with the contests area read the calls; a member
--   and a moderator (no contests area) read none;
-- - only that staff adds, changes and deletes calls, and each change is in the audit log; an
--   empty title, a link that isn't https, a link with a script in it and a missing day are refused;
-- - writers_hub_calls() lists the calls still open (the last day included), soonest closing
--   first, never a closed or deleted one, and refuses a signed-out caller;
-- - a paid call shows to an adult and never to a 17-year-old.
-- Personas: adult_writer (…01), teen_17 (…02), admin (…09), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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
-- Call IDs the test names later, kept where every role can read them.
create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept(wanted text) returns uuid language sql as $$
  select id from kept where label = wanted;
$$;
-- A call as JSON: a title, a link, how many days until it closes and whether it pays.
create function pg_temp.call(title text, link text, days_left integer, paid boolean) returns jsonb language sql as $$
  select jsonb_build_object('title_ro', title, 'title_en', title, 'details_ro', 'Proză scurtă, până la 3.000 de cuvinte.',
    'details_en', 'Short fiction, up to 3,000 words.', 'link_url', link,
    'closes_on', public.romania_today() + days_left, 'is_paid', paid);
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Who may write calls ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call('Apel zq', 'https://example.org/apel', 5, false)) $$),
  '42501', 'a member can''t add a call for submissions');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call('Apel zq', 'https://example.org/apel', 5, false)) $$),
  '42501', 'a moderator, who has no contests area, can''t either');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call(' ', 'https://example.org/apel', 5, false)) $$),
  '23514', 'a call needs a title');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call('Apel zq', 'http://example.org/apel', 5, false)) $$),
  '23514', 'the link must be https');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call('Apel zq', 'javascript:alert(1)', 5, false)) $$),
  '23514', 'a script is not a link');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call('Apel zq', 'https://example.org/"><script>', 5, false)) $$),
  '23514', 'and a link can''t carry quotes or tags');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(null, pg_temp.call('Apel zq', 'https://example.org/apel', 5, false) - 'closes_on') $$),
  '23514', 'a call needs its last day');

-- Four calls: closing in 20 days, closing today (paid), closed yesterday, and one to delete.
insert into kept select 'later', public.admin_save_submission_call(null, pg_temp.call('Antologie zq', 'https://example.org/antologie', 20, false));
insert into kept select 'today_paid', public.admin_save_submission_call(null, pg_temp.call('Revistă zq', 'https://example.org/revista', 0, true));
insert into kept select 'closed', public.admin_save_submission_call(null, pg_temp.call('Încheiat zq', 'https://example.org/vechi', -1, false));
insert into kept select 'gone', public.admin_save_submission_call(null, pg_temp.call('Șters zq', 'https://example.org/sters', 3, false));
select is(pg_temp.audit_count('submission_call.saved'), 4, 'each added call is in the audit log');
select public.admin_save_submission_call(pg_temp.kept('later'), pg_temp.call('Antologie de iarnă zq', 'https://example.org/antologie', 20, false));
select is(pg_temp.audit_count('submission_call.saved'), 5, 'a change is logged too');
select is(pg_temp.refusal($$ select public.admin_save_submission_call(gen_random_uuid(), pg_temp.call('Apel zq', 'https://example.org/apel', 5, false)) $$),
  'P0002', 'an unknown call can''t be changed');

/* ---------- 2. Who reads the table ---------- */

select is((select count(*)::integer from public.submission_calls where id in (select id from kept)), 4,
  'allowed: submission_calls_select_contest_staff lets an admin read every call, the closed one included');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.submission_calls), 0,
  'denied: submission_calls_select_contest_staff shows a member nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.submission_calls), 0,
  'denied: submission_calls_select_contest_staff shows a moderator nothing');

/* ---------- 3. Deleting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal(format($$ select public.admin_delete_submission_call(%L) $$, pg_temp.kept('gone'))),
  '42501', 'a member can''t delete a call');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_delete_submission_call(pg_temp.kept('gone'));
select is(pg_temp.audit_count('submission_call.deleted'), 1, 'an admin deletes one, and it is logged');
select is(pg_temp.refusal(format($$ select public.admin_delete_submission_call(%L) $$, pg_temp.kept('gone'))),
  'P0002', 'a deleted call can''t be deleted again');

/* ---------- 4. The hub's list ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select * from public.writers_hub_calls() $$), '42501',
  'a visitor who isn''t logged in gets no calls');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select array_agg(call_id order by closes_on) from public.writers_hub_calls() where call_id in (select id from kept)),
  array[pg_temp.kept('today_paid'), pg_temp.kept('later')],
  'an adult gets the open calls, soonest closing first: the last day counts, a closed or deleted call doesn''t');
select is((select row(title_en, link_url, is_paid)::text from public.writers_hub_calls() where call_id = pg_temp.kept('later')),
  row('Antologie de iarnă zq', 'https://example.org/antologie', false)::text,
  'each call carries its title, the organiser''s page and whether it pays');
select is((select is_paid from public.writers_hub_calls() where call_id = pg_temp.kept('today_paid')), true,
  'an adult sees the paid call');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select array_agg(call_id) from public.writers_hub_calls() where call_id in (select id from kept)),
  array[pg_temp.kept('later')], 'a 17-year-old gets the unpaid call');
select is((select count(*)::integer from public.writers_hub_calls() where is_paid), 0,
  'and never a paid one');

select * from finish();
rollback;
