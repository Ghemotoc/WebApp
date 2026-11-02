-- Bundle CLASSES, part d (story S1-E8-11): the staff pilot set-up and archiving.
--
-- What it adds:
-- - spaces.school_name: the school a class belongs to, which a class certificate prints with a
--   student's real name (S1-E8-12, part e). Organisation data, never personal data.
-- - spaces.archived_at: an archived class is locked for good. Nobody posts, reacts, joins or is
--   invited, every member still reads it (criterion 8; Q69), and nobody unlocks it again. Part e
--   counts the 30 days before printed names are deleted from this moment.
-- - insert_class_space(): the one place a class space row is made, shared by the teacher's own
--   create_class_space() and the staff's admin_create_class_space().
-- - admin_class_spaces(), admin_create_class_space() and admin_set_class_school(): Staff › Schools ›
--   Class spaces, the manual pilot mode (criterion 10: staff create the space, name the teacher as
--   owner and print the invite code). The code itself comes from make_class_invite(), which staff
--   may already call (space_may_act() lets platform moderators act in any space).
-- - archive_class_space(): the teacher (settings power) or staff archive a class.
-- - space_json() says is_archived and school_name; set_class_lock() refuses an archived class.
--
-- Who calls it: src/features/spaces/api/classTools.ts (archiving) and
-- src/features/staff/api/classSpaces.ts (the staff page).
-- Tests: supabase/tests/database/235-class-pilot-setup.test.sql.

/* ---------- 1. Columns ---------- */

alter table public.spaces
  add column school_name text,
  add column archived_at timestamptz,
  add constraint spaces_school_name_only_class check (school_name is null or kind = 'class'),
  add constraint spaces_school_name_length check (school_name is null or char_length(school_name) between 1 and 120),
  add constraint spaces_archived_only_class check (archived_at is null or kind = 'class');

comment on column public.spaces.school_name is
  'kind: setting. The school a class space belongs to, printed on class certificates (S1-E8-11, S1-E8-12).';
comment on column public.spaces.archived_at is
  'kind: setting. When a class space was archived: locked for good, still readable by members (S1-E8-11, Q69).';

/* ---------- 2. One place that makes a class space ---------- */

/**
 * insert_class_space: makes a class space for an owner: the row, its hidden forum and the owner
 * as its first member. Internal; callers check who may do it first.
 * Inputs: owner_id (a teacher with the badge), the name, description, rules, banner and school
 *   (null when unknown).
 * Returns: the new space.
 * Errors: check_violation with hint name:taken when another space has the name; the space text
 *   checks (check_space_text()).
 * Where it fits: create_class_space() (the teacher) and admin_create_class_space() (staff).
 */
create or replace function public.insert_class_space(
  owner_id uuid,
  name text,
  description text,
  rules text,
  banner public.space_banner,
  school text
)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := public.check_space_text(name, 'name');
  clean_school text := nullif(btrim(coalesce(school, '')), '');
  new_space public.spaces;
begin
  -- Step 1: a name only once.
  if exists (select 1 from public.spaces
             where spaces.name_key = public.space_name_key(clean_name) and spaces.deleted_at is null) then
    raise exception 'Another space has this name.' using errcode = 'check_violation', hint = 'name:taken';
  end if;
  if char_length(clean_school) > 120 then
    raise exception 'The school''s name is too long.' using errcode = 'check_violation', hint = 'school:length';
  end if;
  -- Step 2: the space, members only for reading and posting, locking at the end of the school
  -- year (next_class_lock_at(); criterion 8). The age group is never used for a class: the people
  -- in the room decide who is in it (criterion 5).
  insert into public.spaces (user_id, slug, name, name_key, description, rules, age_group, readers,
                             posting, joining, banner, kind, locks_at, school_name)
  values (owner_id, public.space_slug_for(clean_name), clean_name, public.space_name_key(clean_name),
          public.check_space_text(description, 'description'), public.check_space_text(rules, 'rules'),
          '16_plus', 'members', 'members', 'approve', coalesce(insert_class_space.banner, 'plum'), 'class',
          public.next_class_lock_at(), clean_school)
  returning * into new_space;
  -- Step 3: its hidden forum and the owner as its first member, as for any space.
  insert into public.forums (slug, space_id) values ('space-' || new_space.slug, new_space.id);
  perform public.write_space_forum_names(new_space.id, new_space.name);
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values (owner_id, new_space.id, 'owner', 'active', now());
  return new_space;
end;
$$;

comment on function public.insert_class_space(uuid, text, text, text, public.space_banner, text) is
  'Internal: makes a class space row, its forum and owner membership (S1-E8-11, CLASSES-d).';
revoke execute on function public.insert_class_space(uuid, text, text, text, public.space_banner, text) from public, anon, authenticated;

/**
 * create_class_space: as in CLASSES-b (a teacher with the badge starts a class), now through
 * insert_class_space(). The teacher doesn't name a school here; staff add it on the pilot page.
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
  new_space public.spaces;
begin
  -- Step 1: only an adult teacher with the badge (criterion 1; S1-E2-11 grants it to adults only).
  if public.age_band() is distinct from '18_plus'
     or (select profiles.teacher_badge_since from public.profiles where profiles.id = caller_id) is null then
    raise exception 'Only teachers can start a class space.' using errcode = 'insufficient_privilege', hint = 'space:not_teacher';
  end if;
  -- Step 2: the spam limit, then the space.
  perform public.take_rate_limit('space_create');
  new_space := public.insert_class_space(caller_id, name, description, rules, banner, null);
  return jsonb_build_object('slug', new_space.slug);
end;
$$;

/* ---------- 3. The staff pilot page ---------- */

/**
 * admin_class_spaces: every class space, newest first, for Staff › Schools › Class spaces.
 * Returns: per class: slug, name, school_name, the teacher's handle and display name, member
 *   count, locks_at, is_locked, archived_at and created_at. Never a user ID or a student's name.
 * Errors: insufficient_privilege (hint not_allowed) without Schools access.
 * Where it fits: /staff/schools/classes → useStaffClassSpaces → here.
 */
create or replace function public.admin_class_spaces()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_teacher_checks_access();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', spaces.slug,
      'name', spaces.name,
      'school_name', spaces.school_name,
      'teacher', public.forum_person_json(spaces.user_id),
      'member_count', (select count(*)::integer from public.space_members
                       where space_members.space_id = spaces.id and space_members.status = 'active'),
      'locks_at', spaces.locks_at,
      'is_locked', public.space_is_locked(spaces),
      'archived_at', spaces.archived_at,
      'created_at', spaces.created_at) order by spaces.created_at desc)
    from public.spaces
    where spaces.kind = 'class' and spaces.deleted_at is null), '[]'::jsonb);
end;
$$;

comment on function public.admin_class_spaces() is
  'Staff (Schools): every class space for the pilot page (S1-E8-11 criterion 10).';
revoke execute on function public.admin_class_spaces() from public, anon;
grant execute on function public.admin_class_spaces() to authenticated;

/**
 * admin_create_class_space: staff set up a class for a pilot school with a named teacher as its
 * owner (criterion 10, manual pilot mode).
 * Inputs: teacher_handle (a teacher with the badge, which S1-E2-11 gives adults only; staff approve it on Verify
 *   teachers), the class's name, the school's name and the description members see.
 * Returns: { slug }.
 * Errors: insufficient_privilege (hint not_allowed) without Schools access; check_violation with
 *   hint not_a_teacher, school:needed, school:length or name:taken.
 * Effects: the audit log gets the class and the teacher; the teacher is the space's owner, so
 *   the space's own log and every teacher tool work as if they had made it themselves.
 */
create or replace function public.admin_create_class_space(
  teacher_handle text,
  name text,
  school_name text,
  description text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher public.profiles;
  new_space public.spaces;
begin
  -- Step 1: only staff who run schools, and only for an adult teacher with the badge.
  perform public.require_teacher_checks_access();
  select * into teacher from public.profile_for_handle(teacher_handle);
  if not found or teacher.teacher_badge_since is null then
    raise exception 'This account has no Teacher badge.' using errcode = 'check_violation', hint = 'not_a_teacher';
  end if;
  -- Step 2: a pilot class always names its school (it prints on certificates).
  if btrim(coalesce(school_name, '')) = '' then
    raise exception 'Write the school''s name.' using errcode = 'check_violation', hint = 'school:needed';
  end if;
  new_space := public.insert_class_space(teacher.id, name, description, '', 'plum', school_name);
  -- Step 3: the audit log, in the same transaction.
  perform public.log_staff_action('class_space.created', 'spaces', new_space.id::text, teacher.id, null, null,
    jsonb_build_object('slug', new_space.slug, 'school_name', new_space.school_name));
  return jsonb_build_object('slug', new_space.slug);
end;
$$;

comment on function public.admin_create_class_space(text, text, text, text) is
  'Staff (Schools): sets up a class space owned by a named teacher (S1-E8-11 criterion 10).';
revoke execute on function public.admin_create_class_space(text, text, text, text) from public, anon;
grant execute on function public.admin_create_class_space(text, text, text, text) to authenticated;

/**
 * admin_set_class_school: staff write or correct the school a class belongs to.
 * Inputs: the class's address and the school's name. Returns: { school_name }.
 * Errors: insufficient_privilege (hint not_allowed); no_data_found (hint space:missing) when it
 *   isn't a class; check_violation with hint school:needed or school:length.
 * Effects: logged with the old and new names.
 */
create or replace function public.admin_set_class_school(slug text, school_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.spaces;
  clean_school text := btrim(coalesce(school_name, ''));
begin
  perform public.require_teacher_checks_access();
  select * into target from public.spaces
  where spaces.slug = admin_set_class_school.slug and spaces.kind = 'class' and spaces.deleted_at is null
  for update;
  if target.id is null then
    raise exception 'There is no such class.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if clean_school = '' then
    raise exception 'Write the school''s name.' using errcode = 'check_violation', hint = 'school:needed';
  end if;
  if char_length(clean_school) > 120 then
    raise exception 'The school''s name is too long.' using errcode = 'check_violation', hint = 'school:length';
  end if;
  update public.spaces set school_name = clean_school where spaces.id = target.id;
  perform public.log_staff_action('class_space.school_changed', 'spaces', target.id::text, target.user_id, null,
    jsonb_build_object('school_name', target.school_name), jsonb_build_object('school_name', clean_school));
  return jsonb_build_object('school_name', clean_school);
end;
$$;

comment on function public.admin_set_class_school(text, text) is
  'Staff (Schools): writes the school a class belongs to; logged (S1-E8-11).';
revoke execute on function public.admin_set_class_school(text, text) from public, anon;
grant execute on function public.admin_set_class_school(text, text) to authenticated;

/* ---------- 4. Archiving ---------- */

/**
 * archive_class_space: archives a class for good (criterion 8: "Given the academic year ends (or
 * the teacher closes the space earlier), when the space is archived, then it locks").
 * Inputs: the class's address.
 * Returns: { is_archived, archived_at, is_locked }.
 * Errors: hint space:missing or space:not_allowed (space_for_power(): the settings power, or
 *   platform moderators); space:not_class for an open space; space:archived when already archived.
 * Effects: locks it now if it isn't locked yet; nobody can unlock it again (set_class_lock()
 *   refuses); members keep reading for as long as their account exists (Q69). In the space's log
 *   (and the audit log when staff do it).
 */
create or replace function public.archive_class_space(slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
begin
  -- Step 1: only a class, and only once.
  if space.kind <> 'class' then
    raise exception 'Only a class space is archived.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  if space.archived_at is not null then
    raise exception 'This class is already archived.' using errcode = 'check_violation', hint = 'space:archived';
  end if;
  -- Step 2: archived now, and locked from now if the lock date is still ahead.
  update public.spaces
  set archived_at = now(), locks_at = least(coalesce(spaces.locks_at, now()), now())
  where spaces.id = space.id
  returning * into space;
  -- Step 3: the space's log (and the audit log when staff did it).
  perform public.log_space_action(space, 'class_archived', null, null, null,
    jsonb_build_object('archived_at', space.archived_at));
  return jsonb_build_object('is_archived', true, 'archived_at', space.archived_at,
    'is_locked', public.space_is_locked(space));
end;
$$;

comment on function public.archive_class_space(text) is
  'Teacher or staff: archives a class space for good; members still read it (S1-E8-11 criterion 8).';
revoke execute on function public.archive_class_space(text) from public, anon;
grant execute on function public.archive_class_space(text) to authenticated;

/* ---------- 5. What the page and the lock say ---------- */

/**
 * set_class_lock: as in CLASSES-b, but an archived class can't be unlocked or given a new date.
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
  -- CLASSES-d: an archived class stays locked for good (S1-E8-11 criterion 8, Q69).
  if space.archived_at is not null then
    raise exception 'This class is archived.' using errcode = 'check_violation', hint = 'space:archived';
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

/**
 * space_json: as in CLASSES-b, plus is_archived and school_name.
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
    -- CLASSES-d: an archived class is locked for good; the school's name prints on certificates.
    'is_archived', target.archived_at is not null,
    'school_name', target.school_name,
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
