/*
 * Migration: a space's logo, and the board's fourteen banner colours (bundle G8b of the liquid
 * glass redesign; stories S1-E8-06 and S1-E8-07; design/boards/Space.dc.html, SpaceSettings.dc.html
 * and SpaceNew.dc.html).
 *
 * What it adds:
 * - Logos. The boards give every space an optional square logo ("Logo (optional)", "No logo? The
 *   space shows no picture at all."). It lives in the same private `space-banners` bucket and the
 *   same "<space ID>/<random ID>.<ending>" folder as the banner picture, so the bucket's storage
 *   policies (FORUMS-2c: settings power to add, visible once checked, uploader and staff while
 *   checked, the uploader deletes a file nobody needs any more) cover it unchanged. Its own kind,
 *   'space_logo', keeps it apart in the moderation queue and in the functions below.
 *   spaces.logo_picture_id, register_space_logo() and set_space_logo_picture(), logged in the
 *   space's log as 'logo_picture_changed'; space_json() hands it to the screens as logo_picture.
 * - Banner colours. Spaces on the retired 'night' and 'gold' move to their nearest board colours
 *   ('ink' and 'ember'), and a check keeps any space from going back to them.
 * Who calls it: the space settings and new space pages (SpaceLogoCard, SpaceBannerChoice) and every
 *   screen that reads a space. What it calls: the picture check (S1-E10-05) and log_space_action()
 *   (S1-E8-07).
 */

/* ---------- 1. Banner colours ---------- */

-- The two retired colours move to their nearest board colours (night blue → ink, dark gold → ember).
update public.spaces set banner = 'ink' where banner = 'night';
update public.spaces set banner = 'ember' where banner = 'gold';

alter table public.spaces add constraint spaces_banner_is_offered
  check (banner not in ('night', 'gold'));
comment on constraint spaces_banner_is_offered on public.spaces is
  'A space uses one of the fourteen banner colours the boards offer; night and gold are retired (G8b).';

/* ---------- 2. The logo column and its picture kind ---------- */

alter table public.spaces
  add column logo_picture_id uuid references public.picture_checks (id) on delete set null;
comment on column public.spaces.logo_picture_id is
  'The uploaded logo (G8b), shown once its check passed; null when the space has no logo.';
create index spaces_logo_picture on public.spaces (logo_picture_id) where logo_picture_id is not null;

-- A logo sits in the space-banners bucket, beside the banner picture.
alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind in ('space_banner', 'space_logo') and bucket = 'space-banners')
  or (kind = 'signature_picture' and bucket = 'signature-pictures')
  or (kind = 'landing_picture' and bucket = 'landing-pictures')
  or (kind = 'sponsor_creative' and bucket = 'sponsor-creatives')
  or (kind = 'brand_asset' and bucket = 'brand-assets')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image', 'space_banner',
                  'space_logo', 'signature_picture', 'landing_picture', 'sponsor_creative',
                  'brand_asset'));

/* ---------- 3. Registering and choosing a logo ---------- */

/**
 * register_space_logo: records a logo the caller just uploaded, as pending its check.
 * Input: target_path ("<space ID>/<random ID>.<ending>" in `space-banners`).
 * Returns: the picture's ID, which the screen sends to /api/picture-check and then gives to
 *   set_space_logo_picture().
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while picture_uploads is off; check_violation when the file isn't
 *   there, isn't the caller's or isn't under a space where they hold the settings power;
 *   program_limit_exceeded over the hourly upload limit (S1-E10-12).
 * Where it fits: uploadSpaceLogo(), straight after the upload; the same steps as
 *   register_space_banner() (FORUMS-2c), with the logo's own kind.
 */
create or replace function public.register_space_logo(target_path text)
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
  -- Step 2: the file is there, the caller uploaded it, under a space whose settings they hold
  -- (space_banner_upload_allowed() checks the folder and the power for both kinds of picture).
  if not public.space_banner_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'space-banners'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to a space you can change.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'space-banners', target_path, 'space_logo')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;
comment on function public.register_space_logo(text) is
  'Records a just-uploaded space logo as pending its check (G8b).';
revoke execute on function public.register_space_logo(text) from public, anon;
grant execute on function public.register_space_logo(text) to authenticated;

/**
 * set_space_logo_picture: makes an uploaded picture the space's logo, or (with null) takes the
 *   logo off.
 * Inputs: slug; picture_id, a space_logo the caller registered under this space, or null.
 * Returns: JSON {"old_file": {bucket, path} or null}: the replaced logo's file, for the screen to
 *   delete (space_banners_delete_own decides whether it may).
 * Errors: space_for_power()'s (the settings power, S1-E8-07); check_violation (hint
 *   'picture:not_yours') for a picture that isn't the caller's logo for this space, a banner
 *   picture included.
 * Logged: 'logo_picture_changed' in the space's log (S1-E8-07 criterion 2).
 */
create or replace function public.set_space_logo_picture(slug text, picture_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(set_space_logo_picture.slug, 'settings');
  old_file jsonb;
begin
  -- Step 1: the new picture is the caller's own logo, under this space's folder.
  if set_space_logo_picture.picture_id is not null and not exists (
      select 1 from public.picture_checks
      where picture_checks.id = set_space_logo_picture.picture_id
        and picture_checks.kind = 'space_logo' and picture_checks.deleted_at is null
        and picture_checks.user_id = (select auth.uid())
        and split_part(picture_checks.path, '/', 1) = space.id::text) then
    raise exception 'That picture isn''t a logo you uploaded for this space.' using errcode = 'check_violation', hint = 'picture:not_yours';
  end if;
  -- Step 2: the old logo is marked deleted, and its file handed back to delete.
  if space.logo_picture_id is not null
     and space.logo_picture_id is distinct from set_space_logo_picture.picture_id then
    update public.picture_checks set deleted_at = coalesce(deleted_at, now())
    where picture_checks.id = space.logo_picture_id
    returning jsonb_build_object('bucket', picture_checks.bucket, 'path', picture_checks.path) into old_file;
  end if;
  -- Step 3: the change, then the space's log.
  update public.spaces set logo_picture_id = set_space_logo_picture.picture_id, updated_at = now()
  where spaces.id = space.id;
  perform public.log_space_action(space, 'logo_picture_changed', null, null, null,
    jsonb_build_object('has_picture', set_space_logo_picture.picture_id is not null));
  return jsonb_build_object('old_file', old_file);
end;
$$;
comment on function public.set_space_logo_picture(text, uuid) is
  'Makes an uploaded picture a space''s logo, or takes the logo off; the settings power; logged (G8b).';
revoke execute on function public.set_space_logo_picture(text, uuid) from public, anon;
grant execute on function public.set_space_logo_picture(text, uuid) to authenticated;

/* ---------- 4. The space as the screens read it ---------- */

/**
 * space_json: as in CLASSES-d, plus "logo_picture" (picture_state_json() of the uploaded logo, or
 *   null). As with the banner picture, picture_state_json() hands the file's path only to whoever
 *   may see it: everyone once the check passed, the uploader and staff while it is checked.
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
    -- G8b: the space's logo, once uploaded; null when it has none (the boards then show no picture).
    'logo_picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                     where picture_checks.id = target.logo_picture_id
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
