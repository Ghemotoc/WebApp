-- Database tests for privacy settings (story S1-E13-01; GDPR art. 25(2); Q50).
-- What it proves:
-- - criterion 1: my_privacy_settings() answers profile visibility, who can message me, online
--   status (off by default) and library visibility, and each setter saves its choice; signed
--   out and an empty choice are refused;
-- - criterion 2: an under-18 starts on the most private value of every setting (profile: people
--   they follow; library: only them; online: off; messages: people they follow);
-- - the profile choice: everyone, members (not signed out) or people the owner follows; a limited
--   visitor gets no bio and no join month, on the profile, the story page and in search;
-- - the library choice: the profile says whether the visitor may see it and the reader_library
--   list answers only those visitors;
-- - the online dot: only while switched on, only for people the person follows, only when active
--   in the last 5 minutes, never across a block; switching off forgets the time; the nightly job
--   clears old times and is scheduled.
-- No new table, so no new policy. Personas: adult_writer (…01, has a bio), teen_17 (…02, follows
-- adult_writer), teacher (…07), blocker (…15, an adult with a bio, blocks blocked …16).
-- Test data: one published story by adult_writer on teacher's library shelf; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The slugs on someone's library list, as the caller sees it.
create function pg_temp.library_of(handle text) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by story ->> 'slug'), '')
  from jsonb_array_elements(public.browse_stories('reader_library', handle) -> 'stories') as story;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = false where key = 'adults_only';
update public.profiles set profile_visible_to = null, library_visible_to = 'only_me',
  shows_online_status = false, last_active_at = null, messages_from = null;

-- One published story by adult_writer, on teacher's Reading shelf.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  completion_status, first_published_at, last_chapter_published_at)
values ('00000000-0000-4000-9209-000000000001', '00000000-0000-4000-8000-000000000001', 'priv1',
  'Privat unu', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9209-000000000001', '00000000-0000-4000-8000-000000000001', 'prv1ch01', 1,
  'C', 'Text.', 1, 'published', 'C1', 'Text.', 1, now());
insert into public.library_entries (user_id, story_id, shelf)
values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9209-000000000001', 'reading');

/* ---------- 1. The settings and their defaults ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.my_privacy_settings() $$, '42501', null,
  'signed out, there are no privacy settings to read');
select throws_ok($$ select public.set_profile_audience('members') $$, '42501', null,
  'signed out, nobody can change one');

select pg_temp.sign_in('01');
select is(public.my_privacy_settings(),
  '{"profile_audience": "everyone", "library_audience": "only_me", "shows_online_status": false, "message_audience": "everyone", "is_under_18": false}'::jsonb,
  'an adult starts with a public profile, a private library, online status off and messages from everyone');
select pg_temp.sign_in('02');
select is(public.my_privacy_settings(),
  '{"profile_audience": "people_i_follow", "library_audience": "only_me", "shows_online_status": false, "message_audience": "people_i_follow", "is_under_18": true}'::jsonb,
  'an under-18 starts on the most private value of every setting');
select throws_ok($$ select public.set_profile_audience(null) $$, '23514', null, 'an empty profile choice is refused');
select throws_ok($$ select public.set_library_audience(null) $$, '23514', null, 'an empty library choice is refused');
select throws_ok($$ select public.set_shows_online_status(null) $$, '23514', null, 'an empty online choice is refused');

/* ---------- 2. Who sees the whole profile ---------- */

select pg_temp.sign_out();
select is(public.get_writer_profile('adult_writer') ->> 'is_limited', 'false',
  'an adult''s profile is open to everyone at first, signed-out visitors included');
select pg_temp.sign_in('01');
select lives_ok($$ select public.set_profile_audience('members') $$, 'adult_writer keeps their profile to members');
select is(public.my_privacy_settings() ->> 'profile_audience', 'members', 'and the choice is saved');
select pg_temp.sign_out();
select is(public.get_writer_profile('adult_writer') -> 'is_limited', 'true'::jsonb,
  'a signed-out visitor now gets the limited profile');
select is(public.get_writer_profile('adult_writer') ->> 'bio', '', 'with no bio');
select is(public.get_writer_profile('adult_writer') -> 'joined_at', 'null'::jsonb, 'and no join month');
select is(public.get_writer_profile('adult_writer') ->> 'display_name', 'Lia Scrie', 'the pen name still shows');
select is(public.get_story_page('priv1') -> 'writer' ->> 'bio', '', 'the story page shows no bio either');
select pg_temp.sign_in('07');
select is(public.get_writer_profile('adult_writer') ->> 'is_limited', 'false', 'a signed-in member sees it all');
select isnt(public.get_writer_profile('adult_writer') ->> 'bio', '', 'bio included');

select pg_temp.sign_in('01');
select lives_ok($$ select public.set_profile_audience('people_i_follow') $$, 'adult_writer keeps it to people they follow');
select pg_temp.sign_in('07');
select is(public.get_writer_profile('adult_writer') ->> 'is_limited', 'true',
  'teacher, whom adult_writer doesn''t follow, now gets the limited profile');
select is(public.get_story_page('priv1') -> 'writer' ->> 'bio', '', 'and no bio on the story page');
select is((select writer ->> 'bio' from jsonb_array_elements(public.search_writers('Lia') -> 'writers') as writer
           where writer ->> 'handle' = 'adult_writer'), '', 'nor in search');
select pg_temp.as_owner();
insert into public.follows_users (user_id, followed_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007');
select pg_temp.sign_in('07');
select is(public.get_writer_profile('adult_writer') ->> 'is_limited', 'false', 'once adult_writer follows teacher, teacher sees it all');
select pg_temp.sign_in('01');
select is(public.get_writer_profile('adult_writer') ->> 'is_limited', 'false', 'the owner always sees their own profile');

/* ---------- 3. Who sees the library ---------- */

select pg_temp.sign_in('07');
select is(public.get_writer_profile('teacher') ->> 'library_audience', 'only_me', 'the owner sees their own library choice');
select is(public.get_writer_profile('teacher') -> 'library_open', 'true'::jsonb, 'and their own library');
select is(pg_temp.library_of('teacher'), 'priv1', 'the owner''s library list holds the story');
select pg_temp.sign_in('01');
select is(public.get_writer_profile('teacher') -> 'library_open', 'false'::jsonb, 'at first nobody else sees it');
select is(public.get_writer_profile('teacher') -> 'library_audience', 'null'::jsonb, 'nor the owner''s choice');
select is(pg_temp.library_of('teacher'), '', 'and the list is empty for them');
select pg_temp.sign_in('07');
select lives_ok($$ select public.set_library_audience('people_i_follow') $$, 'teacher shows it to people they follow');
select pg_temp.sign_in('01');
select is(pg_temp.library_of('teacher'), '', 'adult_writer, whom teacher doesn''t follow, still sees nothing');
select pg_temp.sign_in('07');
select lives_ok($$ select public.set_library_audience('everyone') $$, 'teacher shows it to everyone');
select pg_temp.sign_out();
select is(pg_temp.library_of('teacher'), 'priv1', 'now even a signed-out visitor sees the story on it');

/* ---------- 4. The online dot ---------- */

select pg_temp.sign_in('02');
select lives_ok($$ select public.note_i_am_online() $$, 'teen_17 opens the app with online status off');
select is((select last_active_at from public.profiles where id = '00000000-0000-4000-8000-000000000002'), null,
  'and nothing is kept');
select lives_ok($$ select public.set_shows_online_status(true) $$, 'teen_17 turns online status on');
select public.note_i_am_online();
select pg_temp.sign_in('01');
select is(public.who_is_online(array['teen_17', 'teacher']), array['teen_17'],
  'adult_writer, whom teen_17 follows, sees teen_17 online');
select pg_temp.sign_in('07');
select is(public.who_is_online(array['teen_17']), '{}'::text[], 'teacher, whom teen_17 doesn''t follow, doesn''t');
select pg_temp.as_owner();
update public.profiles set last_active_at = now() - interval '6 minutes' where id = '00000000-0000-4000-8000-000000000002';
select pg_temp.sign_in('01');
select is(public.who_is_online(array['teen_17']), '{}'::text[], 'after 5 minutes away the dot goes');
select pg_temp.as_owner();
update public.profiles set last_active_at = now() where id = '00000000-0000-4000-8000-000000000002';
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
select pg_temp.sign_in('01');
select is(public.who_is_online(array['teen_17']), '{}'::text[], 'never across a block');
select pg_temp.sign_in('02');
select public.set_shows_online_status(false);
select pg_temp.as_owner();
select is((select last_active_at from public.profiles where id = '00000000-0000-4000-8000-000000000002'), null,
  'switching it off forgets the last active time');
update public.profiles set last_active_at = now() - interval '2 days' where id = '00000000-0000-4000-8000-000000000015';
select is(public.forget_old_activity(), 1, 'the nightly job clears times more than a day old');
select is((select count(*)::integer from cron.job where jobname = 'forget-old-activity'), 1, 'and runs nightly');

select * from finish();
rollback;
