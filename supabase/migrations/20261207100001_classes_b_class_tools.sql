/*
 * Migration: class space tools (bundle CLASSES, part b; story S1-E8-11, the rest of the story's
 * own split 11b: the Class space option and teacher tools).
 *
 * What it adds:
 *   spaces.locks_at         when a class space locks (criterion 8): nobody posts, edits a post,
 *                           joins or is invited any more, and every member keeps reading it for as
 *                           long as their own account exists (Q69, 16 Oct 2026). A new class locks
 *                           at the end of the school year: the next 1 July, 00:00 Romanian time (a
 *                           proposal; the teacher changes the date, locks it now or unlocks it).
 *   space_is_locked()       the one answer every write rule asks.
 *   set_class_lock()        the teacher (or whoever holds the settings power) sets the date, locks
 *                           now or unlocks; logged in the space's log.
 *   class_waiting_members() the teacher's list of members who joined but can't read yet, and why
 *                           (the age check, a parent's consent), as on board ClassSpace.
 *   Redefined to respect the lock: space_may_post(), refuse_space_writer(), the invite functions
 *     (class_space_for_invites(), class_invite_preview(), join_class_space()) and space_json()
 *     (now with locks_at and is_locked). create_class_space() sets the first lock date.
 *   forum_posts_refuse_locked_edit: a trigger that keeps posts in a locked class as they are.
 *
 * Reading stays as it was: space_may_read() never asks the lock, so members read for life.
 * Who calls it: src/features/spaces/ (api/classSpaces.ts). Tests:
 *   supabase/tests/database/233-class-tools.test.sql, e2e/class-tools.spec.ts.
 */

/* ---------- The lock ---------- */

alter table public.spaces add column locks_at timestamptz;
comment on column public.spaces.locks_at is
  'When a class space locks (no posts, joins or invites; members still read). Null: no date set. Open spaces never lock (S1-E8-11).';
alter table public.spaces add constraint spaces_only_classes_lock check (kind = 'class' or locks_at is null);

/**
 * next_class_lock_at: the end of the school year for a new class: the next 1 July at 00:00
 *   Romanian time (a proposal: Romanian school years end in June).
 * Returns: a time in the future. Internal: create_class_space().
 */
create or replace function public.next_class_lock_at()
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Bucharest')::date;
  lock_year integer := extract(year from today)::integer;
begin
  -- From 1 July onwards, the next school year's end is a year later.
  if today >= make_date(lock_year, 7, 1) then
    lock_year := lock_year + 1;
  end if;
  return make_timestamptz(lock_year, 7, 1, 0, 0, 0, 'Europe/Bucharest');
end;
$$;
comment on function public.next_class_lock_at() is
  'Internal: the next 1 July, 00:00 Romanian time, when a new class space locks (S1-E8-11).';
revoke execute on function public.next_class_lock_at() from public, anon, authenticated;

/**
 * space_is_locked: whether a class space has locked (criterion 8).
 * Input: the space row. Returns: true once locks_at has passed; always false for an open space.
 * Used by every write rule below; never by reading.
 */
create or replace function public.space_is_locked(target public.spaces)
returns boolean
language sql
stable
set search_path = ''
as $$
  select target.kind = 'class' and target.locks_at is not null and target.locks_at <= now();
$$;
comment on function public.space_is_locked(public.spaces) is
  'True once a class space''s lock time has passed: no posts, joins or invites (S1-E8-11).';
revoke execute on function public.space_is_locked(public.spaces) from public, anon, authenticated;

/* ---------- The rules, now asking the lock ---------- */

/**
 * space_may_post: as in CLASSES-a, and nobody posts in a locked class (criterion 8).
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
    and not public.space_is_locked(target)
    and (public.space_is_member(target.id)
         or (target.kind = 'open' and target.posting = 'anyone'
             and public.space_age_group_of_caller() = target.age_group));
$$;

/**
 * refuse_space_writer: as in FORUMS-2a, and a locked class refuses every new thread and post with
 * hint 'space:locked' (criterion 8).
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
  -- Step 3: a locked class takes no posts (criterion 8), whoever writes.
  if public.space_is_locked(space) then
    raise exception 'This class is locked.' using errcode = 'insufficient_privilege', hint = 'space:locked';
  end if;
  -- Step 4: say whether they are waiting for the owner, or whether joining would help.
  if (public.space_membership_of_caller(space.id)).status = 'pending' then
    raise exception 'The owner hasn''t let you in yet.' using errcode = 'insufficient_privilege', hint = 'space:pending';
  end if;
  if public.space_may_join(space) then
    raise exception 'Join this space to post here.' using errcode = 'insufficient_privilege', hint = 'space:join';
  end if;
  raise exception 'This space doesn''t take posts from your account.' using errcode = 'insufficient_privilege', hint = 'space:age';
end;
$$;
/**
 * refuse_locked_space_edit: keeps posts in a locked class as they are: nobody changes the words
 * of a post there (criterion 8). Moderators can still hide or remove one (other columns).
 * Trigger: before update of body on forum_posts. Errors: insufficient_privilege, hint 'space:locked'.
 */
create or replace function public.refuse_locked_space_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces;
begin
  -- Step 1: the space of the post's thread, if it is in one.
  space := public.space_of_forum((select forum_threads.forum_id from public.forum_threads
                                  where forum_threads.id = new.thread_id));
  -- Step 2: only a locked class refuses; everywhere else nothing changes.
  if space.id is not null and public.space_is_locked(space) then
    raise exception 'This class is locked.' using errcode = 'insufficient_privilege', hint = 'space:locked';
  end if;
  return new;
end;
$$;
comment on function public.refuse_locked_space_edit() is
  'Trigger: no post''s words change in a locked class space (S1-E8-11).';
revoke execute on function public.refuse_locked_space_edit() from public, anon, authenticated;

create trigger forum_posts_refuse_locked_edit
  before update of body on public.forum_posts
  for each row when (new.body is distinct from old.body)
  execute function public.refuse_locked_space_edit();

/**
 * class_space_for_invites: as in CLASSES-a, and a locked class makes no codes (hint
 * 'space:locked', criterion 8).
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
  -- A locked class takes nobody new, so it makes no codes (criterion 8).
  if public.space_is_locked(space) then
    raise exception 'This class is locked.' using errcode = 'check_violation', hint = 'space:locked';
  end if;
  return space;
end;
$$;
/**
 * class_invite_preview: as in CLASSES-a, and a locked class's code reads as ended.
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
         or (select public.space_is_locked(spaces) from public.spaces where spaces.id = found.space_id)
      then jsonb_build_object('status', 'ended')
    else jsonb_build_object('status', 'valid', 'space',
           (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
            from public.spaces where spaces.id = found.space_id))
  end
  from (select (public.class_invite_row(code)).*) as found;
$$;
/**
 * join_class_space: as in CLASSES-a, and a locked class takes nobody new (hint 'invite:ended').
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
  if invite.id is null or space.id is null or public.is_moderated_away('space', space.id)
     or public.space_is_locked(space) then
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
/**
 * space_json: as in CLASSES-a, plus "locks_at" (null when no date is set) and "is_locked".
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
    'locks_at', target.locks_at,
    'is_locked', public.space_is_locked(target),
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

/**
 * create_class_space: as in CLASSES-a, and the new class locks at the end of the school year
 * (next_class_lock_at()).
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
  -- Step 3: the space, members only for reading and posting, locking at the end of the school
  -- year (next_class_lock_at(); criterion 8). The age group is the teacher's and
  -- never used for a class: the people in the room decide who is in it (criterion 5).
  insert into public.spaces (user_id, slug, name, name_key, description, rules, age_group, readers,
                             posting, joining, banner, kind, locks_at)
  values (caller_id, public.space_slug_for(clean_name), clean_name, public.space_name_key(clean_name),
          public.check_space_text(description, 'description'), public.check_space_text(rules, 'rules'),
          '16_plus', 'members', 'members', 'approve', coalesce(create_class_space.banner, 'plum'), 'class',
          public.next_class_lock_at())
  returning * into new_space;
  -- Step 4: its hidden forum and the teacher as its first member, as for any space.
  insert into public.forums (slug, space_id) values ('space-' || new_space.slug, new_space.id);
  perform public.write_space_forum_names(new_space.id, new_space.name);
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values (caller_id, new_space.id, 'owner', 'active', now());
  return jsonb_build_object('slug', new_space.slug);
end;
$$;
/* ---------- Teacher tools ---------- */

/**
 * set_class_lock: sets when a class space locks, locks it now or unlocks it (criterion 8; board
 *   ClassSpace's "Lock the space now" and "Unlock the space").
 * Inputs: slug; new_locks_at: a time (one in the past locks it now) or null (unlocked, no date).
 * Returns: JSON {"locks_at", "is_locked"}.
 * Rules: whoever holds the settings power (the teacher, a space moderator given it, platform
 *   moderators); a date at most two years ahead. Logged as class_locked, class_unlocked or
 *   lock_date_changed, with the new time.
 * Errors: as space_for_power(); check_violation (hint 'space:not_class' or 'lock:date').
 */
create or replace function public.set_class_lock(slug text, new_locks_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
  was_locked boolean := public.space_is_locked(space);
  wanted timestamptz := new_locks_at;
  action_taken text;
begin
  -- Step 1: only a class locks, and not further ahead than two years.
  if space.kind <> 'class' then
    raise exception 'Only a class space locks.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  if new_locks_at > now() + interval '2 years' then
    raise exception 'Choose a date within two years.' using errcode = 'check_violation', hint = 'lock:date';
  end if;
  -- Step 2: a time in the past means "now", so the log says when it really locked.
  if new_locks_at < now() then
    wanted := now();
  end if;
  update public.spaces set locks_at = wanted where spaces.id = space.id returning * into space;
  -- Step 3: the space's log says what changed.
  action_taken := case
    when public.space_is_locked(space) and not was_locked then 'class_locked'
    when was_locked and not public.space_is_locked(space) then 'class_unlocked'
    else 'lock_date_changed' end;
  perform public.log_space_action(space, action_taken, null, null, null,
    jsonb_build_object('locks_at', space.locks_at));
  return jsonb_build_object('locks_at', space.locks_at, 'is_locked', public.space_is_locked(space));
end;
$$;
comment on function public.set_class_lock(text, timestamptz) is
  'Sets when a class space locks, locks it now or unlocks it; logged (S1-E8-11).';
revoke execute on function public.set_class_lock(text, timestamptz) from public, anon;
grant execute on function public.set_class_lock(text, timestamptz) to authenticated;

/**
 * class_waiting_members: the members of a class who joined but can't read or post yet, and why
 *   (board ClassSpace's teacher tools: "Age check not finished", "Waiting for parent or guardian
 *   consent"), so the teacher knows who to help.
 * Input: slug. Returns: a JSON array of {"handle", "display_name", "reason"}, reason one of
 *   'age_check', 'parental_consent' or 'account' (anything else the account gate stops), oldest
 *   joiner first. Never the age, the year of birth or the user ID.
 * Rules: whoever holds the members power (the teacher, space moderators with it, platform
 *   moderators). Errors: as space_for_power(); check_violation (hint 'space:not_class').
 */
create or replace function public.class_waiting_members(slug text)
returns jsonb
language plpgsql
-- Not stable: space_for_power() locks the space's row (select ... for update), which a read-only
-- call can't do, so the app's call would be refused.
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'members');
begin
  -- Step 1: only a class has members who wait to read.
  if space.kind <> 'class' then
    raise exception 'Only a class space has this list.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  -- Step 2: every active member the account gate still stops, with the reason in plain terms.
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'handle', profiles.handle,
             'display_name', public.display_name(profiles.handle, profiles.pen_name),
             'reason', case
               when waiting.state in ('age_check_pending', 'age_check_failed') then 'age_check'
               when waiting.state = 'awaiting_parental_consent' then 'parental_consent'
               else 'account' end)
           order by space_members.joined_at, profiles.handle)
    from public.space_members
    join public.profiles on profiles.id = space_members.user_id
    cross join lateral (select public.account_state(space_members.user_id) as state) as waiting
    where space_members.space_id = space.id and space_members.status = 'active'
      and space_members.role <> 'owner' and profiles.deleted_at is null
      and waiting.state <> 'active'), '[]'::jsonb);
end;
$$;
comment on function public.class_waiting_members(text) is
  'Members of a class space who can''t read yet and why, for the teacher (S1-E8-11).';
revoke execute on function public.class_waiting_members(text) from public, anon;
grant execute on function public.class_waiting_members(text) to authenticated;
