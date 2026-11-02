/*
 * FORUMS-2b: space moderators and permissions (bundle FORUMS-2, part b; story S1-E8-07;
 * design/boards/Space.dc.html's "Moderators" field and "Who runs it" card).
 *
 * What it builds, by acceptance criterion:
 * 1. The owner appoints moderators and picks their powers from four (space_power):
 *    - posts: pin and lock threads in the space (the forum's own sticky and lock, S1-E8-05);
 *    - members: approve and decline requests, and remove members;
 *    - settings: change the name, description, rules, banner and who can post or join;
 *    - mail: write to every member (the sending itself comes in part c, with space notifications).
 *    A moderator must be an active member in the space's age group (S1-E8-06 criteria 2 and 3:
 *    only under-16 accounts moderate an under-16 space, only 16+ accounts a 16+ space).
 * 2. Every action by the owner, a moderator or platform staff in a space is written to
 *    space_moderation_log, which the owner and platform moderators can read. Platform staff's
 *    actions also go to the audit log, as every staff action does (architecture 1.8.1).
 * 3. Platform moderators (staff_may('moderation', 'act')) can do everything an owner can in any
 *    space, whatever the space's settings ("Platform moderators keep legal responsibility").
 *
 * Who calls it: src/features/spaces/api/spaceModeration.ts and the forums' thread moderation.
 * What it changes from FORUMS-2a: owned_space_for_change() lets platform moderators through;
 * update_space(), space_join_requests() and decide_space_join_request() take the matching power;
 * forum_thread_for_moderation() and the three thread functions take a space moderator with
 * "posts" in their own space; forum_thread_header_json() and space_viewer_json() say so.
 */

/* ---------- Powers and the log ---------- */

create type public.space_power as enum ('posts', 'members', 'settings', 'mail');
comment on type public.space_power is 'What a space moderator may do (S1-E8-07 criterion 1).';

-- A moderator holds at least one power; an owner or a plain member holds none (the owner has all).
alter table public.space_members add column powers public.space_power[] not null default '{}';
alter table public.space_members add constraint space_members_powers_only_moderators
  check ((role = 'moderator') = (cardinality(powers) > 0));
alter table public.space_members add constraint space_members_moderator_is_active
  check (role <> 'moderator' or status = 'active');
comment on column public.space_members.powers is
  'A moderator''s powers, chosen by the owner (S1-E8-07); empty for everyone else.';

create table public.space_moderation_log (
  id uuid primary key default gen_random_uuid(),
  -- Who acted: the owner, a moderator or platform staff (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  -- What happened: 'moderator_appointed', 'member_removed', 'thread_locked' and so on.
  action text not null check (char_length(action) between 1 and 60),
  -- The person it was about, if any.
  target_user_id uuid references public.profiles (id),
  -- The thread it was about, if any; the row stays when the thread goes.
  thread_id uuid references public.forum_threads (id) on delete set null,
  -- The reason given, or what changed.
  note text check (note is null or char_length(note) <= 500),
  details jsonb not null default '{}'::jsonb,
  -- True when platform staff acted (shown as "the moderation team", never by name).
  by_platform boolean not null default false,
  -- The clock, not the transaction's start, so actions in one transaction keep their order.
  created_at timestamptz not null default clock_timestamp()
);
comment on table public.space_moderation_log is
  'kind: user_action
Every action taken in a space by its owner, its moderators or platform staff; read by the owner and platform moderators (S1-E8-07 criterion 2).';
create index space_moderation_log_space on public.space_moderation_log (space_id, created_at desc);
create index space_moderation_log_actor on public.space_moderation_log (user_id);
create index space_moderation_log_target on public.space_moderation_log (target_user_id);
create trigger space_moderation_log_refuse_user_id_change
  before update on public.space_moderation_log
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.space_moderation_log enable row level security;

/**
 * Policy space_moderation_log_select_owner_or_staff: the space's owner and platform moderators
 * read its log.
 * Why: criterion 2 ("visible to the owner and platform moderators"). Moderators who aren't the
 * owner don't read it: they see their own actions on the screen where they took them.
 */
create policy space_moderation_log_select_owner_or_staff on public.space_moderation_log
  for select to authenticated
  using (
    public.staff_may('moderation', 'view')
    or exists (select 1 from public.spaces
               where spaces.id = space_moderation_log.space_id and spaces.user_id = (select auth.uid()))
  );
comment on policy space_moderation_log_select_owner_or_staff on public.space_moderation_log is
  'Allows a space''s owner and platform moderators to read its moderation log (S1-E8-07).';

-- Table privileges: read for the policy above; rows are written only by the functions below.
revoke all on public.space_moderation_log from anon, authenticated;
grant select on public.space_moderation_log to authenticated;

/* ---------- Who may act ---------- */

/**
 * space_may_act: may the caller use a power in a space?
 * Inputs: the space row; the power. Returns: true for the space's owner (every power), a
 *   moderator holding that power, or platform moderation staff (criterion 3: they override
 *   space-level settings).
 * Internal: space_for_power(), space_viewer_json(), forum_thread_for_moderation().
 */
create or replace function public.space_may_act(target public.spaces, wanted public.space_power)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.id is not null and target.deleted_at is null and (
    public.staff_may('moderation', 'act')
    or target.user_id = (select auth.uid())
    or exists (select 1 from public.space_members
               where space_members.space_id = target.id and space_members.user_id = (select auth.uid())
                 and space_members.role = 'moderator' and space_members.status = 'active'
                 and wanted = any (space_members.powers)));
$$;
comment on function public.space_may_act(public.spaces, public.space_power) is
  'Internal: whether the caller is the owner, a moderator with this power or platform moderation staff (S1-E8-07).';
revoke execute on function public.space_may_act(public.spaces, public.space_power) from public, anon, authenticated;

/**
 * space_acts_as_platform: is the caller acting as platform staff rather than as the space's
 * owner or one of its moderators? Input: the space row. Internal: log_space_action().
 */
create or replace function public.space_acts_as_platform(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_may('moderation', 'act')
    and target.user_id is distinct from (select auth.uid())
    and not exists (select 1 from public.space_members
                    where space_members.space_id = target.id and space_members.user_id = (select auth.uid())
                      and space_members.role = 'moderator');
$$;
comment on function public.space_acts_as_platform(public.spaces) is
  'Internal: whether the caller acts in a space as platform staff, not as its owner or moderator (S1-E8-07).';
revoke execute on function public.space_acts_as_platform(public.spaces) from public, anon, authenticated;

/**
 * log_space_action: writes one row of a space's moderation log (criterion 2), and an audit-log
 * row too when platform staff acted (architecture 1.8.1: every staff action is audited).
 * Inputs: the space row; the action; the person and thread it was about (null when none); a note;
 *   details (what changed).
 * Internal: every space change below.
 */
create or replace function public.log_space_action(
  target public.spaces,
  action_taken text,
  about_user_id uuid,
  about_thread_id uuid,
  note text,
  details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  by_platform boolean := public.space_acts_as_platform(target);
begin
  -- Step 1: the space's own log, which the owner reads.
  insert into public.space_moderation_log (user_id, space_id, action, target_user_id, thread_id, note, details, by_platform)
  values ((select auth.uid()), target.id, action_taken, about_user_id, about_thread_id,
          nullif(btrim(coalesce(note, '')), ''), coalesce(details, '{}'::jsonb), by_platform);
  -- Step 2: staff actions are also in the audit log.
  if by_platform then
    perform public.log_staff_action('space.' || action_taken, 'spaces', target.id::text, about_user_id,
      nullif(btrim(coalesce(note, '')), ''), null, coalesce(details, '{}'::jsonb));
  end if;
end;
$$;
comment on function public.log_space_action(public.spaces, text, uuid, uuid, text, jsonb) is
  'Internal: one row of a space''s moderation log, plus the audit log for platform staff (S1-E8-07).';
revoke execute on function public.log_space_action(public.spaces, text, uuid, uuid, text, jsonb) from public, anon, authenticated;

/**
 * space_for_power: the space a change is about, for someone who holds the power.
 * Inputs: the space's address; the power. Returns: the row, locked for the change.
 * Errors: no_data_found (hint 'space:missing'); insufficient_privilege (hint 'space:not_allowed').
 * Internal: update_space(), the requests and members functions, set_space_moderator().
 */
create or replace function public.space_for_power(target_slug text, wanted public.space_power)
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
  if space.id is null or not (public.space_card_visible(space) or public.staff_may('moderation', 'act')) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if not public.space_may_act(space, wanted) then
    raise exception 'You can''t do this in this space.' using errcode = 'insufficient_privilege', hint = 'space:not_allowed';
  end if;
  return space;
end;
$$;
comment on function public.space_for_power(text, public.space_power) is
  'Internal: a space for a change by someone holding the power (S1-E8-07).';
revoke execute on function public.space_for_power(text, public.space_power) from public, anon, authenticated;

/**
 * owned_space_for_change: as in FORUMS-2a, for the owner, and now platform moderators too
 * (criterion 3). Who calls it: set_space_moderator() (appointing is the owner's alone).
 * Errors: no_data_found (hint 'space:missing'); insufficient_privilege (hint 'space:not_owner').
 */
create or replace function public.owned_space_for_change(target_slug text)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces;
  is_platform boolean := public.staff_may('moderation', 'act');
begin
  select * into space from public.spaces
  where spaces.slug = target_slug and spaces.deleted_at is null
  for update;
  if space.id is null or not (public.space_card_visible(space) or is_platform) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if space.user_id is distinct from (select auth.uid()) and not is_platform then
    raise exception 'Only the space''s owner can do this.' using errcode = 'insufficient_privilege', hint = 'space:not_owner';
  end if;
  return space;
end;
$$;
comment on function public.owned_space_for_change(text) is
  'Internal: a space for a change by its owner or platform moderators (S1-E8-06, S1-E8-07).';
revoke execute on function public.owned_space_for_change(text) from public, anon, authenticated;

/**
 * space_member_by_handle: a space's member or request by username.
 * Inputs: the space's ID; the username, with or without "@". Returns: the row, or an empty row.
 * Internal.
 */
create or replace function public.space_member_by_handle(target_space_id uuid, handle text)
returns public.space_members
language sql
stable
security definer
set search_path = ''
as $$
  select space_members.* from public.space_members
  join public.profiles on profiles.id = space_members.user_id and profiles.deleted_at is null
  where space_members.space_id = target_space_id
    and profiles.handle_skeleton = public.username_skeleton(btrim(space_member_by_handle.handle, ' @'));
$$;
comment on function public.space_member_by_handle(uuid, text) is 'Internal: a space member or request by username (S1-E8-07).';
revoke execute on function public.space_member_by_handle(uuid, text) from public, anon, authenticated;

/* ---------- What the screens read ---------- */

/**
 * space_powers_of_caller: the powers the caller holds in a space, for the screens.
 * Input: the space row. Returns: every power for the owner and platform moderators, the
 *   moderator's own for a moderator, none for anyone else. Internal: space_viewer_json().
 */
create or replace function public.space_powers_of_caller(target public.spaces)
returns public.space_power[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(power order by power), '{}')
  from unnest(enum_range(null::public.space_power)) as power
  where public.space_may_act(target, power);
$$;
comment on function public.space_powers_of_caller(public.spaces) is 'Internal: the caller''s powers in a space (S1-E8-07).';
revoke execute on function public.space_powers_of_caller(public.spaces) from public, anon, authenticated;

/**
 * space_viewer_json: as in FORUMS-2a, plus "powers" (what the caller may do, criterion 1),
 *   "membership" 'moderator', "can_manage" for anyone holding the settings power and
 *   "can_appoint" (the owner and platform moderators) and "can_read_log" (the same).
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
      when membership.role = 'moderator' then 'moderator'
      when membership.status = 'active' then 'member'
      when membership.status = 'pending' then 'pending' end,
    'can_read', public.space_may_read(target),
    'can_join', public.space_may_join(target),
    'can_post', public.space_may_post(target),
    'can_manage', public.space_may_act(target, 'settings'),
    'can_appoint', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'act'),
    'can_read_log', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'view'),
    'powers', to_jsonb(public.space_powers_of_caller(target)))
  from (select (public.space_membership_of_caller(target.id)).*) as membership;
$$;
comment on function public.space_viewer_json(public.spaces) is
  'Internal: the caller''s place in a space and what they may do (S1-E8-06, S1-E8-07).';
revoke execute on function public.space_viewer_json(public.spaces) from public, anon, authenticated;

/**
 * space_moderators: who helps run a space and with which powers, for "Who runs it" (the board's
 *   card). Anyone who may see the space reads it.
 * Input: slug. Returns: JSON [{"person" (forum_person_json()), "powers"}], earliest appointed
 *   first; [] for a space the caller may not see. Never a user ID.
 */
create or replace function public.space_moderators(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_members.user_id),
                                               'powers', to_jsonb(space_members.powers))
                            order by space_members.joined_at), '[]'::jsonb)
  from public.spaces
  join public.space_members on space_members.space_id = spaces.id and space_members.role = 'moderator'
  where spaces.slug = space_moderators.slug and spaces.deleted_at is null
    and public.space_card_visible(spaces)
    and public.forum_person_json(space_members.user_id) is not null;
$$;
comment on function public.space_moderators(text) is 'A space''s moderators and their powers, for anyone who may see it (S1-E8-07).';
revoke execute on function public.space_moderators(text) from public;
grant execute on function public.space_moderators(text) to anon, authenticated;

/**
 * space_member_list: a space's members, for those who manage them (the members power) and the
 *   owner choosing moderators.
 * Input: slug. Returns: JSON [{"person", "role" ('owner', 'moderator' or 'member'), "powers",
 *   "joined_at"}], the owner first, then moderators, then by when they joined.
 * Errors: space_for_power()'s.
 */
create or replace function public.space_member_list(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(space_member_list.slug, 'members');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_members.user_id),
                       'role', space_members.role, 'powers', to_jsonb(space_members.powers),
                       'joined_at', space_members.joined_at)
                     order by case space_members.role when 'owner' then 0 when 'moderator' then 1 else 2 end,
                              space_members.joined_at)
    from public.space_members
    where space_members.space_id = space.id and space_members.status = 'active'
      and public.forum_person_json(space_members.user_id) is not null), '[]'::jsonb);
end;
$$;
comment on function public.space_member_list(text) is 'A space''s members, for the owner and moderators with the members power (S1-E8-07).';
revoke execute on function public.space_member_list(text) from public, anon;
grant execute on function public.space_member_list(text) to authenticated;

/**
 * space_log: a space's moderation log, newest first, 50 at a time (criterion 2).
 * Inputs: slug; skip. Returns: JSON {"entries": [{"actor" (forum_person_json(), or null when
 *   platform staff acted: "the moderation team"), "action", "target" (a person or null),
 *   "thread" ({number, title} or null), "note", "details", "created_at"}], "has_more"}.
 * Errors: no_data_found (hint 'space:missing'); insufficient_privilege (hint 'space:not_owner')
 *   for anyone but the owner and platform moderators.
 */
create or replace function public.space_log(slug text, skip integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  space public.spaces;
  page_size constant integer := 50;
begin
  -- Step 1: the space, for its owner or platform moderators only (the table's policy says the same).
  select * into space from public.spaces where spaces.slug = space_log.slug and spaces.deleted_at is null;
  if space.id is null or not (public.space_card_visible(space) or public.staff_may('moderation', 'view')) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if space.user_id is distinct from (select auth.uid()) and not public.staff_may('moderation', 'view') then
    raise exception 'Only the space''s owner can read its log.' using errcode = 'insufficient_privilege', hint = 'space:not_owner';
  end if;
  -- Step 2: one page, one row more to know whether there is another.
  return (
    with page as (
      select log.* from public.space_moderation_log as log
      where log.space_id = space.id
      order by log.created_at desc, log.id
      offset greatest(coalesce(skip, 0), 0) limit page_size + 1
    )
    select jsonb_build_object(
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'actor', case when page.by_platform then null else public.forum_person_json(page.user_id) end,
                 'action', page.action,
                 'target', public.forum_person_json(page.target_user_id),
                 'thread', (select jsonb_build_object('number', forum_threads.thread_number, 'title', forum_threads.title)
                            from public.forum_threads where forum_threads.id = page.thread_id),
                 'note', page.note,
                 'details', page.details,
                 'created_at', page.created_at) order by page.created_at desc, page.id)
        from (select * from page order by page.created_at desc, page.id limit page_size) as page), '[]'::jsonb),
      'has_more', (select count(*) > page_size from page)));
end;
$$;
comment on function public.space_log(text, integer) is
  'A space''s moderation log, for its owner and platform moderators (S1-E8-07 criterion 2).';
revoke execute on function public.space_log(text, integer) from public, anon;
grant execute on function public.space_log(text, integer) to authenticated;

/* ---------- The owner appoints moderators ---------- */

/**
 * set_space_moderator: the owner (or a platform moderator) makes a member a moderator with
 *   some powers, changes their powers, or, with no powers, makes them a plain member again
 *   (criterion 1).
 * Inputs: slug; handle, the member's username; powers.
 * Returns: JSON {"outcome"}: 'appointed', 'changed' or 'removed'.
 * Rules: the person is an active member, not the owner, and still in the space's age group
 *   (S1-E8-06: only under-16 accounts moderate an under-16 space, only 16+ accounts a 16+ one).
 * Errors: owned_space_for_change()'s; no_data_found (hint 'member:missing'); check_violation
 *   (hint 'member:owner', or 'member:age' for someone outside the age group).
 */
create or replace function public.set_space_moderator(slug text, handle text, powers public.space_power[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(set_space_moderator.slug);
  member public.space_members := public.space_member_by_handle(space.id, set_space_moderator.handle);
  chosen public.space_power[] := (select coalesce(array_agg(distinct power order by power), '{}')
                                  from unnest(coalesce(set_space_moderator.powers, '{}')) as power);
  outcome text;
begin
  -- Step 1: an active member who isn't the owner.
  if member.id is null or member.status <> 'active' then
    raise exception 'That person isn''t a member of this space.' using errcode = 'no_data_found', hint = 'member:missing';
  end if;
  if member.role = 'owner' then
    raise exception 'The owner already has every power.' using errcode = 'check_violation', hint = 'member:owner';
  end if;
  -- Step 2: a new or changed moderator must still be in the space's age group.
  if cardinality(chosen) > 0 and public.space_age_group_of_person(member.user_id) is distinct from space.age_group then
    raise exception 'This person is in another age group.' using errcode = 'check_violation', hint = 'member:age';
  end if;
  -- Step 3: the change.
  outcome := case when cardinality(chosen) = 0 then 'removed'
                  when member.role = 'moderator' then 'changed' else 'appointed' end;
  update public.space_members
  set role = (case when cardinality(chosen) = 0 then 'member' else 'moderator' end)::public.space_member_role, powers = chosen
  where space_members.id = member.id;
  -- Step 4: the log (criterion 2).
  perform public.log_space_action(space, 'moderator_' || outcome, member.user_id, null, null,
    jsonb_build_object('powers_before', to_jsonb(member.powers), 'powers_after', to_jsonb(chosen)));
  return jsonb_build_object('outcome', outcome);
end;
$$;
comment on function public.set_space_moderator(text, text, public.space_power[]) is
  'The owner appoints a space moderator, changes their powers or removes them; logged (S1-E8-07).';
revoke execute on function public.set_space_moderator(text, text, public.space_power[]) from public, anon;
grant execute on function public.set_space_moderator(text, text, public.space_power[]) to authenticated;

/* ---------- The members power ---------- */

/**
 * space_join_requests: as in FORUMS-2a, for anyone holding the members power.
 */
create or replace function public.space_join_requests(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(space_join_requests.slug, 'members');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_members.user_id),
                       'requested_at', space_members.requested_at) order by space_members.requested_at)
    from public.space_members
    where space_members.space_id = space.id and space_members.status = 'pending'
      and public.forum_person_json(space_members.user_id) is not null), '[]'::jsonb);
end;
$$;
comment on function public.space_join_requests(text) is
  'The requests to join a space, oldest first, for the owner and moderators with the members power (S1-E8-06, S1-E8-07).';

/**
 * decide_space_join_request: as in FORUMS-2a, for anyone holding the members power, and logged.
 */
create or replace function public.decide_space_join_request(slug text, handle text, approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(decide_space_join_request.slug, 'members');
  request public.space_members := public.space_member_by_handle(space.id, decide_space_join_request.handle);
  outcome text;
begin
  -- Step 1: the waiting request by that username.
  if request.id is null or request.status <> 'pending' then
    raise exception 'There is no such request.' using errcode = 'no_data_found', hint = 'request:missing';
  end if;
  -- Step 2: a no, or a person no longer in the space's age group: the request goes.
  if not approve or public.space_age_group_of_person(request.user_id) is distinct from space.age_group then
    delete from public.space_members where space_members.id = request.id;
    outcome := case when approve then 'age_changed' else 'declined' end;
  else
    -- Step 3: a yes.
    update public.space_members set status = 'active', joined_at = now() where space_members.id = request.id;
    outcome := 'approved';
  end if;
  perform public.log_space_action(space, 'request_' || outcome, request.user_id, null, null);
  return jsonb_build_object('outcome', outcome);
end;
$$;
comment on function public.decide_space_join_request(text, text, boolean) is
  'Lets someone into a space or says no, for the owner and moderators with the members power; logged (S1-E8-06, S1-E8-07).';

/**
 * remove_space_member: takes someone out of a space (the members power).
 * Inputs: slug; handle; reason (optional, kept in the log).
 * Rules: never the owner; a moderator can be removed only by the owner or platform staff, so
 *   moderators can't remove each other.
 * Errors: space_for_power()'s; no_data_found (hint 'member:missing'); check_violation (hint
 *   'member:owner'); insufficient_privilege (hint 'space:not_allowed') for a moderator removing
 *   a moderator.
 */
create or replace function public.remove_space_member(slug text, handle text, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(remove_space_member.slug, 'members');
  member public.space_members := public.space_member_by_handle(space.id, remove_space_member.handle);
begin
  if member.id is null or member.status <> 'active' then
    raise exception 'That person isn''t a member of this space.' using errcode = 'no_data_found', hint = 'member:missing';
  end if;
  if member.role = 'owner' then
    raise exception 'The owner can''t be removed.' using errcode = 'check_violation', hint = 'member:owner';
  end if;
  if member.role = 'moderator' and space.user_id is distinct from (select auth.uid())
     and not public.staff_may('moderation', 'act') then
    raise exception 'Only the owner can remove a moderator.' using errcode = 'insufficient_privilege', hint = 'space:not_allowed';
  end if;
  if char_length(btrim(coalesce(reason, ''))) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  delete from public.space_members where space_members.id = member.id;
  perform public.log_space_action(space, 'member_removed', member.user_id, null, reason);
end;
$$;
comment on function public.remove_space_member(text, text, text) is
  'Takes a member out of a space, for the owner and moderators with the members power; logged (S1-E8-07).';
revoke execute on function public.remove_space_member(text, text, text) from public, anon;
grant execute on function public.remove_space_member(text, text, text) to authenticated;

/* ---------- The settings power ---------- */

/**
 * update_space: as in FORUMS-2a, for anyone holding the settings power, and logged with the
 * settings before and after.
 */
create or replace function public.update_space(
  slug text,
  name text,
  description text,
  rules text default '',
  posting public.space_posting default null,
  joining public.space_joining default null,
  readers public.space_readers default null,
  banner public.space_banner default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(update_space.slug, 'settings');
  before_change public.spaces := space;
  clean_name text := public.check_space_text(name, 'name');
begin
  -- Step 1: a new name is still only once.
  if exists (select 1 from public.spaces
             where spaces.name_key = public.space_name_key(clean_name) and spaces.deleted_at is null
               and spaces.id <> space.id) then
    raise exception 'Another space has this name.' using errcode = 'check_violation', hint = 'name:taken';
  end if;
  -- Step 2: the change; a 16+ space stays read by everybody (S1-E8-06 criterion 5).
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
  -- Step 3: the log, with what changed.
  perform public.log_space_action(space, 'settings_changed', null, null, null, jsonb_build_object(
    'before', jsonb_build_object('name', before_change.name, 'posting', before_change.posting,
                                 'joining', before_change.joining, 'readers', before_change.readers,
                                 'banner', before_change.banner),
    'after', jsonb_build_object('name', space.name, 'posting', space.posting, 'joining', space.joining,
                                'readers', space.readers, 'banner', space.banner)));
  return public.space_json(space);
end;
$$;
comment on function public.update_space(text, text, text, text, public.space_posting, public.space_joining, public.space_readers, public.space_banner) is
  'Changes a space''s name, description, rules and settings, for the owner and moderators with the settings power; logged (S1-E8-06, S1-E8-07).';

/* ---------- The posts power: pin and lock threads in the space ---------- */

/**
 * forum_thread_for_moderation: as in FORUMS-1e, and now also for a space moderator with the
 *   posts power (or the space's owner) on a thread in their space (criterion 1).
 * Errors: as in FORUMS-1e.
 */
create or replace function public.forum_thread_for_moderation(thread_number bigint, reason text)
returns public.forum_threads
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads;
  space public.spaces;
begin
  -- Step 1: the live thread, locked for the change.
  select * into thread from public.forum_threads
  where forum_threads.thread_number = forum_thread_for_moderation.thread_number and forum_threads.deleted_at is null
  for update;
  space := public.space_of_forum(thread.forum_id);
  -- Step 2: moderation staff, or someone with the posts power in the thread's space.
  if not (public.staff_may('moderation', 'act') or (space.id is not null and public.space_may_act(space, 'posts'))) then
    raise exception 'Only moderators can do that.' using errcode = 'insufficient_privilege';
  end if;
  if thread.id is null then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  -- Step 3: every change needs a reason (architecture 1.8.4).
  if reason is null or btrim(reason) = '' then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(btrim(reason)) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  return thread;
end;
$$;
comment on function public.forum_thread_for_moderation(bigint, text) is
  'Internal: a live thread for moderation staff, or a space moderator with the posts power, to change (S1-E8-05, S1-E8-07).';
revoke execute on function public.forum_thread_for_moderation(bigint, text) from public, anon, authenticated;

/**
 * log_thread_moderation: writes the record of a pin or lock: the space's log for a thread in a
 *   space (and the audit log too when staff acted), the audit log for a thread in the main forums.
 * Inputs: the thread before the change; the action ('made_sticky', 'locked'…); the reason; the
 *   values before and after. Internal: the three functions below.
 */
create or replace function public.log_thread_moderation(
  thread public.forum_threads,
  action_taken text,
  reason text,
  values_before jsonb,
  values_after jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_of_forum(thread.forum_id);
begin
  if space.id is not null then
    perform public.log_space_action(space, 'thread_' || action_taken, thread.user_id, thread.id, btrim(reason),
      jsonb_build_object('before', values_before, 'after', values_after));
  else
    perform public.log_staff_action('forum_thread.' || action_taken, 'forum_threads', thread.id::text,
      thread.user_id, btrim(reason), values_before, values_after);
  end if;
end;
$$;
comment on function public.log_thread_moderation(public.forum_threads, text, text, jsonb, jsonb) is
  'Internal: logs a pin or lock in the space''s log or the audit log (S1-E8-05, S1-E8-07).';
revoke execute on function public.log_thread_moderation(public.forum_threads, text, text, jsonb, jsonb) from public, anon, authenticated;

/**
 * admin_set_forum_thread_sticky: as in FORUMS-1e; also for a space moderator with the posts power.
 */
create or replace function public.admin_set_forum_thread_sticky(thread_number bigint, is_sticky boolean, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
begin
  update public.forum_threads set is_sticky = admin_set_forum_thread_sticky.is_sticky where forum_threads.id = thread.id;
  perform public.log_thread_moderation(thread,
    case when is_sticky then 'made_sticky' else 'sticky_removed' end, reason,
    jsonb_build_object('is_sticky', thread.is_sticky), jsonb_build_object('is_sticky', is_sticky));
end;
$$;

/**
 * admin_lock_forum_thread: as in FORUMS-1e; also for a space moderator with the posts power.
 */
create or replace function public.admin_lock_forum_thread(thread_number bigint, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
begin
  update public.forum_threads
  set locked_at = now(), locked_by_user_id = (select auth.uid()), lock_reason = btrim(reason)
  where forum_threads.id = thread.id;
  perform public.log_thread_moderation(thread, 'locked', reason,
    jsonb_build_object('locked_at', thread.locked_at, 'lock_reason', thread.lock_reason),
    jsonb_build_object('locked_at', now(), 'lock_reason', btrim(reason)));
end;
$$;

/**
 * admin_unlock_forum_thread: as in FORUMS-1e; also for a space moderator with the posts power.
 */
create or replace function public.admin_unlock_forum_thread(thread_number bigint, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
begin
  update public.forum_threads set locked_at = null, locked_by_user_id = null, lock_reason = null
  where forum_threads.id = thread.id;
  perform public.log_thread_moderation(thread, 'unlocked', reason,
    jsonb_build_object('locked_at', thread.locked_at, 'lock_reason', thread.lock_reason),
    jsonb_build_object('locked_at', null, 'lock_reason', null));
end;
$$;

/**
 * forum_thread_header_json: as in FORUMS-2a; "can_moderate" is also true for someone holding the
 * posts power in the thread's space.
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
    'can_moderate', (select auth.uid()) is not null and (
                      public.staff_may('moderation', 'act')
                      or coalesce((select public.space_may_act(space, 'posts') from public.space_of_forum(target.forum_id) as space
                                   where space.id is not null), false)));
$$;

/* ---------- Leaving: a moderator who leaves stops being one ---------- */

-- leave_space() deletes the membership row, so a moderator's powers go with it; nothing to change.

/* ---------- Download my data and account deletion ---------- */

/**
 * data_export_tables: as in FORUMS-2a, plus the moderation log of a space: the actions a person took
 * as a space moderator (S1-E8-07).
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
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07).'; 

/**
 * account_deletion_rules: as in FORUMS-2a, plus the moderation log of a space: a moderator's
 * actions stay in the log while the space exists, shown as a deleted account (S1-E8-07).
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
    ('username_approvals', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07).';
