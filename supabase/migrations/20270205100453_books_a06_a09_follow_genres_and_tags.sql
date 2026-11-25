/*
 * Migration: follow a genre or a tag, and the tags shown under a genre or tag page's title
 * (BOOKS-A06 and BOOKS-A09, user stories 1.6 and 1.9; Robert's request of 25 Nov 2026 to build
 * every bundle of the user stories).
 *
 * What it adds:
 * - topic_follows: which genres (categories) and tags a member follows. One table with exactly
 *   one of category_id or tag_id set, so each row has a real foreign key (the same reason
 *   follows_users and follows_stories are separate tables).
 * - set_topic_follow(topic_kind, topic_key, should_follow): the only write. It takes the genre's
 *   slug or the tag's name, never an ID, and goes through the account gate (is_active_member());
 *   unfollowing is always allowed. Only an approved tag can be followed (CMS-1e: a tag waits for
 *   staff before it is public).
 * - topic_follow_state(topic_kind, topic_key): whether the caller follows it (false signed out).
 * - topic_tags(topic_kind, topic_key, how_many): the board's "#tag" links under the title: on a
 *   genre page the tags its stories use most, on a tag page the tags that sit on the same stories.
 *   Counted only over stories this reader may see (listed_stories(): ratings, blocks, drafts and
 *   moderation), and only approved tags, so nothing hidden leaks through a count.
 * - my_follows() now also returns the genres and tags followed, for Library's "What you follow"
 *   (user story 1.6: "Library's What you follow lists them").
 * - data_export_tables() and account_deletion_rules() list topic_follows (GDPR art. 15 and 17).
 * Who calls it: src/features/discovery (TopicFollowBar) and src/features/library (FollowingSection).
 * Tests: supabase/tests/database/407-topic-follows.test.sql.
 */

/* ---------- 1. The table ---------- */

create table public.topic_follows (
  id uuid primary key default gen_random_uuid(),
  -- The follower (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The genre followed, or null for a tag.
  category_id uuid references public.categories (id) on delete cascade,
  -- The tag followed, or null for a genre.
  tag_id uuid references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_follows_one_topic check (num_nonnulls(category_id, tag_id) = 1),
  constraint topic_follows_one_per_genre unique (user_id, category_id),
  constraint topic_follows_one_per_tag unique (user_id, tag_id)
);
comment on table public.topic_follows is
  'kind: user_action
Which genres and tags a member follows (BOOKS-A06, BOOKS-A09). Private to the member.';
create index topic_follows_category_id on public.topic_follows (category_id);
create index topic_follows_tag_id on public.topic_follows (tag_id);
create trigger topic_follows_set_updated_at
  before update on public.topic_follows
  for each row execute function public.set_updated_at();
create trigger topic_follows_keep_user_id
  before update on public.topic_follows
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.topic_follows enable row level security;

-- Who: the member themselves. Why: their own list of followed genres and tags; nobody else learns
-- what a person follows. Writes go only through set_topic_follow(), so there are no write policies.
create policy topic_follows_select_own on public.topic_follows
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.topic_follows to authenticated;

/* ---------- 2. Finding a topic ---------- */

/**
 * topic_ids_of: the genre or the approved tag a page names.
 * Inputs: topic_kind ('category' or 'tag') and topic_key (the genre's slug or the tag's name).
 * Returns: one row with category_id or tag_id set, or no row when there is no such topic.
 * Errors: invalid_parameter_value for any other kind.
 * Internal: set_topic_follow(), topic_follow_state() and topic_tags().
 */
create or replace function public.topic_ids_of(topic_kind text, topic_key text)
returns table (category_id uuid, tag_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: a genre, by its slug.
  if topic_kind = 'category' then
    return query select categories.id, null::uuid from public.categories where categories.slug = topic_key;
    return;
  end if;
  -- Step 2: a tag, by any look-alike of its name, and only once staff approved it (CMS-1e).
  if topic_kind = 'tag' then
    return query select null::uuid, tags.id from public.tags
      where tags.normalised_name = public.normalise_tag(topic_key) and tags.status = 'approved';
    return;
  end if;
  raise exception 'Only a genre or a tag can be followed.' using errcode = 'invalid_parameter_value';
end;
$$;
comment on function public.topic_ids_of(text, text) is
  'Internal: the genre or approved tag a page names (BOOKS-A06, BOOKS-A09).';
revoke execute on function public.topic_ids_of(text, text) from public, anon, authenticated;

/* ---------- 3. Follow and unfollow ---------- */

/**
 * topic_follow_state: whether the caller follows a genre or a tag.
 * Inputs: topic_kind ('category' or 'tag'), topic_key (slug or tag name).
 * Returns: true or false; false signed out or for an unknown topic.
 * Where it fits: the Follow button under a genre or tag page's title (TopicFollowBar).
 */
create or replace function public.topic_follow_state(topic_kind text, topic_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.topic_ids_of(topic_kind, topic_key) as topic
    join public.topic_follows on topic_follows.user_id = (select auth.uid())
      and (topic_follows.category_id = topic.category_id or topic_follows.tag_id = topic.tag_id));
$$;
comment on function public.topic_follow_state(text, text) is
  'Whether the caller follows a genre or a tag (BOOKS-A06, BOOKS-A09).';
revoke execute on function public.topic_follow_state(text, text) from public;
grant execute on function public.topic_follow_state(text, text) to anon, authenticated;

/**
 * set_topic_follow: follows or unfollows a genre or a tag.
 * Inputs: topic_kind ('category' or 'tag'), topic_key (slug or tag name), should_follow.
 * Returns: true when the caller now follows it, false when not.
 * Errors: insufficient_privilege signed out, or when a read-only account tries to follow;
 *   no_data_found for an unknown genre or a tag staff haven't approved.
 * Where it fits: TopicFollowBar's Follow button.
 */
create or replace function public.set_topic_follow(topic_kind text, topic_key text, should_follow boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  topic record;
begin
  -- Step 1: who and what.
  if caller_id is null then
    raise exception 'Log in to follow a genre or a tag.' using errcode = 'insufficient_privilege';
  end if;
  select * into topic from public.topic_ids_of(topic_kind, topic_key);
  if not found then
    raise exception 'There is no such genre or tag.' using errcode = 'no_data_found';
  end if;
  -- Step 2: unfollowing is always allowed, even for a read-only account.
  if not should_follow then
    delete from public.topic_follows where topic_follows.user_id = caller_id
      and (topic_follows.category_id = topic.category_id or topic_follows.tag_id = topic.tag_id);
    return false;
  end if;
  -- Step 3: following is a write, so the account gate applies (architecture 1.7.8).
  if not public.is_active_member() then
    raise exception 'Your account can''t follow anything right now.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 4: follow; doing it twice changes nothing.
  insert into public.topic_follows (user_id, category_id, tag_id)
  values (caller_id, topic.category_id, topic.tag_id)
  on conflict do nothing;
  return true;
end;
$$;
comment on function public.set_topic_follow(text, text, boolean) is
  'Follows or unfollows a genre or an approved tag (BOOKS-A06, BOOKS-A09).';
revoke execute on function public.set_topic_follow(text, text, boolean) from public, anon;
grant execute on function public.set_topic_follow(text, text, boolean) to authenticated;

/* ---------- 4. The tags under a page's title ---------- */

/**
 * topic_tags: the "#tag" links under a genre or tag page's title (boards A06 and A09).
 * Inputs: topic_kind ('category' for a genre's top tags, 'tag' for the tags related to a tag),
 *   topic_key (slug or tag name), how_many (1 to 20, default 8).
 * Returns: the tags' names as a JSON array, most stories first, then by name; [] when none.
 *   Counted only over the stories this reader may see (listed_stories()), only approved tags,
 *   and on a tag page never the tag itself.
 * Errors: invalid_parameter_value for any other kind.
 * Where it fits: TopicFollowBar on StoryListPage.
 */
create or replace function public.topic_tags(topic_kind text, topic_key text, how_many integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted integer := least(greatest(coalesce(how_many, 8), 1), 20);
  own_tag text := case when topic_kind = 'tag' then public.normalise_tag(topic_key) end;
  found_tags jsonb;
begin
  if topic_kind is null or topic_kind not in ('category', 'tag') then
    raise exception 'Only a genre or a tag has tags.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 1: the stories of this list the reader may see, then the approved tags on them.
  select coalesce(jsonb_agg(counted.name order by counted.story_count desc, counted.name), '[]'::jsonb)
  into found_tags
  from (
    select tags.name, count(*) as story_count
    from public.listed_stories(topic_kind, topic_key, null, null, null) as story
    join public.story_tags on story_tags.story_id = story.id
    join public.tags on tags.id = story_tags.tag_id
    where tags.status = 'approved'
      and tags.normalised_name is distinct from own_tag
    group by tags.id, tags.name
    order by story_count desc, tags.name
    limit wanted
  ) as counted;
  return found_tags;
end;
$$;
comment on function public.topic_tags(text, text, integer) is
  'A genre''s most used tags, or the tags related to a tag, over stories the reader may see (BOOKS-A06, BOOKS-A09).';
revoke execute on function public.topic_tags(text, text, integer) from public;
grant execute on function public.topic_tags(text, text, integer) to anon, authenticated;

/* ---------- 5. Library's "What you follow" ---------- */

/**
 * my_follows: the writers, stories, genres and tags the caller follows, for the Library's "What
 * you follow" (S1-E4-03; genres and tags since BOOKS-A06).
 * Returns: JSON {writers: [{handle, display_name, last_published_at}], stories:
 *   [story_card_json()], genres: [slug], tags: [name]}. Writers or stories either side blocks,
 *   deleted accounts and stories the caller may not see are left out; never a user ID.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: src/features/library/api/library.ts.
 */
create or replace function public.my_follows()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writers jsonb;
  followed_stories jsonb;
  genres jsonb;
  followed_tags jsonb;
begin
  if caller_id is null then
    raise exception 'Log in to see who you follow.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the writers, with their latest chapter's date.
  select coalesce(jsonb_agg(jsonb_build_object('handle', found.handle, 'display_name', found.display_name,
      'last_published_at', found.last_published_at) order by found.last_published_at desc nulls last, found.handle), '[]'::jsonb)
  into writers
  from (
    select profiles.handle, public.display_name(profiles.handle, profiles.pen_name) as display_name,
      (select max(stories.last_chapter_published_at) from public.stories
        where stories.user_id = profiles.id and stories.deleted_at is null) as last_published_at
    from public.follows_users
    join public.profiles on profiles.id = follows_users.followed_user_id
    where follows_users.user_id = caller_id and profiles.deleted_at is null and profiles.handle is not null
      and not public.is_blocked_with(profiles.id)
  ) as found;
  -- Step 2: the stories the caller may still see, newest chapter first.
  select coalesce(jsonb_agg(public.story_card_json(stories.id)
      order by stories.last_chapter_published_at desc nulls last, stories.slug), '[]'::jsonb)
  into followed_stories
  from public.follows_stories
  join public.stories on stories.id = follows_stories.story_id
  where follows_stories.user_id = caller_id
    and exists (select 1 from public.reader_visible_story(stories.slug));
  -- Step 3: the genres, in the order the app lists them.
  select coalesce(jsonb_agg(categories.slug order by categories.position), '[]'::jsonb)
  into genres
  from public.topic_follows
  join public.categories on categories.id = topic_follows.category_id
  where topic_follows.user_id = caller_id;
  -- Step 4: the tags, still approved, by name.
  select coalesce(jsonb_agg(tags.name order by tags.name), '[]'::jsonb)
  into followed_tags
  from public.topic_follows
  join public.tags on tags.id = topic_follows.tag_id
  where topic_follows.user_id = caller_id and tags.status = 'approved';
  return jsonb_build_object('writers', writers, 'stories', followed_stories,
    'genres', genres, 'tags', followed_tags);
end;
$$;
comment on function public.my_follows() is
  'The writers, stories, genres and tags the caller follows, for the Library (S1-E4-03, BOOKS-A06).';
revoke execute on function public.my_follows() from public, anon;
grant execute on function public.my_follows() to authenticated;

/* ---------- 6. Download my data and account deletion ---------- */


/**
 * data_export_tables: as before, plus topic_follows (the genres and tags the person follows; GDPR art. 15).
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
    ('topic_follows', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before, plus topic_follows, deleted with the account (GDPR art. 17).
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
    ('topic_follows', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;
