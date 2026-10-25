/*
 * Migration: in-app notifications (story S1-E7-01; board 6.2 Notifications).
 *
 * What it adds:
 * - notification_kind: new_chapter (a writer or story the person follows published), comment_on_chapter
 *   (someone commented on the person's chapter), comment_reply (someone replied to their
 *   comment), comment_reactions (people reacted to their comment), new_follower and
 *   moderation_decision (a decision about something they posted, DSA art. 17).
 * - notifications: one row per person told. Grouped kinds keep one row while it is fresh:
 *   reactions on one comment within an hour (the story's proposal) and new followers within a
 *   day, counting the people (criterion 2). A moderation decision is is_required: it can't be
 *   switched off (criterion 4); every kind is on for March, because the settings come with S1-E7-02.
 * - Where they come from: run_notification_jobs() turns the queued chapter_published (S1-E3-03)
 *   and comment_posted (S1-E6-01) jobs into rows, every minute by pg_cron (criterion 1); new
 *   reactions, new followers and decided cases notify through triggers in the same transaction.
 * - my_notifications(), my_unread_notification_count() and mark_notifications_read(): the screen's
 *   only way in. They apply the reader's own rules when they read: a chapter the reader may no
 *   longer open (its rating, a block, moderation, unpublished) and anything from someone either
 *   side blocks is left out, so the badge and the list always agree. They answer usernames and
 *   display names, never a user ID (architecture 1.6).
 * - purge_old_notifications(): read and unread rows go after notifications_keep_days (90,
 *   proposal); a moderation decision after a year, since the statement of reasons is kept apart
 *   (S1-E10-04).
 * Who calls it: src/features/notifications/api/notifications.ts.
 * Tests: supabase/tests/database/154-notifications.test.sql.
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('notifications_keep_days', '90'::jsonb, false,
   'Days a notification is kept; a moderation decision is kept a year (proposal; S1-E7-01).'),
  ('notification_reaction_group_minutes', '60'::jsonb, false,
   'Reactions on one comment within this many minutes share one notification (proposal; S1-E7-01).'),
  ('notification_follower_group_hours', '24'::jsonb, false,
   'New followers within this many hours share one notification (proposal; S1-E7-01).');

/* ---------- Table ---------- */

create type public.notification_kind as enum (
  'new_chapter', 'comment_on_chapter', 'comment_reply', 'comment_reactions', 'new_follower',
  'moderation_decision'
);
comment on type public.notification_kind is 'What a notification is about (S1-E7-01).';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- The person told (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  kind public.notification_kind not null,
  -- Who did it, newest first, for "ilinca.r, corbu and 10 others"; empty for a staff decision.
  actor_user_ids uuid[] not null default '{}',
  actor_count integer not null default 0,
  story_id uuid references public.stories (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  decision public.moderation_action,
  -- Rows of the same grouped thing share a key while fresh ('reactions:<comment>', 'followers').
  group_key text,
  -- A moderation decision can't be switched off (criterion 4; DSA art. 17).
  is_required boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- The latest activity: a grouped row moves up when someone new joins it.
  updated_at timestamptz not null default now()
);
comment on table public.notifications is
  'kind: user_action
In-app notifications, one row per person told (S1-E7-01). Read through my_notifications(), which answers usernames, never user IDs.';
create index notifications_user_id_updated_at on public.notifications (user_id, updated_at desc);
create index notifications_group on public.notifications (user_id, group_key, created_at) where group_key is not null;
create trigger notifications_refuse_user_id_change
  before update on public.notifications
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.notifications enable row level security;

-- Who: the person told. Why: their own notifications only; the screen reads them through
-- my_notifications(). Writes go only through the functions below.
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.notifications to authenticated;

/* ---------- Writing a notification ---------- */

/**
 * notify: tells one person about one thing, or adds the actor to a fresh grouped row.
 * Inputs: recipient, kind, actor (null for staff), the story, chapter, comment and case it is
 *   about (null where they don't apply), the decision, a group key and how long a group stays
 *   open (null for kinds that aren't grouped).
 * Rules: nobody is told about their own action; nobody is told about someone either side blocks;
 *   a decision is is_required. A grouped row stays one row while it was opened within the window,
 *   counts each person once and moves to the top, unread again.
 * Internal: the triggers and run_notification_jobs().
 */
create or replace function public.notify(
  recipient_id uuid,
  notification_kind public.notification_kind,
  actor_id uuid,
  about jsonb,
  group_key text default null,
  group_window interval default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
  -- Step 3: a new row.
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    notify.group_key, notification_kind = 'moderation_decision');
end;
$$;
comment on function public.notify(uuid, public.notification_kind, uuid, jsonb, text, interval) is
  'Internal: tells one person about one thing, or joins a fresh grouped row; never across a block (S1-E7-01).';
revoke execute on function public.notify(uuid, public.notification_kind, uuid, jsonb, text, interval)
  from public, anon, authenticated;

/* ---------- From the queued jobs: new chapters and comments ---------- */

/**
 * notify_chapter_published: tells every follower of the writer or the story about a new chapter
 * (criterion 1). The writer isn't told about their own chapter. Whether each follower may open
 * it (its rating, a block) is checked when they read their notifications.
 * Input: the job's payload {chapter_id, story_id}. Internal: run_notification_jobs().
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
begin
  select * into story from public.stories where stories.id = (payload ->> 'story_id')::uuid;
  if story.id is null then
    return;
  end if;
  for follower_id in
    select follows_users.user_id from public.follows_users where follows_users.followed_user_id = story.user_id
    union
    select follows_stories.user_id from public.follows_stories where follows_stories.story_id = story.id
  loop
    perform public.notify(follower_id, 'new_chapter', story.user_id,
      jsonb_build_object('story_id', story.id, 'chapter_id', payload ->> 'chapter_id'));
  end loop;
end;
$$;
comment on function public.notify_chapter_published(jsonb) is
  'Internal: a new chapter notifies the followers of its writer and of its story (S1-E7-01).';
revoke execute on function public.notify_chapter_published(jsonb) from public, anon, authenticated;

/**
 * notify_comment_posted: a reply tells the comment it answers' author; a new comment tells the
 * story's writer.
 * Input: the job's payload {comment_id, chapter_id, parent_comment_id}. Internal:
 *   run_notification_jobs().
 */
create or replace function public.notify_comment_posted(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment public.comments;
  parent_author_id uuid;
  chapter record;
begin
  select * into comment from public.comments where comments.id = (payload ->> 'comment_id')::uuid;
  if comment.id is null or comment.deleted_at is not null then
    return;
  end if;
  select chapters.id, chapters.story_id, stories.user_id as writer_id into chapter
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = comment.chapter_id;
  if comment.parent_comment_id is not null then
    -- Step 1: a reply tells the author of the comment it answers.
    select comments.user_id into parent_author_id from public.comments where comments.id = comment.parent_comment_id;
    perform public.notify(parent_author_id, 'comment_reply', comment.user_id,
      jsonb_build_object('story_id', chapter.story_id, 'chapter_id', chapter.id, 'comment_id', comment.id));
    return;
  end if;
  -- Step 2: a new comment tells the writer.
  perform public.notify(chapter.writer_id, 'comment_on_chapter', comment.user_id,
    jsonb_build_object('story_id', chapter.story_id, 'chapter_id', chapter.id, 'comment_id', comment.id));
end;
$$;
comment on function public.notify_comment_posted(jsonb) is
  'Internal: a reply notifies the comment''s author, a new comment the story''s writer (S1-E7-01).';
revoke execute on function public.notify_comment_posted(jsonb) from public, anon, authenticated;

/**
 * run_notification_jobs: turns waiting chapter_published and comment_posted jobs into
 * notifications and marks them done.
 * Returns: how many jobs it handled. Runs every minute (pg_cron); tests call it directly.
 * Two runs at once never take the same job (skip locked).
 */
create or replace function public.run_notification_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.jobs;
  handled integer := 0;
begin
  for job in
    select * from public.jobs
    where jobs.kind in ('chapter_published', 'comment_posted') and jobs.processed_at is null
      and jobs.run_after <= now()
    order by jobs.created_at
    limit 500
    for update skip locked
  loop
    if job.kind = 'chapter_published' then
      perform public.notify_chapter_published(job.payload);
    else
      perform public.notify_comment_posted(job.payload);
    end if;
    update public.jobs set processed_at = now() where jobs.id = job.id;
    handled := handled + 1;
  end loop;
  return handled;
end;
$$;
comment on function public.run_notification_jobs() is
  'Turns waiting chapter_published and comment_posted jobs into notifications; every minute (S1-E7-01).';
revoke execute on function public.run_notification_jobs() from public, anon, authenticated;

select cron.schedule('run-notification-jobs', '* * * * *', 'select public.run_notification_jobs()');

/* ---------- From the triggers: reactions, followers and decisions ---------- */

/**
 * notify_comment_reaction: a new reaction tells the comment's author, grouped per comment within
 * notification_reaction_group_minutes (criterion 2). Changing the kind isn't news.
 * Trigger: after insert on comment_reactions.
 */
create or replace function public.notify_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment record;
  window_minutes integer := coalesce(public.setting_value('notification_reaction_group_minutes'), '60')::text::integer;
begin
  select comments.id, comments.user_id, comments.chapter_id, chapters.story_id into comment
  from public.comments join public.chapters on chapters.id = comments.chapter_id
  where comments.id = new.comment_id;
  perform public.notify(comment.user_id, 'comment_reactions', new.user_id,
    jsonb_build_object('story_id', comment.story_id, 'chapter_id', comment.chapter_id, 'comment_id', comment.id),
    'reactions:' || comment.id, make_interval(mins => window_minutes));
  return null;
end;
$$;
comment on function public.notify_comment_reaction() is
  'Internal trigger: a new reaction notifies the comment''s author, grouped within an hour (S1-E7-01).';
revoke execute on function public.notify_comment_reaction() from public, anon, authenticated;
create trigger comment_reactions_notify
  after insert on public.comment_reactions
  for each row execute function public.notify_comment_reaction();

/**
 * notify_new_follower: a new follower tells the writer, grouped within
 * notification_follower_group_hours. Trigger: after insert on follows_users.
 */
create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_hours integer := coalesce(public.setting_value('notification_follower_group_hours'), '24')::text::integer;
begin
  perform public.notify(new.followed_user_id, 'new_follower', new.user_id, '{}'::jsonb,
    'followers', make_interval(hours => window_hours));
  return null;
end;
$$;
comment on function public.notify_new_follower() is
  'Internal trigger: a new follower notifies the writer, grouped within a day (S1-E7-01).';
revoke execute on function public.notify_new_follower() from public, anon, authenticated;
create trigger follows_users_notify
  after insert on public.follows_users
  for each row execute function public.notify_new_follower();

/**
 * notify_case_decided: a decided case tells the account whose item it was, whatever the
 * decision, and it can't be switched off (criterion 4; DSA art. 17). The statement of reasons
 * and the appeal link join this notification with S1-E10-04.
 * Trigger: after update of status on cases.
 */
create or replace function public.notify_case_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'decided' and old.status is distinct from 'decided' then
    perform public.notify(new.user_id, 'moderation_decision', null,
      jsonb_build_object('case_id', new.id, 'decision', new.decision));
  end if;
  return null;
end;
$$;
comment on function public.notify_case_decided() is
  'Internal trigger: a decided case notifies the owner of the item; always on (S1-E7-01, DSA art. 17).';
revoke execute on function public.notify_case_decided() from public, anon, authenticated;
create trigger cases_notify_decided
  after update of status on public.cases
  for each row execute function public.notify_case_decided();

/* ---------- Reading ---------- */

/**
 * notification_is_shown: whether the caller should see one of their notifications now.
 * Rules: their own row; no actor either side now blocks; for a chapter, the caller may still
 *   open it (readable_chapter(): published, rating, blocks, moderation); for a comment, it is
 *   still up for the caller. A moderation decision is always shown.
 * Internal: my_notifications() and my_unread_notification_count().
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
  if target.user_id is distinct from (select auth.uid()) then
    return false;
  end if;
  if target.kind = 'moderation_decision' then
    return true;
  end if;
  if exists (select 1 from unnest(target.actor_user_ids) as actor(id) where public.is_blocked_with(actor.id)) then
    return false;
  end if;
  if target.chapter_id is not null then
    select stories.slug, chapters.code into address
    from public.chapters join public.stories on stories.id = chapters.story_id
    where chapters.id = target.chapter_id;
    if not exists (select 1 from public.readable_chapter(address.slug, address.code)) then
      return false;
    end if;
  end if;
  if target.comment_id is not null then
    select * into comment from public.comments where comments.id = target.comment_id;
    return public.comment_state_for_caller(comment) in ('live', 'hidden');
  end if;
  return true;
end;
$$;
comment on function public.notification_is_shown(public.notifications) is
  'Internal: whether the caller sees one of their notifications now (blocks, ratings, moderation) (S1-E7-01).';
revoke execute on function public.notification_is_shown(public.notifications) from public, anon, authenticated;

/**
 * notification_category: the board's filter a kind belongs to: replies, follows, stories or staff.
 * Internal: notification_json() and my_notifications().
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
    else 'replies'
  end;
$$;
comment on function public.notification_category(public.notification_kind) is
  'Internal: the filter chip a notification kind sits under (S1-E7-01).';

/**
 * notification_item_json: what a decided case was about, for the decision's link: the item type
 * and the address of the item (a story, chapter, the chapter of a comment, or a profile).
 * Internal: notification_json().
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
    end)
  from public.cases where cases.id = case_id;
$$;
comment on function public.notification_item_json(uuid) is
  'Internal: a decided case''s item type, reference and address for its notification (S1-E7-01).';
revoke execute on function public.notification_item_json(uuid) from public, anon, authenticated;

/**
 * notification_json: one notification as the screen draws it.
 * Returns: {id, kind, category, actors: [{handle, display_name}] (the newest two), actor_count,
 *   story {slug, title}, chapter {code, title, position}, comment_excerpt (the first 140
 *   characters of a live comment), decision, item {item_type, reference, address}, is_required,
 *   is_read, at}. Never a user ID.
 * Internal: my_notifications().
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from unnest(target.actor_user_ids[1:2]) with ordinality as actor(id, position)
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count,
    'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    'decision', target.decision,
    'item', case when target.case_id is not null then public.notification_item_json(target.case_id) end,
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;
comment on function public.notification_json(public.notifications) is
  'Internal: one notification as the screen draws it, never a user ID (S1-E7-01).';
revoke execute on function public.notification_json(public.notifications) from public, anon, authenticated;

/**
 * my_notifications: the caller's notifications, newest activity first.
 * Inputs: older_than (null for the first page; the last row's "at" for the next), page_size
 *   (1 to 50, default 30).
 * Returns: JSON {unread, counts {all, replies, follows, stories, staff}, has_more,
 *   notifications: [notification_json(), ...]}. Only what notification_is_shown() lets through.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: the Notifications page (src/features/notifications/).
 */
create or replace function public.my_notifications(older_than timestamptz default null, page_size integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  wanted_rows integer := least(greatest(coalesce(page_size, 30), 1), 50);
  page jsonb;
  has_more boolean;
  shown_ids uuid[];
begin
  if caller_id is null then
    raise exception 'Log in to see your notifications.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the IDs of the rows this reader may see, worked out once (notification_is_shown()).
  select coalesce(array_agg(notifications.id), '{}') into shown_ids from public.notifications
  where notifications.user_id = caller_id and public.notification_is_shown(notifications);
  -- Step 2: one page, newest activity first, and whether there is more.
  select coalesce(jsonb_agg(public.notification_json(listed) order by listed.updated_at desc, listed.id), '[]'::jsonb)
  into page
  from (select * from public.notifications
        where notifications.id = any(shown_ids)
          and (older_than is null or notifications.updated_at < older_than)
        order by notifications.updated_at desc, notifications.id
        limit wanted_rows) as listed;
  select count(*) > wanted_rows into has_more from public.notifications
  where notifications.id = any(shown_ids) and (older_than is null or notifications.updated_at < older_than);
  -- Step 3: the counts for the badge and the filter chips.
  return jsonb_build_object(
    'unread', (select count(*) from public.notifications where id = any(shown_ids) and read_at is null),
    'counts', (
      select jsonb_build_object(
        'all', count(*),
        'replies', count(*) filter (where public.notification_category(kind) = 'replies'),
        'follows', count(*) filter (where public.notification_category(kind) = 'follows'),
        'stories', count(*) filter (where public.notification_category(kind) = 'stories'),
        'staff', count(*) filter (where public.notification_category(kind) = 'staff'))
      from public.notifications where id = any(shown_ids)),
    'has_more', has_more,
    'notifications', page);
end;
$$;
comment on function public.my_notifications(timestamptz, integer) is
  'The caller''s notifications, newest first, with the unread and filter counts; never a user ID (S1-E7-01).';
revoke execute on function public.my_notifications(timestamptz, integer) from public, anon;
grant execute on function public.my_notifications(timestamptz, integer) to authenticated;

/**
 * my_unread_notification_count: the number on the bell's badge (criterion 3).
 * Returns: how many of the caller's shown notifications are unread; 0 when signed out.
 */
create or replace function public.my_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = (select auth.uid()) and notifications.read_at is null
    and public.notification_is_shown(notifications);
$$;
comment on function public.my_unread_notification_count() is
  'The bell''s badge: the caller''s unread notifications (S1-E7-01).';
revoke execute on function public.my_unread_notification_count() from public, anon;
grant execute on function public.my_unread_notification_count() to authenticated;

/**
 * mark_notifications_read: marks some or all of the caller's notifications as read ("Mark all
 * as read", criterion 3; opening one).
 * Input: notification_ids (null for all of them).
 * Returns: how many are still unread.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.mark_notifications_read(notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to see your notifications.' using errcode = 'insufficient_privilege';
  end if;
  update public.notifications set read_at = now()
  where notifications.user_id = caller_id and notifications.read_at is null
    and (notification_ids is null or notifications.id = any (notification_ids));
  return public.my_unread_notification_count();
end;
$$;
comment on function public.mark_notifications_read(uuid[]) is
  'Marks some (or, for null, all) of the caller''s notifications as read (S1-E7-01).';
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

/* ---------- Retention ---------- */

/**
 * purge_old_notifications: deletes notifications older than notifications_keep_days, and
 * moderation decisions older than a year (docs/retention.md). Returns: how many went. Nightly.
 */
create or replace function public.purge_old_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep_days integer := coalesce(public.setting_value('notifications_keep_days'), '90')::text::integer;
  removed integer;
begin
  delete from public.notifications
  where (not notifications.is_required and notifications.updated_at < now() - make_interval(days => keep_days))
     or (notifications.is_required and notifications.updated_at < now() - interval '1 year');
  get diagnostics removed = row_count;
  return removed;
end;
$$;
comment on function public.purge_old_notifications() is
  'Nightly: deletes notifications past their keeping time (S1-E7-01; docs/retention.md).';
revoke execute on function public.purge_old_notifications() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-old-notifications', '41 3 * * *', 'select public.purge_old_notifications();');
