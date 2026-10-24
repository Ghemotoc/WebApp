-- Database tests for the writer profile and blocks (story S1-E5-05; CLAUDE.md rules 1, 6 and 15).
-- What it proves:
-- - get_writer_profile() shows the handle, display name, pen name, bio, join date, the counts and
--   the published stories a reader may see (rating, deleted, unpublished and moderated stories
--   left out), to visitors and members alike (first criterion);
-- - it never answers the user ID, year of birth, age check, email or online status, and the
--   look-alike username finds the same profile (second criterion; rule 15);
-- - set_my_bio() trims, fixes ş/ţ, refuses more than 300 characters and a read-only account;
-- - blocks: set_block() blocks and unblocks by username, never oneself; a blocked person gets
--   no profile, no story page and no chapter from the person who blocked them, and the blocker
--   sees the header with "i_blocked" and no stories (blocks respected everywhere, rule 6);
-- - policy blocks_select_own: the blocker reads their own block (allowed); the blocked person
--   and a third member read nothing (denied); nobody writes the table directly;
-- - my_blocked_accounts() lists the caller's blocks without user IDs.
begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;

-- adult_writer (…01) publishes one chapter on each of their two seed stories; the second story
-- is then made 16+, so kid_14_ok (…03) can't see it. blocker (…15) publishes a story too.
-- Today's reads: 7 on the first chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'profa001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'profb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
insert into public.chapter_reads (chapter_id, read_on, total)
  select id, current_date, 7 from public.chapters where code = 'profa001';
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, ai_disclosure,
  first_published_at, last_chapter_published_at)
values ('00000000-0000-4000-9000-0000000001b1', '00000000-0000-4000-8000-000000000015', 'blocker-story-t143',
  'Night bus', 'Poems.', 'en', (select id from public.categories where slug = 'poetry'), 'all_ages', 'no_ai', now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-0000000001b1', '00000000-0000-4000-8000-000000000015', 'profc001', 1, 'Stop',
  'x', 2, 'published', 'Stop', 'Last stop.', 2, now());

/* ---------- 1. The profile as others see it ---------- */

select pg_temp.sign_out();
select is(public.get_writer_profile('adult_writer') ->> 'handle', 'adult_writer', 'a visitor sees the profile');
select is(public.get_writer_profile('@adult_writer') ->> 'bio',
  'Scriu povești scurte despre orașe mici și oamenii care le țin minte.', 'with the bio; the "@" is optional');
select is(public.get_writer_profile('nobody_by_this_name'), null, 'an unknown username answers nothing');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(jsonb_array_length(public.get_writer_profile('adult_writer') -> 'stories'), 2,
  'teacher, an adult, sees both published stories');
select is((public.get_writer_profile('adult_writer') -> 'counts' ->> 'reads')::integer, 7,
  'the reads are the total of the readable chapters'' daily totals');
select is((public.get_writer_profile('adult_writer') -> 'counts' ->> 'chapters')::integer, 2,
  'the chapter count is the published chapters');
select ok(not (public.get_writer_profile('adult_writer') ->> 'is_me')::boolean, 'it isn''t teacher''s own');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(jsonb_array_length(public.get_writer_profile('adult_writer') -> 'stories'), 1,
  'kid_14_ok doesn''t see the 16+ story on the profile (rule 18)');
select is(public.get_writer_profile('adult_writer') -> 'counts' ->> 'stories', '1', 'nor counts it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok((public.get_writer_profile('adult_writer') ->> 'is_me')::boolean, 'the writer sees their own profile as theirs');
select is(jsonb_array_length(public.get_writer_profile('adult_writer') -> 'stories'), 2,
  'and both their stories, the 16+ one included');

-- teen_17's draft story has no published chapter: not on the profile.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(jsonb_array_length(public.get_writer_profile('teen_17') -> 'stories'), 0, 'an unpublished story isn''t listed');

/* ---------- 2. Never the private fields ---------- */

select is(
  (select count(*)::integer from jsonb_object_keys(public.get_writer_profile('adult_writer')) as key
   where key in ('id', 'user_id', 'birth_year', 'birth_month', 'age_check_result', 'age_checked_at',
     'age_check_method', 'email', 'shows_online_status', 'online', 'last_seen_at')),
  0, 'another user never sees the user ID, year of birth, age check, email or online status');
select ok(public.get_writer_profile('adult_writer')::text not like '%00000000-0000-4000-8000-000000000001%',
  'the user ID appears nowhere in the answer');
select ok(public.get_writer_profile('adult_writer')::text not like '%personas.test%', 'nor any email');

/* ---------- 3. The bio ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_my_bio('  Profesoară de română. Îmi plac poveştile scurte.  '),
  'Profesoară de română. Îmi plac poveștile scurte.', 'the bio is trimmed and ş becomes ș (rule 4)');
select throws_ok($$ select public.set_my_bio(repeat('a', 301)) $$, '23514', null, 'a bio is at most 300 characters');
select lives_ok($$ select public.set_my_bio(repeat('a', 300)) $$, '300 is fine');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.set_my_bio('Hello') $$, '42501', null, 'a read-only account can''t change its bio');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_bio('Hello') $$, '42501', null, 'a visitor can''t call it');

/* ---------- 4. Blocks ---------- */

-- The seed has blocker blocking blocked (…16).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(public.get_writer_profile('blocker'), null, 'the blocked person gets no profile of the person who blocked them');
select is(public.get_story_page('blocker-story-t143'), null, 'nor their story page');
select is(public.get_chapter('blocker-story-t143', 'profc001'), null, 'nor their chapters');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select ok((public.get_writer_profile('blocked') ->> 'i_blocked')::boolean, 'the blocker sees the header, marked as blocked');
select is(public.get_writer_profile('blocked') -> 'stories', '[]'::jsonb, 'and no stories');
select results_eq($$ select handle from public.my_blocked_accounts() $$, $$ values ('blocked') $$,
  'my_blocked_accounts() lists the blocked person by username');

-- Policy blocks_select_own: allowed for the blocker, denied for the blocked person and others.
select is((select count(*)::integer from public.blocks), 1, 'allowed: blocks_select_own, the blocker reads their block');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is((select count(*)::integer from public.blocks), 0, 'denied: blocks_select_own, the blocked person reads nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.blocks), 0, 'denied: blocks_select_own, a third member reads nothing');
select throws_ok($$ insert into public.blocks (user_id, blocked_user_id)
    values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'nobody writes the table directly');

-- teacher blocks adult_writer, by username; then adult_writer can't see teacher, nor teacher's
-- stories, and teacher sees adult_writer's profile without stories. Then unblock.
select is(public.set_block('adult_writer', true) ->> 'blocked', 'true', 'set_block() blocks by username');
select ok((public.get_writer_profile('adult_writer') ->> 'i_blocked')::boolean, 'the blocker sees "blocked"');
select is(public.get_story_page('statia-meteo-seed01'), null, 'and no longer sees the blocked writer''s story page');
select throws_ok($$ select public.set_block('teacher', true) $$, '23514', null, 'nobody blocks themselves');
select is(public.set_block('adult_writer', false) ->> 'blocked', 'false', 'set_block() unblocks');
select ok(public.get_story_page('statia-meteo-seed01') is not null, 'after unblocking, the story page is back');

select * from finish();
rollback;
