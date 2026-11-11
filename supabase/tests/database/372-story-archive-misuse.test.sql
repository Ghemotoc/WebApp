-- Break test for the story archive (bundle ARCHIVE-1): what a member, a visitor and a switched-off
-- archive must not be able to do.
-- What it proves:
-- - nobody can write, change or delete an archive row from the Data API, the closed account included;
-- - a visitor can't ask whether stories wait, nor bring any back;
-- - an account that can't write yet (a minor not admitted) is refused, even with the right answers;
-- - an account whose email isn't confirmed is told nothing waits and is refused;
-- - a name that only looks like a match (a part of the title, another account's name) is no match;
-- - an archive past its 5 years can't be brought back, even before the nightly job removed it;
-- - with the 'story_archive' switch off nothing is archived and nothing can be brought back;
-- - a story whose address was taken since comes back under a free one;
-- - a story that can't be written back stays in the archive and the rest still return.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000002'::uuid as teen_17,
  '00000000-0000-4000-8000-000000000005'::uuid as pending_check,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

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

-- Files one story of blocker's in the archive under an email, as a closed account would leave it.
create function pg_temp.archive_story(story_slug text, story_title text, email text, kept_for interval)
returns void language plpgsql as $$
declare
  new_story_id uuid;
begin
  insert into public.stories (user_id, slug, title, language_code, category_id, rating)
  values ((select blocker from ids), story_slug, story_title, 'en',
    (select id from public.categories where slug = 'fiction'), 'all_ages')
  returning id into new_story_id;
  insert into public.story_archives (user_id, email_hash, birth_year, pen_name, handle, title, story, delete_after)
  values ((select blocker from ids), public.hash_email(email), 1990, 'Ana Sleeper', 'ana_sleeper',
    story_title, public.archived_story_document(new_story_id), now() + kept_for);
  delete from public.stories where id = new_story_id;
end;
$$;

update auth.users set email = 'writer@misuse.test', email_confirmed_at = now()
where id = (select adult_writer from ids);
update auth.users set email = 'teen@misuse.test', email_confirmed_at = now()
where id = (select teen_17 from ids);
update auth.users set email = 'unconfirmed@misuse.test', email_confirmed_at = null
where id = (select pending_check from ids);

select pg_temp.archive_story('misuse-one', 'The Long Winter Road', 'writer@misuse.test', interval '5 years');
select pg_temp.archive_story('misuse-teen', 'A Teen Story', 'teen@misuse.test', interval '5 years');
select pg_temp.archive_story('misuse-unconfirmed', 'Unconfirmed Story', 'unconfirmed@misuse.test', interval '5 years');

/* ---------- No writes from the Data API ---------- */

select pg_temp.sign_in_as((select blocker from ids));
set local role authenticated;
select throws_ok(
  $$ insert into public.story_archives (user_id, email_hash, handle, title, story, delete_after)
     values ('00000000-0000-4000-8000-000000000015', 'x', 'x', 'x', '{}', now()) $$,
  '42501', null, 'nobody inserts an archive row, the closed account included');
select throws_ok($$ update public.story_archives set email_hash = 'mine' $$, '42501', null,
  'nobody changes one');
select throws_ok($$ delete from public.story_archives $$, '42501', null, 'nobody deletes one');
reset role;

/* ---------- A visitor ---------- */

select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$ select public.my_story_archive() $$, '42501', null,
  'a visitor can''t ask whether stories wait');
select throws_ok($$ select public.claim_story_archive(1990, 'Ana Sleeper') $$, '42501', null,
  'a visitor can''t bring stories back');
reset role;

/* ---------- Accounts that may not ---------- */

select is(pg_temp.claim_as((select teen_17 from ids), 1990, 'A Teen Story'), '{"outcome": "not_allowed"}'::jsonb,
  'an account that can''t write yet is refused, even with the right answers');
select pg_temp.sign_in_as((select pending_check from ids));
set local role authenticated;
select is(public.my_story_archive(), '{"waiting": false}'::jsonb,
  'an account whose email isn''t confirmed is told nothing waits');
reset role;
select is(pg_temp.claim_as((select pending_check from ids), 1990, 'Unconfirmed Story'),
  '{"outcome": "not_allowed"}'::jsonb, 'and can''t bring stories back');

/* ---------- Near misses ---------- */

select is(pg_temp.claim_as((select adult_writer from ids), 1990, 'The Long Winter') ->> 'outcome', 'no_match',
  'a part of the title is no match');
select is(pg_temp.claim_as((select adult_writer from ids), 1990, 'A Teen Story') ->> 'outcome', 'no_match',
  'another email''s story title is no match');
delete from public.rate_limit_events where action = 'story_archive_wrong_try';

/* ---------- An archive past its years ---------- */

update public.story_archives set delete_after = now() - interval '1 minute' where title = 'The Long Winter Road';
select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is(public.my_story_archive(), '{"waiting": false}'::jsonb, 'an archive past its years no longer waits');
reset role;
select is(pg_temp.claim_as((select adult_writer from ids), 1990, 'The Long Winter Road') ->> 'outcome', 'no_match',
  'and can''t be brought back, even before the nightly job removed it');
update public.story_archives set delete_after = now() + interval '1 year' where title = 'The Long Winter Road';
delete from public.rate_limit_events where action = 'story_archive_wrong_try';

/* ---------- The switch off ---------- */

update public.feature_flags set is_enabled = false where key = 'story_archive';
select is(pg_temp.claim_as((select adult_writer from ids), 1990, 'The Long Winter Road'),
  '{"outcome": "unavailable"}'::jsonb, 'with the switch off nothing can be brought back');
select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is(public.my_story_archive(), '{"waiting": false}'::jsonb, 'and nothing is said to wait');
reset role;
update public.feature_flags set is_enabled = true where key = 'story_archive';

/* ---------- A taken address, and a story that can't come back ---------- */

-- Someone else took the story's address since.
insert into public.stories (user_id, slug, title, language_code, category_id, rating)
values ((select blocker from ids), 'misuse-one', 'Somebody Else''s Story', 'en',
  (select id from public.categories where slug = 'fiction'), 'all_ages');
-- A second archived story of the same closed account whose category no longer exists.
select pg_temp.archive_story('misuse-two', 'The Broken One', 'writer@misuse.test', interval '5 years');
update public.story_archives
set story = jsonb_set(story, '{stories,0,category_id}', to_jsonb(gen_random_uuid()::text))
where title = 'The Broken One';

select is(pg_temp.claim_as((select adult_writer from ids), 1990, 'ana_sleeper'),
  '{"outcome": "restored", "restored": 1, "not_restored": 1}'::jsonb,
  'the username brings back what can come back, and counts what can''t');
select is(
  (select slug from public.stories
   where title = 'The Long Winter Road' and user_id = (select adult_writer from ids)),
  'misuse-one-2', 'a story whose address was taken comes back under a free one');
select is((select string_agg(title, ', ') from public.story_archives where email_hash = public.hash_email('writer@misuse.test')),
  'The Broken One', 'the story that couldn''t come back stays in the archive');
select is((select count(*)::integer from public.stories where title = 'The Broken One'), 0,
  'and left no half-written rows behind');
select is((select current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
  (select adult_writer::text from ids), 'the caller is still the caller after a story failed');

select * from finish();
rollback;
