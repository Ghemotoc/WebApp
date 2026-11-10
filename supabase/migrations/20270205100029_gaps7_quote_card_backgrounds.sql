/*
 * Migration: a quote card's picture backgrounds, "Story cover" and "Your own picture" (bundle
 * GAPS-7, parts b and c; story S1-E4-07, fourth criterion; design/boards/Share.dc.html:
 * "Background: Purple | Story cover | + Your own picture" and "Pictures are blurred automatically
 * so the words stay easy to read. Your own picture goes through our image check first, and you
 * must have the right to use it.").
 *
 * What it adds:
 * - share_options() also answers "cover": the story's cover as the card needs it (its kind, the
 *   drawn design and colours, and the story's ID for an automatic cover, which is drawn from it).
 *   A cover staff hid counts as automatic, as on every other screen (S1-E11-08).
 * - A private `quote-card-pictures` bucket for the reader's own background picture. Only the
 *   uploader and picture reviewers can ever read a file in it: the picture is used on the
 *   reader's own device to draw their card and is never shown to anyone else inside the app.
 *   It still goes through the picture check like every upload (CLAUDE.md rule 19), with the
 *   existing kind 'quote_card' (in picture_kind since S1-E10-05).
 * - register_quote_card_picture(): records the upload as pending its check and retires the
 *   caller's earlier one, so each person keeps one background picture at a time.
 * - my_quote_card_picture() and remove_my_quote_card_picture(): the caller's picture with its
 *   check state, and taking it away.
 * Who calls it: the quote card dialog (src/features/sharing/). What it calls: the picture check
 *   (S1-E10-05), take_rate_limit() (S1-E10-12) and shareable_chapter() (S1-E4-05).
 */

/* ---------- 1. The story's cover, for the card ---------- */

/**
 * share_options: as in IDEAS-1c, plus "cover".
 * Inputs: story_slug, chapter_code.
 * Returns: JSON {passages, pictures, card_colour, cover}. "cover" is null for a visitor or a
 *   chapter the caller can't read; otherwise {kind ('automatic', 'drawn' or 'upload'), story_id,
 *   design, background, accent}. The uploaded picture itself is read through
 *   story_cover_picture(), which applies the cover's own rules.
 * Errors: none; a caller who may share nothing gets false, false and nulls.
 */
create or replace function public.share_options(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  shared record;
  story public.stories;
  cover_kind public.cover_kind;
begin
  -- Step 1: a signed-in reader and a chapter they may read, or nothing at all.
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if (select auth.uid()) is null or not found then
    return jsonb_build_object('passages', false, 'pictures', false, 'card_colour', null, 'cover', null);
  end if;
  -- Step 2: the story, for the writer's switches, their card colour and the cover.
  select stories.* into story
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = shared.chapter_id;
  -- Step 3: a cover staff hid shows as the automatic one (S1-E11-08).
  cover_kind := case when story.cover_hidden_at is null then story.cover_kind else 'automatic' end;
  return jsonb_build_object(
    'passages', shared.quote_cards_enabled,
    -- The writer's picture switch, never for 16+ or 18+ (S1-E4-11, criterion 4).
    'pictures', coalesce(story.picture_sharing_enabled and public.story_shares_content(story.rating), false),
    'card_colour', story.card_colour,
    'cover', jsonb_build_object(
      'kind', cover_kind,
      -- The story's ID (never the writer's) draws the automatic cover (S1-E3-13).
      'story_id', story.id,
      'design', case when cover_kind = 'drawn' then story.cover_design end,
      'background', case when cover_kind = 'drawn' then story.cover_background end,
      'accent', case when cover_kind = 'drawn' then story.cover_accent end));
end;
$$;
comment on function public.share_options(text, text) is
  'Whether the caller may share passages and pictures from a chapter, the writer''s card colour and the story''s cover for the card (S1-E4-11, IDEAS-1c, GAPS-7).';

/* ---------- 2. The bucket for a reader's own background picture ---------- */

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners',
                    'signature-pictures', 'landing-pictures', 'sponsor-creatives', 'brand-assets',
                    'quote-card-pictures'));

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
  or (kind = 'quote_card' and bucket = 'quote-card-pictures'));

-- Private, 5 MB, the same three picture types as every other bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-card-pictures', 'quote-card-pictures', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/*
 * Policy quote_card_pictures_insert_own: a member who may write adds a background picture under
 * a random name (never their user ID, architecture 1.6) while picture_uploads is on.
 */
create policy quote_card_pictures_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-card-pictures' and public.avatar_upload_allowed(name));
comment on policy quote_card_pictures_insert_own on storage.objects is
  'Allows a member who may write to add a quote card background under a random name while picture_uploads is on (GAPS-7).';

/*
 * Policy quote_card_pictures_select_uploader_and_staff: only the uploader and picture reviewers
 * read a background picture, at any stage of its check. There is no policy for anyone else: the
 * picture is drawn on the uploader's own card and never shown inside the app.
 */
create policy quote_card_pictures_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'quote-card-pictures' and public.picture_reader_may_see(bucket_id, name));
comment on policy quote_card_pictures_select_uploader_and_staff on storage.objects is
  'Allows the uploader and picture reviewers to read a quote card background; nobody else ever can (GAPS-7).';

/**
 * quote_card_picture_file_may_go: may the uploader delete this file now? True when no live, held
 *   or preserved picture still needs it, so a file moderators or the authorities need stays.
 * Input: object_name (the file's name in `quote-card-pictures`). Returns: boolean.
 */
create or replace function public.quote_card_picture_file_may_go(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.picture_checks
    where picture_checks.bucket = 'quote-card-pictures' and picture_checks.path = object_name
      and (picture_checks.deleted_at is null
           or picture_checks.status in ('held', 'removed')
           or picture_checks.preserve_until is not null));
$$;
comment on function public.quote_card_picture_file_may_go(text) is
  'True when no live, held or preserved picture still needs this quote-card-pictures file (GAPS-7).';
revoke execute on function public.quote_card_picture_file_may_go(text) from public, anon;
grant execute on function public.quote_card_picture_file_may_go(text) to authenticated;

/*
 * Policy quote_card_pictures_delete_own: the uploader deletes their own file once it is no longer
 * their background picture, unless moderators or the authorities still need it.
 */
create policy quote_card_pictures_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'quote-card-pictures' and owner_id = (select auth.uid())::text
         and public.quote_card_picture_file_may_go(name));
comment on policy quote_card_pictures_delete_own on storage.objects is
  'Allows the uploader to delete their own quote-card-pictures file once replaced or removed, unless moderation or the authorities still need it (GAPS-7).';

/* ---------- 3. Registering, reading and removing the picture ---------- */

/**
 * register_quote_card_picture: records a background picture the caller just uploaded, as pending
 *   its check, and retires the one they had before (one per person).
 * Input: target_path ("<random ID>.<ending>" in `quote-card-pictures`).
 * Returns: the picture's ID, which the screen sends to /api/picture-check.
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while picture_uploads is off; check_violation when the file isn't
 *   there or isn't the caller's; program_limit_exceeded over the hourly upload limit (S1-E10-12).
 * Where it fits: uploadQuoteCardPicture(), straight after the upload.
 */
create or replace function public.register_quote_card_picture(target_path text)
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
     or not exists (select 1 from storage.objects where objects.bucket_id = 'quote-card-pictures'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit, then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'quote-card-pictures', target_path, 'quote_card')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  -- Step 4: the earlier background pictures are retired; a held or removed one keeps its row and
  -- file for the moderators (quote_card_picture_file_may_go()).
  update public.picture_checks set deleted_at = now()
  where picture_checks.user_id = caller_id and picture_checks.kind = 'quote_card'
    and picture_checks.id <> new_id and picture_checks.deleted_at is null;
  return new_id;
end;
$$;
comment on function public.register_quote_card_picture(text) is
  'Records a just-uploaded quote card background as pending its check and retires the caller''s earlier one (GAPS-7).';
revoke execute on function public.register_quote_card_picture(text) from public, anon;
grant execute on function public.register_quote_card_picture(text) to authenticated;

/**
 * my_quote_card_picture: the caller's own background picture.
 * Returns: picture_state_json() ({state, bucket, path}) of their live picture, or null when they
 *   have none or are signed out. The state says whether the card may use it yet: 'visible' once
 *   the check passed, 'checking' or 'waiting_for_person' before that, 'removed' when refused.
 * Where it fits: the quote card dialog's "Own picture" choice.
 */
create or replace function public.my_quote_card_picture()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.picture_checks
  where picture_checks.user_id = (select auth.uid()) and picture_checks.kind = 'quote_card'
    and picture_checks.deleted_at is null
  order by picture_checks.created_at desc
  limit 1;
$$;
comment on function public.my_quote_card_picture() is
  'The caller''s own quote card background: its check state and file (GAPS-7).';
revoke execute on function public.my_quote_card_picture() from public, anon;
grant execute on function public.my_quote_card_picture() to authenticated;

/**
 * remove_my_quote_card_picture: takes the caller's background picture away.
 * Returns: JSON {"old_file": {bucket, path} or null}: the file for the screen to delete
 *   (quote_card_pictures_delete_own decides whether it may: a held or removed picture's file
 *   stays for the moderators).
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.remove_my_quote_card_picture()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  old_file jsonb;
begin
  if caller_id is null then
    raise exception 'Sign in to change your picture.' using errcode = 'insufficient_privilege';
  end if;
  -- The newest live picture's file is handed back; every live one is retired.
  select jsonb_build_object('bucket', picture_checks.bucket, 'path', picture_checks.path) into old_file
  from public.picture_checks
  where picture_checks.user_id = caller_id and picture_checks.kind = 'quote_card'
    and picture_checks.deleted_at is null
  order by picture_checks.created_at desc
  limit 1;
  update public.picture_checks set deleted_at = now()
  where picture_checks.user_id = caller_id and picture_checks.kind = 'quote_card'
    and picture_checks.deleted_at is null;
  return jsonb_build_object('old_file', old_file);
end;
$$;
comment on function public.remove_my_quote_card_picture() is
  'Retires the caller''s quote card background and hands back its file to delete (GAPS-7).';
revoke execute on function public.remove_my_quote_card_picture() from public, anon;
grant execute on function public.remove_my_quote_card_picture() to authenticated;
