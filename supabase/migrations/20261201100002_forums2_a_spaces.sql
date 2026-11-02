/*
 * Migration: spaces people create (bundle FORUMS-2, part a; story S1-E8-06; board 5.3 A user space).
 *
 * What it adds:
 *   spaces               a community any fully active account can start, with a unique name, a
 *                        description, rules and a drawn banner colour (the board's four; picture
 *                        banners come with part b). Its starter is its owner (user_id).
 *   space_members        who is in a space: the owner, members and requests waiting for the owner
 *                        (pending). Space moderators arrive in part b (S1-E8-07).
 *   forums.space_id      every space owns one hidden forum, "space-<slug>", so threads, posts,
 *                        quotes, read marks, sticky and locked threads and search work in a space
 *                        exactly as in the forums. Space forums never show on the forum index, the
 *                        staff forum page or the public forum policies.
 *   The age rules (criteria 2, 3, 6 and 7; decided 17 Oct 2026, 34p):
 *     - a space started by someone under 16 is an under-16 space: only under-16 accounts join,
 *       post or are let in; one started by someone 16 or over is a 16+ space, the same for 16+;
 *     - anyone, signed out included, reads an open 16+ space;
 *     - an under-16 space is hidden from people 16 or over and signed-out visitors, unless its
 *       owner made it readable by everybody (readers = 'everybody'); then anyone reads it but
 *       still only under-16s join or post. Its card (name, description, rules) shows to under-16
 *       accounts so they can ask to join; its threads only to its members (readers = 'members');
 *     - a member who turns 16 stays in the under-16 spaces they joined, but can't join or start
 *       another: membership is kept, the age group is worked out again on every join.
 *     Class spaces (S1-E8-11, bundle CLASSES) are the one exception and come later.
 *   Members-only posting (criterion 8): the owner picks "anyone in the age group" or "members
 *     only", and "I approve each request" or "anyone can join straight away".
 *   Brand and author names are allowed in a space's name (Q26, criterion 9): no name list is
 *     checked; a trademark complaint goes through the report form (notice and action).
 *   Reporting (CLAUDE.md rule 6): reportable_type 'space', its branches in the shared contract,
 *     and is_moderated_away('space', …) in every read.
 *   Data rights: both tables in Download my data; deleting an account deletes its memberships and
 *     keeps the spaces it owns for their members (a question for Robert in the pull request).
 *
 * No limit per person beyond the spam limits (criterion 1): take_rate_limit('space_create').
 * OPEN (S1-E8-06): what happens when the owner of an under-16 space turns 16. Nothing is built
 *   for it: the owner stays owner (rule 13; the question is in the pull request).
 * Who calls it: src/features/spaces/ (api/spaces.ts). Tests:
 *   supabase/tests/database/227-spaces.test.sql, e2e/spaces.spec.ts.
 */

/* ---------- Types ---------- */

create type public.space_age_group as enum ('under_16', '16_plus');
create type public.space_readers as enum ('members', 'everybody');
create type public.space_posting as enum ('anyone', 'members');
create type public.space_joining as enum ('approve', 'open');
create type public.space_banner as enum ('plum', 'night', 'forest', 'gold');
create type public.space_member_status as enum ('pending', 'active');
create type public.space_member_role as enum ('owner', 'member');

comment on type public.space_age_group is
  'Who a space is for: under-16s only or 16 and over only, set from its starter''s age (S1-E8-06; 34p).';
comment on type public.space_readers is
  'Who reads an under-16 space''s threads: its members, or everybody (S1-E8-06; 34p). A 16+ space is always everybody.';
comment on type public.space_posting is 'Who may post in a space: anyone in its age group, or members only (S1-E8-06).';
comment on type public.space_joining is 'How people join a space: the owner approves each request, or straight away (S1-E8-06).';
comment on type public.space_banner is 'A space''s drawn banner colour (board 5.3: plum, night blue, forest green, gold).';
comment on type public.space_member_status is 'A membership: waiting for the owner, or in (S1-E8-06).';
comment on type public.space_member_role is 'A member''s role in a space; part b adds moderator (S1-E8-07).';

/* ---------- Settings (proposals) ---------- */

insert into public.settings (key, value, is_public, description) values
  ('space_name_max_characters', '60'::jsonb, true, 'The longest space name, in characters (proposal; S1-E8-06).'),
  ('space_description_max_characters', '300'::jsonb, true, 'The longest space description, in characters (proposal; S1-E8-06).'),
  ('space_rules_max_characters', '2000'::jsonb, true, 'The longest space rules, in characters (proposal; S1-E8-06).')
on conflict (key) do nothing;

-- The spam limit for starting spaces (S1-E10-12; criterion 1: no other limit per person).
update public.settings
  set value = value || '{"space_create": {"new_account": 2, "older_account": 10},
                         "space_join": {"new_account": 30, "older_account": 60}}'::jsonb
  where key = 'rate_limits';

/* ---------- Tables ---------- */

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  -- The owner: who started it (CLAUDE.md rule 15). Never shown; screens show the username.
  user_id uuid not null references public.profiles (id),
  -- The address: /spaces/<slug>, made from the name when the space starts and kept for good.
  slug text not null,
  name text not null,
  -- The name folded (lower case, no diacritics, single spaces): two spaces can't share it.
  name_key text not null,
  description text not null,
  -- One rule a line, shown in "Space rules" (board 5.3). Plain text, never Markdown.
  rules text not null default '',
  -- Set once, from the owner's age when they started it (criteria 2 and 3).
  age_group public.space_age_group not null,
  readers public.space_readers not null default 'everybody',
  posting public.space_posting not null default 'members',
  joining public.space_joining not null default 'approve',
  banner public.space_banner not null default 'plum',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint spaces_slug_unique unique (slug),
  constraint spaces_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 50),
  constraint spaces_slug_not_new check (slug <> 'new'),
  constraint spaces_name_is_written check (btrim(name) <> '' and char_length(name) <= 200),
  constraint spaces_description_length check (char_length(description) <= 2000),
  constraint spaces_rules_length check (char_length(rules) <= 10000),
  -- Only an under-16 space can be closed to non-members: anyone reads a 16+ space (criterion 5).
  constraint spaces_16_plus_read_by_everybody check (age_group = 'under_16' or readers = 'everybody')
);
comment on table public.spaces is
  'kind: user_content; reportable: space
Spaces people create, each with a hidden forum for its threads (S1-E8-06). Read through space_page() and space_list().';
comment on column public.spaces.age_group is 'Set from the starter''s age; never changes (S1-E8-06 criteria 2 and 3).';
comment on column public.spaces.readers is 'For an under-16 space: members only, or everybody (34p).';
create unique index spaces_name_key_live on public.spaces (name_key) where deleted_at is null;
create index spaces_owner on public.spaces (user_id);
create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();
create trigger spaces_refuse_user_id_change
  before update on public.spaces
  for each row execute function public.refuse_user_id_change('user_id');

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  -- The member (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  role public.space_member_role not null default 'member',
  status public.space_member_status not null default 'active',
  -- When they asked, and when they got in (null while waiting).
  requested_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_members_once unique (space_id, user_id),
  constraint space_members_joined_when_active check ((status = 'active') = (joined_at is not null)),
  constraint space_members_owner_is_active check (role <> 'owner' or status = 'active')
);
comment on table public.space_members is
  'kind: user_action
Who is in a space, and requests waiting for its owner (S1-E8-06).';
create index space_members_member on public.space_members (user_id);
create index space_members_space_status on public.space_members (space_id, status);
create trigger space_members_set_updated_at
  before update on public.space_members
  for each row execute function public.set_updated_at();
create trigger space_members_refuse_user_id_change
  before update on public.space_members
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;

/**
 * Policy spaces_select_own: the owner reads the spaces they started.
 * Why: their own data (Download my data). Everyone else reads spaces only through space_page()
 * and space_list(), which apply the age rules, so an under-16 space never leaks to an adult.
 */
create policy spaces_select_own on public.spaces
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy spaces_select_own on public.spaces is 'Allows a space''s owner to read it (S1-E8-06).';

/**
 * Policy space_members_select_own: a person reads their own memberships and requests.
 * Why: their own data. Member lists go through space_page() and space_join_requests().
 */
create policy space_members_select_own on public.space_members
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy space_members_select_own on public.space_members is
  'Allows a person to read their own space memberships and requests (S1-E8-06).';

-- Table privileges, exactly what the policies need. Every write goes through the functions below.
revoke all on public.spaces from anon, authenticated;
revoke all on public.space_members from anon, authenticated;
grant select on public.spaces to authenticated;         -- spaces_select_own
grant select on public.space_members to authenticated;  -- space_members_select_own

/* ---------- Each space's hidden forum ---------- */

-- One forum per space; the space's threads live in it (space_forum_id()).
alter table public.forums add column space_id uuid unique references public.spaces (id);
comment on column public.forums.space_id is
  'The space this hidden forum belongs to; null for staff''s forums (S1-E8-06). Space forums never show on the forum index.';
-- The address "space-…" is kept for spaces, so staff's forums can't take one.
alter table public.forums add constraint forums_space_slug check ((space_id is null) = (slug !~ '^space-'));

-- Who: anyone. Why: as in FORUMS-1a, but a space's forum is read only through the space's own
-- functions, so an under-16 space's existence never leaks through the forums table.
drop policy forums_select_public on public.forums;
create policy forums_select_public
  on public.forums
  for select
  to anon, authenticated
  using (deleted_at is null and space_id is null);
comment on policy forums_select_public on public.forums is
  'Allows anyone to read live staff forum categories, forums and subforums; never a space''s forum (S1-E8-01, S1-E8-06).';

drop policy forum_names_select_public on public.forum_names;
create policy forum_names_select_public
  on public.forum_names
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.forums
    where forums.id = forum_names.forum_id and forums.deleted_at is null and forums.space_id is null));
comment on policy forum_names_select_public on public.forum_names is
  'Allows anyone to read the names of live staff forums; never a space''s forum (FORUMS-1a, S1-E8-06).';

/**
 * forums_set_level: as in FORUMS-1a; a space's forum is level 1 with no parent (it holds threads,
 * like any forum), and nothing may sit inside it.
 * Errors: as before, plus check_violation hint "parent:space".
 */
create or replace function public.forums_set_level()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.forums;
begin
  -- Step 1: a forum with forums inside it keeps its place in the tree.
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id
     and exists (select 1 from public.forums where forums.parent_id = new.id and forums.deleted_at is null) then
    raise exception 'Move the forums inside it first.' using errcode = 'check_violation', hint = 'parent:has_children';
  end if;
  -- Step 2: a space's forum stands alone and holds threads, so it counts as a forum (level 1);
  -- a category has no parent.
  if new.space_id is not null and new.parent_id is null then
    new.level := 1;
    return new;
  end if;
  if new.parent_id is null then
    new.level := 0;
    return new;
  end if;
  -- Step 3: one level below a live staff forum, never below a subforum or a space's forum.
  select * into parent from public.forums where forums.id = new.parent_id and forums.deleted_at is null;
  if parent.id is null then
    raise exception 'The forum it should sit in doesn''t exist.' using errcode = 'check_violation', hint = 'parent:missing';
  end if;
  if parent.space_id is not null or new.space_id is not null then
    raise exception 'A space''s forum stands on its own.' using errcode = 'check_violation', hint = 'parent:space';
  end if;
  if parent.level >= 2 then
    raise exception 'A subforum can''t hold forums.' using errcode = 'check_violation', hint = 'parent:too_deep';
  end if;
  new.level := parent.level + 1;
  return new;
end;
$$;

/* ---------- Who a space is for ---------- */

/**
 * space_age_group_of_caller: which spaces the signed-in person may join or start.
 * Returns: 'under_16' for 13 to 15 (and under 13, the protective side), '16_plus' for 16 and
 *   over, or null when signed out or the age isn't known (they can join or start nothing).
 * Rule: the younger possible age from the year of birth (age_band(), S1-E2-02).
 * Internal: every space function below.
 */
create or replace function public.space_age_group_of_caller()
returns public.space_age_group
language sql
stable
security definer
set search_path = ''
as $$
  select case public.age_band()
    when 'under_13' then 'under_16'::public.space_age_group
    when '13_to_15' then 'under_16'::public.space_age_group
    when '16_to_17' then '16_plus'::public.space_age_group
    when '18_plus' then '16_plus'::public.space_age_group
  end;
$$;
comment on function public.space_age_group_of_caller() is
  'Internal: under_16, 16_plus or null (unknown age) for the caller (S1-E8-06).';
revoke execute on function public.space_age_group_of_caller() from public, anon, authenticated;

/**
 * space_membership_of_caller: the caller's row in a space, if any.
 * Input: the space's ID. Returns: the row, or an empty row. Internal.
 */
create or replace function public.space_membership_of_caller(target_space_id uuid)
returns public.space_members
language sql
stable
security definer
set search_path = ''
as $$
  select space_members.* from public.space_members
  where space_members.space_id = target_space_id and space_members.user_id = (select auth.uid());
$$;
comment on function public.space_membership_of_caller(uuid) is 'Internal: the caller''s membership or request in a space (S1-E8-06).';
revoke execute on function public.space_membership_of_caller(uuid) from public, anon, authenticated;

/**
 * space_is_member: whether the caller is in a space (not merely waiting).
 * Input: the space's ID. Returns: true for an active member, the owner included. Internal.
 */
create or replace function public.space_is_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.space_membership_of_caller(target_space_id)).status = 'active', false);
$$;
comment on function public.space_is_member(uuid) is 'Internal: whether the caller is an active member of a space (S1-E8-06).';
revoke execute on function public.space_is_member(uuid) from public, anon, authenticated;

/**
 * space_may_read: may the caller read a space's threads?
 * Input: the space row. Returns: true for a live space when:
 *   - the caller is moderation staff, or its owner (the owner still sees it if staff hid it); or,
 *     when staff haven't hidden or removed it,
 *   - neither the owner nor the caller blocks the other (blocks are respected everywhere, rule 6),
 *   - and it is a 16+ space (criterion 5), an under-16 space its owner opened to everybody, or the
 *     caller is a member (a member who turned 16 included, criterion 7; decided 17 Oct 2026, 34p).
 * Internal: space_card_visible(), forum_thread_is_shown(), space_json().
 */
create or replace function public.space_may_read(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.id is not null and target.deleted_at is null and (
    public.staff_may('moderation', 'view')
    or (target.user_id = (select auth.uid()) and public.moderated_state_of('space', target.id) is distinct from 'removed')
    or (not public.is_moderated_away('space', target.id)
        and not public.is_blocked_with(target.user_id)
        and (target.age_group = '16_plus' or target.readers = 'everybody' or public.space_is_member(target.id))));
$$;
comment on function public.space_may_read(public.spaces) is
  'Internal: whether the caller may read a space''s threads, by the age rules (S1-E8-06; 34p).';
revoke execute on function public.space_may_read(public.spaces) from public, anon, authenticated;

/**
 * space_card_visible: may the caller see that a space exists (its name, description and rules)?
 * Input: the space row. Returns: true when they may read it, and also for an under-16 account
 *   looking at a live under-16 space, so they can find it and ask to join. Adults and signed-out
 *   visitors never learn that a members-only under-16 space exists (criterion 6).
 * Internal: space_page(), space_list(), the reporting branches.
 */
create or replace function public.space_card_visible(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.space_may_read(target)
    or (target.id is not null and target.deleted_at is null
        and not public.is_moderated_away('space', target.id)
        and not public.is_blocked_with(target.user_id)
        and target.age_group = 'under_16'
        and public.space_age_group_of_caller() = 'under_16');
$$;
comment on function public.space_card_visible(public.spaces) is
  'Internal: whether the caller may see a space''s card: readers, plus under-16s for an under-16 space (S1-E8-06).';
revoke execute on function public.space_card_visible(public.spaces) from public, anon, authenticated;

/**
 * space_may_join: may the caller join (or ask to join) a space?
 * Input: the space row. Returns: true when signed in, the account gate lets them write, they are
 *   in the space's age group today and not already in it or waiting (criteria 2, 3 and 7).
 * Internal: space_json(), join_space(), space_may_post().
 */
create or replace function public.space_may_join(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and public.space_card_visible(target)
    and public.is_active_member()
    and public.space_age_group_of_caller() = target.age_group
    and (public.space_membership_of_caller(target.id)).id is null;
$$;
comment on function public.space_may_join(public.spaces) is
  'Internal: whether the caller may join a space: active, in its age group, not in it yet (S1-E8-06).';
revoke execute on function public.space_may_join(public.spaces) from public, anon, authenticated;

/**
 * space_may_post: may the caller start a thread or reply in a space?
 * Input: the space row. Returns: true when they may read it, the account gate lets them write and
 *   either they are a member (a member who turned 16 included) or the space takes posts from
 *   anyone in its age group and they are in it (criteria 2, 3 and 8).
 * Internal: the forum write triggers below, space_json(), forum_thread_header_json().
 */
create or replace function public.space_may_post(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and public.space_may_read(target)
    and not public.is_moderated_away('space', target.id)
    and public.is_active_member()
    and (public.space_is_member(target.id)
         or (target.posting = 'anyone' and public.space_age_group_of_caller() = target.age_group));
$$;
comment on function public.space_may_post(public.spaces) is
  'Internal: whether the caller may post in a space: members, or anyone in its age group when it allows (S1-E8-06).';
revoke execute on function public.space_may_post(public.spaces) from public, anon, authenticated;

/**
 * space_of_forum: the space a forum belongs to.
 * Input: the forum's ID. Returns: the space row, or an empty row for a staff forum. Internal.
 */
create or replace function public.space_of_forum(target_forum_id uuid)
returns public.spaces
language sql
stable
security definer
set search_path = ''
as $$
  select spaces.* from public.spaces
  join public.forums on forums.space_id = spaces.id
  where forums.id = target_forum_id;
$$;
comment on function public.space_of_forum(uuid) is 'Internal: the space a forum belongs to, if any (S1-E8-06).';
revoke execute on function public.space_of_forum(uuid) from public, anon, authenticated;

/* ---------- Threads and posts in a space ---------- */

/**
 * forum_thread_is_shown: as in FORUMS-1b, and a thread in a space shows only to people who may
 * read the space (criteria 5 and 6).
 */
create or replace function public.forum_thread_is_shown(target public.forum_threads)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.deleted_at is null
    and exists (select 1 from public.forums where forums.id = target.forum_id and forums.deleted_at is null
                  and (forums.space_id is null or public.space_may_read(public.space_of_forum(forums.id))))
    and not public.is_blocked_with(target.user_id)
    and (
      not public.is_moderated_away('forum_thread', target.id)
      or (target.user_id = (select auth.uid()) and public.moderated_state_of('forum_thread', target.id) = 'hidden')
    );
$$;

/**
 * refuse_space_writer: refuses a new thread or post in a space from someone the space doesn't take
 * (criteria 2, 3 and 8). Trigger: before insert on forum_threads and forum_posts, so every write
 * path (start, reply, and anything later) obeys the same rule.
 * Errors: insufficient_privilege with hint 'space:pending' (their request is waiting),
 *   'space:join' (they could join first) or 'space:age'
 *   (the space isn't for their age group, or they may not write).
 */
create or replace function public.refuse_space_writer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  forum_id uuid;
  space public.spaces;
begin
  -- Step 1: which forum the row goes into.
  if tg_table_name = 'forum_threads' then
    forum_id := new.forum_id;
  else
    select forum_threads.forum_id into forum_id from public.forum_threads where forum_threads.id = new.thread_id;
  end if;
  -- Step 2: staff forums are not affected.
  space := public.space_of_forum(forum_id);
  if space.id is null or public.space_may_post(space) then
    return new;
  end if;
  -- Step 3: say whether they are waiting for the owner, or whether joining would help.
  if (public.space_membership_of_caller(space.id)).status = 'pending' then
    raise exception 'The owner hasn''t let you in yet.' using errcode = 'insufficient_privilege', hint = 'space:pending';
  end if;
  if public.space_may_join(space) then
    raise exception 'Join this space to post here.' using errcode = 'insufficient_privilege', hint = 'space:join';
  end if;
  raise exception 'This space doesn''t take posts from your account.' using errcode = 'insufficient_privilege', hint = 'space:age';
end;
$$;
comment on function public.refuse_space_writer() is
  'Trigger: refuses threads and posts in a space from people it doesn''t take (S1-E8-06).';
revoke execute on function public.refuse_space_writer() from public, anon, authenticated;

-- The trigger also fires when space_id is set, so a space's forum gets its level.
drop trigger forums_set_level on public.forums;
create trigger forums_set_level
  before insert or update of parent_id, space_id on public.forums
  for each row execute function public.forums_set_level();

create trigger forum_threads_refuse_space_writer
  before insert on public.forum_threads
  for each row execute function public.refuse_space_writer();
create trigger forum_posts_refuse_space_writer
  before insert on public.forum_posts
  for each row execute function public.refuse_space_writer();

/**
 * forum_thread_header_json: as in FORUMS-1e, plus space ({"slug", "name"} for a thread in a
 *   space, else null) and a can_reply that also asks the space (criterion 8).
 * Internal: forum_thread().
 */
create or replace function public.forum_thread_header_json(target public.forum_threads)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'number', target.thread_number,
    'title', target.title,
    'forum_slug', (select forums.slug from public.forums where forums.id = target.forum_id),
    'space', (select jsonb_build_object('slug', space.slug, 'name', space.name)
              from public.space_of_forum(target.forum_id) as space where space.id is not null),
    'author', public.forum_person_json(target.user_id),
    'is_mine', target.user_id = (select auth.uid()),
    'state', case when public.moderated_state_of('forum_thread', target.id) = 'hidden' then 'hidden' else 'live' end,
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'writer_count', (select count(distinct forum_posts.user_id)::integer from public.forum_posts
                     where forum_posts.thread_id = target.id
                       and public.forum_post_state_for_caller(forum_posts) in ('live', 'hidden')),
    'last_post_at', target.last_post_at,
    'last_post_number', target.last_post_number,
    'is_sticky', target.is_sticky,
    'lock', case when target.locked_at is null then null
                 else jsonb_build_object('locked_at', target.locked_at, 'reason', target.lock_reason) end,
    'can_reply', (select auth.uid()) is not null and target.locked_at is null and public.is_active_member()
                 and coalesce((select public.space_may_post(space) from public.space_of_forum(target.forum_id) as space
                               where space.id is not null), true),
    'can_moderate', (select auth.uid()) is not null and public.staff_may('moderation', 'act'));
$$;

/* ---------- Space forums leave the forum index and the staff page ---------- */

/**
 * forum_index: as in FORUMS-1d, without the spaces' hidden forums (they show on /spaces).
 */
create or replace function public.forum_index(language_code text)
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  doodle text,
  name text,
  description text,
  thread_count bigint,
  post_count bigint,
  latest_activity_at timestamptz,
  latest_post jsonb,
  has_unread boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent, forums.doodle, names.name, names.description,
    numbers.thread_count, numbers.post_count, latest.posted_at,
    case when latest.post_id is not null then jsonb_build_object(
      'thread_title', latest.thread_title,
      'thread_address', '/forums/' || forums.slug || '/' || latest.thread_number || '?post=' || latest.post_number,
      'writer_handle', latest.writer ->> 'handle',
      'writer_name', latest.writer ->> 'display_name',
      'is_staff', coalesce((latest.writer ->> 'is_staff')::boolean, false),
      'posted_at', latest.posted_at) end,
    public.forum_has_unread(forums.id)
  from public.forums
  cross join lateral public.forum_name_in(forums.id, forum_index.language_code) as names
  cross join lateral (
    select count(distinct live_threads.id) as thread_count, count(live_posts.id) as post_count
    from public.forum_threads as live_threads
    left join public.forum_posts as live_posts
      on live_posts.thread_id = live_threads.id and live_posts.deleted_at is null
    where live_threads.forum_id = forums.id and live_threads.deleted_at is null
  ) as numbers
  left join lateral (
    select newest.id as post_id, newest.post_number, newest.created_at as posted_at,
      thread.title as thread_title, thread.thread_number, public.forum_person_json(newest.user_id) as writer
    from public.forum_threads as thread
    join public.forum_posts as newest on newest.thread_id = thread.id
    where thread.forum_id = forums.id and public.forum_thread_is_shown(thread)
      and public.forum_post_state_for_caller(newest) = 'live'
    order by newest.created_at desc
    limit 1
  ) as latest on true
  where forums.deleted_at is null and forums.space_id is null;
$$;

/**
 * admin_list_forums: as in FORUMS-1a, without the spaces' hidden forums: staff's forum page
 * edits staff forums only.
 */
create or replace function public.admin_list_forums()
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  doodle text,
  names jsonb,
  missing_languages text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_forum_staff();
  return query
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent, forums.doodle,
    coalesce((select jsonb_object_agg(forum_names.language_code,
        jsonb_build_object('name', forum_names.name, 'description', forum_names.description))
      from public.forum_names where forum_names.forum_id = forums.id), '{}'::jsonb),
    array(select languages.code from public.languages
      where languages.is_interface and not exists (
        select 1 from public.forum_names
        where forum_names.forum_id = forums.id and forum_names.language_code = languages.code)
      order by languages.code)
  from public.forums
  where forums.deleted_at is null and forums.space_id is null
  order by forums.level, forums.position, forums.slug;
end;
$$;

/* ---------- The words a space is made of ---------- */

/**
 * check_space_text: the rules for a space's name, description and rules (CLAUDE.md rule 8).
 * Inputs: value as typed; field, 'name', 'description' or 'rules'.
 * Returns: the text trimmed, ş/ţ corrected; a name also on one line with single spaces.
 * Errors: check_violation with hint '<field>:empty' (a name and a description are needed; rules
 *   are optional), '<field>:too_long' (over the space_*_max_characters setting) or
 *   '<field>:html' (a raw HTML tag). Screens show all three as plain text, never as Markdown.
 * Internal: create_space(), update_space().
 */
create or replace function public.check_space_text(value text, field text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean text := btrim(public.normalise_romanian_letters(coalesce(value, '')));
  longest integer := coalesce((public.setting_value('space_' || field || '_max_characters'))::integer, 300);
begin
  -- Step 1: a name is one line with single spaces.
  if field = 'name' then
    clean := regexp_replace(clean, '\s+', ' ', 'g');
  end if;
  -- Step 2: a name and a description are needed; rules may be empty.
  if clean = '' and field <> 'rules' then
    raise exception 'Fill in the %.', field using errcode = 'check_violation', hint = field || ':empty';
  end if;
  if char_length(clean) > longest then
    raise exception 'At most % characters.', longest using errcode = 'check_violation', hint = field || ':too_long';
  end if;
  -- Step 3: no raw HTML, so nothing in it can run.
  if clean ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = field || ':html';
  end if;
  return clean;
end;
$$;
comment on function public.check_space_text(text, text) is
  'Internal: refuses an empty, over-long or HTML space name, description or rules; corrects ş/ţ (S1-E8-06, rule 8).';
revoke execute on function public.check_space_text(text, text) from public, anon, authenticated;

/**
 * space_name_key: a space name in the form two names are compared in: lower case, no diacritics,
 * single spaces ("Cercul Fanteziei" and "cercul  fanteziei" are one name). Internal.
 */
create or replace function public.space_name_key(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select public.normalise_tag(public.normalise_romanian_letters(coalesce(name, '')));
$$;
comment on function public.space_name_key(text) is 'Internal: a space name folded for the "only once" check (S1-E8-06).';
revoke execute on function public.space_name_key(text) from public, anon, authenticated;

/**
 * space_slug_for: a new space's address from its name: "Cercul fanteziei" → "cercul-fanteziei",
 * with "-2", "-3"… when another space already has it. Input: the clean name. Internal.
 */
create or replace function public.space_slug_for(name text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  base text := left(btrim(regexp_replace(public.space_name_key(name), '[^a-z0-9]+', '-', 'g'), '-'), 44);
  candidate text;
  attempt integer := 1;
begin
  -- Step 1: a name of only marks or one letter still gets an address.
  base := btrim(base, '-');
  if char_length(base) < 2 or base = 'new' then
    base := 'space';
  end if;
  -- Step 2: the first free one.
  candidate := base;
  while exists (select 1 from public.spaces where spaces.slug = candidate) loop
    attempt := attempt + 1;
    candidate := base || '-' || attempt;
  end loop;
  return candidate;
end;
$$;
comment on function public.space_slug_for(text) is 'Internal: a free address for a new space, from its name (S1-E8-06).';
revoke execute on function public.space_slug_for(text) from public, anon, authenticated;

/**
 * space_forum_id: the hidden forum that holds a space's threads. Input: the space's ID. Internal.
 */
create or replace function public.space_forum_id(target_space_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select forums.id from public.forums where forums.space_id = target_space_id;
$$;
comment on function public.space_forum_id(uuid) is 'Internal: a space''s hidden forum (S1-E8-06).';
revoke execute on function public.space_forum_id(uuid) from public, anon, authenticated;

/**
 * write_space_forum_names: gives the space's forum the space's name in every interface language,
 * so the thread page, "New for you" and search show it like any forum's. Internal.
 */
create or replace function public.write_space_forum_names(target_space_id uuid, name text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.forum_names (forum_id, language_code, name)
  select public.space_forum_id(target_space_id), languages.code, name
  from public.languages where languages.is_interface
  on conflict on constraint forum_names_one_per_language do update set name = excluded.name;
$$;
comment on function public.write_space_forum_names(uuid, text) is 'Internal: names a space''s forum after the space (S1-E8-06).';
revoke execute on function public.write_space_forum_names(uuid, text) from public, anon, authenticated;

/* ---------- What a screen gets ---------- */

/**
 * space_viewer_json: what the caller may do in a space.
 * Input: the space row. Returns: JSON {"membership" (null, 'pending', 'member' or 'owner'),
 *   "can_read", "can_join", "can_post", "can_manage" (the owner: settings and requests)}.
 * Internal: space_json().
 */
create or replace function public.space_viewer_json(target public.spaces)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'membership', case
      when membership.role = 'owner' then 'owner'
      when membership.status = 'active' then 'member'
      when membership.status = 'pending' then 'pending' end,
    'can_read', public.space_may_read(target),
    'can_join', public.space_may_join(target),
    'can_post', public.space_may_post(target),
    'can_manage', target.user_id = (select auth.uid()))
  from (select (public.space_membership_of_caller(target.id)).*) as membership;
$$;
comment on function public.space_viewer_json(public.spaces) is 'Internal: the caller''s place in a space and what they may do (S1-E8-06).';
revoke execute on function public.space_viewer_json(public.spaces) from public, anon, authenticated;

/**
 * space_latest_activity: when something last happened in a space: its newest post, or when it
 * started. Input: the space row. Internal: space_json(), space_list()'s order.
 */
create or replace function public.space_latest_activity(target public.spaces)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(target.created_at, (
    select max(forum_threads.last_post_at) from public.forum_threads
    where forum_threads.forum_id = public.space_forum_id(target.id) and forum_threads.deleted_at is null));
$$;
comment on function public.space_latest_activity(public.spaces) is 'Internal: a space''s newest post, or its start (S1-E8-06).';
revoke execute on function public.space_latest_activity(public.spaces) from public, anon, authenticated;

/**
 * space_json: a space as the screens show it. Never a user ID.
 * Input: the space row. Returns: JSON {"id" (the space's own ID, for Report), "slug",
 *   "forum_slug", "name", "description", "rules", "age_group", "readers", "posting", "joining",
 *   "banner", "owner" (forum_person_json()), "member_count", "thread_count",
 *   "latest_activity_at", "created_at", "viewer" (space_viewer_json())}.
 *   age_group is said only to people in that age group, members and staff: an adult reading an
 *   under-16 space its owner opened to everybody isn't told that its members are under 16 (the
 *   same care as the messaging note, S1-E9-03; a proposal in the pull request).
 * Internal: space_page(), space_list(), create_space(), update_space().
 */
create or replace function public.space_json(target public.spaces)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'slug', target.slug,
    'forum_slug', 'space-' || target.slug,
    'name', target.name,
    'description', target.description,
    'rules', target.rules,
    'age_group', case when target.age_group = public.space_age_group_of_caller()
                        or public.space_is_member(target.id) or public.staff_may('moderation', 'view')
                      then target.age_group end,
    'readers', target.readers,
    'posting', target.posting,
    'joining', target.joining,
    'banner', target.banner,
    'owner', public.forum_person_json(target.user_id),
    'member_count', (select count(*)::integer from public.space_members
                     where space_members.space_id = target.id and space_members.status = 'active'),
    'thread_count', (select count(*)::integer from public.forum_threads
                     where forum_threads.forum_id = public.space_forum_id(target.id) and forum_threads.deleted_at is null),
    'latest_activity_at', public.space_latest_activity(target),
    'created_at', target.created_at,
    'viewer', public.space_viewer_json(target));
$$;
comment on function public.space_json(public.spaces) is 'Internal: a space for the screens, never a user ID (S1-E8-06).';
revoke execute on function public.space_json(public.spaces) from public, anon, authenticated;

/**
 * space_page: one space, for its page (board 5.3).
 * Input: slug, the address. Returns: space_json(), or null when there is no such live space or the
 *   caller may not know it exists (criterion 6: an under-16 space is hidden from adults and
 *   signed-out visitors unless its owner opened it to everybody).
 * Who may call it: anyone, signed out included.
 */
create or replace function public.space_page(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.space_json(spaces) from public.spaces
  where spaces.slug = space_page.slug and public.space_card_visible(spaces);
$$;
comment on function public.space_page(text) is 'One space for its page, by the age rules; null when hidden (S1-E8-06).';
grant execute on function public.space_page(text) to anon, authenticated;

/**
 * space_list: the spaces the caller may see, newest activity first (the forum index's Spaces card
 *   and /spaces).
 * Inputs: skip (how many the page already shows); how_many (default 20, at most 50).
 * Returns: JSON {"spaces": [space_json()...], "total", "has_more"}.
 * Who may call it: anyone, signed out included.
 */
create or replace function public.space_list(skip integer default 0, how_many integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page_size integer := least(greatest(coalesce(how_many, 20), 1), 50);
  found jsonb;
  total integer;
begin
  -- Step 1: every live space whose card the caller may see, the busiest first; then one page.
  with seen as (
    select spaces as row_data, public.space_latest_activity(spaces) as activity from public.spaces
    where spaces.deleted_at is null and public.space_card_visible(spaces)
  ), page as (
    select seen.* from seen order by seen.activity desc, (seen.row_data).name
    offset greatest(coalesce(skip, 0), 0) limit page_size
  )
  select coalesce((select jsonb_agg(public.space_json(page.row_data) order by page.activity desc, (page.row_data).name)
                   from page), '[]'::jsonb),
         (select count(*)::integer from seen)
  into found, total;
  -- Step 2: the answer.
  return jsonb_build_object('spaces', found, 'total', total,
    'has_more', greatest(coalesce(skip, 0), 0) + page_size < total);
end;
$$;
comment on function public.space_list(integer, integer) is 'The spaces the caller may see, busiest first (S1-E8-06).';
grant execute on function public.space_list(integer, integer) to anon, authenticated;

/**
 * space_name_available: whether a name is free, for the form's "This name is available."
 * Input: the name as typed. Returns: JSON {"available", "problem"} where problem is null or a
 *   check_space_text() hint ('name:empty', 'name:too_long', 'name:html') or 'name:taken'.
 * Who may call it: signed-in people (the form needs an account).
 */
create or replace function public.space_name_available(name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_name text;
  problem text;
begin
  -- Step 1: the same checks as create_space(); a refusal's hint is the problem.
  begin
    clean_name := public.check_space_text(name, 'name');
  exception when check_violation then
    get stacked diagnostics problem = pg_exception_hint;
    return jsonb_build_object('available', false, 'problem', problem);
  end;
  -- Step 2: only once among live spaces.
  if exists (select 1 from public.spaces
             where spaces.name_key = public.space_name_key(clean_name) and spaces.deleted_at is null) then
    return jsonb_build_object('available', false, 'problem', 'name:taken');
  end if;
  return jsonb_build_object('available', true, 'problem', null);
end;
$$;
comment on function public.space_name_available(text) is 'Whether a space name is free and passes its checks (S1-E8-06).';
revoke execute on function public.space_name_available(text) from public, anon;
grant execute on function public.space_name_available(text) to authenticated;

/* ---------- Starting and changing a space ---------- */

/**
 * require_space_starter: the checks before someone starts or joins a space.
 * Returns: the caller's ID. Errors: insufficient_privilege hint 'signed_out', 'not_active' (the
 *   account gate) or 'space:age_unknown' (no age to pick an age group from). Internal.
 */
create or replace function public.require_space_starter()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  if not public.is_active_member() then
    raise exception 'Your account can''t do this right now.' using errcode = 'insufficient_privilege', hint = 'not_active';
  end if;
  if public.space_age_group_of_caller() is null then
    raise exception 'We don''t know your age group yet.' using errcode = 'insufficient_privilege', hint = 'space:age_unknown';
  end if;
  return caller_id;
end;
$$;
comment on function public.require_space_starter() is 'Internal: signed in, the account gate and a known age group (S1-E8-06).';
revoke execute on function public.require_space_starter() from public, anon, authenticated;

/**
 * my_space_age_group: which spaces the signed-in person would start, for the form's "Because
 *   you're 16 or over, your space is for members 16 and over" (board 5.3).
 * Returns: 'under_16', '16_plus', or null (signed out, or no age yet). Only the caller's own group.
 */
create or replace function public.my_space_age_group()
returns public.space_age_group
language sql
stable
security definer
set search_path = ''
as $$
  select public.space_age_group_of_caller();
$$;
comment on function public.my_space_age_group() is 'The caller''s own age group for spaces, for the create form (S1-E8-06).';
revoke execute on function public.my_space_age_group() from public, anon;
grant execute on function public.my_space_age_group() to authenticated;

/**
 * create_space: starts a space; the caller becomes its owner (criterion 1).
 * Inputs: name, description, rules (one a line, may be empty), posting ('anyone' or 'members'),
 *   joining ('approve' or 'open'), readers (for an under-16 space: 'members' or 'everybody';
 *   ignored for a 16+ space, which everybody reads), banner (plum, night, forest or gold).
 * Returns: JSON {"slug"} for the new space's address.
 * Rules: require_space_starter(); the spam limit take_rate_limit('space_create') and nothing else
 *   (no minimum account age, no approval, criterion 1); the age group from the caller's age today
 *   (criteria 2 and 3); an under-16 space is read by its members only unless the owner says
 *   everybody (private by default for minors, architecture 1.10; a proposal).
 * Errors: insufficient_privilege; program_limit_exceeded (hint "wait_minutes:n");
 *   check_violation (check_space_text()'s hints, or 'name:taken').
 */
create or replace function public.create_space(
  name text,
  description text,
  rules text default '',
  posting public.space_posting default 'members',
  joining public.space_joining default 'approve',
  readers public.space_readers default 'members',
  banner public.space_banner default 'plum'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  age_group public.space_age_group := public.space_age_group_of_caller();
  clean_name text := public.check_space_text(name, 'name');
  new_space public.spaces;
begin
  -- Step 1: the spam limit, then the name only once.
  perform public.take_rate_limit('space_create');
  if exists (select 1 from public.spaces
             where spaces.name_key = public.space_name_key(clean_name) and spaces.deleted_at is null) then
    raise exception 'Another space has this name.' using errcode = 'check_violation', hint = 'name:taken';
  end if;
  -- Step 2: the space, read by everybody unless it is an under-16 space its owner keeps to members.
  insert into public.spaces (user_id, slug, name, name_key, description, rules, age_group, readers,
                             posting, joining, banner)
  values (caller_id, public.space_slug_for(clean_name), clean_name, public.space_name_key(clean_name),
          public.check_space_text(description, 'description'), public.check_space_text(rules, 'rules'),
          age_group,
          case when age_group = 'under_16' then coalesce(create_space.readers, 'members') else 'everybody' end,
          coalesce(create_space.posting, 'members'), coalesce(create_space.joining, 'approve'),
          coalesce(create_space.banner, 'plum'))
  returning * into new_space;
  -- Step 3: its hidden forum, named after it, and the owner as its first member.
  insert into public.forums (slug, space_id) values ('space-' || new_space.slug, new_space.id);
  perform public.write_space_forum_names(new_space.id, new_space.name);
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values (caller_id, new_space.id, 'owner', 'active', now());
  return jsonb_build_object('slug', new_space.slug);
end;
$$;
comment on function public.create_space(text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) is
  'Starts a space with its owner, age group and hidden forum; the spam limit only (S1-E8-06).';
revoke execute on function public.create_space(text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) from public, anon;
grant execute on function public.create_space(text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) to authenticated;

/**
 * owned_space_for_change: the space a change is about, for its owner only.
 * Input: the space's address. Returns: the row, locked for the change.
 * Errors: no_data_found (hint 'space:missing'); insufficient_privilege (hint 'space:not_owner').
 * Internal: update_space(), space_join_requests(), decide_space_join_request(). Part b lets
 *   moderators with the matching permission through as well (S1-E8-07).
 */
create or replace function public.owned_space_for_change(target_slug text)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces;
begin
  select * into space from public.spaces
  where spaces.slug = target_slug and spaces.deleted_at is null
  for update;
  if space.id is null or not public.space_card_visible(space) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if space.user_id is distinct from (select auth.uid()) then
    raise exception 'Only the space''s owner can do this.' using errcode = 'insufficient_privilege', hint = 'space:not_owner';
  end if;
  return space;
end;
$$;
comment on function public.owned_space_for_change(text) is 'Internal: a space for a change by its owner (S1-E8-06).';
revoke execute on function public.owned_space_for_change(text) from public, anon, authenticated;

/**
 * update_space: the owner changes a space's name, description, rules and settings (board 5.3:
 *   "You can change everything below later"). Its address and age group stay.
 * Inputs: slug, then the same as create_space().
 * Returns: space_json() of the changed space.
 * Errors: owned_space_for_change()'s; check_violation (the text hints, 'name:taken').
 */
create or replace function public.update_space(
  slug text,
  name text,
  description text,
  rules text,
  posting public.space_posting,
  joining public.space_joining,
  readers public.space_readers,
  banner public.space_banner
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(update_space.slug);
  clean_name text := public.check_space_text(name, 'name');
begin
  -- Step 1: a new name is still only once.
  if exists (select 1 from public.spaces
             where spaces.name_key = public.space_name_key(clean_name) and spaces.deleted_at is null
               and spaces.id <> space.id) then
    raise exception 'Another space has this name.' using errcode = 'check_violation', hint = 'name:taken';
  end if;
  -- Step 2: the change; a 16+ space stays read by everybody (criterion 5).
  update public.spaces set
    name = clean_name,
    name_key = public.space_name_key(clean_name),
    description = public.check_space_text(update_space.description, 'description'),
    rules = public.check_space_text(update_space.rules, 'rules'),
    posting = coalesce(update_space.posting, spaces.posting),
    joining = coalesce(update_space.joining, spaces.joining),
    readers = case when spaces.age_group = 'under_16' then coalesce(update_space.readers, spaces.readers) else 'everybody' end,
    banner = coalesce(update_space.banner, spaces.banner)
  where spaces.id = space.id
  returning * into space;
  perform public.write_space_forum_names(space.id, space.name);
  return public.space_json(space);
end;
$$;
comment on function public.update_space(text, text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) is
  'The owner changes a space''s name, words and settings; address and age group stay (S1-E8-06).';
revoke execute on function public.update_space(text, text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) from public, anon;
grant execute on function public.update_space(text, text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) to authenticated;

/* ---------- Joining and leaving ---------- */

/**
 * join_space: the caller joins a space, or asks to (criteria 2, 3, 7 and 8).
 * Input: slug. Returns: JSON {"status"}: 'active' when in, 'pending' while the owner decides.
 *   Asking again changes nothing and says where they are.
 * Rules: require_space_starter(); the space's age group is the caller's today (a member who turned
 *   16 keeps the under-16 spaces they were in, but can't join another, criterion 7); the spam
 *   limit take_rate_limit('space_join').
 * Errors: insufficient_privilege (hints as require_space_starter(), or 'space:age');
 *   no_data_found (hint 'space:missing'); program_limit_exceeded.
 */
create or replace function public.join_space(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  space public.spaces;
  membership public.space_members;
begin
  -- Step 1: a space the caller may know about.
  select * into space from public.spaces where spaces.slug = join_space.slug and spaces.deleted_at is null;
  if space.id is null or not public.space_card_visible(space) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  -- Step 2: already in, or already asked.
  membership := public.space_membership_of_caller(space.id);
  if membership.id is not null then
    return jsonb_build_object('status', membership.status);
  end if;
  -- Step 3: only people in the space's age group join it.
  if not public.space_may_join(space) then
    raise exception 'This space is for another age group.' using errcode = 'insufficient_privilege', hint = 'space:age';
  end if;
  perform public.take_rate_limit('space_join');
  -- Step 4: in straight away, or waiting for the owner.
  insert into public.space_members (user_id, space_id, status, joined_at)
  values (caller_id, space.id,
          case when space.joining = 'open' then 'active'::public.space_member_status else 'pending' end,
          case when space.joining = 'open' then now() end)
  returning * into membership;
  return jsonb_build_object('status', membership.status);
end;
$$;
comment on function public.join_space(text) is 'Joins a space, or asks its owner, by the age rules (S1-E8-06).';
revoke execute on function public.join_space(text) from public, anon;
grant execute on function public.join_space(text) to authenticated;

/**
 * leave_space: the caller leaves a space, or takes back their request.
 * Input: slug. Returns: nothing. A member who turned 16 who leaves an under-16 space can't come
 *   back (criterion 7).
 * Errors: check_violation (hint 'space:owner'): the owner can't leave their own space; handing it
 *   over comes with part b.
 */
create or replace function public.leave_space(slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_space_id uuid;
begin
  select spaces.id into target_space_id from public.spaces where spaces.slug = leave_space.slug;
  if exists (select 1 from public.space_members
             where space_members.space_id = target_space_id and space_members.user_id = caller_id
               and space_members.role = 'owner') then
    raise exception 'The owner can''t leave their own space.' using errcode = 'check_violation', hint = 'space:owner';
  end if;
  delete from public.space_members
  where space_members.space_id = target_space_id and space_members.user_id = caller_id;
end;
$$;
comment on function public.leave_space(text) is 'Leaves a space or takes back a request; never the owner (S1-E8-06).';
revoke execute on function public.leave_space(text) from public, anon;
grant execute on function public.leave_space(text) to authenticated;

/**
 * space_age_group_of_person: someone's age group for spaces today, from their profile.
 * Input: the user ID. Returns: as space_age_group_of_caller(), for anyone. Internal.
 */
create or replace function public.space_age_group_of_person(person_id uuid)
returns public.space_age_group
language sql
stable
security definer
set search_path = ''
as $$
  select case public.age_band_from_birth(profiles.birth_year, profiles.birth_month, profiles.age_check_result,
                (now() at time zone 'Europe/Bucharest')::date)
    when 'under_13' then 'under_16'::public.space_age_group
    when '13_to_15' then 'under_16'::public.space_age_group
    when '16_to_17' then '16_plus'::public.space_age_group
    when '18_plus' then '16_plus'::public.space_age_group
  end
  from public.profiles where profiles.id = person_id and profiles.deleted_at is null;
$$;
comment on function public.space_age_group_of_person(uuid) is 'Internal: a person''s age group for spaces today (S1-E8-06).';
revoke execute on function public.space_age_group_of_person(uuid) from public, anon, authenticated;

/**
 * space_join_requests: the requests waiting for the owner, oldest first.
 * Input: slug. Returns: JSON [{"person" (forum_person_json()), "requested_at"}]. Never a user ID.
 * Errors: owned_space_for_change()'s.
 */
create or replace function public.space_join_requests(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(space_join_requests.slug);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_members.user_id),
                       'requested_at', space_members.requested_at) order by space_members.requested_at)
    from public.space_members
    where space_members.space_id = space.id and space_members.status = 'pending'
      and public.forum_person_json(space_members.user_id) is not null), '[]'::jsonb);
end;
$$;
comment on function public.space_join_requests(text) is 'The owner''s list of requests to join, oldest first (S1-E8-06).';
revoke execute on function public.space_join_requests(text) from public, anon;
grant execute on function public.space_join_requests(text) to authenticated;

/**
 * decide_space_join_request: the owner lets someone in, or says no (criterion 8).
 * Inputs: slug; handle, the person's username; approve.
 * Returns: JSON {"outcome"}: 'approved', 'declined', or 'age_changed' when the person is no
 *   longer in the space's age group (they turned 16 while waiting), so the request goes.
 * Errors: owned_space_for_change()'s; no_data_found (hint 'request:missing').
 */
create or replace function public.decide_space_join_request(slug text, handle text, approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(decide_space_join_request.slug);
  request public.space_members;
begin
  -- Step 1: the waiting request by that username.
  select space_members.* into request from public.space_members
  join public.profiles on profiles.id = space_members.user_id
  where space_members.space_id = space.id and space_members.status = 'pending'
    and profiles.handle_skeleton = public.username_skeleton(btrim(decide_space_join_request.handle, ' @'));
  if request.id is null then
    raise exception 'There is no such request.' using errcode = 'no_data_found', hint = 'request:missing';
  end if;
  -- Step 2: a no, or a person no longer in the space's age group: the request goes.
  if not approve or public.space_age_group_of_person(request.user_id) is distinct from space.age_group then
    delete from public.space_members where space_members.id = request.id;
    return jsonb_build_object('outcome', case when approve then 'age_changed' else 'declined' end);
  end if;
  -- Step 3: a yes.
  update public.space_members set status = 'active', joined_at = now() where space_members.id = request.id;
  return jsonb_build_object('outcome', 'approved');
end;
$$;
comment on function public.decide_space_join_request(text, text, boolean) is
  'The owner lets someone into a space or says no; a person no longer in its age group is refused (S1-E8-06).';
revoke execute on function public.decide_space_join_request(text, text, boolean) from public, anon;
grant execute on function public.decide_space_join_request(text, text, boolean) to authenticated;

/* ---------- The shared reporting contract: the space branches ---------- */

/**
 * reportable_item_owner: as in FORUMS-1b, plus 'space' (S1-E8-06).
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
    when 'embed' then
      return query
        select chapter_embeds.id, chapter_embeds.user_id from public.chapter_embeds
        join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapter_embeds.id = item_reference::uuid
          and chapter_embeds.deleted_at is null
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    -- A Story Atlas item only while readers can see it, so a private one never leaks (S1-E17-34).
    when 'atlas_item' then
      return query
        select item_reference::uuid, item.owner_user_id
        from public.plan_item_row(case when is_row_id then item_reference::uuid end) as item
        where public.plan_item_is_public(item_reference::uuid);
    -- A private message only for the two people in its chat, so its existence never leaks to
    -- anyone else (S1-E9-01). Deleted ones can't be reported.
    when 'message' then
      return query
        select messages.id, messages.user_id from public.messages
        join public.conversations on conversations.id = messages.conversation_id
        where is_row_id and messages.id = item_reference::uuid
          and messages.deleted_at is null
          and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id);
    -- A forum thread or post only while readers can see it: not deleted, in a live thread and
    -- forum, so a deleted one's existence never leaks (S1-E8-02).
    when 'forum_thread' then
      return query
        select forum_threads.id, forum_threads.user_id from public.forum_threads
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_threads.id = item_reference::uuid
          and forum_threads.deleted_at is null and forums.deleted_at is null;
    when 'forum_post' then
      return query
        select forum_posts.id, forum_posts.user_id from public.forum_posts
        join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_posts.id = item_reference::uuid
          and forum_posts.deleted_at is null and forum_threads.deleted_at is null
          and forums.deleted_at is null;
    -- A space only while the reporter may see that it exists, so a hidden under-16 space never
    -- leaks to an adult through the report form (S1-E8-06).
    when 'space' then
      return query
        select spaces.id, spaces.user_id from public.spaces
        where is_row_id and spaces.id = item_reference::uuid and public.space_card_visible(spaces);
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10; atlas_item S1-E17-34; message S1-E9-01; forum_thread and forum_post S1-E8-02; space S1-E8-06).';

/**
 * reportable_item_summary: as in FORUMS-1b, and a space says its name (S1-E8-06).
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
    when 'embed' then
      select format('%s from %s in chapter %s of %s',
          case when chapter_embeds.service in ('spotify', 'apple_music') then 'Music' else 'Video' end,
          case chapter_embeds.service when 'youtube' then 'YouTube' when 'vimeo' then 'Vimeo'
            when 'loom' then 'Loom' when 'spotify' then 'Spotify' else 'Apple Music' end,
          chapters.position, stories.title)
        into summary
      from public.chapter_embeds
      join public.chapters on chapters.id = chapter_embeds.chapter_id
      join public.stories on stories.id = chapters.story_id
      where chapter_embeds.id = item_id;
    when 'atlas_item' then
      select format('%s "%s" in the world of %s',
          case item.item_kind when 'character' then 'Character' when 'relationship' then 'Relationship between'
            when 'section' then 'World section' when 'entry' then 'World entry' else 'Timeline event' end,
          item.title, stories.title)
        into summary
      from public.plan_item_row(item_id) as item
      join public.stories on stories.id = item.story_id;
    when 'message' then
      select format('Private message from @%s: %s', coalesce(profiles.handle, '…'),
          case when char_length(messages.body) > 80 then left(messages.body, 80) || '…' else messages.body end)
        into summary
      from public.messages
      left join public.profiles on profiles.id = messages.user_id
      where messages.id = item_id;
    when 'forum_thread' then
      select format('Forum thread "%s"', forum_threads.title) into summary
      from public.forum_threads where forum_threads.id = item_id;
    when 'forum_post' then
      select format('Post #%s in "%s": %s', forum_posts.post_number, forum_threads.title,
          case when char_length(forum_posts.body) > 80 then left(forum_posts.body, 80) || '…' else forum_posts.body end)
        into summary
      from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
      where forum_posts.id = item_id;
    when 'space' then
      select format('Space "%s"', spaces.name) into summary from public.spaces where spaces.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in FORUMS-1b, and a space's name, description and rules (S1-E8-06).
 */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then (select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
        'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
        'checked_at', picture_checks.checked_at) from public.picture_checks where picture_checks.id = target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    -- The reported message's words, plus it and up to 20 before it as context (S1-E9-02).
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at,
        'context', public.message_with_context(messages.id))
        from public.messages where messages.id = target.item_id)
    -- A thread's title with its first post; a post's words, when it was written and edited, and
    -- its earlier versions (S1-E8-02 criterion 4).
    when 'forum_thread' then (select jsonb_build_object('title', forum_threads.title,
        'started_at', forum_threads.created_at,
        'text', (select first_post.body from public.forum_posts as first_post
                 where first_post.thread_id = forum_threads.id and first_post.post_number = 1))
        from public.forum_threads where forum_threads.id = target.item_id)
    when 'forum_post' then (select jsonb_build_object('text', forum_posts.body, 'number', forum_posts.post_number,
        'posted_at', forum_posts.created_at, 'edited_at', forum_posts.edited_at,
        'earlier_versions', (select coalesce(jsonb_agg(jsonb_build_object('text', revisions.body,
            'title', revisions.title, 'written_at', revisions.written_at) order by revisions.written_at), '[]'::jsonb)
          from public.forum_post_revisions as revisions where revisions.post_id = forum_posts.id))
        from public.forum_posts where forum_posts.id = target.item_id)
    -- A space's name, description and rules, as its page shows them (S1-E8-06).
    when 'space' then (select jsonb_build_object('name', spaces.name, 'description', spaces.description,
        'rules', spaces.rules, 'started_at', spaces.created_at)
        from public.spaces where spaces.id = target.item_id)
  end;
$$;

/**
 * notification_item_json: as in FORUMS-1b, and a space links to its page (S1-E8-06).
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
          when 'chapter_picture' then (select '/s/' || stories.slug || '/' || chapters.code
            from public.chapters join public.stories on stories.id = chapters.story_id
            where chapters.id = picture_checks.chapter_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
      when 'embed' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapter_embeds join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id where chapter_embeds.id = cases.item_id)
      when 'atlas_item' then public.plan_item_address(cases.item_id)
      -- A chat's address differs for each of the two people, so a message links to Messages.
      when 'message' then '/messages'
      -- A thread's address, and a post's permalink (S1-E8-02).
      when 'forum_thread' then (select '/forums/' || forums.slug || '/' || forum_threads.thread_number
        from public.forum_threads join public.forums on forums.id = forum_threads.forum_id
        where forum_threads.id = cases.item_id)
      when 'forum_post' then (select '/forums/' || forums.slug || '/' || forum_threads.thread_number
          || '?post=' || forum_posts.post_number
        from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id where forum_posts.id = cases.item_id)
      when 'space' then (select '/spaces/' || spaces.slug from public.spaces where spaces.id = cases.item_id)
    end)
  from public.cases where cases.id = case_id;
$$;

/* ---------- Download my data and account deletion ---------- */

/**
 * data_export_tables: as in FORUMS-1d, plus the spaces a person started and their memberships
 * (S1-E8-06).
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
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06).';

/**
 * account_deletion_rules: as in FORUMS-1d, plus spaces: memberships and requests are deleted with
 * the account; a space the person owns stays for its members (S1-E8-06).
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
    ('username_approvals', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06).';
