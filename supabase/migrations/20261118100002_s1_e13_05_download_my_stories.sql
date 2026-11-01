/*
 * Migration: Download my stories (story S1-E13-05; board Settings 6.3, the Download my data tab,
 * "Download my stories"; bundle PRIVACY, part e).
 *
 * How it works: the same way as Download my data (S1-E13-02, ADR 0012). The writer's browser
 * builds the Word files with the shared Word builder and uploads them to the private exports
 * bucket; the database decides who may do what:
 * - request_stories_export() opens an export of kind my_stories for one story or all of them,
 *   with the writer's choices: the chapters (all, or only chosen ones), the story's plan from
 *   Story Atlas as its own Word file, and a machine-readable copy (JSON) (Robert, 1 Nov 2026,
 *   06:27 and 06:29: "download whatever they want whenever they want"). It answers the copy from
 *   the last 24 hours instead when the choices are the same and nothing in those stories or their
 *   plans has changed since (criterion 4, proposal);
 * - exactly one file chosen for one story is that file (.docx or .json); anything more, or all
 *   the stories, is one ZIP; always under a random name;
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
  add column story_id uuid references public.stories (id) on delete cascade,
  add column chapter_ids uuid[],
  add column include_chapters boolean not null default true,
  add column include_plan boolean not null default true,
  add column include_data boolean not null default false,
  add column content_fingerprint text;

comment on column public.exports.story_id is
  'For my_stories: the one story the files hold, or null for all of them (S1-E13-05).';
comment on column public.exports.chapter_ids is
  'For my_stories of one story: the chapters the writer chose, or null for every chapter (S1-E13-05).';
comment on column public.exports.include_chapters is
  'For my_stories: the Word file of the story''s chapters is in (S1-E13-05).';
comment on column public.exports.include_plan is
  'For my_stories: the Word file of the story''s plan from Story Atlas is in (S1-E13-05).';
comment on column public.exports.include_data is
  'For my_stories: the machine-readable copy (JSON) of the stories is in (S1-E13-05).';
comment on column public.exports.content_fingerprint is
  'For my_stories: stories_fingerprint() when it was asked for, so an unchanged copy can be offered again (S1-E13-05).';

/**
 * export_file_extension: the kind of file an export is saved as. Download my data is always a
 * ZIP; Download my stories is the one file chosen for one story (.docx for its chapters or its
 * plan, .json for the machine-readable copy), and a ZIP for anything more or for all stories.
 * Inputs: the export's kind, story and three choices. Returns: 'zip', 'docx' or 'json'.
 * Internal: the file name check below and request_stories_export().
 */
create or replace function public.export_file_extension(
  kind public.export_kind, story_id uuid, choices boolean[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when kind = 'all_my_data' or story_id is null then 'zip'
    when (select count(*) from unnest(choices) as chosen where chosen) > 1 then 'zip'
    when choices[1] or choices[2] then 'docx'
    else 'json'
  end;
$$;

comment on function public.export_file_extension(public.export_kind, uuid, boolean[]) is
  'Internal: zip, docx or json for an export and its choices (chapters, plan, data) (S1-E13-05).';
revoke execute on function public.export_file_extension(public.export_kind, uuid, boolean[])
  from public, anon, authenticated;

alter table public.exports
  add constraint exports_story_only_for_stories check (kind = 'my_stories' or story_id is null),
  add constraint exports_chapters_only_for_one_story
    check (chapter_ids is null or (story_id is not null and include_chapters)),
  add constraint exports_stories_choose_something
    check (kind = 'all_my_data' or include_chapters or include_plan or include_data);

-- The file is a ZIP, a Word file or a JSON file, as export_file_extension() says.
alter table public.exports drop constraint exports_file_name_shape;
alter table public.exports add constraint exports_file_name_shape check (
  file_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(zip|docx|json)$'
  and file_name like '%.' || public.export_file_extension(
    kind, story_id, array[include_chapters, include_plan, include_data]));

comment on table public.exports is
  'kind: user_action
A copy someone asked for: all_my_data is one ZIP of their data (S1-E13-02; GDPR art. 15 and 20); my_stories is the stories they chose, as Word files of the chapters and the plan and a JSON copy (S1-E13-05). Each sits in the private exports bucket, readable only by them while ready and for seven days. Purged by S1-E13-04.';

-- The bucket also takes a single Word or JSON file now.
update storage.buckets
set allowed_mime_types = array[
  'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json']
where id = 'exports';

-- Ten requests an hour (a proposal): the work is on the writer's own device, so the limit only
-- stops a runaway screen from filling the bucket.
update public.settings
  set value = value || '{"stories_export": {"new_account": 10, "older_account": 10}}'::jsonb
  where key = 'rate_limits';

/* ---------- Asking ---------- */

/**
 * stories_fingerprint: a short summary of everything the writer's chosen stories hold right now:
 * every row of the story, its chapters, their plans, scenes, cards and pictures, its tags and
 * every Story Atlas part, by key and last change. A change, a new row or a deleted one changes
 * it, so an unchanged copy can be offered again and a changed one never is (criterion 4).
 * Inputs: the writer and the story (null for all). Returns: an md5 text.
 * Internal: request_stories_export(). When a new table holds a story's content, add it here and
 * to STORY_TABLES in src/features/data-export/lib/storiesForData.ts.
 */
create or replace function public.stories_fingerprint(owner_id uuid, chosen_story_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with chosen as (
    select stories.id from public.stories
    where stories.user_id = owner_id
      and (chosen_story_id is null or stories.id = chosen_story_id)
  ),
  chosen_chapters as (
    select chapters.id from public.chapters where chapters.story_id in (select id from chosen)
  ),
  changes (row_key, changed_at) as (
    select 'profile', updated_at from public.profiles where id = owner_id
    union all select 'story:' || id, updated_at from public.stories where id in (select id from chosen)
    union all select 'chapter:' || id, updated_at from public.chapters where id in (select id from chosen_chapters)
    union all select 'embed:' || id, updated_at from public.chapter_embeds where chapter_id in (select id from chosen_chapters)
    union all select 'picture:' || id, updated_at from public.picture_checks where story_id in (select id from chosen)
    union all select 'chapter_plan:' || chapter_id, updated_at from public.chapter_plans where story_id in (select id from chosen)
    union all select 'present:' || chapter_id || ':' || character_id, updated_at from public.chapter_plan_characters where story_id in (select id from chosen)
    union all select 'scene:' || id, updated_at from public.chapter_scenes where story_id in (select id from chosen)
    union all select 'tag:' || story_id || ':' || tag_id, updated_at from public.story_tags where story_id in (select id from chosen)
    union all select 'plan:' || story_id, updated_at from public.story_plans where story_id in (select id from chosen)
    union all select 'act:' || id, updated_at from public.story_plan_acts where story_id in (select id from chosen)
    union all select 'character:' || id, updated_at from public.story_characters where story_id in (select id from chosen)
    union all select 'field:' || id, updated_at from public.story_character_fields where story_id in (select id from chosen)
    union all select 'connection:' || id, updated_at from public.story_character_relationships where story_id in (select id from chosen)
    union all select 'bible_section:' || id, updated_at from public.story_bible_sections where story_id in (select id from chosen)
    union all select 'bible_entry:' || id, updated_at from public.story_bible_entries where story_id in (select id from chosen)
    union all select 'event:' || id, updated_at from public.story_events where story_id in (select id from chosen)
    union all select 'idea:' || id, updated_at from public.story_ideas where story_id in (select id from chosen)
    union all select 'marketing:' || story_id, updated_at from public.story_marketing where story_id in (select id from chosen)
  )
  select md5(coalesce(string_agg(row_key || '@' || changed_at::text, ',' order by row_key), ''))
  from changes;
$$;

comment on function public.stories_fingerprint(uuid, uuid) is
  'Internal: a summary of everything in the writer''s chosen stories and their plans, to spot a change (S1-E13-05).';
revoke execute on function public.stories_fingerprint(uuid, uuid) from public, anon, authenticated;

/**
 * reusable_stories_export: the writer's copy from the last 24 hours with exactly the same choices,
 * if nothing in those stories or their plans has changed since (criterion 4, proposal: an edit
 * means the writer wants their newest words, so a new copy is made).
 * Inputs: the writer, the new export as it would be (story, chapters and choices) and the current
 * fingerprint. Returns: the export, or null.
 * Internal: request_stories_export().
 */
create or replace function public.reusable_stories_export(
  owner_id uuid, wanted public.exports, current_fingerprint text)
returns public.exports
language sql
stable
security definer
set search_path = ''
as $$
  select exports.* from public.exports
  where exports.user_id = owner_id and exports.kind = 'my_stories' and exports.state = 'ready'
    and exports.ready_at > now() - interval '24 hours'
    and exports.expires_at > now()
    and exports.story_id is not distinct from wanted.story_id
    and exports.chapter_ids is not distinct from wanted.chapter_ids
    and exports.include_chapters = wanted.include_chapters
    and exports.include_plan = wanted.include_plan
    and exports.include_data = wanted.include_data
    and exports.content_fingerprint = current_fingerprint
  order by exports.ready_at desc
  limit 1;
$$;

comment on function public.reusable_stories_export(uuid, public.exports, text) is
  'Internal: the writer''s unchanged copy of the same choices from the last 24 hours (S1-E13-05).';
revoke execute on function public.reusable_stories_export(uuid, public.exports, text)
  from public, anon, authenticated;

/**
 * stories_export_choice_problem: why the writer's choices can't be made, or null when they can.
 * Inputs: the writer, the story (null for all), the chosen chapters (null for every one) and
 * whether anything at all is ticked. Returns: 'nothing_chosen', 'not_found', 'no_stories',
 * 'no_chapters' or null.
 * Internal: request_stories_export().
 */
create or replace function public.stories_export_choice_problem(
  owner_id uuid, chosen_story_id uuid, chosen_chapter_ids uuid[], anything_chosen boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- Nothing ticked.
    when not anything_chosen then 'nothing_chosen'
    -- Not the writer's own story that still exists, or no story at all for "all".
    when not exists (
      select 1 from public.stories
      where stories.user_id = owner_id and stories.deleted_at is null
        and (chosen_story_id is null or stories.id = chosen_story_id))
      then case when chosen_story_id is null then 'no_stories' else 'not_found' end
    -- Chosen chapters must be some, and every one a live chapter of that story.
    when chosen_chapter_ids is not null and (
      cardinality(chosen_chapter_ids) = 0
      or exists (
        select 1 from unnest(chosen_chapter_ids) as chosen (id)
        where not exists (
          select 1 from public.chapters
          where chapters.id = chosen.id and chapters.story_id = chosen_story_id
            and chapters.deleted_at is null)))
      then 'no_chapters'
    else null
  end;
$$;

comment on function public.stories_export_choice_problem(uuid, uuid, uuid[], boolean) is
  'Internal: why a Download my stories choice can''t be made, or null (S1-E13-05).';
revoke execute on function public.stories_export_choice_problem(uuid, uuid, uuid[], boolean)
  from public, anon, authenticated;

/**
 * request_stories_export: "Get my files" (criteria 1 and 4; Robert, 1 Nov 2026, 06:27 and 06:29).
 * Opens a copy of the writer's one story, or all of them, with what they ticked, unless the same
 * files from the last 24 hours can be offered.
 * Inputs: chosen_story_id (null for all the writer's stories); chosen_chapter_ids (one story's
 *   chapters, or null for every chapter); include_chapters (the Word file of the chapters);
 *   include_plan (the Word file of the plan from Story Atlas); include_data (the JSON copy).
 * Returns: { outcome: 'reused', export_id } for the earlier files, or { outcome: 'new',
 *   export_id, file_name } with the name to upload under (.docx, .json or .zip).
 * Errors: insufficient_privilege (hint signed_out); check_violation with hint nothing_chosen,
 *   not_found (not the writer's own live story), no_stories (nothing to download) or no_chapters
 *   (a chosen chapter isn't one of the story's); the rate limit's error after ten new copies in
 *   an hour. A suspended writer may ask (criterion 3).
 * Where it fits: makeStoriesExport() calls it first, then my_data_export().
 */
create or replace function public.request_stories_export(
  chosen_story_id uuid default null,
  chosen_chapter_ids uuid[] default null,
  include_chapters boolean default true,
  include_plan boolean default true,
  include_data boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  problem text;
  wanted public.exports;
  fingerprint text;
  earlier public.exports;
begin
  -- Step 1: the choices make sense (chosen chapters only with one story's chapters ticked).
  if chosen_story_id is null or not include_chapters then
    chosen_chapter_ids := null;
  elsif chosen_chapter_ids is not null then
    -- In one order and once each, so the same choice is always the same list.
    chosen_chapter_ids := array(select distinct unnest(chosen_chapter_ids) order by 1);
  end if;
  problem := public.stories_export_choice_problem(caller_id, chosen_story_id, chosen_chapter_ids,
    include_chapters or include_plan or include_data);
  if problem is not null then
    raise exception 'Those files can''t be made.' using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 2: the same files from the last 24 hours, if nothing changed since (criterion 4).
  wanted.story_id := chosen_story_id;
  wanted.chapter_ids := chosen_chapter_ids;
  wanted.include_chapters := include_chapters;
  wanted.include_plan := include_plan;
  wanted.include_data := include_data;
  fingerprint := public.stories_fingerprint(caller_id, chosen_story_id);
  earlier := public.reusable_stories_export(caller_id, wanted, fingerprint);
  if earlier.id is not null then
    return jsonb_build_object('outcome', 'reused', 'export_id', earlier.id);
  end if;
  -- Step 3: at most ten new copies an hour; an unfinished one goes.
  perform public.take_rate_limit('stories_export');
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = 'my_stories' and exports.state = 'building';
  -- Step 4: the new one, under a random name of the right kind of file.
  insert into public.exports (user_id, kind, story_id, chapter_ids, include_chapters, include_plan,
    include_data, content_fingerprint, file_name)
  values (caller_id, 'my_stories', chosen_story_id, chosen_chapter_ids, include_chapters,
    include_plan, include_data, fingerprint,
    gen_random_uuid()::text || '.' || public.export_file_extension('my_stories', chosen_story_id,
      array[include_chapters, include_plan, include_data]))
  returning * into wanted;
  return jsonb_build_object('outcome', 'new', 'export_id', wanted.id, 'file_name', wanted.file_name);
end;
$$;

comment on function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean) is
  'Opens a Download my stories copy of the chosen stories, chapters, plan and JSON, or offers the unchanged one from the last 24 hours (S1-E13-05).';
revoke execute on function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean)
  from public, anon;
grant execute on function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean)
  to authenticated;

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
