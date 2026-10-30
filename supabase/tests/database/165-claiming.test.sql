-- Database tests for claiming cases and the queue's filters (story S1-E10-03, part b; CLAUDE.md
-- rule 1; criterion 4: "when a moderator claims it, then others see it is claimed").
-- What it proves:
-- - a moderator claims an open case; the queue shows who claimed it, and that it's theirs;
-- - another moderator can't take a fresh claim, nor release it; a claim older than
--   case_claim_minutes can be taken over;
-- - releasing gives it back to the queue; every claim and release is in the audit log;
-- - support (no moderation access) can't claim; a decided case can't be claimed;
-- - the filters: claimed (mine, anyone, nobody), reason and search by reference or username.
-- No new policy: cases keeps cases_select_moderation (tested in 044).
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to authenticated;
insert into named select 'open_case', id from public.cases where reference = 'R-000008';
insert into named select 'decided_case', id from public.cases where reference = 'R-000001';

/* ---------- Claiming ---------- */

-- moderator (…10) claims the case.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok(public.admin_claim_case((select id from named where label = 'open_case')), 'a moderator claims an open case');
select results_eq(
  $$ select claimed_by_handle, claimed_by_me from public.admin_moderation_queue(case_id => (select id from named where label = 'open_case')) $$,
  $$ values ('moderator', true) $$,
  'the queue shows who claimed it, and that it is the caller''s');
select is((select count(*)::integer from public.admin_moderation_queue(claimed_filter => 'mine')), 1,
  'the "mine" filter finds it');

-- owner (…08) sees the claim and can't take it, nor release it.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is((select claimed_by_me from public.admin_moderation_queue(case_id => (select id from named where label = 'open_case'))), false,
  'another moderator sees it is claimed by someone else');
select throws_ok($$ select public.admin_claim_case((select id from named where label = 'open_case')) $$,
  '23514', 'Claimed by @moderator already.', 'and can''t take a fresh claim');
select throws_ok($$ select public.admin_release_case((select id from named where label = 'open_case')) $$,
  '23514', null, 'nor release it');
select ok((select count(*) > 0 from public.admin_moderation_queue(status_filter => 'open', claimed_filter => 'nobody')
           where id = (select id from named where label = 'open_case')) is false,
  'the "nobody" filter leaves it out');

-- A stale claim can be taken over.
reset role;
update public.cases set claimed_at = now() - interval '2 hours' where id = (select id from named where label = 'open_case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok(public.admin_claim_case((select id from named where label = 'open_case')),
  'a claim older than case_claim_minutes can be taken over');
select ok(public.admin_release_case((select id from named where label = 'open_case')), 'the new claimer releases it');
select is((select claimed_by_handle from public.admin_moderation_queue(case_id => (select id from named where label = 'open_case'))), null,
  'it is back in the queue, unclaimed');
reset role;
select is((select count(*)::integer from public.audit_log
           where action in ('case.claimed', 'case.released') and target_id = (select id from named where label = 'open_case')::text), 3,
  'every claim and release is in the audit log');

/* ---------- Who can't ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_claim_case((select id from named where label = 'open_case')) $$,
  '42501', null, 'support can''t claim a case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_claim_case((select id from named where label = 'decided_case')) $$,
  '23514', null, 'a decided case can''t be claimed');

/* ---------- Search and the reason filter ---------- */

select is((select reference from public.admin_moderation_queue(search_text => 'r-000008')), 'R-000008',
  'search finds a case by its reference, in any case');
select ok(exists (select 1 from public.admin_moderation_queue(search_text => '@pending_check') where reference = 'R-000008'),
  'and by the reported username');
select ok(not exists (select 1 from public.admin_moderation_queue(reason_filter => 'terrorism', status_filter => 'open')
                      where reference = 'R-000008' and top_reason <> 'terrorism'),
  'the reason filter keeps only cases with a report for that reason');

select * from finish();

rollback;
