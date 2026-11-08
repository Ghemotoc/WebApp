-- Database tests for an upheld moderation case restricting a story (QA-9; Robert, 8 Nov 2026:
-- "A moderation case that is upheld can restrict a story"; CLAUDE.md rule 1).
-- What it proves:
-- - support can't decide the case (insufficient_privilege), a moderator can;
-- - deciding "restrict" adds a live story_restrictions row with the case note as its reason, so
--   is_story_restricted() is true, and the statement of reasons says "restrict";
-- - "restrict" is refused on a case about anything but a story, on a story that is already
--   restricted and on a story a moderator hid;
-- - an appeal that overturns the decision lifts the restriction.
-- No table, policy or grant changed, so there is no new policy to test here.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid, reference text) on commit drop;
grant all on named to authenticated;

-- The seed story of adult_writer (…01) gets a published chapter, so readers can see and report it.
insert into named (label, id) values ('story', '00000000-0000-4000-9000-000000000001');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ((select id from named where label = 'story'), '00000000-0000-4000-8000-000000000001', 'restrct1', 1,
  'Unu', 'x', 4, 'published', 'Unu', 'Drumul pleacă din Armadia.', 4, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
  where id = (select id from named where label = 'story');

-- teen_17 (…02) reports the story, which opens a case about it.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
insert into named (label, reference)
  select 'report', report_reference from public.report_item('story',
    '00000000-0000-4000-9000-000000000001', 'spam', 'The same story is posted again and again.');
reset role;
insert into named (label, id)
  select 'case', case_id from public.reports where reference = (select reference from named where label = 'report');

/* ---------- 1. Who may decide ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok(
  $$ select public.admin_decide_case((select id from named where label = 'case'), 'restrict', 'Spam.', null, 'Spam.') $$,
  '42501', null, 'support can''t restrict a story through a case');

/* ---------- 2. The moderator restricts the story ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok(
  $$ select public.admin_decide_case((select id from named where label = 'case'), 'restrict',
       'Reposted many times to fill the lists.', null,
       'Your story is left out of lists because it was posted many times. It still opens from a link.') $$,
  'a moderator decides the case with "restrict"');
reset role;
select ok(public.is_story_restricted((select id from named where label = 'story')),
  'the story is restricted, so it leaves every list');
select is((select reason || ' / ' || restricted_by_user_id::text from public.story_restrictions
           where story_id = (select id from named where label = 'story') and lifted_at is null),
  'Reposted many times to fill the lists. / 00000000-0000-4000-8000-000000000010',
  'the case note is the restriction''s reason, and the moderator is who restricted it');
select is((select action::text from public.statements_of_reasons where case_id = (select id from named where label = 'case')),
  'restrict', 'the writer gets a statement of reasons that says "restrict" (DSA art. 17)');
select is((select status::text || ' / ' || decision::text from public.cases where id = (select id from named where label = 'case')),
  'decided / restrict', 'the case is decided with "restrict"');

/* ---------- 3. The refusals ---------- */

-- blocker (…15) reports the same story again, which opens a new case about it.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
insert into named (label, reference)
  select 'second_report', report_reference from public.report_item('story',
    '00000000-0000-4000-9000-000000000001', 'spam', 'Still reposted.');
reset role;
insert into named (label, id)
  select 'second_case', id from public.cases
  where item_type = 'story' and item_id = (select id from named where label = 'story') and status = 'open';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(
  $$ select public.admin_decide_case((select id from named where label = 'second_case'), 'restrict', 'Again.', null, 'Again.') $$,
  '23514', 'This story is already restricted.', 'a story that is already restricted can''t be restricted again');

-- A seeded case about adult_writer's profile.
select throws_ok(
  $$ select public.admin_decide_case((select id from public.cases where reference = 'R-000023'), 'restrict', 'No.', null, 'No.') $$,
  '23514', 'Only a story can be restricted.', 'a case about a profile can''t restrict anything');

/* ---------- 4. An overturned appeal lifts the restriction ---------- */

reset role;
insert into named (label, reference)
  select 'statement', reference from public.statements_of_reasons where case_id = (select id from named where label = 'case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named (label, reference)
  select 'appeal', public.submit_appeal((select reference from named where label = 'statement'),
    'I posted it once; the others are chapters.') ->> 'reference';
-- The owner (…08) decides, because the moderator who decided the case shouldn't (S1-E10-07).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok(public.admin_decide_appeal((select id from public.appeals where reference = (select reference from named where label = 'appeal')),
    'overturned', 'Chapters, not reposts.', 'We looked again: those were chapters. Your story is back in the lists.'),
  'the owner overturns the decision');
reset role;
select ok(not public.is_story_restricted((select id from named where label = 'story')),
  'overturning lifts the restriction');
select is((select lifted_by_user_id::text from public.story_restrictions where story_id = (select id from named where label = 'story')),
  '00000000-0000-4000-8000-000000000008', 'and records who lifted it');

/* ---------- 5. A hidden story can't be restricted ---------- */

-- The moderator hides the story on the second case; restricting it after that would change
-- nothing a reader sees.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok(
  $$ select public.admin_decide_case((select id from named where label = 'second_case'), 'hide', 'Hidden after all.', null,
       'Your story is hidden.') $$,
  'the moderator hides the story on the second case');
reset role;
select throws_ok(
  $$ select public.require_story_restrictable_by_case(cases) from public.cases where id = (select id from named where label = 'second_case') $$,
  '23514', 'This story is hidden or removed, so it can''t be restricted.', 'a hidden story can''t be restricted');

select * from finish();

rollback;
