-- Database tests for the story archive of accounts closed for not being used (bundle ARCHIVE-1).
-- What it proves:
-- - when an unused account is deleted for good, its stories go to the archive first, with the
--   chapters and the Story Atlas, and with the scrambled email, year of birth, pen name and
--   username that recognise the writer later; an account its owner chose to delete is not archived;
-- - nobody reads the archive: not another member, not staff;
-- - a new account with the same confirmed email is told stories wait, and brings them back with
--   the year of birth and one of pen name, username or a story's title;
-- - the stories come back as private drafts with their chapters and Story Atlas, and leave the
--   archive; the day's word count is not touched;
-- - a wrong answer says "no match" and three of them lock the form for a day; another email
--   never matches, whatever the answers;
-- - the nightly job deletes an archive after its years, and only the jobs can run the internals.
-- Policies covered: story_archives_select_own, allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker,
  '00000000-0000-4000-8000-000000000005'::uuid as pending_check;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Calls claim_story_archive() as one person and returns the answer.
create function pg_temp.claim_as(user_id uuid, birth_year integer, known_name text) returns jsonb
language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.sign_in_as(user_id);
  set local role authenticated;
  answer := public.claim_story_archive(birth_year, known_name);
  reset role;
  return answer;
end;
$$;

/* ---------- The sleeper: blocker, with one story, two chapters and a Story Atlas ---------- */

update auth.users set email = 'sleeper@archive.test', email_confirmed_at = now()
where id = (select blocker from ids);
update public.profiles set pen_name = 'Ana Sleeper' where id = (select blocker from ids);
-- The sleeper's year of birth, as the seed set it (it can't be changed after sign-up).
create temp table sleeper as
select birth_year from public.profiles where id = (select blocker from ids);
create function pg_temp.sleeper_year() returns integer language sql as $$
  select birth_year from sleeper;
$$;
delete from public.stories where user_id = (select blocker from ids);

insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, visibility)
values ('00000000-0000-4000-9000-000000000371', (select blocker from ids), 'archive-test-story',
  'The House at the End of the Line', 'en',
  (select id from public.categories where slug = 'fiction'), 'all_ages', 'public');
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body,
  published_title, published_body, status, first_published_at, word_count)
values
  ('00000000-0000-4000-9000-000000003711', '00000000-0000-4000-9000-000000000371',
   (select blocker from ids), 'arch3711', 1, '', '', 'The start', 'Published words.', 'published', now(), 2),
  ('00000000-0000-4000-9000-000000003712', '00000000-0000-4000-9000-000000000371',
   (select blocker from ids), 'arch3712', 2, 'A draft', 'Draft words.', null, null, 'draft', null, 2);
insert into public.story_characters (id, story_id, user_id, name)
values ('00000000-0000-4000-9000-000000003713', '00000000-0000-4000-9000-000000000371',
  (select blocker from ids), 'Ilse');
insert into public.story_ideas (story_id, user_id, body)
values ('00000000-0000-4000-9000-000000000371', (select blocker from ids), 'What if the line never ends?');
update public.story_plans set logline = 'A line with no end.'
where story_id = '00000000-0000-4000-9000-000000000371';
update public.chapter_plans set summary = 'She arrives.', pov_character_id = '00000000-0000-4000-9000-000000003713'
where chapter_id = '00000000-0000-4000-9000-000000003711';

-- The teacher chose to delete their own account: never archived.
select pg_temp.sign_in_as((select teacher from ids));
select public.hide_closing_account((select teacher from ids));
insert into public.account_deletions (user_id, requested_at, delete_after, reason)
values ((select teacher from ids), now() - interval '15 days', now() - interval '1 minute', 'requested');

-- The sleeper's account closed for not being used, and its 14 days are up.
select public.close_unused_account((select blocker from ids));
-- Moved 15 days back as one moment: the closing time on the request and on the stories it hid.
update public.stories set deleted_at = now() - interval '15 days'
where user_id = (select blocker from ids) and deleted_at is not null;
update public.account_deletions
set requested_at = now() - interval '15 days', delete_after = now() - interval '1 minute'
where user_id = (select blocker from ids);

select ok(public.purge_closed_accounts() >= 2, 'the nightly job deletes both closed accounts');

/* ---------- What the archive holds ---------- */

select is((select count(*)::integer from public.story_archives where user_id = (select blocker from ids)), 1,
  'the unused account''s story is in the archive');
select is((select count(*)::integer from public.story_archives where user_id = (select teacher from ids)), 0,
  'an account its owner chose to delete is never archived');
select is(
  (select row(email_hash, birth_year, pen_name, handle, title)::text from public.story_archives
   where user_id = (select blocker from ids)),
  row(public.hash_email('sleeper@archive.test'), pg_temp.sleeper_year(), 'Ana Sleeper', 'blocker',
    'The House at the End of the Line')::text,
  'with the scrambled email, year of birth, pen name, username and title');
select is(
  (select jsonb_array_length(story -> 'chapters') + jsonb_array_length(story -> 'story_characters')
     + jsonb_array_length(story -> 'story_ideas') + jsonb_array_length(story -> 'chapter_plans')
   from public.story_archives where user_id = (select blocker from ids)),
  6, 'with its chapters, characters, ideas and chapter plans');
select ok(
  (select delete_after between now() + interval '5 years' - interval '1 day' and now() + interval '5 years' + interval '1 day'
   from public.story_archives where user_id = (select blocker from ids)),
  'to be deleted after 5 years');
select is((select count(*)::integer from public.stories where id = '00000000-0000-4000-9000-000000000371'), 0,
  'the story itself is gone with the account');
select ok((select email like '%@deleted.invalid' from auth.users where id = (select blocker from ids)),
  'and the closed account has no email left');
select ok(
  (select story::text not like '%sleeper@archive.test%' from public.story_archives
   where user_id = (select blocker from ids)),
  'the archive holds no email address');

/* ---------- Nobody reads it ---------- */

select pg_temp.sign_in_as((select blocker from ids));
set local role authenticated;
select is((select count(*)::integer from public.story_archives), 1,
  'allowed: story_archives_select_own: only the account the story belonged to');
reset role;
select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is((select count(*)::integer from public.story_archives), 0,
  'denied: story_archives_select_own: another member reads nothing');
reset role;
select pg_temp.sign_in_as((select owner from ids));
set local role authenticated;
select is((select count(*)::integer from public.story_archives), 0,
  'denied: story_archives_select_own: staff read nothing, the owner included');
reset role;
set local role anon;
select throws_ok('select count(*) from public.story_archives', '42501', null,
  'denied: a visitor can''t touch the table');
reset role;

/* ---------- The writer comes back with a new account ---------- */

-- adult_writer stands in for the new account: same email, confirmed.
update auth.users set email = 'sleeper@archive.test', email_confirmed_at = now()
where id = (select adult_writer from ids);
update auth.users set email = 'someone.else@archive.test', email_confirmed_at = now()
where id = (select pending_check from ids);

select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is(public.my_story_archive() ->> 'waiting', 'true', 'the same confirmed email is told stories wait');
select ok(public.my_story_archive() - 'waiting' - 'kept_until' - 'locked' = '{}'::jsonb,
  'and is told nothing about which or how many');
reset role;
select pg_temp.sign_in_as((select pending_check from ids));
set local role authenticated;
select is(public.my_story_archive(), '{"waiting": false}'::jsonb, 'another email is told nothing waits');
reset role;

-- Another email never matches, even with every answer right.
select is(pg_temp.claim_as((select pending_check from ids), pg_temp.sleeper_year(), 'Ana Sleeper') ->> 'outcome', 'no_match',
  'another email can''t bring the stories back, whatever the answers');

-- A wrong year, then a wrong name.
select is(pg_temp.claim_as((select adult_writer from ids), pg_temp.sleeper_year() + 1, 'Ana Sleeper'),
  '{"outcome": "no_match", "tries_left": 2}'::jsonb, 'a wrong year of birth is no match');
select is(pg_temp.claim_as((select adult_writer from ids), pg_temp.sleeper_year(), 'Somebody'),
  '{"outcome": "no_match", "tries_left": 1}'::jsonb, 'a wrong name is no match');
select is((select count(*)::integer from public.story_archives), 1, 'and nothing left the archive');

-- The right answers: the year and the story's title, in any capitals.
delete from public.writing_days where user_id = (select adult_writer from ids);
select is(pg_temp.claim_as((select adult_writer from ids), pg_temp.sleeper_year(), '  the house at the end of the line '),
  '{"outcome": "restored", "restored": 1, "not_restored": 0}'::jsonb,
  'the year of birth and a story''s title bring the stories back');
select is(
  (select row(user_id, visibility, deleted_at is null, first_published_at is null, slug)::text
   from public.stories where id = '00000000-0000-4000-9000-000000000371'),
  row((select adult_writer from ids), 'private', true, true, 'archive-test-story')::text,
  'the story belongs to the new account, private and never published');
select is(
  (select string_agg(status::text || ':' || draft_title || ':' || draft_body || ':' || (published_body is null)::text, ' | ' order by position)
   from public.chapters where story_id = '00000000-0000-4000-9000-000000000371'),
  'draft:The start:Published words.:true | draft:A draft:Draft words.:true',
  'its chapters are drafts, the published words kept as the draft');
select is(
  (select row(
     (select name from public.story_characters where story_id = stories.id),
     (select body from public.story_ideas where story_id = stories.id),
     (select logline from public.story_plans where story_id = stories.id),
     (select summary from public.chapter_plans where chapter_id = '00000000-0000-4000-9000-000000003711'),
     (select count(*) from public.story_plan_acts where story_id = stories.id),
     (select count(*) from public.story_bible_sections where story_id = stories.id))::text
   from public.stories where id = '00000000-0000-4000-9000-000000000371'),
  row('Ilse', 'What if the line never ends?', 'A line with no end.', 'She arrives.', 3, 7)::text,
  'the Story Atlas is back: character, idea, plan, chapter plan, acts and Story world sections');
select is(
  (select count(*)::integer from public.story_characters
   where story_id = '00000000-0000-4000-9000-000000000371' and user_id <> (select adult_writer from ids)),
  0, 'every restored row belongs to the new account');
select is((select count(*)::integer from public.story_archives), 0, 'and the story left the archive');
select is((select count(*)::integer from public.writing_days where user_id = (select adult_writer from ids)), 0,
  'bringing stories back doesn''t count as writing today');
select is((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
  (select adult_writer::text from ids), 'the caller is still the caller afterwards');

/* ---------- Three wrong tries lock the form ---------- */

select is(pg_temp.claim_as((select adult_writer from ids), pg_temp.sleeper_year(), 'Somebody') ->> 'outcome', 'no_match',
  'the third wrong try is still answered');
select is(pg_temp.claim_as((select adult_writer from ids), pg_temp.sleeper_year(), 'Ana Sleeper'), '{"outcome": "locked"}'::jsonb,
  'after three wrong tries the form is locked, even for a right answer');
update public.rate_limit_events set created_at = now() - interval '25 hours'
where user_id = (select adult_writer from ids) and action = 'story_archive_wrong_try';
select is(pg_temp.claim_as((select adult_writer from ids), pg_temp.sleeper_year(), 'Ana Sleeper') ->> 'outcome', 'no_match',
  'a day later it answers again (nothing is left to match)');

/* ---------- The end of an archive, and who may run what ---------- */

insert into public.story_archives (user_id, email_hash, handle, title, story, delete_after)
values ((select blocker from ids), 'x', 'blocker', 'Old', '{}'::jsonb, now() - interval '1 minute');
select is(public.purge_story_archives(), 1, 'the nightly job deletes an archive whose years are up');

select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select throws_ok(
  $$ select public.restore_story_archives_of('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a member can''t run the restore step directly');
select throws_ok($$ select public.archive_account_stories('00000000-0000-4000-8000-000000000005', now()) $$,
  '42501', null, 'nor archive someone''s stories');
reset role;

select * from finish();
rollback;
