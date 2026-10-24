-- Migration: publish, update, unpublish and schedule chapters (story S1-E3-03; architecture
-- B13, B16, B17; ADR 0004).
--
-- What it adds:
--   chapters.unpublished_at, published_word_count   the published copy's own facts.
--   chapter_is_readable(chapter_id)   one rule for "a reader may see this chapter": published,
--                                     not deleted, its story not deleted, neither hidden by a
--                                     moderator. get_story_page() uses it now; get_chapter()
--                                     (S1-E4-01a) and comment reads (S1-E6-01) use it next.
--   publish_chapter(code)             the draft becomes the published copy; the story becomes
--                                     public; a 'chapter_published' job is queued (IDs only).
--   update_published_chapter(code)    the writer's edits reach readers ("Edited on"; Q10).
--   unpublish_chapter(code)           back to a draft; the published copy and its comments kept.
--   schedule_chapter(code, publish_at), cancel_schedule(code)
--   publish_due_chapters()            the job that publishes scheduled chapters, every minute.
--   get_story_page()                  public while the story has a published chapter (not the
--                                     first_published_at stamp), and now lists the chapters.
-- Decisions:
--   - No automated text check runs and nothing is held before it goes live; moderation acts on
--     reports (decided 16 Oct 2026, late evening, Q42 and Q43).
--   - Scheduled times are entered as Romania time (Europe/Bucharest) for everyone in March
--     (Robert, 23 Oct 2026, Q7); the database stores the instant (timestamptz). A scheduled
--     chapter goes live within 5 minutes (proposal): the job runs every minute.
--   - Editing a published chapter autosaves to the draft; readers see it after "Update chapter",
--     which sets edited_at (Robert, 23 Oct 2026, Q10).
--   - Followers are told by S1-E7-01, which reads the 'chapter_published' jobs; nothing is sent
--     yet (docs/mocks.md).

/* ---------- Columns ---------- */

alter table public.chapters
  add column unpublished_at timestamptz,
  add column published_word_count integer;

comment on column public.chapters.unpublished_at is
  'When the writer last unpublished it; the published copy and its comments are kept (S1-E3-03).';
comment on column public.chapters.published_word_count is
  'The published copy''s word count, for the minutes to read (S1-E4-01a); the draft has its own.';

-- Scheduled chapters, found by the job every minute.
create index chapters_scheduled_idx on public.chapters (scheduled_for)
  where status = 'scheduled' and deleted_at is null;
-- Published chapters of a story, for the story page and the reader.
create index chapters_published_idx on public.chapters (story_id, position)
  where status = 'published' and deleted_at is null;

alter table public.chapters
  add constraint chapters_scheduled_has_time check (status <> 'scheduled' or scheduled_for is not null),
  add constraint chapters_published_has_copy check (status <> 'published' or published_body is not null);

/* ---------- The readable rule ---------- */

/**
 * chapter_is_readable: may readers see this chapter at all (before the rating and blocks)?
 * Input: chapter_id. Returns: true when the chapter is published and not deleted, its story is
 *   not deleted, and a moderator has hidden neither (is_moderated_away(), Lane C's contract).
 * Where it fits: get_story_page() lists only readable chapters; get_chapter() (S1-E4-01a) and
 *   the comment reads (S1-E6-01: an unpublished chapter's comments are hidden but kept) call it.
 *   The rating and blocks are checked by those functions, per reader.
 */
create or replace function public.chapter_is_readable(chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.id = chapter_id
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and stories.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
      and not public.is_moderated_away('story', stories.id)
  );
$$;

comment on function public.chapter_is_readable(uuid) is
  'True when readers may see a chapter: published, not deleted, not hidden by a moderator (S1-E3-03).';
grant execute on function public.chapter_is_readable(uuid) to anon, authenticated;

/* ---------- Helpers ---------- */

/**
 * my_live_chapter: the caller's own live chapter at a code, locked for the change, or null.
 * Internal: every writer function below starts with it.
 */
create or replace function public.my_live_chapter(chapter_code text)
returns public.chapters
language sql
volatile
set search_path = ''
as $$
  select * from public.chapters
  where chapters.code = chapter_code
    and chapters.user_id = (select auth.uid())
    and chapters.deleted_at is null
  for update;
$$;

comment on function public.my_live_chapter(text) is
  'Internal: the caller''s own live chapter at a code, locked, or null (S1-E3-03).';
revoke execute on function public.my_live_chapter(text) from public, anon, authenticated;

/**
 * chapter_publish_now: the one place a chapter goes live, for the writer's button and the job.
 * Input: the chapter row (locked by the caller). Returns: nothing.
 * What it does, in one transaction: the draft becomes the published copy; the dates are set;
 *   the story is stamped (first_published_at once, last_chapter_published_at every time); a
 *   revision is written; a 'chapter_published' job is queued with IDs only (S1-E7-01 reads it;
 *   architecture B16). No text check and no hold (Q42, Q43).
 * Internal: publish_chapter() and publish_due_chapters() call it.
 */
create or replace function public.chapter_publish_now(chapter public.chapters)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_time timestamptz := now();
begin
  update public.chapters set
    status = 'published',
    published_title = chapter.draft_title,
    published_body = chapter.draft_body,
    published_word_count = chapter.word_count,
    first_published_at = coalesce(chapter.first_published_at, published_time),
    last_published_at = published_time,
    scheduled_for = null,
    unpublished_at = null
  where chapters.id = chapter.id;
  update public.stories set
    first_published_at = coalesce(stories.first_published_at, published_time),
    last_chapter_published_at = published_time
  where stories.id = chapter.story_id;
  insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
  values (chapter.id, chapter.user_id, chapter.user_id, 'published', chapter.draft_title, chapter.draft_body);
  insert into public.jobs (kind, payload) values ('chapter_published',
    jsonb_build_object('chapter_id', chapter.id, 'story_id', chapter.story_id));
end;
$$;

comment on function public.chapter_publish_now(public.chapters) is
  'Internal: puts a chapter live, stamps the story, writes a revision and queues chapter_published (S1-E3-03).';
revoke execute on function public.chapter_publish_now(public.chapters) from public, anon, authenticated;

/**
 * chapter_gate_outcome: the checks every writer action on a chapter starts with.
 * Input: the caller's own live chapter as my_live_chapter() found it (all nulls when none).
 * Returns: 'not_active' (the account gate), 'not_found' (no such chapter of theirs) or null
 *   (go ahead). Errors: insufficient_privilege when signed out.
 * Internal.
 */
create or replace function public.chapter_gate_outcome(chapter public.chapters)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return 'not_active';
  end if;
  if chapter.id is null then
    return 'not_found';
  end if;
  return null;
end;
$$;

comment on function public.chapter_gate_outcome(public.chapters) is
  'Internal: not_active, not_found or null (go ahead) for a writer action on a chapter (S1-E3-03).';
revoke execute on function public.chapter_gate_outcome(public.chapters) from public, anon, authenticated;

/* ---------- The writer's actions ---------- */

/**
 * publish_chapter: puts the caller's own draft chapter live now.
 * Input: chapter_code. Returns: {"outcome": "ok", "published_at": ...}, "not_active",
 *   "not_found", "empty" (nothing written yet) or "wrong_state" (already published: use
 *   update_published_chapter()).
 * Errors: insufficient_privilege when signed out.
 * Where it fits: the editor's "Publish chapter" button, after the autosave has saved.
 */
create or replace function public.publish_chapter(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  perform public.chapter_publish_now(chapter);
  return jsonb_build_object('outcome', 'ok', 'published_at', now());
end;
$$;

comment on function public.publish_chapter(text) is
  'Puts the caller''s own chapter live now: {outcome: ok | not_active | not_found | empty | wrong_state} (S1-E3-03).';
revoke execute on function public.publish_chapter(text) from public, anon;
grant execute on function public.publish_chapter(text) to authenticated;

/**
 * update_published_chapter: the writer's saved draft replaces what readers see (Q10).
 * Input: chapter_code. Returns: {"outcome": "ok", "edited_at": ...}, "not_active", "not_found",
 *   "empty" or "wrong_state" (not published).
 * What it does: copies the draft to the published copy, sets edited_at ("Edited on"), writes an
 *   'edited' revision. No new job: followers are told about new chapters, not every edit.
 */
create or replace function public.update_published_chapter(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status <> 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  update public.chapters set
    published_title = chapter.draft_title,
    published_body = chapter.draft_body,
    published_word_count = chapter.word_count,
    edited_at = now()
  where chapters.id = chapter.id;
  insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
  values (chapter.id, chapter.user_id, chapter.user_id, 'edited', chapter.draft_title, chapter.draft_body);
  return jsonb_build_object('outcome', 'ok', 'edited_at', now());
end;
$$;

comment on function public.update_published_chapter(text) is
  'Readers get the writer''s saved edits ("Edited on"): {outcome: ok | not_active | not_found | empty | wrong_state} (S1-E3-03, Q10).';
revoke execute on function public.update_published_chapter(text) from public, anon;
grant execute on function public.update_published_chapter(text) to authenticated;

/**
 * unpublish_chapter: takes the caller's own published chapter back to a draft.
 * Input: chapter_code. Returns: {"outcome": "ok"}, "not_active", "not_found" or "wrong_state".
 * What it does: readers can no longer open it (chapter_is_readable() is false); the published
 *   copy, its revisions and its comments are kept; unpublished_at is set. If it was the story's
 *   last published chapter, the story stops being public too (get_story_page()).
 */
create or replace function public.unpublish_chapter(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status <> 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  update public.chapters set status = 'draft', unpublished_at = now() where chapters.id = chapter.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.unpublish_chapter(text) is
  'Takes the caller''s own chapter back to a draft; the published copy and comments are kept (S1-E3-03).';
revoke execute on function public.unpublish_chapter(text) from public, anon;
grant execute on function public.unpublish_chapter(text) to authenticated;

/**
 * schedule_chapter: publishes the caller's own draft chapter at a set moment.
 * Inputs: chapter_code; publish_at (an instant; the screen turns the writer's Romania date and
 *   time into one, Q7). Returns: {"outcome": "ok", "scheduled_for": ...}, "not_active",
 *   "not_found", "empty", "wrong_state" (already published) or "bad_time" (not in the future,
 *   or more than a year ahead).
 * What it does: status 'scheduled' and the moment; the draft as it is at that moment goes live
 *   (the writer can keep editing). Scheduling again moves the moment.
 */
create or replace function public.schedule_chapter(chapter_code text, publish_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  if publish_at is null or publish_at <= now() or publish_at > now() + interval '1 year' then
    return jsonb_build_object('outcome', 'bad_time');
  end if;
  update public.chapters set status = 'scheduled', scheduled_for = publish_at where chapters.id = chapter.id;
  return jsonb_build_object('outcome', 'ok', 'scheduled_for', publish_at);
end;
$$;

comment on function public.schedule_chapter(text, timestamptz) is
  'Schedules the caller''s own draft chapter: {outcome: ok | not_active | not_found | empty | wrong_state | bad_time} (S1-E3-03).';
revoke execute on function public.schedule_chapter(text, timestamptz) from public, anon;
grant execute on function public.schedule_chapter(text, timestamptz) to authenticated;

/**
 * cancel_schedule: takes a scheduled chapter back to a draft.
 * Input: chapter_code. Returns: {"outcome": "ok"}, "not_active", "not_found" or "wrong_state".
 */
create or replace function public.cancel_schedule(chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status <> 'scheduled' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  update public.chapters set status = 'draft', scheduled_for = null where chapters.id = chapter.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.cancel_schedule(text) is
  'Takes the caller''s own scheduled chapter back to a draft (S1-E3-03).';
revoke execute on function public.cancel_schedule(text) from public, anon;
grant execute on function public.cancel_schedule(text) to authenticated;

/* ---------- The job ---------- */

/**
 * publish_due_chapters: publishes every scheduled chapter whose moment has come.
 * Returns: how many went live. Called every minute by pg_cron (below); tests call it directly.
 * Skips, and leaves scheduled: a chapter whose story or itself is deleted, or whose writer is no
 *   longer active (suspended, banned; account_state()), so a sanction also stops the queue.
 * One chapter at a time, each locked and skipped if another run holds it, so two runs never
 * publish the same chapter twice.
 */
create or replace function public.publish_due_chapters()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due public.chapters;
  published_count integer := 0;
begin
  for due in
    select chapters.* from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.status = 'scheduled'
      and chapters.scheduled_for <= now()
      and chapters.deleted_at is null
      and stories.deleted_at is null
      and public.account_state(chapters.user_id) = 'active'
    order by chapters.scheduled_for
    for update of chapters skip locked
  loop
    perform public.chapter_publish_now(due);
    published_count := published_count + 1;
  end loop;
  return published_count;
end;
$$;

comment on function public.publish_due_chapters() is
  'The every-minute job: publishes scheduled chapters whose time has come (S1-E3-03, architecture B17).';
revoke execute on function public.publish_due_chapters() from public, anon, authenticated;

-- Every minute, so a chapter goes live within 5 minutes of its time (proposal). To change the
-- interval, change the schedule here in a new migration (docs/runbooks/scheduled-jobs.md).
select cron.schedule('publish-due-chapters', '* * * * *', 'select public.publish_due_chapters()');

/* ---------- The story page: public while a chapter is published, with the chapter list ---------- */

/**
 * story_has_readable_chapter: does the story have at least one chapter readers may open?
 * Internal: get_story_page() and, later, the Discover lists (S1-E5-01).
 */
create or replace function public.story_has_readable_chapter(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chapters
    where chapters.story_id = target_story_id
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
  );
$$;

comment on function public.story_has_readable_chapter(uuid) is
  'Internal: true while a story has a chapter readers may open (S1-E3-03).';
revoke execute on function public.story_has_readable_chapter(uuid) from public, anon, authenticated;

/**
 * story_page_chapters: the chapter list on the story page.
 * Returns: a JSON array, in order: for readers, the readable chapters only, numbered 1, 2, 3…
 *   among themselves; for the owner (is_owner), every live chapter with its status, so the
 *   preview shows drafts too. Each item: code, number, title, status, published_at, edited_at,
 *   word_count. Never the user ID.
 * Internal: get_story_page().
 */
create or replace function public.story_page_chapters(target_story_id uuid, is_owner boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', listed.code,
      'number', listed.number,
      'title', listed.title,
      'status', listed.status,
      'published_at', listed.first_published_at,
      'edited_at', listed.edited_at,
      'word_count', listed.word_count
    ) order by listed.number), '[]'::jsonb)
  from (
    select chapters.code,
      row_number() over (order by chapters.position) as number,
      case when is_owner then chapters.draft_title else chapters.published_title end as title,
      chapters.status,
      chapters.first_published_at,
      chapters.edited_at,
      case when is_owner then chapters.word_count else chapters.published_word_count end as word_count
    from public.chapters
    where chapters.story_id = target_story_id
      and chapters.deleted_at is null
      and (is_owner or public.chapter_is_readable(chapters.id))
  ) as listed;
$$;

comment on function public.story_page_chapters(uuid, boolean) is
  'Internal: the story page''s chapter list, readable chapters for readers and every live one for the owner (S1-E3-03).';
revoke execute on function public.story_page_chapters(uuid, boolean) from public, anon, authenticated;

/**
 * get_story_page: as in S1-E3-05 and S1-E3-06, with two changes from S1-E3-03: readers see the
 * story while it has a chapter they may open (story_has_readable_chapter()), not merely once
 * one was published, so unpublishing the last chapter takes the story down again; and
 * 'chapters' is the chapter list (story_page_chapters()).
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

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18) and no moderator hid it.
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    if not public.rating_allows(story.rating) then
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
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object('display_name', public.display_name(profiles.handle, profiles.pen_name),
      'handle', profiles.handle) from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner
  );
end;
$$;
