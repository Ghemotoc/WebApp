/*
 * CALM-6: the last chapter (design handover "Build: handover for the simplified design",
 * "The last chapter", steps 1 to 9; Robert's decision card "A switch when publishing",
 * 20 Nov 2026, 12:43 UTC).
 *
 * The writer turns on "This is the last chapter" when they publish or schedule that chapter.
 * Only then do readers see "of 15" and "Last chapter …", and the story turns Completed once
 * that chapter is out.
 *
 * What it does:
 *   1. chapters.is_last, with at most one live marked chapter per story (each language edition
 *      is its own story row, so each edition has its own mark).
 *   2. Backfill: a story already Completed gets the mark on its highest published chapter, so
 *      completed stories (the classics included) keep "of N".
 *   3. story_last_chapter_number(): the number readers see after "of", or null. Every read
 *      calls it, so the rule lives in one place.
 *   4. publish_chapter() and schedule_chapter() take as_last (dropped and made again, with their
 *      grants and comments). A new outcome, not_last, refuses the mark when a later chapter is
 *      already out or scheduled.
 *   5. chapter_publish_now(), shared by publish_chapter() and publish_due_chapters(), turns the
 *      story Completed when the chapter it puts out holds the mark.
 *   6. set_chapter_last(): the switch on a scheduled chapter and on the latest published one.
 *   7. The mark comes off by itself, and the story goes back to Ongoing, when the marked chapter
 *      is unpublished, its schedule is cancelled, it is deleted, or a chapter is published,
 *      scheduled, moved or restored after it (check_last_chapter_mark()).
 *   8. update_my_story(): setting the status back to Ongoing clears the mark. Completed set by
 *      hand marks nothing.
 *   9. Reads: last_chapter_number in get_chapter(), get_story_page() and latest_place_json()
 *      (Library, Continue reading); next_chapter (the next scheduled chapter's number, time and
 *      mark) in get_chapter() and get_story_page().
 * Privacy: no personal data. is_last is a fact about a chapter that readers see anyway.
 * Who calls it: src/features/writing/hooks/useChapterPublishing.ts (publish, schedule, the
 *   switch); the reader, story page, Library and Discover reads.
 * Tests: supabase/tests/database/392-last-chapter.test.sql.
 */

/* ---------- 1. The mark ---------- */

alter table public.chapters add column is_last boolean not null default false;

comment on column public.chapters.is_last is
  'The writer marked this as the story''s last chapter when publishing or scheduling it (CALM-6; Robert, 20 Nov 2026, 12:43 UTC). Readers see "of N" only while a marked chapter is published or scheduled.';

-- A story never has two live marks. A deleted chapter loses its mark (check_last_chapter_mark()),
-- so a restored one can't clash either.
create unique index chapters_one_last_per_story on public.chapters (story_id)
  where is_last and deleted_at is null;

/* ---------- 2. Backfill ---------- */

/*
 * mark_completed_stories_last: for every story already Completed that has no mark yet, marks its
 * published chapter with the highest position. Run once here; kept as a function so the
 * database tests can prove it (392-last-chapter.test.sql).
 * Inputs: none. Returns: how many chapters it marked.
 */
create function public.mark_completed_stories_last()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked_count integer;
begin
  update public.chapters set is_last = true
  where chapters.id in (
    select distinct on (chapters.story_id) chapters.id
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where stories.completion_status = 'completed'
      and chapters.status = 'published' and chapters.deleted_at is null
      and not exists (select 1 from public.chapters as marked
                      where marked.story_id = stories.id and marked.is_last and marked.deleted_at is null)
    order by chapters.story_id, chapters.position desc);
  get diagnostics marked_count = row_count;
  return marked_count;
end;
$$;

comment on function public.mark_completed_stories_last() is
  'Internal, run once by the CALM-6 migration: marks the highest published chapter of every Completed story without a mark.';

revoke all on function public.mark_completed_stories_last() from public, anon, authenticated;

select public.mark_completed_stories_last();

/* ---------- 3. The number after "of" ---------- */

/*
 * chapter_number_through: the number a chapter at this position carries for readers, counting
 * the story's live chapters up to it that are out or scheduled (drafts carry no number).
 * Inputs: the story and a position. Returns: the count, 0 when none.
 * Flow: story_last_chapter_number() and next_chapter_json().
 */
create function public.chapter_number_through(target_story_id uuid, through_position integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.chapters
  where chapters.story_id = target_story_id
    and chapters.deleted_at is null
    and chapters.position <= through_position
    and (chapters.status = 'scheduled' or public.chapter_is_readable(chapters.id));
$$;

comment on function public.chapter_number_through(uuid, integer) is
  'Internal: how many of a story''s live chapters up to a position are out or scheduled, the number readers see (CALM-6).';

revoke all on function public.chapter_number_through(uuid, integer) from public, anon, authenticated;

/*
 * story_last_chapter_number: the number of the story's marked chapter while it is published or
 * scheduled, otherwise null. Readers see "Chapter 14 of 15" only when this is not null, and
 * "Chapter 14" otherwise (CALM-6, step 3).
 * Inputs: the story. Returns: the number, or null.
 * Flow: get_chapter(), get_story_page(), latest_place_json() and next_chapter_json().
 */
create function public.story_last_chapter_number(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select public.chapter_number_through(marked.story_id, marked.position)
  from public.chapters as marked
  where marked.story_id = target_story_id
    and marked.is_last and marked.deleted_at is null
    and marked.status in ('published', 'scheduled');
$$;

comment on function public.story_last_chapter_number(uuid) is
  'Internal: the number of the story''s marked last chapter while it is out or scheduled, else null (CALM-6).';

revoke all on function public.story_last_chapter_number(uuid) from public, anon, authenticated;

/*
 * next_chapter_json: the story's next scheduled chapter, for "Next chapter Thursday" and
 * "Last chapter Thursday" (CALM-6, step 9). Only the earliest scheduled chapter by position.
 * Inputs: the story. Returns: {number, scheduled_for, is_last}, or null when nothing is scheduled.
 * Flow: get_chapter() and get_story_page().
 */
create function public.next_chapter_json(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', public.chapter_number_through(scheduled.story_id, scheduled.position),
    'scheduled_for', scheduled.scheduled_for,
    'is_last', scheduled.is_last)
  from public.chapters as scheduled
  where scheduled.story_id = target_story_id
    and scheduled.status = 'scheduled' and scheduled.deleted_at is null
  order by scheduled.position
  limit 1;
$$;

comment on function public.next_chapter_json(uuid) is
  'Internal: the story''s next scheduled chapter {number, scheduled_for, is_last}, or null (CALM-6).';

revoke all on function public.next_chapter_json(uuid) from public, anon, authenticated;

/* ---------- 7. When the mark comes off ---------- */

/*
 * has_chapter_out_after: true when a live chapter after this position is published or scheduled.
 * Inputs: the story and a position. Returns: true or false.
 * Flow: the not_last refusals and check_last_chapter_mark().
 */
create function public.has_chapter_out_after(target_story_id uuid, after_position integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chapters as later
    where later.story_id = target_story_id
      and later.deleted_at is null
      and later.position > after_position
      and later.status in ('published', 'scheduled'));
$$;

comment on function public.has_chapter_out_after(uuid, integer) is
  'Internal: a later live chapter is already published or scheduled (CALM-6).';

revoke all on function public.has_chapter_out_after(uuid, integer) from public, anon, authenticated;

/*
 * check_last_chapter_mark: takes the mark off, and sets the story back to Ongoing, when the
 * marked chapter is no longer published or scheduled, was deleted, or a later chapter is out or
 * scheduled (CALM-6, step 7). It does nothing to a story without a mark, so a story set to
 * Completed by hand stays Completed.
 * Inputs: the story. Returns: nothing.
 * Flow: called at the end of unpublish_chapter(), cancel_schedule(), delete_chapter(),
 *   move_chapter(), set_chapter_order(), restore_chapter(), publish_chapter() and
 *   schedule_chapter().
 */
create function public.check_last_chapter_mark(target_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked public.chapters;
begin
  -- Step 1: the marked chapter, a live one first (a deleted one still holds its old mark).
  select * into marked from public.chapters
  where chapters.story_id = target_story_id and chapters.is_last
  order by chapters.deleted_at nulls first
  limit 1;
  if not found then
    return;
  end if;
  -- Step 2: the mark still holds while the chapter is live, out or scheduled, and last.
  if marked.deleted_at is null
     and marked.status in ('published', 'scheduled')
     and not public.has_chapter_out_after(target_story_id, marked.position) then
    return;
  end if;
  -- Step 3: otherwise it comes off every chapter of the story and the story is Ongoing again.
  update public.chapters set is_last = false
  where chapters.story_id = target_story_id and chapters.is_last;
  update public.stories set completion_status = 'ongoing'
  where stories.id = target_story_id;
end;
$$;

comment on function public.check_last_chapter_mark(uuid) is
  'Internal: takes the last-chapter mark off and sets the story Ongoing when the mark no longer holds (CALM-6).';

revoke all on function public.check_last_chapter_mark(uuid) from public, anon, authenticated;

/*
 * mark_chapter_last: puts the mark on one chapter, taking it off any other chapter of the story.
 * Inputs: the chapter. Returns: nothing.
 * Flow: publish_chapter(), schedule_chapter() and set_chapter_last(), after their checks.
 */
create function public.mark_chapter_last(chapter public.chapters)
returns void
language sql
security definer
set search_path = ''
as $$
  -- The other mark first, so the unique index never sees two.
  update public.chapters set is_last = false
  where chapters.story_id = chapter.story_id and chapters.is_last and chapters.id <> chapter.id;
  update public.chapters set is_last = true where chapters.id = chapter.id;
$$;

comment on function public.mark_chapter_last(public.chapters) is
  'Internal: marks a chapter as its story''s last and clears any other mark (CALM-6).';

revoke all on function public.mark_chapter_last(public.chapters) from public, anon, authenticated;

/* ---------- 5. A marked chapter going out completes the story ---------- */

/*
 * chapter_publish_now: puts a chapter live now and records it (S1-E3-03). CALM-6: when the
 * chapter holds the last-chapter mark, the story turns Completed in the same step, for
 * publish_chapter() and for publish_due_chapters() alike.
 * Inputs: the chapter row. Returns: nothing.
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
  -- CALM-6: the marked last chapter is out, so the story is Completed. The mark is read from the
  -- table, because publish_chapter() may have set it after reading `chapter`.
  if exists (select 1 from public.chapters where chapters.id = chapter.id and chapters.is_last) then
    update public.stories set completion_status = 'completed' where stories.id = chapter.story_id;
  end if;
  insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
  values (chapter.id, chapter.user_id, chapter.user_id, 'published', chapter.draft_title, chapter.draft_body);
  insert into public.jobs (kind, payload) values ('chapter_published',
    jsonb_build_object('chapter_id', chapter.id, 'story_id', chapter.story_id));
end;
$$;

/* ---------- 4. Publishing and scheduling with the mark ---------- */

drop function public.publish_chapter(text);

/*
 * publish_chapter: puts the caller's own chapter live now (S1-E3-03), optionally as the story's
 * last chapter (CALM-6).
 * Inputs: the chapter's code; as_last, true when the writer turned on "This is the last chapter".
 * Returns: {outcome: ok | not_active | not_found | empty | wrong_state | original_not_published
 *   | not_last, published_at}. not_last: a later chapter is already out or scheduled.
 * Errors: 42501 when signed out.
 * Flow: the publish panel (useChapterPublishing) → this → chapter_publish_now() → the
 *   chapter_published job (notifications).
 */
create function public.publish_chapter(chapter_code text, as_last boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  -- Step 1: the caller's own live chapter, a draft or scheduled one with words in it.
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  if chapter.status = 'published' then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  if btrim(chapter.draft_body) = '' then
    return jsonb_build_object('outcome', 'empty');
  end if;
  -- TRANSLATE-1a: a translation goes out only after the chapter it translates.
  if chapter.translation_of_chapter_id is not null and not exists (
      select 1 from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id
        and originals.status = 'published' and originals.deleted_at is null) then
    return jsonb_build_object('outcome', 'original_not_published');
  end if;
  -- Step 2 (CALM-6): the mark only fits a chapter with nothing out or scheduled after it.
  if as_last then
    if public.has_chapter_out_after(chapter.story_id, chapter.position) then
      return jsonb_build_object('outcome', 'not_last');
    end if;
    perform public.mark_chapter_last(chapter);
  end if;
  -- Step 3: out now; a marked chapter turns the story Completed (chapter_publish_now()).
  perform public.chapter_publish_now(chapter);
  -- Step 4 (CALM-6, step 7): a chapter out after the marked one takes that mark off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok', 'published_at', now());
end;
$$;

revoke all on function public.publish_chapter(text, boolean) from public, anon;
grant execute on function public.publish_chapter(text, boolean) to authenticated;

comment on function public.publish_chapter(text, boolean) is
  'Puts the caller''s own chapter live now, as the last when as_last: {outcome: ok | not_active | not_found | empty | wrong_state | original_not_published | not_last} (S1-E3-03, CALM-6).';

drop function public.schedule_chapter(text, timestamptz);

/*
 * schedule_chapter: sets the caller's own draft or scheduled chapter to go out later (S1-E3-03),
 * optionally as the story's last chapter (CALM-6). The story turns Completed only once the
 * chapter is out (publish_due_chapters() through chapter_publish_now()).
 * Inputs: the chapter's code; the time (in the next year); as_last, the switch.
 * Returns: {outcome: ok | not_active | not_found | empty | wrong_state | bad_time
 *   | original_not_published | not_last, scheduled_for}.
 * Errors: 42501 when signed out.
 * Flow: the publish panel (useChapterPublishing) → this → publish_due_chapters() at the time.
 */
create function public.schedule_chapter(chapter_code text, publish_at timestamptz, as_last boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  -- Step 1: the caller's own live chapter, not yet out, with words in it and a time ahead.
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
  -- TRANSLATE-1a: a translation goes out only after the chapter it translates.
  if chapter.translation_of_chapter_id is not null and not exists (
      select 1 from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id
        and originals.status = 'published' and originals.deleted_at is null) then
    return jsonb_build_object('outcome', 'original_not_published');
  end if;
  -- Step 2 (CALM-6): the mark only fits a chapter with nothing out or scheduled after it.
  if as_last then
    if public.has_chapter_out_after(chapter.story_id, chapter.position) then
      return jsonb_build_object('outcome', 'not_last');
    end if;
    perform public.mark_chapter_last(chapter);
  end if;
  -- Step 3: scheduled.
  update public.chapters set status = 'scheduled', scheduled_for = publish_at where chapters.id = chapter.id;
  -- Step 4 (CALM-6, step 7): a chapter scheduled after the marked one takes that mark off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok', 'scheduled_for', publish_at);
end;
$$;

revoke all on function public.schedule_chapter(text, timestamptz, boolean) from public, anon;
grant execute on function public.schedule_chapter(text, timestamptz, boolean) to authenticated;

comment on function public.schedule_chapter(text, timestamptz, boolean) is
  'Schedules the caller''s own draft chapter, as the last when as_last: {outcome: ok | not_active | not_found | empty | wrong_state | bad_time | original_not_published | not_last} (S1-E3-03, CALM-6).';

/* ---------- 6. The switch after publishing or scheduling ---------- */

/*
 * set_chapter_last: the "This is the last chapter" switch on a chapter already scheduled or out
 * (CALM-6, step 6).
 * Inputs: the chapter's code; is_last, the switch's new state.
 * Returns: {outcome: ok | not_active | not_found | not_last | wrong_state}.
 *   - A scheduled chapter: on or off. Off leaves the story's status as it is.
 *   - The story's latest published chapter: on only, and the story turns Completed at once. After
 *     that the mark comes off only by setting the story back to Ongoing (update_my_story()).
 *   - not_last: a later chapter is already out or scheduled. wrong_state: anything else.
 * Errors: 42501 when signed out.
 * Flow: the publish panel's switch (useChapterPublishing) → this.
 */
create function public.set_chapter_last(chapter_code text, is_last boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
begin
  -- Step 1: the same owner and account checks as publish_chapter().
  if refusal is not null then
    return jsonb_build_object('outcome', refusal);
  end if;
  -- Step 2: a draft never holds the mark, and a published chapter's mark doesn't come off here.
  if chapter.status = 'draft' or (chapter.status = 'published' and not is_last) then
    return jsonb_build_object('outcome', 'wrong_state');
  end if;
  -- Step 3: a scheduled chapter's switch going off.
  if not is_last then
    update public.chapters set is_last = false where chapters.id = chapter.id;
    return jsonb_build_object('outcome', 'ok');
  end if;
  -- Step 4: on, only with nothing out or scheduled after it.
  if public.has_chapter_out_after(chapter.story_id, chapter.position) then
    return jsonb_build_object('outcome', 'not_last');
  end if;
  perform public.mark_chapter_last(chapter);
  -- Step 5: a chapter already out completes the story now.
  if chapter.status = 'published' then
    update public.stories set completion_status = 'completed' where stories.id = chapter.story_id;
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

revoke all on function public.set_chapter_last(text, boolean) from public, anon;
grant execute on function public.set_chapter_last(text, boolean) to authenticated;

comment on function public.set_chapter_last(text, boolean) is
  'The last-chapter switch on the caller''s own scheduled or latest published chapter: {outcome: ok | not_active | not_found | not_last | wrong_state} (CALM-6).';



/* ---------- 7. The mark coming off, in each function that can break it ---------- */


CREATE OR REPLACE FUNCTION "public"."unpublish_chapter"("chapter_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  -- CALM-6, step 7: the chapter is no longer out, so the last-chapter mark may come off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

CREATE OR REPLACE FUNCTION "public"."cancel_schedule"("chapter_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  -- CALM-6, step 7: the chapter is no longer scheduled, so the last-chapter mark may come off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

CREATE OR REPLACE FUNCTION "public"."delete_chapter"("chapter_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  -- CALM-6, step 7: a deleted chapter holds no mark, so the last-chapter mark may come off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok',
    'purge_on', ((now() + make_interval(days => purge_days)) at time zone 'Europe/Bucharest')::date);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."move_chapter"("chapter_code" "text", "direction" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  chapter public.chapters := public.my_live_chapter(chapter_code);
  refusal text := public.chapter_gate_outcome(chapter);
  neighbour public.chapters;
  positions_before jsonb;
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
  -- Swap the two positions, then record both changes: this chapter is the one the writer moved.
  positions_before := public.chapter_positions(chapter.story_id);
  update public.chapters set position = neighbour.position where chapters.id = chapter.id;
  update public.chapters set position = chapter.position where chapters.id = neighbour.id;
  perform public.record_chapter_moves(chapter.story_id, positions_before, chapter.id);
  -- CALM-6, step 7: a chapter out or scheduled may now come after the marked one, so the last-chapter mark may come off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

CREATE OR REPLACE FUNCTION "public"."set_chapter_order"("story_slug" "text", "chapter_codes" "text"[], "moved_chapter_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_story_id uuid;
  live_codes text[];
  positions_before jsonb;
  picked_chapter_id uuid;
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
  -- Step 2: remember the numbers as they are, and which chapter was dragged (one of this
  -- story's live chapters, or nobody).
  positions_before := public.chapter_positions(target_story_id);
  select chapters.id into picked_chapter_id from public.chapters
  where chapters.code = moved_chapter_code and chapters.story_id = target_story_id
    and chapters.deleted_at is null;
  -- Step 3: each chapter takes its place in the list (1-based).
  update public.chapters set position = ordered.new_position
  from unnest(chapter_codes) with ordinality as ordered(code, new_position)
  where chapters.code = ordered.code and chapters.story_id = target_story_id;
  -- Step 4: record every chapter whose number changed.
  perform public.record_chapter_moves(target_story_id, positions_before, picked_chapter_id);
  -- CALM-6, step 7: a chapter out or scheduled may now come after the marked one, so the last-chapter mark may come off.
  perform public.check_last_chapter_mark(target_story_id);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

CREATE OR REPLACE FUNCTION "public"."restore_chapter"("chapter_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  -- CALM-6, step 7: a restored chapter comes back at the end, after any marked one, so the last-chapter mark may come off.
  perform public.check_last_chapter_mark(chapter.story_id);
  return jsonb_build_object('outcome', 'ok');
end;
$$;


/* ---------- 8. Back to Ongoing clears the mark ---------- */


CREATE OR REPLACE FUNCTION "public"."update_my_story"("story_slug" "text", "changes" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  new_labels jsonb;
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

  -- Step 3: the cover, when given; the labels, filled from the current row and checked together.
  new_cover := changes -> 'cover';
  if new_cover is not null then
    perform public.check_story_cover(new_cover);
  end if;
  new_labels := jsonb_build_object(
    'rating', current_row.rating, 'is_fan_fiction', current_row.is_fan_fiction, 'is_parody', current_row.is_parody,
    'deals_with_abuse_or_coercion', current_row.deals_with_abuse_or_coercion,
    'content_note', current_row.content_note, 'ai_disclosure', current_row.ai_disclosure,
    'rating_reasons', to_jsonb(current_row.rating_reasons)
  ) || coalesce(changes -> 'labels', '{}'::jsonb);
  perform public.check_story_labels(new_labels);

  -- Step 4: save. The slug never changes (shared links survive a rename, S1-E3-01).
  update public.stories set
    title = new_title,
    blurb = new_blurb,
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    -- MUST-1a: everyone or followers only; the column's check refuses anything else.
    comment_audience = coalesce(changes ->> 'comment_audience', comment_audience),
    -- CALM-8: a pause of new comments from now, its end, or as it was (comment_pause_after_changes()).
    comments_paused_until = public.comment_pause_after_changes(current_row, changes),
    -- S1-E4-07: the writer's switch for quote cards.
    quote_cards_enabled = coalesce((changes ->> 'quote_cards_enabled')::boolean, quote_cards_enabled),
    -- S1-E4-11: the writer's switch for sharing the chapters' pictures.
    picture_sharing_enabled = coalesce((changes ->> 'picture_sharing_enabled')::boolean, picture_sharing_enabled),
    -- IDEAS-1c: the colour new quote and picture cards start in. Sent as null, it goes back to
    -- our default; left out, it stays. The column's check refuses anything off the palette.
    card_colour = case when changes ? 'card_colour' then changes ->> 'card_colour' else card_colour end,
    cover_kind = coalesce((new_cover ->> 'kind')::public.cover_kind, cover_kind),
    cover_design = case when new_cover is null then cover_design else new_cover ->> 'design' end,
    cover_background = case when new_cover is null then cover_background else new_cover ->> 'background' end,
    cover_accent = case when new_cover is null then cover_accent else new_cover ->> 'accent' end,
    cover_tall_path = case when new_cover is null then cover_tall_path else new_cover ->> 'tall_path' end,
    cover_square_path = case when new_cover is null then cover_square_path else new_cover ->> 'square_path' end,
    rating = (new_labels ->> 'rating')::public.story_rating,
    is_fan_fiction = (new_labels ->> 'is_fan_fiction')::boolean,
    is_parody = (new_labels ->> 'is_parody')::boolean,
    deals_with_abuse_or_coercion = (new_labels ->> 'deals_with_abuse_or_coercion')::boolean,
    content_note = btrim(coalesce(new_labels ->> 'content_note', '')),
    ai_disclosure = (new_labels ->> 'ai_disclosure')::public.ai_disclosure,
    -- Why it is 16+ or 18+ (SPONSORS-f); empty for a younger rating.
    rating_reasons = public.story_rating_reasons_from(new_labels)
  where stories.id = target_story_id;

  -- CALM-6, step 8: back to Ongoing takes the last-chapter mark off. Completed set by hand
  -- marks nothing, so readers see Completed but no "of N".
  if changes ->> 'completion_status' = 'ongoing' then
    update public.chapters set is_last = false
    where chapters.story_id = target_story_id and chapters.is_last;
  end if;

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


/* ---------- 9. What readers see ---------- */


CREATE OR REPLACE FUNCTION "public"."get_chapter"("story_slug" "text", "chapter_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  first_edition public.stories;
  chapter public.chapters;
  source_chapter public.chapters;
  source_ids uuid[];
  place integer;
  earlier_place integer;
  story_json jsonb;
  editions_json jsonb;
  text_to_send text;
  teaser_words integer;
  app_only boolean;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  select * into first_edition from public.stories
  where stories.id = coalesce(story.edition_of_story_id, story.id);

  -- Step 2: the chapter, published and not moderated away. `source_chapter` is the first
  -- edition's chapter it stands for (itself, in a story with one language).
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if found and public.chapter_is_readable(chapter.id) then
    select * into source_chapter from public.chapters
    where chapters.id = coalesce(chapter.translation_of_chapter_id, chapter.id);
  elsif story.edition_of_story_id is not null then
    -- A chapter of the first edition asked for under this edition's address: the reader switched
    -- language or followed "next" onto a chapter that may not be translated yet.
    select * into source_chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = first_edition.id;
    if not found or not public.chapter_is_readable(source_chapter.id) then
      return null;
    end if;
    select * into chapter from public.chapters
    where chapters.story_id = story.id and chapters.translation_of_chapter_id = source_chapter.id
      and public.chapter_is_readable(chapters.id);
    if not found then
      chapter := null;
    end if;
  else
    return null;
  end if;

  -- Step 3: its place among the story's chapters readers can open, for "Chapter n of N" and the
  -- arrows. Every edition counts in the first edition's chapters, so the number stays the same
  -- when the reader changes language.
  select array_agg(others.id order by others.position) into source_ids
  from public.chapters as others
  where others.story_id = first_edition.id and public.chapter_is_readable(others.id);
  place := array_position(source_ids, source_chapter.id);

  story_json := jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'language_code', story.language_code,
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle,
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id));

  editions_json := public.story_editions_json(story, source_chapter.id);

  -- Step 4: this edition doesn't have the chapter yet (handoff, "A chapter that isn't translated").
  -- The answer names the original to read instead and the nearest earlier chapter this edition has.
  if chapter.id is null then
    select max(earlier.spot) into earlier_place
    from unnest(source_ids) with ordinality as earlier (source_id, spot)
    where earlier.spot < place and exists (
      select 1 from public.chapters as translations
      where translations.story_id = story.id and translations.translation_of_chapter_id = earlier.source_id
        and public.chapter_is_readable(translations.id));
    return jsonb_build_object(
      'missing_translation', true,
      'story', story_json,
      'number', place,
      'total', array_length(source_ids, 1),
      'original', jsonb_build_object(
        'slug', first_edition.slug,
        'language_code', first_edition.language_code,
        'code', source_chapter.code,
        'title', source_chapter.published_title),
      -- "Ana Vlad has translated chapters 1 to 4": the unbroken run from chapter one, and the
      -- translator of a classic (a member's story is translated by its writer).
      'translated_through', coalesce((
        select min(gaps.spot) - 1
        from unnest(source_ids) with ordinality as gaps (source_id, spot)
        where not exists (
          select 1 from public.chapters as translations
          where translations.story_id = story.id and translations.translation_of_chapter_id = gaps.source_id
            and public.chapter_is_readable(translations.id))), 0),
      -- CALM-6: "of N" only while a last chapter is marked, counted in the first edition.
      'last_chapter_number', public.story_last_chapter_number(first_edition.id),
      'translator_name', (select works.translator_name from public.classic_works as works
        where works.story_id = story.id),
      'previous_number', earlier_place,
      'previous_code', case when earlier_place is not null then
        public.edition_chapter_code(story.id, first_edition.id, source_ids[earlier_place]) end,
      'editions', editions_json);
  end if;

  -- Step 5: the text. GAPS-15: none on the web while "In the app only" applies, except for the
  -- writer; otherwise all of it for a signed-in reader and the teaser for a signed-out visitor.
  app_only := public.story_app_only_applies(story.is_app_only)
    and story.user_id is distinct from caller_id;
  if app_only then
    text_to_send := '';
  elsif caller_id is not null then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;

  -- Step 6: the answer, with the pictures and cards in the text that is sent.
  return jsonb_build_object(
    'story', story_json,
    'id', chapter.id,
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(source_ids, 1),
    -- CALM-6: "of N" only while a last chapter is marked (null otherwise), and the next
    -- scheduled chapter for "Next chapter Thursday". Numbers count in the first edition.
    'last_chapter_number', public.story_last_chapter_number(first_edition.id),
    'next_chapter', public.next_chapter_json(first_edition.id),
    'previous_code', case when place > 1 then
      public.edition_chapter_code(story.id, first_edition.id, source_ids[place - 1]) end,
    'next_code', case when place < array_length(source_ids, 1) then
      public.edition_chapter_code(story.id, first_edition.id, source_ids[place + 1]) end,
    'published_at', chapter.first_published_at,
    'edited_at', chapter.edited_at,
    'minutes_to_read', greatest(1, ceil(coalesce(chapter.published_word_count, 0) / 200.0))::integer,
    'is_owner', story.user_id = caller_id,
    'needs_sign_in', caller_id is null and not app_only,
    'is_teaser', caller_id is null and not app_only,
    'app_only', app_only,
    -- MUST-2: a poem's lines and stanzas are drawn as written.
    'is_poem', chapter.is_poem,
    'text_continues', not app_only
      and public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send,
    'pictures', public.chapter_picture_states(text_to_send, story.user_id),
    'embeds', public.chapter_embed_states(text_to_send, story.user_id),
    -- TRANSLATE-1a: the "Read in" switch, each language with its address for this same chapter;
    -- empty for a story in one language (Robert, 16 Nov 2026, 12:23 UTC).
    'editions', editions_json,
    -- The language the story was written in and a classic's translator, for the credit under
    -- the title; only for a story in several languages.
    'edition', case when jsonb_array_length(editions_json) > 0 then public.story_edition_json(story) end);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_story_page"("story_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  -- S1-E11-08: a hidden title or cover is masked for readers.
  story := public.story_as_shown(story);

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
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
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the real author of a classic, else the writer's pen name or
  -- username, and never the user ID.
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
      -- CMS-1e: readers see only approved tags; a waiting one shows only in the writer's settings.
      where story_tags.story_id = story.id and tags.status = 'approved'), '[]'::jsonb),
    'completion_status', story.completion_status,
    -- CALM-6: "of N" only while a last chapter is marked, and the next scheduled chapter.
    'last_chapter_number', public.story_last_chapter_number(story.id),
    'next_chapter', public.next_chapter_json(story.id),
    'comments_enabled', story.comments_enabled,
    -- CALM-8: the end of a running pause of new comments; null when none runs or it has passed.
    'comments_paused_until', public.running_comment_pause(story),
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', story.cover_style, 'title_font', story.cover_title_font),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle, 'bio', public.bio_for_caller(profiles),
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    -- TRANSLATE-1a: a reader of a later edition sees every chapter of the story, in order.
    'chapters', case when story.edition_of_story_id is not null and not is_owner
      then public.edition_page_chapters(story.id, story.edition_of_story_id)
      else public.story_page_chapters(story.id, is_owner) end,
    'editions', public.story_editions_json(story),
    'edition', public.story_edition_json(story),
    'is_owner', is_owner,
    -- GAPS-15: the "In the app only" notice (S1-E3-08), only once the apps exist.
    'app_only', public.story_app_only_applies(story.is_app_only),
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."latest_place_json"("target_story_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'chapter_code', chapters.code,
    'number', place.number,
    'total', place.total,
    -- CALM-6: "of N" only while a last chapter is marked; total stays for the progress line.
    'last_chapter_number', public.story_last_chapter_number(chapters.story_id),
    'percent', positions.percent,
    'device_kind', positions.device_kind,
    'saved_at', positions.updated_at,
    'next_code', (select later.code from public.chapters as later
      where later.story_id = chapters.story_id and later.position > chapters.position
        and public.chapter_is_readable(later.id)
      order by later.position limit 1))
  from public.reading_positions as positions
  join public.chapters on chapters.id = positions.chapter_id
  cross join lateral public.chapter_place(chapters.id) as place
  where positions.user_id = (select auth.uid())
    and positions.story_id = target_story_id
    and public.chapter_is_readable(chapters.id)
  order by positions.updated_at desc
  limit 1;
$$;

CREATE OR REPLACE FUNCTION "public"."my_library"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  caller_id uuid := (select auth.uid());
  counts jsonb;
  continuing jsonb;
  places jsonb;
begin
  if caller_id is null then
    raise exception 'Log in to see your library.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: each shelf's size, counted as the shelves list them.
  select jsonb_object_agg(shelf_name, (select count(*) from public.listed_stories('library', shelf_name, null, null, null)))
  into counts
  from unnest(array['reading', 'saved', 'finished']) as shelf_name;
  -- Step 2: the stories being read, with the latest place first.
  select coalesce(jsonb_agg(jsonb_build_object('story', public.story_card_json(found.id), 'place', found.place)
      order by found.place ->> 'saved_at' desc), '[]'::jsonb)
  into continuing
  from (
    select with_place.id, with_place.place
    from (
      select listed.id, public.latest_place_json(listed.id) as place
      from public.listed_stories('library', 'reading', null, null, null) as listed
    ) as with_place
    where with_place.place is not null
    order by with_place.place ->> 'saved_at' desc
    limit 4
  ) as found;
  -- Step 3: "Chapter n of N" for every card.
  select coalesce(jsonb_object_agg(found.slug, jsonb_build_object('number', found.place -> 'number', 'total', found.place -> 'total',
    -- CALM-6: "of N" only while a last chapter is marked.
    'last_chapter_number', found.place -> 'last_chapter_number')), '{}'::jsonb)
  into places
  from (
    select stories.slug, public.latest_place_json(stories.id) as place
    from public.library_entries
    join public.stories on stories.id = library_entries.story_id
    where library_entries.user_id = caller_id
  ) as found
  where found.place is not null;
  return jsonb_build_object('counts', counts, 'continue_reading', continuing, 'places', places);
end;
$$;

/* ---------- The publish panel's view of the mark ---------- */

/*
 * my_chapter_last_state: what the publish panel shows about the last-chapter mark for one of the
 * caller's own chapters (CALM-6, points 10 to 13).
 * Inputs: the chapter's code.
 * Returns: null when the caller has no live chapter at that code, else
 *   {number, is_last, can_mark, marked_number, original_is_last}:
 *   - number: the number readers will see on it ("Publish chapter 15");
 *   - is_last: it holds the mark;
 *   - can_mark: the switch may be turned on now (a draft or scheduled chapter, or the latest
 *     published one, with nothing out or scheduled after it);
 *   - marked_number: the number of an earlier chapter that holds the mark, for "Chapter 14 is
 *     marked as the last. Publishing this one takes that mark off."; null otherwise;
 *   - original_is_last: in a later language edition, the chapter it translates holds the mark,
 *     so the switch starts on.
 * Errors: 42501 when signed out.
 * Flow: useChapterPublishing (through api/chapters.ts) → this.
 */
create function public.my_chapter_last_state(chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  marked public.chapters;
begin
  -- Step 1: the caller's own live chapter.
  if caller_id is null then
    raise exception 'Sign in to see a chapter.' using errcode = 'insufficient_privilege';
  end if;
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.user_id = caller_id and chapters.deleted_at is null;
  if not found then
    return null;
  end if;
  -- Step 2: the story's live mark, if any.
  select * into marked from public.chapters
  where chapters.story_id = chapter.story_id and chapters.is_last and chapters.deleted_at is null;
  -- Step 3: the answer.
  return jsonb_build_object(
    'number', public.chapter_number_through(chapter.story_id, chapter.position)
      + case when chapter.status = 'draft' then 1 else 0 end,
    'is_last', chapter.is_last,
    'can_mark', not public.has_chapter_out_after(chapter.story_id, chapter.position),
    'marked_number', case when marked.id is not null and marked.position < chapter.position
      then public.chapter_number_through(marked.story_id, marked.position) end,
    'original_is_last', coalesce((select originals.is_last from public.chapters as originals
      where originals.id = chapter.translation_of_chapter_id and originals.deleted_at is null), false));
end;
$$;

revoke all on function public.my_chapter_last_state(text) from public, anon;
grant execute on function public.my_chapter_last_state(text) to authenticated;

comment on function public.my_chapter_last_state(text) is
  'The publish panel''s view of the last-chapter mark for the caller''s own chapter: {number, is_last, can_mark, marked_number, original_is_last}, or null (CALM-6).';

