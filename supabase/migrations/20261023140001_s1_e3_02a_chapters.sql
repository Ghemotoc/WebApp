-- Migration: chapters and the chapter draft (story S1-E3-02a; architecture B13, ADR 0004, 0005).
--
-- What it adds:
--   reportable_type 'chapter'      every chapter can be reported (CLAUDE.md rule 6).
--   chapter_status, revision_reason  the enums.
--   chapters                       one row per chapter: the draft (title, body, version) and,
--                                  from S1-E3-03, the published copy; owned by the writer.
--   chapter_revisions              snapshots written when a chapter is published, edited or
--                                  restored (S1-E3-03, S1-E11-08); created here, empty for now.
--   normalise_romanian_letters()   ş/ţ (cedilla) → ș/ț (comma below) on the server too
--                                  (CLAUDE.md rule 4; closes the docs/mocks.md line).
--   count_words(), check_chapter_text()  the word count and the sanitising rules (rule 8).
--   create_chapter(story_slug)     a new empty chapter at the end of the writer's story.
--   save_chapter_draft(...)        the autosave: refuses a stale version (the conflict S1-E3-02b
--                                  shows), sanitises, counts words.
--   delete_my_story(), restore_my_story()  now take the chapters along (S1-E3-05 said they would).
-- Decisions:
--   - The stored format is the Markdown subset of CLAUDE.md rule 8 (ADR 0005): the server
--     refuses raw HTML tags and javascript:/data: links; the browser drops anything else first.
--   - Readers never read this table: get_chapter() (S1-E4-01a) serves published text only.
--   - A chapter's address is an 8-character code, never its position, so reordering (S1-E3-04)
--     never breaks a link.

/* ---------- Enums and the reportable value ---------- */

alter type public.reportable_type add value if not exists 'chapter';

/** chapter_status: draft, scheduled (S1-E3-03) or published. */
create type public.chapter_status as enum ('draft', 'scheduled', 'published');
comment on type public.chapter_status is 'Draft, scheduled or published (S1-E3-02a, S1-E3-03).';

/** revision_reason: why a snapshot was taken. */
create type public.revision_reason as enum ('published', 'edited', 'restored');
comment on type public.revision_reason is 'Why a chapter revision was written: published, edited or restored (S1-E3-03, S1-E11-08).';

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('chapter_max_characters', '100000'::jsonb, true,
   'The longest chapter body save_chapter_draft() accepts, in characters (S1-E3-02a, proposal).');

/* ---------- Text helpers ---------- */

/**
 * normalise_romanian_letters: swaps the cedilla look-alikes ş, ţ, Ş, Ţ for the comma-below
 * letters ș, ț, Ș, Ț (CLAUDE.md rule 4). The browser does the same as people type
 * (src/lib/romanian-text.ts); this is the server's copy, so saved text is always right.
 * Input: any text. Returns: the same text with the four letters swapped. Errors: none.
 */
create or replace function public.normalise_romanian_letters(input_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(coalesce(input_text, ''), 'şţŞŢ', 'șțȘȚ');
$$;

comment on function public.normalise_romanian_letters(text) is
  'ş/ţ with a cedilla become ș/ț with a comma below, on the server too (S1-E3-02a, rule 4).';
grant execute on function public.normalise_romanian_letters(text) to anon, authenticated;

/**
 * count_words: how many words a chapter body has, ignoring Markdown marks.
 * Input: the body. Returns: the number of runs of letters, digits or apostrophes (so
 *   "**Bunica** n-a" counts 2... "Bunica" and "n-a" count as "Bunica", "n", "a": 3). Good enough
 *   for the writer's counter and the minutes-to-read (S1-E4-01a); never shown as a precise figure.
 */
create or replace function public.count_words(body text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(
    array_remove(regexp_split_to_array(regexp_replace(coalesce(body, ''), '[^[:alnum:]'']+', ' ', 'g'), '\s+'), ''),
    1), 0);
$$;

comment on function public.count_words(text) is
  'Words in a chapter body, Markdown marks ignored (S1-E3-02a).';
grant execute on function public.count_words(text) to anon, authenticated;

/**
 * check_chapter_text: the sanitising rules for a chapter body, on the server (rule 8, ADR 0005).
 * Input: the body as Markdown. Returns: the body with ş/ţ corrected.
 * Errors: check_violation for a raw HTML tag ("<script>", "<img ...>", "</p>"), a javascript:
 *   or data: link, or a body over chapter_max_characters.
 * Internal: save_chapter_draft() calls it; S1-E3-03's publish reads what it saved.
 */
create or replace function public.check_chapter_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := public.normalise_romanian_letters(body);
  longest integer := coalesce((public.setting_value('chapter_max_characters'))::integer, 100000);
begin
  -- Step 1: the length limit (a setting; proposal 100,000 characters).
  if char_length(clean_body) > longest then
    raise exception 'A chapter can have at most % characters (S1-E3-02a).', longest using errcode = 'check_violation';
  end if;
  -- Step 2: no raw HTML. The Markdown subset never needs a tag, so any "<letter" or "</" is refused;
  -- a plain "<" between numbers ("3 < 4") is fine, and so is escaped text ("\<script\>" is the
  -- literal words): the backslash pairs are taken out before looking, so "\\<script>" (an escaped
  -- backslash and then a real tag) is still caught.
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a chapter (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  -- Step 3: links may only be http, https or mailto; javascript: and data: are refused anywhere.
  if clean_body ~* '(javascript|data|vbscript)\s*:' then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  return clean_body;
end;
$$;

comment on function public.check_chapter_text(text) is
  'Internal: refuses HTML tags, script links and over-long text; corrects ş/ţ (S1-E3-02a, rule 8).';
revoke execute on function public.check_chapter_text(text) from public, anon, authenticated;

/* ---------- chapters ---------- */

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  -- The story's writer (CLAUDE.md rule 15); a trigger keeps it equal to the story's owner.
  user_id uuid not null references public.profiles (id),
  -- The public address part: 8 random characters, fixed at creation (never the position).
  code text not null unique,
  -- Where it sits in the story, 1-based; S1-E3-04 reorders.
  position integer not null,
  -- The draft the writer is working on; the published copy is separate (S1-E3-03).
  draft_title text not null default '',
  draft_body text not null default '',
  -- Grows by one on every save; a save with a stale version is a conflict (S1-E3-02b).
  draft_version integer not null default 1,
  draft_saved_at timestamptz,
  published_title text,
  published_body text,
  status public.chapter_status not null default 'draft',
  scheduled_for timestamptz,
  first_published_at timestamptz,
  last_published_at timestamptz,
  -- Set when a published chapter is updated ("Edited on", S1-E3-03).
  edited_at timestamptz,
  word_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_code_shape check (code ~ '^[a-z0-9]{8}$'),
  constraint chapters_position_positive check (position >= 1),
  constraint chapters_draft_title_length check (char_length(draft_title) <= 120),
  constraint chapters_draft_version_positive check (draft_version >= 1)
);

comment on table public.chapters is
  'kind: user_content; reportable: chapter
One row per chapter: the draft and, once published, the public copy; owned by the story''s writer (S1-E3-02a).';
comment on column public.chapters.user_id is
  'The writer''s user ID, always the story''s owner (a trigger enforces it); never shown publicly (rule 15).';
comment on column public.chapters.code is
  'The 8-character public address part (/s/<story>/<code>); fixed at creation, so reordering never breaks a link.';
comment on column public.chapters.draft_version is
  'Grows on every save; save_chapter_draft() refuses a stale expected_version, which S1-E3-02b shows as a conflict.';

-- The chapter list of a story, in order, live rows only (Manage chapters, the story page).
create index chapters_story_position_idx on public.chapters (story_id, position) where deleted_at is null;

create trigger chapters_set_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();

create trigger chapters_refuse_user_id_change
  before update on public.chapters
  for each row execute function public.refuse_user_id_change('user_id');

/**
 * chapters_user_id_matches_story: a chapter always belongs to its story's writer.
 * Why: the owner column is what every policy checks; it must never drift from the story.
 * Errors: check_violation when user_id is not the story's user_id.
 */
create or replace function public.chapters_user_id_matches_story()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> (select stories.user_id from public.stories where stories.id = new.story_id) then
    raise exception 'A chapter must belong to its story''s writer (S1-E3-02a).' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.chapters_user_id_matches_story() is
  'Trigger: a chapter''s user_id is always the story''s owner (S1-E3-02a).';
revoke execute on function public.chapters_user_id_matches_story() from public, anon, authenticated;

create trigger chapters_user_id_matches_story
  before insert or update on public.chapters
  for each row execute function public.chapters_user_id_matches_story();

alter table public.chapters enable row level security;

/**
 * Policy chapters_select_own: a writer reads their own chapters, drafts and deleted ones included.
 * Why only the owner: readers get published text through get_chapter() (S1-E4-01a), which checks
 * the status, the rating and blocks and leaves the user ID out (ADR 0004).
 */
create policy chapters_select_own
  on public.chapters
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy chapters_select_own on public.chapters is
  'Allows a writer to read only their own chapters; readers go through get_chapter() (ADR 0004).';

-- Table privileges, exactly what the policy needs: the owner may read. Every write goes through
-- create_chapter(), save_chapter_draft() and the publish functions (S1-E3-03).
revoke all on public.chapters from anon, authenticated;
grant select on public.chapters to authenticated;  -- chapters_select_own

/* ---------- chapter_revisions ---------- */

create table public.chapter_revisions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The writer who owns the chapter (rule 15), not necessarily who took the snapshot.
  user_id uuid not null references public.profiles (id),
  -- Who took it: the writer (publish, update) or a staff member (a restore, S1-E11-08).
  created_by_user_id uuid not null references public.profiles (id),
  reason public.revision_reason not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.chapter_revisions is
  'kind: user_content; reportable: chapter
Snapshots of a chapter''s text when it is published, edited or restored; written by S1-E3-03 and S1-E11-08 (S1-E3-02a).';

create index chapter_revisions_chapter_idx on public.chapter_revisions (chapter_id, created_at desc);

alter table public.chapter_revisions enable row level security;

/**
 * Policy chapter_revisions_select_own: a writer reads the history of their own chapters.
 * Why: "see the version history" (S1-E11-08) is the writer's too; staff read through admin
 * functions.
 */
create policy chapter_revisions_select_own
  on public.chapter_revisions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy chapter_revisions_select_own on public.chapter_revisions is
  'Allows a writer to read the revisions of their own chapters; nobody writes them through the API.';

revoke all on public.chapter_revisions from anon, authenticated;
grant select on public.chapter_revisions to authenticated;  -- chapter_revisions_select_own

/* ---------- Making and saving chapters ---------- */

/**
 * chapter_code: a fresh 8-character address part for a chapter (letters and digits).
 * Returns: a code not yet in use. Internal: create_chapter() calls it.
 */
create or replace function public.chapter_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  candidate text;
begin
  loop
    -- Eight random picks from the alphabet; a clash is a 1-in-2.8-trillion event, so just retry.
    select string_agg(substr(alphabet, (floor(random() * 36) + 1)::integer, 1), '')
      into candidate from generate_series(1, 8);
    exit when not exists (select 1 from public.chapters where chapters.code = candidate);
  end loop;
  return candidate;
end;
$$;

comment on function public.chapter_code() is 'Internal: a fresh 8-character chapter address (S1-E3-02a).';
revoke execute on function public.chapter_code() from public, anon, authenticated;

/**
 * create_chapter: adds an empty chapter at the end of the caller's own story.
 * Input: story_slug. Returns: {"outcome": "ok", "code": "<8 chars>", "position": n},
 *   {"outcome": "not_active"} when the account may not write yet, or {"outcome": "not_found"}
 *   when the caller has no live story at that address.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Create and write chapter one" (NewStoryPage) and "+ New chapter" (S1-E3-04)
 *   call it, then open the editor at /write/s/<slug>/c/<code>.
 */
create or replace function public.create_chapter(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  new_code text;
  new_position integer;
begin
  -- Step 1: a signed-in writer who may write, and their own live story (the account gate).
  if caller_id is null then
    raise exception 'Sign in to add a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the next position after the story's live chapters, and a fresh address.
  select coalesce(max(chapters.position), 0) + 1 into new_position
  from public.chapters where chapters.story_id = target_story_id and chapters.deleted_at is null;
  new_code := public.chapter_code();
  insert into public.chapters (story_id, user_id, code, position)
  values (target_story_id, caller_id, new_code, new_position);
  return jsonb_build_object('outcome', 'ok', 'code', new_code, 'position', new_position);
end;
$$;

comment on function public.create_chapter(text) is
  'Adds an empty chapter to the caller''s own story: {outcome: ok, code, position} | not_active | not_found (S1-E3-02a).';
revoke execute on function public.create_chapter(text) from public, anon;
grant execute on function public.create_chapter(text) to authenticated;

/**
 * save_chapter_draft: the autosave. Saves the title and body of the caller's own chapter when
 * the version they started from is still the current one.
 * Inputs: chapter_code; title (up to 120 characters); body (the Markdown subset);
 *   expected_version (the draft_version the editor loaded or last saved).
 * Returns: {"status": "saved", "version": n, "saved_at": ..., "word_count": n};
 *   {"status": "conflict", "version": n, "saved_at": ...} when another device saved first
 *   (S1-E3-02b shows "This chapter was changed on another device"); {"status": "not_active"};
 *   {"status": "not_found"} when the caller has no live chapter at that code.
 * Errors: insufficient_privilege when signed out; check_violation from check_chapter_text() or
 *   a title over 120 characters.
 * Where it fits: useAutosave() calls it every 10 seconds while there are changes and on blur.
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
  -- Step 4: the rules (rule 8): length, no HTML, safe links; ş/ţ corrected.
  if char_length(clean_title) > 120 then
    raise exception 'A chapter title can have at most 120 characters (S1-E3-02a).' using errcode = 'check_violation';
  end if;
  clean_body := public.check_chapter_text(body);
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

comment on function public.save_chapter_draft(text, text, text, integer) is
  'The autosave: {status: saved, version, saved_at, word_count} | conflict | not_active | not_found (S1-E3-02a).';
revoke execute on function public.save_chapter_draft(text, text, text, integer) from public, anon;
grant execute on function public.save_chapter_draft(text, text, text, integer) to authenticated;

/* ---------- The chapters follow the story's soft delete (S1-E3-05 promised this) ---------- */

/**
 * delete_my_story: as in S1-E3-05, and now the story's live chapters get the same deleted_at,
 * so restore_my_story() can tell them apart from chapters deleted on their own (S1-E3-04).
 */
create or replace function public.delete_my_story(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  deleted_time timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to delete a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Hidden at once: every reader path checks deleted_at; the owner still sees it for undo.
  update public.stories set deleted_at = deleted_time where stories.id = target_story_id;
  -- The chapters go with it, stamped with the same moment so undo brings back exactly these.
  update public.chapters set deleted_at = deleted_time
  where chapters.story_id = target_story_id and chapters.deleted_at is null;
  return jsonb_build_object('outcome', 'ok',
    'purge_on', ((deleted_time + make_interval(days => purge_days)) at time zone 'Europe/Bucharest')::date);
end;
$$;

/**
 * restore_my_story: as in S1-E3-05, and now the chapters deleted with the story come back too;
 * a chapter the writer had deleted on its own before stays deleted.
 */
create or replace function public.restore_my_story(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  story public.stories;
begin
  if caller_id is null then
    raise exception 'Sign in to restore a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  -- Step 1: the caller's own deleted story at that address, still within the undo time.
  select * into story from public.stories
  where stories.slug = story_slug and stories.user_id = caller_id
    and stories.deleted_at is not null
    and stories.deleted_at > now() - make_interval(days => purge_days);
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the story and the chapters that went with it (same deleted_at) come back.
  update public.chapters set deleted_at = null
  where chapters.story_id = story.id and chapters.deleted_at = story.deleted_at;
  update public.stories set deleted_at = null where stories.id = story.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
