/*
 * Migration: Download my stories (story S1-E13-05; board Settings 6.3, the Download my data tab,
 * "Download my stories"; bundle PRIVACY, part e).
 *
 * How it works: the same way as Download my data (S1-E13-02, ADR 0012). The writer's browser
 * builds the Word files with the shared Word builder and uploads them to the private exports
 * bucket; the database decides who may do what:
 * - request_stories_export() opens an export of kind my_stories for one story or all of them, or
 *   answers the copy from the last 24 hours when nothing in those stories has changed since
 *   (criterion 4, proposal);
 * - one story becomes one .docx file, all of them one ZIP of .docx files, under a random name;
 * - finish_data_export() now finishes either kind: it keeps one copy per kind, and sends
 *   stories_export_ready for Word files;
 * - a suspended writer can still do it (criterion 3, S1-E10-06): only a deleted account can't.
 * The file is readable only by its owner, only while ready and for seven days (criterion 2), by
 * the storage policies S1-E13-02 made; the nightly clean-up (S1-E13-04) removes it afterwards.
 * Who calls it: src/features/data-export/ (Settings › Download my data › Download my stories).
 */

/* ---------- The exports ---------- */

-- The story a my_stories export holds; empty means all of the writer's stories. When the story
-- is deleted for good, its export goes with it.
alter table public.exports
  add column story_id uuid references public.stories (id) on delete cascade;

comment on column public.exports.story_id is
  'For my_stories: the one story the Word file holds, or null for all of them (S1-E13-05).';

alter table public.exports
  add constraint exports_story_only_for_stories check (kind = 'my_stories' or story_id is null);

-- One story is a single Word file; everything else is a ZIP.
alter table public.exports drop constraint exports_file_name_shape;
alter table public.exports add constraint exports_file_name_shape check (
  file_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(zip|docx)$'
  and (file_name like '%.zip') = (kind = 'all_my_data' or story_id is null));

comment on table public.exports is
  'kind: user_action
A copy someone asked for: all_my_data is one ZIP of their data (S1-E13-02; GDPR art. 15 and 20); my_stories is their stories as Word files (S1-E13-05). Each sits in the private exports bucket, readable only by them while ready and for seven days. Purged by S1-E13-04.';

-- The bucket also takes a single Word file now.
update storage.buckets
set allowed_mime_types = array[
  'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'exports';

-- Ten requests an hour (a proposal): the work is on the writer's own device, so the limit only
-- stops a runaway screen from filling the bucket.
update public.settings
  set value = value || '{"stories_export": {"new_account": 10, "older_account": 10}}'::jsonb
  where key = 'rate_limits';

/* ---------- Asking ---------- */

/**
 * reusable_stories_export: the writer's copy of the same stories from the last 24 hours, if
 * nothing in them has changed since it was made (criterion 4, proposal: an edit since then means
 * the writer wants their newest words, so a new copy is made).
 * Inputs: the writer and the story (null for all). Returns: the export, or null.
 * Internal: request_stories_export().
 */
create or replace function public.reusable_stories_export(owner_id uuid, chosen_story_id uuid)
returns public.exports
language sql
stable
security definer
set search_path = ''
as $$
  select exports.* from public.exports
  where exports.user_id = owner_id and exports.kind = 'my_stories' and exports.state = 'ready'
    and exports.story_id is not distinct from chosen_story_id
    and exports.ready_at > now() - interval '24 hours'
    and exports.expires_at > now()
    -- Nothing in the chosen stories changed after the copy was made.
    and not exists (
      select 1 from public.stories
      left join public.chapters on chapters.story_id = stories.id
      where stories.user_id = owner_id
        and (chosen_story_id is null or stories.id = chosen_story_id)
        and (stories.updated_at > exports.ready_at or chapters.updated_at > exports.ready_at))
  order by exports.ready_at desc
  limit 1;
$$;

comment on function public.reusable_stories_export(uuid, uuid) is
  'Internal: the writer''s unchanged Word files of the same stories from the last 24 hours (S1-E13-05).';
revoke execute on function public.reusable_stories_export(uuid, uuid) from public, anon, authenticated;

/**
 * request_stories_export: "Get Word files" (criteria 1 and 4). Opens an export of the writer's
 * one story, or all their stories, unless the same files from the last 24 hours can be offered.
 * Input: chosen_story_id, the story's ID, or null for all the writer's stories.
 * Returns: { outcome: 'reused', export_id } for the earlier files, or { outcome: 'new',
 *   export_id, file_name } with the name to upload under (.docx for one story, .zip for all).
 * Errors: insufficient_privilege (hint signed_out); check_violation with hint not_found (not the
 *   writer's own live story) or no_stories (nothing to download); the rate limit's error after
 *   ten new copies in an hour. A suspended writer may ask (criterion 3).
 * Where it fits: makeStoriesExport() calls it first, then my_data_export().
 */
create or replace function public.request_stories_export(chosen_story_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  earlier public.exports;
  new_export public.exports;
begin
  -- Step 1: the writer's own story that still exists, or at least one story for "all".
  if not exists (
    select 1 from public.stories
    where stories.user_id = caller_id and stories.deleted_at is null
      and (chosen_story_id is null or stories.id = chosen_story_id)) then
    raise exception 'There is no story of yours to download.' using errcode = 'check_violation',
      hint = case when chosen_story_id is null then 'no_stories' else 'not_found' end;
  end if;
  -- Step 2: the same files from the last 24 hours, if nothing changed since (criterion 4).
  earlier := public.reusable_stories_export(caller_id, chosen_story_id);
  if earlier.id is not null then
    return jsonb_build_object('outcome', 'reused', 'export_id', earlier.id);
  end if;
  -- Step 3: at most ten new copies an hour; an unfinished one goes.
  perform public.take_rate_limit('stories_export');
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = 'my_stories' and exports.state = 'building';
  -- Step 4: the new one, under a random name.
  insert into public.exports (user_id, kind, story_id, file_name)
  values (caller_id, 'my_stories', chosen_story_id,
          gen_random_uuid()::text || case when chosen_story_id is null then '.zip' else '.docx' end)
  returning * into new_export;
  return jsonb_build_object('outcome', 'new', 'export_id', new_export.id, 'file_name', new_export.file_name);
end;
$$;

comment on function public.request_stories_export(uuid) is
  'Opens a Download my stories export of one story or all, or offers the unchanged one from the last 24 hours (S1-E13-05).';
revoke execute on function public.request_stories_export(uuid) from public, anon;
grant execute on function public.request_stories_export(uuid) to authenticated;

/* ---------- Finishing ---------- */

/**
 * finish_data_export: as in S1-E13-02, for both kinds now. The browser uploaded the file (and
 * deleted the older copy's file); marks the export ready for seven days, tells the person and
 * drops the older rows of the same kind, so one copy of each kind is kept.
 * Inputs: export_id; story_count (how many Word files it holds, 0 or more).
 * Returns: { expires_at }.
 * Errors: insufficient_privilege when signed out; check_violation with hint not_found (not the
 *   caller's open export) or no_file (nothing uploaded under its name).
 */
create or replace function public.finish_data_export(export_id uuid, story_count integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  open_export public.exports;
  stored_size bigint;
begin
  -- Step 1: the caller's own export, still being built.
  select * into open_export from public.exports
  where exports.id = finish_data_export.export_id and exports.user_id = caller_id
    and exports.state = 'building';
  if open_export.id is null then
    raise exception 'That export isn''t open.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  -- Step 2: the file is really there; its size comes from storage, not from the browser.
  select (objects.metadata ->> 'size')::bigint into stored_size from storage.objects
  where objects.bucket_id = 'exports' and objects.name = open_export.file_name;
  if stored_size is null then
    raise exception 'The file hasn''t arrived.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 3: older copies of the same kind go; their files go with the nightly sweep (S1-E13-04)
  -- if the browser couldn't delete them.
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = open_export.kind and exports.id <> open_export.id;
  -- Step 4: ready for seven days, and the in-app notice for its kind.
  update public.exports
  set state = 'ready', file_size = stored_size, ready_at = now(), expires_at = now() + interval '7 days',
      story_count = greatest(coalesce(finish_data_export.story_count, 0), 0)
  where exports.id = open_export.id
  returning * into open_export;
  if open_export.kind = 'my_stories' then
    perform public.notify(caller_id, 'stories_export_ready', null, '{}'::jsonb);
  else
    perform public.notify(caller_id, 'data_export_ready', null, '{}'::jsonb);
  end if;
  return jsonb_build_object('expires_at', open_export.expires_at);
end;
$$;

comment on function public.finish_data_export(uuid, integer) is
  'Marks the caller''s uploaded export ready for seven days and tells them (S1-E13-02, S1-E13-05).';
revoke execute on function public.finish_data_export(uuid, integer) from public, anon;
grant execute on function public.finish_data_export(uuid, integer) to authenticated;

/* ---------- The notification ---------- */

/**
 * notification_category: as in S1-E13-02, with stories_export_ready under the team's chip
 * ("staff"): an account notice from us, like data_export_ready (S1-E13-05).
 * Input: the kind. Returns: 'stories', 'follows', 'staff' or 'replies'. Internal: my_notifications().
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
    else 'replies'
  end;
$$;
