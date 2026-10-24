-- Migration: manage chapters: reorder, rename, delete and undo (story S1-E3-04; board 4.4).
--
-- What it adds:
--   move_chapter(code, direction)          one place up (-1) or down (+1): the arrow buttons.
--   set_chapter_order(story_slug, codes)   the whole order at once: dragging.
--   rename_chapter(code, title)            a new title; readers see it straight away (board 4.4:
--                                          "Readers see changes straight away").
--   delete_chapter(code), restore_chapter(code)   the 30-day soft delete and its undo.
--   purge_deleted_chapters()               deletes chapters 30 days after deletion, nightly,
--                                          except anything held for moderation.
-- Decisions:
--   - Positions stay 1, 2, 3… with no gaps among a story's live chapters; deleting closes the gap
--     and undo puts the chapter back at the end, where the writer can move it.
--   - The chapter's address (its code) never changes, so reordering never breaks a link.
--   - Deleting asks once (board 4.4's dialog) and can be undone for content_purge_days (30),
--     as stories do (S1-E3-05); a chapter under an open report is kept past that
--     (content_is_held_for_moderation(), filled by S1-E10).
--   - Every change is the writer's own and needs is_active_member() (the account gate).

/* ---------- Helpers ---------- */

/**
 * renumber_story_chapters: makes a story's live chapters 1, 2, 3… in their current order.
 * Internal: called after a delete, a restore and a reorder.
 */
create or replace function public.renumber_story_chapters(target_story_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chapters set position = ordered.new_position
  from (
    select chapters.id, row_number() over (order by chapters.position, chapters.created_at) as new_position
    from public.chapters
    where chapters.story_id = target_story_id and chapters.deleted_at is null
  ) as ordered
  where chapters.id = ordered.id and chapters.position <> ordered.new_position;
$$;

comment on function public.renumber_story_chapters(uuid) is
  'Internal: a story''s live chapters numbered 1, 2, 3… with no gaps (S1-E3-04).';
revoke execute on function public.renumber_story_chapters(uuid) from public, anon, authenticated;

/* ---------- Order ---------- */

/**
 * move_chapter: moves the caller's own chapter one place up or down (the arrow buttons; WCAG
 * 2.5.7: dragging has a single-pointer alternative).
 * Inputs: chapter_code; direction (-1 up, +1 down). Returns: {"outcome": "ok"}, "not_active",
 *   "not_found" or "at_edge" (already first or last).
 */
create or replace function public.move_chapter(chapter_code text, direction integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
  neighbour public.chapters;
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if direction not in (-1, 1) then
    raise exception 'A chapter moves one place up (-1) or down (1).' using errcode = 'check_violation';
  end if;
  -- The live chapter next to it in that direction, if any.
  select * into neighbour from public.chapters
  where chapters.story_id = chapter.story_id and chapters.deleted_at is null
    and chapters.position = chapter.position + direction
  for update;
  if not found then
    return jsonb_build_object('outcome', 'at_edge');
  end if;
  -- Swap the two positions.
  update public.chapters set position = neighbour.position where chapters.id = chapter.id;
  update public.chapters set position = chapter.position where chapters.id = neighbour.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.move_chapter(text, integer) is
  'Moves the caller''s own chapter one place up or down: {outcome: ok | not_active | not_found | at_edge} (S1-E3-04).';
revoke execute on function public.move_chapter(text, integer) from public, anon;
grant execute on function public.move_chapter(text, integer) to authenticated;

/**
 * set_chapter_order: puts the caller's own story's chapters in a new order (dragging).
 * Inputs: story_slug; chapter_codes, every live chapter's code exactly once, in the new order.
 * Returns: {"outcome": "ok"}, "not_active", "not_found" (no such live story of theirs) or
 *   "wrong_list" (a code missing, repeated or not one of this story's live chapters: the screen
 *   was out of date, so nothing changes).
 */
create or replace function public.set_chapter_order(story_slug text, chapter_codes text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  live_codes text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to reorder chapters.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 1: lock the story's live chapters so nothing moves underneath, then the list must be
  -- exactly those chapters, each once.
  perform 1 from public.chapters
  where chapters.story_id = target_story_id and chapters.deleted_at is null
  for update;
  select array_agg(chapters.code order by chapters.code) into live_codes
  from public.chapters where chapters.story_id = target_story_id and chapters.deleted_at is null;
  if coalesce(cardinality(chapter_codes), 0) <> coalesce(cardinality(live_codes), 0)
     or (select array_agg(listed order by listed) from unnest(chapter_codes) as listed) is distinct from live_codes then
    return jsonb_build_object('outcome', 'wrong_list');
  end if;
  -- Step 2: each chapter takes its place in the list (1-based).
  update public.chapters set position = ordered.new_position
  from unnest(chapter_codes) with ordinality as ordered(code, new_position)
  where chapters.code = ordered.code and chapters.story_id = target_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_chapter_order(text, text[]) is
  'Reorders the caller''s own story''s live chapters: {outcome: ok | not_active | not_found | wrong_list} (S1-E3-04).';
revoke execute on function public.set_chapter_order(text, text[]) from public, anon;
grant execute on function public.set_chapter_order(text, text[]) to authenticated;

/* ---------- Rename ---------- */

/**
 * rename_chapter: gives the caller's own chapter a new title.
 * Inputs: chapter_code; title (up to 120 characters; ş/ţ corrected). Returns: {"outcome":
 *   "ok"}, "not_active" or "not_found".
 * What it does: the draft title changes, and for a published chapter the title readers see
 *   changes too, straight away (board 4.4); the text is untouched, so no "Edited on" date (the
 *   text's edits still wait for "Update chapter", Q10). The draft version moves on, so an
 *   editor open on another device sees the change as a conflict instead of overwriting it.
 * Errors: check_violation for a title over 120 characters.
 */
create or replace function public.rename_chapter(chapter_code text, title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
  clean_title text := public.normalise_romanian_letters(regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g'));
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if char_length(clean_title) > 120 then
    raise exception 'A chapter title can have at most 120 characters (S1-E3-02a).' using errcode = 'check_violation';
  end if;
  update public.chapters set
    draft_title = clean_title,
    draft_version = chapter.draft_version + 1,
    published_title = case when chapter.status = 'published' then clean_title else chapter.published_title end
  where chapters.id = chapter.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.rename_chapter(text, text) is
  'Renames the caller''s own chapter; readers see a published chapter''s new title at once (S1-E3-04).';
revoke execute on function public.rename_chapter(text, text) from public, anon;
grant execute on function public.rename_chapter(text, text) to authenticated;

/* ---------- Delete and undo ---------- */

/**
 * delete_chapter: hides the caller's own chapter at once; undo for content_purge_days (30).
 * Input: chapter_code. Returns: {"outcome": "ok", "purge_on": "<date>"}, "not_active" or
 *   "not_found".
 * What it does: deleted_at is set (readers lose it at once: chapter_is_readable() and the story
 *   page check it), the remaining chapters close the gap, and if it was the story's last
 *   published chapter the story stops being public (S1-E3-03).
 */
create or replace function public.delete_chapter(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  update public.chapters set deleted_at = now() where chapters.id = chapter.id;
  perform public.renumber_story_chapters(chapter.story_id);
  return jsonb_build_object('outcome', 'ok',
    'purge_on', ((now() + make_interval(days => purge_days)) at time zone 'Europe/Bucharest')::date);
end;
$$;

comment on function public.delete_chapter(text) is
  'Soft-deletes the caller''s own chapter; undo for content_purge_days (S1-E3-04).';
revoke execute on function public.delete_chapter(text) from public, anon;
grant execute on function public.delete_chapter(text) to authenticated;

/**
 * restore_chapter: undoes a chapter's deletion within content_purge_days.
 * Input: chapter_code. Returns: {"outcome": "ok"}, "not_active", or "not_found" when the caller
 *   has no deleted chapter at that code, the undo time has passed, or its story is deleted
 *   (undo the story instead: restore_my_story()).
 * What it does: the chapter comes back at the end of the story, with its status as it was (a
 *   published chapter is readable again).
 */
create or replace function public.restore_chapter(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  chapter public.chapters;
begin
  if caller_id is null then
    raise exception 'Sign in to restore a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  -- Step 1: the caller's own deleted chapter, within the undo time, in a live story.
  select chapters.* into chapter from public.chapters
  join public.stories on stories.id = chapters.story_id
  where chapters.code = chapter_code and chapters.user_id = caller_id
    and chapters.deleted_at is not null
    and chapters.deleted_at > now() - make_interval(days => purge_days)
    and stories.deleted_at is null
  for update of chapters;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: back, at the end of the story.
  update public.chapters set
    deleted_at = null,
    position = (select coalesce(max(others.position), 0) + 1 from public.chapters as others
                where others.story_id = chapter.story_id and others.deleted_at is null)
  where chapters.id = chapter.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.restore_chapter(text) is
  'Undoes the caller''s own chapter deletion within content_purge_days; it comes back at the end (S1-E3-04).';
revoke execute on function public.restore_chapter(text) from public, anon;
grant execute on function public.restore_chapter(text) to authenticated;

/**
 * purge_deleted_chapters: deletes for good every chapter deleted more than content_purge_days
 * ago (its revisions go with it), except one held for moderation. Chapters of a deleted story
 * are left to purge_deleted_stories(), which deletes them with the story.
 * Returns: how many were deleted. Run nightly by pg_cron (below; docs/runbooks/scheduled-jobs.md).
 */
create or replace function public.purge_deleted_chapters()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  purged integer;
begin
  delete from public.chapters
  using public.stories
  where stories.id = chapters.story_id
    and stories.deleted_at is null
    and chapters.deleted_at is not null
    and chapters.deleted_at < now() - make_interval(days => purge_days)
    and not public.content_is_held_for_moderation('chapter', chapters.id);
  get diagnostics purged = row_count;
  return purged;
end;
$$;

comment on function public.purge_deleted_chapters() is
  'Nightly: deletes chapters 30 days after their deletion, unless held for moderation (S1-E3-04).';
revoke execute on function public.purge_deleted_chapters() from public, anon, authenticated;

-- Nightly at 03:29 UTC, after the stories' purge (03:23). Naming the job makes this safe to run again.
select cron.schedule('purge-deleted-chapters', '29 3 * * *', 'select public.purge_deleted_chapters();');
