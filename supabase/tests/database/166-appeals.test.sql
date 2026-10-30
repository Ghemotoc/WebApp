-- Database tests for appeals (story S1-E10-07; CLAUDE.md rule 1; DSA art. 20).
-- What it proves:
-- - the person appeals a decision on their own statement of reasons within six months, once at a
--   time (criterion 1); past six months, or someone else's statement, is refused;
-- - the moderator who made the decision can't decide the appeal while someone else can (criterion
--   2: a different moderator where possible);
-- - overturned: a sanction is lifted and a hidden item comes back; upheld: nothing changes; either
--   way the person gets a required appeal_decided notification and the statement shows the outcome;
-- - policies appeals_select_own and appeals_select_staff: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid, reference text) on commit drop;
grant all on named to authenticated;

/* ---------- A warning from the account page, appealed ---------- */

-- moderator (…10) warns blocker (…15).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into named (label, id) values ('warning', public.admin_apply_sanction('00000000-0000-4000-8000-000000000015', 'warning',
  null, null, 'Spam in comments.', 'You posted the same link in many comments.'));
reset role;
insert into named (label, id, reference)
  select 'warning_statement', id, reference from public.statements_of_reasons where sanction_id = (select id from named where label = 'warning');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(format($$ select public.submit_appeal(%L, 'Not mine') $$, (select reference from named where label = 'warning_statement')),
  'P0002', null, 'nobody can appeal someone else''s decision');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select throws_ok(format($$ select public.submit_appeal(%L, '   ') $$, (select reference from named where label = 'warning_statement')),
  '23514', null, 'an appeal needs an explanation');
insert into named (label, reference)
  select 'appeal', public.submit_appeal((select reference from named where label = 'warning_statement'),
    'I posted the link once, in reply to a question.') ->> 'reference';
select matches((select reference from named where label = 'appeal'), '^A-\d{6}$', 'the appeal gets a reference');
select throws_ok(format($$ select public.submit_appeal(%L, 'Again') $$, (select reference from named where label = 'warning_statement')),
  '23514', null, 'one open appeal per decision at a time');
select is((select count(*)::integer from public.appeals), 1,
  'allowed: appeals_select_own: the person reads their own appeal');
select is((select statement #>> '{appeal,status}' from jsonb_array_elements(public.my_statements()) as statement
           where statement ->> 'reference' = (select reference from named where label = 'warning_statement')), 'open',
  'their statement shows the appeal as open');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.appeals), 0, 'denied: appeals_select_own: another member reads nobody else''s appeals');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.appeals), 0, 'denied: appeals_select_staff: support doesn''t decide appeals, so reads none');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.appeals), 1, 'allowed: appeals_select_staff: an admin reads the appeal');

/* ---------- A different moderator decides (criterion 2) ---------- */

reset role;
update named set id = (select id from public.appeals where reference = named.reference) where label = 'appeal';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select may_decide from public.admin_appeals_queue() where reference = (select reference from named where label = 'appeal')), false,
  'the queue tells the original moderator they can''t decide it');
select throws_ok($$ select public.admin_decide_appeal((select id from named where label = 'appeal'), 'overturned', 'Mine', 'Sorry') $$,
  '42501', null, 'and the database refuses them');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_decide_appeal((select id from named where label = 'appeal'), 'overturned', 'Checked', '  ') $$,
  '23514', null, 'the person must be told the reasons (art. 20(5))');
select ok(public.admin_decide_appeal((select id from named where label = 'appeal'), 'overturned',
    'One link, in a reply; not spam.', 'We looked again: one link in a reply isn''t spam. The warning is gone.'),
  'an admin overturns it');
reset role;
select isnt((select lifted_at from public.sanctions where id = (select id from named where label = 'warning')), null,
  'overturning lifts the warning');
select results_eq(
  $$ select kind::text, is_required from public.notifications
     where user_id = '00000000-0000-4000-8000-000000000015' and appeal_id = (select id from named where label = 'appeal') $$,
  $$ values ('appeal_decided', true) $$,
  'the person gets a required appeal_decided notification');
select is((select public.notification_json(notifications) #>> '{appeal,outcome}' from public.notifications
           where appeal_id = (select id from named where label = 'appeal')), 'overturned',
  'which says the outcome');
select ok((select count(*) = 1 from public.audit_log where action = 'appeal.decided'), 'the decision is in the audit log');

/* ---------- A hidden item comes back ---------- */

insert into named (label, id) select 'case', id from public.cases where reference = 'R-000023';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok($$ select public.admin_decide_case((select id from named where label = 'case'), 'hide', 'Rude bio.', null,
  'Your profile was hidden for insults in the bio.') $$, 'a moderator hides adult_writer''s profile');
reset role;
insert into named (label, reference) select 'case_statement', reference from public.statements_of_reasons
  where case_id = (select id from named where label = 'case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named (label, reference) select 'case_appeal', public.submit_appeal((select reference from named where label = 'case_statement'),
  'The bio quotes a poem.') ->> 'reference';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok(public.admin_decide_appeal((select id from public.appeals where reference = (select reference from named where label = 'case_appeal')),
    'overturned', 'A quotation.', 'We looked again: the bio quotes a poem. Your profile is back.'),
  'the owner overturns it');
reset role;
select ok(not public.is_moderated_away('profile', '00000000-0000-4000-8000-000000000001'), 'the profile is visible again');

/* ---------- Six months ---------- */

update public.statements_of_reasons set appeal_until = now() - interval '1 day'
  where reference = (select reference from named where label = 'case_statement');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(format($$ select public.submit_appeal(%L, 'Late') $$, (select reference from named where label = 'case_statement')),
  '23514', null, 'after six months the decision can''t be appealed');

select * from finish();

rollback;
