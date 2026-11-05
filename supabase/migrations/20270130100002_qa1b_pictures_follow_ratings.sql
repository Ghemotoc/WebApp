-- QA-1b: a story's pictures and notifications follow its rating (independent QA check,
-- 5 Nov 2026, findings C1 and C2; CLAUDE.md rule 18: a rating hides a story from anyone younger,
-- enforced in the database).
--
-- What it does:
-- - picture_is_visible() now also asks, for a picture that belongs to a story (a cover or a
--   chapter picture: picture_checks.story_id), whether the caller may see that story's rating
--   and is not blocked with its writer. Before, anyone, signed out included, could fetch a 16+ or
--   18+ story's cover or chapter pictures straight from Storage once they had passed the check.
--   Pictures that belong to no story (avatars, space banners, signatures, landing pages, sponsors
--   and brand files) are unchanged. The writer and moderation staff still see every picture
--   through picture_reader_may_see(), which the Storage rules check beside this one.
-- - notification_is_shown() now hides a notification about a story whose rating the person may no
--   longer see (for example after the writer raised it to 18+), unless the story is their own.
--   Before, only rows naming a chapter or a comment were checked again.
-- Who calls it: the Storage read rules on covers, chapter-images and the other picture buckets,
-- picture_state_json() and atlas_picture_is_public() (picture_is_visible); the notifications
-- policy and my_notifications() (notification_is_shown).

/* ---------- Pictures ---------- */

/**
 * picture_is_visible: may anyone who is not the uploader or staff see this picture?
 * Inputs: bucket and path of the Storage object.
 * Returns: true when the picture passed its check (or a person approved it), is not deleted or
 *   moderated away, is not a cover staff hid, and, when it belongs to a story, the caller may see
 *   that story's rating and is not blocked with its writer (QA-1b).
 * Raises: nothing.
 * Where it fits: the "_select_visible" Storage rules and picture_state_json(); the uploader and
 *   staff are let in separately by picture_reader_may_see().
 */
create or replace function public.picture_is_visible(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    -- Step 1: the picture passed its check and nobody took it down.
    select 1 from public.picture_checks
    where picture_checks.bucket = picture_is_visible.bucket and picture_checks.path = picture_is_visible.path
      and picture_checks.status in ('passed', 'approved')
      and picture_checks.deleted_at is null
      and not public.is_moderated_away('picture', picture_checks.id)
      -- Step 2: a story's picture follows the story's rating and blocks (CLAUDE.md rule 18,
      -- rule 6), exactly as the story itself does.
      and (picture_checks.story_id is null or exists (
        select 1 from public.stories
        where stories.id = picture_checks.story_id
          and public.rating_allows(stories.rating)
          and not public.is_blocked_with(stories.user_id))))
    -- Step 3: a cover staff hid shows the automatic cover instead (ADMIN2-b3).
    and not exists (
      select 1 from public.stories
      where picture_is_visible.bucket = 'covers'
        and picture_is_visible.path in (stories.cover_tall_path, stories.cover_square_path)
        and stories.cover_hidden_at is not null);
$$;

/* ---------- Notifications ---------- */

/**
 * notification_is_shown: should this notification still appear for its owner?
 * Inputs: target, the notification row.
 * Returns: false when it isn't the caller's, when everyone in it is now blocked, when its chapter
 *   or comment can no longer be seen, or when its story's rating is above what the caller may see
 *   and the story isn't their own (QA-1b); true otherwise. Moderation decisions always show.
 * Raises: nothing.
 * Where it fits: the notifications read policy and my_notifications() (S1-E7-01).
 */
create or replace function public.notification_is_shown(target public.notifications)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  address record;
  comment public.comments;
begin
  -- Step 1: only the owner, and a moderation decision always reaches them (DSA art. 17).
  if target.user_id is distinct from (select auth.uid()) then
    return false;
  end if;
  if target.kind = 'moderation_decision' then
    return true;
  end if;
  -- Step 2: a row is left out only when everyone in it is now blocked either way; in a grouped row
  -- the others stay, and notification_json() leaves the blocked person out.
  if cardinality(target.actor_user_ids) > 0 and not exists (
      select 1 from unnest(target.actor_user_ids) as actor(id) where not public.is_blocked_with(actor.id)) then
    return false;
  end if;
  -- Step 3: the story's rating, read again now (the writer may have raised it since). A person's
  -- own story always shows: a 16-year-old may write a story rated above their own age band.
  if target.story_id is not null and not exists (
      select 1 from public.stories
      where stories.id = target.story_id
        and (stories.user_id = (select auth.uid()) or public.rating_allows(stories.rating))) then
    return false;
  end if;
  -- Step 4: the chapter must still be readable.
  if target.chapter_id is not null then
    select stories.slug, chapters.code into address
    from public.chapters join public.stories on stories.id = chapters.story_id
    where chapters.id = target.chapter_id;
    if not exists (select 1 from public.readable_chapter(address.slug, address.code)) then
      return false;
    end if;
  end if;
  -- Step 5: the comment must still be live, or hidden only from others.
  if target.comment_id is not null then
    select * into comment from public.comments where comments.id = target.comment_id;
    return public.comment_state_for_caller(comment) in ('live', 'hidden');
  end if;
  return true;
end;
$$;
