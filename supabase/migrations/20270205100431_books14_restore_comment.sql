-- books14_restore_comment: "Comment deleted. Undo" brings a comment back (design books item 14,
-- "Undo"; Robert approved the design books review on 23 Nov 2026).
--
-- Why: deleting a comment no longer asks "Delete this comment?" first. It happens at once and a
-- note offers Undo for 8 seconds. delete_comment() is a soft delete (deleted_at and deleted_by),
-- so Undo only has to clear those two fields again.
-- Who calls it: src/features/comments/api/comments.ts → restoreComment(), from the Undo note.

/**
 * restore_comment(comment_id): undoes the caller's own delete of a comment, a short time after.
 *
 * Allows: only the person who deleted it, read from deleted_by: the author for 'author', the
 * story's writer for 'writer'; only within 10 minutes (the note offers 8 seconds; the rest is
 * room for a slow connection); only an active member, so a closing, banned or suspended account
 * (whose comments are hidden with deleted_by 'author') can't bring them back this way.
 * Returns: true once it is back.
 * Errors: insufficient_privilege (signed out, not active, or not the one who deleted it);
 *   no_data_found (no such deleted comment, or too long ago).
 */
create or replace function public.restore_comment(comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.comments;
  story_writer_id uuid;
begin
  -- Step 1: a signed-in, active member.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Only an active member can undo a delete.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a comment deleted in the last 10 minutes.
  select * into target from public.comments
  where comments.id = comment_id
    and comments.deleted_at is not null
    and comments.deleted_at > now() - interval '10 minutes'
  for update;
  if target.id is null then
    raise exception 'That comment can''t be brought back any more.' using errcode = 'no_data_found';
  end if;
  -- Step 3: the caller is the one who deleted it.
  select stories.user_id into story_writer_id
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = target.chapter_id;
  if not ((target.deleted_by = 'author' and caller_id = target.user_id)
       or (target.deleted_by = 'writer' and caller_id = story_writer_id)) then
    raise exception 'Only the person who deleted a comment can undo it.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 4: back as it was.
  update public.comments set deleted_at = null, deleted_by = null where comments.id = target.id;
  return true;
end;
$$;
comment on function public.restore_comment(uuid) is
  'Undoes the caller''s own delete of a comment within 10 minutes (design books item 14).';
revoke execute on function public.restore_comment(uuid) from public, anon;
grant execute on function public.restore_comment(uuid) to authenticated;
