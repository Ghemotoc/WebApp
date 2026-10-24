/*
 * Migration: follow a writer or a story (story S1-E6-05; boards 6.1 Profile and 3.4 Story).
 *
 * What it adds:
 * - follows_users: who follows which writer (architecture 1.6 names it).
 * - follows_stories: who follows which story. Two tables rather than one with a "kind" column,
 *   so each has a real foreign key and S1-E7-01 can tell "new chapter of a story you follow"
 *   from "new story by a writer you follow" with a plain join (decided by the builder, 24 Oct
 *   2026, rule 8).
 * - follow_writer(handle, should_follow) and follow_story(story_slug, should_follow): the only
 *   writes. They take a username or a story's address, never a user ID (architecture 1.6), and
 *   go through the account gate (is_active_member()). Following someone who blocks you, or whom
 *   you block, fails silently: the answer is "not following" with no error, so the block is
 *   never revealed (story S1-E6-05, third criterion).
 * - writer_follow_state(handle), story_follow_state(story_slug): the public follower count and
 *   whether the caller follows, for the Follow buttons.
 * - my_followers(): the writer's own list of followers; nobody else can read it (Q50: follower
 *   lists are visible to the writer only, to protect minors).
 * - set_block() now also ends any follow between the two people, both ways.
 * Who calls it: src/features/follows/api/follows.ts (FollowButton), src/features/profiles
 * (FollowersDialog).
 * Tests: supabase/tests/database/144-follows.test.sql.
 */

/* ---------- Tables ---------- */

create table public.follows_users (
  id uuid primary key default gen_random_uuid(),
  -- The follower (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The writer they follow.
  followed_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follows_users_one_per_pair unique (user_id, followed_user_id),
  constraint follows_users_not_yourself check (user_id <> followed_user_id)
);
comment on table public.follows_users is
  'kind: user_action
Who follows which writer (S1-E6-05). The count is public; the list is the writer''s only (Q50).';
create index follows_users_followed_user_id on public.follows_users (followed_user_id);
create trigger follows_users_set_updated_at
  before update on public.follows_users
  for each row execute function public.set_updated_at();
alter table public.follows_users enable row level security;

-- Who: the follower. Why: their own "following" list (Library, later); the writer reads their
-- followers through my_followers() instead, so no one reads another person's follows directly.
-- Writes go only through follow_writer(), so there are no write policies.
create policy follows_users_select_own on public.follows_users
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.follows_users to authenticated;

create table public.follows_stories (
  id uuid primary key default gen_random_uuid(),
  -- The follower (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follows_stories_one_per_pair unique (user_id, story_id)
);
comment on table public.follows_stories is
  'kind: user_action
Who follows which story (S1-E6-05), so they hear about new chapters (S1-E7-01).';
create index follows_stories_story_id on public.follows_stories (story_id);
create trigger follows_stories_set_updated_at
  before update on public.follows_stories
  for each row execute function public.set_updated_at();
alter table public.follows_stories enable row level security;

-- Who: the follower. Why: their own list of followed stories; nobody else learns who follows a
-- story. Writes go only through follow_story().
create policy follows_stories_select_own on public.follows_stories
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.follows_stories to authenticated;

/* ---------- Follow and unfollow ---------- */

/**
 * follower_count_of: how many live accounts follow a writer.
 * Input: writer_id. Returns: the number (deleted followers don't count).
 * Internal: writer_follow_state() and follow_writer().
 */
create or replace function public.follower_count_of(writer_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.follows_users
  join public.profiles on profiles.id = follows_users.user_id
  where follows_users.followed_user_id = writer_id
    and profiles.deleted_at is null;
$$;
comment on function public.follower_count_of(uuid) is 'Internal: a writer''s public follower count (S1-E6-05).';
revoke execute on function public.follower_count_of(uuid) from public, anon, authenticated;

/**
 * story_follower_count_of: how many live accounts follow a story.
 * Internal: story_follow_state() and follow_story().
 */
create or replace function public.story_follower_count_of(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.follows_stories
  join public.profiles on profiles.id = follows_stories.user_id
  where follows_stories.story_id = target_story_id
    and profiles.deleted_at is null;
$$;
comment on function public.story_follower_count_of(uuid) is 'Internal: a story''s public follower count (S1-E6-05).';
revoke execute on function public.story_follower_count_of(uuid) from public, anon, authenticated;

/**
 * writer_follow_state: a writer's follower count, and whether the caller follows them.
 * Input: wanted_handle. Returns: JSON {"follower_count": n, "following": bool}; null for an
 *   unknown username or one that blocks the caller (as get_writer_profile() answers).
 * Where it fits: FollowButton on the profile and the story page's writer card.
 */
create or replace function public.writer_follow_state(wanted_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writer public.profiles;
begin
  select * into writer from public.profile_for_handle(wanted_handle);
  if not found or exists (select 1 from public.blocks where blocks.user_id = writer.id and blocks.blocked_user_id = caller_id) then
    return null;
  end if;
  return jsonb_build_object(
    'follower_count', public.follower_count_of(writer.id),
    'following', exists (select 1 from public.follows_users
      where follows_users.user_id = caller_id and follows_users.followed_user_id = writer.id));
end;
$$;
comment on function public.writer_follow_state(text) is
  'A writer''s public follower count and whether the caller follows them (S1-E6-05).';
grant execute on function public.writer_follow_state(text) to anon, authenticated;

/**
 * story_follow_state: a story's follower count, and whether the caller follows it.
 * Input: story_slug. Returns: JSON {"follower_count": n, "following": bool}; null when the
 *   caller may not see the story (reader_visible_story(): rating, blocks, deleted, moderated) or
 *   it has nothing published yet.
 */
create or replace function public.story_follow_state(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
begin
  select * into story from public.reader_visible_story(story_slug);
  if not found or not public.story_has_readable_chapter(story.id) then
    return null;
  end if;
  return jsonb_build_object(
    'follower_count', public.story_follower_count_of(story.id),
    'following', exists (select 1 from public.follows_stories
      where follows_stories.user_id = (select auth.uid()) and follows_stories.story_id = story.id));
end;
$$;
comment on function public.story_follow_state(text) is
  'A story''s public follower count and whether the caller follows it (S1-E6-05).';
grant execute on function public.story_follow_state(text) to anon, authenticated;

/**
 * follow_writer: follows or unfollows a writer by username.
 * Inputs: target_handle; should_follow (true to follow, false to unfollow).
 * Returns: JSON {"following": bool, "follower_count": n}, the state afterwards.
 * Rules: unfollowing always works. Following needs an account that may write (the account gate);
 *   when either person blocks the other it does nothing and answers "not following", with no
 *   error, so the block isn't revealed (S1-E6-05; rule 6). One cannot follow oneself.
 * Errors: insufficient_privilege when signed out or the account may not write; no_data_found for
 *   an unknown username (or one that blocks the caller: the same answer as unknown);
 *   check_violation for one's own username.
 */
create or replace function public.follow_writer(target_handle text, should_follow boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writer public.profiles;
begin
  -- Step 1: signed in, and the writer exists (a writer who blocks the caller looks missing).
  if caller_id is null then
    raise exception 'Log in to follow writers.' using errcode = 'insufficient_privilege';
  end if;
  select * into writer from public.profile_for_handle(target_handle);
  if not found or exists (select 1 from public.blocks where blocks.user_id = writer.id and blocks.blocked_user_id = caller_id) then
    raise exception 'There is no account with that username.' using errcode = 'no_data_found';
  end if;
  if writer.id = caller_id then
    raise exception 'You can''t follow yourself.' using errcode = 'check_violation';
  end if;
  -- Step 2: unfollowing is always allowed, even for a read-only account.
  if not should_follow then
    delete from public.follows_users where follows_users.user_id = caller_id and follows_users.followed_user_id = writer.id;
    return jsonb_build_object('following', false, 'follower_count', public.follower_count_of(writer.id));
  end if;
  -- Step 3: following is a write, so the account gate applies (architecture 1.7.8).
  if not public.is_active_member() then
    raise exception 'Your account can''t follow anyone right now.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 4: a block either way: silently nothing (S1-E6-05, third criterion).
  if public.is_blocked_with(writer.id) then
    return jsonb_build_object('following', false, 'follower_count', public.follower_count_of(writer.id));
  end if;
  -- Step 5: follow; doing it twice changes nothing.
  insert into public.follows_users (user_id, followed_user_id) values (caller_id, writer.id)
  on conflict on constraint follows_users_one_per_pair do nothing;
  return jsonb_build_object('following', true, 'follower_count', public.follower_count_of(writer.id));
end;
$$;
comment on function public.follow_writer(text, boolean) is
  'Follows or unfollows a writer by username; a block makes it silently do nothing (S1-E6-05).';
revoke execute on function public.follow_writer(text, boolean) from public, anon;
grant execute on function public.follow_writer(text, boolean) to authenticated;

/**
 * follow_story: follows or unfollows a story by its address.
 * Inputs: story_slug; should_follow.
 * Returns: JSON {"following": bool, "follower_count": n}.
 * Rules: as follow_writer(): unfollowing always works; following needs the account gate; the
 *   story must be one the caller may read (rating, blocks, moderation: reader_visible_story());
 *   a writer may follow their own story (harmless, and they see it count).
 *   A story whose writer blocks the caller, or whom the caller blocks, is not visible to them, so
 *   following it is refused the same way as an unknown story.
 * Errors: insufficient_privilege when signed out or the account may not write; no_data_found
 *   when the caller may not see the story.
 */
create or replace function public.follow_story(story_slug text, should_follow boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
begin
  -- Step 1: signed in.
  if caller_id is null then
    raise exception 'Log in to follow stories.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: unfollowing works on any story the person follows, even one they can no longer see.
  if not should_follow then
    delete from public.follows_stories
    using public.stories
    where stories.id = follows_stories.story_id and stories.slug = story_slug
      and follows_stories.user_id = caller_id;
    select stories.id into target_story_id from public.stories where stories.slug = story_slug;
    return jsonb_build_object('following', false,
      'follower_count', coalesce(public.story_follower_count_of(target_story_id), 0));
  end if;
  -- Step 3: the story, if the caller may read it and it has something published.
  select reader_visible_story.id into target_story_id from public.reader_visible_story(story_slug);
  if target_story_id is null or not public.story_has_readable_chapter(target_story_id) then
    raise exception 'There is no such story.' using errcode = 'no_data_found';
  end if;
  -- Step 4: the account gate, then follow; twice changes nothing.
  if not public.is_active_member() then
    raise exception 'Your account can''t follow anything right now.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.follows_stories (user_id, story_id) values (caller_id, target_story_id)
  on conflict on constraint follows_stories_one_per_pair do nothing;
  return jsonb_build_object('following', true, 'follower_count', public.story_follower_count_of(target_story_id));
end;
$$;
comment on function public.follow_story(text, boolean) is
  'Follows or unfollows a story by its address (S1-E6-05).';
revoke execute on function public.follow_story(text, boolean) from public, anon;
grant execute on function public.follow_story(text, boolean) to authenticated;

/**
 * my_followers: the people who follow the signed-in writer, newest first.
 * Returns: rows of handle, display_name and followed_at; never a user ID. People the writer
 *   blocks, or who block the writer, are left out (blocking ends the follow anyway).
 * Rule: only the writer sees their own list (Q50); there is no way to ask for someone else's.
 * Where it fits: the "Followers" number on one's own profile opens this list.
 */
create or replace function public.my_followers()
returns table (handle text, display_name text, followed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.handle, public.display_name(profiles.handle, profiles.pen_name), follows_users.created_at
  from public.follows_users
  join public.profiles on profiles.id = follows_users.user_id
  where follows_users.followed_user_id = (select auth.uid())
    and profiles.deleted_at is null
    and not public.is_blocked_with(profiles.id)
  order by follows_users.created_at desc;
$$;
comment on function public.my_followers() is
  'The signed-in writer''s own followers; nobody else can read the list (S1-E6-05, Q50).';
revoke execute on function public.my_followers() from public, anon;
grant execute on function public.my_followers() to authenticated;

/* ---------- A block ends follows ---------- */

/**
 * set_block: as in S1-E5-05, plus one step from S1-E6-05: blocking ends any follow between the
 * two people, both ways (the writer and their stories), so a blocked person stops hearing about
 * new chapters and drops out of the follower count. Unblocking doesn't bring the follows back.
 */
create or replace function public.set_block(target_handle text, should_block boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.profiles;
begin
  -- Step 1: signed in.
  if caller_id is null then
    raise exception 'Log in to block someone.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the person, never oneself.
  select * into target from public.profile_for_handle(target_handle);
  if not found then
    raise exception 'There is no account with that username.' using errcode = 'no_data_found';
  end if;
  if target.id = caller_id then
    raise exception 'You can''t block yourself.' using errcode = 'check_violation';
  end if;
  -- Step 3: unblock, or block and end the follows both ways.
  if not should_block then
    delete from public.blocks where blocks.user_id = caller_id and blocks.blocked_user_id = target.id;
    return jsonb_build_object('blocked', false);
  end if;
  insert into public.blocks (user_id, blocked_user_id) values (caller_id, target.id)
  on conflict on constraint blocks_one_per_pair do nothing;
  delete from public.follows_users
  where (follows_users.user_id = caller_id and follows_users.followed_user_id = target.id)
     or (follows_users.user_id = target.id and follows_users.followed_user_id = caller_id);
  delete from public.follows_stories
  using public.stories
  where stories.id = follows_stories.story_id
    and ((follows_stories.user_id = caller_id and stories.user_id = target.id)
      or (follows_stories.user_id = target.id and stories.user_id = caller_id));
  return jsonb_build_object('blocked', true);
end;
$$;
