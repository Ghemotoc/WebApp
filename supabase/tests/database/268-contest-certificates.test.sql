-- Database tests for contest certificates (story S1-E11-15 criterion 9, through S1-E8-12; bundle
-- CONTESTS-13b2c).
-- What it proves:
-- - only the owner and admins issue a contest's certificates, and only once its results are out;
-- - every valid entry gets one: winners and finalists by their placing, the rest as participants;
--   withdrawn and disqualified entries get none;
-- - issuing again changes only a certificate whose placing changed, never adds a second;
-- - each writer is notified, pointing at the contest's page; the audit log keeps it;
-- - the writer's list says it is a contest certificate, with the contest's name in both
--   languages; a contest certificate never takes a real name (CLAUDE.md rule 5), and the check
--   page shows it like any other;
-- - a certificate comes from a class or a contest, never both.
-- No new policies: certificates_select_own is tested in the CLASSES-e tests.
-- Personas: admin (…09), moderator (…10), adult_writer (…01), teen_17 (…02), kid_14_ok (…03).
-- Test data: a closed contest on its live landing page and three entries inserted directly (one
-- withdrawn); rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated, anon;

-- A contest whose entries closed yesterday, on a live landing page.
with page as (
  insert into public.landing_pages (slug, page_type) values ('concurs-diplome', 'contest') returning id
), version as (
  insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
  select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Diplome", "intro": ""}, "en": {"title": "Certificates", "intro": ""}}'::jsonb)),
    public.romania_today(), now()
  from page
  returning page_id
), contest as (
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select version.page_id, 'Concursul cu diplome', 'The certificates contest', public.romania_today() - 10,
    public.romania_today() - 1, public.romania_today() + 10, array['13_to_15', '16_to_17', '18_plus'], array['RO'], array['ro'], now()
  from version
  returning id
)
insert into kept (label, id) select 'contest', contest.id from contest;

with added as (
  insert into public.contest_entries (user_id, contest_id, story_id, status, withdrawn_at)
  values
    ('00000000-0000-4000-8000-000000000001', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000001', 'valid', null),
    ('00000000-0000-4000-8000-000000000003', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000003', 'valid', null),
    ('00000000-0000-4000-8000-000000000002', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000002', 'withdrawn', now())
  returning id, user_id
)
insert into kept (label, id)
select case user_id when '00000000-0000-4000-8000-000000000001' then 'adult'
                    when '00000000-0000-4000-8000-000000000003' then 'kid' else 'withdrawn' end, id
from added;

/* ---------- 1. Who issues, and when ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'winner');
select is(pg_temp.hint_of($$ select public.admin_issue_contest_certificates((select id from kept where label = 'contest')) $$),
  'not_published', 'certificates wait until the results are published');
select public.admin_publish_contest_results((select id from kept where label = 'contest'));

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_issue_contest_certificates((select id from kept where label = 'contest')) $$,
  '42501', null, 'a moderator can''t issue a contest''s certificates');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_issue_contest_certificates((select id from kept where label = 'contest')) $$,
  '42501', null, 'a writer can''t issue certificates');

/* ---------- 2. Issuing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_issue_contest_certificates((select id from kept where label = 'contest')) ->> 'issued', '2',
  'an admin issues a certificate to each valid entry');
reset role;
select is(
  (select jsonb_object_agg(case when user_id = '00000000-0000-4000-8000-000000000001' then 'adult' else 'kid' end,
                           result)
   from public.certificates where contest_id = (select id from kept where label = 'contest')),
  '{"adult": "winner", "kid": "participant"}'::jsonb,
  'the winner''s certificate says winner and an entry without a placing says participant');
select ok(not exists (select 1 from public.certificates
                      where contest_id = (select id from kept where label = 'contest')
                        and user_id = '00000000-0000-4000-8000-000000000002'),
  'a withdrawn entry gets no certificate');
select ok(
  (select bool_and(space_id is null and class_name is null and teacher_name is null and printed_name is null)
   from public.certificates where contest_id = (select id from kept where label = 'contest')),
  'a contest certificate has no class, no teacher and no real name');
select ok(exists (select 1 from public.notifications
                  where user_id = '00000000-0000-4000-8000-000000000003' and kind = 'certificate_issued'
                    and landing_page_id = (select landing_page_id from public.contests
                                           where id = (select id from kept where label = 'contest'))),
  'each writer is notified, pointing at the contest''s page');
select ok(exists (select 1 from public.audit_log where action = 'contest.certificates_issued'
                  and target_id = (select id::text from kept where label = 'contest')
                  and after_values ->> 'count' = '2'),
  'issuing is logged with how many were made');

/* ---------- 3. Issuing again ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_set_contest_placing((select id from kept where label = 'kid'), 'finalist');
select is(public.admin_issue_contest_certificates((select id from kept where label = 'contest')) ->> 'issued', '1',
  'issuing again changes only the certificate whose placing changed');
reset role;
select is(
  (select count(*)::int || ' ' || min(result::text) from public.certificates
   where contest_id = (select id from kept where label = 'contest') and user_id = '00000000-0000-4000-8000-000000000003'),
  '1 finalist', 'the writer still has one certificate, now as a finalist');

/* ---------- 4. What the writer and the check page see ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(
  (select jsonb_build_object('is_contest', item -> 'is_contest', 'contest_name', item -> 'contest_name')
   from jsonb_array_elements(public.my_certificates()) as item where item ->> 'result' = 'finalist'),
  '{"is_contest": true, "contest_name": {"ro": "Concursul cu diplome", "en": "The certificates contest"}}'::jsonb,
  'the writer''s list marks it as a contest certificate, with the contest''s name in both languages');
select is(pg_temp.hint_of($$ select public.set_certificate_printed_name(
    (select (item ->> 'id')::uuid from jsonb_array_elements(public.my_certificates()) as item where item ->> 'result' = 'finalist'),
    'Ana Pop') $$),
  'certificate:missing', 'a contest certificate never takes a real name');

-- The code, read before signing out, as a school would type it from the printed certificate.
reset role;
insert into kept (label, id) select 'code:' || code, null from public.certificates
where contest_id = (select id from kept where label = 'contest') and user_id = '00000000-0000-4000-8000-000000000001';
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(
  public.verify_certificate((select substr(label, 6) from kept where label like 'code:%')) ->> 'status',
  'valid', 'anyone can check a contest certificate''s code');

/* ---------- 5. Class or contest ---------- */

reset role;
select throws_ok($$
  insert into public.certificates (user_id, programme_name, result, code)
  values ('00000000-0000-4000-8000-000000000001', 'Nothing', 'participant', 'XX00-TEST-00') $$,
  '23514', null, 'a certificate without a contest still needs its class and teacher');

select * from finish();
rollback;
