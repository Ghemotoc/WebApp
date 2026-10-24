-- Migration: the covers bucket and the picture_uploads flag (story S1-E3-01; architecture B14).
--
-- What it adds: the contract for uploaded covers, without the upload screen: the feature flag
-- `picture_uploads` (off), the private `covers` storage bucket (JPEG, PNG or WebP up to 5 MB)
-- and its rules, so that when the picture check (S1-E10-05) and the upload screen (its own story)
-- arrive, only the flag changes.
-- Decision (Robert, 23 Oct 2026): no picture uploads in the demo; the contract only.
-- Rules: files live under <story id>/<file>, never under the user ID (architecture 1.6). Only the
-- story's owner may add or read a file, and only while the flag is on. Everyone else is refused,
-- which also keeps a flagged picture private until a moderator decides (S1-E10-05).

/* ---------- The flag ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('picture_uploads', false, true,
   'Cover and chapter picture uploads. Off for the demo (23 Oct 2026); on once the picture check (S1-E10-05) is real.');

/* ---------- The bucket ---------- */

-- Private: files are served only through signed URLs or to the owner; 5 MB; the three allowed
-- picture types (S1-E3-01 acceptance criteria).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * cover_upload_allowed: may the signed-in person add or read this cover file?
 * Input: object_name, the file's path inside the bucket ("<story id>/tall.jpg").
 * Returns: true only when picture_uploads is on, the path starts with a story ID, and the
 *   signed-in person owns that story (and it isn't deleted). Anything else, false.
 * Where it fits: the two storage policies below call it, so the rule lives in one place.
 */
create or replace function public.cover_upload_allowed(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder text := split_part(coalesce(object_name, ''), '/', 1);
begin
  -- Step 1: the switch (off for the demo).
  if not public.is_feature_enabled('picture_uploads') then
    return false;
  end if;
  -- Step 2: the folder must be a story ID, so a made-up path can't match anything.
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  -- Step 3: only that story's owner.
  return exists (
    select 1 from public.stories
    where stories.id = folder::uuid
      and stories.user_id = (select auth.uid())
      and stories.deleted_at is null
  );
end;
$$;

comment on function public.cover_upload_allowed(text) is
  'True only for the story''s owner, on a <story id>/… path, while picture_uploads is on (S1-E3-01).';
revoke execute on function public.cover_upload_allowed(text) from public, anon;
grant execute on function public.cover_upload_allowed(text) to authenticated;

/**
 * Policy covers_insert_own: a writer adds a cover file to their own story's folder, while
 * uploads are on. Why: the picture check (S1-E10-05) runs on upload; until then the file is
 * private to the owner.
 */
create policy covers_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'covers' and public.cover_upload_allowed(name));

comment on policy covers_insert_own on storage.objects is
  'Allows a writer to add a cover under their own story''s folder while picture_uploads is on (S1-E3-01).';

/**
 * Policy covers_select_own: a writer reads their own cover files. Why: until the picture check
 * passes, only the writer sees the picture (S1-E3-01); public reads come with the upload story.
 */
create policy covers_select_own
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'covers' and public.cover_upload_allowed(name));

comment on policy covers_select_own on storage.objects is
  'Allows a writer to read their own story''s cover files while picture_uploads is on (S1-E3-01).';
