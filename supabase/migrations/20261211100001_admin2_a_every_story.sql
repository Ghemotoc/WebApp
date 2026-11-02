-- Migration: every story in the admin site (bundle ADMIN-2, part a; story S1-E11-07; screen 8.10).
-- What it adds (no new tables, so no new policies; every function checks the caller itself):
--   admin_story_status()     internal: draft, published, hidden or removed, as staff see it
--   admin_story_row()        internal: one row of the Stories list as JSON
--   admin_search_stories()   Staff › Stories: search and filter every story, 50 at a time
--   admin_story_overview()   one story's details and chapter list, never its text
-- Who may do what (architecture 1.8.3): owner, admin and moderator act on Stories; support views
-- titles and details only (staff_may('stories')); the content editor has no Stories area, so the
-- server refuses them. Changing a story is S1-E11-08 (part b), with staff_may('story_changes').
-- Least privilege (S1-E11-07): the list and the overview never carry a year of birth, an email
-- or chapter text. A draft's words open only from a case or a data request (later parts), with
-- the reason logged; nothing here reads them.
-- Called by: src/features/staff/api/staffStories.ts.

/* ---------- Helpers ---------- */

/**
 * admin_story_status: what staff see as a story's status.
 * Input: target, the story row. Returns: 'removed' or 'hidden' while a moderator's decision stands
 *   (moderated_items, S1-E10-06), otherwise 'published' once its first chapter went out, else
 *   'draft'. Internal: only the admin_* functions below call it.
 */
create or replace function public.admin_story_status(target public.stories)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.moderated_state_of('story', target.id)::text,
    case when target.first_published_at is null then 'draft' else 'published' end);
$$;
comment on function public.admin_story_status(public.stories) is
  'Internal: draft, published, hidden or removed, as Staff › Stories shows a story (S1-E11-07).';
revoke execute on function public.admin_story_status(public.stories) from public, anon, authenticated;

/**
 * admin_story_owner_is_minor: true when the story's writer is under 18 by their year of birth and
 *   age check (the "Writers under 18" filter). Staff see this yes or no, never the year itself
 *   (architecture 1.8.3). Internal.
 */
create or replace function public.admin_story_owner_is_minor(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
           profiles.age_check_result, current_date)::text in ('under_13', '13_to_15', '16_to_17'), false)
  from public.profiles where profiles.id = owner_id;
$$;
comment on function public.admin_story_owner_is_minor(uuid) is
  'Internal: whether a story''s writer is under 18, for the Stories filter; never the year (S1-E11-07).';
revoke execute on function public.admin_story_owner_is_minor(uuid) from public, anon, authenticated;

/**
 * admin_story_report_counts: the open and closed reports about a story and its chapters.
 * Input: target_story_id. Returns: JSON {open, closed}. Internal.
 */
create or replace function public.admin_story_report_counts(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'open', count(*) filter (where reports.closed_at is null),
    'closed', count(*) filter (where reports.closed_at is not null))
  from public.reports
  where (reports.item_type = 'story' and reports.item_id = target_story_id)
     or (reports.item_type = 'chapter' and reports.item_id in
           (select chapters.id from public.chapters where chapters.story_id = target_story_id));
$$;
comment on function public.admin_story_report_counts(uuid) is
  'Internal: open and closed reports about a story and its chapters (S1-E11-07).';
revoke execute on function public.admin_story_report_counts(uuid) from public, anon, authenticated;

/**
 * admin_story_row: one row of the Stories list.
 * Input: target, the story row. Returns: JSON with the title, the owner's username, pen name, user
 *   ID (staff only; architecture 1.6) and account status, category, language, status, who can
 *   read it (everyone, or one class, S1-E8-11), rating, chapters, last update, report counts and
 *   whether the writer is under 18. Never a year of birth, an email or any chapter text. Internal.
 */
create or replace function public.admin_story_row(target public.stories)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'title', target.title,
    'owner_user_id', target.user_id,
    'owner_handle', profiles.handle,
    'owner_pen_name', profiles.pen_name,
    'owner_status', public.account_state(target.user_id),
    'owner_is_minor', public.admin_story_owner_is_minor(target.user_id),
    'category_slug', categories.slug,
    'language_code', target.language_code,
    'status', public.admin_story_status(target),
    'readable_by', case when target.class_only then 'class' else 'everyone' end,
    'rating', target.rating,
    'completion', target.completion_status,
    'chapter_count', (select count(*) from public.chapters
                      where chapters.story_id = target.id and chapters.deleted_at is null),
    'updated_at', target.updated_at,
    'reports', public.admin_story_report_counts(target.id))
  from public.profiles
  left join public.categories on categories.id = target.category_id
  where profiles.id = target.user_id;
$$;
comment on function public.admin_story_row(public.stories) is
  'Internal: one row of Staff › Stories, with no year of birth, email or chapter text (S1-E11-07).';
revoke execute on function public.admin_story_row(public.stories) from public, anon, authenticated;

/**
 * admin_story_matches: whether a story matches the Stories search text.
 * Inputs: target, the story row; wanted, the lower-cased search text. Returns true when the title
 *   contains it, the owner's username starts with it (look-alikes folded), an earlier username of
 *   the owner starts with it (from the audit log, architecture 1.6), or the owner's user ID starts
 *   with it (the full ID or the 8-character short form). An empty text matches everything.
 *   Internal.
 */
create or replace function public.admin_story_matches(target public.stories, wanted text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select wanted = ''
    or strpos(lower(target.title), wanted) > 0
    or (wanted ~ '^[0-9a-f]{8}' and starts_with(target.user_id::text, wanted))
    or exists (select 1 from public.profiles where profiles.id = target.user_id
               and starts_with(profiles.handle_skeleton, public.username_skeleton(btrim(wanted, ' @'))))
    or exists (select 1 from public.audit_log
               where audit_log.action = 'profile.handle_changed'
                 and audit_log.target_user_id = target.user_id
                 and starts_with(lower(audit_log.before_values ->> 'handle'), btrim(wanted, ' @')));
$$;
comment on function public.admin_story_matches(public.stories, text) is
  'Internal: the Stories search: title, current or earlier username, or user ID (S1-E11-07).';
revoke execute on function public.admin_story_matches(public.stories, text) from public, anon, authenticated;

/* ---------- The list ---------- */

/**
 * admin_search_stories: Staff › Stories (screen 8.10).
 * Inputs: search_text (title, current or earlier username, or user ID; empty lists every story);
 *   the filters, each null for "all": story_status (draft, published, hidden, removed),
 *   category_slug, language_code, wanted_rating; only_open_reports; only_minor_writers;
 *   readable_by ('everyone' or 'class'); page_number (from 0, 50 stories a page).
 * Returns: JSON {total, page_size, stories: [admin_story_row()…]}, the latest update first.
 *   Stories their writer deleted are left out (Download my data and data requests still find
 *   them by user ID).
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Stories in a staff
 *   session (owner, admin, moderator, support).
 * Where it fits: /staff/stories → useStaffStories → api/staffStories.ts → here.
 */
create or replace function public.admin_search_stories(
  search_text text default '',
  story_status text default null,
  category_slug text default null,
  language_code text default null,
  wanted_rating public.story_rating default null,
  only_open_reports boolean default false,
  only_minor_writers boolean default false,
  readable_by text default null,
  page_number integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted text := lower(btrim(coalesce(search_text, '')));
  page_size constant integer := 50;
  result jsonb;
begin
  -- Step 1: owner, admin, moderator and support, in a staff session (architecture 1.8.3).
  if not public.staff_may('stories', 'view') then
    raise exception 'Only staff with the Stories area can list stories.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;

  -- Step 2: every matching story, filtered, counted and cut to one page.
  with matching as (
    select stories.*
    from public.stories
    left join public.categories on categories.id = stories.category_id
    where stories.deleted_at is null
      and public.admin_story_matches(stories, wanted)
      and (story_status is null or public.admin_story_status(stories) = story_status)
      and (admin_search_stories.category_slug is null or categories.slug = admin_search_stories.category_slug)
      and (admin_search_stories.language_code is null or stories.language_code = admin_search_stories.language_code)
      and (wanted_rating is null or stories.rating = wanted_rating)
      and (not only_open_reports
           or (public.admin_story_report_counts(stories.id) ->> 'open')::integer > 0)
      and (not only_minor_writers or public.admin_story_owner_is_minor(stories.user_id))
      -- "Where it can be read": everyone, or one class only (S1-E8-11). App-only stories aren't
      -- built yet (S1-E3-08 is after March), so these are the two places today.
      and (admin_search_stories.readable_by is null
           or (admin_search_stories.readable_by = 'class') = stories.class_only)
  ),
  one_page as (
    select matching.* from matching
    order by matching.updated_at desc, matching.id
    limit page_size offset greatest(page_number, 0) * page_size
  )
  select jsonb_build_object(
    'total', (select count(*) from matching),
    'page_size', page_size,
    'stories', coalesce((select jsonb_agg(public.admin_story_row(one_page::public.stories)
                                          order by one_page.updated_at desc, one_page.id)
                         from one_page), '[]'::jsonb))
  into result;
  return result;
end;
$$;
comment on function public.admin_search_stories(text, text, text, text, public.story_rating, boolean, boolean, text, integer) is
  'Staff › Stories for owner, admin, moderator and support: search and filter every story, no text (S1-E11-07).';
revoke execute on function public.admin_search_stories(text, text, text, text, public.story_rating, boolean, boolean, text, integer) from public, anon;
grant execute on function public.admin_search_stories(text, text, text, text, public.story_rating, boolean, boolean, text, integer) to authenticated;

/* ---------- One story ---------- */

/**
 * admin_story_overview: one story in the admin site, without its words (screen 8.11's details).
 * Input: target_story_id (staff may use IDs, architecture 1.6).
 * Returns: JSON: the list row (admin_story_row()), the blurb, when it was created and first
 *   published, its comments switch, and its chapters in order with number, published title (a
 *   draft chapter shows no title, because unpublished words are the writer's), status, words and
 *   dates; plus can_change, true for staff who may change stories (S1-E11-08, part b). Never
 *   chapter text, a year of birth or an email.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Stories; check_violation
 *   (hint no_such_story) when there is no such story.
 * Where it fits: /staff/stories/:storyId → useStaffStory → api/staffStories.ts → here.
 */
create or replace function public.admin_story_overview(target_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story_row public.stories;
begin
  -- Step 1: the same staff as the list.
  if not public.staff_may('stories', 'view') then
    raise exception 'Only staff with the Stories area can open a story.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the story, even one its writer deleted (staff may need it for a case).
  select * into story_row from public.stories where stories.id = target_story_id;
  if not found then
    raise exception 'There is no such story.' using errcode = 'check_violation', hint = 'no_such_story';
  end if;
  -- Step 3: the details and the chapter list, never the words.
  return public.admin_story_row(story_row) || jsonb_build_object(
    'blurb', story_row.blurb,
    'created_at', story_row.created_at,
    'first_published_at', story_row.first_published_at,
    'deleted_at', story_row.deleted_at,
    'comments_enabled', story_row.comments_enabled,
    'can_change', public.staff_may('story_changes', 'act'),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', chapters.id,
          'number', chapters.position,
          'title', case when chapters.status = 'published' then chapters.published_title end,
          'status', chapters.status,
          'is_hidden', public.is_moderated_away('chapter', chapters.id),
          'words', coalesce(chapters.published_word_count, 0),
          'published_at', chapters.last_published_at,
          'updated_at', chapters.updated_at)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = story_row.id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;
comment on function public.admin_story_overview(uuid) is
  'One story in the admin site for Stories staff: details and chapter list, never the words (S1-E11-07).';
revoke execute on function public.admin_story_overview(uuid) from public, anon;
grant execute on function public.admin_story_overview(uuid) to authenticated;
