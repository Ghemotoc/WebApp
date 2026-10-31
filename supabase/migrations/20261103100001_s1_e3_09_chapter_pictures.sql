/*
 * Migration: pictures in chapters (story S1-E3-09; board 4.3 Editor, the Insert menu; architecture
 * B14 `chapter-images`, B15 the picture check).
 *
 * How a chapter picture travels:
 *   1. the writer picks Insert › Picture, chooses a JPEG, PNG or WebP up to 5 MB, writes its alt
 *      text and confirms they have the right to use it (criterion 1; notice and action applies);
 *   2. the screen redraws the file on a canvas before sending it, which drops the location and
 *      camera data and makes it at most 1,600 px wide (criterion 2;
 *      src/features/pictures/lib/preparePicture.ts);
 *   3. the file goes into the private `chapter-images` bucket under the chapter's ID, and
 *      register_chapter_picture() records it as pending with the rights confirmation; then the
 *      picture check runs exactly as for covers (S1-E10-05): a clean picture shows straight away,
 *      a flagged one is held for a person and readers see "Picture being checked" (criterion 3);
 *   4. the chapter text holds `![alt text](picture:<picture ID>)`; save_chapter_draft() refuses a
 *      reference to a picture that isn't the writer's own chapter picture, and one without alt
 *      text (CLAUDE.md rule 8: sanitised on save);
 *   5. get_chapter() sends each picture's state with the text, and its file only to someone who
 *      may see it; readers report a picture from the button under it (criterion 4, S1-E10-01).
 * What it adds: the `chapter-images` bucket and its storage rules, picture_checks.chapter_id and
 *   rights_confirmed_at, chapter_picture_upload_allowed(), register_chapter_picture(),
 *   chapter_picture_references(), check_chapter_pictures(), chapter_picture_states(),
 *   my_picture_states(), and new versions of count_words(), save_chapter_draft(), get_chapter(),
 *   reportable_item_summary() and notification_item_json() that know about chapter pictures.
 */

/* ---------- The table: two columns and the wider bucket rules ---------- */

-- The chapter a picture sits in, so its case, its summary and its notification can name it.
-- Set null if a chapter is ever purged: a preserved match (S1-E10-10) must outlive it.
alter table public.picture_checks
  add column chapter_id uuid references public.chapters (id) on delete set null,
  -- When the writer confirmed they may use the picture (S1-E3-09, legal: notice and action).
  add column rights_confirmed_at timestamptz;

comment on column public.picture_checks.chapter_id is
  'The chapter a chapter picture was uploaded for (S1-E3-09).';
comment on column public.picture_checks.rights_confirmed_at is
  'When the writer confirmed they have the right to use the picture (S1-E3-09).';

create index picture_checks_chapter_id_idx on public.picture_checks (chapter_id);

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing'));

-- A chapter picture is someone else's work unless the writer says otherwise: no row without the
-- confirmation (a drawing made in the editor, S1-E3-11, is the writer's own and needs none).
alter table public.picture_checks add constraint picture_checks_chapter_picture_rights_confirmed
  check (kind <> 'chapter_picture' or rights_confirmed_at is not null);

/* ---------- The bucket ---------- */

-- Private: served only through signed URLs; 5 MB; the three picture types (criterion 1).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chapter-images', 'chapter-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

insert into public.settings (key, value, is_public, description) values
  ('chapter_max_pictures', '30'::jsonb, true,
   'The most pictures one chapter may hold (S1-E3-09; proposal).')
on conflict (key) do nothing;

/**
 * chapter_picture_upload_allowed: may the signed-in person add this file to `chapter-images`?
 * Input: object_name, the path inside the bucket. Returns: true only while picture_uploads is on,
 *   for an account that may write (the account gate), for "<chapter ID>/<fresh random ID>.<ending>"
 *   where the chapter is the caller's own and not deleted. The file name is never the user ID
 *   (architecture 1.6: a file name ends up in a signed URL).
 * Where it fits: the chapter_images_insert_own policy and register_chapter_picture().
 */
create or replace function public.chapter_picture_upload_allowed(object_name text)
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
      select 1 from public.chapters
      where chapters.id = split_part(object_name, '/', 1)::uuid
        and chapters.user_id = (select auth.uid())
        and chapters.deleted_at is null);
$$;

comment on function public.chapter_picture_upload_allowed(text) is
  'True for the chapter''s writer, a random file name under the chapter''s ID and picture_uploads on (S1-E3-09).';
revoke execute on function public.chapter_picture_upload_allowed(text) from public, anon;
grant execute on function public.chapter_picture_upload_allowed(text) to authenticated;

/**
 * Policy chapter_images_insert_own: a writer adds a picture to their own chapter's folder while
 * uploads are on. Why: the file stays private until its check passes (S1-E10-05 criterion 1).
 */
create policy chapter_images_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chapter-images' and public.chapter_picture_upload_allowed(name));

comment on policy chapter_images_insert_own on storage.objects is
  'Allows a writer to add a picture under their own chapter''s folder while picture_uploads is on (S1-E3-09).';

/**
 * Policy chapter_images_select_visible: anyone reads a chapter picture once its check passed or a
 * moderator approved it (S1-E10-05 criterion 2). Its address is known only from get_chapter(),
 * which checks the story's rating, blocks and moderation first.
 */
create policy chapter_images_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'chapter-images' and public.picture_is_visible(bucket_id, name));

comment on policy chapter_images_select_visible on storage.objects is
  'Allows anyone to read a chapter picture once it passed its check or was approved (S1-E3-09).';

/**
 * Policy chapter_images_select_uploader_and_staff: the writer reads their own chapter picture at
 * every stage (the editor shows it with "Being checked"), and moderation staff read the pictures
 * they decide on (S1-E10-05 criterion 3).
 */
create policy chapter_images_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'chapter-images' and public.picture_reader_may_see(bucket_id, name));

comment on policy chapter_images_select_uploader_and_staff on storage.objects is
  'Allows the writer and moderation staff to read a chapter picture at any stage of its check (S1-E3-09).';

/* ---------- Registering a chapter picture ---------- */

/**
 * register_chapter_picture: records a picture the writer just uploaded for one of their chapters.
 * Inputs: target_path ("<chapter ID>/<random ID>.<ending>" in `chapter-images`) and
 *   rights_confirmed (the "I have the right to use this picture" box).
 * Returns: the picture's ID, which the screen sends to /api/picture-check and puts in the text.
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while picture_uploads is off; check_violation with hint
 *   rights_not_confirmed when the box wasn't ticked, or when the file isn't there, isn't the
 *   caller's or isn't under one of their chapters; program_limit_exceeded over the hourly upload
 *   limit (S1-E10-12).
 * Where it fits: the Insert picture dialog, straight after the upload (uploadChapterPicture()).
 */
create or replace function public.register_chapter_picture(target_path text, rights_confirmed boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  new_id uuid;
begin
  -- Step 1: a member who may write, while uploads are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t add pictures right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the writer confirmed the picture is theirs to use (notice and action applies).
  if rights_confirmed is distinct from true then
    raise exception 'Confirm you have the right to use this picture.'
      using errcode = 'check_violation', hint = 'rights_not_confirmed';
  end if;
  -- Step 3: the file is there, the caller uploaded it, and it sits under one of their chapters.
  if not public.chapter_picture_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'chapter-images'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to one of your chapters.' using errcode = 'check_violation';
  end if;
  select * into chapter from public.chapters where chapters.id = split_part(target_path, '/', 1)::uuid;
  -- Step 4: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind, story_id, chapter_id, rights_confirmed_at)
  values (caller_id, 'chapter-images', target_path, 'chapter_picture', chapter.story_id, chapter.id, now())
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;

comment on function public.register_chapter_picture(text, boolean) is
  'Records a just-uploaded chapter picture as pending, with the rights confirmation (S1-E3-09).';
revoke execute on function public.register_chapter_picture(text, boolean) from public, anon;
grant execute on function public.register_chapter_picture(text, boolean) to authenticated;

/* ---------- Pictures inside the chapter text ---------- */

/**
 * chapter_picture_references: every picture in a chapter body, in order.
 * Input: the body (the Markdown subset; a picture is `![alt text](picture:<ID>)`, with the alt
 *   text's own "]" and "\" backslash-escaped, as the editor writes it, ADR 0005).
 * Returns: one row per picture: its ID and its alt text with the escapes taken out.
 * Errors: none. Where it fits: check_chapter_pictures(), chapter_picture_states() and count_words().
 */
create or replace function public.chapter_picture_references(body text)
returns table (picture_id uuid, alt_text text)
language sql
immutable
set search_path = ''
as $$
  select (found_reference[2])::uuid, regexp_replace(found_reference[1], '\\(.)', '\1', 'g')
  from regexp_matches(coalesce(body, ''),
    '!\[((?:[^]\\]|\\.)*)\]\(picture:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)', 'g')
    as found_reference;
$$;

comment on function public.chapter_picture_references(text) is
  'Internal: the pictures in a chapter body, ID and alt text, in order (S1-E3-09).';
revoke execute on function public.chapter_picture_references(text) from public, anon, authenticated;

/**
 * check_chapter_pictures: the save-time rules for pictures in a chapter body (CLAUDE.md rule 8).
 * Inputs: the body and the chapter's writer.
 * Errors (check_violation, with the hint the editor shows): too_many_pictures over the setting
 *   chapter_max_pictures; picture_needs_alt when a picture has no alt text (criterion 1);
 *   alt_too_long over 300 characters; picture_unknown for a picture that isn't one of the
 *   writer's own chapter pictures or drawings, so a text can't show someone else's file or one
 *   that skipped the check. A picture a moderator removed stays allowed: the reader shows
 *   "[Removed by the moderation team]" in its place and the writer can still save.
 * Where it fits: save_chapter_draft(), after check_chapter_text().
 */
create or replace function public.check_chapter_pictures(body text, owner_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  most_pictures integer := coalesce((public.setting_value('chapter_max_pictures'))::integer, 30);
  reference record;
begin
  if (select count(*) from public.chapter_picture_references(body)) > most_pictures then
    raise exception 'A chapter can hold at most % pictures (S1-E3-09).', most_pictures
      using errcode = 'check_violation', hint = 'too_many_pictures';
  end if;
  for reference in select * from public.chapter_picture_references(body) loop
    if btrim(reference.alt_text) = '' then
      raise exception 'Every picture needs alt text (S1-E3-09).'
        using errcode = 'check_violation', hint = 'picture_needs_alt';
    end if;
    if char_length(reference.alt_text) > 300 then
      raise exception 'Alt text can have at most 300 characters (S1-E3-09).'
        using errcode = 'check_violation', hint = 'alt_too_long';
    end if;
    if not exists (select 1 from public.picture_checks
                   where picture_checks.id = reference.picture_id and picture_checks.user_id = owner_id
                     and picture_checks.kind in ('chapter_picture', 'drawing')
                     and picture_checks.deleted_at is null) then
      raise exception 'That picture isn''t one of yours (S1-E3-09).'
        using errcode = 'check_violation', hint = 'picture_unknown';
    end if;
  end loop;
end;
$$;

comment on function public.check_chapter_pictures(text, uuid) is
  'Internal: refuses a chapter picture without alt text, too many, or one that isn''t the writer''s own (S1-E3-09).';
revoke execute on function public.check_chapter_pictures(text, uuid) from public, anon, authenticated;

/**
 * chapter_picture_states: the state of every picture in a text, for the screen to draw.
 * Inputs: the text being sent and the chapter's writer. Returns: {"<picture ID>": picture_state_json}
 *   for the writer's own chapter pictures in it; {} when there are none. Only what the caller may
 *   see carries the file (picture_state_json), so a reader learns nothing about a held picture
 *   but "Picture being checked".
 * Where it fits: get_chapter().
 */
create or replace function public.chapter_picture_states(body text, owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(picture_checks.id::text, public.picture_state_json(picture_checks)), '{}'::jsonb)
  from public.picture_checks
  where picture_checks.id in (select picture_id from public.chapter_picture_references(body))
    and picture_checks.user_id = owner_id
    and picture_checks.kind in ('chapter_picture', 'drawing')
    and picture_checks.deleted_at is null;
$$;

comment on function public.chapter_picture_states(text, uuid) is
  'Internal: each picture in a chapter text with its check state and, when allowed, its file (S1-E3-09).';
revoke execute on function public.chapter_picture_states(text, uuid) from public, anon, authenticated;

/**
 * my_picture_states: the caller's own pictures, for the editor and the writer's preview, which show
 * pictures not yet saved into the text.
 * Input: picture_ids. Returns: {"<picture ID>": picture_state_json} for those that are the
 *   caller's own; anyone else's are left out, so it tells nobody about another person's file.
 * Errors: none (signed out gives {}).
 */
create or replace function public.my_picture_states(picture_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(picture_checks.id::text, public.picture_state_json(picture_checks)), '{}'::jsonb)
  from public.picture_checks
  where picture_checks.id = any (coalesce(picture_ids, '{}'))
    and picture_checks.user_id = (select auth.uid())
    and picture_checks.deleted_at is null;
$$;

comment on function public.my_picture_states(uuid[]) is
  'The caller''s own pictures among the IDs, with their check state and file, for the editor (S1-E3-09).';
revoke execute on function public.my_picture_states(uuid[]) from public, anon;
grant execute on function public.my_picture_states(uuid[]) to authenticated;

/**
 * count_words: as in S1-E3-02a, but a picture reference counts nothing: its address and alt text
 * aren't words to read, so the counter and the minutes to read stay true (S1-E3-09).
 */
create or replace function public.count_words(body text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(
    array_remove(regexp_split_to_array(regexp_replace(
      regexp_replace(coalesce(body, ''),
        '!\[((?:[^]\\]|\\.)*)\]\(picture:[0-9a-f-]{36}\)', ' ', 'g'),
      '[^[:alnum:]'']+', ' ', 'g'), '\s+'), ''),
    1), 0);
$$;

/**
 * save_chapter_draft: as in S1-E3-02a, and the pictures in the body follow
 * check_chapter_pictures() (S1-E3-09): alt text, at most chapter_max_pictures, only the writer's own.
 */
create or replace function public.save_chapter_draft(
  chapter_code text,
  title text,
  body text,
  expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  clean_title text := public.normalise_romanian_letters(regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g'));
  clean_body text;
  saved_time timestamptz := now();
begin
  -- Step 1: a signed-in writer who may write.
  if caller_id is null then
    raise exception 'Sign in to save a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('status', 'not_active');
  end if;
  -- Step 2: their own live chapter, locked for this save so two devices can't interleave.
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.user_id = caller_id and chapters.deleted_at is null
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- Step 3: a stale version means another device saved first: tell the editor, change nothing.
  if chapter.draft_version <> expected_version then
    return jsonb_build_object('status', 'conflict', 'version', chapter.draft_version, 'saved_at', chapter.draft_saved_at);
  end if;
  -- Step 4: the rules (rule 8): length, no HTML, safe links, ş/ţ corrected; then the pictures.
  if char_length(clean_title) > 120 then
    raise exception 'A chapter title can have at most 120 characters (S1-E3-02a).' using errcode = 'check_violation';
  end if;
  clean_body := public.check_chapter_text(body);
  perform public.check_chapter_pictures(clean_body, caller_id);
  -- Step 5: save and move the version on.
  update public.chapters set
    draft_title = clean_title,
    draft_body = clean_body,
    draft_version = chapter.draft_version + 1,
    draft_saved_at = saved_time,
    word_count = public.count_words(clean_body)
  where chapters.id = chapter.id;
  return jsonb_build_object('status', 'saved', 'version', chapter.draft_version + 1,
    'saved_at', saved_time, 'word_count', public.count_words(clean_body));
end;
$$;

/**
 * get_chapter: as in S1-E5-06, plus "pictures": each picture in the text sent, with its check
 * state and, when the caller may see it, its file (S1-E3-09). A signed-out visitor gets only the
 * pictures inside their teaser.
 */
create or replace function public.get_chapter(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  chapter public.chapters;
  readable_codes text[];
  place integer;
  text_to_send text;
  teaser_words integer;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  -- Step 2: the chapter, published and not moderated away.
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if not found or not public.chapter_is_readable(chapter.id) then
    return null;
  end if;
  -- Step 3: its place among the chapters readers can open, for "Chapter n of N" and the arrows.
  select array_agg(others.code order by others.position) into readable_codes
  from public.chapters as others
  where others.story_id = story.id and public.chapter_is_readable(others.id);
  place := array_position(readable_codes, chapter.code);
  -- Step 4: the text: all of it for a signed-in reader, the teaser for a signed-out visitor.
  if caller_id is not null then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;
  -- Step 5: the answer, with the pictures in the text that is sent.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'slug', story.slug,
      'title', story.title,
      'language_code', story.language_code,
      'writer', (select jsonb_build_object(
          'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
          'handle', profiles.handle,
          'classic_author', public.story_classic_author(story.id))
        from public.profiles where profiles.id = story.user_id)),
    'id', chapter.id,
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(readable_codes, 1),
    'previous_code', case when place > 1 then readable_codes[place - 1] end,
    'next_code', readable_codes[place + 1],
    'published_at', chapter.first_published_at,
    'edited_at', chapter.edited_at,
    'minutes_to_read', greatest(1, ceil(coalesce(chapter.published_word_count, 0) / 200.0))::integer,
    'is_owner', story.user_id = caller_id,
    'needs_sign_in', caller_id is null,
    'is_teaser', caller_id is null,
    'text_continues', public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send,
    'pictures', public.chapter_picture_states(text_to_send, story.user_id));
end;
$$;

/* ---------- The shared reporting and notification contracts ---------- */

/**
 * reportable_item_summary: as in S1-E10-05, and a chapter picture says where it is: "Picture in
 * chapter 3 of <story>" (S1-E3-09).
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * notification_item_json: as in S1-E10-05, and a chapter picture links to its chapter (S1-E3-09).
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
          when 'chapter_picture' then (select '/s/' || stories.slug || '/' || chapters.code
            from public.chapters join public.stories on stories.id = chapters.story_id
            where chapters.id = picture_checks.chapter_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
    end)
  from public.cases where cases.id = case_id;
$$;
