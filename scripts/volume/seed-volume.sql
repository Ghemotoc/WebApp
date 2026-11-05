-- The 50,000-account volume seed for the read-path timing check (independent QA check,
-- 5 Nov 2026, findings S1 and S2; fix bundle QA-2).
--
-- What it makes: 50,000 accounts (one in ten aged 13 to 15, one in ten 16 or 17), 20,000 stories
-- by 10,000 writers across every rating and the seeded categories, 10 published chapters each
-- (200,000), 300,000 comments, 1,000,000 daily read totals, 1,000,000 notifications, about
-- 200,000 follows and 200,000 library entries, and a score for every story. That is about ten
-- times the 5,000 monthly readers the running-costs model plans for.
-- Who runs it: scripts/volume/run-volume-check.sh, only into its throwaway database qa_volume,
-- never the local development database, staging or production (CLAUDE.md: synthetic data only).
-- Every account, address and text is made up; addresses end in @volume.test.
-- Triggers and foreign-key checks are off while loading (session_replication_role = replica), so
-- the derived tables a trigger would keep (story_listings and the like) are rebuilt at the end.

set session_replication_role = replica;

-- Step 1: the accounts. Ages from the year of birth: every tenth is 2012 (13 to 15) and the next
-- one 2009 (16 or 17); the rest are adults.
insert into public.profiles (id, handle, birth_year, age_check_result, locale)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'qa_user_' || n,
       case when n % 10 = 0 then extract(year from now())::int - 14
            when n % 10 = 1 then extract(year from now())::int - 17
            else 1960 + n % 45 end,
       case when n % 10 in (0, 1) then '13_or_over'::public.age_check_result
            else '18_or_over'::public.age_check_result end,
       'ro'
from generate_series(1, 50000) as n;
insert into auth.users (id, email, email_confirmed_at, aud, role, instance_id)
select id, handle || '@volume.test', now(), 'authenticated', 'authenticated',
       '00000000-0000-0000-0000-000000000000'
from public.profiles where handle like 'qa_user_%';

-- Step 2: the stories, spread over the ratings, three seeded categories and two languages. One
-- in seven has "ștrengari" in its title, the rest "vânt", for the search timings.
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating,
  first_published_at, last_chapter_published_at, completion_status, visibility)
select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       ('10000000-0000-4000-8000-' || lpad((1 + n % 10000)::text, 12, '0'))::uuid,
       'qa-story-' || n,
       'Povestea numărul ' || n || case when n % 7 = 0 then ' cu ștrengari și țărani' else ' despre vânt' end,
       'Un rezumat scurt pentru povestea ' || n || '. Fată, băiat, pădure, mare.',
       case when n % 5 = 0 then 'en' else 'ro' end,
       (select id from public.categories order by slug offset (n % 3) limit 1),
       (array['all_ages', '13_plus', '16_plus', '18_plus'])[1 + n % 4]::public.story_rating,
       now() - (n % 365) * interval '1 day', now() - (n % 30) * interval '1 day', 'ongoing', 'public'
from generate_series(1, 20000) as n;

-- Step 3: ten published chapters per story, with codes that never collide.
insert into public.chapters (id, story_id, user_id, code, position, status, published_title,
  published_body, published_word_count, first_published_at, last_published_at, draft_body, draft_title)
select gen_random_uuid(), stories.id, stories.user_id,
       -- The story's number times 16 plus the chapter's, in hex: unique, and 8 characters like a real code.
       lpad(to_hex(replace(stories.slug, 'qa-story-', '')::int * 16 + chapter_number), 8, '0'),
       chapter_number, 'published', 'Capitolul ' || chapter_number,
       repeat('Era o dimineață rece și vântul bătea peste dealuri. ', 40), 360,
       now() - chapter_number * interval '1 day', now() - chapter_number * interval '1 day', '', ''
from public.stories cross join generate_series(1, 10) as chapter_number
where stories.slug like 'qa-story-%';

-- Step 4: what readers did: scores, comments, read totals, notifications, follows, libraries.
insert into public.story_scores (story_id, score, computed_at)
select id, random() * 1000, now() from public.stories where slug like 'qa-story-%';
insert into public.comments (user_id, chapter_id, body)
select ('10000000-0000-4000-8000-' || lpad((1 + (random() * 49999)::int)::text, 12, '0'))::uuid,
       sample.id, 'Un comentariu frumos.'
from (select id from public.chapters where code is not null order by random() limit 100000) as sample
cross join generate_series(1, 3);
insert into public.chapter_reads (chapter_id, read_on, total)
select sample.id, current_date - day_back, 1 + (random() * 20)::int
from (select id from public.chapters order by random() limit 100000) as sample
cross join generate_series(0, 9) as day_back;
insert into public.notifications (user_id, kind, story_id, created_at, actor_count)
select ('10000000-0000-4000-8000-' || lpad((1 + n % 50000)::text, 12, '0'))::uuid, 'new_chapter',
       ('20000000-0000-4000-8000-' || lpad((1 + n % 20000)::text, 12, '0'))::uuid,
       now() - (n % 60) * interval '1 hour', 1
from generate_series(1, 1000000) as n;
insert into public.follows_users (user_id, followed_user_id)
select distinct follower, followed
from (select ('10000000-0000-4000-8000-' || lpad((1 + (random() * 49999)::int)::text, 12, '0'))::uuid as follower,
             ('10000000-0000-4000-8000-' || lpad((1 + (random() * 9999)::int)::text, 12, '0'))::uuid as followed
      from generate_series(1, 200000)) as pairs
where follower <> followed
on conflict do nothing;
insert into public.library_entries (user_id, story_id, shelf)
select distinct ('10000000-0000-4000-8000-' || lpad((1 + (random() * 49999)::int)::text, 12, '0'))::uuid,
       ('20000000-0000-4000-8000-' || lpad((1 + (random() * 19999)::int)::text, 12, '0'))::uuid,
       'reading'::public.library_shelf
from generate_series(1, 200000)
on conflict do nothing;

set session_replication_role = origin;

-- Step 5: what the triggers would have kept up to date while loading (the stored search text
-- of every story, QA-2), then fresh statistics so the planner sees the real sizes. The rebuild
-- is skipped on a database from before QA-2, so the same seed measures "before" and "after".
do $$
begin
  if to_regprocedure('public.rebuild_story_search_documents()') is not null then
    perform public.rebuild_story_search_documents();
  end if;
end;
$$;
analyze;
