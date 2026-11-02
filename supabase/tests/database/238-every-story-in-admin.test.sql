-- Database tests for every story in the admin site (bundle ADMIN-2, part a; story S1-E11-07).
-- What it proves:
-- - owner, admin, moderator and support list every story; the content editor, a member and a
--   signed-out visitor are refused (architecture 1.8.3);
-- - the search finds a story by title, by the writer's current or earlier username, or by user ID
--   (criterion 1);
-- - each filter narrows the list: status, category, language, rating, where it can be read, open
--   reports and writers under 18 (criterion 2);
-- - a row never carries a year of birth, an email or chapter text (criterion 3);
-- - a story its writer deleted leaves the list, but staff can still open it;
-- - the overview shows the chapter list and whether the caller may change the story (part b).
-- Personas: adult_writer (…01), teen_17 (…02), owner (…08), moderator (…10), support (…11),
-- editor (…12). Seed stories: …9000…01 and …02 by adult_writer, …03 by teen_17. Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- How many stories a search with these arguments finds.
create function pg_temp.found(
  search_text text default '', story_status text default null, category_slug text default null,
  language_code text default null, wanted_rating public.story_rating default null,
  only_open_reports boolean default false, only_minor_writers boolean default false,
  readable_by text default null
) returns integer language sql as $$
  select (public.admin_search_stories(search_text, story_status, category_slug, language_code,
            wanted_rating, only_open_reports, only_minor_writers, readable_by, 0) ->> 'total')::integer;
$$;
-- The list row for one seed story, as the signed-in caller sees it.
create function pg_temp.row_of(story_id uuid) returns jsonb language sql as $$
  select story from jsonb_array_elements(public.admin_search_stories('') -> 'stories') as story
  where (story ->> 'id')::uuid = story_id;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Test data, written as postgres: an earlier username for adult_writer (the audit log is how
-- staff find old work, architecture 1.6), an open report on teen_17's story and a hidden story.
insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, before_values, after_values)
values ('00000000-0000-4000-8000-000000000001', 'profile.handle_changed', 'profiles',
        '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
        '{"handle": "old_quill"}', '{"handle": "adult_writer"}');
insert into public.reports (user_id, item_type, item_id, reported_user_id, reason, reporter_age_band, reference)
values ('00000000-0000-4000-8000-000000000001', 'story', '00000000-0000-4000-9000-000000000003',
        '00000000-0000-4000-8000-000000000002', 'spam', '18_plus', 'R-TEST-238');
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'story', '00000000-0000-4000-9000-000000000002',
        'hidden', '00000000-0000-4000-8000-000000000010', 'Test hide');

-- Who may list stories.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(pg_temp.found(), 3, 'support staff list every story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.found(), 3, 'a moderator lists every story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(pg_temp.found(), 3, 'the owner lists every story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_search_stories('') $$, '42501', null,
  'the content editor has no Stories area and is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_search_stories('') $$, '42501', null,
  'a member who isn''t staff is refused');
select pg_temp.sign_out();
select throws_ok($$ select public.admin_search_stories('') $$, '42501', null,
  'a signed-out visitor can''t call the list at all');

-- Searching (support staff from here on).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(pg_temp.found('radios'), 1, 'part of a title finds the story');
select is(pg_temp.found('@teen'), 1, 'the start of the writer''s username finds their story');
select is(pg_temp.found('old_q'), 2, 'an earlier username finds the writer''s stories');
select is(pg_temp.found('00000000-0000-4000-8000-000000000002'), 1, 'the writer''s user ID finds their story');
select is(pg_temp.found('nothing like this'), 0, 'a search that matches nothing finds nothing');

-- Filters.
select is(pg_temp.found(story_status => 'hidden'), 1, 'the status filter finds the hidden story');
select is(pg_temp.found(story_status => 'draft'), 2, 'the status filter finds the drafts');
select is(pg_temp.found(category_slug => 'poetry'), 1, 'the category filter narrows the list');
select is(pg_temp.found(language_code => 'en'), 1, 'the language filter narrows the list');
select is(pg_temp.found(wanted_rating => '13_plus'), 1, 'the rating filter narrows the list');
select is(pg_temp.found(readable_by => 'everyone'), 3, '"Where it can be read: everyone" keeps public stories');
select is(pg_temp.found(readable_by => 'class'), 0, '"Where it can be read: one class" leaves public stories out');
select is(pg_temp.found(only_open_reports => true), 1, '"Open reports" keeps only the reported story');
select is(pg_temp.found(only_minor_writers => true), 1, '"Writers under 18" keeps only teen_17''s story');

-- What a row says, and what it never says.
select is(pg_temp.row_of('00000000-0000-4000-9000-000000000003') -> 'reports' ->> 'open', '1',
  'a row counts the story''s open reports');
select is(pg_temp.row_of('00000000-0000-4000-9000-000000000003') ->> 'owner_is_minor', 'true',
  'a row says the writer is under 18, as yes or no');
select is(pg_temp.row_of('00000000-0000-4000-9000-000000000002') ->> 'status', 'hidden',
  'a row shows a moderator''s hide as the status');
select ok(not (pg_temp.row_of('00000000-0000-4000-9000-000000000003')
               ?| array['birth_year', 'birth_month', 'email', 'body', 'content', 'text']),
  'a row never carries a year of birth, an email or chapter text');
select is((public.admin_search_stories('', page_number => 1) -> 'stories'), '[]'::jsonb,
  'the second page is empty while there are fewer than 50 stories');

-- One story's overview.
select is(jsonb_typeof(public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'chapters'),
  'array', 'support staff open a story and see its chapter list');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') ->> 'can_change', 'false',
  'support staff can''t change a story');
select throws_ok($$ select public.admin_story_overview('00000000-0000-4000-9000-0000000000ff') $$,
  '23514', null, 'a story that doesn''t exist is refused plainly');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') ->> 'can_change', 'true',
  'a moderator may change a story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_story_overview('00000000-0000-4000-9000-000000000001') $$,
  '42501', null, 'the content editor can''t open a story');

-- A story its writer deleted leaves the list but still opens for staff.
select pg_temp.as_postgres();
update public.stories set deleted_at = now() where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(pg_temp.found(), 2, 'a deleted story leaves the list');
select isnt(public.admin_story_overview('00000000-0000-4000-9000-000000000001') ->> 'deleted_at', null,
  'staff can still open a deleted story, marked as deleted');

select * from finish();
rollback;
