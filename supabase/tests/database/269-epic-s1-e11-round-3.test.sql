-- Epic check for S1-E11, round three: landing pages and contests working with the stories before
-- them (story S1-E11-QA; stories S1-E11-14 and S1-E11-15 with S1-E10-04, S1-E10-07, S1-E8-12 and
-- S1-E11-01).
-- One journey in the database, with the personas the stories name:
-- - adult_writer enters a story in an open contest on a live landing page (S1-E11-15 × S1-E11-14);
-- - support and the content editor can't read the entries; an admin disqualifies the entry with
--   a statement of reasons (S1-E11-15 × S1-E10-04);
-- - the admin who decided can't decide the appeal; a moderator overturns it and the entry is valid
--   again (S1-E11-15 × S1-E10-07);
-- - after entries close the admin chooses a winner and a finalist, publishes, and the landing page
--   shows them by pen name to a signed-out visitor (S1-E11-15 × S1-E11-14);
-- - certificates go to both entries and check out on the public page; staff revoke one through
--   Schools, and issuing again never brings it back (S1-E11-15 × S1-E8-12);
-- - the writer's notifications hold the decision, the appeal's outcome and the certificate, and
--   the audit log names every staff step (S1-E11-01).
-- Personas: adult_writer (…01), teen_17 (…02), admin (…09), moderator (…10), support (…11),
-- editor (…12).
-- Test data: a live contest landing page, the contest and one published chapter of the seed story,
-- inserted directly; teen_17's entry is inserted directly as well; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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

-- What the journey keeps between steps: IDs, and texts such as the statement's reference.
create temporary table kept (label text primary key, id uuid, words text) on commit drop;
grant all on kept to authenticated, anon;

-- A live contest landing page and an open contest for teenagers and adults in Romania.
with page as (
  insert into public.landing_pages (slug, page_type) values ('concurs-epic', 'contest') returning id
), version as (
  insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
  select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Concursul epic", "intro": ""}, "en": {"title": "The epic contest", "intro": ""}}'::jsonb)),
    public.romania_today(), now()
  from page
  returning page_id
), contest as (
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select version.page_id, 'Concursul epic', 'The epic contest', public.romania_today() - 1,
    public.romania_today() + 5, public.romania_today() + 10, array['16_to_17', '18_plus'], array['RO'], array['ro'], now()
  from version
  returning id
)
insert into kept (label, id) select 'contest', contest.id from contest;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epice11c',
  1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 700, now());

/* ---------- 1. The writer enters (S1-E11-15 × S1-E11-14) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$,
  'adult_writer enters a story in the open contest');
reset role;
insert into kept (label, id)
select 'adult', id from public.contest_entries where contest_id = (select id from kept where label = 'contest');
insert into public.contest_entries (user_id, contest_id, story_id, status)
values ('00000000-0000-4000-8000-000000000002', (select id from kept where label = 'contest'),
  '00000000-0000-4000-9000-000000000003', 'valid');
insert into kept (label, id)
select 'teen', id from public.contest_entries
where contest_id = (select id from kept where label = 'contest') and user_id = '00000000-0000-4000-8000-000000000002';

/* ---------- 2. Who may judge, and a disqualification (S1-E11-15 × S1-E10-04) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_contest_entries((select id from kept where label = 'contest')) $$,
  '42501', null, 'support can''t read a contest''s entries');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_contest_entries((select id from kept where label = 'contest')) $$,
  '42501', null, 'nor can the content editor');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
update kept set words = public.admin_disqualify_contest_entry((select id from kept where label = 'adult'),
  'The story was posted elsewhere first.') where label = 'adult';
select matches((select words from kept where label = 'adult'), '^S-[0-9]{6}$',
  'an admin disqualifies the entry and the writer gets a statement of reasons');

/* ---------- 3. The appeal (S1-E11-15 × S1-E10-07) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.submit_appeal((select words from kept where label = 'adult'), 'It was only a draft there.') $$,
  'the writer appeals the disqualification');
reset role;
insert into kept (label, id)
select 'appeal', appeals.id from public.appeals
join public.statements_of_reasons as statements on statements.id = appeals.statement_id
where statements.reference = (select words from kept where label = 'adult');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_decide_appeal((select id from kept where label = 'appeal'), 'overturned',
    'My own call.', 'Back in.') $$,
  '42501', null, 'the admin who disqualified can''t decide the appeal');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_decide_appeal((select id from kept where label = 'appeal'), 'overturned',
  'Only a draft was public.', 'Your entry is back in the contest.');
reset role;
select is((select status::text from public.contest_entries where id = (select id from kept where label = 'adult')),
  'valid', 'a moderator overturns it and the entry is valid again');

/* ---------- 4. Results on the landing page (S1-E11-15 × S1-E11-14) ---------- */

update public.contests set entries_close_on = public.romania_today() - 1
where id = (select id from kept where label = 'contest');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'winner');
select public.admin_set_contest_placing((select id from kept where label = 'teen'), 'finalist');
select lives_ok($$ select public.admin_publish_contest_results((select id from kept where label = 'contest')) $$,
  'the admin chooses a winner and a finalist and publishes the results');

reset role;
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(
  (select array_agg(results.item ->> 'placing' order by results.position)
   from jsonb_array_elements(public.landing_page('concurs-epic') -> 'results') with ordinality as results (item, position)),
  array['winner', 'finalist'],
  'a signed-out visitor sees the winner, then the finalist, on the landing page');
select ok(
  (public.landing_page('concurs-epic') -> 'results')::text not like '%00000000-0000-4000-8000%',
  'the landing page never shows a user ID');

/* ---------- 5. Certificates (S1-E11-15 × S1-E8-12) ---------- */

reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_issue_contest_certificates((select id from kept where label = 'contest')) ->> 'issued', '2',
  'certificates go to the winner and the finalist');
reset role;
update kept set words = (select code from public.certificates
                         where contest_id = (select id from kept where label = 'contest')
                           and user_id = '00000000-0000-4000-8000-000000000001')
where label = 'contest';
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(public.verify_certificate((select words from kept where label = 'contest')) ->> 'status', 'valid',
  'the winner''s certificate checks out on the public page');

reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_revoke_certificate((select words from kept where label = 'contest'), 'Issued for the wrong story.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'finalist');
select is(public.admin_issue_contest_certificates((select id from kept where label = 'contest')) ->> 'issued', '0',
  'issuing again never touches a revoked certificate');
reset role;
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(public.verify_certificate((select words from kept where label = 'contest')) ->> 'status', 'revoked',
  'staff revoke it through Schools and the check page says so');

/* ---------- 6. What the writer was told, and what the log keeps (S1-E11-01) ---------- */

reset role;
select is(
  (select array_agg(distinct kind::text order by kind::text) from public.notifications
   where user_id = '00000000-0000-4000-8000-000000000001'
     and kind in ('moderation_decision', 'appeal_decided', 'certificate_issued')
     and created_at >= (select min(created_at) from public.contest_entries
                        where contest_id = (select id from kept where label = 'contest'))),
  array['appeal_decided', 'certificate_issued', 'moderation_decision'],
  'the writer was told of the decision, the appeal''s outcome and the certificate');
select is(
  (select count(distinct action)::int from public.audit_log
   where action in ('contest.entry_disqualified', 'contest.placing_set', 'contest.results_published',
                    'contest.certificates_issued')
     and (target_id = (select id::text from kept where label = 'contest')
          or target_id in (select id::text from kept where label in ('adult', 'teen')))),
  4, 'the audit log names the disqualification, the placings, the publishing and the certificates');
select ok(exists (select 1 from public.audit_log where action = 'certificate.revoked'
                  and user_id = '00000000-0000-4000-8000-000000000010'
                  and target_user_id = '00000000-0000-4000-8000-000000000001'),
  'and the moderator''s revoke, against the writer''s account');

select * from finish();
rollback;
