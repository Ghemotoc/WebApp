/*
 * Migration: a staff-picked reader comment on the home page's cover wall (bundle GAPS-13; story
 * S1-E5-13, parked on 6 Nov 2026 "until staff can pick real comments"; board Website-Home: a
 * small card with the reader's name, "on paragraph 4", the comment and "The Last Tram Home ·
 * Chapter 6").
 *
 * How it works: at Stories › Featured, an admin or the owner sees recent short comments that
 * could go on the home page and invites one. The reader who wrote it gets a notification and an
 * invitation on their own hub, with Agree and Decline. Nothing shows to anyone until the reader
 * agrees, and they can take the agreement back at any time (GDPR art. 6(1)(a) and 7(3): a
 * separate consent for a separate purpose, as easy to withdraw as to give). The home page shows
 * the comment most recently agreed to that can still be shown.
 * What it adds:
 * - home_comment_picks: staff's picks and each reader's answer;
 * - home_comment_can_show(): the one rule for a comment on the site's first picture;
 * - home_comment_card(): the card, for visitors and members;
 * - my_home_comment_invitations() and answer_home_comment_pick(): the reader's side;
 * - admin_home_comment_candidates(), admin_home_comment_picks(), admin_invite_home_comment()
 *   and admin_delete_home_comment_pick(): staff with the featured area, logged.
 * Who calls it: src/features/website/ (HomeCommentCard on the home page, the invitation on the
 * hub and the staff section on the Featured page) and src/features/notifications/.
 * Rules:
 * - Adults only, and only a reader who may be put on show (may_spotlight_writer(), LOOK-4c): the
 *   home page is public, so a minor's name and words never go on it.
 * - Only a comment on a public story rated All ages or 13+, the same as the covers on the wall
 *   (LOOK-2): the card names the story, whoever is looking.
 * - Never a spoiler, a deleted comment or one staff hid or removed; never a user ID (rule 15).
 * - At most 200 characters, so the card stays a card; a comment of its own, never a reply; no
 *   web address.
 * - The story's writer may be put on show too (may_spotlight_writer()), because the card names
 *   the story.
 */

create table public.home_comment_picks (
  id uuid primary key default gen_random_uuid(),
  -- The reader who wrote the comment, whose agreement this row records.
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  -- The staff member who picked it.
  picked_by_user_id uuid references public.profiles (id),
  -- The reader's answer: neither while it waits, one of the two afterwards.
  agreed_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Staff took the pick down; the audit log keeps it.
  deleted_at timestamptz,
  constraint home_comment_picks_one_answer check (agreed_at is null or declined_at is null)
);

comment on table public.home_comment_picks is
  'kind: user_action
Comments staff asked to show on the home page, and each reader''s answer: agreed, declined or still waiting (GAPS-13). Personal data: the link between a reader, their comment and their consent.';

-- One live pick per comment: inviting the same comment twice is refused (unique_violation).
create unique index home_comment_picks_one_per_comment on public.home_comment_picks (comment_id)
  where deleted_at is null;
create index home_comment_picks_by_reader on public.home_comment_picks (user_id) where deleted_at is null;

create trigger home_comment_picks_set_updated_at
  before update on public.home_comment_picks
  for each row execute function public.set_updated_at();
create trigger home_comment_picks_refuse_user_id_change
  before update on public.home_comment_picks
  for each row execute function public.refuse_user_id_change();
alter table public.home_comment_picks enable row level security;

/**
 * home_comment_picks_select_own: a reader reads the picks of their own comments that staff
 * haven't taken down. Writes go through answer_home_comment_pick().
 */
create policy home_comment_picks_select_own
  on public.home_comment_picks for select to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null);
comment on policy home_comment_picks_select_own on public.home_comment_picks is
  'Allows a reader to read the picks of their own comments, so they can answer the invitation (GAPS-13).';

/**
 * home_comment_picks_select_featured_staff: staff with the featured area (the owner and admins)
 * read every pick that isn't taken down, for the staff page. Writes go through the admin
 * functions.
 */
create policy home_comment_picks_select_featured_staff
  on public.home_comment_picks for select to authenticated
  using (deleted_at is null and (select public.staff_may('featured', 'view')));
comment on policy home_comment_picks_select_featured_staff on public.home_comment_picks is
  'Allows staff with the featured area to read the home page comment picks that aren''t taken down (GAPS-13).';

grant select on public.home_comment_picks to authenticated;

/**
 * home_comment_can_show: the one rule for a comment on the home page. It asks nothing about the
 * caller, so the card is the same for every visitor.
 * Input: target_comment (the comment's ID). Returns: true when the comment may be shown.
 * True only when: the comment isn't deleted, a spoiler, a reply, hidden or removed, has 1 to 200
 * characters and no web address; its writer is an adult with an active account who may be put
 * on show; its chapter is published; and its story is public, not class-only, rated All ages or
 * 13+, not hidden or removed, by a writer who may be put on show.
 */
create function public.home_comment_can_show(target_comment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.comments
    join public.chapters on chapters.id = comments.chapter_id
    join public.stories on stories.id = chapters.story_id
    where comments.id = target_comment
      -- The comment itself.
      and comments.deleted_at is null
      and not comments.is_spoiler
      and char_length(btrim(comments.body)) between 1 and 200
      -- A comment of its own, not a reply (a reply reads oddly without what it answers), and
      -- without a web address: the home page carries no member's link.
      and comments.parent_comment_id is null
      and comments.body !~* '(https?://|www\.|mailto:)'
      and not public.is_moderated_away('comment', comments.id)
      -- Its writer: an adult who may be put on show (LOOK-4c; minors never on the home page).
      and public.age_band_of(comments.user_id) = '18_plus'
      and public.may_spotlight_writer(comments.user_id)
      -- Its chapter and story: what any visitor may open, rated like the wall's covers (LOOK-2).
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
      and stories.deleted_at is null
      and stories.visibility = 'public'
      and not stories.class_only
      and stories.rating in ('all_ages', '13_plus')
      and stories.title_hidden_at is null
      -- The card names the story, so its writer must be one who may be put on show too.
      and public.may_spotlight_writer(stories.user_id)
      and not public.is_moderated_away('story', stories.id)
  );
$$;

comment on function public.home_comment_can_show(uuid) is
  'Internal: whether a comment may be shown on the home page: a short, live comment by an adult who may be put on show, on a public story rated All ages or 13+ (GAPS-13).';
revoke all on function public.home_comment_can_show(uuid) from public, anon, authenticated;

/**
 * home_comment_card: the comment on the home page's cover wall.
 * Inputs: none. Returns: one row at most: the reader's handle and display name, the comment,
 *   the paragraph it is on (null for a comment on the whole chapter or when the writer has since
 *   changed the paragraph), the story's title and the chapter's number. The row is the pick most
 *   recently agreed to that can still be shown; no row when there is none. A signed-in caller
 *   never gets a comment by, or on a story by, someone blocked either way (rule 6).
 * Never a user ID. Open to visitors: the home page is public.
 * Flow: HomeCommentCard → useHomeComment → api/homeComment.ts → this function.
 */
create function public.home_comment_card()
returns table (
  handle text,
  display_name text,
  body text,
  paragraph_number integer,
  story_title text,
  chapter_position integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profiles.handle,
    public.display_name(profiles.handle, profiles.pen_name),
    btrim(comments.body),
    -- A number only while the paragraph is still where the comment was left (IDEAS-1e).
    case when jsonb_typeof(place.now) = 'number' then (place.now #>> '{}')::integer end,
    stories.title,
    chapters.position
  from public.home_comment_picks as picks
  join public.comments on comments.id = picks.comment_id
  join public.profiles on profiles.id = comments.user_id
  join public.chapters on chapters.id = comments.chapter_id
  join public.stories on stories.id = chapters.story_id
  cross join lateral (select public.comment_paragraph_json(comments, chapters.published_body) as now) as place
  where picks.deleted_at is null
    and picks.agreed_at is not null
    and public.home_comment_can_show(comments.id)
    and not public.is_blocked_with(comments.user_id)
    and not public.is_blocked_with(stories.user_id)
  order by picks.agreed_at desc
  limit 1;
$$;

comment on function public.home_comment_card() is
  'The reader comment on the home page: the pick most recently agreed to that can still be shown; never a user ID (GAPS-13).';
revoke all on function public.home_comment_card() from public;
grant execute on function public.home_comment_card() to anon, authenticated;

/**
 * my_home_comment_invitations: the caller's own invitations, newest first.
 * Inputs: none. Returns: the pick's ID, the comment, the story's title, the chapter's number and
 *   the answer ('waiting', 'agreed' or 'declined'). Only picks staff haven't taken down and
 *   whose comment can still be shown, so there is never an invitation that can't be acted on.
 * Flow: HomeCommentInvitations → useHomeCommentInvitations → api/homeComment.ts → here.
 */
create function public.my_home_comment_invitations()
returns table (
  pick_id uuid,
  body text,
  story_title text,
  chapter_position integer,
  answer text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    picks.id,
    btrim(comments.body),
    stories.title,
    chapters.position,
    case when picks.agreed_at is not null then 'agreed'
         when picks.declined_at is not null then 'declined'
         else 'waiting' end
  from public.home_comment_picks as picks
  join public.comments on comments.id = picks.comment_id
  join public.chapters on chapters.id = comments.chapter_id
  join public.stories on stories.id = chapters.story_id
  where picks.user_id = (select auth.uid())
    and picks.deleted_at is null
    and public.home_comment_can_show(comments.id)
    -- A declined invitation stays 30 days, in case the reader changes their mind, then goes.
    and (picks.declined_at is null or picks.declined_at > now() - interval '30 days')
  order by picks.created_at desc;
$$;

comment on function public.my_home_comment_invitations() is
  'The caller''s own invitations to show a comment on the home page, with their answer (GAPS-13).';
revoke all on function public.my_home_comment_invitations() from public, anon;
grant execute on function public.my_home_comment_invitations() to authenticated;

/**
 * answer_home_comment_pick: the reader agrees, declines or changes their mind.
 * Inputs: pick_id and agrees (true to agree; false to decline or to withdraw an agreement).
 * Returns: 'agreed' or 'declined'.
 * Errors: no_data_found unless the pick is the caller's own and staff haven't taken it down.
 * The answer can change at any time (GDPR art. 7(3)); the home page follows at once.
 */
create function public.answer_home_comment_pick(pick_id uuid, agrees boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.home_comment_picks;
begin
  -- Only the reader who wrote the comment, only a pick that still exists.
  update public.home_comment_picks set
    agreed_at = case when coalesce(agrees, false) then now() else null end,
    declined_at = case when coalesce(agrees, false) then null else now() end
  where id = pick_id
    and user_id = (select auth.uid())
    and deleted_at is null
  returning * into saved;
  if saved.id is null then
    raise exception 'There is no such invitation.' using errcode = 'no_data_found';
  end if;
  return case when saved.agreed_at is not null then 'agreed' else 'declined' end;
end;
$$;

comment on function public.answer_home_comment_pick(uuid, boolean) is
  'A reader agrees to, declines or withdraws from having their comment on the home page (GAPS-13; GDPR art. 7(3)).';
revoke all on function public.answer_home_comment_pick(uuid, boolean) from public, anon;
grant execute on function public.answer_home_comment_pick(uuid, boolean) to authenticated;

/**
 * admin_home_comment_candidates: recent comments that could go on the home page, newest first.
 * Inputs: none. Returns: up to 40 comments from the last 90 days that pass
 *   home_comment_can_show() and have no live pick: the comment's ID, the reader's handle and
 *   display name, the comment, the story's title, the chapter's number and when it was written.
 * Errors: insufficient_privilege unless the caller may view the featured area.
 * Every comment listed here is already public on its chapter.
 */
create function public.admin_home_comment_candidates()
returns table (
  comment_id uuid,
  handle text,
  display_name text,
  body text,
  story_title text,
  chapter_position integer,
  written_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('featured', 'view') then
    raise exception 'Only staff with the featured area can see these comments.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select comments.id, profiles.handle, public.display_name(profiles.handle, profiles.pen_name),
      btrim(comments.body), stories.title, chapters.position, comments.created_at
    from public.comments
    join public.profiles on profiles.id = comments.user_id
    join public.chapters on chapters.id = comments.chapter_id
    join public.stories on stories.id = chapters.story_id
    where comments.created_at > now() - interval '90 days'
      and comments.deleted_at is null
      and public.home_comment_can_show(comments.id)
      and not exists (select 1 from public.home_comment_picks as picks
                      where picks.comment_id = comments.id and picks.deleted_at is null)
    order by comments.created_at desc
    limit 40;
end;
$$;

comment on function public.admin_home_comment_candidates() is
  'Staff with the featured area: recent short public comments that could be shown on the home page (GAPS-13).';
revoke all on function public.admin_home_comment_candidates() from public, anon;
grant execute on function public.admin_home_comment_candidates() to authenticated;

/**
 * admin_home_comment_picks: the picks that aren't taken down, newest first, for the staff page.
 * Inputs: none. Returns: the pick's ID, the reader's handle and display name, the comment, the
 *   story's title, the chapter's number, the answer ('waiting', 'agreed' or 'declined'), whether
 *   the comment can still be shown and whether it is the one on the home page now.
 * Errors: insufficient_privilege unless the caller may view the featured area.
 */
create function public.admin_home_comment_picks()
returns table (
  pick_id uuid,
  handle text,
  display_name text,
  body text,
  story_title text,
  chapter_position integer,
  answer text,
  can_show boolean,
  is_on_home_page boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  shown_pick uuid;
begin
  if not public.staff_may('featured', 'view') then
    raise exception 'Only staff with the featured area can see these picks.' using errcode = 'insufficient_privilege';
  end if;
  -- The pick visitors see: the same choice as home_comment_card(), without the caller's blocks.
  select picks.id into shown_pick
  from public.home_comment_picks as picks
  where picks.deleted_at is null and picks.agreed_at is not null
    and public.home_comment_can_show(picks.comment_id)
  order by picks.agreed_at desc limit 1;
  return query
    select picks.id, profiles.handle, public.display_name(profiles.handle, profiles.pen_name),
      btrim(comments.body), stories.title, chapters.position,
      case when picks.agreed_at is not null then 'agreed'
           when picks.declined_at is not null then 'declined'
           else 'waiting' end,
      public.home_comment_can_show(comments.id),
      picks.id is not distinct from shown_pick
    from public.home_comment_picks as picks
    join public.comments on comments.id = picks.comment_id
    join public.profiles on profiles.id = comments.user_id
    join public.chapters on chapters.id = comments.chapter_id
    join public.stories on stories.id = chapters.story_id
    where picks.deleted_at is null
    order by picks.created_at desc;
end;
$$;

comment on function public.admin_home_comment_picks() is
  'Staff with the featured area: the home page comment picks with each reader''s answer and which one is showing (GAPS-13).';
revoke all on function public.admin_home_comment_picks() from public, anon;
grant execute on function public.admin_home_comment_picks() to authenticated;

/**
 * admin_invite_home_comment: staff ask a reader whether one of their comments may go on the
 * home page.
 * Input: target_comment (the comment's ID, from admin_home_comment_candidates()).
 * Returns: the pick's ID.
 * Errors: insufficient_privilege unless the caller may act on the featured area;
 *   check_violation when the comment can't be shown (see home_comment_can_show());
 *   unique_violation when the comment already has a live pick.
 * The reader gets one notification; the invitation waits on their hub. Logged as
 * home_comment.invited.
 */
create function public.admin_invite_home_comment(target_comment uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reader_id uuid;
  saved public.home_comment_picks;
begin
  -- Step 1: staff with the featured area only (the server decides, architecture 1.8.1).
  if not public.staff_may('featured', 'act') then
    raise exception 'Only staff with the featured area can pick a home page comment.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the comment must be one the home page may show.
  if target_comment is null or not public.home_comment_can_show(target_comment) then
    raise exception 'This comment can''t be shown on the home page.' using errcode = 'check_violation';
  end if;
  select comments.user_id into reader_id from public.comments where comments.id = target_comment;
  -- Step 3: the pick, waiting for the reader's answer.
  insert into public.home_comment_picks (user_id, comment_id, picked_by_user_id)
  values (reader_id, target_comment, (select auth.uid()))
  returning * into saved;
  -- Step 4: tell the reader, with no actor (it comes from the team), and log it.
  perform public.notify(reader_id, 'home_comment_invited', null,
    jsonb_build_object('comment_id', target_comment));
  perform public.log_staff_action('home_comment.invited', 'home_comment_picks', saved.id::text, reader_id, null,
    null, jsonb_build_object('comment_id', target_comment));
  return saved.id;
end;
$$;

comment on function public.admin_invite_home_comment(uuid) is
  'Staff with the featured area invite a reader to have one comment shown on the home page; the reader is told; logged (GAPS-13).';
revoke all on function public.admin_invite_home_comment(uuid) from public, anon;
grant execute on function public.admin_invite_home_comment(uuid) to authenticated;

/**
 * admin_delete_home_comment_pick: takes a pick down, whatever the reader answered; the home page
 * follows at once and the audit log keeps the pick.
 * Input: pick_id. Returns: true.
 * Errors: insufficient_privilege unless the caller may act on the featured area; no_data_found
 *   for an unknown pick.
 */
create function public.admin_delete_home_comment_pick(pick_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted public.home_comment_picks;
begin
  if not public.staff_may('featured', 'act') then
    raise exception 'Only staff with the featured area can pick a home page comment.' using errcode = 'insufficient_privilege';
  end if;
  update public.home_comment_picks set deleted_at = now()
  where id = pick_id and deleted_at is null returning * into deleted;
  if deleted.id is null then
    raise exception 'There is no such pick.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('home_comment.removed', 'home_comment_picks', deleted.id::text, deleted.user_id, null,
    jsonb_build_object('comment_id', deleted.comment_id, 'agreed', deleted.agreed_at is not null), null);
  return true;
end;
$$;

comment on function public.admin_delete_home_comment_pick(uuid) is
  'Staff with the featured area take a home page comment pick down; logged (GAPS-13).';
revoke all on function public.admin_delete_home_comment_pick(uuid) from public, anon;
grant execute on function public.admin_delete_home_comment_pick(uuid) to authenticated;

/* ---------- Notifications ---------- */

/**
 * notification_category: as before, plus home_comment_invited under staff messages (the group
 *   the spotlight invitations are in), because it is staff asking the member something.
 */
CREATE OR REPLACE FUNCTION public.notification_category(kind notification_kind)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
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
    else 'replies'
  end;
$$;

/* ---------- Download my data and account deletion ---------- */

-- Unchanged except for the new table, which is in Download my data.
CREATE OR REPLACE FUNCTION public.data_export_tables()
 RETURNS TABLE(table_name text, is_included boolean, why_left_out text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_moves', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_list_stories', true, null),
    ('reading_lists', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h, GAPS-13).';

-- Unchanged except for the new table: the picks go with the account.
CREATE OR REPLACE FUNCTION public.account_deletion_rules()
 RETURNS TABLE(table_name text, action text, step integer, why text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_moves', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('contest_entries', 'delete', 1, null),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_list_stories', 'delete', 1, null),
    ('reading_lists', 'delete', 2, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h, GAPS-13).';
