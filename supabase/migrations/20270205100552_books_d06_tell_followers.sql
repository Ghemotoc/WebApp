/*
 * Migration: "Tell followers" when a chapter goes out (board D06, user story 5.6; Robert's ask of
 * 25 Nov 2026 that every widget a board draws is built, with its logic).
 *
 * The Publish dialog has a "Tell followers" switch, on by default, with the line "1,284 followers
 * get a notification when it goes out." Until now every chapter told every follower. This adds:
 *   - chapters.tell_followers: the writer's choice for this chapter, kept so a scheduled chapter
 *     remembers it until its time comes (publish_due_chapters());
 *   - publish_chapter() and schedule_chapter() take tell_followers (default true, so every
 *     caller that leaves it out behaves as before) and store it with the chapter;
 *   - chapter_publish_now() puts the choice in the chapter_published job, and
 *     notify_chapter_published() tells nobody when it is false;
 *   - new_chapter_audience(): the people a new chapter of a story tells, now one function that
 *     the notification and the count both read, so the number in the dialog is the number told;
 *   - chapter_followers_to_tell(): that number for the caller's own chapter, for the dialog.
 * The bodies of publish_chapter(), schedule_chapter(), chapter_publish_now() and
 * notify_chapter_published() are copied from the latest versions (CALM-6, TRANSLATE-1a, BOOKS
 * B06, S1-E8-11) with only the tell_followers lines added.
 * Who calls it: PublishPanel through useChapterPublishing (src/features/writing).
 * Database test: 409-tell-followers.
 */

-- Step 1: the writer's choice, kept with the chapter. On by default, as before this migration.
alter table public.chapters
  add column tell_followers boolean not null default true;

comment on column public.chapters.tell_followers is
  'Whether followers hear when this chapter goes out (board D06 "Tell followers"); set by publish_chapter() and schedule_chapter().';

/*
 * new_chapter_audience: everyone a new chapter of this story tells, each once.
 * Input: the story's id. Returns: the people's user ids (never the writer's own).
 * Rules (copied from notify_chapter_published, S1-E7-01): a private story tells nobody (NEW-1);
 * the writer's followers hear only of public stories, and an unlisted one tells only the people
 * who follow that story (NEW-1); a translation tells the writer's followers once, not again, but
 * reaches whoever follows the story in another language (TRANSLATE-1a); a class-only story tells
 * only followers in that class (S1-E8-11).
 * Internal: read by notify_chapter_published() and chapter_followers_to_tell().
 */
create or replace function public.new_chapter_audience(target_story_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with story as (
    select stories.* from public.stories
    where stories.id = target_story_id and stories.visibility <> 'private'
  ),
  followers as (
    select follows_users.user_id from public.follows_users, story
    where follows_users.followed_user_id = story.user_id and story.visibility = 'public'
      and story.edition_of_story_id is null
    union
    select follows_stories.user_id from public.follows_stories, story
    where follows_stories.story_id = story.id
    union
    select follows_stories.user_id from public.follows_stories, story
    where story.edition_of_story_id is not null
      and follows_stories.story_id in (select public.story_family_ids(story.id))
  )
  select followers.user_id from followers, story
  where followers.user_id <> story.user_id
    and (not story.class_only or exists (
      select 1 from public.space_members
      where space_members.space_id = story.class_space_id
        and space_members.user_id = followers.user_id
        and space_members.status = 'active'));
$$;

comment on function public.new_chapter_audience(uuid) is
  'Internal: the people a new chapter of a story tells (S1-E7-01, NEW-1, TRANSLATE-1a, S1-E8-11; board D06).';
revoke execute on function public.new_chapter_audience(uuid) from public, anon, authenticated;

/*
 * chapter_followers_to_tell: how many people hear when the caller's own chapter goes out, for
 * the Publish dialog's "1,284 followers get a notification when it goes out." (board D06).
 * Input: the chapter's code. Returns: the number, or null when the chapter isn't the caller's.
 * It counts the same people new_chapter_audience() tells, so the dialog never promises more.
 */
create or replace function public.chapter_followers_to_tell(chapter_code text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chapter_story_id uuid;
begin
  -- Only the writer of the chapter learns the number (it is their own followers). A plain read,
  -- not my_live_chapter(): that one locks the row, and the API runs a stable function in a
  -- read-only transaction, where a lock is refused.
  select chapters.story_id into chapter_story_id
  from public.chapters
  where chapters.code = chapter_code
    and chapters.user_id = (select auth.uid())
    and chapters.deleted_at is null;
  if chapter_story_id is null then
    return null;
  end if;
  return (select count(*)::integer from public.new_chapter_audience(chapter_story_id));
end;
$$;

comment on function public.chapter_followers_to_tell(text) is
  'How many people a new chapter tells, for the caller''s own chapter; null for anyone else (board D06 "Tell followers").';
revoke execute on function public.chapter_followers_to_tell(text) from public, anon;
grant execute on function public.chapter_followers_to_tell(text) to authenticated;

/*
 * chapter_publish_now: puts a chapter live (S1-E3-03), as before, and now carries the writer's
 * "Tell followers" choice in the chapter_published job (board D06). The choice is read from the
 * table, because publish_chapter() sets it after reading `chapter`.
 * Internal: called by publish_chapter() and publish_due_chapters().
 */
create or replace function public.chapter_publish_now(chapter public.chapters)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_time timestamptz := now();
begin
  update public.chapters set
    status = 'published',
    published_title = chapter.draft_title,
    published_body = chapter.draft_body,
    published_word_count = chapter.word_count,
    first_published_at = coalesce(chapter.first_published_at, published_time),
    last_published_at = published_time,
    scheduled_for = null,
    unpublished_at = null
  where chapters.id = chapter.id;
  update public.stories set
    first_published_at = coalesce(stories.first_published_at, published_time),
    last_chapter_published_at = published_time
  where stories.id = chapter.story_id;
  -- CALM-6: the marked last chapter is out, so the story is Completed. The mark is read from the
  -- table, because publish_chapter() may have set it after reading `chapter`.
  if exists (select 1 from public.chapters where chapters.id = chapter.id and chapters.is_last) then
    update public.stories set completion_status = 'completed' where stories.id = chapter.story_id;
  end if;
  insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
  values (chapter.id, chapter.user_id, chapter.user_id, 'published', chapter.draft_title, chapter.draft_body);
  -- Board D06: the job says whether followers are told.
  insert into public.jobs (kind, payload) values ('chapter_published',
    jsonb_build_object('chapter_id', chapter.id, 'story_id', chapter.story_id,
      'tell_followers', (select chapters.tell_followers from public.chapters where chapters.id = chapter.id)));
end;
$$;

comment on function public.chapter_publish_now(public.chapters) is
  'Internal: puts a chapter live, stamps the story, writes a revision and queues chapter_published with the writer''s Tell followers choice (S1-E3-03, board D06).';

/*
 * notify_chapter_published: tells the story's audience about a new chapter (S1-E7-01), or that
 * the story is finished when the chapter is the marked last (BOOKS B06), unless the writer
 * switched "Tell followers" off for this chapter (board D06). A job queued before this migration
 * has no tell_followers, so it tells followers as before.
 * Internal: called by run_notification_jobs().
 */
create or replace function public.notify_chapter_published(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  story public.stories;
  follower_id uuid;
  wanted_kind public.notification_kind := 'new_chapter';
begin
  -- Board D06: the writer chose not to tell followers about this chapter.
  if coalesce((payload ->> 'tell_followers')::boolean, true) = false then
    return;
  end if;
  select * into story from public.stories where stories.id = (payload ->> 'story_id')::uuid;
  if story.id is null then
    return;
  end if;
  -- BOOKS B06: the chapter the writer marked as the last ends the story, so followers hear
  -- "finished" once instead of "new chapter".
  if exists (select 1 from public.chapters
             where chapters.id = (payload ->> 'chapter_id')::uuid and chapters.is_last
               and chapters.status = 'published' and chapters.deleted_at is null) then
    wanted_kind := 'story_completed';
  end if;
  -- Everyone the chapter tells, by the rules in new_chapter_audience().
  for follower_id in select public.new_chapter_audience(story.id) loop
    perform public.notify(follower_id, wanted_kind, story.user_id,
      jsonb_build_object('story_id', story.id, 'chapter_id', payload ->> 'chapter_id'));
  end loop;
end;
$$;

comment on function public.notify_chapter_published(jsonb) is
  'Internal: a new chapter notifies the followers of its writer and of its story (S1-E7-01); the chapter that ends the story sends story_completed instead (BOOKS B06); nobody when the writer switched Tell followers off (board D06).';

-- Step 2: publish_chapter() and schedule_chapter() take the choice. A new argument changes the
-- functions' signatures, so the old ones go first (nothing in the database calls them).
drop function public.publish_chapter(text, boolean);
drop function public.schedule_chapter(text, timestamptz, boolean);

/*
 * publish_chapter: puts the caller's own chapter live now (S1-E3-03), as the last when as_last
 * (CALM-6), telling followers unless tell_followers is false (board D06).
 * Returns {outcome: ok | not_active | not_found | empty | wrong_state | original_not_published |
 * not_last, published_at}.
 */
create or replace function public.publish_chapter(chapter_code text, as_last boolean default false,
  tell_followers boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  -- Step 1: the caller's own live chapter, a draft or scheduled one with words in it.
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  -- TRANSLATE-1a: a translation goes out only after the chapter it translates.
  if chapter.translation_of_chapter_id is not null and not exists (
      select 1 from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id
        and originals.status = 'published' and originals.deleted_at is null) then
    return jsonb_build_object('outcome', 'original_not_published');
  end if;
  -- Step 2 (CALM-6): the mark only fits a chapter with nothing out or scheduled after it.
  if as_last then
    if public.has_chapter_out_after(chapter.story_id, chapter.position) then
      return jsonb_build_object('outcome', 'not_last');
    end if;
    perform public.mark_chapter_last(chapter);
  end if;
  -- Step 3 (board D06): the writer's "Tell followers" choice, read by chapter_publish_now().
  update public.chapters set tell_followers = coalesce(publish_chapter.tell_followers, true)
  where chapters.id = chapter.id;
  -- Step 4: out now; a marked chapter turns the story Completed (chapter_publish_now()).
  perform public.chapter_publish_now(chapter);
  -- Step 5 (CALM-6, step 7): a chapter out after the marked one takes that mark off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok', 'published_at', now());
end;
$$;

comment on function public.publish_chapter(text, boolean, boolean) is
  'Puts the caller''s own chapter live now, as the last when as_last, telling followers unless tell_followers is false: {outcome: ok | not_active | not_found | empty | wrong_state | original_not_published | not_last} (S1-E3-03, CALM-6, board D06).';
revoke execute on function public.publish_chapter(text, boolean, boolean) from public, anon;
grant execute on function public.publish_chapter(text, boolean, boolean) to authenticated;

/*
 * schedule_chapter: schedules the caller's own draft chapter (S1-E3-03), as the last when
 * as_last (CALM-6), keeping the "Tell followers" choice for when its time comes (board D06).
 * Returns {outcome: ok | not_active | not_found | empty | wrong_state | bad_time |
 * original_not_published | not_last, scheduled_for}.
 */
create or replace function public.schedule_chapter(chapter_code text, publish_at timestamptz,
  as_last boolean default false, tell_followers boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  -- Step 1: the caller's own live chapter, not yet out, with words in it and a time ahead.
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  if publish_at is null or publish_at <= now() or publish_at > now() + interval '1 year' then
    return jsonb_build_object('outcome', 'bad_time');
  end if;
  -- TRANSLATE-1a: a translation goes out only after the chapter it translates.
  if chapter.translation_of_chapter_id is not null and not exists (
      select 1 from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id
        and originals.status = 'published' and originals.deleted_at is null) then
    return jsonb_build_object('outcome', 'original_not_published');
  end if;
  -- Step 2 (CALM-6): the mark only fits a chapter with nothing out or scheduled after it.
  if as_last then
    if public.has_chapter_out_after(chapter.story_id, chapter.position) then
      return jsonb_build_object('outcome', 'not_last');
    end if;
    perform public.mark_chapter_last(chapter);
  end if;
  -- Step 3: scheduled, with the "Tell followers" choice kept for publish_due_chapters().
  update public.chapters set status = 'scheduled', scheduled_for = publish_at,
    tell_followers = coalesce(schedule_chapter.tell_followers, true)
  where chapters.id = chapter.id;
  -- Step 4 (CALM-6, step 7): a chapter scheduled after the marked one takes that mark off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok', 'scheduled_for', publish_at);
end;
$$;

comment on function public.schedule_chapter(text, timestamptz, boolean, boolean) is
  'Schedules the caller''s own draft chapter, as the last when as_last, keeping the Tell followers choice: {outcome: ok | not_active | not_found | empty | wrong_state | bad_time | original_not_published | not_last} (S1-E3-03, CALM-6, board D06).';
revoke execute on function public.schedule_chapter(text, timestamptz, boolean, boolean) from public, anon;
grant execute on function public.schedule_chapter(text, timestamptz, boolean, boolean) to authenticated;
