/*
 * Migration: characters in Story Atlas (stories S1-E17-08 to S1-E17-11 and S1-E17-13;
 * docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part b).
 *
 * What it adds:
 * - story_characters: one row per character in a story's plan, grouped by role (S1-E17-08). The
 *   sheet's text fields (S1-E17-09's four groups) sit in one jsonb column, `sheet`, with a fixed
 *   list of keys checked on save, so a new field never needs a new column. The first appearance
 *   points at one of the story's own chapters.
 * - story_character_fields: the writer's own fields, defined once per story and shown on every
 *   sheet (S1-E17-10). Removing one only hides it, so the values already written stay and come
 *   back with it. Each character keeps its values in `custom_values`, keyed by the field's ID.
 * - Character pictures (S1-E17-11): a private `atlas-images` bucket. Every upload goes through
 *   the picture check (CLAUDE.md rule 19: hash matching applies to every stored picture, even
 *   one only the writer sees), and a sheet shows the picture only once it passed. Removing it
 *   marks the picture deleted and lets the writer delete the file (atlas_images_delete_own).
 * - story_cast(), create_story_character(), update_story_character(), delete_story_character(),
 *   add_character_field(), update_character_field(), register_atlas_picture(),
 *   set_character_picture() and remove_character_picture(); and story_plan() again, now with the
 *   cast count for the at-a-glance page (S1-E17-06).
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer reads or changes characters.
 *   Making them public comes in S1-E17-32. Deleting a character takes its picture with it
 *   (S1-E17-13); its relationships (part c) will cascade from this table.
 * Personal data: the writer's own planning notes, read only by them; no new processor (the
 *   picture check's processors already have their agreements, S1-E10-05).
 * Who calls it: src/features/atlas/api/characters.ts.
 * Tests: supabase/tests/database/191-story-characters.test.sql.
 */

/* ---------- The writer's own fields (S1-E17-10) ---------- */

create table public.story_character_fields (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 1, 2, 3 …: where the field sits on every sheet.
  position integer not null,
  name text not null,
  -- Set when the writer removes the field: hidden, with its values kept (S1-E17-10).
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_character_fields_position_counts_from_one check (position >= 1),
  constraint story_character_fields_name_length check (char_length(btrim(name)) between 1 and 60)
);

comment on table public.story_character_fields is
  'kind: user_content; reportable: story
The writer''s own character fields in one story''s plan, shown on every sheet (S1-E17-10). A removed field is hidden, never deleted, so its values come back with it.';
comment on column public.story_character_fields.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index story_character_fields_story_id_idx on public.story_character_fields (story_id, position);

create trigger story_character_fields_set_updated_at
  before update on public.story_character_fields
  for each row execute function public.set_updated_at();

create trigger story_character_fields_refuse_user_id_change
  before update on public.story_character_fields
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_character_fields enable row level security;

-- The writer reads their own fields; every write goes through the functions below.
grant select on public.story_character_fields to authenticated;

/**
 * story_character_fields_select_own: the writer reads the custom fields of their own plans.
 * Nobody else, staff included, reads them through the app (private by default).
 */
create policy story_character_fields_select_own
  on public.story_character_fields for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_character_fields_select_own on public.story_character_fields is
  'Allows a writer to read the custom character fields of their own story plans, and nobody else (S1-E17-10).';

/* ---------- Characters (S1-E17-08, S1-E17-09) ---------- */

create table public.story_characters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  -- The groups of the cast list (S1-E17-08).
  role text not null default 'supporting',
  -- The sheet's text fields, keyed as character_sheet_keys() lists them (S1-E17-09).
  sheet jsonb not null default '{}'::jsonb,
  -- The values of the writer's own fields, keyed by story_character_fields.id (S1-E17-10).
  custom_values jsonb not null default '{}'::jsonb,
  -- "First appearance, picked from the chapters" (S1-E17-09); cleared if the chapter is purged.
  first_appearance_chapter_id uuid references public.chapters (id) on delete set null,
  -- The portrait or mood picture (S1-E17-11), shown only once its check passed.
  picture_id uuid references public.picture_checks (id) on delete set null,
  picture_alt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_characters_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint story_characters_role_known check (
    role in ('protagonist', 'deuteragonist', 'antagonist', 'supporting', 'minor', 'mentioned')
  ),
  constraint story_characters_sheet_is_object check (jsonb_typeof(sheet) = 'object'),
  constraint story_characters_custom_values_is_object check (jsonb_typeof(custom_values) = 'object'),
  constraint story_characters_picture_alt_length check (char_length(picture_alt) <= 300)
);

comment on table public.story_characters is
  'kind: user_content; reportable: story
The characters of one story''s plan in Story Atlas (S1-E17-08 to S1-E17-11): role, the sheet''s text, the writer''s own fields, the first appearance and a picture. Only the writer reads them.';
comment on column public.story_characters.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';
comment on column public.story_characters.role is
  'The cast group: protagonist, deuteragonist, antagonist, supporting, minor or mentioned (S1-E17-08).';
comment on column public.story_characters.sheet is
  'The sheet''s text fields by key (character_sheet_keys(), S1-E17-09).';

create index story_characters_story_id_idx on public.story_characters (story_id);

create trigger story_characters_set_updated_at
  before update on public.story_characters
  for each row execute function public.set_updated_at();

create trigger story_characters_refuse_user_id_change
  before update on public.story_characters
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_characters enable row level security;

grant select on public.story_characters to authenticated;

/**
 * story_characters_select_own: the writer reads the characters of their own plans, for Story
 * Atlas. Nobody else, staff included, reads a private character through the app.
 */
create policy story_characters_select_own
  on public.story_characters for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_characters_select_own on public.story_characters is
  'Allows a writer to read the characters of their own story plans, and nobody else (S1-E17-08; private by default, Robert 31 Oct 2026).';

/**
 * character_sheet_keys: the sheet's text fields, in the order of S1-E17-09's four groups.
 * Basics (the name and role have their own columns), Look and voice, Inside, In the story (the
 * first appearance has its own column). Returns: the keys. Internal: the save check.
 */
create or replace function public.character_sheet_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'also_known_as', 'species', 'pronouns', 'age_or_born', 'life_status', 'occupation', 'origin',
    'appearance', 'distinguishing_marks', 'voice',
    'personality', 'wants', 'needs', 'fear_or_wound', 'secrets', 'values_and_code',
    'backstory', 'arc', 'key_lines', 'notes'];
$$;

comment on function public.character_sheet_keys() is
  'Internal: the keys of a character sheet''s text fields (S1-E17-09).';
revoke execute on function public.character_sheet_keys() from public, anon, authenticated;

/**
 * check_character_texts: the save-time rule for a sheet's or the custom fields' text.
 * Inputs: texts, an object of key → text; allowed_keys, the keys it may hold.
 * Errors: check_violation with hint unknown_field for a key not allowed, not_text for a value that
 *   isn't text, too_long for one over 20,000 characters (generous, as the principles ask, but
 *   bounded so one sheet can't fill the database).
 * Internal: update_story_character().
 */
create or replace function public.check_character_texts(texts jsonb, allowed_keys text[])
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  entry record;
begin
  if jsonb_typeof(texts) <> 'object' then
    raise exception 'The sheet''s changes must be an object.' using errcode = 'check_violation', hint = 'not_text';
  end if;
  for entry in select * from jsonb_each(texts) loop
    if not (entry.key = any (allowed_keys)) then
      raise exception 'Unknown character field "%".', entry.key
        using errcode = 'check_violation', hint = 'unknown_field';
    end if;
    if jsonb_typeof(entry.value) <> 'string' then
      raise exception 'A character field holds text.' using errcode = 'check_violation', hint = 'not_text';
    end if;
    if char_length(entry.value #>> '{}') > 20000 then
      raise exception 'A character field holds at most 20,000 characters.'
        using errcode = 'check_violation', hint = 'too_long';
    end if;
  end loop;
end;
$$;

comment on function public.check_character_texts(jsonb, text[]) is
  'Internal: refuses unknown keys, values that aren''t text and text over 20,000 characters (S1-E17-09, S1-E17-10).';
revoke execute on function public.check_character_texts(jsonb, text[]) from public, anon, authenticated;

/* ---------- Character pictures (S1-E17-11) ---------- */

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image'));

-- Private: served only through signed URLs to the writer (and moderation staff for a flagged
-- one); 5 MB; the three picture types, as chapter pictures.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atlas-images', 'atlas-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * atlas_picture_upload_allowed: may the signed-in person add this file to `atlas-images`?
 * Input: object_name, the path inside the bucket. Returns: true only while picture_uploads is on
 *   (the picture check's own switch, so nothing is stored before the check can run), for an
 *   account that may write, for "<story ID>/<fresh random ID>.<ending>" where the story is the
 *   caller's own and not deleted. The file name is never the user ID (architecture 1.6).
 * Where it fits: the atlas_images_insert_own policy and register_atlas_picture().
 */
create or replace function public.atlas_picture_upload_allowed(object_name text)
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
      select 1 from public.stories
      where stories.id = split_part(object_name, '/', 1)::uuid
        and stories.user_id = (select auth.uid())
        and stories.deleted_at is null);
$$;

comment on function public.atlas_picture_upload_allowed(text) is
  'True for the story''s writer, a random file name under the story''s ID and picture_uploads on (S1-E17-11).';
revoke execute on function public.atlas_picture_upload_allowed(text) from public, anon;
grant execute on function public.atlas_picture_upload_allowed(text) to authenticated;

/**
 * Policy atlas_images_insert_own: a writer adds a picture under their own story's folder while
 * uploads are on. Why: a character's portrait (S1-E17-11), private until its check passed.
 */
create policy atlas_images_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'atlas-images' and public.atlas_picture_upload_allowed(name));

comment on policy atlas_images_insert_own on storage.objects is
  'Allows a writer to add a picture under their own story''s folder in atlas-images while picture_uploads is on (S1-E17-11).';

/**
 * Policy atlas_images_select_uploader_and_staff: only the writer reads their Story Atlas
 * pictures, and moderation staff read a picture whose check flagged it (S1-E10-05 criterion 3).
 * There is no policy for anyone else: the plan is private (making parts public is S1-E17-32).
 */
create policy atlas_images_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'atlas-images' and public.picture_reader_may_see(bucket_id, name));

comment on policy atlas_images_select_uploader_and_staff on storage.objects is
  'Allows the writer and moderation staff to read a Story Atlas picture (S1-E17-11); nobody else.';

/**
 * atlas_picture_file_may_go: may the uploader delete this Story Atlas file now?
 * Input: object_name. Returns: true when no registered picture still needs the file: it was
 *   never registered, or its picture is marked deleted, a moderator isn't deciding on it (held or
 *   removed) and it isn't kept for the authorities (preserve_until, S1-E10-10).
 * Where it fits: the atlas_images_delete_own policy ("removing it deletes the file", S1-E17-11).
 */
create or replace function public.atlas_picture_file_may_go(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.picture_checks
    where picture_checks.bucket = 'atlas-images' and picture_checks.path = object_name
      and (picture_checks.deleted_at is null
           or picture_checks.status in ('held', 'removed')
           or picture_checks.preserve_until is not null));
$$;

comment on function public.atlas_picture_file_may_go(text) is
  'True when no live, held or preserved picture still needs this atlas-images file (S1-E17-11).';
revoke execute on function public.atlas_picture_file_may_go(text) from public, anon;
grant execute on function public.atlas_picture_file_may_go(text) to authenticated;

/**
 * Policy atlas_images_delete_own: the writer deletes their own Story Atlas file once it is no
 * longer needed (S1-E17-11: "removing it deletes the file"). A held, removed or preserved
 * picture's file stays for the moderators and the authorities.
 */
create policy atlas_images_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'atlas-images' and owner_id = (select auth.uid())::text
         and public.atlas_picture_file_may_go(name));

comment on policy atlas_images_delete_own on storage.objects is
  'Allows a writer to delete their own atlas-images file once its picture is removed, unless moderation or the authorities still need it (S1-E17-11).';

/**
 * register_atlas_picture: records a picture the writer just uploaded to their Story Atlas.
 * Input: target_path ("<story ID>/<random ID>.<ending>" in `atlas-images`).
 * Returns: the picture's ID, which the screen sends to /api/picture-check and then gives to
 *   set_character_picture().
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while picture_uploads is off; check_violation when the file isn't
 *   there, isn't the caller's or isn't under one of their stories; program_limit_exceeded over
 *   the hourly upload limit (S1-E10-12).
 * Where it fits: uploadAtlasPicture(), straight after the upload.
 */
create or replace function public.register_atlas_picture(target_path text)
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
  -- Step 2: the file is there, the caller uploaded it, and it sits under one of their stories.
  if not public.atlas_picture_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'atlas-images'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to one of your stories.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind, story_id)
  values (caller_id, 'atlas-images', target_path, 'atlas_image', split_part(target_path, '/', 1)::uuid)
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;

comment on function public.register_atlas_picture(text) is
  'Records a just-uploaded Story Atlas picture as pending its check (S1-E17-11).';
revoke execute on function public.register_atlas_picture(text) from public, anon;
grant execute on function public.register_atlas_picture(text) to authenticated;

/**
 * forget_character_picture: marks a character's picture deleted and says where its file is.
 * Input: the picture's ID (may be null). Returns: { bucket, path } for the screen to delete the
 *   file (atlas_images_delete_own decides whether it may), or null when there was none.
 * Internal: set_character_picture(), remove_character_picture() and delete_story_character().
 */
create or replace function public.forget_character_picture(old_picture_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  update public.picture_checks set deleted_at = coalesce(deleted_at, now())
  where picture_checks.id = old_picture_id
  returning jsonb_build_object('bucket', picture_checks.bucket, 'path', picture_checks.path);
$$;

comment on function public.forget_character_picture(uuid) is
  'Internal: marks a character''s picture deleted and returns where its file is (S1-E17-11, S1-E17-13).';
revoke execute on function public.forget_character_picture(uuid) from public, anon, authenticated;

/* ---------- Reading the cast ---------- */

/**
 * my_story_character: one of the caller's characters in a live story of theirs.
 * Input: the character's ID. Returns: the row, or null.
 * Internal: every function below that changes one character.
 */
create or replace function public.my_story_character(target_character_id uuid)
returns public.story_characters
language sql
stable
security definer
set search_path = ''
as $$
  select story_characters.* from public.story_characters
  join public.stories on stories.id = story_characters.story_id
  where story_characters.id = target_character_id
    and story_characters.user_id = (select auth.uid())
    and stories.deleted_at is null;
$$;

comment on function public.my_story_character(uuid) is
  'Internal: one of the caller''s characters, in a story of theirs that isn''t deleted (S1-E17-08).';
revoke execute on function public.my_story_character(uuid) from public, anon, authenticated;

/**
 * character_json: one character as Story Atlas shows it.
 * Input: the row. Returns: { id, name, role, sheet, custom_values, first_appearance (a chapter
 *   code or null), picture (picture_state_json(): the state and, for the writer, the file),
 *   picture_alt, updated_at }. Never the user ID (rule 15).
 * Internal: story_cast().
 */
create or replace function public.character_json(target_character public.story_characters)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target_character.id, 'name', target_character.name, 'role', target_character.role,
    'sheet', target_character.sheet, 'custom_values', target_character.custom_values,
    'first_appearance', (select chapters.code from public.chapters
                         where chapters.id = target_character.first_appearance_chapter_id
                           and chapters.deleted_at is null),
    'picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                where picture_checks.id = target_character.picture_id and picture_checks.deleted_at is null),
    'picture_alt', target_character.picture_alt,
    'updated_at', target_character.updated_at);
$$;

comment on function public.character_json(public.story_characters) is
  'Internal: one character for Story Atlas, without the user ID (S1-E17-08 to S1-E17-11).';
revoke execute on function public.character_json(public.story_characters) from public, anon, authenticated;

/**
 * story_cast: everything the Characters page shows for one of the caller's stories (S1-E17-08 to
 * S1-E17-11).
 * Input: the story's slug. Returns: { outcome: 'ok', story: { slug, title, id }, characters:
 *   [character_json(), by name], fields: [{ id, name, position, is_hidden }], chapters:
 *   [{ code, position, title }] for the first-appearance picker }, or { outcome: 'not_found' }.
 *   The story's ID is the folder its pictures go in; it is not a user ID.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/characters.ts.
 */
create or replace function public.story_cast(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the characters, the writer's own fields and the chapters to pick from.
  return (select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object('id', stories.id, 'slug', stories.slug, 'title', stories.title),
    'characters', coalesce((
      select jsonb_agg(public.character_json(story_characters) order by lower(story_characters.name), story_characters.created_at)
      from public.story_characters where story_characters.story_id = stories.id), '[]'::jsonb),
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object('id', fields.id, 'name', fields.name, 'position', fields.position,
          'is_hidden', fields.hidden_at is not null) order by fields.position, fields.created_at)
      from public.story_character_fields as fields where fields.story_id = stories.id), '[]'::jsonb),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'position', chapters.position,
          'title', chapters.draft_title) order by chapters.position)
      from public.chapters where chapters.story_id = stories.id and chapters.deleted_at is null), '[]'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$$;

comment on function public.story_cast(text) is
  'The Characters page of one of the caller''s stories: its characters, custom fields and chapters (S1-E17-08 to S1-E17-11).';
revoke execute on function public.story_cast(text) from public, anon;
grant execute on function public.story_cast(text) to authenticated;

/* ---------- Changing characters ---------- */

/**
 * create_story_character: "New character" on the Characters page (S1-E17-08).
 * Inputs: the story's slug; character_name (the screen sends "New character" in the writer's
 *   language); character_role (one of the six roles).
 * Returns: { outcome: 'ok', id } so the sheet opens, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty name or an unknown
 *   role, and with hint too_many_characters past 500 in one story (a bound, not a goal).
 * A plan is private, so a read-only account may still plan (as update_story_plan()).
 */
create or replace function public.create_story_character(story_slug text, character_name text, character_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  new_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to add a character.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the bound on one story's cast.
  if (select count(*) from public.story_characters where story_id = target_story_id) >= 500 then
    raise exception 'A story can hold at most 500 characters.'
      using errcode = 'check_violation', hint = 'too_many_characters';
  end if;
  -- Step 3: the character; the table's checks refuse an empty name or an unknown role.
  insert into public.story_characters (story_id, user_id, name, role)
  values (target_story_id, caller_id, btrim(character_name), character_role)
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.create_story_character(text, text, text) is
  'Adds a character to one of the caller''s story plans and returns its ID (S1-E17-08).';
revoke execute on function public.create_story_character(text, text, text) from public, anon;
grant execute on function public.create_story_character(text, text, text) to authenticated;

/**
 * chapter_of_story: the ID of a story's live chapter with this code, for the first appearance.
 * Inputs: the story's ID and the chapter code ('' means none). Returns: the ID, or null for ''.
 * Errors: check_violation with hint unknown_chapter for a code that isn't one of the story's.
 * Internal: update_story_character().
 */
create or replace function public.chapter_of_story(target_story_id uuid, chapter_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_id uuid;
begin
  if coalesce(chapter_code, '') = '' then
    return null;
  end if;
  select chapters.id into found_id from public.chapters
  where chapters.story_id = target_story_id and chapters.code = chapter_code and chapters.deleted_at is null;
  if found_id is null then
    raise exception 'That chapter isn''t in this story.' using errcode = 'check_violation', hint = 'unknown_chapter';
  end if;
  return found_id;
end;
$$;

comment on function public.chapter_of_story(uuid, text) is
  'Internal: a story''s live chapter by its code, for a character''s first appearance (S1-E17-09).';
revoke execute on function public.chapter_of_story(uuid, text) from public, anon, authenticated;

/**
 * check_custom_value_keys: the writer's own field values may only use the story's own fields.
 * Inputs: the story's ID and the changes' custom object. Errors: as check_character_texts(),
 *   unknown_field for an ID that isn't one of the story's fields.
 * Internal: update_story_character().
 */
create or replace function public.check_custom_value_keys(target_story_id uuid, custom jsonb)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.check_character_texts(custom, coalesce((
    select array_agg(fields.id::text) from public.story_character_fields as fields
    where fields.story_id = target_story_id), '{}'::text[]));
end;
$$;

comment on function public.check_custom_value_keys(uuid, jsonb) is
  'Internal: refuses custom values for fields that aren''t the story''s own (S1-E17-10).';
revoke execute on function public.check_custom_value_keys(uuid, jsonb) from public, anon, authenticated;

/**
 * update_story_character: changes one of the caller's characters (S1-E17-08 to S1-E17-11). Each
 * field saves by itself as the writer types, so `changes` holds only what changed.
 * Inputs: character_id; changes, any of name, role, sheet (an object of sheet key → text, merged
 *   into the sheet), custom (an object of field ID → text, merged into custom_values),
 *   first_appearance (a chapter code, or '' for none) and picture_alt.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty name, an unknown
 *   role, field or chapter, text that is too long or alt text over 300 characters.
 * Who calls it: src/features/atlas/api/characters.ts.
 */
create or replace function public.update_story_character(character_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer and their own character.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the texts use only known fields and stay within bounds.
  perform public.check_character_texts(coalesce(changes -> 'sheet', '{}'::jsonb), public.character_sheet_keys());
  perform public.check_custom_value_keys(target_character.story_id, coalesce(changes -> 'custom', '{}'::jsonb));

  -- Step 3: change only what was given; the table's checks refuse the rest.
  update public.story_characters set
    name = coalesce(btrim(changes ->> 'name'), name),
    role = coalesce(changes ->> 'role', role),
    sheet = sheet || coalesce(changes -> 'sheet', '{}'::jsonb),
    custom_values = custom_values || coalesce(changes -> 'custom', '{}'::jsonb),
    first_appearance_chapter_id = case when changes ? 'first_appearance'
      then public.chapter_of_story(target_character.story_id, changes ->> 'first_appearance')
      else first_appearance_chapter_id end,
    picture_alt = coalesce(btrim(changes ->> 'picture_alt'), picture_alt)
  where story_characters.id = target_character.id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_story_character(uuid, jsonb) is
  'Changes one of the caller''s characters: name, role, sheet text, custom values, first appearance or picture alt text (S1-E17-08 to S1-E17-11).';
revoke execute on function public.update_story_character(uuid, jsonb) from public, anon;
grant execute on function public.update_story_character(uuid, jsonb) to authenticated;

/**
 * delete_story_character: deletes one of the caller's characters, after the screen's second,
 * confirming click (S1-E17-13). Its picture goes with it, and its relationships (part c) will
 * cascade from the row.
 * Input: character_id. Returns: { outcome: 'ok', picture: { bucket, path } or null } so the screen
 *   deletes the file, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_story_character(character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
  old_picture jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- The picture first, so its file can go too; then the character itself.
  old_picture := public.forget_character_picture(target_character.picture_id);
  delete from public.story_characters where story_characters.id = target_character.id;
  return jsonb_build_object('outcome', 'ok', 'picture', old_picture);
end;
$$;

comment on function public.delete_story_character(uuid) is
  'Deletes one of the caller''s characters and marks its picture deleted (S1-E17-13).';
revoke execute on function public.delete_story_character(uuid) from public, anon;
grant execute on function public.delete_story_character(uuid) to authenticated;

/**
 * set_character_picture: puts a just-registered picture on a character's sheet (S1-E17-11). The
 * sheet shows it once its check passed; until then it says the picture is being checked.
 * Inputs: character_id; new_picture_id, a picture the caller registered for the same story.
 * Returns: { outcome: 'ok', replaced: { bucket, path } or null } (the picture it replaced, whose
 *   file the screen deletes), or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation when the picture isn't the
 *   caller's Story Atlas picture for this story.
 */
create or replace function public.set_character_picture(character_id uuid, new_picture_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
  replaced jsonb;
begin
  -- Step 1: a signed-in writer and their own character.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the picture is the caller's own, for this story, and not deleted.
  if not exists (select 1 from public.picture_checks
                 where picture_checks.id = new_picture_id and picture_checks.user_id = (select auth.uid())
                   and picture_checks.kind = 'atlas_image' and picture_checks.story_id = target_character.story_id
                   and picture_checks.deleted_at is null) then
    raise exception 'That picture isn''t one of yours for this story.' using errcode = 'check_violation';
  end if;
  -- Step 3: the old picture is forgotten, the new one put on the sheet.
  if target_character.picture_id is distinct from new_picture_id then
    replaced := public.forget_character_picture(target_character.picture_id);
  end if;
  update public.story_characters set picture_id = new_picture_id where story_characters.id = target_character.id;
  return jsonb_build_object('outcome', 'ok', 'replaced', replaced);
end;
$$;

comment on function public.set_character_picture(uuid, uuid) is
  'Puts one of the caller''s registered Story Atlas pictures on a character''s sheet (S1-E17-11).';
revoke execute on function public.set_character_picture(uuid, uuid) from public, anon;
grant execute on function public.set_character_picture(uuid, uuid) to authenticated;

/**
 * remove_character_picture: takes the picture off a character's sheet; the initials show again
 * (S1-E17-11: "I can remove it later, and removing it deletes the file").
 * Input: character_id. Returns: { outcome: 'ok', removed: { bucket, path } or null } so the screen
 *   deletes the file, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.remove_character_picture(character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
  removed jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  removed := public.forget_character_picture(target_character.picture_id);
  update public.story_characters set picture_id = null, picture_alt = '' where story_characters.id = target_character.id;
  return jsonb_build_object('outcome', 'ok', 'removed', removed);
end;
$$;

comment on function public.remove_character_picture(uuid) is
  'Takes the picture off one of the caller''s characters and marks it deleted (S1-E17-11).';
revoke execute on function public.remove_character_picture(uuid) from public, anon;
grant execute on function public.remove_character_picture(uuid) to authenticated;

/* ---------- The writer's own fields ---------- */

/**
 * add_character_field: defines a field once for every character in a story (S1-E17-10, such as
 * "Turned by" or "Phoenix stage").
 * Inputs: the story's slug and field_name. Returns: { outcome: 'ok', id } or
 *   { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty name or one over
 *   60 characters, and with hint too_many_fields past 40 fields in one story.
 */
create or replace function public.add_character_field(story_slug text, field_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  new_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to add a field.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the bound, counting hidden fields too (they keep their values).
  if (select count(*) from public.story_character_fields where story_id = target_story_id) >= 40 then
    raise exception 'A story can hold at most 40 character fields of your own.'
      using errcode = 'check_violation', hint = 'too_many_fields';
  end if;
  -- Step 3: the field, after the others.
  insert into public.story_character_fields (story_id, user_id, position, name)
  values (target_story_id, caller_id,
    coalesce((select max(position) from public.story_character_fields where story_id = target_story_id), 0) + 1,
    btrim(field_name))
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_character_field(text, text) is
  'Adds a custom field to every character sheet of one of the caller''s stories (S1-E17-10).';
revoke execute on function public.add_character_field(text, text) from public, anon;
grant execute on function public.add_character_field(text, text) to authenticated;

/**
 * update_character_field: renames, removes or brings back one of the caller's own fields
 * (S1-E17-10: "when I remove it, then it is hidden but the values already written are kept, and
 * bringing it back shows them again").
 * Inputs: field_id; changes, any of name and is_hidden (true removes, false brings back).
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty name.
 */
create or replace function public.update_character_field(field_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your fields.' using errcode = 'insufficient_privilege';
  end if;
  update public.story_character_fields set
    name = coalesce(btrim(changes ->> 'name'), name),
    hidden_at = case
      when (changes ->> 'is_hidden')::boolean is true then coalesce(hidden_at, now())
      when (changes ->> 'is_hidden')::boolean is false then null
      else hidden_at end
  from public.stories
  where story_character_fields.id = field_id
    and story_character_fields.user_id = (select auth.uid())
    and stories.id = story_character_fields.story_id and stories.deleted_at is null;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.update_character_field(uuid, jsonb) is
  'Renames, hides or brings back one of the caller''s custom character fields; hiding keeps the values (S1-E17-10).';
revoke execute on function public.update_character_field(uuid, jsonb) from public, anon;
grant execute on function public.update_character_field(uuid, jsonb) to authenticated;

/* ---------- The cast count on the at-a-glance page (S1-E17-06) ---------- */

/**
 * story_plan: as in …_s1_e17_01_story_plans.sql, plus `cast`: { count, recent: [{ id, name,
 *   updated_at }] }, the three characters edited most recently (S1-E17-06: "the cast count and
 *   the recently edited chapters and entries show, each linking to its item").
 * Input: the story's slug. Returns: { outcome: 'ok', story, plan, acts, chapters, cast } or
 *   { outcome: 'not_found' }. Errors: insufficient_privilege when signed out.
 */
create or replace function public.story_plan(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  result jsonb;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to see your plan.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the story's own fields and the plan's, never the user ID (rule 15).
  select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object(
      'slug', stories.slug, 'title', stories.title, 'blurb', stories.blurb,
      'category_slug', categories.slug, 'rating', stories.rating,
      'first_published_at', stories.first_published_at
    ),
    'plan', jsonb_build_object(
      'logline', plans.logline, 'series_name', plans.series_name, 'word_target', plans.word_target,
      'writing_status', plans.writing_status, 'publishing_route', plans.publishing_route,
      'linked_project_label', plans.linked_project_label, 'linked_project_url', plans.linked_project_url,
      'updated_at', plans.updated_at
    ),
    'acts', coalesce((
      select jsonb_agg(jsonb_build_object('position', acts.position, 'name', acts.name) order by acts.position)
      from public.story_plan_acts as acts where acts.story_id = stories.id
    ), '[]'::jsonb),
    'chapters', public.story_plan_chapters(stories.id),
    -- Step 3: the cast count and the characters edited last (S1-E17-06).
    'cast', jsonb_build_object(
      'count', (select count(*) from public.story_characters where story_characters.story_id = stories.id),
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object('id', recent.id, 'name', recent.name, 'updated_at', recent.updated_at)
                         order by recent.updated_at desc)
        from (select story_characters.id, story_characters.name, story_characters.updated_at
              from public.story_characters where story_characters.story_id = stories.id
              order by story_characters.updated_at desc limit 3) as recent
      ), '[]'::jsonb))
  )
  into result
  from public.stories
  join public.story_plans as plans on plans.story_id = stories.id
  join public.categories on categories.id = stories.category_id
  where stories.id = target_story_id;
  return result;
end;
$$;

comment on function public.story_plan(text) is
  'The at-a-glance page of one of the caller''s stories: the story, its plan, acts, chapter numbers and cast (S1-E17-06).';
revoke execute on function public.story_plan(text) from public, anon;
grant execute on function public.story_plan(text) to authenticated;
