/*
 * Migration: space banner pictures, notifications for joining a space, and a guard on the staff
 * forum tools (bundle FORUMS-2, part c; stories S1-E8-06 and S1-E8-07; board 5.3).
 *
 * What it adds:
 * - Banner pictures (S1-E8-06 criterion 1: "an optional banner"; Q50: spaces are the only place
 *   banners appear). A private `space-banners` bucket, one folder per space. Whoever holds the
 *   settings power uploads a picture, it goes through the picture check (CLAUDE.md rule 19), and
 *   the space shows it only once the check passed; until then, and after a removal, the drawn
 *   colour shows. spaces.banner_picture_id, space_banner_upload_allowed(), the bucket's storage
 *   policies, register_space_banner() and set_space_banner_picture(), logged in the space's log.
 * - Notifications: 'space_join_request' to the owner and to moderators with the members power
 *   when someone asks to join (grouped per space for a day), and 'space_join_approved' to the
 *   person let in (board 5.3: "You'll get a notification when you're in"). A trigger on
 *   space_members sends them, so join_space() and decide_space_join_request() stay as they are.
 *   notifications.space_id, notify() and notification_json() learn the space; no email by
 *   default (default_email_delivery() has no line for them).
 * - forums_refuse_space_forum_change: staff's forum tools (admin_save_forum(),
 *   admin_delete_forum()) can't move, rename the address of, pin or remove a space's hidden forum;
 *   a space's forum belongs to its space (FORUMS-2a follow-up).
 * Who calls it: the space settings page (SpaceBannerPicture), the notifications list and the
 *   staff forum screen. What it calls: the picture check (S1-E10-05) and notify() (S1-E7-01).
 */

/* ---------- Banner pictures: the column, the bucket and its rules ---------- */

alter table public.spaces
  add column banner_picture_id uuid references public.picture_checks (id) on delete set null;
comment on column public.spaces.banner_picture_id is
  'The uploaded banner picture (FORUMS-2c), shown once its check passed; null for a drawn colour.';

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind = 'space_banner' and bucket = 'space-banners')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image', 'space_banner'));

-- Private: served only through signed URLs once the check passed; 5 MB; the three picture types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('space-banners', 'space-banners', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * space_banner_upload_allowed: may the signed-in person add this file to `space-banners`?
 * Input: object_name, "<space ID>/<random ID>.<ending>". Returns: true only while picture_uploads
 *   is on, for a random file name (never the user ID) under a live space where the caller holds
 *   the settings power (the owner, a moderator given it, or our moderation team).
 * Where it fits: the space_banners_insert_settings policy and register_space_banner().
 */
create or replace function public.space_banner_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('picture_uploads')
    and public.is_active_member()
    and coalesce(object_name, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$'
    and split_part(split_part(object_name, '/', 2), '.', 1) <> (select auth.uid())::text
    and exists (
      select 1 from public.spaces
      where spaces.id = split_part(object_name, '/', 1)::uuid
        and spaces.deleted_at is null
        and public.space_may_act(spaces, 'settings'));
$$;
comment on function public.space_banner_upload_allowed(text) is
  'True for someone with a space''s settings power, a random file name under the space''s ID and picture_uploads on (FORUMS-2c).';
revoke execute on function public.space_banner_upload_allowed(text) from public, anon;
grant execute on function public.space_banner_upload_allowed(text) to authenticated;

/**
 * Policy space_banners_insert_settings: someone with the space's settings power adds a picture
 * under the space's folder while picture uploads are on.
 */
create policy space_banners_insert_settings
  on storage.objects for insert to authenticated
  with check (bucket_id = 'space-banners' and public.space_banner_upload_allowed(name));
comment on policy space_banners_insert_settings on storage.objects is
  'Allows the owner, a moderator with the settings power or staff to add a banner under the space''s folder while picture_uploads is on (FORUMS-2c).';

/**
 * Policy space_banners_select_visible: anyone, signed in or not, reads a banner once its check
 * passed or a moderator approved it (S1-E10-05 criterion 2). The page asks for a signed URL.
 */
create policy space_banners_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'space-banners' and public.picture_is_visible(bucket_id, name));
comment on policy space_banners_select_visible on storage.objects is
  'Allows anyone to read a space banner once it passed its check or was approved (FORUMS-2c).';

/**
 * Policy space_banners_select_uploader_and_staff: the uploader reads their own banner at every
 * stage, and moderation staff read the pictures they decide on (S1-E10-05 criterion 3).
 */
create policy space_banners_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'space-banners' and public.picture_reader_may_see(bucket_id, name));
comment on policy space_banners_select_uploader_and_staff on storage.objects is
  'Allows the uploader and moderation staff to read a space banner at any stage of its check (FORUMS-2c).';

/**
 * space_banner_file_may_go: may the uploader delete this banner file now?
 * Input: object_name. Returns: true when no live, held, removed or preserved picture still needs
 *   the file (as atlas_picture_file_may_go(), S1-E17-11).
 * Where it fits: the space_banners_delete_own policy.
 */
create or replace function public.space_banner_file_may_go(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.picture_checks
    where picture_checks.bucket = 'space-banners' and picture_checks.path = object_name
      and (picture_checks.deleted_at is null
           or picture_checks.status in ('held', 'removed')
           or picture_checks.preserve_until is not null));
$$;
comment on function public.space_banner_file_may_go(text) is
  'True when no live, held or preserved picture still needs this space-banners file (FORUMS-2c).';
revoke execute on function public.space_banner_file_may_go(text) from public, anon;
grant execute on function public.space_banner_file_may_go(text) to authenticated;

/**
 * Policy space_banners_delete_own: the uploader deletes their own banner file once it was
 * replaced or taken off; a held, removed or preserved picture's file stays for the moderators and
 * the authorities.
 */
create policy space_banners_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'space-banners' and owner_id = (select auth.uid())::text
         and public.space_banner_file_may_go(name));
comment on policy space_banners_delete_own on storage.objects is
  'Allows the uploader to delete their own space-banners file once it is no longer the banner, unless moderation or the authorities still need it (FORUMS-2c).';

/* ---------- Banner pictures: registering and choosing ---------- */

/**
 * register_space_banner: records a banner the caller just uploaded, as pending its check.
 * Input: target_path ("<space ID>/<random ID>.<ending>" in `space-banners`).
 * Returns: the picture's ID, which the screen sends to /api/picture-check and then gives to
 *   set_space_banner_picture().
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while picture_uploads is off; check_violation when the file isn't
 *   there, isn't the caller's or isn't under a space where they hold the settings power;
 *   program_limit_exceeded over the hourly upload limit (S1-E10-12).
 * Where it fits: uploadSpaceBanner(), straight after the upload.
 */
create or replace function public.register_space_banner(target_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: a member who may write, while uploads are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t add pictures right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there, the caller uploaded it, under a space whose settings they hold.
  if not public.space_banner_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'space-banners'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to a space you can change.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'space-banners', target_path, 'space_banner')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;
comment on function public.register_space_banner(text) is
  'Records a just-uploaded space banner as pending its check (FORUMS-2c).';
revoke execute on function public.register_space_banner(text) from public, anon;
grant execute on function public.register_space_banner(text) to authenticated;

/**
 * set_space_banner_picture: makes an uploaded picture the space's banner, or (with null) goes
 *   back to the drawn colour.
 * Inputs: slug; picture_id, a space_banner the caller registered under this space, or null.
 * Returns: JSON {"old_file": {bucket, path} or null}: the replaced picture's file, for the screen
 *   to delete (space_banners_delete_own decides whether it may).
 * Errors: space_for_power()'s (the settings power, S1-E8-07); check_violation (hint
 *   'picture:not_yours') for a picture that isn't the caller's banner for this space.
 * Logged: 'banner_picture_changed' in the space's log (criterion 2).
 */
create or replace function public.set_space_banner_picture(slug text, picture_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(set_space_banner_picture.slug, 'settings');
  old_file jsonb;
begin
  -- Step 1: the new picture is the caller's own banner, under this space's folder.
  if set_space_banner_picture.picture_id is not null and not exists (
      select 1 from public.picture_checks
      where picture_checks.id = set_space_banner_picture.picture_id
        and picture_checks.kind = 'space_banner' and picture_checks.deleted_at is null
        and picture_checks.user_id = (select auth.uid())
        and split_part(picture_checks.path, '/', 1) = space.id::text) then
    raise exception 'That picture isn''t a banner you uploaded for this space.' using errcode = 'check_violation', hint = 'picture:not_yours';
  end if;
  -- Step 2: the old picture is marked deleted, and its file handed back to delete.
  if space.banner_picture_id is not null
     and space.banner_picture_id is distinct from set_space_banner_picture.picture_id then
    update public.picture_checks set deleted_at = coalesce(deleted_at, now())
    where picture_checks.id = space.banner_picture_id
    returning jsonb_build_object('bucket', picture_checks.bucket, 'path', picture_checks.path) into old_file;
  end if;
  -- Step 3: the change, then the space's log.
  update public.spaces set banner_picture_id = set_space_banner_picture.picture_id, updated_at = now()
  where spaces.id = space.id;
  perform public.log_space_action(space, 'banner_picture_changed', null, null, null,
    jsonb_build_object('has_picture', set_space_banner_picture.picture_id is not null));
  return jsonb_build_object('old_file', old_file);
end;
$$;
comment on function public.set_space_banner_picture(text, uuid) is
  'Makes an uploaded picture a space''s banner, or goes back to the drawn colour; the settings power; logged (FORUMS-2c).';
revoke execute on function public.set_space_banner_picture(text, uuid) from public, anon;
grant execute on function public.set_space_banner_picture(text, uuid) to authenticated;

/**
 * space_json: as in FORUMS-2a, plus "banner_picture" (picture_state_json() of the uploaded banner,
 *   or null).
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
    -- FORUMS-2c: the uploaded banner picture, once its check passed (or, for whoever uploaded it
    -- and staff, while it is checked); null when the space uses a drawn colour.
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

/* ---------- Notifications for joining ---------- */

alter table public.notifications
  add column space_id uuid references public.spaces (id) on delete cascade;
comment on column public.notifications.space_id is
  'The space a join request or approval is about (FORUMS-2c).';
create index notifications_space on public.notifications (space_id) where space_id is not null;

/**
 * notify: as in S1-E10-07, and now also keeps "space_id" from about (FORUMS-2c).
 */
create or replace function public.notify(
  recipient_id uuid,
  notification_kind public.notification_kind,
  actor_id uuid,
  about jsonb,
  group_key text default null,
  group_window interval default null
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
  -- Step 3: a new row; a decision or an appeal's outcome can't be switched off (DSA art. 17, 20).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, notify.group_key, notification_kind in ('moderation_decision', 'appeal_decided'));
end;
$$;

/**
 * notification_json: as in IDEAS-1e, plus "space" ({slug, name}) while the reader may see it.
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    -- FORUMS-2c: the space a join request or approval is about, while the reader may see it.
    'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
              from public.spaces where spaces.id = target.space_id and spaces.deleted_at is null
                and public.space_card_visible(spaces)),
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/**
 * notification_category: as in IDEAS-1b; the two space kinds sit under Follows (people).
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
    else 'replies'
  end;
$$;

/**
 * notify_space_membership: the trigger on space_members that sends the join notifications.
 * - A new request ('pending'): to the owner and every moderator with the members power, grouped
 *   per space for a day so ten requests make one row ("ana and 9 others asked to join").
 * - A request let in ('pending' becomes 'active'): to the person, with no actor, so a staff
 *   member's name is never shown.
 * notify() skips anyone blocked either way, and the actor themselves.
 */
create or replace function public.notify_space_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  runner_id uuid;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    for runner_id in
      select spaces.user_id from public.spaces where spaces.id = new.space_id
      union
      select space_members.user_id from public.space_members
      where space_members.space_id = new.space_id and space_members.role = 'moderator'
        and space_members.status = 'active' and 'members' = any (space_members.powers)
    loop
      perform public.notify(runner_id, 'space_join_request', new.user_id,
        jsonb_build_object('space_id', new.space_id), 'space_requests:' || new.space_id::text, interval '1 day');
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'active' then
    perform public.notify(new.user_id, 'space_join_approved', null, jsonb_build_object('space_id', new.space_id));
  end if;
  return null;
end;
$$;
comment on function public.notify_space_membership() is
  'Internal: the join request and approval notifications (FORUMS-2c).';
revoke execute on function public.notify_space_membership() from public, anon, authenticated;

create trigger space_members_notify
  after insert or update of status on public.space_members
  for each row execute function public.notify_space_membership();

/* ---------- Staff's forum tools leave space forums alone ---------- */

/**
 * refuse_space_forum_change: a space's hidden forum keeps its address, place and state; staff's
 *   forum tools refuse to move, pin, restyle or remove it. Its names follow the space's name
 *   (write_space_forum_names(), which writes forum_names, not this table).
 * Errors: check_violation (hint 'forum:space').
 */
create or replace function public.refuse_space_forum_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.space_id is not null and (
       new.slug is distinct from old.slug or new.parent_id is distinct from old.parent_id
       or new.position is distinct from old.position or new.is_pinned is distinct from old.is_pinned
       or new.accent is distinct from old.accent or new.doodle is distinct from old.doodle
       or new.deleted_at is distinct from old.deleted_at or new.space_id is distinct from old.space_id) then
    raise exception 'A space''s forum belongs to its space.' using errcode = 'check_violation', hint = 'forum:space';
  end if;
  return new;
end;
$$;
comment on function public.refuse_space_forum_change() is
  'Internal: keeps staff''s forum tools off a space''s hidden forum (FORUMS-2c).';
revoke execute on function public.refuse_space_forum_change() from public, anon, authenticated;

create trigger forums_refuse_space_forum_change
  before update on public.forums
  for each row execute function public.refuse_space_forum_change();
