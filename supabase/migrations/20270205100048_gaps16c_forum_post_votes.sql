/*
 * Migration: upvotes on forum posts and private downvotes (bundle GAPS-16, part c; stories
 * S1-E8-02 and S1-E6-04; board 5.2, the vote chip under every post and "How votes work" in the
 * side column).
 *
 * How it works: under every post a signed-in member can upvote (everyone sees the number of
 * upvotes) or downvote privately (nobody sees a downvote, the post's author included; decided
 * 16 Oct 2026, Q22: downvotes are private and feed moderation only). One vote per person per
 * post; pressing the same button again takes the vote back, pressing the other one swaps it.
 * What it adds:
 * - forum_post_votes: one row per person per post, up or down. The voter reads their own row;
 *   moderation staff read every row; nobody else reads any (architecture 1.6: downvotes are
 *   readable only by staff).
 * - vote_forum_post(post_id, vote): the only write.
 * - open_forum_post_downvote_case(): when downvote_case_threshold counted accounts downvoted a
 *   post, it enters the moderation queue at the lowest tier, exactly as comments do (S1-E6-04).
 * - forum_post_json() gains 'votes': the upvote count, the caller's own vote and whether they
 *   may vote. Never a downvote count.
 * - The new table in Download my data and in account deletion.
 * Who calls it: src/features/forums/ (PostVotes on ForumPostCard, VotesHelp in ThreadSidePanel).
 * Rules:
 * - Never on one's own post; only on a live post in a thread the caller may open.
 * - Adding a vote goes through the account gate and needs an open thread (a locked thread is
 *   closed for votes as for replies); taking a vote back always works.
 * - A downvote from an account younger than downvote_new_account_hours is kept but not counted
 *   towards the threshold (S1-E6-04, criterion 3). Upvotes count from every live account.
 * - Votes never reach ranking or any public number except the upvote count.
 * Tests: supabase/tests/database/344-forum-post-votes.test.sql.
 */

/* ---------- Table ---------- */

create table public.forum_post_votes (
  id uuid primary key default gen_random_uuid(),
  -- The member voting (rule 15).
  user_id uuid not null references public.profiles (id),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  -- True for an upvote, false for a private downvote.
  is_upvote boolean not null,
  -- False when the account was under downvote_new_account_hours old when it voted (S1-E6-04).
  is_counted boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_post_votes_one_per_person unique (user_id, post_id)
);
comment on table public.forum_post_votes is
  'kind: user_action
One vote per person per forum post: an upvote everyone can count, or a private downvote only moderation sees (GAPS-16c, S1-E6-04). Read by the voter (their own) and moderation staff only.';
create index forum_post_votes_post_id on public.forum_post_votes (post_id);
create trigger forum_post_votes_set_updated_at
  before update on public.forum_post_votes
  for each row execute function public.set_updated_at();
create trigger forum_post_votes_refuse_user_id_change
  before update on public.forum_post_votes
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.forum_post_votes enable row level security;

-- Who: the member who voted. Why: so their own button shows the vote; nobody else, the post's
-- author included, reads a vote row (downvotes are private, Q22). Writes go only through
-- vote_forum_post().
create policy forum_post_votes_select_own on public.forum_post_votes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Who: owner, admin and moderator in a staff session. Why: downvotes feed moderation only
-- (architecture 1.6, Q22).
create policy forum_post_votes_select_moderation on public.forum_post_votes
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

grant select on public.forum_post_votes to authenticated;

/* ---------- The threshold ---------- */

/**
 * open_forum_post_downvote_case: puts a forum post in the moderation queue once enough accounts
 * downvoted it.
 * Input: the post. Returns: nothing.
 * Rules: counts counted downvotes from live accounts; at downvote_case_threshold or more, and
 *   with no open case for the post, it opens one at the lowest tier (seven_days), source
 *   'downvotes', with a D- reference, as open_downvote_case() does for comments (S1-E6-04).
 * Internal: vote_forum_post().
 */
create or replace function public.open_forum_post_downvote_case(target public.forum_posts)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold integer := coalesce(public.setting_value('downvote_case_threshold'), '5')::text::integer;
  counted integer;
begin
  -- Step 1: how many accounts count.
  select count(*) into counted
  from public.forum_post_votes as votes
  join public.profiles on profiles.id = votes.user_id
  where votes.post_id = target.id and not votes.is_upvote and votes.is_counted
    and profiles.deleted_at is null;
  if counted < threshold then
    return;
  end if;
  -- Step 2: one open case per item; a report may already have opened it.
  if exists (select 1 from public.cases
             where cases.item_type = 'forum_post' and cases.item_id = target.id and cases.status = 'open') then
    return;
  end if;
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, received_at, deadline_at)
  values ('D-' || lpad(nextval('public.downvote_case_reference_seq')::text, 6, '0'), target.user_id,
          'forum_post', target.id, 'downvotes', 'seven_days', now(),
          now() + make_interval(hours => public.tier_hours('seven_days')));
end;
$$;
comment on function public.open_forum_post_downvote_case(public.forum_posts) is
  'Internal: opens a lowest-tier case once a forum post has enough counted downvotes (GAPS-16c, S1-E6-04).';
revoke execute on function public.open_forum_post_downvote_case(public.forum_posts) from public, anon, authenticated;

/* ---------- Voting ---------- */

/**
 * forum_post_vote_target: the live post a vote is about, or an error.
 * Input: post_id. Returns: the post.
 * Errors: no_data_found (hint post:missing) when the post isn't live for the caller or its thread
 *   isn't one they may open; check_violation (hint post:own) for one's own post.
 * Internal: vote_forum_post().
 */
create or replace function public.forum_post_vote_target(post_id uuid)
returns public.forum_posts
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.forum_posts;
  thread public.forum_threads;
begin
  -- Step 1: the post must be live for the caller, in a thread they may open.
  select * into target from public.forum_posts where forum_posts.id = post_id;
  select * into thread from public.forum_threads where forum_threads.id = target.thread_id;
  if target.id is null or thread.id is null or not public.forum_thread_is_shown(thread)
     or public.forum_post_state_for_caller(target) is distinct from 'live' then
    raise exception 'That post isn''t there any more.' using errcode = 'no_data_found', hint = 'post:missing';
  end if;
  -- Step 2: never one's own post.
  if target.user_id = (select auth.uid()) then
    raise exception 'You can''t vote on your own post.' using errcode = 'check_violation', hint = 'post:own';
  end if;
  return target;
end;
$$;
comment on function public.forum_post_vote_target(uuid) is
  'Internal: the live forum post a vote is about, checked for the caller (GAPS-16c).';
revoke execute on function public.forum_post_vote_target(uuid) from public, anon, authenticated;

/**
 * vote_forum_post: sets, swaps or takes back the caller's vote on a forum post.
 * Inputs: post_id; vote: 'up', 'down', or null to take the vote back.
 * Returns: the caller's vote afterwards ('up', 'down' or null). Never a count of downvotes.
 * Rules: signed in; the post live in a thread the caller may open, never their own; taking a
 *   vote back always works; adding one goes through the account gate (architecture 1.7.8) and
 *   needs an open thread. A downvote from an account younger than downvote_new_account_hours is
 *   kept uncounted; a downvote may open a moderation case (S1-E6-04).
 * Errors: insufficient_privilege (hint signed_out or not_active); invalid_parameter_value for any
 *   other vote; no_data_found (post:missing); check_violation (post:own, thread:locked).
 */
create or replace function public.vote_forum_post(post_id uuid, vote text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.forum_posts;
  new_account_hours integer := coalesce(public.setting_value('downvote_new_account_hours'), '24')::text::integer;
begin
  -- Step 1: signed in, a vote we know, and a post the caller may vote on.
  if caller_id is null then
    raise exception 'Log in to vote.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  if vote is not null and vote not in ('up', 'down') then
    raise exception 'A vote is up or down.' using errcode = 'invalid_parameter_value';
  end if;
  target := public.forum_post_vote_target(post_id);
  -- Step 2: taking the vote back is always allowed.
  if vote is null then
    delete from public.forum_post_votes as votes
    where votes.post_id = target.id and votes.user_id = caller_id;
    return null;
  end if;
  -- Step 3: adding or swapping a vote is a write: the account gate, and an open thread.
  if not public.is_active_member() then
    raise exception 'Your account can''t vote right now.' using errcode = 'insufficient_privilege', hint = 'not_active';
  end if;
  if exists (select 1 from public.forum_threads
             where forum_threads.id = target.thread_id and forum_threads.locked_at is not null) then
    raise exception 'This thread is locked.' using errcode = 'check_violation', hint = 'thread:locked';
  end if;
  -- Step 4: one row per person per post; a new account's vote is kept but not counted.
  insert into public.forum_post_votes (user_id, post_id, is_upvote, is_counted)
  select caller_id, target.id, vote = 'up', profiles.created_at <= now() - make_interval(hours => new_account_hours)
  from public.profiles where profiles.id = caller_id
  on conflict on constraint forum_post_votes_one_per_person
  do update set is_upvote = excluded.is_upvote;
  -- Step 5: enough downvotes put the post in the queue.
  if vote = 'down' then
    perform public.open_forum_post_downvote_case(target);
  end if;
  return vote;
end;
$$;
comment on function public.vote_forum_post(uuid, text) is
  'Sets, swaps or takes back the caller''s vote on a forum post; answers only the caller''s own vote (GAPS-16c, S1-E6-04).';
revoke execute on function public.vote_forum_post(uuid, text) from public, anon;
grant execute on function public.vote_forum_post(uuid, text) to authenticated;

/**
 * forum_post_votes_json: what the vote chip under a post shows.
 * Inputs: the post; can_vote (worked out by forum_post_json()).
 * Returns: {up: the number of upvotes from live accounts, mine: 'up', 'down' or null,
 *   can_vote}. Never a downvote count, for anyone (Q22).
 * Internal: forum_post_json().
 */
create or replace function public.forum_post_votes_json(target public.forum_posts, can_vote boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'up', (select count(*) from public.forum_post_votes as votes
           join public.profiles on profiles.id = votes.user_id
           where votes.post_id = target.id and votes.is_upvote and profiles.deleted_at is null),
    'mine', (select case when votes.is_upvote then 'up' else 'down' end
             from public.forum_post_votes as votes
             where votes.post_id = target.id and votes.user_id = (select auth.uid())),
    'can_vote', can_vote);
$$;
comment on function public.forum_post_votes_json(public.forum_posts, boolean) is
  'Internal: a forum post''s upvote count and the caller''s own vote, never a downvote count (GAPS-16c).';
revoke execute on function public.forum_post_votes_json(public.forum_posts, boolean) from public, anon, authenticated;

/* ---------- The thread page ---------- */

-- forum_post_json(): unchanged except for 'votes'.
CREATE OR REPLACE FUNCTION public.forum_post_json(target forum_posts, starter_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.forum_post_state_for_caller(target);
  is_own boolean := caller_id is not null and target.user_id = caller_id;
  is_shown boolean := state in ('live', 'hidden');
  is_space_hidden boolean := public.forum_post_is_space_hidden(target);
  space public.spaces := public.space_of_post(target);
  is_thread_open boolean := not exists (select 1 from public.forum_threads
                                        where forum_threads.id = target.thread_id
                                          and forum_threads.locked_at is not null);
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
    'author_rank', public.rank_of(target.user_id),
    -- IDEAS-3f: whether this reply is the thread's marked answer, and whether the caller (the
    -- thread's starter) may mark it: a live reply by someone else (criteria 1 and 2).
    'is_answer', target.id = (select forum_threads.answer_post_id from public.forum_threads
                              where forum_threads.id = target.thread_id),
    'can_mark_answer', is_own is false and caller_id is not null and caller_id = starter_id
                       and target.post_number > 1 and state = 'live',
    -- GAPS-10: who hid a hidden post, whether it was moved here, and the space moderators' tools.
    'hidden_by', case when state is distinct from 'hidden' then null when is_space_hidden then 'space' else 'team' end,
    'was_moved', is_shown and target.moved_from_thread_id is not null,
    'can_space_moderate', coalesce(
      caller_id is not null and is_shown and target.post_number > 1
      and space.id is not null and public.space_may_act(space, 'posts')
      and (state = 'live' or is_space_hidden)
      and (target.user_id <> space.user_id or space.user_id = caller_id
           or public.space_acts_as_platform(space)), false),
    -- GAPS-16c: the upvote count and the caller's own vote (never a downvote count), and
    -- whether they may vote: a live post by someone else in an open thread, by an active member.
    'votes', case when is_shown then public.forum_post_votes_json(target,
      caller_id is not null and not is_own and state = 'live' and is_thread_open
      and public.is_active_member()) end);
end;
$$;


comment on function public.forum_post_json(public.forum_posts, uuid) is
  'Internal: one post as the thread page draws it, with its quotes, its author''s signature and rank, and its upvotes, never a user ID or a downvote count (S1-E8-02, S1-E8-03, S1-E8-08, S1-E8-09, GAPS-16c).';


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
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h, GAPS-13, GAPS-16a, GAPS-16c).';


-- Unchanged except for the new table: the votes go with the account.
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
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h, GAPS-13, GAPS-16a, GAPS-16c).';
