-- Database tests for who can read a story: Public, Unlisted or Private (bundle NEW-1, part a).
-- What it proves:
-- - only the writer sets it (set_my_story_visibility); a new story is public;
-- - unlisted: anyone with the link opens it, but it is in no list and not on the writer's
--   profile; it stays in its savers' libraries, and on someone else's library it shows only to a
--   viewer who saved or follows it; only the story's own followers hear of a new chapter;
-- - private: only the writer opens it or sees it listed; nobody hears of a new chapter.
-- Personas: adult_writer (…01, owns statia-meteo-seed01), teacher (…07), admin (…09) and
-- blocker (…15, an adult reader who blocks only the blocked persona).
-- Test data: one published chapter, a library entry, follows and notifications, made here;
-- rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;
-- Whether the caller can open the story, and whether a list shows it. opens() looks the test
-- chapter up, and listed() calls the internal listed_stories(), as the test's owner; the gates
-- themselves read the caller from the claims.
create function pg_temp.opens() returns boolean language sql security definer as $$
  select exists (select 1 from public.reader_visible_story('statia-meteo-seed01'))
    and exists (select 1 from public.chapters where chapters.code = 'whoread1' and public.chapter_is_readable(chapters.id));
$$;
create function pg_temp.listed(kind text, list_key text) returns boolean language sql security definer as $$
  select exists (select 1 from public.listed_stories(kind, list_key, null, null, null) as listed
                 where listed.slug = 'statia-meteo-seed01');
$$;
-- New-chapter notifications for the test chapter, by persona handle.
create function pg_temp.told() returns text language sql security definer as $$
  select coalesce(string_agg(profiles.handle, ', ' order by profiles.handle), 'nobody')
  from public.notifications join public.profiles on profiles.id = notifications.user_id
  where notifications.kind = 'new_chapter'
    and notifications.chapter_id = (select id from public.chapters where code = 'whoread1');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A published chapter on the seed story; teacher saves the story and shows her library to
-- everyone; the admin follows the writer, blocker nothing yet.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'whoread1', 1, 'Unu',
  'x', 1, 'published', 'Unu', 'Text.', 1, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.set_library_shelf('statia-meteo-seed01', 'saved');
select public.set_library_audience('everyone');
reset role;
insert into public.follows_users (user_id, followed_user_id)
values ('00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001');
-- blocker starts with the story neither saved nor followed, whatever other tests left behind.
delete from public.library_entries
where story_id = '00000000-0000-4000-9000-000000000001' and user_id = '00000000-0000-4000-8000-000000000015';
delete from public.follows_stories
where story_id = '00000000-0000-4000-9000-000000000001' and user_id = '00000000-0000-4000-8000-000000000015';
-- The seed has teen_17 following both the writer and this story; keep only the writer follow,
-- so teen_17 stands for "follows the writer, not the story".
delete from public.follows_stories
where story_id = '00000000-0000-4000-9000-000000000001' and user_id = '00000000-0000-4000-8000-000000000002';

/* ---------- 1. The setting ---------- */

select is((select visibility::text from public.stories where slug = 'statia-meteo-seed01'), 'public',
  'a story is public until its writer says otherwise');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_my_story_visibility('statia-meteo-seed01', 'private') ->> 'outcome', 'not_found',
  'nobody else can change who reads someone''s story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_story_visibility('statia-meteo-seed01', 'unlisted') ->> 'outcome', 'ok',
  'the writer makes the story unlisted');

/* ---------- 2. Unlisted ---------- */

select pg_temp.as_visitor();
select ok(pg_temp.opens(), 'unlisted: a visitor with the link opens the story and its chapter');
select ok(not pg_temp.listed('new', null), 'unlisted: it is in no public list (New, and so Discover''s shelves)');
select ok(not pg_temp.listed('writer', 'adult_writer'), 'unlisted: nor among the writer''s stories');
-- profile_story_cards() is internal; get_writer_profile() calls it with is_owner false for others.
reset role;
select is(jsonb_array_length(public.profile_story_cards('00000000-0000-4000-8000-000000000001', false)), 0,
  'unlisted: nor on the writer''s public profile');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(pg_temp.listed('writer', 'adult_writer'), 'the writer still sees it among their own stories');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(pg_temp.listed('library', 'saved'), 'unlisted: it stays in the library of a reader who saved it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select ok(not pg_temp.listed('reader_library', 'teacher'),
  'unlisted: on that reader''s public library, a viewer who hasn''t saved or followed it doesn''t see it');
select public.follow_story('statia-meteo-seed01', true);
select ok(pg_temp.listed('reader_library', 'teacher'), 'and once the viewer follows the story, it shows there too');
reset role;
select public.notify_chapter_published(jsonb_build_object('story_id', '00000000-0000-4000-9000-000000000001',
  'chapter_id', (select id from public.chapters where code = 'whoread1')));
select is(pg_temp.told(), 'blocker',
  'unlisted: a new chapter tells the story''s followers, not the writer''s');

/* ---------- 3. Private ---------- */

delete from public.notifications where kind = 'new_chapter';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_my_story_visibility('statia-meteo-seed01', 'private');
select ok(pg_temp.opens(), 'private: the writer still opens it');
select pg_temp.as_visitor();
select ok(not pg_temp.opens(), 'private: a visitor with the link doesn''t');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(not pg_temp.opens() and not pg_temp.listed('library', 'saved'),
  'private: nor does a reader who saved it, and it leaves their library');
reset role;
select public.notify_chapter_published(jsonb_build_object('story_id', '00000000-0000-4000-9000-000000000001',
  'chapter_id', (select id from public.chapters where code = 'whoread1')));
select is(pg_temp.told(), 'nobody', 'private: a new chapter tells nobody');

/* ---------- 4. Back to public ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_my_story_visibility('statia-meteo-seed01', 'public');
select pg_temp.as_visitor();
select ok(pg_temp.listed('new', null), 'made public again, it is back in the lists');

select * from finish();
rollback;
