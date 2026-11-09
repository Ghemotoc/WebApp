-- no_doodles_retire_doodles: takes every doodle out of the database.
--
-- Story: bundle NO-DOODLES (Robert, 9 Nov 2026, 12:09 to 12:10 UTC: no doodles anywhere in the
-- app; the "Doodles" cover pattern gets another name).
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes:
--   1. The seasonal doodle schedule (S1-E11-11) is retired: its only job was choosing which doodle
--      Discover and Search showed, and the screens no longer draw doodles. Its functions, table and
--      enum go. The seasonal looks (bundle G2, profiles.seasonal_looks) are separate and stay.
--   2. Forums lose their doodle field: forum_index(), admin_list_forums() and admin_save_forum() are
--      recreated without it, the space trigger stops comparing it, then the column goes.
--   3. The "doodles" cover pattern is renamed "sparkles": the drawing stays, only its name changes,
--      so existing covers keep their look.

-- Step 1: the seasonal doodle schedule. Functions first, because they use the table and the type.
drop function if exists public.current_seasonal_doodle(date, text);
drop function if exists public.admin_save_occasion(text, text, date, date, boolean, public.seasonal_doodle, text, boolean, uuid);
drop function if exists public.admin_remove_occasion(uuid);
drop function if exists public.seasonal_occasion_problems(text, text, date, date, boolean, text);
drop function if exists public.occasion_covers(date, date, boolean, date);
-- The table's one policy is dropped by name first, so scripts/check-policy-tests.ts (which reads
-- the migrations) knows it is gone; dropping the table would remove it anyway.
drop policy if exists seasonal_occasions_select_admin on public.seasonal_occasions;
drop table if exists public.seasonal_occasions;
drop type if exists public.seasonal_doodle;

-- Step 2a: the forum functions whose results or arguments name the doodle. A function's return
-- columns or arguments can't change in place, so each is dropped and created again below.
drop function if exists public.forum_index(text);
drop function if exists public.admin_list_forums();
drop function if exists public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, text, jsonb);

-- Step 2b: the trigger that keeps staff's tools off a space's hidden forum, now without the doodle.
create or replace function public.refuse_space_forum_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A space's forum belongs to its space: staff's forum tools may not move, pin, recolour or
  -- remove it (FORUMS-2c).
  if old.space_id is not null and (
       new.slug is distinct from old.slug or new.parent_id is distinct from old.parent_id
       or new.position is distinct from old.position or new.is_pinned is distinct from old.is_pinned
       or new.accent is distinct from old.accent
       or new.deleted_at is distinct from old.deleted_at or new.space_id is distinct from old.space_id) then
    raise exception 'A space''s forum belongs to its space.' using errcode = 'check_violation', hint = 'forum:space';
  end if;
  return new;
end;
$$;

comment on function public.refuse_space_forum_change() is
  'Internal: keeps staff''s forum tools off a space''s hidden forum (FORUMS-2c).';

-- Step 2c: the column and its format check.
alter table public.forums drop constraint if exists forums_doodle_format;
alter table public.forums drop column if exists doodle;

-- Step 2d: forum_index(language_code), the forum index page's one read, without the doodle.
-- Called by the Forums page (src/features/forums/api/forumIndex.ts) for readers and visitors.
-- Returns every live public forum with its name in the language, its numbers, its newest post
-- and whether it has posts the caller hasn't read.
create function public.forum_index(language_code text)
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  name text,
  description text,
  thread_count bigint,
  post_count bigint,
  latest_activity_at timestamptz,
  latest_post jsonb,
  has_unread boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent, names.name, names.description,
    numbers.thread_count, numbers.post_count, latest.posted_at,
    case when latest.post_id is not null then jsonb_build_object(
      'thread_title', latest.thread_title,
      'thread_address', '/forums/' || forums.slug || '/' || latest.thread_number || '?post=' || latest.post_number,
      'writer_handle', latest.writer ->> 'handle',
      'writer_name', latest.writer ->> 'display_name',
      'is_staff', coalesce((latest.writer ->> 'is_staff')::boolean, false),
      'posted_at', latest.posted_at) end,
    public.forum_has_unread(forums.id)
  from public.forums
  cross join lateral public.forum_name_in(forums.id, forum_index.language_code) as names
  cross join lateral (
    select count(distinct live_threads.id) as thread_count, count(live_posts.id) as post_count
    from public.forum_threads as live_threads
    left join public.forum_posts as live_posts
      on live_posts.thread_id = live_threads.id and live_posts.deleted_at is null
    where live_threads.forum_id = forums.id and live_threads.deleted_at is null
  ) as numbers
  left join lateral (
    select newest.id as post_id, newest.post_number, newest.created_at as posted_at,
      thread.title as thread_title, thread.thread_number, public.forum_person_json(newest.user_id) as writer
    from public.forum_threads as thread
    join public.forum_posts as newest on newest.thread_id = thread.id
    where thread.forum_id = forums.id and public.forum_thread_is_shown(thread)
      and public.forum_post_state_for_caller(newest) = 'live'
    order by newest.created_at desc
    limit 1
  ) as latest on true
  where forums.deleted_at is null and forums.space_id is null;
$$;

comment on function public.forum_index(text) is
  'The forum index in one language: every live forum with its numbers, latest post and whether it has new posts for the caller (S1-E8-01, S1-E8-02, S1-E8-04).';
revoke all on function public.forum_index(text) from public;
grant execute on function public.forum_index(text) to anon, authenticated;

-- Step 2e: admin_list_forums(), the staff forum list, without the doodle.
-- Called by Staff > Forums (src/features/forums/api/forumAdmin.ts). Raises insufficient_privilege
-- through require_forum_staff() for anyone who isn't owner or admin in a staff session.
create function public.admin_list_forums()
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  names jsonb,
  missing_languages text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Only forum staff may see the list.
  perform public.require_forum_staff();
  -- Every live public forum, with its names per language and the interface languages it lacks.
  return query
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent,
    coalesce((select jsonb_object_agg(forum_names.language_code,
        jsonb_build_object('name', forum_names.name, 'description', forum_names.description))
      from public.forum_names where forum_names.forum_id = forums.id), '{}'::jsonb),
    array(select languages.code from public.languages
      where languages.is_interface and not exists (
        select 1 from public.forum_names
        where forum_names.forum_id = forums.id and forum_names.language_code = languages.code)
      order by languages.code)
  from public.forums
  where forums.deleted_at is null and forums.space_id is null
  order by forums.level, forums.position, forums.slug;
end;
$$;

comment on function public.admin_list_forums() is 'Every live forum with its names, for staff (FORUMS-1a).';
revoke all on function public.admin_list_forums() from public, anon;
grant execute on function public.admin_list_forums() to authenticated;

-- Step 2f: admin_save_forum(...), adds or changes a forum, without the doodle.
-- Called by Staff > Forums. Inputs: the forum (null to add one), its parent, address, position,
-- pin, colour and names per language. Returns the forum's id. Raises check_violation with a hint
-- listing what to fix, no_data_found for an unknown forum, insufficient_privilege for non-staff.
create function public.admin_save_forum(
  forum_id uuid,
  parent_id uuid,
  slug text,
  sort_position integer,
  is_pinned boolean,
  accent public.forum_accent,
  names jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $_$
declare
  problems text[];
  before_forum jsonb;
  saved_id uuid;
begin
  perform public.require_forum_staff();
  -- Step 1: the names, the address and the pin, before anything is written.
  problems := public.forum_name_problems(names);
  if admin_save_forum.slug is null or admin_save_forum.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(admin_save_forum.slug) not between 2 and 60 then
    problems := array_append(problems, 'slug:format');
  end if;
  -- An address stays taken by a removed forum too, so an old link never leads somewhere new.
  if exists (select 1 from public.forums where forums.slug = admin_save_forum.slug
             and forums.id is distinct from admin_save_forum.forum_id) then
    problems := array_append(problems, 'slug:taken');
  end if;
  if coalesce(admin_save_forum.is_pinned, false) and admin_save_forum.parent_id is not null then
    problems := array_append(problems, 'pin:not_category');
  end if;
  if cardinality(problems) > 0 then
    raise exception 'Fix the forum before saving.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 2: add it, or change the one staff opened (the level trigger checks the parent).
  if admin_save_forum.forum_id is null then
    insert into public.forums (parent_id, slug, position, is_pinned, accent)
    values (admin_save_forum.parent_id, admin_save_forum.slug, greatest(coalesce(sort_position, 0), 0),
      coalesce(admin_save_forum.is_pinned, false), coalesce(admin_save_forum.accent, 'plum'))
    returning forums.id into saved_id;
  else
    before_forum := public.forum_as_json(admin_save_forum.forum_id);
    update public.forums
    set parent_id = admin_save_forum.parent_id, slug = admin_save_forum.slug,
      position = greatest(coalesce(sort_position, 0), 0),
      is_pinned = coalesce(admin_save_forum.is_pinned, false),
      accent = coalesce(admin_save_forum.accent, 'plum')
    where forums.id = admin_save_forum.forum_id and forums.deleted_at is null
    returning forums.id into saved_id;
    if saved_id is null then
      raise exception 'There is no forum with that id.' using errcode = 'no_data_found';
    end if;
  end if;
  -- Step 3: the names, then the audit log in the same transaction.
  perform public.write_forum_names(saved_id, names);
  perform public.log_staff_action(
    case when before_forum is null then 'forum.created' else 'forum.changed' end,
    'forums', saved_id::text, null, null, before_forum, public.forum_as_json(saved_id));
  return saved_id;
end;
$_$;

comment on function public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, jsonb) is
  'Adds or changes a forum category, forum or subforum; owner and admin; logged (S1-E8-01).';
revoke all on function public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, jsonb) from public, anon;
grant execute on function public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, jsonb) to authenticated;

-- Step 3: the "doodles" cover pattern becomes "sparkles". The check is dropped first so the rows
-- can move, then put back with the new name in the same place in the list.
alter table public.stories drop constraint if exists stories_cover_design_is_approved;
update public.stories set cover_design = 'sparkles' where cover_design = 'doodles';
alter table public.stories add constraint stories_cover_design_is_approved check (
  cover_design is null or cover_design = any (array[
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'stripes', 'dots', 'grid', 'waves', 'starry', 'sparkles', 'twotone'
  ])
);
comment on constraint stories_cover_design_is_approved on public.stories is
  'A drawn cover uses one of the designs the app can draw (src/components/covers/coverDesigns.ts); "doodles" was renamed "sparkles" in NO-DOODLES.';
