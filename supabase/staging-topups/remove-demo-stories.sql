-- Staging clean-up: remove the demo stories and the five synthetic demo writers, keep the classics
-- (Robert, 6 Nov 2026, 17:17 to 17:19 UTC: "remove the demos … and only leave the classics";
-- "keep only a dummy account that I will leave for demos"; "the demo one should be the Lia one").
--
-- What it does, on a staging database that ran demo content part 2a (and maybe 2b):
--   1. refuses production (the 16 seed personas exist only on local and staging databases);
--   2. deletes the 36 demo stories (the 9100 id block, from demo-content-2a.sql) and the three seed
--      stories (the 9000 id block, from S1-E3-01.sql), with their chapters, comments, likes,
--      reactions, follows and read totals, the same way an account deletion deletes stories
--      (delete_account_stories(), S1-E13-03): anything a moderation case holds is hidden, not
--      deleted;
--   3. deletes the five synthetic demo writers (ana_cu_harti, tudor_farasomn, ilinca_noaptea,
--      radu_din_deal, sofia_cerneala) through delete_account_data(), the nightly purge's own
--      function, so their user IDs are kept and never reused.
-- What it keeps: the 20 classics and the classics account; the seed personas, including
-- adult_writer ("Lia Scrie"), the account kept for demos; any story anyone wrote by hand on
-- staging (only the fixed demo and seed ids are touched).
-- Run classic-authors.sql first, so the classics' bylines show their real authors.
-- Rules (supabase/staging-topups/README.md): safe to run twice (a second run finds nothing to
-- delete); never production (step 1). Undo: run demo-content-2a.sql and S1-E3-01.sql again.
-- How to check it worked: the last query shows demo_stories 0, seed_stories 0, demo_writers 0,
-- classics 20.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This clean-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

-- The stories to remove: the demo block and the seed block, never the classics (9300 block).
create temporary table stories_to_remove on commit drop as
select stories.id
from public.stories
where stories.id::text like '00000000-0000-4000-9100-%'
   or stories.id::text like '00000000-0000-4000-9000-%';

-- 2a. Every chapter of those stories that no moderation case holds (revisions, embeds, comments,
--     likes and reactions go with it).
delete from public.chapters
where chapters.story_id in (select id from stories_to_remove)
  and not public.content_is_held_for_moderation('chapter', chapters.id);

-- 2b. The public "copies a published work" notes on the stories that are going.
delete from public.copied_work_notes
where copied_work_notes.story_id in (select id from stories_to_remove)
  and not public.content_is_held_for_moderation('story', copied_work_notes.story_id)
  and not exists (select 1 from public.chapters where chapters.story_id = copied_work_notes.story_id);

-- 2c. Every story that no case holds and has no kept chapter (tags, follows, plans go with it).
delete from public.stories
where stories.id in (select id from stories_to_remove)
  and not public.content_is_held_for_moderation('story', stories.id)
  and not exists (select 1 from public.chapters where chapters.story_id = stories.id);

-- 2d. A story a case still holds stays out of sight instead.
update public.stories set deleted_at = coalesce(stories.deleted_at, now())
where stories.id in (select id from stories_to_remove);

-- 3. The five synthetic demo writers (fixed ids …-000000000101 to …-000000000105), deleted the way
--    the nightly purge deletes an account. The classics account (…-000000000100) stays.
do $$
declare
  demo_writer_id uuid;
begin
  for demo_writer_id in
    select profiles.id from public.profiles
    where profiles.id::text like '00000000-0000-4000-8000-0000000001__'
      and profiles.id <> '00000000-0000-4000-8000-000000000100'::uuid
      and profiles.deleted_at is null
  loop
    perform public.delete_account_data(demo_writer_id);
  end loop;
end;
$$;

commit;

-- 4. The check: what is left (the SQL Editor shows the last result).
select json_build_object(
  'demo_stories', (select count(*) from public.stories
                   where id::text like '00000000-0000-4000-9100-%' and deleted_at is null),
  'seed_stories', (select count(*) from public.stories
                   where id::text like '00000000-0000-4000-9000-%' and deleted_at is null),
  'demo_writers', (select count(*) from public.profiles
                   where id::text like '00000000-0000-4000-8000-0000000001__'
                     and id <> '00000000-0000-4000-8000-000000000100'::uuid
                     and deleted_at is null),
  'classics', (select count(*) from public.stories
               where id::text like '00000000-0000-4000-9300-%' and deleted_at is null),
  'demo_account', (select public.display_name(handle, pen_name) from public.profiles
                   where id = '00000000-0000-4000-8000-000000000001'::uuid));
