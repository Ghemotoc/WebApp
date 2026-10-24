/*
 * Migration: like a chapter (story S1-E6-03; board 3.5, the Like button after the chapter).
 *
 * What it adds:
 * - chapter_likes: who likes which chapter, one row per person and chapter (architecture 1.6
 *   names `likes`; the table says what is liked, so a later "like a post" gets its own table with
 *   a real foreign key, as follows_users and follows_stories do).
 * - readable_chapter(story_slug, chapter_code): the chapter behind an address when the caller may
 *   read it (the same rules as get_chapter(): rating, blocks, deleted, moderated, unpublished).
 *   Likes and comments (S1-E6-01) both start with it, so the rules live in one place.
 * - chapter_like_state(story_slug, chapter_code): the public like count and whether the caller
 *   likes it, for the Like button.
 * - like_chapter(story_slug, chapter_code, should_like): the only write. It takes the chapter's
 *   address, goes through the account gate (is_active_member()) and answers the new state.
 * - chapter_like_totals(): every chapter's like count and the last 7 days' likes, for the
 *   popularity job (S1-E5-03: "Given likes, when the popularity job runs, then they feed the
 *   score"). The writer's own like is left out, so nobody lifts their own story.
 * - story_like_total(story_id): a story's likes over all its readable chapters, for the story
 *   page's stats row (S1-E5-01).
 * - get_chapter() now also answers the chapter's row ID, which the "Report chapter" button sends
 *   (S1-E10-01's shared contract: "the row ID for anything else"). Never the user ID.
 * Who calls it: src/features/reading/api/likes.ts (LikeButton); the popularity job (S1-E5-03).
 * Tests: supabase/tests/database/148-chapter-likes.test.sql.
 */

/* ---------- Table ---------- */

create table public.chapter_likes (
  id uuid primary key default gen_random_uuid(),
  -- The reader who likes the chapter (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_likes_one_per_pair unique (user_id, chapter_id)
);
comment on table public.chapter_likes is
  'kind: user_action
Who likes which chapter (S1-E6-03). The count is public; who liked is nobody else''s business.';
create index chapter_likes_chapter_id on public.chapter_likes (chapter_id);
create trigger chapter_likes_set_updated_at
  before update on public.chapter_likes
  for each row execute function public.set_updated_at();
create trigger chapter_likes_refuse_user_id_change
  before update on public.chapter_likes
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.chapter_likes enable row level security;

-- Who: the reader who liked. Why: their own likes (the Library, later); nobody, the writer
-- included, reads who liked a chapter, only the count through chapter_like_state(). Writes go
-- only through like_chapter(), so there are no write policies.
create policy chapter_likes_select_own on public.chapter_likes
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.chapter_likes to authenticated;

/* ---------- The chapter behind an address ---------- */

/**
 * readable_chapter: the chapter behind an address, when the caller may read it.
 * Inputs: story_slug, chapter_code. Returns: the chapter row, or nothing when the story is
 *   deleted, hidden by a moderator, rated above the caller's age or by someone either side
 *   blocks (reader_visible_story()), or the chapter isn't published or was moderated away
 *   (chapter_is_readable()). The same rules as get_chapter() (ADR 0004).
 * Internal: like_chapter(), chapter_like_state() and the comment functions (S1-E6-01).
 */
create or replace function public.readable_chapter(story_slug text, chapter_code text)
returns setof public.chapters
language sql
stable
security definer
set search_path = ''
as $$
  select chapters.* from public.chapters
  join public.reader_visible_story(story_slug) as story on story.id = chapters.story_id
  where chapters.code = chapter_code
    and public.chapter_is_readable(chapters.id);
$$;
comment on function public.readable_chapter(text, text) is
  'Internal: the chapter behind an address when the caller may read it (S1-E6-03).';
revoke execute on function public.readable_chapter(text, text) from public, anon, authenticated;

/* ---------- Counts ---------- */

/**
 * chapter_like_count_of: how many live accounts like a chapter.
 * Input: target_chapter_id. Returns: the number (deleted accounts don't count).
 * Internal: chapter_like_state() and like_chapter().
 */
create or replace function public.chapter_like_count_of(target_chapter_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.chapter_likes
  join public.profiles on profiles.id = chapter_likes.user_id
  where chapter_likes.chapter_id = target_chapter_id
    and profiles.deleted_at is null;
$$;
comment on function public.chapter_like_count_of(uuid) is 'Internal: a chapter''s public like count (S1-E6-03).';
revoke execute on function public.chapter_like_count_of(uuid) from public, anon, authenticated;

/**
 * like_state_of: the answer the Like button reads, for one chapter and the caller.
 * Input: target_chapter_id. Returns: JSON {"liked": bool, "like_count": n}.
 * Internal: chapter_like_state() and like_chapter().
 */
create or replace function public.like_state_of(target_chapter_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'liked', exists (select 1 from public.chapter_likes
      where chapter_likes.chapter_id = target_chapter_id and chapter_likes.user_id = (select auth.uid())),
    'like_count', public.chapter_like_count_of(target_chapter_id));
$$;
comment on function public.like_state_of(uuid) is 'Internal: liked and like_count for the caller (S1-E6-03).';
revoke execute on function public.like_state_of(uuid) from public, anon, authenticated;

/**
 * chapter_like_state: a chapter's like count, and whether the caller likes it.
 * Inputs: story_slug, chapter_code. Returns: JSON {"liked": bool, "like_count": n}; null when the
 *   caller may not read the chapter. A visitor gets the count and liked false.
 * Where it fits: LikeButton at the end of the chapter (board 3.5).
 */
create or replace function public.chapter_like_state(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_chapter_id uuid;
begin
  select readable_chapter.id into target_chapter_id from public.readable_chapter(story_slug, chapter_code);
  if target_chapter_id is null then
    return null;
  end if;
  return public.like_state_of(target_chapter_id);
end;
$$;
comment on function public.chapter_like_state(text, text) is
  'A chapter''s public like count and whether the caller likes it (S1-E6-03).';
grant execute on function public.chapter_like_state(text, text) to anon, authenticated;

/* ---------- Like and unlike ---------- */

/**
 * like_chapter: likes or unlikes a chapter by its address.
 * Inputs: story_slug, chapter_code; should_like (true to like, false to take the like back).
 * Returns: JSON {"liked": bool, "like_count": n}, the state afterwards.
 * Rules: the chapter must be one the caller may read. Taking a like back always works; liking is
 *   a write, so the account gate applies (architecture 1.7.8; a read-only account can't like).
 *   Liking twice changes nothing. A writer may like their own chapter (the popularity job leaves
 *   it out).
 * Errors: insufficient_privilege when signed out or the account may not write; no_data_found
 *   when the caller may not read the chapter.
 */
create or replace function public.like_chapter(story_slug text, chapter_code text, should_like boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_chapter_id uuid;
begin
  -- Step 1: signed in, and the chapter is one this reader may open.
  if caller_id is null then
    raise exception 'Log in to like chapters.' using errcode = 'insufficient_privilege';
  end if;
  select readable_chapter.id into target_chapter_id from public.readable_chapter(story_slug, chapter_code);
  if target_chapter_id is null then
    raise exception 'There is no such chapter.' using errcode = 'no_data_found';
  end if;
  -- Step 2: taking a like back is always allowed, even for a read-only account.
  if not should_like then
    delete from public.chapter_likes
    where chapter_likes.user_id = caller_id and chapter_likes.chapter_id = target_chapter_id;
    return public.like_state_of(target_chapter_id);
  end if;
  -- Step 3: liking is a write, so the account gate applies.
  if not public.is_active_member() then
    raise exception 'Your account can''t like chapters right now.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 4: like; twice changes nothing.
  insert into public.chapter_likes (user_id, chapter_id) values (caller_id, target_chapter_id)
  on conflict on constraint chapter_likes_one_per_pair do nothing;
  return public.like_state_of(target_chapter_id);
end;
$$;
comment on function public.like_chapter(text, text, boolean) is
  'Likes or unlikes a chapter by its address, through the account gate (S1-E6-03).';
revoke execute on function public.like_chapter(text, text, boolean) from public, anon;
grant execute on function public.like_chapter(text, text, boolean) to authenticated;

/* ---------- For the popularity job and the story page ---------- */

/**
 * chapter_like_totals: every readable chapter's likes, for the popularity job.
 * Returns: rows of chapter_id, story_id, like_count and likes_last_7_days. The writer's own like
 *   and likes from deleted accounts are left out, so nobody lifts their own story.
 * Who may call it: nobody from the app; the ranking job (S1-E5-03, a pg_cron SQL function) reads
 *   it as the database owner. Story S1-E6-03, second criterion: "Given likes, when the popularity
 *   job runs, then they feed the score."
 */
create or replace function public.chapter_like_totals()
returns table (chapter_id uuid, story_id uuid, like_count integer, likes_last_7_days integer)
language sql
stable
security definer
set search_path = ''
as $$
  select chapters.id, chapters.story_id,
    count(chapter_likes.id)::integer,
    (count(chapter_likes.id) filter (where chapter_likes.created_at > now() - interval '7 days'))::integer
  from public.chapters
  join public.chapter_likes on chapter_likes.chapter_id = chapters.id
  join public.profiles on profiles.id = chapter_likes.user_id
  where public.chapter_is_readable(chapters.id)
    and chapter_likes.user_id <> chapters.user_id
    and profiles.deleted_at is null
  group by chapters.id, chapters.story_id;
$$;
comment on function public.chapter_like_totals() is
  'Internal: each readable chapter''s likes without the writer''s own, for the popularity job (S1-E6-03 for S1-E5-03).';
revoke execute on function public.chapter_like_totals() from public, anon, authenticated;

/**
 * story_like_total: a story's likes over all its readable chapters, the public number.
 * Input: target_story_id. Returns: the number.
 * Internal: the story page's stats row (S1-E5-01) reads it through get_story_page().
 */
create or replace function public.story_like_total(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.chapter_likes
  join public.chapters on chapters.id = chapter_likes.chapter_id
  join public.profiles on profiles.id = chapter_likes.user_id
  where chapters.story_id = target_story_id
    and public.chapter_is_readable(chapters.id)
    and profiles.deleted_at is null;
$$;
comment on function public.story_like_total(uuid) is 'Internal: a story''s public like total (S1-E6-03).';
revoke execute on function public.story_like_total(uuid) from public, anon, authenticated;

/* ---------- get_chapter() answers the chapter's row ID ---------- */

/**
 * get_chapter: as in S1-E4-04, plus 'id', the chapter's row ID, so the reader's "Report chapter"
 * button can name it (S1-E10-01's contract: a row ID for anything but a profile). The row ID is
 * not personal data; the user ID still never leaves the database (architecture 1.6).
 * Inputs: story_slug, chapter_code. Returns: JSON as before; null when the reader may not see it.
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
  -- Step 5: the answer.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'slug', story.slug,
      'title', story.title,
      'language_code', story.language_code,
      'writer', (select jsonb_build_object(
          'display_name', public.display_name(profiles.handle, profiles.pen_name),
          'handle', profiles.handle)
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
    'body', text_to_send);
end;
$$;

comment on function public.get_chapter(text, text) is
  'A chapter as readers see it, the teaser for signed-out visitors; null when the reader may not (rating, blocks, deleted, moderated, unpublished) (S1-E4-01a, S1-E4-04, S1-E6-03).';
revoke execute on function public.get_chapter(text, text) from public;
grant execute on function public.get_chapter(text, text) to anon, authenticated;
