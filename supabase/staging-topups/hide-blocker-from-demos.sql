-- Staging clean-up: take the blocker test account out of what a demo shows
-- (Robert, 7 Nov 2026, 11:57 UTC: "Yes, delete the blocker or hide the blocker").
--
-- Why: the blocker persona (00000000-0000-4000-8000-000000000015) is there to test blocks: it
-- blocks the `blocked` persona (PEOPLE-1.sql). Demo content part 2b (demo-content-2b.sql) also
-- made it one of the "readers" who follow, like and comment, so its handle showed up under Lia's
-- chapters and in her followers. Hiding it, not deleting it, keeps the block tests and the sample
-- moderation cases working.
--
-- What it does, on a staging database (run remove-demo-stories.sql first, which already takes
-- away the blocker's own demo stories):
--   1. refuses production (the 16 seed personas exist only on local and staging databases);
--   2. deletes the blocker's comments on other people's chapters, with the writers' replies to
--      them and every emoji reaction on them; a comment a moderation case holds is hidden instead
--      (the same rule delete_account_stories() follows, S1-E13-03);
--   3. deletes the blocker's emoji reactions, chapter likes, story follows and people follows,
--      and every follow of the blocker;
--   4. takes the blocker out of everyone else's notifications ("… liked your chapter"), deleting a
--      notification that had only the blocker in it.
-- What it keeps: the account, its sign-in and bio, its block of the `blocked` persona, the
-- sample reports by and about it in the moderation queue (staff only) and anything it writes by
-- hand on staging that isn't listed above.
-- Rules (supabase/staging-topups/README.md): safe to run twice (a second run finds nothing to
-- delete); never production (step 1); adds no accounts. Undo: run demo-content-2b.sql again
-- (it skips rows that are already there).
-- How to check it worked: the last query shows comments 0, likes 0, reactions 0, follows 0,
-- followers 0 and notifications 0, and block_kept true.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This clean-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

-- The account to hide, by its fixed seed id (supabase/seed.sql), used by steps 2 and 3.
create temporary table hidden_accounts on commit drop as
select '00000000-0000-4000-8000-000000000015'::uuid as user_id; -- blocker

-- 2a. The blocker's comments on chapters it didn't write, and the replies under them (a reply
--     can't outlive its comment: comments_parent_comment_id_fkey has no cascade).
create temporary table comments_to_remove on commit drop as
select comments.id
from public.comments
join public.chapters on chapters.id = comments.chapter_id
join public.stories on stories.id = chapters.story_id
where comments.user_id in (select user_id from hidden_accounts)
  and stories.user_id not in (select user_id from hidden_accounts);

insert into comments_to_remove (id)
select replies.id
from public.comments as replies
where replies.parent_comment_id in (select id from comments_to_remove)
  and replies.id not in (select id from comments_to_remove);

-- 2b. Delete the replies first, then the comments, skipping any a moderation case holds.
--     Reactions and the notifications that point at a comment go with it (on delete cascade).
delete from public.comments
where comments.id in (select id from comments_to_remove)
  and comments.parent_comment_id is not null
  and not public.content_is_held_for_moderation('comment', comments.id);

delete from public.comments
where comments.id in (select id from comments_to_remove)
  and comments.parent_comment_id is null
  and not public.content_is_held_for_moderation('comment', comments.id)
  and not exists (select 1 from public.comments as replies where replies.parent_comment_id = comments.id);

-- 2c. A comment a case still holds stays out of sight instead.
update public.comments set deleted_at = coalesce(comments.deleted_at, now())
where comments.id in (select id from comments_to_remove);

-- 3. The blocker's reactions, likes and follows, and everyone's follows of the blocker.
delete from public.comment_reactions where user_id in (select user_id from hidden_accounts);
delete from public.chapter_likes where user_id in (select user_id from hidden_accounts);
delete from public.follows_stories where user_id in (select user_id from hidden_accounts);
delete from public.follows_users
where user_id in (select user_id from hidden_accounts)
   or followed_user_id in (select user_id from hidden_accounts);

-- 4. Notifications: delete those only the blocker is in ("@blocker liked your chapter"), then
--    take the blocker out of grouped ones ("@blocker and 2 others …"). Notifications with no
--    people in them (moderation decisions, system notices) are never touched.
delete from public.notifications
where notifications.actor_user_ids = array['00000000-0000-4000-8000-000000000015'::uuid];

update public.notifications
set actor_user_ids = array_remove(actor_user_ids, '00000000-0000-4000-8000-000000000015'::uuid),
    actor_count = greatest(actor_count - 1, 1),
    updated_at = now()
where '00000000-0000-4000-8000-000000000015'::uuid = any(actor_user_ids);

commit;

-- 5. The check: what is left (the SQL Editor shows the last result).
select json_build_object(
  'comments', (select count(*) from public.comments
               join public.chapters on chapters.id = comments.chapter_id
               join public.stories on stories.id = chapters.story_id
               where comments.user_id = '00000000-0000-4000-8000-000000000015'::uuid
                 and stories.user_id <> '00000000-0000-4000-8000-000000000015'::uuid
                 and comments.deleted_at is null),
  'likes', (select count(*) from public.chapter_likes
            where user_id = '00000000-0000-4000-8000-000000000015'::uuid),
  'reactions', (select count(*) from public.comment_reactions
                where user_id = '00000000-0000-4000-8000-000000000015'::uuid),
  'follows', (select count(*) from public.follows_users
              where user_id = '00000000-0000-4000-8000-000000000015'::uuid)
           + (select count(*) from public.follows_stories
              where user_id = '00000000-0000-4000-8000-000000000015'::uuid),
  'followers', (select count(*) from public.follows_users
                where followed_user_id = '00000000-0000-4000-8000-000000000015'::uuid),
  'notifications', (select count(*) from public.notifications
                    where '00000000-0000-4000-8000-000000000015'::uuid = any(actor_user_ids)),
  'block_kept', exists (select 1 from public.blocks
                        where user_id = '00000000-0000-4000-8000-000000000015'::uuid
                          and blocked_user_id = '00000000-0000-4000-8000-000000000016'::uuid));
