-- Database tests for staff notes on accounts (bundle LOGS-1, part a; Robert, 6 Nov 2026).
-- What it proves:
-- - policy account_staff_notes_select_staff: allowed for staff with the Users area (moderator,
--   support), denied for a member, even about their own account, and for the content editor;
-- - admin_add_account_note(): staff with the Users area add a note, logged without its words;
--   a member and the content editor are refused; an empty note and an unknown account are refused;
-- - notes are append-only: nobody signed in may change or delete one;
-- - admin_account_notes(): newest first, with the author's username and the total count, paged;
-- - purge_old_account_staff_notes() deletes only notes older than 3 years.
-- Personas: adult_writer (…01, the account), moderator (…10), support (…11), editor (…12).
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to authenticated;

/* ---------- Adding a note ---------- */

-- A moderator (Users: act) leaves a note on adult_writer.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into named values ('first', public.admin_add_account_note(
  '00000000-0000-4000-8000-000000000001', '  Asked about a missing chapter; pointed them to support.  '));
select isnt((select id from named where label = 'first'), null, 'a moderator adds a note');

-- Support (Users: view) may too: anyone who may open the account.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
insert into named values ('second', public.admin_add_account_note(
  '00000000-0000-4000-8000-000000000001', 'Refund question answered by email.'));
select isnt((select id from named where label = 'second'), null, 'support adds a note');

-- The content editor has no Users area; a member has no staff role at all.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_add_account_note('00000000-0000-4000-8000-000000000001', 'Hi') $$,
  '42501', null, 'the content editor can''t add a note');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_add_account_note('00000000-0000-4000-8000-000000000001', 'Hi') $$,
  '42501', null, 'a member can''t add a note, even on their own account');

-- An empty note and an account that doesn't exist are refused with plain messages.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_add_account_note('00000000-0000-4000-8000-000000000001', '   ') $$,
  '23514', null, 'an empty note is refused');
select throws_ok($$ select public.admin_add_account_note('00000000-0000-4000-8000-0000000000ff', 'Hello') $$,
  'P0002', null, 'a note on an account that doesn''t exist is refused');

/* ---------- The audit row ---------- */

reset role;
select is(
  (select count(*)::integer from public.audit_log
   where action = 'account.note_added' and target_user_id = '00000000-0000-4000-8000-000000000001'),
  2, 'each note writes one audit row about the account');
select is(
  (select count(*)::integer from public.audit_log
   where action = 'account.note_added'
     and (coalesce(after_values::text, '') like '%missing chapter%' or coalesce(reason, '') like '%missing chapter%')),
  0, 'the audit row never holds the note''s words');
select is((select body from public.account_staff_notes where id = (select id from named where label = 'first')),
  'Asked about a missing chapter; pointed them to support.', 'the note is stored trimmed');

/* ---------- Reading: the policy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.account_staff_notes
           where user_id = '00000000-0000-4000-8000-000000000001'),
  2, 'allowed: account_staff_notes_select_staff (support reads the notes on an account)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.account_staff_notes), 0,
  'denied: account_staff_notes_select_staff (a member reads no notes, not even about their own account)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select is((select count(*)::integer from public.account_staff_notes), 0,
  'denied: account_staff_notes_select_staff (the content editor reads no notes)');

/* ---------- Append-only ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ update public.account_staff_notes set body = 'Changed' $$,
  '42501', null, 'nobody signed in can change a note');
select throws_ok($$ delete from public.account_staff_notes $$,
  '42501', null, 'nobody signed in can delete a note');

/* ---------- Reading: the page function ---------- */

-- Make the first note older, so the order is certain within one transaction.
reset role;
update public.account_staff_notes set created_at = now() - interval '1 hour'
where id = (select id from named where label = 'first');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select results_eq(
  $$ select body, author_handle, total_count from public.admin_account_notes('00000000-0000-4000-8000-000000000001', 1, 1) $$,
  $$ values ('Refund question answered by email.'::text, 'support'::text, 2::bigint) $$,
  'page 1 holds the newest note, its author and the total count');
select is((select body from public.admin_account_notes('00000000-0000-4000-8000-000000000001', 2, 1)),
  'Asked about a missing chapter; pointed them to support.', 'page 2 holds the older note');

/* ---------- Retention ---------- */

reset role;
update public.account_staff_notes set created_at = now() - interval '3 years 1 day'
where id = (select id from named where label = 'first');
select public.purge_old_account_staff_notes();
select results_eq(
  $$ select id from public.account_staff_notes where user_id = '00000000-0000-4000-8000-000000000001' $$,
  $$ select id from named where label = 'second' $$,
  'the purge deletes only notes older than 3 years');

select * from finish();
rollback;
