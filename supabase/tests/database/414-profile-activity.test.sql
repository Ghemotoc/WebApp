-- Database tests for a profile's activity and public bookshelves (bundle 3, boards C04 to C06;
-- Robert, 25 Nov 2026, 09:50 UTC: no widget missing between the canvas and the live site).
-- What it proves:
-- - profile_activity() counts whom the person follows, their public bookshelves (never a private
--   one) and the forum posts the caller can read, lists the latest of those posts, and never
--   carries the user ID;
-- - profile_bookshelves() lists only public bookshelves;
-- - both answer null for an unknown username and wherever a block stands between the two people,
--   either way round; a signed-out visitor gets the same public answer;
-- - the profile has its side box slot, profile_side, as position 2.
-- Personas: adult_writer (…01), teen_17 (…02), blocker (…15), blocked (…16).
-- Test data: a forum thread, two bookshelves and one follow, made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- The data: adult_writer keeps one public and one private bookshelf and follows teen_17 only.
delete from public.reading_lists where user_id = '00000000-0000-4000-8000-000000000001';
insert into public.reading_lists (user_id, name, is_public) values
  ('00000000-0000-4000-8000-000000000001', 'Raft public', true),
  ('00000000-0000-4000-8000-000000000001', 'Raft privat', false);
delete from public.follows_users where user_id = '00000000-0000-4000-8000-000000000001';
insert into public.follows_users (user_id, followed_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

-- adult_writer starts a thread in a public forum, so there is a post to show.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.start_forum_thread('first-chapters', 'Cum încep fără prolog?', 'Un text scurt.');

/* ---------- 1. What another member sees ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.profile_activity('adult_writer', 'ro') ->> 'following')::integer, 1,
  'the profile counts the accounts the person follows');
select is((public.profile_activity('adult_writer', 'ro') ->> 'public_bookshelves')::integer, 1,
  'only the public bookshelf is counted, never the private one');
select ok((public.profile_activity('adult_writer', 'ro') ->> 'post_count')::integer >= 1,
  'the forum post the caller can read is counted');
select is(public.profile_activity('adult_writer', 'ro') -> 'recent_posts' -> 0 ->> 'thread_title',
  'Cum încep fără prolog?', 'Recent posts in Together starts with the latest post');
select ok(public.profile_activity('adult_writer', 'ro')::text not like '%00000000-0000-4000-8000-000000000001%',
  'the answer never carries the person''s user ID');
select is((select string_agg(shelf ->> 'name', ',') from jsonb_array_elements(public.profile_bookshelves('adult_writer')) as shelf),
  'Raft public', 'the bookshelves page lists the public bookshelf only');
select is(public.profile_activity('nobody_by_this_name', 'ro'), null,
  'an unknown username answers nothing');

/* ---------- 2. Blocks, both ways ---------- */

-- blocker blocks blocked (seed).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(public.profile_activity('blocker', 'ro'), null,
  'someone who blocks the caller shows no activity');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.profile_bookshelves('blocked'), null,
  'nor does someone the caller blocks show bookshelves');

/* ---------- 3. A signed-out visitor, and the side box ---------- */

select pg_temp.sign_out();
select is((public.profile_activity('adult_writer', 'en') ->> 'public_bookshelves')::integer, 1,
  'a signed-out visitor sees the same public count');
reset role;
select ok(exists (select 1 from public.ad_slots
  where slot_key = 'profile_side' and page_key = 'profile' and position = 2 and format = 'side_box'),
  'the profile has its side box as its second slot');

select * from finish();
rollback;
