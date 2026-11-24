/*
 * The end of a story tells followers once (BOOKS B06, user story 2.6, board B06-ReaderLast;
 * CALM-6 built the mark and the Completed status).
 *
 * Story 2.6: "Followers get one notification: inkwolf finished The Salt Mine Choir."
 *
 * What it does:
 *   1. notify_chapter_published(): when the chapter the job is about holds the writer's
 *      "This is the last chapter" mark, each follower gets one 'story_completed' notification
 *      instead of 'new_chapter'. Who hears is unchanged (the writer's followers for a public story,
 *      the story's followers, a translation's followers in other languages, class members only
 *      for a class story).
 *   2. default_email_delivery() and email_delivery_for(): 'story_completed' follows the reader's
 *      email choice for new chapters (a daily digest by default), so it needs no switch of its own.
 *   3. notification_category(): 'story_completed' sits under Stories with new chapters.
 * Privacy: no personal data; the row names the story and the writer, as a new chapter's does.
 * Who calls it: run_notification_jobs() for each chapter_published job (publish_chapter() and
 *   publish_due_chapters()).
 * Tests: supabase/tests/database/404-story-completed-notification.test.sql.
 */

/* ---------- 1. One notification at the end of a story ---------- */

/*
 * notify_chapter_published: tells the followers of a story's writer and of the story about a
 * chapter that just went live. The chapter that ends the story (chapters.is_last, CALM-6) sends
 * 'story_completed' ("inkwolf finished …") instead of 'new_chapter', so followers hear once.
 * Inputs: payload with story_id and chapter_id (the chapter_published job).
 * Returns: nothing. Errors: none; a missing or private story tells nobody.
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
  select * into story from public.stories where stories.id = (payload ->> 'story_id')::uuid;
  -- NEW-1: a private story tells nobody.
  if story.id is null or story.visibility = 'private' then
    return;
  end if;
  -- BOOKS B06: the chapter the writer marked as the last ends the story, so followers hear
  -- "finished" once instead of "new chapter".
  if exists (select 1 from public.chapters
             where chapters.id = (payload ->> 'chapter_id')::uuid and chapters.is_last
               and chapters.status = 'published' and chapters.deleted_at is null) then
    wanted_kind := 'story_completed';
  end if;
  for follower_id in
    -- NEW-1: the writer's followers hear only of public stories; an unlisted story tells only
    -- the people who follow that story.
    select follows_users.user_id from public.follows_users
    where follows_users.followed_user_id = story.user_id and story.visibility = 'public'
      -- TRANSLATE-1a: not again for a translation.
      and story.edition_of_story_id is null
    union
    select follows_stories.user_id from public.follows_stories where follows_stories.story_id = story.id
    union
    -- TRANSLATE-1a: a translation also tells whoever follows the story in another language.
    select follows_stories.user_id from public.follows_stories
    where story.edition_of_story_id is not null
      and follows_stories.story_id in (select public.story_family_ids(story.id))
  loop
    -- S1-E8-11: a chapter of a class-only story tells only followers who are in that class, so
    -- nobody else learns its title.
    if story.class_only and not exists (
      select 1 from public.space_members
      where space_members.space_id = story.class_space_id
        and space_members.user_id = follower_id
        and space_members.status = 'active'
    ) then
      continue;
    end if;
    perform public.notify(follower_id, wanted_kind, story.user_id,
      jsonb_build_object('story_id', story.id, 'chapter_id', payload ->> 'chapter_id'));
  end loop;
end;
$$;

comment on function public.notify_chapter_published(jsonb) is
  'Internal: a new chapter notifies the followers of its writer and of its story (S1-E7-01); the chapter that ends the story sends story_completed instead (BOOKS B06).';

/* ---------- 2. Email follows the new-chapter choice ---------- */

/*
 * default_email_delivery: the email default per notification kind (S1-E7-02). BOOKS B06 adds
 * 'story_completed', which goes out like a new chapter: in the daily digest.
 */
create or replace function public.default_email_delivery(kind public.notification_kind)
returns public.email_delivery
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'comment_reply' then 'instant'
    when 'new_chapter' then 'daily'
    when 'story_completed' then 'daily'
    when 'comment_on_chapter' then 'daily'
    when 'new_follower' then 'daily'
    when 'comment_reactions' then 'off'
  end::public.email_delivery;
$$;

comment on function public.default_email_delivery(public.notification_kind) is
  'Internal: the email default per notification kind (S1-E7-02).';

/*
 * email_delivery_for: how one person gets one kind by email (S1-E7-02). BOOKS B06: the end of a
 * story reads the person's choice for new chapters, as it is the last of them; Settings keeps
 * its four switches.
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended', 'data_request_copy_ready',
                  'picture_opened_by_staff', 'waitlist_admitted',
                  'account_unused_month', 'account_unused_week',
                  'account_unused_nudge', 'account_unused_closed') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id
         and settings.kind = case when email_delivery_for.kind = 'story_completed'
                                  then 'new_chapter'::public.notification_kind
                                  else email_delivery_for.kind end),
      public.default_email_delivery(kind))::text
  end;
$$;

/* ---------- 3. The filter chip ---------- */

/*
 * notification_category: the filter chip a kind sits under (S1-E7-01). BOOKS B06: the end of a
 * story sits under Stories, with new chapters.
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'live_session_soon' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    when 'waitlist_admitted' then 'staff'
    when 'home_comment_invited' then 'staff'
    when 'account_unused_month' then 'staff'
    when 'account_unused_week' then 'staff'
    when 'account_unused_nudge' then 'staff'
    when 'account_unused_closed' then 'staff'
    when 'class_competition_won' then 'staff'
    when 'class_competition_results' then 'staff'
    when 'class_readers_choice' then 'staff'
    when 'comments_resumed' then 'stories'
    when 'story_completed' then 'stories'
    else 'replies'
  end;
$$;

comment on function public.notification_category(public.notification_kind) is
  'Internal: the filter chip a notification kind sits under (S1-E7-01).';

comment on function public.email_delivery_for(uuid, public.notification_kind) is
  'Internal: one person''s email delivery for one notification kind (S1-E7-02); story_completed follows the new_chapter choice (BOOKS B06).';
