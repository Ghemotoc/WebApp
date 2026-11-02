/*
 * Migration: private class spaces and their invite codes (bundle CLASSES, part a; story S1-E8-11,
 * the story's own split 11a: private visibility and invite codes).
 *
 * What it adds:
 *   spaces.kind          'open' (every space so far, S1-E8-06) or 'class': a private space a
 *                        teacher runs for one class (criterion 3). A class space is read and
 *                        posted in by its members only, never listed, searched or joinable
 *                        without the teacher's code.
 *   create_class_space() a teacher (an adult with the Teacher badge, S1-E2-11) starts one
 *                        (criterion 1). The "What kind of space?" question on the form comes with
 *                        part b; this part builds the database and the invite card.
 *   Invite codes         (criterion 4) class-space rows in the shared invites table (S1-E2-01,
 *                        S1-E11-17), stored hashed like every invite: make_class_invite() shows a
 *                        new code once and ends the old one ("reset"), end_class_invite() stops it,
 *                        class_invite() says how long it lasts and how many used it. The teacher
 *                        sets how many days it works and how many it admits.
 *   Joining              class_invite_preview() tells a signed-in person (or a visitor) which class
 *                        a code is for; join_class_space() takes one place and makes them a member.
 *   The ages (criterion 5; Q26, 17 Oct 2026): a class space is the one space where students of any
 *     age and the teacher are together. It has no age group rule: anyone with the code joins, and
 *     a member reads and posts only once the account gate lets them write (is_active_member():
 *     email confirmed, age check passed and, for under-16s, a parent's consent).
 *   Moderation (criterion 7): the teacher and their space moderators act as in S1-E8-07, logged;
 *     platform moderators act in any class space; reports go to the normal queue (unchanged).
 *
 * Proposals (in the pull request): codes are shown once and only their hash is kept, as for every
 * invite, so a teacher who lost the code makes a new one (which ends the old one); a code works
 * for 1 to 365 days (30 by default) and admits 1 to 200 people (40 by default).
 * Who calls it: src/features/spaces/ (api/classSpaces.ts). Tests:
 *   supabase/tests/database/232-class-spaces.test.sql, e2e/class-spaces.spec.ts.
 */

/* ---------- The kind of space ---------- */

alter table public.spaces add column kind public.space_kind not null default 'open';
comment on column public.spaces.kind is
  'open (S1-E8-06) or class: private, members only, joined with the teacher''s invite code (S1-E8-11).';

-- A class space is always members-only for reading and posting (criterion 3). The 16+ rule from
-- S1-E8-06 (anyone reads a 16+ space) applies to open spaces only.
alter table public.spaces drop constraint spaces_16_plus_read_by_everybody;
alter table public.spaces add constraint spaces_16_plus_read_by_everybody
  check (kind = 'class' or age_group = 'under_16' or readers = 'everybody');
alter table public.spaces add constraint spaces_class_is_private
  check (kind = 'open' or (readers = 'members' and posting = 'members'));

-- Invites name their space since S1-E2-01; spaces exist now, so the link is checked (S1-E2-01's
-- note: "spaces arrive with S1-E8, which adds the foreign key").
alter table public.invites
  add constraint invites_space_id_fkey foreign key (space_id) references public.spaces (id) on delete cascade;
create index invites_space on public.invites (space_id) where space_id is not null;

/* ---------- Who reads, sees, joins and posts ---------- */

/**
 * space_is_in_class: whether the caller holds an active place in a class space, whatever the
 * account gate says. Input: the space row. Returns: true for the owner and members. Internal:
 * space_card_visible(), space_may_read(), space_viewer_json().
 */
create or replace function public.space_is_in_class(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.kind = 'class' and public.space_is_member(target.id);
$$;
comment on function public.space_is_in_class(public.spaces) is
  'Internal: whether the caller is the owner or a member of a class space (S1-E8-11).';
revoke execute on function public.space_is_in_class(public.spaces) from public, anon, authenticated;

/**
 * space_may_read: as in FORUMS-2a, and a class space is read only by moderation staff, its owner,
 * and members whose account is fully active (S1-E8-11 criteria 3 and 5). A member still waiting
 * for their age check or a parent's consent sees the space's card but not its threads.
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
        and target.kind = 'open'
        and (target.age_group = '16_plus' or target.readers = 'everybody' or public.space_is_member(target.id)))
    -- S1-E8-11: a class space, only for its members once their account is fully active.
    or (not public.is_moderated_away('space', target.id)
        and public.space_is_in_class(target)
        and public.is_active_member()));
$$;

/**
 * space_card_visible: as in FORUMS-2a, and a class space's card shows only to those who may read
 * it and to its own members (so a member waiting for their age check sees why they can't read
 * yet). Nobody else learns that a class space exists: no list, search or page (criterion 3).
 */
create or replace function public.space_card_visible(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.space_may_read(target)
    or (target.id is not null and target.deleted_at is null and target.kind = 'class'
        and not public.is_moderated_away('space', target.id)
        and public.space_is_in_class(target))
    or (target.id is not null and target.deleted_at is null and target.kind = 'open'
        and not public.is_moderated_away('space', target.id)
        and not public.is_blocked_with(target.user_id)
        and target.age_group = 'under_16'
        and public.space_age_group_of_caller() = 'under_16');
$$;

/**
 * space_may_join: as in FORUMS-2a, for open spaces only: a class space is joined with its invite
 * code (join_class_space()), never with "Join" (criterion 4).
 */
create or replace function public.space_may_join(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and target.kind = 'open'
    and public.space_card_visible(target)
    and public.is_active_member()
    and public.space_age_group_of_caller() = target.age_group
    and (public.space_membership_of_caller(target.id)).id is null;
$$;

/**
 * space_may_post: as in FORUMS-2a, and in a class space any member posts once their account is
 * fully active, whatever their age (criterion 5: never split at 16).
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
         or (target.kind = 'open' and target.posting = 'anyone'
             and public.space_age_group_of_caller() = target.age_group));
$$;

/* ---------- What the screens get ---------- */

/**
 * space_viewer_json: as in FORUMS-2b, plus "can_invite" (the class's invite card: the owner,
 *   moderators with the members power and platform moderators) and "waits_for_account" (a class
 *   member who can't read yet, because the account gate doesn't let them write).
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
    'can_invite', target.kind = 'class' and public.space_may_act(target, 'members'),
    'waits_for_account', public.space_is_in_class(target) and not public.space_may_read(target),
    'powers', to_jsonb(public.space_powers_of_caller(target)))
  from (select (public.space_membership_of_caller(target.id)).*) as membership;
$$;

/**
 * space_json: as in FORUMS-2c, plus "kind" ('open' or 'class'). A class space has no age group
 *   for the screens: it is for the people in the room (criterion 5).
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
    'kind', target.kind,
    'description', target.description,
    'rules', target.rules,
    'age_group', case when target.kind = 'open'
                        and (target.age_group = public.space_age_group_of_caller()
                             or public.space_is_member(target.id) or public.staff_may('moderation', 'view'))
                      then target.age_group end,
    'readers', target.readers,
    'posting', target.posting,
    'joining', target.joining,
    'banner', target.banner,
    'banner_picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                       where picture_checks.id = target.banner_picture_id
                         and picture_checks.deleted_at is null),
    'owner', public.forum_person_json(target.user_id),
    'member_count', (select count(*)::integer from public.space_members
                     where space_members.space_id = target.id and space_members.status = 'active'),
    'thread_count', (select count(*)::integer from public.forum_threads
                     where forum_threads.forum_id = public.space_forum_id(target.id) and forum_threads.deleted_at is null),
    'latest_activity_at', public.space_latest_activity(target),
    'created_at', target.created_at,
    'viewer', public.space_viewer_json(target));
$$;

/* ---------- Starting a class space ---------- */

/**
 * create_class_space: a teacher starts a private class space and becomes its owner (criterion 1).
 * Inputs: name, description, rules (one a line, may be empty), banner (plum, night, forest, gold).
 * Returns: JSON {"slug"} for the new space's address.
 * Rules: require_space_starter() (signed in, the account gate); only an adult with the Teacher
 *   badge (S1-E2-11: profiles.teacher_badge_since); the same spam limit and unique name as any
 *   space. A class space reads and posts for members only and is joined only by code.
 * Errors: insufficient_privilege (require_space_starter()'s hints, or 'space:not_teacher');
 *   program_limit_exceeded (hint "wait_minutes:n"); check_violation (check_space_text()'s hints,
 *   or 'name:taken').
 */
create or replace function public.create_class_space(
  name text,
  description text,
  rules text default '',
  banner public.space_banner default 'plum'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  clean_name text := public.check_space_text(name, 'name');
  new_space public.spaces;
begin
  -- Step 1: only an adult teacher with the badge (criterion 1; S1-E2-11 grants it to adults only).
  if public.age_band() is distinct from '18_plus'
     or (select profiles.teacher_badge_since from public.profiles where profiles.id = caller_id) is null then
    raise exception 'Only teachers can start a class space.' using errcode = 'insufficient_privilege', hint = 'space:not_teacher';
  end if;
  -- Step 2: the spam limit, then the name only once.
  perform public.take_rate_limit('space_create');
  if exists (select 1 from public.spaces
             where spaces.name_key = public.space_name_key(clean_name) and spaces.deleted_at is null) then
    raise exception 'Another space has this name.' using errcode = 'check_violation', hint = 'name:taken';
  end if;
  -- Step 3: the space, members only for reading and posting. The age group is the teacher's and
  -- never used for a class: the people in the room decide who is in it (criterion 5).
  insert into public.spaces (user_id, slug, name, name_key, description, rules, age_group, readers,
                             posting, joining, banner, kind)
  values (caller_id, public.space_slug_for(clean_name), clean_name, public.space_name_key(clean_name),
          public.check_space_text(description, 'description'), public.check_space_text(rules, 'rules'),
          '16_plus', 'members', 'members', 'approve', coalesce(create_class_space.banner, 'plum'), 'class')
  returning * into new_space;
  -- Step 4: its hidden forum and the teacher as its first member, as for any space.
  insert into public.forums (slug, space_id) values ('space-' || new_space.slug, new_space.id);
  perform public.write_space_forum_names(new_space.id, new_space.name);
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values (caller_id, new_space.id, 'owner', 'active', now());
  return jsonb_build_object('slug', new_space.slug);
end;
$$;
comment on function public.create_class_space(text, text, text, public.space_banner) is
  'Starts a private class space for a teacher with the badge; joined by invite code only (S1-E8-11).';
revoke execute on function public.create_class_space(text, text, text, public.space_banner) from public, anon;
grant execute on function public.create_class_space(text, text, text, public.space_banner) to authenticated;

/**
 * join_space: as in FORUMS-2a, and a class space can't be joined this way: it says to use the
 * teacher's code (hint 'space:class').
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
  -- Step 3 (S1-E8-11): a class space takes its teacher's code instead.
  if space.kind = 'class' then
    raise exception 'Join a class with your teacher''s code.' using errcode = 'insufficient_privilege', hint = 'space:class';
  end if;
  -- Step 4: only people in the space's age group join it.
  if not public.space_may_join(space) then
    raise exception 'This space is for another age group.' using errcode = 'insufficient_privilege', hint = 'space:age';
  end if;
  perform public.take_rate_limit('space_join');
  -- Step 5: in straight away, or waiting for the owner.
  insert into public.space_members (user_id, space_id, status, joined_at)
  values (caller_id, space.id,
          case when space.joining = 'open' then 'active'::public.space_member_status else 'pending' end,
          case when space.joining = 'open' then now() end)
  returning * into membership;
  return jsonb_build_object('status', membership.status);
end;
$$;

/* ---------- Invite codes (criterion 4) ---------- */

/**
 * class_space_for_invites: the class space an invite change is about, for someone who may manage
 *   its members (the teacher, a space moderator with the members power, platform moderators).
 * Input: the space's address. Returns: the row, locked for the change.
 * Errors: as space_for_power(); check_violation (hint 'space:not_class') for an open space.
 * Internal: make_class_invite(), end_class_invite(), class_invite().
 */
create or replace function public.class_space_for_invites(target_slug text)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(target_slug, 'members');
begin
  if space.kind <> 'class' then
    raise exception 'Only a class space has invite codes.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  return space;
end;
$$;
comment on function public.class_space_for_invites(text) is
  'Internal: a class space for an invite change, for whoever manages its members (S1-E8-11).';
revoke execute on function public.class_space_for_invites(text) from public, anon, authenticated;

/**
 * end_live_class_invites: stops every code of a class space that still works. Input: the space's
 *   ID. Returns: how many it stopped. Internal: make_class_invite(), end_class_invite().
 */
create or replace function public.end_live_class_invites(target_space_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  stopped integer;
begin
  update public.invites set revoked_at = now()
  where invites.space_id = target_space_id and invites.purpose = 'class_space'
    and invites.revoked_at is null and invites.expires_at > now();
  get diagnostics stopped = row_count;
  return stopped;
end;
$$;
comment on function public.end_live_class_invites(uuid) is 'Internal: stops a class space''s working codes (S1-E8-11).';
revoke execute on function public.end_live_class_invites(uuid) from public, anon, authenticated;

/**
 * make_class_invite: a new invite code for a class space; the old one stops at once ("reset",
 *   criterion 4).
 * Inputs: slug; valid_days (1 to 365, 30 by default: the period the teacher sets); admits (1 to
 *   200, 40 by default: how many people may join with it).
 * Returns: JSON {"code" (shown once: only its hash is kept), "expires_at", "admits"}.
 * Errors: as class_space_for_invites(); check_violation (hint 'invite:days' or 'invite:admits').
 * Logged in the space's log as invite_made (and the audit log when staff made it).
 */
create or replace function public.make_class_invite(slug text, valid_days integer default 30, admits integer default 40)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.class_space_for_invites(slug);
  new_code text := public.generate_invite_code();
  new_invite public.invites;
begin
  -- Step 1: the limits (proposals, see the header).
  if valid_days is null or valid_days not between 1 and 365 then
    raise exception 'A code works for 1 to 365 days.' using errcode = 'check_violation', hint = 'invite:days';
  end if;
  if admits is null or admits not between 1 and 200 then
    raise exception 'A code admits 1 to 200 people.' using errcode = 'check_violation', hint = 'invite:admits';
  end if;
  -- Step 2: the old code stops, and the new one is stored only as its hash.
  perform public.end_live_class_invites(space.id);
  insert into public.invites (user_id, purpose, space_id, code_hash, max_uses, expires_at)
  values ((select auth.uid()), 'class_space', space.id, public.invite_code_hash(new_code), admits,
          now() + make_interval(days => valid_days))
  returning * into new_invite;
  -- Step 3: the space's log, then the code, this once.
  perform public.log_space_action(space, 'invite_made', null, null, null,
    jsonb_build_object('admits', admits, 'expires_at', new_invite.expires_at));
  return jsonb_build_object('code', new_code, 'expires_at', new_invite.expires_at, 'admits', admits);
end;
$$;
comment on function public.make_class_invite(text, integer, integer) is
  'A new class invite code, shown once; the old one stops; logged (S1-E8-11).';
revoke execute on function public.make_class_invite(text, integer, integer) from public, anon;
grant execute on function public.make_class_invite(text, integer, integer) to authenticated;

/**
 * end_class_invite: stops a class space's code now, so nobody else can join with it.
 * Input: slug. Returns: true when a working code was stopped, false when there was none.
 * Errors: as class_space_for_invites(). Logged as invite_ended when a code stopped.
 */
create or replace function public.end_class_invite(slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.class_space_for_invites(slug);
begin
  if public.end_live_class_invites(space.id) = 0 then
    return false;
  end if;
  perform public.log_space_action(space, 'invite_ended', null, null, null, '{}'::jsonb);
  return true;
end;
$$;
comment on function public.end_class_invite(text) is 'Stops a class space''s invite code now; logged (S1-E8-11).';
revoke execute on function public.end_class_invite(text) from public, anon;
grant execute on function public.end_class_invite(text) to authenticated;

/**
 * class_invite: the class's working code, for its invite card: never the code itself.
 * Input: slug. Returns: JSON {"expires_at", "admits", "used", "made_at"}, or null when no code
 *   works now (none made, ended, expired or used up).
 * Errors: as class_space_for_invites().
 */
create or replace function public.class_invite(slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  space public.spaces;
begin
  select * into space from public.spaces where spaces.slug = class_invite.slug and spaces.deleted_at is null;
  if space.id is null or not (public.space_card_visible(space) or public.staff_may('moderation', 'act')) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if space.kind <> 'class' then
    raise exception 'Only a class space has invite codes.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  if not public.space_may_act(space, 'members') then
    raise exception 'You can''t do this in this space.' using errcode = 'insufficient_privilege', hint = 'space:not_allowed';
  end if;
  return (select jsonb_build_object('expires_at', invites.expires_at, 'admits', invites.max_uses,
                                    'used', invites.use_count, 'made_at', invites.created_at)
          from public.invites
          where invites.space_id = space.id and invites.purpose = 'class_space'
            and invites.revoked_at is null and invites.expires_at > now()
            and invites.use_count < invites.max_uses
          order by invites.created_at desc
          limit 1);
end;
$$;
comment on function public.class_invite(text) is
  'How long the class''s code works and how many used it; never the code (S1-E8-11).';
revoke execute on function public.class_invite(text) from public, anon;
grant execute on function public.class_invite(text) to authenticated;

/**
 * class_invite_row: the invite a code belongs to, if it still works. Input: the code as typed.
 * Returns: the row, or an empty row. Internal: class_invite_preview(), join_class_space().
 */
create or replace function public.class_invite_row(code text)
returns public.invites
language sql
stable
security definer
set search_path = ''
as $$
  select invites.* from public.invites
  join public.spaces on spaces.id = invites.space_id and spaces.deleted_at is null
  where invites.code_hash = public.invite_code_hash(code) and invites.purpose = 'class_space';
$$;
comment on function public.class_invite_row(text) is 'Internal: the class invite a code belongs to (S1-E8-11).';
revoke execute on function public.class_invite_row(text) from public, anon, authenticated;

/**
 * class_invite_preview: what a code is for, before joining (the join page).
 * Input: the code as typed or from the link. Returns: JSON {"status": 'valid', 'ended' or
 *   'unknown'}, plus {"space": {"slug", "name"}} only while the code works. Never who made it or
 *   how many places are left.
 * Who may call it: anyone, signed out included (the page says to log in first).
 */
create or replace function public.class_invite_preview(code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when found.id is null then jsonb_build_object('status', 'unknown')
    when found.revoked_at is not null or found.expires_at <= now() or found.use_count >= found.max_uses
         or public.is_moderated_away('space', found.space_id)
      then jsonb_build_object('status', 'ended')
    else jsonb_build_object('status', 'valid', 'space',
           (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
            from public.spaces where spaces.id = found.space_id))
  end
  from (select (public.class_invite_row(code)).*) as found;
$$;
comment on function public.class_invite_preview(text) is
  'valid (with the class''s name), ended or unknown for a class invite code (S1-E8-11).';
revoke execute on function public.class_invite_preview(text) from public;
grant execute on function public.class_invite_preview(text) to anon, authenticated;

/**
 * join_class_space: joins a class with its invite code (criteria 4 and 5).
 * Input: the code. Returns: JSON {"slug", "can_read"}: can_read is false while the account gate
 *   doesn't let them write yet (age check or a parent's consent), so the page can say why.
 * Rules: signed in (any age: a class space is never split at 16); the spam limit
 *   take_rate_limit('space_join'); one place taken in one statement, so two people can never
 *   both take the last one. Already a member: nothing changes. Logged as member_joined.
 * Errors: insufficient_privilege (hint 'signed_out'); check_violation (hint 'invite:ended') for an
 *   unknown, ended, expired or used-up code, or a space staff hid or removed.
 */
create or replace function public.join_class_space(code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  invite public.invites := public.class_invite_row(code);
  space public.spaces;
begin
  -- Step 1: signed in, and a code we know.
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  select * into space from public.spaces where spaces.id = invite.space_id;
  if invite.id is null or space.id is null or public.is_moderated_away('space', space.id) then
    raise exception 'This code doesn''t work any more.' using errcode = 'check_violation', hint = 'invite:ended';
  end if;
  -- Step 2: already in the class: nothing to take.
  if public.space_is_member(space.id) then
    return jsonb_build_object('slug', space.slug, 'can_read', public.space_may_read(space));
  end if;
  -- Step 3: one place, counted and checked in one statement.
  perform public.take_rate_limit('space_join');
  update public.invites set use_count = use_count + 1
  where invites.id = invite.id and invites.revoked_at is null
    and invites.expires_at > now() and invites.use_count < invites.max_uses;
  if not found then
    raise exception 'This code doesn''t work any more.' using errcode = 'check_violation', hint = 'invite:ended';
  end if;
  -- Step 4: a member straight away (a request waiting from before becomes a place), then the log.
  insert into public.space_members (user_id, space_id, status, joined_at)
  values (caller_id, space.id, 'active', now())
  on conflict (space_id, user_id) do update set status = 'active', joined_at = now();
  perform public.log_space_action(space, 'member_joined', caller_id, null, null, '{}'::jsonb);
  return jsonb_build_object('slug', space.slug, 'can_read', public.space_may_read(space));
end;
$$;
comment on function public.join_class_space(text) is
  'Joins a class space with its invite code, any age; reads once the account is active (S1-E8-11).';
revoke execute on function public.join_class_space(text) from public, anon;
grant execute on function public.join_class_space(text) to authenticated;
