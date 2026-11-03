/*
 * Migration: who may review pictures, and the alert when staff open one (bundle ADMIN-2, part e2a;
 * Robert's brief of 2 Nov 2026, 08:39, kept in
 * /mnt/project-files/builder/bundle-12-pictures-bans-avatars-brief.md, section 5, from his 08:29
 * message).
 *
 * What changes:
 * - The picture review permission. An owner or admin ticks it on Staff › Roles. It can never be
 *   given to an account under 18 or to one marked as an intern, and marking someone an intern
 *   takes it away. Only holders see an uploaded picture's file before readers can, use Moderation ›
 *   Pictures to check, or decide a picture case anywhere (the moderation queue and appeals too).
 * - The intern marker: staff_interns, one row per staff member marked as an intern, set with
 *   admin_set_intern() on Staff › Roles.
 * - Opening an original picture: every time a staff screen hands a staff member an uploaded
 *   picture's file (Pictures to check, a picture case), it goes to the audit log as
 *   'picture.opened' and alerts the owner (CEO) at once, in the app and by email, plus anyone named
 *   in the setting picture_open_alert_handles (a chief of legal later). One alert per staff member
 *   per hour, so a review session doesn't send a flood; the audit log keeps every opening. The
 *   staff home page shows the last seven days to the people alerted.
 * Who calls it: Staff › Roles and Moderation (src/features/staff/, src/features/moderation/), the
 * storage policies of every picture bucket (through picture_reader_may_see()) and decide_case().
 * Tests: supabase/tests/database/249-picture-reviewers.test.sql.
 */

/* ---------- 1. Who is alerted ---------- */

insert into public.settings (key, value, is_public, description) values
  ('picture_open_alert_handles', '[]'::jsonb, false,
   'Usernames alerted when a staff member opens an uploaded picture''s original file, besides every owner (Robert, 2 Nov 2026, 08:29: "the list of people alerted is a setting, so a chief of legal can be added later").');

/* ---------- 2. The intern marker ---------- */

create table public.staff_interns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  marked_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_interns_one_row_per_person unique (user_id)
);

comment on table public.staff_interns is
  'kind: staff
Staff members marked as interns, who can never hold the picture review permission (Robert, 2 Nov 2026, 08:29; ADMIN-2e2a).';

create trigger staff_interns_set_updated_at
  before update on public.staff_interns
  for each row execute function public.set_updated_at();

create trigger staff_interns_refuse_user_id_change
  before update on public.staff_interns
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.staff_interns enable row level security;

/**
 * Policy staff_interns_select_own: a staff member reads their own marker, so their screens can say
 *   why picture review isn't open to them.
 */
create policy staff_interns_select_own
  on public.staff_interns for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy staff_interns_select_own on public.staff_interns is
  'Allows a staff member to read whether they are marked as an intern (ADMIN-2e2a).';

/**
 * Policy staff_interns_select_roles: owners and admins read every marker, as they read roles and
 *   permissions (architecture 1.8.3).
 */
create policy staff_interns_select_roles
  on public.staff_interns for select to authenticated
  using (public.staff_may('roles', 'view'));

comment on policy staff_interns_select_roles on public.staff_interns is
  'Allows owners and admins to read every intern marker, beside roles and permissions (ADMIN-2e2a).';

-- Reads only: markers change through admin_set_intern(), which checks the role and logs.
grant select on public.staff_interns to authenticated;

/* ---------- 3. Who may review pictures ---------- */

/**
 * is_picture_reviewer: may this person see and decide uploaded pictures?
 * Input: person_id. Returns: true when they hold the picture_review permission, are 18 or over and
 *   aren't marked as an intern (brief section 5). A later intern marker or a wrong year of birth
 *   switches it off at once, even if the permission row is still there.
 * Internal: may_review_pictures(), picture_reader_may_see(), admin_set_permission().
 */
create function public.is_picture_reviewer(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select person_id is not null
    and exists (select 1 from public.staff_permissions
                where staff_permissions.user_id = person_id and staff_permissions.permission = 'picture_review')
    and not exists (select 1 from public.staff_interns where staff_interns.user_id = person_id)
    and public.age_band_of(person_id) = '18_plus';
$$;

comment on function public.is_picture_reviewer(uuid) is
  'Internal: true for a staff member with the picture review permission, 18 or over and not an intern (ADMIN-2e2a).';
revoke execute on function public.is_picture_reviewer(uuid) from public, anon, authenticated;

/**
 * may_review_pictures: may the caller use Pictures to check and decide picture cases?
 * Returns: true for a moderation-team member who is a picture reviewer (is_picture_reviewer()).
 * Who calls it: the review functions below, and PicturesToCheckPage before it loads.
 */
create function public.may_review_pictures()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_may('moderation', 'act') and public.is_picture_reviewer((select auth.uid()));
$$;

comment on function public.may_review_pictures() is
  'True when the caller may act on moderation and holds the picture review permission (ADMIN-2e2a).';
revoke execute on function public.may_review_pictures() from public, anon;
grant execute on function public.may_review_pictures() to authenticated;

/**
 * require_picture_reviewer: refuses anyone who may not review pictures.
 * Errors: insufficient_privilege with the hint not_picture_reviewer.
 * Internal: every review function below.
 */
create function public.require_picture_reviewer()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.may_review_pictures() then
    raise exception 'Only staff with the picture review permission can check pictures.'
      using errcode = 'insufficient_privilege', hint = 'not_picture_reviewer';
  end if;
end;
$$;

comment on function public.require_picture_reviewer() is
  'Internal: refuses a caller without the picture review permission (ADMIN-2e2a).';
revoke execute on function public.require_picture_reviewer() from public, anon, authenticated;

/* ---------- 4. Giving and taking the permission, and the intern marker ---------- */

/**
 * admin_set_permission: as in S1-E11-01b, and the picture review permission is refused for an
 *   account under 18 (or whose age is unknown) and for an intern (brief section 5).
 * Inputs: target_user_id; changed_permission; should_hold (true to give, false to take away);
 *   reason_given. Returns: true when something changed.
 * Errors: as require_role_change_allowed(); check_violation (hint not_staff) when the person holds
 *   no staff role; check_violation (hint picture_review_not_allowed) as above.
 */
create or replace function public.admin_set_permission(
  target_user_id uuid,
  changed_permission public.staff_permission,
  should_hold boolean,
  reason_given text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_row_id uuid;
begin
  -- Step 1: the shared checks (role, fresh sign-in, not oneself, a reason, a real account).
  perform public.require_role_change_allowed(target_user_id, reason_given);
  if not exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    raise exception 'Permissions are only for staff.' using errcode = 'check_violation', hint = 'not_staff';
  end if;
  -- Step 2: picture review never for under-18s or interns (Robert, 2 Nov 2026, 08:29).
  if should_hold and changed_permission = 'picture_review'
     and (public.age_band_of(target_user_id) <> '18_plus'
          or exists (select 1 from public.staff_interns where staff_interns.user_id = target_user_id)) then
    raise exception 'Picture review is only for staff aged 18 or over who aren''t interns.'
      using errcode = 'check_violation', hint = 'picture_review_not_allowed';
  end if;
  -- Step 3: the change itself, then the audit log.
  if should_hold then
    insert into public.staff_permissions (user_id, permission, granted_by_user_id)
    values (target_user_id, changed_permission, (select auth.uid()))
    on conflict (user_id, permission) do nothing
    returning id into changed_row_id;
  else
    delete from public.staff_permissions
    where staff_permissions.user_id = target_user_id and staff_permissions.permission = changed_permission
    returning id into changed_row_id;
  end if;
  if changed_row_id is null then
    return false;
  end if;
  perform public.log_staff_action(
    case when should_hold then 'staff.permission_granted' else 'staff.permission_removed' end,
    'staff_permissions', changed_row_id::text, target_user_id, reason_given,
    jsonb_build_object('permission', changed_permission, 'held', not should_hold),
    jsonb_build_object('permission', changed_permission, 'held', should_hold));
  return true;
end;
$$;

/**
 * admin_set_intern: marks a staff member as an intern, or takes the marker away. Marking takes
 *   the picture review permission away in the same step (logged as its own change).
 * Inputs: target_user_id; should_be_intern; reason_given. Returns: true when something changed.
 * Errors: as require_role_change_allowed(); check_violation (hint not_staff) for an account with
 *   no staff role.
 * Where it fits: the Intern tick box on Staff › Roles (StaffMemberCard).
 */
create function public.admin_set_intern(target_user_id uuid, should_be_intern boolean, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_row_id uuid;
begin
  -- Step 1: the same checks as a role or permission change.
  perform public.require_role_change_allowed(target_user_id, reason_given);
  if not exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    raise exception 'Only staff can be marked as interns.' using errcode = 'check_violation', hint = 'not_staff';
  end if;
  -- Step 2: the marker.
  if should_be_intern then
    insert into public.staff_interns (user_id, marked_by_user_id)
    values (target_user_id, (select auth.uid()))
    on conflict (user_id) do nothing
    returning id into changed_row_id;
  else
    delete from public.staff_interns where staff_interns.user_id = target_user_id
    returning id into changed_row_id;
  end if;
  if changed_row_id is null then
    return false;
  end if;
  perform public.log_staff_action(
    case when should_be_intern then 'staff.intern_marked' else 'staff.intern_unmarked' end,
    'staff_interns', changed_row_id::text, target_user_id, reason_given,
    jsonb_build_object('intern', not should_be_intern), jsonb_build_object('intern', should_be_intern));
  -- Step 3: an intern never keeps picture review (brief section 5).
  if should_be_intern then
    perform public.admin_set_permission(target_user_id, 'picture_review', false, reason_given);
  end if;
  return true;
end;
$$;

comment on function public.admin_set_intern(uuid, boolean, text) is
  'Marks or unmarks a staff member as an intern, with a reason; marking removes picture review; logged (ADMIN-2e2a).';
revoke execute on function public.admin_set_intern(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_intern(uuid, boolean, text) to authenticated;

/**
 * admin_list_staff: as in S1-E2-07a, plus is_intern.
 * Returns: one row per staff member: user ID, username, roles, permissions and is_intern.
 * Errors: insufficient_privilege unless the caller may view roles.
 * The return type changes, so the function is dropped and made again.
 */
drop function public.admin_list_staff();

create function public.admin_list_staff()
returns table (
  user_id uuid, handle text, roles public.staff_role[], permissions public.staff_permission[], is_intern boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('roles', 'view') then
    raise exception 'Only an owner or admin can see the staff list.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      profiles.id,
      profiles.handle,
      array_agg(distinct staff_roles.role order by staff_roles.role),
      coalesce(
        (select array_agg(permissions.permission order by permissions.permission)
         from public.staff_permissions as permissions where permissions.user_id = profiles.id),
        '{}'),
      exists (select 1 from public.staff_interns where staff_interns.user_id = profiles.id)
    from public.staff_roles
    join public.profiles on profiles.id = staff_roles.user_id
    group by profiles.id, profiles.handle
    order by profiles.handle;
end;
$$;

comment on function public.admin_list_staff() is
  'Everyone with a staff role, their roles, permissions and intern marker, for owner and admin (S1-E2-07a, ADMIN-2e2a).';
revoke execute on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

/* ---------- 5. Only reviewers see a picture's file before readers do ---------- */

/**
 * picture_reader_may_see: as in S1-E10-05, but on the staff side only picture reviewers read a
 *   file that isn't visible to everyone yet (brief section 5). Every picture bucket's storage
 *   policy asks this, so the rule holds for covers, profile pictures, chapter pictures, Story
 *   world pictures, space banners and signature pictures alike.
 * Inputs: bucket, path. Returns: true for the uploader, and for a picture reviewer allowed to see
 *   the picture's case (a safeguarding case also needs that permission, S1-E10-10).
 */
create or replace function public.picture_reader_may_see(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.picture_checks
    left join public.cases on cases.id = picture_checks.case_id
    where picture_checks.bucket = picture_reader_may_see.bucket and picture_checks.path = picture_reader_may_see.path
      and (picture_checks.user_id = (select auth.uid())
           or (public.staff_may('moderation', 'view')
               and public.is_picture_reviewer((select auth.uid()))
               and public.may_see_case(coalesce(cases.is_safeguarding, false)))));
$$;

comment on function public.picture_reader_may_see(text, text) is
  'True for the uploader and for picture reviewers allowed to see the picture''s case (S1-E10-05, ADMIN-2e2a).';

/* ---------- 6. The alert when staff open an original picture ---------- */

/**
 * picture_open_alert_recipients: who hears that a staff member opened an uploaded picture.
 * Returns: the user IDs of every owner (the CEO) and of the usernames in the setting
 *   picture_open_alert_handles (brief section 5).
 * Internal: record_picture_opened(), admin_recent_picture_openings().
 */
create function public.picture_open_alert_recipients()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select staff_roles.user_id from public.staff_roles where staff_roles.role = 'owner'
  union
  select profiles.id from public.profiles
  where profiles.deleted_at is null
    and lower(profiles.handle) in (
      select lower(listed.handle)
      from jsonb_array_elements_text(coalesce(
        (select settings.value from public.settings where settings.key = 'picture_open_alert_handles'),
        '[]'::jsonb)) as listed (handle));
$$;

comment on function public.picture_open_alert_recipients() is
  'Internal: every owner plus the usernames in picture_open_alert_handles (ADMIN-2e2a).';
revoke execute on function public.picture_open_alert_recipients() from public, anon, authenticated;

/**
 * record_picture_opened: logs that the caller was handed an uploaded picture's file and alerts the
 *   people who must know (brief section 5).
 * Inputs: picture_id; place, the screen ('pictures_to_check' or 'moderation_case').
 * Rules: the audit log gets one 'picture.opened' row per picture, staff member and ten minutes
 *   (the life of the signed address, so reloading a page doesn't log twice). Every recipient gets
 *   one picture_opened_by_staff notice per staff member per hour (notify()'s grouping), never one
 *   for their own openings.
 * Internal: admin_pictures_to_check(), admin_case_picture().
 */
create function public.record_picture_opened(picture_id uuid, place text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  opener_id uuid := (select auth.uid());
  owner_id uuid;
  recipient_id uuid;
begin
  -- Step 1: nothing to log for a system call, or when this opening was logged a moment ago.
  if opener_id is null or exists (
      select 1 from public.audit_log
      where audit_log.user_id = opener_id and audit_log.action = 'picture.opened'
        and audit_log.target_id = picture_id::text and audit_log.created_at > now() - interval '10 minutes') then
    return;
  end if;
  -- Step 2: the audit log names the picture, its uploader and the screen.
  select picture_checks.user_id into owner_id from public.picture_checks where picture_checks.id = picture_id;
  perform public.log_staff_action('picture.opened', 'picture_checks', picture_id::text, owner_id,
    'Opened on ' || place, null, jsonb_build_object('place', place));
  -- Step 3: the alert, in the app and by email (email_delivery_for() makes it required).
  for recipient_id in select * from public.picture_open_alert_recipients() loop
    perform public.notify(recipient_id, 'picture_opened_by_staff', opener_id, '{}'::jsonb,
      'picture_opened:' || opener_id::text, interval '1 hour');
  end loop;
end;
$$;

comment on function public.record_picture_opened(uuid, text) is
  'Internal: audit log and alert when staff are handed an uploaded picture''s file (ADMIN-2e2a).';
revoke execute on function public.record_picture_opened(uuid, text) from public, anon, authenticated;

/**
 * admin_recent_picture_openings: the staff home page's panel for the people alerted.
 * Returns: a JSON array, newest first, of {staffHandle, openings, lastOpenedAt} for the last seven
 *   days; null for anyone who isn't a recipient (the page then shows nothing).
 * Where it fits: StaffHomePage (src/features/staff/).
 */
create function public.admin_recent_picture_openings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not exists (select 1 from public.picture_open_alert_recipients() as recipient
                    where recipient = (select auth.uid())) then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('staffHandle', grouped.handle, 'openings', grouped.openings,
                                        'lastOpenedAt', grouped.last_opened_at)
                     order by grouped.last_opened_at desc)
    from (select profiles.handle, count(*) as openings, max(audit_log.created_at) as last_opened_at
          from public.audit_log
          join public.profiles on profiles.id = audit_log.user_id
          where audit_log.action = 'picture.opened' and audit_log.created_at > now() - interval '7 days'
          group by profiles.handle) as grouped), '[]'::jsonb);
end;
$$;

comment on function public.admin_recent_picture_openings() is
  'Staff: who opened original pictures in the last seven days, for the people alerted (ADMIN-2e2a).';
revoke execute on function public.admin_recent_picture_openings() from public, anon;
grant execute on function public.admin_recent_picture_openings() to authenticated;

/* ---------- 7. The review page and the case page ---------- */

/**
 * picture_review_case: as in ADMIN-2e1b, for picture reviewers only.
 * Errors: insufficient_privilege (hint not_picture_reviewer); check_violation as before.
 */
create or replace function public.picture_review_case(target_case_id uuid)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  perform public.require_picture_reviewer();
  select * into target from public.cases where cases.id = target_case_id for update;
  if target.id is null or target.item_type <> 'picture' or target.status <> 'open' or target.is_safeguarding then
    raise exception 'This isn''t a picture waiting for a decision.' using errcode = 'check_violation';
  end if;
  return target;
end;
$$;

/**
 * admin_pictures_to_check: as in ADMIN-2e1b, for picture reviewers only, and each picture handed
 *   out is logged and alerted through record_picture_opened(). No longer stable, because it writes.
 * Returns: as before. Errors: insufficient_privilege (hint not_picture_reviewer).
 */
drop function public.admin_pictures_to_check();

create function public.admin_pictures_to_check()
returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  waiting jsonb[];
begin
  -- Step 1: only picture reviewers.
  perform public.require_picture_reviewer();
  -- Step 2: the waiting pictures, oldest first.
  select array_agg(jsonb_build_object(
      'caseId', cases.id, 'pictureId', picture.id, 'kind', picture.kind, 'bucket', picture.bucket,
      'path', picture.path, 'uploaderHandle', uploader.handle,
      'uploaderAgeBand', public.age_band_of(picture.user_id), 'uploaderLocale', uploader.locale,
      'story', case when story.id is null then null else jsonb_build_object(
        'id', story.id, 'title', story.title, 'slug', story.slug, 'rating', story.rating) end,
      'ownerAgeBand', case when story.id is null then null else public.age_band_of(story.user_id) end,
      'waitingSince', cases.created_at, 'source', cases.source) order by cases.created_at)
  into waiting
  from public.cases
  join public.picture_checks as picture on picture.id = cases.item_id
  join public.profiles as uploader on uploader.id = picture.user_id
  left join public.stories as story on story.id = picture.story_id
  where cases.item_type = 'picture' and cases.status = 'open' and not cases.is_safeguarding
    and cases.source in ('picture_review', 'picture_check') and picture.status = 'held';
  -- Step 3: each file handed out is an opening (brief section 5).
  perform public.record_picture_opened((entry ->> 'pictureId')::uuid, 'pictures_to_check')
  from unnest(coalesce(waiting, '{}')) as entry;
  return query select unnest(coalesce(waiting, '{}'));
end;
$$;

comment on function public.admin_pictures_to_check() is
  'Staff: the pictures waiting for a picture reviewer, oldest first, each opening logged (ADMIN-2e1b, ADMIN-2e2a).';
revoke execute on function public.admin_pictures_to_check() from public, anon;
grant execute on function public.admin_pictures_to_check() to authenticated;

/**
 * admin_picture_reject_reasons: as in ADMIN-2e1b, for picture reviewers only.
 */
create or replace function public.admin_picture_reject_reasons()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_picture_reviewer();
  return coalesce((select settings.value from public.settings where settings.key = 'picture_reject_reasons'),
                  '[]'::jsonb);
end;
$$;

/**
 * admin_case_picture: as in S1-E10-05, but the file's bucket and path go only to picture reviewers
 *   (canSee true), and handing them out is logged and alerted. Others on the moderation team see
 *   what was flagged, with canSee false. No longer stable, because it writes.
 * Input: target_case_id. Returns: the picture as JSON, or null for a case about something else.
 * Errors: insufficient_privilege for anyone who can't see the case.
 */
drop function public.admin_case_picture(uuid);

create function public.admin_case_picture(target_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
  can_see boolean := public.is_picture_reviewer((select auth.uid()));
  picture public.picture_checks;
begin
  -- Step 1: the case must be one the caller may see.
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.staff_may('moderation', 'view') or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  if target.item_type <> 'picture' then
    return null;
  end if;
  -- Step 2: the picture; its file only for reviewers, and that opening is logged.
  select * into picture from public.picture_checks where picture_checks.id = target.item_id;
  if can_see and picture.id is not null then
    perform public.record_picture_opened(picture.id, 'moderation_case');
  end if;
  return (select jsonb_build_object('id', picture.id, 'kind', picture.kind,
      'bucket', case when can_see then picture.bucket end, 'path', case when can_see then picture.path end,
      'canSee', can_see, 'status', picture.status,
      'flags', picture.flags, 'provider', picture.provider, 'attempts', picture.attempts,
      'checked_at', picture.checked_at,
      'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
                from public.stories where stories.id = picture.story_id))
    where picture.id is not null);
end;
$$;

comment on function public.admin_case_picture(uuid) is
  'The picture a picture case is about; its file only for picture reviewers, each opening logged (S1-E10-05, ADMIN-2e2a).';
revoke execute on function public.admin_case_picture(uuid) from public, anon;
grant execute on function public.admin_case_picture(uuid) to authenticated;

/**
 * apply_picture_decision: as in S1-E10-05, and a staff member deciding a picture case (in the
 *   queue, on Pictures to check or on appeal) must be a picture reviewer. Jobs and the database's
 *   own steps (no signed-in caller) aren't asked.
 * Errors: insufficient_privilege (hint not_picture_reviewer).
 */
create or replace function public.apply_picture_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  picture public.picture_checks;
begin
  if new.item_type = 'picture' and new.status = 'decided' and old.status is distinct from 'decided' then
    -- Brief section 5: only picture reviewers decide pictures.
    if (select auth.uid()) is not null and not public.is_picture_reviewer((select auth.uid())) then
      raise exception 'Only staff with the picture review permission can decide a picture.'
        using errcode = 'insufficient_privilege', hint = 'not_picture_reviewer';
    end if;
    update public.picture_checks set
      status = case when new.decision = 'no_action' then 'approved' else 'removed' end::public.picture_status
    where id = new.item_id
    returning * into picture;
    if picture.status = 'approved' then
      perform public.show_passed_avatar(picture);
    end if;
  end if;
  return null;
end;
$$;

/* ---------- 8. The notification ---------- */

/**
 * notify: as in ADMIN-2c2, plus picture_opened_by_staff as required: the owner can't switch off
 *   hearing that someone opened an uploaded picture (brief section 5). Inputs, return and callers
 *   are unchanged.
 */
create or replace function public.notify(
  recipient_id uuid, notification_kind public.notification_kind, actor_id uuid, about jsonb,
  group_key text default null, group_window interval default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grouped public.notifications;
begin
  -- Step 1: never one's own action, never across a block.
  if recipient_id is null or recipient_id = actor_id then
    return;
  end if;
  if actor_id is not null and exists (
      select 1 from public.blocks
      where (blocks.user_id = recipient_id and blocks.blocked_user_id = actor_id)
         or (blocks.user_id = actor_id and blocks.blocked_user_id = recipient_id)) then
    return;
  end if;
  -- Step 2: a fresh grouped row takes the new person instead of a new row.
  if notify.group_key is not null then
    select * into grouped from public.notifications
    where notifications.user_id = recipient_id and notifications.group_key = notify.group_key
      and notifications.created_at > now() - group_window
    order by notifications.created_at desc limit 1
    for update;
    if grouped.id is not null then
      if actor_id = any (grouped.actor_user_ids) then
        return;
      end if;
      update public.notifications set
        actor_user_ids = (array[actor_id] || grouped.actor_user_ids)[1:50],
        actor_count = grouped.actor_count + 1,
        read_at = null,
        updated_at = now()
      where notifications.id = grouped.id;
      return;
    end if;
  end if;
  -- Step 3: a new row; a decision, an appeal's outcome or a staff change can't be switched off
  -- (DSA art. 17, 20; S1-E11-08), nor can a data request's notice (GDPR art. 12; S1-E11-09) or
  -- the alert that staff opened an uploaded picture (ADMIN-2e2a).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id,
    story_revision_id, data_request_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, (about ->> 'data_request_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff', 'data_request_confirm',
                          'data_request_extended', 'data_request_copy_ready', 'picture_opened_by_staff'));
end;
$$;

/**
 * notification_category: as in ADMIN-2c2, plus picture_opened_by_staff under staff.
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    else 'replies'
  end;
$$;

/**
 * email_delivery_for: as in ADMIN-2c2, plus picture_opened_by_staff, always emailed: the owner is
 *   alerted "at once, by email and in the admin site" (brief section 5).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended', 'data_request_copy_ready',
                  'picture_opened_by_staff') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;
