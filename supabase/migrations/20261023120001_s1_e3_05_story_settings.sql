-- Migration: story status, settings, deletion and the public story page (story S1-E3-05;
-- architecture B13, B17; ADR 0004).
--
-- What it adds:
--   completion_status             Ongoing or Completed, shown on the card and used as a filter.
--   stories.comments_enabled      stored now; S1-E6-01 enforces it when comments exist.
--   check_story_basics()          the title, blurb, language and category rules, shared by
--                                 create_story() (now) and update_my_story().
--   update_my_story()             the writer changes their story's settings in one checked call.
--   delete_my_story(), restore_my_story(), purge_deleted_stories()
--                                 the 30-day soft delete with undo, and the nightly purge.
--   content_is_held_for_moderation()  a stub (false) the purge asks before deleting for good,
--                                 so a story under an open report is kept (S1-E10-01, S1-E10-04).
--   get_story_page()              the public story page, the only way readers reach a story
--                                 (ADR 0004): published, not deleted, not moderated away, never
--                                 the user ID; the owner always gets their own (preview).
-- Who calls them: src/features/writing/ (settings, delete, undo) and src/features/reading/
-- (the story page) through supabase.rpc(); pg_cron runs the purge; tests 103.
-- Decisions: soft delete with deleted_at and a purge job (architecture 1.6); the story and all
-- its chapters follow the 30-day soft delete (S1-E3-05; chapters arrive in S1-E3-02a, whose
-- migration extends delete_my_story() and restore_my_story() to them); every write checks
-- is_active_member() (architecture 1.7.8).

/* ---------- Status and comments ---------- */

/** completion_status: whether the writer considers the story finished (S1-E3-05). */
create type public.completion_status as enum ('ongoing', 'completed');

comment on type public.completion_status is 'Ongoing or Completed, the writer''s choice (S1-E3-05).';

alter table public.stories
  add column completion_status public.completion_status not null default 'ongoing',
  -- Stored now; comments arrive with S1-E6-01, which hides existing ones and refuses new ones
  -- while this is off.
  add column comments_enabled boolean not null default true;

comment on column public.stories.completion_status is
  'Ongoing or Completed; shown on the card and story page, a Discover filter (S1-E3-05, S1-E5-01).';
comment on column public.stories.comments_enabled is
  'Off hides existing comments and refuses new ones; enforced by S1-E6-01 (S1-E3-05).';

-- The Discover filter (S1-E5-01) reads live, published stories by status.
create index stories_completion_status_idx
  on public.stories (completion_status)
  where deleted_at is null and first_published_at is not null;

/* ---------- The settings the purge reads ---------- */

insert into public.settings (key, value, is_public, description) values
  ('content_purge_days', '30'::jsonb, true,
   'Days a deleted story or chapter can be undone before it is deleted for good (S1-E3-05, S1-E3-04).');

/* ---------- Shared checks ---------- */

/**
 * check_story_basics: the rules a story's title, blurb, language and category must meet.
 * Inputs: clean_title (trimmed, spaces collapsed), clean_blurb (trimmed), language_code,
 *   category_slug. Returns: the category's ID. Errors: check_violation with a plain message for
 *   a title outside 1 to 120 characters, a blurb over 500, a language with no open market or an
 *   unknown category. Internal: create_story() and update_my_story() call it.
 */
create or replace function public.check_story_basics(
  clean_title text,
  clean_blurb text,
  language_code text,
  category_slug text
)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  chosen_category_id uuid;
begin
  if char_length(clean_title) not between 1 and 120 then
    raise exception 'A title needs 1 to 120 characters (S1-E3-01).' using errcode = 'check_violation';
  end if;
  if char_length(clean_blurb) > 500 then
    raise exception 'A blurb can have at most 500 characters (S1-E3-01).' using errcode = 'check_violation';
  end if;
  if language_code is null or language_code not in (select public.open_story_languages()) then
    raise exception 'Stories can be written only in an open language (S1-E3-01, architecture 1.7.9).'
      using errcode = 'check_violation';
  end if;
  select categories.id into chosen_category_id from public.categories where categories.slug = category_slug;
  if chosen_category_id is null then
    raise exception 'Unknown category "%" (S1-E3-01).', coalesce(category_slug, 'none') using errcode = 'check_violation';
  end if;
  return chosen_category_id;
end;
$$;

comment on function public.check_story_basics(text, text, text, text) is
  'Internal: the title, blurb, language and category rules; returns the category ID (S1-E3-05).';
revoke execute on function public.check_story_basics(text, text, text, text) from public, anon, authenticated;

/**
 * create_story: as in S1-E3-13, now using check_story_basics() so the rules live once.
 * (Same signature, inputs, returns and errors as before.)
 */
create or replace function public.create_story(
  title text,
  blurb text,
  language_code text,
  category_slug text,
  tag_names text[],
  cover jsonb,
  story_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_title text := regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g');
  clean_blurb text := btrim(coalesce(blurb, ''));
  chosen_category_id uuid;
  new_story_id uuid := coalesce(story_id, gen_random_uuid());
  new_slug text;
begin
  -- Step 1: a signed-in person who may write (the account gate; every write checks it).
  if caller_id is null then
    raise exception 'Sign in to create a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;

  -- Step 2: the shared rules, the tags cap and the cover; an ID in use is never reused.
  chosen_category_id := public.check_story_basics(clean_title, clean_blurb, language_code, category_slug);
  if cardinality(coalesce(tag_names, '{}')) > 10 then
    raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
  end if;
  perform public.check_story_cover(cover);
  if exists (select 1 from public.stories where stories.id = new_story_id) then
    raise exception 'That story ID is already in use (S1-E3-13).' using errcode = 'check_violation';
  end if;

  -- Step 3: the row, with a fresh address; a one-in-two-billion clash just picks another.
  loop
    new_slug := public.story_slug_for(clean_title);
    exit when not exists (select 1 from public.stories where stories.slug = new_slug);
  end loop;
  insert into public.stories (
    id, user_id, slug, title, blurb, language_code, category_id,
    cover_kind, cover_design, cover_background, cover_accent, cover_tall_path, cover_square_path
  ) values (
    new_story_id, caller_id, new_slug, clean_title, clean_blurb, language_code, chosen_category_id,
    (cover ->> 'kind')::public.cover_kind, cover ->> 'design', cover ->> 'background', cover ->> 'accent',
    cover ->> 'tall_path', cover ->> 'square_path'
  );

  -- Step 4: the tags, merged and capped.
  perform public.set_story_tags(new_story_id, caller_id, tag_names);

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;

/* ---------- The writer's own story ---------- */

/**
 * my_live_story_id: the ID of the caller's own, undeleted story at a public address.
 * Input: story_slug. Returns: the ID, or null when there is no such story of the caller's.
 * Internal: the settings functions below start with it.
 */
create or replace function public.my_live_story_id(story_slug text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select stories.id from public.stories
  where stories.slug = story_slug and stories.user_id = (select auth.uid()) and stories.deleted_at is null;
$$;

comment on function public.my_live_story_id(text) is
  'Internal: the caller''s own live story at an address, or null (S1-E3-05).';
revoke execute on function public.my_live_story_id(text) from public, anon, authenticated;

/**
 * update_my_story: changes the settings of the writer's own story in one checked call.
 * Inputs: story_slug; changes, a JSON object with any of: title, blurb, language_code,
 *   category_slug, tag_names (an array), cover (see check_story_cover()), completion_status
 *   ('ongoing' | 'completed'), comments_enabled (true | false). Keys left out stay as they are.
 * Returns: {"outcome": "ok"}, {"outcome": "not_active"} when the account may not write, or
 *   {"outcome": "not_found"} when the caller has no live story at that address.
 * Errors: insufficient_privilege when signed out; check_violation for a value the rules refuse
 *   (the form prevents these); feature_not_supported for an upload cover while uploads are off.
 * Where it fits: StorySettingsPage → useStorySettingsForm → supabase.rpc('update_my_story').
 */
create or replace function public.update_my_story(story_slug text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  current_row public.stories;
  new_title text;
  new_blurb text;
  new_language text;
  new_category_slug text;
  new_category_id uuid;
  new_cover jsonb;
begin
  -- Step 1: a signed-in writer who may write, and their own live story.
  if caller_id is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into current_row from public.stories where stories.id = target_story_id;

  -- Step 2: the basics: anything not in `changes` keeps its current value, then all are checked.
  new_title := regexp_replace(btrim(coalesce(changes ->> 'title', current_row.title)), '\s+', ' ', 'g');
  new_blurb := btrim(coalesce(changes ->> 'blurb', current_row.blurb));
  new_language := coalesce(changes ->> 'language_code', current_row.language_code);
  new_category_slug := coalesce(changes ->> 'category_slug',
    (select categories.slug from public.categories where categories.id = current_row.category_id));
  new_category_id := public.check_story_basics(new_title, new_blurb, new_language, new_category_slug);

  -- Step 3: the cover, when given.
  new_cover := changes -> 'cover';
  if new_cover is not null then
    perform public.check_story_cover(new_cover);
  end if;

  -- Step 4: save. The slug never changes (shared links survive a rename, S1-E3-01).
  update public.stories set
    title = new_title,
    blurb = new_blurb,
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    cover_kind = coalesce((new_cover ->> 'kind')::public.cover_kind, cover_kind),
    cover_design = case when new_cover is null then cover_design else new_cover ->> 'design' end,
    cover_background = case when new_cover is null then cover_background else new_cover ->> 'background' end,
    cover_accent = case when new_cover is null then cover_accent else new_cover ->> 'accent' end,
    cover_tall_path = case when new_cover is null then cover_tall_path else new_cover ->> 'tall_path' end,
    cover_square_path = case when new_cover is null then cover_square_path else new_cover ->> 'square_path' end
  where stories.id = target_story_id;

  -- Step 5: the tags, when given.
  if changes ? 'tag_names' then
    if jsonb_array_length(changes -> 'tag_names') > 10 then
      raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
    end if;
    perform public.set_story_tags(target_story_id, caller_id,
      array(select jsonb_array_elements_text(changes -> 'tag_names')));
  end if;

  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.update_my_story(text, jsonb) is
  'Changes the settings of the caller''s own story: {outcome: ok | not_active | not_found} (S1-E3-05).';
revoke execute on function public.update_my_story(text, jsonb) from public, anon;
grant execute on function public.update_my_story(text, jsonb) to authenticated;

/* ---------- Delete, undo and purge ---------- */

/**
 * content_is_held_for_moderation: is this item part of an open report or case, so it must be
 * kept for the moderators even past its purge date? (Lane A stub for S1-E10-01 and S1-E10-04,
 * which replace the body; docs/mocks.md.)
 * Inputs: item_type, item_id. Returns: false for everything in this stub.
 */
create or replace function public.content_is_held_for_moderation(item_type public.reportable_type, item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as 'select false';

comment on function public.content_is_held_for_moderation(public.reportable_type, uuid) is
  'Stub (S1-E3-05): nothing is under report yet; S1-E10-01 and S1-E10-04 fill it in.';
revoke execute on function public.content_is_held_for_moderation(public.reportable_type, uuid) from public, anon, authenticated;

/**
 * delete_my_story: hides the writer's own story at once; it can be undone for content_purge_days.
 * Input: story_slug. Returns: {"outcome": "ok", "purge_on": "<date>"}, "not_active" or
 *   "not_found" as update_my_story(). The chapters follow the story: S1-E3-02a extends this.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: DeleteStoryControl (two confirmations on the screen) → supabase.rpc().
 */
create or replace function public.delete_my_story(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to delete a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Hidden at once: every reader path checks deleted_at; the owner still sees it for undo.
  update public.stories set deleted_at = now() where stories.id = target_story_id;
  return jsonb_build_object('outcome', 'ok',
    'purge_on', ((now() + make_interval(days => purge_days)) at time zone 'Europe/Bucharest')::date);
end;
$$;

comment on function public.delete_my_story(text) is
  'Soft-deletes the caller''s own story; undo for content_purge_days (S1-E3-05).';
revoke execute on function public.delete_my_story(text) from public, anon;
grant execute on function public.delete_my_story(text) to authenticated;

/**
 * restore_my_story: undoes a deletion within content_purge_days.
 * Input: story_slug. Returns: {"outcome": "ok"}, "not_active", or "not_found" when the caller
 *   has no deleted story at that address or the undo time has passed.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.restore_my_story(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  restored integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to restore a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  update public.stories set deleted_at = null
  where stories.slug = story_slug
    and stories.user_id = (select auth.uid())
    and stories.deleted_at is not null
    and stories.deleted_at > now() - make_interval(days => purge_days);
  get diagnostics restored = row_count;
  if restored = 0 then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.restore_my_story(text) is
  'Undoes a story''s deletion within content_purge_days (S1-E3-05).';
revoke execute on function public.restore_my_story(text) from public, anon;
grant execute on function public.restore_my_story(text) to authenticated;

/**
 * purge_deleted_stories: deletes for good the stories deleted more than content_purge_days ago,
 * except those held for the moderators (content_is_held_for_moderation()).
 * Returns: how many stories it removed (their tags go with them, on delete cascade).
 * Where it fits: pg_cron runs it every night (below); tests call it directly.
 */
create or replace function public.purge_deleted_stories()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  removed integer;
begin
  delete from public.stories
  where stories.deleted_at is not null
    and stories.deleted_at <= now() - make_interval(days => purge_days)
    and not public.content_is_held_for_moderation('story', stories.id);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.purge_deleted_stories() is
  'Deletes for good the stories deleted over content_purge_days ago, unless held for moderation; nightly (S1-E3-05).';
revoke execute on function public.purge_deleted_stories() from public, anon, authenticated;

-- Every night at 03:23 UTC (an odd minute, like the error-log purge, so jobs don't queue on the
-- hour). Naming the job makes this safe to run again.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-deleted-stories', '23 3 * * *', 'select public.purge_deleted_stories();');

/* ---------- The public story page ---------- */

/**
 * get_story_page: everything the story page shows, or nothing when the reader may not see it.
 * Input: story_slug. Returns: a JSON object with id (the story's, never the user's), slug, title,
 *   blurb, language_code, category_slug, tags, completion_status, comments_enabled, cover
 *   {kind, design, background, accent}, writer {display_name, handle}, first_published_at,
 *   last_chapter_published_at, chapters (empty until S1-E3-03), is_owner; or null when the story
 *   doesn't exist, is deleted, has no published chapter yet (unless the caller owns it), or is
 *   hidden by a moderator (is_moderated_away(), the shared contract with Lane C). The rating
 *   rule joins here in S1-E3-06 (rating_allows()); blocks in S1-E4-01a.
 * Who may call it: anyone, signed out included (ADR 0004: readers never read the tables).
 */
create or replace function public.get_story_page(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  caller_id uuid := (select auth.uid());
  is_owner boolean;
begin
  -- Step 1: the story, if it exists and isn't deleted.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  is_owner := caller_id is not null and caller_id = story.user_id;

  -- Step 2: readers see it only once a chapter is published and no moderator hid it.
  if not is_owner then
    if story.first_published_at is null then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the writer's pen name or username and never the user ID.
  return jsonb_build_object(
    'id', story.id,
    'slug', story.slug,
    'title', story.title,
    'blurb', story.blurb,
    'language_code', story.language_code,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', coalesce((
      select jsonb_agg(tags.name order by story_tags.created_at)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      where story_tags.story_id = story.id), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'writer', (select jsonb_build_object('display_name', public.display_name(profiles.handle, profiles.pen_name),
      'handle', profiles.handle) from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'chapters', '[]'::jsonb,
    'is_owner', is_owner
  );
end;
$$;

comment on function public.get_story_page(text) is
  'The public story page, or null when the reader may not see it; never the user ID (S1-E3-05, ADR 0004).';
grant execute on function public.get_story_page(text) to anon, authenticated;
