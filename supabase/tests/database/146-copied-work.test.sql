-- Database tests for the "Copied from a published work" report (story S1-E10-08; CLAUDE.md rule 1).
-- What it proves:
-- - the source fields are all optional and go only with the reason copied_published_work;
-- - the passage the reader selected is stored with the report, and the case page reads the source
--   and the passage side by side;
-- - a moderator can ask the reporter for more details, the reporter reads and answers it once,
--   and the case page shows the answer;
-- - before a decision nothing public changes; the decision public_note puts the note on the story,
--   and it can't be used on a profile;
-- - policies: report_detail_requests_select_moderation (moderator allowed; support denied),
--   report_detail_requests_select_own (the reporter allowed; another member denied),
--   copied_work_notes_select_moderation (moderator allowed; support denied) and
--   copied_work_notes_select_own (the writer allowed; another member denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

-- The seed story of adult_writer (…01), reported by teen_17 (…02).
create temp table story as select '00000000-0000-4000-9000-000000000001'::uuid as id;
grant select on story to authenticated, anon;
-- It gets a published chapter, so readers can see and report it.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ((select id from story), '00000000-0000-4000-8000-000000000001', 'copieda1', 1, 'Unu',
  'x', 4, 'published', 'Unu', 'Drumul pleacă din Armadia.', 4, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
  where id = (select id from story);

/* ---------- 1. The report ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok(
  $$ select * from public.report_item('story', (select id::text from story), 'copied_published_work', null,
       jsonb_build_object('sourceTitle', repeat('x', 301))) $$,
  '23514', null, 'a source title over 300 characters is refused');
create temp table sent as
  select * from public.report_item('story', (select id::text from story), 'copied_published_work',
    'Chapter one is from a novel.',
    '{"sourceTitle": "Ion", "sourceAuthor": "Liviu Rebreanu", "sourcePassage": "Drumul pleacă din Armadia",
      "reportedPassage": "Drumul pleacă din Armadia"}'::jsonb);
grant select on sent to authenticated;
select matches((select report_reference from sent), '^R-\d{6}$', 'a copied-work report with a source is saved');

reset role;
select is((select copy_source_title || ' / ' || reported_passage from public.reports
           where reference = (select report_reference from sent)),
  'Ion / Drumul pleacă din Armadia', 'the source and the passage the reader selected are stored');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok(
  $$ select * from public.report_item('story', (select id::text from story), 'spam', null,
       '{"sourceTitle": "Ion"}'::jsonb) $$,
  'another reason may send source fields');
reset role;
select is((select count(*)::integer from public.reports
           where reason = 'spam' and item_id = (select id from story) and copy_source_title is not null),
  0, 'but they are dropped: only a copied-work report keeps them');
select throws_ok(
  $$ update public.reports set reported_passage = 'x' where reason = 'spam' and item_id = (select id from story) $$,
  '23514', null, 'and the table refuses them on any other reason');

/* ---------- 2. The case page ---------- */

create temp table the_case as select case_id as id from public.reports where reference = (select report_reference from sent);
grant select on the_case to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select copy_source_author || ' | ' || reported_passage from public.admin_case_reports((select id from the_case))
           where reference = (select report_reference from sent)),
  'Liviu Rebreanu | Drumul pleacă din Armadia', 'the case page reads the source and the passage side by side');

/* ---------- 3. Ask for more details ---------- */

select lives_ok(
  $$ select public.admin_request_report_details((select report_reference from sent), 'Which edition, and which page?') $$,
  'a moderator asks the reporter for more details');
select throws_ok(
  $$ select public.admin_request_report_details((select report_reference from sent), 'And another?') $$,
  '23514', null, 'one open question at a time');
select ok((select count(*) from public.report_detail_requests) = 1,
  'allowed: report_detail_requests_select_moderation, a moderator reads the question');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.report_detail_requests), 0,
  'denied: report_detail_requests_select_moderation, support reads no questions');
select throws_ok(
  $$ select public.admin_request_report_details((select report_reference from sent), 'Hi?') $$,
  '42501', null, 'and support can''t ask');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select question from public.my_report_detail_requests()), 'Which edition, and which page?',
  'allowed: report_detail_requests_select_own, the reporter reads the question about their report');
select lives_ok(
  $$ select public.answer_report_detail_request((select request_id from public.my_report_detail_requests()),
       'The 1920 edition, page 12.') $$,
  'and answers it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from public.report_detail_requests), 0,
  'denied: report_detail_requests_select_own, another member reads nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select detail_answer from public.admin_case_reports((select id from the_case))
           where reference = (select report_reference from sent)),
  'The 1920 edition, page 12.', 'the case page shows the answer');

/* ---------- 4. The decision and the public note ---------- */

select is(public.story_has_copied_work_note((select id from story)), false,
  'before a decision nothing public changes');
select public.admin_decide_case((select id from the_case), 'public_note', 'Chapter one copies Ion (1920), p. 12.');
select set_config('role', 'anon', true);
select is(public.story_has_copied_work_note((select id from story)), true,
  'after the decision public_note, anyone sees the story carries the note');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok((select count(*) from public.copied_work_notes) = 1,
  'allowed: copied_work_notes_select_moderation, a moderator reads the note');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok((select count(*) from public.copied_work_notes where story_id = (select id from story)) = 1,
  'allowed: copied_work_notes_select_own, the writer reads the note on their own story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.copied_work_notes), 0,
  'denied: copied_work_notes_select_moderation, support reads no notes');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.copied_work_notes), 0,
  'denied: copied_work_notes_select_own, another member reads no notes directly');

select * from finish();
rollback;
