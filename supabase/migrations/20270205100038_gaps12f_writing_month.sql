/*
 * Migration: the writing month on the Writers' hub, with streaks and badges (bundle GAPS-12f;
 * board WritersHub: "42% of 15,000 · Writing month · 5-day streak · 6,240 words" and "Badges
 * this month": 5-day streak, First 5,000, 10 comments, Contest entry, 15,000 words). Part 6 of
 * GAPS-12.
 *
 * How it works: nothing counted a writer's words by day before this, so the board had no data
 * behind it (Robert, 10 Nov 2026: where a board asks for something the data doesn't support,
 * build the data). From now on, each time a writer's own save changes a chapter's word count,
 * the difference is added to that writer's total for the day, in Romanian time. The hub adds
 * the days of the calendar month up against a goal of 15,000 words, works out the streak of
 * days in a row with new words, and marks five badges earned or not.
 * What it adds:
 * - writing_days: one row per writer and day with the net new words (never the words
 *   themselves);
 * - a trigger on chapters that keeps it;
 * - my_writing_month(): the month's words, the goal, the streak and the badges, for the caller.
 * Who calls it: src/features/hub/ (HubMonth on the Writers' hub).
 * Rules:
 * - Private: only the writer reads their own days. No ranking, no comparing with others.
 * - Only the writer's own saves count: a staff change to a chapter (removing a passage) never
 *   touches the writer's days.
 * - Deleting words takes them off the day again, never below zero, so cutting a paragraph and
 *   pasting it back counts nothing.
 * - Kept 400 days (a full year and a month to look back on), then pruned at the writer's next
 *   new day; deleted with the account (docs/retention.md).
 */

create table public.writing_days (
  id uuid primary key default gen_random_uuid(),
  -- The writer.
  user_id uuid not null references public.profiles (id),
  -- The day, in Romanian time.
  day date not null,
  -- Net new words that day across the writer's chapters; never below zero.
  words integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_days_words_not_negative check (words >= 0),
  constraint writing_days_one_per_day unique (user_id, day)
);

comment on table public.writing_days is
  'kind: user_action
A writer''s net new words per day in Romanian time, kept by a trigger on chapters, for the writing month, streaks and badges on the Writers'' hub (GAPS-12f). Personal data: on which days the person wrote and how much; never the words themselves. Kept 400 days.';

create trigger writing_days_set_updated_at
  before update on public.writing_days
  for each row execute function public.set_updated_at();
create trigger writing_days_refuse_user_id_change
  before update on public.writing_days
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.writing_days enable row level security;

/**
 * writing_days_select_own: a writer reads their own days, for the hub and Download my data.
 * Nobody else reads them, staff included: there is no ranking and nothing to moderate. Rows are
 * written only by the trigger below.
 */
create policy writing_days_select_own
  on public.writing_days for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy writing_days_select_own on public.writing_days is
  'Allows a writer to read their own words-per-day rows; nobody else reads them (GAPS-12f).';

grant select on public.writing_days to authenticated;

/**
 * count_writing_day: trigger on chapters. When the writer's own save changes a chapter's word
 * count, adds the difference to the writer's total for today (Romanian time).
 * Inputs: the chapter row before and after. Returns: the new row, unchanged.
 * Flow: save_chapter_draft() and the other chapter writes → chapters → this trigger →
 *   writing_days → my_writing_month().
 */
create function public.count_writing_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  words_before integer := 0;
  difference integer;
  today date := public.romania_today();
begin
  -- Step 1: only the writer's own saves count, never a staff change or a background job.
  if (select auth.uid()) is distinct from new.user_id then
    return new;
  end if;
  -- Step 2: how many words this save added or took away.
  if tg_op = 'UPDATE' then
    words_before := coalesce(old.word_count, 0);
  end if;
  difference := coalesce(new.word_count, 0) - words_before;
  if difference = 0 then
    return new;
  end if;
  -- Step 3: words taken away come off today's total, never below zero and never as a new row.
  if difference < 0 then
    update public.writing_days set words = greatest(0, words + difference)
    where user_id = new.user_id and day = today;
    return new;
  end if;
  -- Step 4: new words go on today's row, made on the day's first save.
  insert into public.writing_days (user_id, day, words) values (new.user_id, today, difference)
  on conflict on constraint writing_days_one_per_day
  -- Capped far above anything a person writes, so a huge paste can never make the save fail.
  do update set words = least(2000000000::bigint, public.writing_days.words::bigint + excluded.words)::integer;
  -- Step 5: drop the writer's days older than 400 (docs/retention.md); the unique index finds them.
  delete from public.writing_days
  where user_id = new.user_id and day < today - 400;
  return new;
end;
$$;

comment on function public.count_writing_day() is
  'Trigger on chapters: adds the change in a chapter''s word count to the writer''s own total for the day; prunes days older than 400 (GAPS-12f).';
revoke all on function public.count_writing_day() from public, anon, authenticated;

create trigger chapters_count_writing_day
  after insert or update of word_count on public.chapters
  for each row execute function public.count_writing_day();

/**
 * my_writing_month: the caller's writing month for the hub.
 * Inputs: none. Returns: a JSON object:
 *   month_start (the first day of this month, Romanian time), goal (15000), words (net new words
 *   this month), streak_days (days in a row with new words, ending today or yesterday, counted
 *   across the month's edge), and badges: streak_5 (five days in a row inside this month),
 *   first_5000 and words_15000 (the month's words reached that many), comments_10 (ten comments
 *   left on chapters this month that are still up) and contest_entry (an entry made this month
 *   that still stands), each true or false.
 * Errors: insufficient_privilege for a signed-out caller.
 * Flow: HubMonth → useHubMonth → api/hubMonth.ts → this function.
 */
create function public.my_writing_month()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  today date := public.romania_today();
  month_start date := date_trunc('month', public.romania_today())::date;
  month_words integer;
  current_streak integer;
  best_month_streak integer;
  comment_count integer;
  entered_contest boolean;
begin
  if caller_id is null then
    raise exception 'Log in to see the writing month.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the month's words.
  select least(coalesce(sum(writing_days.words), 0), 2000000000)::integer into month_words
  from public.writing_days
  where writing_days.user_id = caller_id and writing_days.day >= month_start;
  -- Step 2: the streak still running: days in a row with words, ending today or yesterday (so a
  -- streak isn't lost before the writer has had today's chance). Days in a row share the same
  -- "day minus its place in line".
  with written as (
    select writing_days.day,
           writing_days.day - (row_number() over (order by writing_days.day))::integer as run
    from public.writing_days
    where writing_days.user_id = caller_id and writing_days.words > 0
  ), runs as (
    select max(written.day) as last_day, count(*)::integer as length from written group by written.run
  )
  select coalesce(max(runs.length), 0) into current_streak from runs where runs.last_day >= today - 1;
  -- Step 3: the longest run inside this month, for the 5-day badge (it stays earned after a gap).
  with written as (
    select writing_days.day,
           writing_days.day - (row_number() over (order by writing_days.day))::integer as run
    from public.writing_days
    where writing_days.user_id = caller_id and writing_days.words > 0 and writing_days.day >= month_start
  )
  select coalesce(max(runs.length), 0) into best_month_streak
  from (select count(*)::integer as length from written group by written.run) as runs;
  -- Step 4: comments left this month that are still up, and a contest entered and not withdrawn.
  select count(*)::integer into comment_count
  from public.comments
  where comments.user_id = caller_id and comments.deleted_at is null
    and (comments.created_at at time zone 'Europe/Bucharest')::date >= month_start;
  select exists (
    select 1 from public.contest_entries
    where contest_entries.user_id = caller_id and contest_entries.status = 'valid'
      and (contest_entries.entered_at at time zone 'Europe/Bucharest')::date >= month_start
  ) into entered_contest;
  return jsonb_build_object(
    'month_start', month_start,
    'goal', 15000,
    'words', month_words,
    'streak_days', current_streak,
    'badges', jsonb_build_object(
      'streak_5', best_month_streak >= 5,
      'first_5000', month_words >= 5000,
      'comments_10', comment_count >= 10,
      'contest_entry', entered_contest,
      'words_15000', month_words >= 15000));
end;
$$;

comment on function public.my_writing_month() is
  'The caller''s writing month: words against a goal of 15,000, the running streak and five badges, from their own activity only (GAPS-12f).';
revoke all on function public.my_writing_month() from public, anon;
grant execute on function public.my_writing_month() to authenticated;

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
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f).';

-- Unchanged except for the new table: the days go with the account.
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
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f).';
