/*
 * Migration: follow a forum thread and hear about new replies (bundle GAPS-16, part a; story
 * S1-E8-02; board 5.2, "Follow thread" in the thread's side column).
 *
 * How it works: on a thread page a signed-in member presses Follow. From then on, each new reply
 * by someone else puts a notification in their list: one row per thread a day, which grows
 * ("Ana and 3 others replied in …") instead of a row per reply. Starting a thread follows it
 * straight away, so the starter hears about answers; Unfollow stops it.
 * What it adds:
 * - forum_thread_follows: who follows which thread (a user action, private to the follower);
 * - notifications.forum_thread_id: the thread a 'forum_reply' row is about;
 * - forum_thread_follow_on_post(): the trigger on forum_posts that follows a new thread for its
 *   starter and tells the followers about a reply;
 * - follow_forum_thread(): the Follow and Unfollow button;
 * - notify(), notification_json(), notification_is_shown() and forum_thread_header_json()
 *   recreated with the thread in them;
 * - the new table in Download my data and in account deletion.
 * Who calls it: src/features/forums/ (ThreadFollowButton in ThreadSidePanel) and
 * src/features/notifications/ (forumReplyText).
 * Rules:
 * - Never one's own reply, never across a block (notify()).
 * - A follower who can no longer open the thread (a space they left, a thread staff hid or
 *   removed, a starter they block) doesn't see the row: notification_is_shown() asks the same
 *   question the thread page asks, as the reader.
 * - Following is private: nobody else sees who follows a thread, and there is no follower count.
 */

create table public.forum_thread_follows (
  id uuid primary key default gen_random_uuid(),
  -- The member who follows the thread (rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_thread_follows_one_per_thread unique (user_id, thread_id)
);

comment on table public.forum_thread_follows is
  'kind: user_action
Which forum threads a member follows, so new replies reach their notifications (GAPS-16a). Private to the member.';

create index forum_thread_follows_thread_id_fk_idx on public.forum_thread_follows (thread_id);

create trigger forum_thread_follows_set_updated_at
  before update on public.forum_thread_follows
  for each row execute function public.set_updated_at();
create trigger forum_thread_follows_refuse_user_id_change
  before update on public.forum_thread_follows
  for each row execute function public.refuse_user_id_change();
alter table public.forum_thread_follows enable row level security;

/**
 * forum_thread_follows_select_own: a member reads their own follows only. Nobody else does, staff
 * included: who follows a thread is nobody's business. Writes go through follow_forum_thread()
 * and the trigger on forum_posts.
 */
create policy forum_thread_follows_select_own
  on public.forum_thread_follows for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy forum_thread_follows_select_own on public.forum_thread_follows is
  'Allows a member to read the forum threads they follow, and nobody else''s (GAPS-16a).';

grant select on public.forum_thread_follows to authenticated;

alter table public.notifications
  add column forum_thread_id uuid references public.forum_threads (id) on delete cascade;
comment on column public.notifications.forum_thread_id is
  'The followed forum thread a forum_reply notification is about (GAPS-16a).';
create index notifications_forum_thread_id_fk_idx on public.notifications (forum_thread_id)
  where forum_thread_id is not null;

/**
 * forum_thread_follow_on_post: runs after every new forum post.
 * - The first post of a thread: its writer follows the thread, so they hear about answers.
 * - A reply: each follower except its writer gets the thread's forum_reply row for the day, or
 *   the row they already have grows by one person (notify() groups by thread for 24 hours and
 *   skips blocks either way).
 * Inputs: the new forum_posts row. Returns: nothing (an after trigger). Errors: none of its own.
 * Where it fits: start_forum_thread() and reply_to_forum_thread() insert the post; this follows.
 */
create function public.forum_thread_follow_on_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  follower record;
begin
  -- Step 1: a new thread is followed by the person who started it.
  if new.post_number = 1 then
    insert into public.forum_thread_follows (user_id, thread_id)
    values (new.user_id, new.thread_id)
    on conflict on constraint forum_thread_follows_one_per_thread do nothing;
    return null;
  end if;
  -- Step 2: a reply reaches every other follower, one grouped row per thread a day.
  for follower in
    select follows.user_id from public.forum_thread_follows as follows
    where follows.thread_id = new.thread_id and follows.user_id <> new.user_id
  loop
    perform public.notify(follower.user_id, 'forum_reply', new.user_id,
      jsonb_build_object('forum_thread_id', new.thread_id),
      'forum_reply:' || new.thread_id::text, interval '24 hours');
  end loop;
  return null;
end;
$$;

comment on function public.forum_thread_follow_on_post() is
  'Trigger: a thread''s starter follows it; a reply tells the other followers (GAPS-16a).';
revoke all on function public.forum_thread_follow_on_post() from public, anon, authenticated;

create trigger forum_posts_follow_on_insert
  after insert on public.forum_posts
  for each row execute function public.forum_thread_follow_on_post();

/**
 * follow_forum_thread: the Follow and Unfollow button on a thread page.
 * Inputs: the thread's number and whether the caller wants to follow it.
 * Returns: true while the caller follows the thread, false once they don't.
 * Errors: insufficient_privilege when signed out; no_data_found (hint thread:missing) when the
 * caller can't open the thread. Unfollowing needs no check, so a member can always stop.
 * Where it fits: ThreadFollowButton → useThreadFollow → here.
 */
create function public.follow_forum_thread(thread_number bigint, wanted boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  thread public.forum_threads;
begin
  -- Step 1: only a signed-in member follows anything.
  if caller_id is null then
    raise exception 'Log in to follow a thread.' using errcode = 'insufficient_privilege';
  end if;
  select * into thread from public.forum_threads
  where forum_threads.thread_number = follow_forum_thread.thread_number;
  -- Step 2: unfollowing always works, even for a thread the caller can no longer open.
  if not coalesce(wanted, false) then
    delete from public.forum_thread_follows
    where forum_thread_follows.user_id = caller_id and forum_thread_follows.thread_id = thread.id;
    return false;
  end if;
  -- Step 3: following needs a thread the caller may open (the same rule as the thread page).
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  insert into public.forum_thread_follows (user_id, thread_id) values (caller_id, thread.id)
  on conflict on constraint forum_thread_follows_one_per_thread do nothing;
  return true;
end;
$$;

comment on function public.follow_forum_thread(bigint, boolean) is
  'Follows or unfollows a forum thread for the caller; returns whether they follow it now (GAPS-16a).';
revoke all on function public.follow_forum_thread(bigint, boolean) from public, anon;
grant execute on function public.follow_forum_thread(bigint, boolean) to authenticated;

/* ---------- Notifications ---------- */

-- notify(): unchanged except that it stores forum_thread_id from `about`.
CREATE OR REPLACE FUNCTION public.notify(recipient_id uuid, notification_kind notification_kind, actor_id uuid, about jsonb, group_key text DEFAULT NULL::text, group_window interval DEFAULT NULL::interval)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  grouped public.notifications;
begin
  -- Step 1: never one's own action, never across a block.
  if recipient_id is null or recipient_id = actor_id then
    return;
  end if;
  if actor_id is not null and exists (
      select 1 from public.blocks
      where (blocks.user_id = recipient_id and blocks.blocked_user_id = actor_id)
         or (blocks.user_id = actor_id and blocks.blocked_user_id = recipient_id)) then
    return;
  end if;
  -- Step 2: a fresh grouped row takes the new person instead of a new row.
  if notify.group_key is not null then
    select * into grouped from public.notifications
    where notifications.user_id = recipient_id and notifications.group_key = notify.group_key
      and notifications.created_at > now() - group_window
    order by notifications.created_at desc limit 1
    for update;
    if grouped.id is not null then
      if actor_id = any (grouped.actor_user_ids) then
        return;
      end if;
      update public.notifications set
        actor_user_ids = (array[actor_id] || grouped.actor_user_ids)[1:50],
        actor_count = grouped.actor_count + 1,
        read_at = null,
        updated_at = now()
      where notifications.id = grouped.id;
      return;
    end if;
  end if;
  -- Step 3: a new row; a decision, an appeal's outcome or a staff change can't be switched off
  -- (DSA art. 17, 20; S1-E11-08), nor can a data request's notice (GDPR art. 12; S1-E11-09) or
  -- the alert that staff opened an uploaded picture (ADMIN-2e2a).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id,
    story_revision_id, data_request_id, landing_page_id, live_session_id, forum_thread_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, (about ->> 'data_request_id')::uuid,
    (about ->> 'landing_page_id')::uuid, (about ->> 'live_session_id')::uuid,
    (about ->> 'forum_thread_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff', 'data_request_confirm',
                          'data_request_extended', 'data_request_copy_ready', 'picture_opened_by_staff'));
end;
$$;


-- notification_json(): unchanged except for 'forum_thread'.
CREATE OR REPLACE FUNCTION public.notification_json(target notifications)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    -- ADMIN-2b3: the title as the recipient may see it (S1-E11-08).
    'story', (select jsonb_build_object('slug', stories.slug, 'title', (public.story_as_shown(stories)).title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    -- FORUMS-2c: the space a join request or approval is about, while the reader may see it.
    'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
              from public.spaces where spaces.id = target.space_id and spaces.deleted_at is null
                and public.space_card_visible(spaces)),
    -- FORUMS-2d: what a moderator asked the person to change, why, and by when.
    'change_request', (select jsonb_build_object('item', requests.item, 'reason', requests.reason,
                         'due_at', requests.due_at, 'is_open', requests.resolved_at is null,
                         'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
                                   from public.spaces where spaces.id = requests.space_id))
                       from public.customisation_change_requests as requests
                       where requests.id = target.change_request_id),
    -- ADMIN-2b1: what staff changed about the writer's story, and why (S1-E11-08 criterion 4).
    'staff_change', case when target.kind = 'story_changed_by_staff'
                      then public.notification_staff_change_json(target.story_revision_id) end,
    -- ADMIN-2c1: the data request a notice is about: its reference, deadline and why it moved.
    'data_request', (select jsonb_build_object('reference', data_requests.reference,
                       'deadline', public.data_request_deadline(data_requests),
                       'extension_reason', data_requests.extension_reason)
                     from public.data_requests where data_requests.id = target.data_request_id),
    -- CONTESTS-13a2b: the landing page whose entries opened, with its title in each language,
    -- while the page is still up (an archived page gives null, and the row has no link).
    'landing_page', (select jsonb_build_object('slug', pages.slug,
                       'title_ro', live.content #>> '{blocks,0,ro,title}',
                       'title_en', live.content #>> '{blocks,0,en,title}')
                     from public.landing_pages as pages
                     cross join lateral public.landing_page_live_version(pages.id) as live
                     where pages.id = target.landing_page_id and pages.archived_at is null
                       and live.id is not null),
    -- GAPS-12h: the live session about to start, with its title in each language, while it is
    -- still listed (a deleted session gives null, and the row has no link).
    'live_session', (select jsonb_build_object('title_ro', live_sessions.title_ro,
                       'title_en', live_sessions.title_en, 'starts_at', live_sessions.starts_at)
                     from public.live_sessions
                     where live_sessions.id = target.live_session_id and live_sessions.deleted_at is null),
    -- GAPS-16a: the followed thread with new replies, while the reader may still open it.
    'forum_thread', (select jsonb_build_object('number', forum_threads.thread_number,
                       'forum_slug', (select forums.slug from public.forums
                                      where forums.id = forum_threads.forum_id),
                       'title', forum_threads.title)
                     from public.forum_threads
                     where forum_threads.id = target.forum_thread_id
                       and public.forum_thread_is_shown(forum_threads)),
    -- IDEAS-3a: the rank a writer just reached, and their own handle for the link to their profile.
    'writer_rank', case when target.kind = 'rank_reached' then target.writer_rank end,
    'own_handle', case when target.kind = 'rank_reached'
                    then (select profiles.handle from public.profiles where profiles.id = target.user_id) end,
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;


-- notification_is_shown(): unchanged except for step 5, the followed thread.
CREATE OR REPLACE FUNCTION public.notification_is_shown(target notifications)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  address record;
  comment public.comments;
  thread public.forum_threads;
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
  -- Step 5 (GAPS-16a): a followed thread must still be one the reader may open: not deleted,
  -- not moderated away, not in a space they have left, not started by someone they block.
  if target.forum_thread_id is not null then
    select * into thread from public.forum_threads where forum_threads.id = target.forum_thread_id;
    if thread.id is null or not public.forum_thread_is_shown(thread) then
      return false;
    end if;
  end if;
  -- Step 6: the comment must still be live, or hidden only from others.
  if target.comment_id is not null then
    select * into comment from public.comments where comments.id = target.comment_id;
    return public.comment_state_for_caller(comment) in ('live', 'hidden');
  end if;
  return true;
end;
$$;


/* ---------- The thread page ---------- */

-- forum_thread_header_json(): unchanged except for 'is_following'.
CREATE OR REPLACE FUNCTION public.forum_thread_header_json(target forum_threads)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select jsonb_build_object(
    'id', target.id,
    'number', target.thread_number,
    'title', target.title,
    'forum_slug', (select forums.slug from public.forums where forums.id = target.forum_id),
    'space', (select jsonb_build_object('slug', space.slug, 'name', space.name)
              from public.space_of_forum(target.forum_id) as space where space.id is not null),
    'author', public.forum_person_json(target.user_id),
    'is_mine', target.user_id = (select auth.uid()),
    -- GAPS-16a: whether the reader follows this thread (false when signed out).
    'is_following', exists (select 1 from public.forum_thread_follows as follows
                            where follows.thread_id = target.id
                              and follows.user_id = (select auth.uid())),
    'state', case when public.moderated_state_of('forum_thread', target.id) = 'hidden' then 'hidden' else 'live' end,
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'writer_count', (select count(distinct forum_posts.user_id)::integer from public.forum_posts
                     where forum_posts.thread_id = target.id
                       and public.forum_post_state_for_caller(forum_posts) in ('live', 'hidden')),
    'last_post_at', target.last_post_at,
    'last_post_number', target.last_post_number,
    'is_sticky', target.is_sticky,
    'lock', case when target.locked_at is null then null
                 else jsonb_build_object('locked_at', target.locked_at, 'reason', target.lock_reason,
                                         -- GAPS-9: where the conversation carries on.
                                         'next', public.forum_thread_pointer_json(target.continues_in_thread_id)) end,
    'can_reply', (select auth.uid()) is not null and target.locked_at is null and public.is_active_member()
                 and coalesce((select public.space_may_post(space) from public.space_of_forum(target.forum_id) as space
                               where space.id is not null), true),
    -- IDEAS-3f: the reply that answered it, linked at the top of the thread (criterion 1).
    'answer', (select jsonb_build_object('number', answer.post_number,
                                         'author', public.forum_person_json(answer.user_id))
               from public.forum_answer_post(target) as answer where answer.id is not null),
    'can_moderate', (select auth.uid()) is not null and (
                      public.staff_may('moderation', 'act')
                      or coalesce((select public.space_may_act(space, 'posts') from public.space_of_forum(target.forum_id) as space
                                   where space.id is not null), false)),
    -- GAPS-9: this thread is the forum's rules thread.
    'is_rules', exists (select 1 from public.forums
                        where forums.id = target.forum_id and forums.rules_thread_id = target.id),
    -- GAPS-9: the forum's rules thread, for the strip above every other thread of the forum.
    'rules', (select public.forum_thread_pointer_json(rules_thread.id)
              from public.forums
              join public.forum_threads as rules_thread on rules_thread.id = forums.rules_thread_id
              where forums.id = target.forum_id and rules_thread.id <> target.id
                and rules_thread.forum_id = forums.id));
$$;


comment on function public.forum_thread_header_json(public.forum_threads) is
  'Internal: a thread''s heading, numbers, sticky, lock, rules strip, pointer and whether the reader follows it, never a user ID (S1-E8-02, S1-E8-05, GAPS-9, GAPS-16a).';


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
    ('forum_thread_follows', true, null),
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
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h, GAPS-13, GAPS-16a).';


-- Unchanged except for the new table: the follows go with the account.
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
    ('forum_thread_follows', 'delete', 1, null),
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
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h, GAPS-13, GAPS-16a).';


