-- FORUMS-2 part e: ranks from published chapters and words (story S1-E8-09; board 6.1).
--
-- What this adds:
-- - writer_rank: the four ranks, in order (New writer, Writer, Storyteller, Novelist).
-- - writer_ranks: one row per person with a rank, worked out again by triggers each time one of
--   their chapters is published, unpublished, deleted, hidden or removed by a moderator, or a
--   story of theirs is deleted (criterion 2). Staff never set a rank: there is no function for it.
-- - rank_for(chapters, words): the ladder in one place; refresh_writer_rank(person): counts and
--   saves.
-- - rank_of(person) for posts and profile_rank(handle) for the profile: the rank, the published
--   chapters and words, never a user ID.
-- - forum_post_json() gains author_rank; data_export_tables() and account_deletion_rules() list
--   writer_ranks.
-- Forum posts never count (criterion 1): only published chapters and their words do.
-- Who calls it: the profile page (useProfileRank), the thread page (forum_thread()) and the
-- triggers. Tests: supabase/tests/database/231-writer-ranks.test.sql.

/** writer_rank: the four ranks, lowest first (S1-E8-09 criterion 2; decided 17 Oct 2026). */
create type public.writer_rank as enum ('new_writer', 'writer', 'storyteller', 'novelist');
comment on type public.writer_rank is
  'New writer (first chapter), Writer (5 chapters), Storyteller (15 chapters or 30,000 words), Novelist (100,000 words) (S1-E8-09).';

/* ---------- The ladder ---------- */

/**
 * rank_for: the rank for a number of published chapters and words.
 * Inputs: chapter_count, word_count. Returns: the rank, or null before the first chapter.
 * The rules (S1-E8-09 criterion 2; decided 17 Oct 2026, canvas comment): Novelist at 100,000
 * words; Storyteller at 15 chapters or 30,000 words; Writer at 5 chapters; New writer at 1.
 */
create or replace function public.rank_for(chapter_count integer, word_count integer)
returns public.writer_rank
language sql
immutable
set search_path = ''
as $$
  select case
    when word_count >= 100000 then 'novelist'::public.writer_rank
    when chapter_count >= 15 or word_count >= 30000 then 'storyteller'::public.writer_rank
    when chapter_count >= 5 then 'writer'::public.writer_rank
    when chapter_count >= 1 then 'new_writer'::public.writer_rank
  end;
$$;
comment on function public.rank_for(integer, integer) is
  'The rank for a number of published chapters and words; null before the first chapter (S1-E8-09).';
grant execute on function public.rank_for(integer, integer) to anon, authenticated;

/* ---------- The saved ranks ---------- */

create table public.writer_ranks (
  -- Whose rank it is (CLAUDE.md rule 15); one row per person.
  user_id uuid primary key references public.profiles (id),
  rank public.writer_rank not null,
  -- What it was worked out from: published chapters readers can still read, and their words.
  chapter_count integer not null constraint writer_ranks_chapters_not_negative check (chapter_count >= 0),
  word_count integer not null constraint writer_ranks_words_not_negative check (word_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.writer_ranks is
  'kind: identity
Each writer''s rank, worked out again whenever their published chapters change; others read it only through rank_of() and profile_rank() (S1-E8-09).';
alter table public.writer_ranks enable row level security;
grant select on public.writer_ranks to authenticated;

/**
 * Policy writer_ranks_select_own: a person reads their own row. Everyone else sees a rank only
 * through profile_rank() and the posts, which never show the user ID (architecture 1.6).
 */
create policy writer_ranks_select_own
  on public.writer_ranks for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy writer_ranks_select_own on public.writer_ranks is
  'Allows a person to read their own rank row; others see ranks only through functions without the user ID (S1-E8-09).';

/**
 * refresh_writer_rank: counts one person's published chapters and words and saves their rank.
 * Input: person_id. Returns: nothing. A chapter counts while it is published and not deleted, in
 * a story that isn't deleted, and neither is hidden or removed by a moderator. Forum posts never
 * count (criterion 1). A person with no such chapter has no row.
 * Internal: the triggers below.
 */
create or replace function public.refresh_writer_rank(person_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapters_published integer;
  words_published integer;
  new_rank public.writer_rank;
begin
  -- Step 1: what readers can read today.
  select count(*), coalesce(sum(coalesce(chapters.published_word_count, chapters.word_count)), 0)
  into chapters_published, words_published
  from public.chapters
  join public.stories on stories.id = chapters.story_id
  where chapters.user_id = person_id and chapters.status = 'published' and chapters.deleted_at is null
    and stories.deleted_at is null
    and not public.is_moderated_away('chapter', chapters.id)
    and not public.is_moderated_away('story', stories.id);
  -- Step 2: the rank on the ladder.
  new_rank := public.rank_for(chapters_published, words_published);
  -- Step 3: saved, or taken away when nothing counts any more.
  if new_rank is null then
    delete from public.writer_ranks where writer_ranks.user_id = person_id;
    return;
  end if;
  insert into public.writer_ranks (user_id, rank, chapter_count, word_count)
  values (person_id, new_rank, chapters_published, words_published)
  on conflict (user_id) do update set rank = excluded.rank, chapter_count = excluded.chapter_count,
    word_count = excluded.word_count, updated_at = now();
end;
$$;
comment on function public.refresh_writer_rank(uuid) is
  'Internal: works out one person''s rank from their readable published chapters (S1-E8-09).';
revoke execute on function public.refresh_writer_rank(uuid) from public, anon, authenticated;

/** Trigger function: a chapter changed, so its writer's rank is worked out again. */
create or replace function public.chapters_refresh_writer_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_writer_rank(old.user_id);
  else
    perform public.refresh_writer_rank(new.user_id);
  end if;
  return null;
end;
$$;
comment on function public.chapters_refresh_writer_rank() is
  'Trigger: works out the writer''s rank again when a chapter is published, changed or deleted (S1-E8-09).';
revoke execute on function public.chapters_refresh_writer_rank() from public, anon, authenticated;
create trigger chapters_refresh_writer_rank
  after insert or delete or update of status, deleted_at, published_word_count on public.chapters
  for each row execute function public.chapters_refresh_writer_rank();

/** Trigger function: a story was deleted or brought back, so its writer's rank is worked out again. */
create or replace function public.stories_refresh_writer_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_writer_rank(new.user_id);
  return null;
end;
$$;
comment on function public.stories_refresh_writer_rank() is
  'Trigger: works out the writer''s rank again when a story is deleted or restored (S1-E8-09).';
revoke execute on function public.stories_refresh_writer_rank() from public, anon, authenticated;
create trigger stories_refresh_writer_rank
  after update of deleted_at on public.stories
  for each row execute function public.stories_refresh_writer_rank();

/** Trigger function: a moderator hid, removed or restored a story or chapter (criterion 2). */
create or replace function public.moderated_items_refresh_writer_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.item_type in ('story', 'chapter') then
    perform public.refresh_writer_rank(new.user_id);
  end if;
  return null;
end;
$$;
comment on function public.moderated_items_refresh_writer_rank() is
  'Trigger: works out the writer''s rank again when a moderator hides, removes or restores their story or chapter (S1-E8-09).';
revoke execute on function public.moderated_items_refresh_writer_rank() from public, anon, authenticated;
create trigger moderated_items_refresh_writer_rank
  after insert or update on public.moderated_items
  for each row execute function public.moderated_items_refresh_writer_rank();

-- Ranks for chapters published before this migration.
select public.refresh_writer_rank(writers.user_id)
from (select distinct chapters.user_id from public.chapters where chapters.status = 'published') as writers;

/* ---------- Reading a rank ---------- */

/**
 * rank_of: one person's rank, for a post's chip.
 * Input: person_id. Returns: the rank's name (new_writer to novelist), or null.
 * Internal: forum_post_json().
 */
create or replace function public.rank_of(person_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select writer_ranks.rank::text from public.writer_ranks where writer_ranks.user_id = person_id;
$$;
comment on function public.rank_of(uuid) is
  'Internal: a person''s rank name for a post, never their user ID (S1-E8-09).';
revoke execute on function public.rank_of(uuid) from public, anon, authenticated;

/**
 * profile_rank: the rank panel and chip on a profile (board 6.1).
 * Input: wanted_handle. Returns: {"rank", "chapters", "words"} (rank null before the first
 *   chapter), or null when the reader may not see the profile (blocked, or limited by its owner's
 *   privacy choice, S1-E13-01). Never the user ID.
 */
create or replace function public.profile_rank(wanted_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rank', writer_ranks.rank,
    'chapters', coalesce(writer_ranks.chapter_count, 0),
    'words', coalesce(writer_ranks.word_count, 0))
  from public.profile_for_handle(wanted_handle) as writer
  left join public.writer_ranks on writer_ranks.user_id = writer.id
  where public.profile_is_open_to(writer, (select auth.uid()))
    and not exists (select 1 from public.blocks
                    where blocks.user_id = writer.id and blocks.blocked_user_id = (select auth.uid()));
$$;
comment on function public.profile_rank(text) is
  'A profile''s rank with its published chapters and words, by the profile''s own visibility rules (S1-E8-09).';
grant execute on function public.profile_rank(text) to anon, authenticated;

/* ---------- The rank next to a post's author (criterion 5) ---------- */

/**
 * forum_post_json: as in FORUMS-2d, plus author_rank (S1-E8-09).
 */
create or replace function public.forum_post_json(target public.forum_posts, starter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.forum_post_state_for_caller(target);
  is_own boolean := caller_id is not null and target.user_id = caller_id;
  is_shown boolean := state in ('live', 'hidden');
begin
  return jsonb_build_object(
    'id', target.id,
    'number', target.post_number,
    'author', public.forum_person_json(target.user_id),
    'is_starter', target.user_id = starter_id,
    'is_mine', is_own,
    'created_at', target.created_at,
    'edited_at', target.edited_at,
    'state', state,
    'body', case when is_shown then target.body end,
    'quotes', case when is_shown then (
      select coalesce(jsonb_agg(public.forum_quote_json(quoted_id) order by position), '[]'::jsonb)
      from unnest(target.quoted_post_ids) with ordinality as quoted(quoted_id, position)
      where public.forum_quote_json(quoted_id) is not null) else '[]'::jsonb end,
    'can_edit', is_own and is_shown,
    'can_delete', is_own and is_shown,
    'has_history', target.edited_at is not null and caller_id is not null
      and public.staff_may('moderation', 'view'),
    -- S1-E8-08: the author's signature, under the post on bigger screens (Q25).
    'signature', case when is_shown then public.signature_json(target.user_id) end,
    -- S1-E8-09: the author's rank, a chip next to their name (null before a published chapter).
    'author_rank', public.rank_of(target.user_id));
end;
$$;
comment on function public.forum_post_json(public.forum_posts, uuid) is
  'Internal: one post as the thread page draws it, with its quotes and its author''s signature and rank, never a user ID (S1-E8-02, S1-E8-03, S1-E8-08, S1-E8-09).';
revoke execute on function public.forum_post_json(public.forum_posts, uuid) from public, anon, authenticated;

/* ---------- Data rights ---------- */

/**
 * data_export_tables: as in FORUMS-2d, plus writer_ranks (S1-E8-09).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
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
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
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
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;
comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09).';

/**
 * account_deletion_rules: as in FORUMS-2d, plus writer_ranks, deleted with the account (S1-E8-09).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
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
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
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
    ('writer_ranks', 'delete', 1, null);
$$;
comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09).';
