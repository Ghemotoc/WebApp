/*
 * Migration: brand pictures, the logos and emblems staff upload (bundle BRAND-1, part a; Robert,
 * 4 Nov 2026, 14:25 UTC: "space in the admin panel to add light theme and dark theme logos and
 * emblems (emblems apply to favicon)").
 *
 * What it adds:
 * - The private `brand-assets` bucket. Owner and admin upload a logo or an emblem under
 *   "<slot>/<random ID>.<ending>"; register_brand_picture() records the file as pending and the
 *   picture check runs as for every upload (CLAUDE.md rule 19). The logo is seen by everyone,
 *   so a moderator approves it too, like a landing page picture (picture_needs_person()).
 * - brand_assets: which picture fills each of the four slots (brand_asset_slot). One row per
 *   slot; no row means the app shows its bundled default (Nicole's cat, a placeholder). A new
 *   picture waits for its check and a moderator; meanwhile the slot keeps the one before it, so
 *   the logo doesn't fall back to the default during moderation.
 * - admin_set_brand_asset(), admin_clear_brand_asset() and admin_brand_assets() for the staff
 *   page, each writing the audit log in the same transaction (architecture 1.8.1).
 * - brand_assets_published(): the slots whose picture passed its check and was approved, for
 *   the app's top bar and browser tab icon. A new picture that is still being checked or waits
 *   for a moderator is left out and the slot's earlier picture shows instead; with neither, the
 *   bundled default shows.
 * Who calls it: the brand store (src/features/branding/api/brandAssets.ts) and the picture upload
 * helpers (src/features/pictures/api/pictures.ts). Tests:
 * supabase/tests/database/290-brand-assets.test.sql.
 */

/* ---------- 1. The bucket and its rules ---------- */

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners',
                    'signature-pictures', 'landing-pictures', 'sponsor-creatives', 'brand-assets'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind = 'space_banner' and bucket = 'space-banners')
  or (kind = 'signature_picture' and bucket = 'signature-pictures')
  or (kind = 'landing_picture' and bucket = 'landing-pictures')
  or (kind = 'sponsor_creative' and bucket = 'sponsor-creatives')
  or (kind = 'brand_asset' and bucket = 'brand-assets')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image', 'space_banner',
                  'signature_picture', 'landing_picture', 'sponsor_creative', 'brand_asset'));

-- Private: served only through signed URLs once the check passed; 2 MB is plenty for a logo.
-- PNG and WebP keep a transparent background; JPEG is accepted like every other upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * brand_picture_upload_allowed: may the signed-in person add this file to `brand-assets`?
 * Input: object_name, "<slot>/<random ID>.<ending>". Returns: true only while picture_uploads is
 *   on, for owner and admin (the website area), under one of the four slot folders.
 * Where it fits: the brand_assets_insert_website_staff policy and register_brand_picture().
 */
create or replace function public.brand_picture_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('picture_uploads')
    and public.staff_may('website_cms', 'act')
    and coalesce(object_name, '') ~ '^(logo_light|logo_dark|emblem_light|emblem_dark)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$';
$$;
comment on function public.brand_picture_upload_allowed(text) is
  'True for owner and admin, a random file name under a brand slot''s folder and picture_uploads on (BRAND-1a).';
revoke execute on function public.brand_picture_upload_allowed(text) from public, anon;
grant execute on function public.brand_picture_upload_allowed(text) to authenticated;

/**
 * Policy brand_assets_insert_website_staff: owner and admin add a logo or an emblem under its
 * slot's folder while picture uploads are on.
 */
create policy brand_assets_insert_website_staff
  on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.brand_picture_upload_allowed(name));
comment on policy brand_assets_insert_website_staff on storage.objects is
  'Allows owner and admin to add a logo or emblem under its slot''s folder while picture_uploads is on (BRAND-1a).';

/**
 * Policy brand_assets_select_visible: anyone, signed in or not, reads a brand picture once its
 * check passed and a moderator approved it (S1-E10-05 criterion 2). The app shows the logo to
 * every visitor, so this is the one read it needs.
 */
create policy brand_assets_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'brand-assets' and public.picture_is_visible(bucket_id, name));
comment on policy brand_assets_select_visible on storage.objects is
  'Allows anyone to read a brand picture once it passed its check and was approved (BRAND-1a).';

/**
 * Policy brand_assets_select_uploader_and_staff: the uploader reads their picture at every stage
 * (for the preview on the staff page), and moderation staff read the pictures they decide on.
 */
create policy brand_assets_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and public.picture_reader_may_see(bucket_id, name));
comment on policy brand_assets_select_uploader_and_staff on storage.objects is
  'Allows the uploader and moderation staff to read a brand picture at any stage of its check (BRAND-1a).';

/**
 * picture_needs_person: must a moderator approve this picture before anyone else sees it?
 * Input: the picture. Returns: true for a picture in a story rated All ages or 13+, for any
 *   picture uploaded by someone under 16 (brief section 2), for every landing page picture
 *   (CONTESTS-a2a), every sponsor creative (SPONSORS-b1) and, from BRAND-1a, every brand picture,
 *   because the logo is on every screen for every age.
 * Internal: record_picture_check(), admin_pictures_to_check().
 */
create or replace function public.picture_needs_person(picture public.picture_checks)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.age_band_of(picture.user_id) in ('under_13', '13_to_15')
    or picture.kind in ('landing_picture', 'sponsor_creative', 'brand_asset')
    or exists (select 1 from public.stories
               where stories.id = picture.story_id and stories.rating in ('all_ages', '13_plus'));
$$;

/**
 * register_brand_picture: records a logo or emblem an admin just uploaded, as pending its check.
 * Input: target_path ("<slot>/<random ID>.<ending>" in `brand-assets`).
 * Returns: the picture's ID, which the staff page sends to /api/picture-check and then to
 *   admin_set_brand_asset().
 * Errors: insufficient_privilege for anyone but owner and admin; feature_not_supported while
 *   picture_uploads is off; check_violation when the file isn't there, isn't the caller's or
 *   isn't under a slot's folder; program_limit_exceeded over the hourly upload limit (S1-E10-12).
 * Where it fits: uploadBrandPicture(), straight after the upload.
 */
create or replace function public.register_brand_picture(target_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: owner or admin, while uploads are on.
  perform public.require_website_staff();
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there, the caller uploaded it, under a slot's folder.
  if not public.brand_picture_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'brand-assets'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded as a logo or emblem.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'brand-assets', target_path, 'brand_asset')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;
comment on function public.register_brand_picture(text) is
  'Records a just-uploaded logo or emblem as pending its check; owner and admin only (BRAND-1a).';
revoke execute on function public.register_brand_picture(text) from public, anon;
grant execute on function public.register_brand_picture(text) to authenticated;

/* ---------- 2. Which picture fills each slot ---------- */

/**
 * brand_assets: the picture chosen for each brand slot. One row per slot; no row means the app's
 * bundled default. picture_id is the newest choice; earlier_picture_id is the approved picture it
 * replaced, shown until the newest is approved. user_id is the staff member who last chose
 * (CLAUDE.md rule 15); the full history is in the audit log, so clearing a slot deletes its row
 * instead of soft-deleting it.
 */
create table public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  slot public.brand_asset_slot not null unique,
  picture_id uuid not null references public.picture_checks (id),
  earlier_picture_id uuid references public.picture_checks (id),
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.brand_assets is
  'kind: staff; the logo and emblem pictures chosen for the light and night themes; one row per slot (BRAND-1a).';

alter table public.brand_assets enable row level security;

/**
 * Policy brand_assets_select_website_staff: owner and admin read which picture fills each slot.
 * Everyone else reads the approved ones through brand_assets_published(), which never shows who
 * chose them.
 */
create policy brand_assets_select_website_staff
  on public.brand_assets for select to authenticated
  using (public.staff_may('website_cms', 'act'));
comment on policy brand_assets_select_website_staff on public.brand_assets is
  'Allows owner and admin to read the brand slots; changes go only through admin_* functions (BRAND-1a).';

-- Exactly what the policy needs (table grants rule; test 003). Changes go through functions.
grant select on public.brand_assets to authenticated;

/**
 * brand_shown_picture: the picture a slot shows today. Internal.
 * Input: the slot's row. Returns: the newest picture when it passed its check and was approved,
 *   otherwise the earlier one when that is still approved, otherwise null (the default shows).
 * Where it fits: brand_assets_published() and admin_set_brand_asset().
 */
create or replace function public.brand_shown_picture(brand_row public.brand_assets)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select picture_checks.id
  from public.picture_checks
  where picture_checks.id in (brand_row.picture_id, brand_row.earlier_picture_id)
    and public.picture_is_visible(picture_checks.bucket, picture_checks.path)
  order by (picture_checks.id = brand_row.picture_id) desc
  limit 1;
$$;
comment on function public.brand_shown_picture(public.brand_assets) is
  'Internal: the approved picture a brand slot shows, the newest first (BRAND-1a).';
revoke execute on function public.brand_shown_picture(public.brand_assets) from public, anon, authenticated;

/**
 * brand_slot_json: one slot for the staff page. Internal.
 * Input: the slot's row. Returns: {picture_id, state, bucket, path} (picture_state_json()) for
 *   the newest picture, plus shows_earlier: true while the app still shows the earlier one.
 */
create or replace function public.brand_slot_json(brand_row public.brand_assets)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('picture_id', brand_row.picture_id,
      'shows_earlier', public.brand_shown_picture(brand_row) is distinct from brand_row.picture_id
                       and public.brand_shown_picture(brand_row) is not null)
    || coalesce(public.picture_state_json(picture_checks), '{}'::jsonb)
  from public.picture_checks
  where picture_checks.id = brand_row.picture_id;
$$;
comment on function public.brand_slot_json(public.brand_assets) is
  'Internal: a brand slot''s picture and its check state, for the staff page (BRAND-1a).';
revoke execute on function public.brand_slot_json(public.brand_assets) from public, anon, authenticated;

/**
 * admin_brand_assets: the four slots for Staff › Website › Branding.
 * Returns: {"<slot>": {picture_id, state, bucket, path}} for every slot that has a picture;
 *   a slot without one is left out (the page shows the default).
 * Errors: insufficient_privilege for anyone but owner and admin.
 * Where it fits: useBrandSlots() on the staff page, read again while a picture is being checked.
 */
create or replace function public.admin_brand_assets()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_website_staff();
  return (
    select coalesce(jsonb_object_agg(brand_assets.slot, public.brand_slot_json(brand_assets)), '{}'::jsonb)
    from public.brand_assets);
end;
$$;
comment on function public.admin_brand_assets() is
  'The brand slots with each picture''s check state; owner and admin only (BRAND-1a).';
revoke execute on function public.admin_brand_assets() from public, anon;
grant execute on function public.admin_brand_assets() to authenticated;

/**
 * admin_set_brand_asset: puts an uploaded picture in a slot.
 * Inputs: target_slot; target_picture_id, a brand picture registered under that slot's folder.
 *   It may still be waiting for its check: the app goes on showing the slot's approved picture
 *   (kept as earlier_picture_id), or the default, until this one is approved.
 * Returns: nothing. Writes the audit log ("website.brand_asset_set") with the picture before and
 *   after, in the same transaction.
 * Errors: insufficient_privilege for anyone but owner and admin; check_violation when the picture
 *   isn't a brand picture for that slot or was removed.
 * Where it fits: the staff page, straight after the upload and its check request.
 */
create or replace function public.admin_set_brand_asset(target_slot public.brand_asset_slot, target_picture_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier_picture_id uuid;
begin
  -- Step 1: owner or admin.
  perform public.require_website_staff();
  -- Step 2: a brand picture uploaded for this slot, not removed by moderation.
  if not exists (
    select 1 from public.picture_checks
    where picture_checks.id = target_picture_id and picture_checks.kind = 'brand_asset'
      and picture_checks.deleted_at is null and picture_checks.status <> 'removed'
      and split_part(picture_checks.path, '/', 1) = target_slot::text) then
    raise exception 'That picture isn''t a logo or emblem for this place.' using errcode = 'check_violation';
  end if;
  -- Step 3: remember what was there, then put the new picture in the slot. The picture the app
  -- shows now (the newest if approved, otherwise the earlier one) becomes the fallback.
  select brand_assets.picture_id into earlier_picture_id
  from public.brand_assets where brand_assets.slot = target_slot;
  insert into public.brand_assets (slot, picture_id, user_id)
  values (target_slot, target_picture_id, (select auth.uid()))
  on conflict (slot) do update
    set earlier_picture_id = public.brand_shown_picture(brand_assets),
        picture_id = excluded.picture_id, user_id = excluded.user_id, updated_at = now();
  -- Step 4: the audit log, in the same transaction (architecture 1.8.1).
  perform public.log_staff_action('website.brand_asset_set', 'brand_assets', target_slot::text, null, null,
    jsonb_build_object('picture_id', earlier_picture_id), jsonb_build_object('picture_id', target_picture_id));
end;
$$;
comment on function public.admin_set_brand_asset(public.brand_asset_slot, uuid) is
  'Puts an uploaded logo or emblem in its slot and logs it; owner and admin only (BRAND-1a).';
revoke execute on function public.admin_set_brand_asset(public.brand_asset_slot, uuid) from public, anon;
grant execute on function public.admin_set_brand_asset(public.brand_asset_slot, uuid) to authenticated;

/**
 * admin_clear_brand_asset: empties a slot, so the app shows its bundled default again.
 * Input: target_slot. Returns: nothing; an empty slot stays empty and logs nothing.
 * Writes the audit log ("website.brand_asset_cleared") with the picture that was there.
 * Errors: insufficient_privilege for anyone but owner and admin.
 * Where it fits: "Use the default" on the staff page.
 */
create or replace function public.admin_clear_brand_asset(target_slot public.brand_asset_slot)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier_picture_id uuid;
begin
  -- Step 1: owner or admin.
  perform public.require_website_staff();
  -- Step 2: take the row out; nothing to log when the slot was already empty.
  delete from public.brand_assets where brand_assets.slot = target_slot
  returning brand_assets.picture_id into earlier_picture_id;
  if earlier_picture_id is null then
    return;
  end if;
  -- Step 3: the audit log, in the same transaction.
  perform public.log_staff_action('website.brand_asset_cleared', 'brand_assets', target_slot::text, null, null,
    jsonb_build_object('picture_id', earlier_picture_id), null);
end;
$$;
comment on function public.admin_clear_brand_asset(public.brand_asset_slot) is
  'Empties a brand slot so the default shows again, and logs it; owner and admin only (BRAND-1a).';
revoke execute on function public.admin_clear_brand_asset(public.brand_asset_slot) from public, anon;
grant execute on function public.admin_clear_brand_asset(public.brand_asset_slot) to authenticated;

/**
 * brand_assets_published: the brand pictures everyone may see, for the top bar and the browser
 * tab icon.
 * Returns: one row per slot that shows an approved picture (brand_shown_picture()): the slot,
 *   the bucket and the path (the app asks Storage for a signed address). Never who
 *   chose it.
 * Where it fits: useBrandAssets() in the app shell, for visitors and members alike.
 */
create or replace function public.brand_assets_published()
returns table (slot public.brand_asset_slot, bucket text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select brand_assets.slot, picture_checks.bucket, picture_checks.path
  from public.brand_assets
  join public.picture_checks on picture_checks.id = public.brand_shown_picture(brand_assets)
  order by brand_assets.slot;
$$;
comment on function public.brand_assets_published() is
  'The approved logo and emblem pictures by slot, for every visitor (BRAND-1a).';
revoke execute on function public.brand_assets_published() from public;
grant execute on function public.brand_assets_published() to anon, authenticated;
