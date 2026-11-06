-- Database tests for appeals decided by the moderator who made the original decision (QA-7,
-- finding M1; DSA art. 20(6); story S1-E10-07).
-- What it proves:
-- - while someone else may decide appeals, the original decider still can't (unchanged);
-- - when nobody else may, the original decider decides it, the appeal is marked
--   decided_by_original_decider, the audit row says same_decider, and the queue shows it as
--   needing the owner's review;
-- - an appeal decided by someone else is not marked and needs no review;
-- - only an owner marks it reviewed (a moderator is refused), once, and that is logged.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid, reference text) on commit drop;
grant all on named to authenticated;

/* ---------- Two warnings by the moderator, both appealed ---------- */

-- moderator (…10) warns blocker (…15) twice; blocker appeals both.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into named (label, id) values
  ('first', public.admin_apply_sanction('00000000-0000-4000-8000-000000000015', 'warning',
     null, null, 'Spam in comments.', 'You posted the same link in many comments.')),
  ('second', public.admin_apply_sanction('00000000-0000-4000-8000-000000000015', 'warning',
     null, null, 'Spam again.', 'You posted the link again.'));
reset role;
update named set reference = (select statements_of_reasons.reference from public.statements_of_reasons
  where statements_of_reasons.sanction_id = named.id);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
insert into named (label, reference)
  select 'first_appeal', public.submit_appeal((select reference from named where label = 'first'), 'It was once.') ->> 'reference';
insert into named (label, reference)
  select 'second_appeal', public.submit_appeal((select reference from named where label = 'second'), 'Also once.') ->> 'reference';
reset role;
update named set id = (select appeals.id from public.appeals where appeals.reference = named.reference)
  where label in ('first_appeal', 'second_appeal');

/* ---------- Someone else could decide: the rule stands ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_decide_appeal((select id from named where label = 'first_appeal'), 'upheld', 'Mine', 'It stands.') $$,
  '42501', null, 'while someone else may decide, the original moderator can''t');

-- An admin decides the first appeal: a different person, so no mark.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok(public.admin_decide_appeal((select id from named where label = 'first_appeal'), 'upheld',
  'Checked the comments.', 'We looked again and the warning stands.'), 'an admin decides the first appeal');
reset role;
select is((select decided_by_original_decider from public.appeals where id = (select id from named where label = 'first_appeal')),
  false, 'decided by someone else: not marked');

/* ---------- Nobody else could decide: the original moderator does, marked ---------- */

-- For this test only (rolled back): the moderator is the only staff member who decides appeals.
delete from public.staff_roles where user_id in ('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000009');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select may_decide from public.admin_appeals_queue() where reference = (select reference from named where label = 'second_appeal')),
  true, 'with nobody else, the queue lets the original moderator decide');
select ok(public.admin_decide_appeal((select id from named where label = 'second_appeal'), 'upheld',
  'Nobody else can decide this yet.', 'We looked again and the warning stands.'),
  'the original moderator decides it');
reset role;
select is((select decided_by_original_decider from public.appeals where id = (select id from named where label = 'second_appeal')),
  true, 'the appeal is marked as decided by the original decider');
select is((select after_values ->> 'same_decider' from public.audit_log where action = 'appeal.decided'
           and target_id = (select id from named where label = 'second_appeal')::text), 'true',
  'the audit row says the same person decided');

-- The owner comes back to decide appeals.
insert into public.staff_roles (user_id, role) values ('00000000-0000-4000-8000-000000000008', 'owner');

/* ---------- The owner reviews it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select needs_owner_review::text || '/' || may_mark_reviewed::text from public.admin_appeals_queue()
           where reference = (select reference from named where label = 'second_appeal')), 'true/false',
  'a moderator sees it needs the owner''s review but can''t mark it');
select throws_ok($$ select public.admin_mark_appeal_reviewed((select id from named where label = 'second_appeal')) $$,
  '42501', null, 'denied: a moderator can''t mark it reviewed');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok(public.admin_mark_appeal_reviewed((select id from named where label = 'second_appeal')),
  'allowed: the owner marks it reviewed');
select throws_ok($$ select public.admin_mark_appeal_reviewed((select id from named where label = 'first_appeal')) $$,
  '23514', null, 'an appeal decided by someone else needs no review');
reset role;
select is((select count(*)::integer from public.audit_log where action = 'appeal.owner_reviewed'
           and target_id = (select id from named where label = 'second_appeal')::text), 1,
  'the review is in the audit log');

select * from finish();
rollback;
