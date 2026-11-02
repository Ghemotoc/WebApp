/*
 * Migration: forum signatures and moderators' requests to change a signature or a space banner
 * (bundle FORUMS-2, part d; story S1-E8-08; boards 6.1 "Forum signature" and 5.2's signature line).
 *
 * What it adds:
 * - profiles.signature (plain text, at most 300 characters and three lines) and
 *   profiles.signature_picture_id (one still picture, checked like every picture, rule 19), saved
 *   with set_my_signature(). A private `signature-pictures` bucket, register_signature_picture().
 * - signature_json(): what a thread page, the profile and Settings show; forum_post_json() sends
 *   it with every post, and the screen hides it on phones (Q25). profile_signature() for the
 *   profile, my_signature() for Settings.
 * - customisation_change_requests: a moderator asks the person to change their signature or their
 *   space's banner picture (admin_request_customisation_change()); the person is told, and if it
 *   is still unchanged after 24 hours remove_unchanged_customisations() takes it off and sends a
 *   statement of reasons (S1-E8-08 criterion 3, Q29; DSA art. 17). Changing it in time closes
 *   the request.
 * - notifications.change_request_id, with notify(), notification_json() and
 *   notification_category() learning the new kind ('staff': it can't be switched off).
 * Who calls it: Settings › Forum signature, the thread page, the profile, Staff › Users and the
 *   space settings page (for staff). What it calls: the picture check (S1-E10-05), notify()
 *   (S1-E7-01) and issue_statement_of_reasons() (S1-E10-04).
 */

/* ---------- The signature on the profile ---------- */

alter table public.profiles
  add column signature text,
  add column signature_picture_id uuid references public.picture_checks (id) on delete set null,
  -- Board 6.1 and criterion 1: at most 300 characters and three lines.
  add constraint profiles_signature_short check (
    signature is null or (char_length(signature) between 1 and 300
                          and array_length(string_to_array(signature, E'\n'), 1) <= 3));
comment on column public.profiles.signature is
  'The forum signature: plain text, at most 300 characters and three lines (S1-E8-08).';
comment on column public.profiles.signature_picture_id is
  'The signature''s one still picture, shown once its check passed (S1-E8-08).';

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners', 'signature-pictures'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind = 'space_banner' and bucket = 'space-banners')
  or (kind = 'signature_picture' and bucket = 'signature-pictures')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image', 'space_banner', 'signature_picture'));

-- Private: served only through signed URLs once the check passed; 1 MB is plenty for a small
-- still picture; the three picture types (GIF, the usual animated type, isn't one).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signature-pictures', 'signature-pictures', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * Policy signature_pictures_insert_own: a member adds a signature picture under a random name
 * while picture uploads are on (the same rule as a profile picture, avatar_upload_allowed()).
 */
create policy signature_pictures_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'signature-pictures' and public.avatar_upload_allowed(name));
comment on policy signature_pictures_insert_own on storage.objects is
  'Allows a member who may write to add a signature picture under a random name while picture_uploads is on (S1-E8-08).';

/**
 * Policy signature_pictures_select_visible: anyone reads a signature picture once its check
 * passed or a moderator approved it.
 */
create policy signature_pictures_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'signature-pictures' and public.picture_is_visible(bucket_id, name));
comment on policy signature_pictures_select_visible on storage.objects is
  'Allows anyone to read a signature picture once it passed its check or was approved (S1-E8-08).';

/**
 * Policy signature_pictures_select_uploader_and_staff: the uploader reads their own picture at
 * every stage, and moderation staff read the pictures they decide on.
 */
create policy signature_pictures_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'signature-pictures' and public.picture_reader_may_see(bucket_id, name));
comment on policy signature_pictures_select_uploader_and_staff on storage.objects is
  'Allows the uploader and moderation staff to read a signature picture at any stage of its check (S1-E8-08).';

/**
 * signature_picture_file_may_go: may the uploader delete this file now? True when no live, held,
 * removed or preserved picture still needs it (as space_banner_file_may_go(), FORUMS-2c).
 */
create or replace function public.signature_picture_file_may_go(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.picture_checks
    where picture_checks.bucket = 'signature-pictures' and picture_checks.path = object_name
      and (picture_checks.deleted_at is null
           or picture_checks.status in ('held', 'removed')
           or picture_checks.preserve_until is not null));
$$;
comment on function public.signature_picture_file_may_go(text) is
  'True when no live, held or preserved picture still needs this signature-pictures file (S1-E8-08).';
revoke execute on function public.signature_picture_file_may_go(text) from public, anon;
grant execute on function public.signature_picture_file_may_go(text) to authenticated;

/**
 * Policy signature_pictures_delete_own: the uploader deletes their own file once it is no longer
 * the signature's picture, unless moderators or the authorities still need it.
 */
create policy signature_pictures_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'signature-pictures' and owner_id = (select auth.uid())::text
         and public.signature_picture_file_may_go(name));
comment on policy signature_pictures_delete_own on storage.objects is
  'Allows the uploader to delete their own signature-pictures file once replaced, unless moderation or the authorities still need it (S1-E8-08).';

/**
 * register_signature_picture: records a signature picture the caller just uploaded, as pending
 *   its check.
 * Input: target_path ("<random ID>.<ending>" in `signature-pictures`).
 * Returns: the picture's ID, for /api/picture-check and then set_my_signature().
 * Errors: insufficient_privilege when signed out or read-only; feature_not_supported while
 *   picture_uploads is off; check_violation when the file isn't there or isn't the caller's;
 *   program_limit_exceeded over the hourly upload limit (S1-E10-12).
 */
create or replace function public.register_signature_picture(target_path text)
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
  -- Step 2: the file is there and the caller uploaded it.
  if not public.avatar_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'signature-pictures'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit, then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'signature-pictures', target_path, 'signature_picture')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;
comment on function public.register_signature_picture(text) is
  'Records a just-uploaded signature picture as pending its check (S1-E8-08).';
revoke execute on function public.register_signature_picture(text) from public, anon;
grant execute on function public.register_signature_picture(text) to authenticated;

/**
 * set_my_signature: saves the caller's forum signature.
 * Inputs: signature_text (plain text; blank removes it); picture_id, a signature picture the
 *   caller registered, or null for none.
 * Returns: JSON {"old_file": {bucket, path} or null}: a replaced picture's file, for the screen
 *   to delete.
 * Errors: insufficient_privilege (read-only accounts); check_violation with hint
 *   'signature:too_long' (over 300 characters), 'signature:too_many_lines' (over three) or
 *   'picture:not_yours'.
 * Saving closes a moderator's open request to change the signature (the trigger below).
 */
create or replace function public.set_my_signature(signature_text text, picture_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  cleaned text := nullif(btrim(replace(coalesce(signature_text, ''), E'\r', ''), E' \n\t'), '');
  me public.profiles;
  old_file jsonb;
begin
  -- Step 1: an account that may write.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t change its signature right now.' using errcode = 'insufficient_privilege';
  end if;
  select * into me from public.profiles where profiles.id = caller_id;
  -- Step 2: the limits (criterion 1), with a hint the screen turns into words.
  if char_length(coalesce(cleaned, '')) > 300 then
    raise exception 'A signature is at most 300 characters.' using errcode = 'check_violation', hint = 'signature:too_long';
  end if;
  if array_length(string_to_array(coalesce(cleaned, ''), E'\n'), 1) > 3 then
    raise exception 'A signature is at most three lines.' using errcode = 'check_violation', hint = 'signature:too_many_lines';
  end if;
  -- Step 3: the picture is the caller's own signature picture.
  if set_my_signature.picture_id is not null and not exists (
      select 1 from public.picture_checks
      where picture_checks.id = set_my_signature.picture_id and picture_checks.kind = 'signature_picture'
        and picture_checks.user_id = caller_id and picture_checks.deleted_at is null) then
    raise exception 'That picture isn''t yours.' using errcode = 'check_violation', hint = 'picture:not_yours';
  end if;
  -- Step 4: a replaced picture is marked deleted and its file handed back.
  if me.signature_picture_id is not null and me.signature_picture_id is distinct from set_my_signature.picture_id then
    update public.picture_checks set deleted_at = coalesce(deleted_at, now())
    where picture_checks.id = me.signature_picture_id
    returning jsonb_build_object('bucket', picture_checks.bucket, 'path', picture_checks.path) into old_file;
  end if;
  -- Step 5: the change.
  update public.profiles set signature = cleaned, signature_picture_id = set_my_signature.picture_id,
    updated_at = now()
  where profiles.id = caller_id;
  return jsonb_build_object('old_file', old_file);
end;
$$;
comment on function public.set_my_signature(text, uuid) is
  'Saves the caller''s forum signature: 300 characters, three lines, one still picture (S1-E8-08).';
revoke execute on function public.set_my_signature(text, uuid) from public, anon;
grant execute on function public.set_my_signature(text, uuid) to authenticated;

/**
 * signature_json: one person's signature as the screens draw it.
 * Input: person_id. Returns: {"text", "picture"} (picture_state_json() or null), or null when the
 *   person has none, their account is deleted or a moderator hid or removed their profile.
 * Internal: forum_post_json(), profile_signature() and my_signature().
 */
create or replace function public.signature_json(person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'text', profiles.signature,
    'picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                where picture_checks.id = profiles.signature_picture_id and picture_checks.deleted_at is null))
  from public.profiles
  where profiles.id = person_id and profiles.deleted_at is null
    and (profiles.signature is not null or profiles.signature_picture_id is not null)
    and (person_id = (select auth.uid()) or not public.is_moderated_away('profile', person_id));
$$;
comment on function public.signature_json(uuid) is
  'Internal: a person''s forum signature as the screens draw it, never their user ID (S1-E8-08).';
revoke execute on function public.signature_json(uuid) from public, anon, authenticated;

/**
 * profile_signature: the signature on a profile page (board 6.1).
 * Input: wanted_handle. Returns: signature_json(), or null when there is none or the caller may
 *   not see the profile (blocked, or a profile limited by its owner's privacy choice, S1-E13-01).
 */
create or replace function public.profile_signature(wanted_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.signature_json(writer.id)
  from public.profile_for_handle(wanted_handle) as writer
  where public.profile_is_open_to(writer, (select auth.uid()))
    and not exists (select 1 from public.blocks
                    where blocks.user_id = writer.id and blocks.blocked_user_id = (select auth.uid()));
$$;
comment on function public.profile_signature(text) is
  'The forum signature shown on a profile, by the profile''s own visibility rules (S1-E8-08).';
grant execute on function public.profile_signature(text) to anon, authenticated;

/* ---------- Moderators' requests to change a signature or a banner (criterion 3) ---------- */

create table public.customisation_change_requests (
  id uuid primary key default gen_random_uuid(),
  -- The person asked to change it: the signature's owner, or the space's owner.
  user_id uuid not null references public.profiles (id) on delete cascade,
  item text not null constraint customisation_change_requests_item_is_known
    check (item in ('signature', 'space_banner')),
  space_id uuid references public.spaces (id) on delete cascade,
  requested_by_user_id uuid references public.profiles (id) on delete set null,
  reason text not null constraint customisation_change_requests_reason_short
    check (char_length(btrim(reason)) between 1 and 500),
  -- Q29: removed if not changed within 24 hours.
  due_at timestamptz not null default now() + interval '24 hours',
  resolved_at timestamptz,
  outcome text constraint customisation_change_requests_outcome_is_known
    check (outcome in ('changed', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customisation_change_requests_space_for_banner
    check ((item = 'space_banner') = (space_id is not null))
);
comment on table public.customisation_change_requests is
  'kind: user_action
A moderator''s request to change a signature or a space banner within 24 hours (S1-E8-08, Q29).';
create index customisation_change_requests_open on public.customisation_change_requests (due_at)
  where resolved_at is null;
create index customisation_change_requests_user on public.customisation_change_requests (user_id);
alter table public.customisation_change_requests enable row level security;
grant select on public.customisation_change_requests to authenticated;

/**
 * Policy customisation_change_requests_select_own_or_staff: the person asked reads their own
 * requests (Settings shows what to change and by when); moderation staff read them all. Nobody
 * writes directly: admin_request_customisation_change() and the job do.
 */
create policy customisation_change_requests_select_own_or_staff
  on public.customisation_change_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.staff_may('moderation', 'view'));
comment on policy customisation_change_requests_select_own_or_staff on public.customisation_change_requests is
  'Allows the person asked, and moderation staff, to read a change request (S1-E8-08).';

alter table public.notifications
  add column change_request_id uuid references public.customisation_change_requests (id) on delete cascade;
comment on column public.notifications.change_request_id is
  'The change request a notification is about (S1-E8-08).';

/**
 * admin_request_customisation_change: a moderator asks a person to change their signature or their
 *   space's banner picture (criterion 3).
 * Inputs: item ('signature' or 'space_banner'); reference (a username for a signature, a space's
 *   address for a banner); reason (what is wrong, which the person reads; 1 to 500 characters).
 * Returns: the request's ID.
 * Errors: insufficient_privilege for anyone without moderation powers; no_data_found (hint
 *   'change:nothing') when there is no such signature or banner; unique_violation (hint
 *   'change:open') when a request is already open; check_violation for a blank reason.
 * Logged in the audit log; the person is told at once, with the reason and the time left.
 */
create or replace function public.admin_request_customisation_change(item text, reference text, reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  target_space_id uuid;
  new_id uuid;
begin
  -- Step 1: moderation staff only, in a staff session.
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderators can do that.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: whose signature or banner it is; there must be one to change.
  if admin_request_customisation_change.item = 'signature' then
    select profiles.id into owner_id from public.profile_for_handle(reference) as profiles
    where profiles.signature is not null or profiles.signature_picture_id is not null;
  elsif admin_request_customisation_change.item = 'space_banner' then
    select spaces.user_id, spaces.id into owner_id, target_space_id from public.spaces
    where spaces.slug = btrim(reference) and spaces.deleted_at is null and spaces.banner_picture_id is not null;
  end if;
  if owner_id is null then
    raise exception 'There is nothing to change.' using errcode = 'no_data_found', hint = 'change:nothing';
  end if;
  -- Step 3: one open request at a time.
  if exists (select 1 from public.customisation_change_requests as requests
             where requests.user_id = owner_id and requests.item = admin_request_customisation_change.item
               and requests.space_id is not distinct from target_space_id and requests.resolved_at is null) then
    raise exception 'A request is already open.' using errcode = 'unique_violation', hint = 'change:open';
  end if;
  -- Step 4: the request, the person's notification and the audit log.
  insert into public.customisation_change_requests (user_id, item, space_id, requested_by_user_id, reason)
  values (owner_id, admin_request_customisation_change.item, target_space_id, (select auth.uid()), btrim(reason))
  returning id into new_id;
  perform public.notify(owner_id, 'customisation_change_requested', null,
    jsonb_build_object('change_request_id', new_id, 'space_id', target_space_id));
  perform public.log_staff_action('customisation.change_requested', 'customisation_change_requests',
    new_id::text, owner_id, btrim(reason), null, jsonb_build_object('item', admin_request_customisation_change.item));
  return new_id;
end;
$$;
comment on function public.admin_request_customisation_change(text, text, text) is
  'A moderator asks a person to change their signature or space banner within 24 hours; logged (S1-E8-08).';
revoke execute on function public.admin_request_customisation_change(text, text, text) from public, anon;
grant execute on function public.admin_request_customisation_change(text, text, text) to authenticated;

/**
 * close_customisation_requests_on_change: when the person changes their signature (or their
 *   space's banner picture), their open request closes as 'changed'. Internal (triggers below).
 */
create or replace function public.close_customisation_requests_on_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'profiles' then
    update public.customisation_change_requests set resolved_at = now(), outcome = 'changed', updated_at = now()
    where customisation_change_requests.user_id = new.id and customisation_change_requests.item = 'signature'
      and customisation_change_requests.resolved_at is null;
  else
    update public.customisation_change_requests set resolved_at = now(), outcome = 'changed', updated_at = now()
    where customisation_change_requests.space_id = new.id and customisation_change_requests.item = 'space_banner'
      and customisation_change_requests.resolved_at is null;
  end if;
  return null;
end;
$$;
comment on function public.close_customisation_requests_on_change() is
  'Internal: a changed signature or banner closes its open change request (S1-E8-08).';
revoke execute on function public.close_customisation_requests_on_change() from public, anon, authenticated;

create trigger profiles_close_signature_requests
  after update of signature, signature_picture_id on public.profiles
  for each row when (old.signature is distinct from new.signature
                     or old.signature_picture_id is distinct from new.signature_picture_id)
  execute function public.close_customisation_requests_on_change();
create trigger spaces_close_banner_requests
  after update of banner_picture_id on public.spaces
  for each row when (old.banner_picture_id is distinct from new.banner_picture_id)
  execute function public.close_customisation_requests_on_change();

/**
 * remove_unchanged_customisations: the job that takes off a signature or banner a moderator asked
 *   to change when it is still unchanged after 24 hours (Q29), with a statement of reasons to the
 *   person (DSA art. 17). Returns: how many it removed. Runs every 10 minutes (pg_cron).
 */
create or replace function public.remove_unchanged_customisations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.customisation_change_requests;
  removed integer := 0;
begin
  for request in
    select * from public.customisation_change_requests
    where customisation_change_requests.resolved_at is null and customisation_change_requests.due_at <= now()
    order by customisation_change_requests.due_at
    for update skip locked
  loop
    -- Step 1: the request is closed first, so the change below doesn't count as the person's.
    update public.customisation_change_requests set resolved_at = now(), outcome = 'removed', updated_at = now()
    where customisation_change_requests.id = request.id;
    -- Step 2: the signature (words and picture) or the banner picture comes off; the picture's
    -- file stays until the storage sweep, as for every removed picture.
    if request.item = 'signature' then
      update public.picture_checks set deleted_at = coalesce(deleted_at, now())
      where picture_checks.id = (select profiles.signature_picture_id from public.profiles where profiles.id = request.user_id);
      update public.profiles set signature = null, signature_picture_id = null, updated_at = now()
      where profiles.id = request.user_id;
    else
      update public.picture_checks set deleted_at = coalesce(deleted_at, now())
      where picture_checks.id = (select spaces.banner_picture_id from public.spaces where spaces.id = request.space_id);
      update public.spaces set banner_picture_id = null, updated_at = now() where spaces.id = request.space_id;
    end if;
    -- Step 3: the statement of reasons, which also tells the person (DSA art. 17).
    perform public.issue_statement_of_reasons(request.user_id, 'remove', 'terms', 'community_rules',
      request.reason,
      case when request.item = 'signature'
           then jsonb_build_object('item_type', 'profile', 'item_id', request.user_id)
           else jsonb_build_object('item_type', 'space', 'item_id', request.space_id) end);
    removed := removed + 1;
  end loop;
  return removed;
end;
$$;
comment on function public.remove_unchanged_customisations() is
  'Job: removes a signature or banner still unchanged 24 hours after a moderator asked, with a statement of reasons (S1-E8-08, Q29).';
revoke execute on function public.remove_unchanged_customisations() from public, anon, authenticated;

select cron.schedule('remove-unchanged-customisations', '*/10 * * * *', 'select public.remove_unchanged_customisations()');

/**
 * my_signature: the caller's own signature for Settings, with a moderator's open request.
 * Returns: {"signature": signature_json() or null, "change_request": {reason, due_at} or null}.
 */
create or replace function public.my_signature()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'signature', public.signature_json((select auth.uid())),
    'change_request', (select jsonb_build_object('reason', requests.reason, 'due_at', requests.due_at)
                       from public.customisation_change_requests as requests
                       where requests.user_id = (select auth.uid()) and requests.item = 'signature'
                         and requests.resolved_at is null
                       order by requests.created_at desc limit 1));
$$;
comment on function public.my_signature() is
  'The caller''s own forum signature and any open request to change it, for Settings (S1-E8-08).';
revoke execute on function public.my_signature() from public, anon;
grant execute on function public.my_signature() to authenticated;

/**
 * space_banner_change_request: an open moderator's request to change a space's banner picture,
 *   for the owner and staff on the settings page.
 * Input: slug. Returns: {reason, due_at} or null.
 */
create or replace function public.space_banner_change_request(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('reason', requests.reason, 'due_at', requests.due_at)
  from public.customisation_change_requests as requests
  join public.spaces on spaces.id = requests.space_id
  where spaces.slug = space_banner_change_request.slug and requests.resolved_at is null
    and (spaces.user_id = (select auth.uid()) or public.space_may_act(spaces, 'settings'))
  order by requests.created_at desc limit 1;
$$;
comment on function public.space_banner_change_request(text) is
  'An open request to change a space''s banner, for those who may change it (S1-E8-08).';
revoke execute on function public.space_banner_change_request(text) from public, anon;
grant execute on function public.space_banner_change_request(text) to authenticated;

/* ---------- Notifications learn the change request ---------- */

/**
 * notify: as in FORUMS-2c, and now also keeps "change_request_id" from about; a change request
 * can't be switched off, like a decision (S1-E8-08).
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
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested'));
end;
$$;

/**
 * notification_json: as in FORUMS-2c, plus "change_request" (S1-E8-08).
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
    -- FORUMS-2d: what a moderator asked the person to change, why, and by when.
    'change_request', (select jsonb_build_object('item', requests.item, 'reason', requests.reason,
                         'due_at', requests.due_at, 'is_open', requests.resolved_at is null,
                         'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
                                   from public.spaces where spaces.id = requests.space_id))
                       from public.customisation_change_requests as requests
                       where requests.id = target.change_request_id),
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/**
 * notification_category: as in FORUMS-2c; a change request is the moderation team's (S1-E8-08).
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
    else 'replies'
  end;
$$;

/* ---------- Posts carry their author's signature ---------- */

/**
 * forum_post_json: as in FORUMS-1c, plus "signature" (signature_json() of the author).
 */
create or replace function public.forum_post_json(target public.forum_posts, starter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.forum_post_state_for_caller(target);
  is_own boolean := caller_id is not null and target.user_id = caller_id;
  is_shown boolean := state in ('live', 'hidden');
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
    'signature', case when is_shown then public.signature_json(target.user_id) end);
end;
$$;
comment on function public.forum_post_json(public.forum_posts, uuid) is
  'Internal: one post as the thread page draws it, with its quotes and its author''s signature, never a user ID (S1-E8-02, S1-E8-03, S1-E8-08).';
revoke execute on function public.forum_post_json(public.forum_posts, uuid) from public, anon, authenticated;

/* ---------- Data rights ---------- */

/**
 * data_export_tables: as in FORUMS-2b, plus customisation_change_requests (S1-E8-08).
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
    ('customisation_change_requests', true, null),
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
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08).';

/**
 * account_deletion_rules: as in FORUMS-2b, plus customisation_change_requests: deleted with the
 * account, since the statements of reasons keep what was removed (S1-E8-08).
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
    ('customisation_change_requests', 'delete', 1, null),
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
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08).';
