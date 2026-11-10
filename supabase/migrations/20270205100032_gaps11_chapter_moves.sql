-- Migration: a record of each chapter move, and the "was chapter 13" note on Manage chapters
-- (bundle GAPS-11; story S1-E3-04; liquid glass Chapters board, G9d).
--
-- Why: the board shows "was chapter 13" and "moved here from chapter 14" beside a chapter whose
-- number changed, and until now the database kept no history of a chapter's earlier places
-- (docs/board-fixes.md). Robert, 10 Nov 2026: where a board asks for something the data doesn't
-- support, build the data support.
--
-- What it adds:
--   chapter_moves                    one row per chapter whose number changed in a reorder: where
--                                    it was, where it went, and whether it is the chapter the
--                                    writer picked up (the others only shifted to make room).
--   chapter_positions(story)         internal: the live chapters' numbers before a reorder.
--   record_chapter_moves(...)        internal: writes the rows after a reorder.
--   move_chapter(code, direction)    unchanged for the caller; now records the move.
--   set_chapter_order(slug, codes, moved_chapter_code)   one more, optional input: the chapter
--                                    that was dragged, so the record can say which one moved.
--   chapter_move_notes(story_slug)   what Manage chapters shows beside each chapter.
--   data_export_tables(), account_deletion_rules()   list the new table.
-- Decisions (builder's, unattended; in the pull request):
--   - Only a reorder is recorded. Deleting or restoring another chapter renumbers the rest
--     without a row: the writer didn't move those chapters.
--   - The note compares a chapter's number now with the number it had before its first move in
--     the last 7 days, so three presses of the arrow read "was chapter 3" once, and a chapter
--     put back where it was shows no note.
--   - Rows older than 90 days, and any beyond a story's newest 2,000, go when the story is next
--     reordered, and every row goes with its chapter (docs/retention.md).
--   - Only the writer reads the record. Readers never see it: a chapter's address is its code,
--     which never changes.

/* ---------- The record ---------- */

create table public.chapter_moves (
  id uuid primary key default gen_random_uuid(),
  -- The writer who reordered: always the story's owner (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  -- Gone with the chapter when it is deleted for good.
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The chapter's number before and after the reorder.
  from_position integer not null check (from_position >= 1),
  to_position integer not null check (to_position >= 1),
  -- True for the chapter the writer moved; false for one that shifted to make room.
  was_picked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_moves_number_changed check (from_position <> to_position)
);
comment on table public.chapter_moves is
  'kind: user_action
Each time a chapter''s number changed because its writer reordered the story: where it was and where it went (GAPS-11).';
create index chapter_moves_story_time on public.chapter_moves (story_id, created_at);
create index chapter_moves_chapter on public.chapter_moves (chapter_id);
create index chapter_moves_owner on public.chapter_moves (user_id);
create trigger chapter_moves_set_updated_at
  before update on public.chapter_moves
  for each row execute function public.set_updated_at();
create trigger chapter_moves_refuse_user_id_change
  before update on public.chapter_moves
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.chapter_moves enable row level security;

-- Allows: the writer, reading the moves of their own chapters (Manage chapters and Download my
-- data). Why: it is the history of their own story. Nobody else reads it, and every write goes
-- through move_chapter() and set_chapter_order().
create policy chapter_moves_select_own on public.chapter_moves
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.chapter_moves to authenticated;

/* ---------- Helpers ---------- */

/**
 * chapter_positions: a story's live chapters and their numbers, as {chapter id: number}.
 * Input: the story's ID. Returns: the object, empty for a story with no live chapter.
 * Internal: move_chapter() and set_chapter_order() call it before they change the order.
 */
create function public.chapter_positions(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(chapters.id::text, chapters.position), '{}'::jsonb)
  from public.chapters
  where chapters.story_id = target_story_id and chapters.deleted_at is null;
$$;

comment on function public.chapter_positions(uuid) is
  'Internal: a story''s live chapters and their numbers before a reorder (GAPS-11).';
revoke execute on function public.chapter_positions(uuid) from public, anon, authenticated;

/**
 * record_chapter_moves: writes one chapter_moves row for every live chapter whose number is
 * no longer the one in positions_before.
 * Inputs: the story's ID; positions_before from chapter_positions(); picked_chapter_id, the
 *   chapter the writer moved, or null when the caller didn't say.
 * Returns: nothing. Also deletes the story's rows older than 90 days and any beyond its newest
 *   2,000 (docs/retention.md).
 * Internal: move_chapter() and set_chapter_order() call it after they change the order, in
 *   the same transaction.
 */
create function public.record_chapter_moves(
  target_story_id uuid,
  positions_before jsonb,
  picked_chapter_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- The clock's time, not the transaction's, so two reorders in one transaction keep their order.
  moved_time timestamptz := clock_timestamp();
begin
  -- Step 1: one row per chapter whose number changed.
  insert into public.chapter_moves (user_id, story_id, chapter_id, from_position, to_position, was_picked, created_at)
  select chapters.user_id, chapters.story_id, chapters.id,
         (positions_before ->> chapters.id::text)::integer, chapters.position,
         chapters.id is not distinct from picked_chapter_id, moved_time
  from public.chapters
  where chapters.story_id = target_story_id and chapters.deleted_at is null
    and positions_before ? chapters.id::text
    and (positions_before ->> chapters.id::text)::integer <> chapters.position;
  -- Step 2: the record is kept 90 days, and a story keeps its newest 2,000 rows at most, so
  -- reordering a long story over and over can't fill the table.
  delete from public.chapter_moves
  where chapter_moves.story_id = target_story_id
    and (chapter_moves.created_at < now() - interval '90 days'
         or chapter_moves.id in (
           select older.id from public.chapter_moves as older
           where older.story_id = target_story_id
           order by older.created_at desc, older.id
           offset 2000));
end;
$$;

comment on function public.record_chapter_moves(uuid, jsonb, uuid) is
  'Internal: records which chapters changed number in a reorder, and drops rows over 90 days old or beyond the story''s newest 2,000 (GAPS-11).';
revoke execute on function public.record_chapter_moves(uuid, jsonb, uuid) from public, anon, authenticated;

/* ---------- Order, now recorded ---------- */

/**
 * move_chapter: moves the caller's own chapter one place up or down (the arrow buttons; WCAG
 * 2.5.7: dragging has a single-pointer alternative), and records the move (GAPS-11).
 * Inputs: chapter_code; direction (-1 up, +1 down). Returns: {"outcome": "ok"}, "not_active",
 *   "not_found" or "at_edge" (already first or last).
 * Errors: insufficient_privilege when signed out; check_violation for another direction.
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
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.move_chapter(text, integer) is
  'Moves the caller''s own chapter one place up or down and records it: {outcome: ok | not_active | not_found | at_edge} (S1-E3-04, GAPS-11).';

-- The two-input version goes: the screen now says which chapter was dragged.
drop function public.set_chapter_order(text, text[]);

/**
 * set_chapter_order: puts the caller's own story's chapters in a new order (dragging), and
 * records which chapters changed number (GAPS-11).
 * Inputs: story_slug; chapter_codes, every live chapter's code exactly once, in the new order;
 *   moved_chapter_code, the chapter that was dragged (optional; a code that isn't in the list
 *   is ignored, and then no chapter is marked as the one that moved).
 * Returns: {"outcome": "ok"}, "not_active", "not_found" (no such live story of theirs) or
 *   "wrong_list" (a code missing, repeated or not one of this story's live chapters: the screen
 *   was out of date, so nothing changes).
 * Errors: insufficient_privilege when signed out.
 */
create function public.set_chapter_order(
  story_slug text,
  chapter_codes text[],
  moved_chapter_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_chapter_order(text, text[], text) is
  'Reorders the caller''s own story''s live chapters and records it: {outcome: ok | not_active | not_found | wrong_list} (S1-E3-04, GAPS-11).';
revoke execute on function public.set_chapter_order(text, text[], text) from public, anon;
grant execute on function public.set_chapter_order(text, text[], text) to authenticated;

/* ---------- The note beside a chapter ---------- */

/**
 * chapter_move_notes: which of the caller's own story's chapters recently changed number, for
 * the note on Manage chapters ("Was chapter 13", "Moved here from chapter 14").
 * Input: story_slug.
 * Returns: one row per live chapter whose number now differs from the number it had before
 *   its first move in the last 7 days: its code, that earlier number, whether the writer moved
 *   it (true) or it only shifted to make room (false), and when it last moved. No rows for a
 *   story that isn't the caller's, or when signed out.
 * Errors: none.
 * Where it fits: useManageChapters reads it beside the chapter list.
 */
create function public.chapter_move_notes(story_slug text)
returns table (chapter_code text, was_position integer, was_picked boolean, moved_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    -- Every move of this story's chapters in the last 7 days, oldest first per chapter.
    select chapter_moves.chapter_id, chapter_moves.from_position, chapter_moves.was_picked,
           chapter_moves.created_at,
           row_number() over (partition by chapter_moves.chapter_id
                              order by chapter_moves.created_at, chapter_moves.id) as move_number
    from public.chapter_moves
    where chapter_moves.story_id = public.my_live_story_id(story_slug)
      and chapter_moves.user_id = (select auth.uid())
      and chapter_moves.created_at > now() - interval '7 days'
  ),
  summed as (
    -- Per chapter: the number before its first move, whether the writer ever picked it up,
    -- and its last move.
    select recent.chapter_id,
           min(recent.from_position) filter (where recent.move_number = 1) as was_position,
           bool_or(recent.was_picked) as was_picked,
           max(recent.created_at) as moved_at
    from recent group by recent.chapter_id
  )
  select chapters.code, summed.was_position, summed.was_picked, summed.moved_at
  from summed
  join public.chapters on chapters.id = summed.chapter_id
  where chapters.deleted_at is null and chapters.position <> summed.was_position
  order by chapters.position;
$$;

comment on function public.chapter_move_notes(text) is
  'The caller''s own story''s chapters whose number changed in the last 7 days, with the number each had before (GAPS-11).';
revoke execute on function public.chapter_move_notes(text) from public, anon;
grant execute on function public.chapter_move_notes(text) to authenticated;

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
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('library_entries', true, null),
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
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11).';

-- Unchanged except for the new table: the moves go before their chapters.
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
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
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
    ('writer_ranks', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11).';
