/*
 * Migration: a Like for the whole story, and the story's reads in public (bundle 2, user story
 * 2.1, board B01; Robert pressed "As drawn on the canvas" on DESIGN's question, 24 Nov 2026).
 *
 * What it adds:
 * - story_likes: who likes which story, one row per member and story. A story in several
 *   languages is one story (TRANSLATE-1a), so the like sits on its first edition and counts for
 *   every edition. Chapter likes (chapter_likes, S1-E6-03) stay on their chapters.
 * - story_like_state(story_slug) and like_story(story_slug, should_like): the story page's Like
 *   button, the same shape as chapter_like_state() and like_chapter(): the address in, the rules
 *   of the story page (rating, blocks, moderation, a readable chapter) applied, the account gate
 *   on liking, and never who liked.
 * - story_like_total(story_id) now counts the story's own likes, so the stats line's "418 likes"
 *   is the story Like (it counted chapter likes before; only get_story_page() reads it).
 * - story_read_total(story_id): the story's reads over its readable chapters, every edition
 *   together, from the daily chapter_reads totals (never who read). This replaces S1-E5-03's
 *   rule that read totals are the writer's own (docs/board-fixes.md); the writer's profile already
 *   shows its reads total (get_writer_profile(), counts.reads).
 * - get_story_page(): as before, with 'reads' in 'stats'.
 * - account_deletion_rules() and data_export_tables(): story_likes is deleted with the account and
 *   is in Download my data (GDPR art. 15 and 17; S1-E13-02, S1-E13-03).
 * Who calls it: src/features/reading/api/storyLikes.ts (StoryLikeButton), StoryStats.
 * Tests: supabase/tests/database/412-story-likes.test.sql.
 */

/* ---------- Table ---------- */

create table public.story_likes (
  id uuid primary key default gen_random_uuid(),
  -- The member who likes the story (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The story's first edition, so every language edition shares one like (TRANSLATE-1a).
  story_id uuid not null references public.stories (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_likes_one_per_pair unique (user_id, story_id)
);
comment on table public.story_likes is
  'kind: user_action
Who likes which story (bundle 2, board B01). The count is public; who liked is nobody else''s business.';
create index story_likes_story_id on public.story_likes (story_id);
create trigger story_likes_set_updated_at
  before update on public.story_likes
  for each row execute function public.set_updated_at();
create trigger story_likes_refuse_user_id_change
  before update on public.story_likes
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.story_likes enable row level security;

-- Who: the member who liked. Why: their own likes (Download my data); nobody, the writer
-- included, reads who liked a story, only the count through story_like_state(). Writes go only
-- through like_story(), so there are no write policies.
create policy story_likes_select_own on public.story_likes
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.story_likes to authenticated;

/* ---------- The story behind an address ---------- */

/**
 * likeable_story_id: the first edition of the story behind an address, when the caller may see
 * its page.
 * Input: story_slug. Returns: the ID the like sits on, or null when the story is deleted,
 *   moderated away, rated above the caller's age, blocked either way, hidden in this country
 *   (reader_visible_story()) or has no readable chapter yet: the story page's own rules.
 * Internal: story_like_state() and like_story().
 */
create or replace function public.likeable_story_id(story_slug text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(story.edition_of_story_id, story.id)
  from public.reader_visible_story(story_slug) as story
  where public.story_has_readable_chapter(story.id);
$$;
comment on function public.likeable_story_id(text) is
  'Internal: the first edition of the story behind an address, when the caller may see its page (bundle 2).';
revoke execute on function public.likeable_story_id(text) from public, anon, authenticated;

/* ---------- Counts ---------- */

/**
 * story_like_total: a story's public like count, the story's own Likes (every edition together).
 * Input: target_story_id (any edition). Returns: the number; deleted accounts don't count.
 * Internal: story_like_state_of() and get_story_page()'s stats line.
 */
create or replace function public.story_like_total(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.story_likes
  join public.profiles on profiles.id = story_likes.user_id
  where story_likes.story_id in (select public.story_family_ids(target_story_id))
    and profiles.deleted_at is null;
$$;
comment on function public.story_like_total(uuid) is
  'Internal: a story''s public like total, its own Likes over every edition (bundle 2; S1-E6-03 counted chapter likes).';
revoke execute on function public.story_like_total(uuid) from public, anon, authenticated;

/**
 * story_like_state_of: the answer the story's Like button reads.
 * Input: target_story_id (the first edition). Returns: JSON {"liked": bool, "like_count": n}.
 * Internal: story_like_state() and like_story().
 */
create or replace function public.story_like_state_of(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'liked', exists (select 1 from public.story_likes
      where story_likes.story_id = target_story_id and story_likes.user_id = (select auth.uid())),
    'like_count', public.story_like_total(target_story_id));
$$;
comment on function public.story_like_state_of(uuid) is
  'Internal: liked and like_count for the caller, on a story (bundle 2).';
revoke execute on function public.story_like_state_of(uuid) from public, anon, authenticated;

/**
 * story_read_total: how many times a story's readable chapters were opened, every edition
 * together. Daily totals only (chapter_reads), never who read.
 * Input: target_story_id. Returns: the number.
 * Internal: get_story_page()'s stats line ("18k reads", board B01).
 */
create or replace function public.story_read_total(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(chapter_reads.total), 0)::integer
  from public.chapter_reads
  join public.chapters on chapters.id = chapter_reads.chapter_id
  where chapters.story_id in (select public.story_family_ids(target_story_id))
    and public.chapter_is_readable(chapters.id);
$$;
comment on function public.story_read_total(uuid) is
  'Internal: a story''s public reads total over its readable chapters, every edition (bundle 2, board B01).';
revoke execute on function public.story_read_total(uuid) from public, anon, authenticated;

/* ---------- The button ---------- */

/**
 * story_like_state: a story's like count, and whether the caller likes it.
 * Input: story_slug. Returns: JSON {"liked": bool, "like_count": n}; null when the caller may
 *   not see the story's page. A visitor gets the count and liked false.
 * Where it fits: StoryLikeButton in the story page's row of buttons (board B01).
 */
create or replace function public.story_like_state(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid := public.likeable_story_id(story_slug);
begin
  if target_story_id is null then
    return null;
  end if;
  return public.story_like_state_of(target_story_id);
end;
$$;
comment on function public.story_like_state(text) is
  'A story''s public like count and whether the caller likes it (bundle 2, board B01).';
grant execute on function public.story_like_state(text) to anon, authenticated;

/**
 * like_story: likes or unlikes a story by its address.
 * Inputs: story_slug; should_like (true to like, false to take the like back).
 * Returns: JSON {"liked": bool, "like_count": n}, the state afterwards.
 * Rules: the story's page must be one the caller may see. Taking a like back always works;
 *   liking is a write, so the account gate applies (architecture 1.7.8). Liking twice changes
 *   nothing. The writer doesn't like their own story (the page shows them no Like button, and
 *   this refuses it), so a story's count is only its readers'.
 * Errors: insufficient_privilege when signed out, the account may not write or it is the
 *   writer's own story; no_data_found when the caller may not see the story.
 */
create or replace function public.like_story(story_slug text, should_like boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
begin
  -- Step 1: signed in, and the story is one this reader may see.
  if caller_id is null then
    raise exception 'Log in to like stories.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.likeable_story_id(story_slug);
  if target_story_id is null then
    raise exception 'There is no such story.' using errcode = 'no_data_found';
  end if;
  -- Step 2: taking a like back is always allowed, even for a read-only account.
  if not should_like then
    delete from public.story_likes
    where story_likes.user_id = caller_id and story_likes.story_id = target_story_id;
    return public.story_like_state_of(target_story_id);
  end if;
  -- Step 3: liking is a write, so the account gate applies; and not one's own story.
  if not public.is_active_member() then
    raise exception 'Your account can''t like stories right now.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.stories where stories.id = target_story_id and stories.user_id = caller_id) then
    raise exception 'Writers don''t like their own story.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 4: like; twice changes nothing.
  insert into public.story_likes (user_id, story_id) values (caller_id, target_story_id)
  on conflict on constraint story_likes_one_per_pair do nothing;
  return public.story_like_state_of(target_story_id);
end;
$$;
comment on function public.like_story(text, boolean) is
  'Likes or unlikes a story by its address, through the account gate (bundle 2, board B01).';
revoke execute on function public.like_story(text, boolean) from public, anon;
grant execute on function public.like_story(text, boolean) to authenticated;

/* ---------- The story page answers its reads ---------- */

/**
 * get_story_page: as before (CALM-9m, COUNTRY-1 and TRANSLATE-1a included), with the public reads
 * total in 'stats' and the story's own likes behind 'likes' (story_like_total() above).
 * Input: story_slug. Returns: the page as JSON, or null when the reader may not see it.
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
  -- S1-E11-08: a hidden title or cover is masked for readers.
  story := public.story_as_shown(story);

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    -- CALM-9m: a visitor who isn't logged in also opens an 18+ story's page.
    if not public.visitor_may_open_rating(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
    -- COUNTRY-1: nor in a country where the writer (or staff, for a classic) hid it.
    if public.story_hidden_here(story.hidden_in_countries, story.user_id) then
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
      -- BOOKS-B2 (board B01, Robert's "As drawn on the canvas", 24 Nov 2026): the reads total is
      -- public, and the likes are the story's own Likes (story_likes), not its chapters'.
      'reads', public.story_read_total(story.id),
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;
comment on function public.get_story_page(text) is
  'The public story page, or null when the reader may not see it; never the user ID (S1-E3-05, ADR 0004).';

/* ---------- Download my data and account deletion ---------- */

/**
 * data_export_tables: as before, plus story_likes (the stories the person liked; GDPR art. 15).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('account_last_used', true, null),
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
    ('class_chapter_opens', true, null),
    ('class_competition_criteria', true, null),
    ('class_competition_entrants', true, null),
    ('class_competition_results', true, null),
    ('class_competition_scores', true, null),
    ('class_competitions', true, null),
    ('class_criteria_templates', true, null),
    ('class_point_gifts', true, null),
    ('class_teacher_points', true, null),
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
    ('forum_post_votes', true, null),
    ('forum_thread_follows', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('member_last_active', true, null),
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
    ('remembered_places', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_archives', false, 'the stories of a closed account, kept for their writer; a person who brings them back gets them as their own stories'),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_likes', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before, plus story_likes, deleted with the account (GDPR art. 17).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('account_last_used', 'delete', 1, null),
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
    ('class_chapter_opens', 'delete', 1, null),
    ('class_competition_criteria', 'delete', 2, null),
    ('class_competition_entrants', 'delete', 1, null),
    ('class_competition_results', 'delete', 1, null),
    ('class_competition_scores', 'delete', 1, null),
    ('class_competitions', 'delete', 3, null),
    ('class_criteria_templates', 'delete', 1, null),
    ('class_point_gifts', 'delete', 1, null),
    ('class_teacher_points', 'delete', 1, null),
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
    ('forum_post_votes', 'delete', 1, null),
    ('forum_thread_follows', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('member_last_active', 'delete', 1, null),
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
    ('remembered_places', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_archives', 'kept', 0, 'the archive of an unused account''s stories, kept story_archive_years so the writer can bring them back (ARCHIVE-1)'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_likes', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;
