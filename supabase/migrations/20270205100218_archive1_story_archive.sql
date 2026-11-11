-- Migration: the stories of an account that closed for not being used are kept in a private
-- archive for 5 more years, so their writer can bring them back (bundle ARCHIVE-1).
--
-- Decisions: Robert, 11 Nov 2026, 19:47 to 19:52 UTC (Builder thread): "I don't want their story
-- to be lost ... we will archive their stories (including their story data like the atlas) in
-- case of account auto closer for another 5 years, unless the business goes bankrupt"; built and
-- switched on; "All stories will be archived like this, and as KYC we need their email address
-- and year of birth and either pen name / username or story name regardless if they are under 18".
-- GDPR art. 5(1)(e): the archive has its own fixed end (5 years) and its own purpose (giving the
-- writer their work back); the privacy notice says so [Lawyer to confirm].
--
-- What it adds:
--   1. Settings story_archive_years (5) and story_archive_claim_tries (3); the 'story_archive'
--      switch, on.
--   2. story_archives: one row per archived story. It holds the story, its chapters and its Story
--      Atlas as one JSON document, plus what recognises the writer later: the scrambled email
--      (a SHA-256 hash, never the address), the year of birth, the pen name and the username.
--      Nobody reads it: not staff, not other members. Pictures are not archived (they are deleted
--      with the account).
--   3. archive_account_stories(): called by purge_closed_accounts() just before an account closed
--      as 'unused' is deleted for good. An account its owner chose to delete is never archived.
--   4. my_story_archive(): tells a logged-in person whether an archive waits for their email.
--   5. claim_story_archive(): the person gives the year of birth and one of pen name, username or
--      a story's title. A match restores every story as a private draft in their account and
--      removes it from the archive. Three wrong tries lock the form for a day.
--   6. purge_story_archives(): nightly, deletes archives older than story_archive_years.
--   7. The deletion and export lists name the new table (database tests 211 and 212).
--
-- Who calls it: pg_cron (purge-closed-accounts, purge-story-archives) and Settings › Archived
-- stories (src/features/story-archive). What it calls next: the writing and Story Atlas tables.

/* ---------- 1. Settings and the switch ---------- */

insert into public.settings (key, value, is_public, description) values
  ('story_archive_years', '5'::jsonb, false,
   'Years the stories of an account closed for not being used stay in the private archive (ARCHIVE-1; Robert, 11 Nov 2026).'),
  ('story_archive_claim_tries', '3'::jsonb, false,
   'Wrong tries at bringing archived stories back before the form locks for a day (ARCHIVE-1).')
on conflict (key) do nothing;

insert into public.feature_flags (key, is_enabled, is_public, description)
values ('story_archive', true, false,
  'While on, the stories of an account closed for not being used are archived for story_archive_years and their writer can bring them back (ARCHIVE-1; Robert, 11 Nov 2026: switched on).')
on conflict (key) do nothing;

/* ---------- 2. The archive ---------- */

create table public.story_archives (
  id uuid primary key default gen_random_uuid(),
  -- The closed account the story belonged to (CLAUDE.md rule 15). Its profile row stays, emptied,
  -- so the user ID is never reused; this row never goes with it.
  user_id uuid not null references public.profiles (id),
  -- What recognises the writer later (Robert, 11 Nov 2026, 19:52 UTC). The email is kept only as
  -- a SHA-256 hash (hash_email()), never as an address.
  email_hash text not null,
  birth_year integer,
  pen_name text,
  handle text not null,
  -- The story's title, also one of the names the writer may give.
  title text not null,
  -- The story, its chapters and its Story Atlas: one JSON array of rows per table.
  story jsonb not null,
  archived_at timestamptz not null default now(),
  -- The day the archive is deleted for good.
  delete_after timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.story_archives is
  'kind: user_action. The stories (with chapters and Story Atlas) of accounts closed for not being used, kept story_archive_years so the writer can bring them back; nobody reads it (ARCHIVE-1).';

create index story_archives_email_hash on public.story_archives (email_hash);
create index story_archives_user_id on public.story_archives (user_id);

alter table public.story_archives enable row level security;

-- Who: only the account the story belonged to, and that account is closed and can no longer log
-- in. Why: the table needs an owner rule (CLAUDE.md rule 1) and nobody else, staff included, may
-- read an archive. The writer gets the stories back through claim_story_archive(), never by
-- reading this table.
create policy story_archives_select_own on public.story_archives
  for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_archives_select_own on public.story_archives is
  'Allows only the (closed) account a story belonged to; nobody else, staff included, reads an archive (ARCHIVE-1).';

grant select on public.story_archives to authenticated;

create trigger story_archives_set_updated_at
  before update on public.story_archives
  for each row execute function public.set_updated_at();

/* ---------- 3. Putting stories into the archive ---------- */

/**
 * story_archive_tables: the tables one archived story is made of, parents before children, which
 * is the order they are restored in. Returns the table names. Raises nothing.
 * Where it fits: archived_story_document() reads them, restore_archived_story() writes them.
 */
create or replace function public.story_archive_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  -- chapters come right after the plan (a chapter's plan points at the story's plan) and before
  -- the characters and Story world entries, which may point at a chapter.
  select array['stories', 'story_plans', 'chapters', 'story_plan_acts', 'story_characters',
    'story_character_fields', 'story_character_relationships', 'story_bible_sections',
    'story_bible_entries', 'chapter_plans', 'chapter_scenes', 'chapter_plan_characters',
    'story_events', 'story_ideas', 'story_marketing', 'story_tags'];
$$;

comment on function public.story_archive_tables() is
  'Internal: the tables one archived story is made of, parents first (ARCHIVE-1).';
revoke execute on function public.story_archive_tables() from public, anon, authenticated;

/**
 * archived_story_document: one story as a JSON document, a list of rows per table.
 * Input: the story's ID. Returns {"stories": [...], "chapters": [...], ...}. Raises nothing.
 * Where it fits: archive_account_stories() stores it in story_archives.story.
 */
create or replace function public.archived_story_document(archived_story_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_name text;
  key_column text;
  table_rows jsonb;
  document jsonb := '{}'::jsonb;
begin
  foreach table_name in array public.story_archive_tables() loop
    -- The story's own row is found by id; every other table carries story_id.
    key_column := case when table_name = 'stories' then 'id' else 'story_id' end;
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(archived)), ''[]''::jsonb) from public.%I as archived where archived.%I = $1',
      table_name, key_column)
    into table_rows using archived_story_id;
    document := document || jsonb_build_object(table_name, table_rows);
  end loop;
  return document;
end;
$$;

comment on function public.archived_story_document(uuid) is
  'Internal: one story, its chapters and its Story Atlas as a JSON document (ARCHIVE-1).';
revoke execute on function public.archived_story_document(uuid) from public, anon, authenticated;

/**
 * archive_account_stories: archives the stories of an account that is about to be deleted.
 * Inputs: the account, and the time it closed (the stories the closing hid carry that time; a
 * story the writer deleted earlier is not archived). Returns how many stories were archived.
 * Left out: a story a moderation case holds (it stays where it is) and one staff hid or removed.
 * Raises nothing. Where it fits: purge_closed_accounts() calls it before delete_account_data().
 */
create or replace function public.archive_account_stories(target_user_id uuid, closed_at timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer_email text;
  keep_years integer := coalesce((public.setting_value('story_archive_years'))::integer, 5);
  archived_count integer;
begin
  -- Step 1: the email the writer is recognised by; without one there is nothing to match later.
  select users.email into writer_email from auth.users where users.id = target_user_id;
  if writer_email is null or writer_email like '%@deleted.invalid' then
    return 0;
  end if;
  -- Step 2: one archive row per story the closing hid, with who the writer was.
  insert into public.story_archives (user_id, email_hash, birth_year, pen_name, handle, title,
    story, delete_after)
  select profiles.id, public.hash_email(writer_email), profiles.birth_year, profiles.pen_name,
    profiles.handle, stories.title, public.archived_story_document(stories.id),
    now() + make_interval(years => keep_years)
  from public.stories
  join public.profiles on profiles.id = stories.user_id
  where stories.user_id = target_user_id
    and stories.deleted_at = closed_at
    and not public.is_moderated_away('story', stories.id)
    and not public.content_is_held_for_moderation('story', stories.id)
    and not exists (select 1 from public.chapters
                    where chapters.story_id = stories.id
                      and public.content_is_held_for_moderation('chapter', chapters.id));
  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

comment on function public.archive_account_stories(uuid, timestamptz) is
  'Internal: archives the stories of an account closed for not being used, just before it is deleted (ARCHIVE-1).';
revoke execute on function public.archive_account_stories(uuid, timestamptz) from public, anon, authenticated;

/**
 * purge_closed_accounts: as in ADMIN-2 part f1, and an account that closed for not being used has
 * its stories archived first, while the 'story_archive' switch is on (ARCHIVE-1). An account its
 * owner chose to delete is never archived: they asked for everything to go (GDPR art. 17).
 * Returns how many accounts were deleted. Where it fits: pg_cron, nightly.
 */
create or replace function public.purge_closed_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request record;
  deleted_count integer := 0;
begin
  for request in
    select account_deletions.id, account_deletions.user_id, account_deletions.reason,
      account_deletions.requested_at
    from public.account_deletions
    where account_deletions.delete_after <= now()
      and account_deletions.cancelled_at is null and account_deletions.completed_at is null
      -- Evidence about a child abuse image keeps the account (part e2b).
      and not exists (select 1 from public.abuse_image_evidence
                      where abuse_image_evidence.user_id = account_deletions.user_id)
      -- A banned account is closed, never deleted (part f1).
      and (public.active_sanction(account_deletions.user_id, 'ban')).id is null
    order by account_deletions.delete_after
  loop
    -- The stories of an unused account go to the archive before anything is deleted.
    if request.reason = 'unused' and public.is_feature_enabled('story_archive') then
      perform public.archive_account_stories(request.user_id, request.requested_at);
    end if;
    perform public.delete_account_data(request.user_id);
    update public.account_deletions set completed_at = now() where account_deletions.id = request.id;
    deleted_count := deleted_count + 1;
  end loop;
  return deleted_count;
end;
$$;

comment on function public.purge_closed_accounts() is
  'Nightly: deletes accounts whose 14 days have passed, except those with child abuse image evidence or a live ban; an unused account''s stories are archived first (S1-E13-03, ADMIN-2 parts e2b and f1, ARCHIVE-1).';
revoke execute on function public.purge_closed_accounts() from public, anon, authenticated;

/* ---------- 4. Bringing stories back ---------- */

/**
 * restore_archived_rows: puts one table's archived rows back, under a new owner.
 * Inputs: the table, its archived rows (a JSON array) and the account they now belong to.
 * Only the columns that exist both in the archive and in the table today are written, so a
 * column added since takes its default and one dropped since is skipped. Returns the number of
 * rows written. Raises whatever the table refuses (a broken reference, a taken key).
 * Where it fits: restore_archived_story() calls it once per table.
 */
create or replace function public.restore_archived_rows(table_name text, archived_rows jsonb, new_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  column_list text;
  owned_rows jsonb;
  restored integer;
begin
  if archived_rows is null or jsonb_array_length(archived_rows) = 0 then
    return 0;
  end if;
  -- Step 1: the columns both sides know.
  select string_agg(format('%I', columns.column_name), ', ' order by columns.ordinal_position)
  into column_list
  from information_schema.columns as columns
  where columns.table_schema = 'public' and columns.table_name = restore_archived_rows.table_name
    and columns.is_generated = 'NEVER' and (archived_rows -> 0) ? columns.column_name;
  -- Step 2: every row now belongs to the person bringing the story back.
  select jsonb_agg(row_data || jsonb_build_object('user_id', new_user_id)) into owned_rows
  from jsonb_array_elements(archived_rows) as row_data;
  -- Step 3: write them.
  execute format(
    'insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)',
    table_name, column_list, column_list, table_name)
  using owned_rows;
  get diagnostics restored = row_count;
  return restored;
end;
$$;

comment on function public.restore_archived_rows(text, jsonb, uuid) is
  'Internal: writes one table''s archived rows back under a new owner (ARCHIVE-1).';
revoke execute on function public.restore_archived_rows(text, jsonb, uuid) from public, anon, authenticated;

/**
 * free_story_slug: the archived address of a story, or the next free one if it was taken since.
 * Input: the slug the story had. Returns a slug no story uses. Raises nothing.
 */
create or replace function public.free_story_slug(wanted_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text := wanted_slug;
  attempt integer := 1;
begin
  while exists (select 1 from public.stories where stories.slug = candidate) loop
    attempt := attempt + 1;
    -- 80 characters is the longest a slug may be (stories_slug_shape).
    candidate := rtrim(left(wanted_slug, 72), '-') || '-' || attempt;
  end loop;
  return candidate;
end;
$$;

comment on function public.free_story_slug(text) is
  'Internal: a story address nobody uses, starting from the one the story had (ARCHIVE-1).';
revoke execute on function public.free_story_slug(text) from public, anon, authenticated;

/**
 * archived_story_as_draft: the archived story row, changed so it comes back as a private draft.
 * Input: the archived row. Returns the row to insert: private, not deleted, never published, out
 * of any class space, with no uploaded cover (pictures are not archived) and a free address.
 */
create or replace function public.archived_story_as_draft(archived_story jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select archived_story
    || jsonb_build_object('visibility', 'private', 'deleted_at', null, 'class_only', false,
         'class_space_id', null, 'classic_author_id', null, 'rank_badge_tag_ids', null,
         'first_published_at', null, 'last_chapter_published_at', null, 'title_hidden_at', null,
         'cover_hidden_at', null, 'slug', public.free_story_slug(archived_story ->> 'slug'))
    || case when exists (select 1 from public.writing_prompts
                         where writing_prompts.id = (archived_story ->> 'writing_prompt_id')::uuid)
         then '{}'::jsonb else jsonb_build_object('writing_prompt_id', null) end
    || case when archived_story ->> 'cover_kind' = 'upload'
         then jsonb_build_object('cover_kind', 'automatic', 'cover_tall_path', null,
                'cover_square_path', null)
         else '{}'::jsonb end;
$$;

comment on function public.archived_story_as_draft(jsonb) is
  'Internal: an archived story row as a private, unpublished story with a free address (ARCHIVE-1).';
revoke execute on function public.archived_story_as_draft(jsonb) from public, anon, authenticated;

/**
 * archived_chapters_as_drafts: the archived chapters, each one a draft again.
 * Input: the archived chapter rows. Returns them unpublished; a chapter whose draft was empty
 * gets its published words as the draft, so no text is lost.
 */
create or replace function public.archived_chapters_as_drafts(archived_chapters jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    chapter || jsonb_build_object(
      'status', 'draft', 'scheduled_for', null, 'first_published_at', null,
      'last_published_at', null, 'unpublished_at', null, 'published_word_count', null,
      'published_title', null, 'published_body', null,
      'draft_title', coalesce(nullif(chapter ->> 'draft_title', ''), chapter ->> 'published_title', ''),
      'draft_body', coalesce(nullif(chapter ->> 'draft_body', ''), chapter ->> 'published_body', ''))
  ), '[]'::jsonb)
  from jsonb_array_elements(archived_chapters) as chapter;
$$;

comment on function public.archived_chapters_as_drafts(jsonb) is
  'Internal: archived chapters as drafts, keeping the published words as the draft when it was empty (ARCHIVE-1).';
revoke execute on function public.archived_chapters_as_drafts(jsonb) from public, anon, authenticated;

/**
 * archived_rows_for_restore: one table's archived rows, with what can't come back taken out.
 * Inputs: the table and the story's archive document. Returns the rows to write: the story and
 * chapters as drafts, characters without their picture (pictures are not archived) and only the
 * tags that still exist. Every other table comes back as it was.
 */
create or replace function public.archived_rows_for_restore(table_name text, document jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case table_name
    when 'stories' then jsonb_build_array(public.archived_story_as_draft(document -> 'stories' -> 0))
    when 'chapters' then public.archived_chapters_as_drafts(document -> 'chapters')
    when 'story_characters' then (
      select coalesce(jsonb_agg(person || jsonb_build_object('picture_id', null)), '[]'::jsonb)
      from jsonb_array_elements(document -> 'story_characters') as person)
    when 'story_tags' then (
      select coalesce(jsonb_agg(story_tag), '[]'::jsonb)
      from jsonb_array_elements(document -> 'story_tags') as story_tag
      where exists (select 1 from public.tags where tags.id = (story_tag ->> 'tag_id')::uuid))
    else document -> table_name
  end;
$$;

comment on function public.archived_rows_for_restore(text, jsonb) is
  'Internal: one table''s archived rows, ready to be written back (ARCHIVE-1).';
revoke execute on function public.archived_rows_for_restore(text, jsonb) from public, anon, authenticated;

/**
 * restore_archived_story: puts one archived story back, as a private draft of a new owner.
 * Inputs: the archive document and the account it now belongs to. Returns nothing. Raises
 * whatever a table refuses; the caller then leaves the story in the archive.
 * Where it fits: claim_story_archive() calls it once per story, each in its own savepoint.
 */
create or replace function public.restore_archived_story(document jsonb, new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored_story_id uuid := (document -> 'stories' -> 0 ->> 'id')::uuid;
  table_name text;
begin
  foreach table_name in array public.story_archive_tables() loop
    perform public.restore_archived_rows(table_name,
      public.archived_rows_for_restore(table_name, document), new_user_id);
    -- A new story starts with an empty plan, three acts and seven Story world sections, and a
    -- new chapter with an empty plan (their insert triggers). The archived ones replace them.
    if table_name = 'stories' then
      delete from public.story_plan_acts where story_plan_acts.story_id = restored_story_id;
      delete from public.story_bible_sections where story_bible_sections.story_id = restored_story_id;
      delete from public.story_plans where story_plans.story_id = restored_story_id;
    elsif table_name = 'chapters' then
      delete from public.chapter_plans where chapter_plans.story_id = restored_story_id;
    end if;
  end loop;
end;
$$;

comment on function public.restore_archived_story(jsonb, uuid) is
  'Internal: writes one archived story, its chapters and its Story Atlas back as a private draft (ARCHIVE-1).';
revoke execute on function public.restore_archived_story(jsonb, uuid) from public, anon, authenticated;

/**
 * my_archive_email_hash: the scrambled, confirmed email of the caller, or null.
 * Returns null for a visitor or an account whose email isn't confirmed. Raises nothing.
 */
create or replace function public.my_archive_email_hash()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.hash_email(users.email) from auth.users
  where users.id = (select auth.uid()) and users.email_confirmed_at is not null;
$$;

comment on function public.my_archive_email_hash() is
  'Internal: the SHA-256 hash of the caller''s confirmed email, or null (ARCHIVE-1).';
revoke execute on function public.my_archive_email_hash() from public, anon, authenticated;

/**
 * story_archive_wrong_tries: how many wrong tries the caller made in the last 24 hours.
 */
create or replace function public.story_archive_wrong_tries()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.rate_limit_events
  where rate_limit_events.user_id = (select auth.uid())
    and rate_limit_events.action = 'story_archive_wrong_try'
    and rate_limit_events.created_at > now() - interval '24 hours';
$$;

comment on function public.story_archive_wrong_tries() is
  'Internal: the caller''s wrong tries at bringing archived stories back in the last 24 hours (ARCHIVE-1).';
revoke execute on function public.story_archive_wrong_tries() from public, anon, authenticated;

/**
 * my_story_archive: whether archived stories wait for the caller's email address.
 * Returns {"waiting": false} or {"waiting": true, "kept_until": <date>, "locked": <boolean>}.
 * It never says how many stories or which. Raises insufficient_privilege for a visitor.
 * Where it fits: Settings › Archived stories shows its form only when "waiting" is true.
 */
create or replace function public.my_story_archive()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kept_until timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege';
  end if;
  select min(story_archives.delete_after) into kept_until
  from public.story_archives
  where public.is_feature_enabled('story_archive')
    and story_archives.email_hash = public.my_archive_email_hash()
    and story_archives.delete_after > now();
  if kept_until is null then
    return jsonb_build_object('waiting', false);
  end if;
  return jsonb_build_object('waiting', true, 'kept_until', kept_until::date,
    'locked', public.story_archive_wrong_tries()
      >= coalesce((public.setting_value('story_archive_claim_tries'))::integer, 3));
end;
$$;

comment on function public.my_story_archive() is
  'Tells a logged-in person whether archived stories wait for their confirmed email address (ARCHIVE-1).';
revoke execute on function public.my_story_archive() from public, anon;
grant execute on function public.my_story_archive() to authenticated;

/**
 * matching_story_archive_owner: the closed account whose archive the caller's answers match.
 * Inputs: the year of birth and one name (pen name, username with or without @, or the title of
 * one archived story), compared without regard to capitals or outer spaces. Returns the closed
 * account's ID, or null when nothing matches. An archive with no year of birth on record matches
 * on the name alone. Raises nothing.
 */
create or replace function public.matching_story_archive_owner(given_birth_year integer, given_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select story_archives.user_id
  from public.story_archives
  where story_archives.email_hash = public.my_archive_email_hash()
    and story_archives.delete_after > now()
    and (story_archives.birth_year is null or story_archives.birth_year = given_birth_year)
  group by story_archives.user_id
  having bool_or(lower(btrim(given_name)) = lower(btrim(story_archives.title))
    or lower(btrim(given_name)) = lower(btrim(coalesce(story_archives.pen_name, '')))
    or lower(ltrim(btrim(given_name), '@')) = lower(story_archives.handle))
  limit 1;
$$;

comment on function public.matching_story_archive_owner(integer, text) is
  'Internal: the closed account whose archived stories the caller''s email, year of birth and name match (ARCHIVE-1).';
revoke execute on function public.matching_story_archive_owner(integer, text) from public, anon, authenticated;

/**
 * restore_story_archives_of: brings back every archived story of one closed account.
 * Inputs: the closed account and the account the stories now belong to. Each story is restored
 * on its own: one that can't come back (its category is gone, say) stays in the archive and the
 * rest still return. Returns {"restored": n, "not_restored": n}. Raises nothing.
 */
create or replace function public.restore_story_archives_of(closed_user_id uuid, new_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  archive record;
  saved_claims text := current_setting('request.jwt.claims', true);
  saved_subject text := current_setting('request.jwt.claim.sub', true);
  restored integer := 0;
  not_restored integer := 0;
begin
  -- Restoring is not writing: with nobody "logged in" for these inserts, the chapter trigger
  -- that counts the day's words (count_writing_day) leaves the writing streak alone.
  perform public.email_worker_act_as(null, null);
  for archive in
    select story_archives.id, story_archives.story from public.story_archives
    where story_archives.user_id = closed_user_id and story_archives.delete_after > now()
    order by story_archives.title
  loop
    begin
      perform public.restore_archived_story(archive.story, new_user_id);
      delete from public.story_archives where story_archives.id = archive.id;
      restored := restored + 1;
    exception when others then
      -- The savepoint undid this story's rows; it stays in the archive for another try.
      not_restored := not_restored + 1;
    end;
  end loop;
  -- The caller is the caller again.
  perform set_config('request.jwt.claims', coalesce(saved_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(saved_subject, ''), true);
  return jsonb_build_object('restored', restored, 'not_restored', not_restored);
end;
$$;

comment on function public.restore_story_archives_of(uuid, uuid) is
  'Internal: restores every archived story of one closed account to a new owner, each on its own (ARCHIVE-1).';
revoke execute on function public.restore_story_archives_of(uuid, uuid) from public, anon, authenticated;

/**
 * claim_story_archive: brings the caller's archived stories back into their account.
 * Inputs: the year of birth and one of pen name, username or a story's title, as they were on the
 * closed account (Robert, 11 Nov 2026, 19:52 UTC). The caller's confirmed email must be the
 * closed account's email. Returns one of:
 *   {"outcome": "restored", "restored": n, "not_restored": n}  the stories are private drafts now
 *   {"outcome": "not_restored", "restored": 0, "not_restored": n}  matched, but none came back
 *   {"outcome": "no_match", "tries_left": n}                   the details don't match
 *   {"outcome": "locked"}                                      too many wrong tries; wait a day
 *   {"outcome": "not_allowed"}                                 the account can't write yet
 *   {"outcome": "unavailable"}                                 the switch is off
 * "no_match" is the same answer whether or not an archive exists, so it gives nothing away.
 * Raises insufficient_privilege for a visitor.
 */
create or replace function public.claim_story_archive(birth_year integer, known_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  allowed_tries integer := coalesce((public.setting_value('story_archive_claim_tries'))::integer, 3);
  wrong_tries integer;
  closed_user_id uuid;
  counts jsonb;
begin
  -- Step 1: who may ask.
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('story_archive') then
    return jsonb_build_object('outcome', 'unavailable');
  end if;
  if not public.is_active_member() or public.my_archive_email_hash() is null then
    return jsonb_build_object('outcome', 'not_allowed');
  end if;
  -- Step 2: three wrong tries lock the form for a day.
  wrong_tries := public.story_archive_wrong_tries();
  if wrong_tries >= allowed_tries then
    return jsonb_build_object('outcome', 'locked');
  end if;
  -- Step 3: the answers must match the closed account.
  closed_user_id := public.matching_story_archive_owner(birth_year, known_name);
  if closed_user_id is null then
    insert into public.rate_limit_events (user_id, action) values (caller_id, 'story_archive_wrong_try');
    return jsonb_build_object('outcome', 'no_match', 'tries_left', allowed_tries - wrong_tries - 1);
  end if;
  -- Step 4: the stories come back as private drafts.
  counts := public.restore_story_archives_of(closed_user_id, caller_id);
  return counts || jsonb_build_object('outcome',
    case when (counts ->> 'restored')::integer > 0 then 'restored' else 'not_restored' end);
end;
$$;

comment on function public.claim_story_archive(integer, text) is
  'Brings the caller''s archived stories back as private drafts when their confirmed email, year of birth and one name match; three wrong tries lock it for a day (ARCHIVE-1).';
revoke execute on function public.claim_story_archive(integer, text) from public, anon;
grant execute on function public.claim_story_archive(integer, text) to authenticated;

/* ---------- 5. The end of an archive ---------- */

/**
 * purge_story_archives: deletes the archives whose years are up. Returns how many stories went.
 * Where it fits: pg_cron, nightly. If the business closes, the whole table is deleted by hand
 * (docs/retention.md).
 */
create or replace function public.purge_story_archives()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  delete from public.story_archives where story_archives.delete_after <= now();
  get diagnostics purged = row_count;
  return purged;
end;
$$;

comment on function public.purge_story_archives() is
  'Nightly: deletes archived stories older than story_archive_years (ARCHIVE-1).';
revoke execute on function public.purge_story_archives() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-story-archives', '50 3 * * *', 'select public.purge_story_archives()');

/* ---------- 6. The deletion and export lists ---------- */

/**
 * data_export_tables: as before; the archive is left out of a person's copy (ARCHIVE-1).
 */
create or replace function public.data_export_tables()
 returns table(table_name text, is_included boolean, why_left_out text)
 language sql
 immutable
 set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('account_last_used', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_moves', true, null),
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
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_post_votes', true, null),
    ('forum_thread_follows', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('member_last_active', true, null),
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
    ('reading_list_stories', true, null),
    ('reading_lists', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_archives', false, 'the stories of a closed account, kept for their writer; a person who brings them back gets them as their own stories'),
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
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before; the archive outlives the account it came from (ARCHIVE-1).
 */
create or replace function public.account_deletion_rules()
 returns table(table_name text, action text, step integer, why text)
 language sql
 immutable
 set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('account_last_used', 'delete', 1, null),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_moves', 'delete', 1, null),
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
    ('contest_entries', 'delete', 1, null),
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
    ('forum_post_votes', 'delete', 1, null),
    ('forum_thread_follows', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('member_last_active', 'delete', 1, null),
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
    ('reading_list_stories', 'delete', 1, null),
    ('reading_lists', 'delete', 2, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_archives', 'kept', 0, 'the archive of an unused account''s stories, kept story_archive_years so the writer can bring them back (ARCHIVE-1)'),
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
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;
