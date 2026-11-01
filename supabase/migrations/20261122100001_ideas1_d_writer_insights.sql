/*
 * For writers, totals only: most-loved lines and where readers stop (bundle IDEAS-1, part d;
 * ideas IDEA-20261031-1 and -5).
 *
 * What it adds:
 * - paragraph_shares: how many times each paragraph was in a shared passage or picture link each
 *   day. Totals only, never who (like chapter_shares). A paragraph is known by the fingerprint of
 *   its words (paragraph_key_of(), S1-E6-06), so an edit that moves it keeps its count and one
 *   that rewrites it starts afresh.
 * - record_passage_share(): counts a passage or picture link's share once for the chapter (as
 *   record_chapter_share() does) and once for each paragraph it covers, under the same hourly
 *   limit.
 * - writer_chapter_insights(): for the writer's own chapter, the top five paragraphs by shares
 *   plus paragraph comments (idea 1), and where readers' saved places sit, in tenths of the
 *   chapter (idea 5). Every number goes through the "fewer than 5" rule (shown_count(),
 *   S1-E3-07), and the bar is left out entirely below five readers. Never a reader's ID.
 * Who calls it: the sharing feature's countShare() (src/features/sharing/lib/countShare.ts) and
 *   the writer dashboard's "Lines and stops" (src/features/writing/components/ChapterInsights.tsx).
 * Privacy: no new personal data. reading_positions stays private to each reader; only the
 *   tenths, as shares of five or more readers, leave the database.
 */

/* ---------- Paragraph share totals ---------- */

create table public.paragraph_shares (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The paragraph's fingerprint (paragraph_key_of()), never its words.
  paragraph_key text not null,
  -- The day in Romania (Q7), as chapter_shares.
  shared_on date not null,
  total integer not null default 0,
  primary key (chapter_id, paragraph_key, shared_on),
  constraint paragraph_shares_total_not_negative check (total >= 0)
);
comment on table public.paragraph_shares is
  'kind: platform. How many times each paragraph was in a shared passage or picture link each day: totals only, never who (IDEAS-1d).';
alter table public.paragraph_shares enable row level security;

-- Who: the writer of the chapter. Why: their own most-loved lines (IDEAS-1d); nobody else sees
-- another writer's totals. Writes go only through record_passage_share().
create policy paragraph_shares_select_owner on public.paragraph_shares
  for select to authenticated
  using (exists (
    select 1 from public.chapters
    where chapters.id = paragraph_shares.chapter_id and chapters.user_id = (select auth.uid())
  ));
comment on policy paragraph_shares_select_owner on public.paragraph_shares is
  'The chapter''s writer reads its paragraph share totals; nobody else (IDEAS-1d).';

grant select on public.paragraph_shares to authenticated;

/**
 * record_passage_share: counts one share of a passage or picture link (S1-E4-11) for the chapter
 *   and for each paragraph it covers (IDEAS-1d).
 * Inputs: story_slug, chapter_code, first_block and last_block (blocks counted from 1, at most 5).
 * Returns: true when counted; false when the caller may not read the chapter, is its writer, the
 *   range is wrong or they shared a lot in the last hour (the share still happens on the device;
 *   it only isn't counted, S1-E10-12).
 * Errors: refuses a signed-out caller.
 * Flow: "Copy link to this passage" and the picture card, after the copy → countShare() → this →
 *   chapter_shares (the ranking) and paragraph_shares (the writer's most-loved lines).
 */
create or replace function public.record_passage_share(
  story_slug text,
  chapter_code text,
  first_block integer,
  last_block integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  shared record;
  today date := (now() at time zone 'Europe/Bucharest')::date;
begin
  -- Step 1: only a signed-in reader's share counts.
  if caller_id is null then
    raise exception 'Log in to share chapters.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a chapter they may read, not their own, and a range of one to five blocks.
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if not found or shared.writer_id = caller_id then
    return false;
  end if;
  if first_block is null or last_block is null or first_block < 1 or last_block < first_block
    or last_block - first_block > 4 then
    return false;
  end if;
  -- Step 3: the same hourly limit as any share; past it nothing is counted, nothing refused.
  begin
    perform public.take_rate_limit('chapter_share');
  exception when program_limit_exceeded then
    return false;
  end;
  -- Step 4: one more on the chapter's total, then on each covered paragraph's.
  perform public.add_chapter_share(shared.chapter_id);
  insert into public.paragraph_shares (chapter_id, paragraph_key, shared_on, total)
  select shared.chapter_id, paragraphs.paragraph_key, today, 1
  from public.chapters,
    lateral public.chapter_paragraphs(chapters.published_body) as paragraphs
  where chapters.id = shared.chapter_id
    and paragraphs.block_number between first_block and last_block
  on conflict (chapter_id, paragraph_key, shared_on)
    do update set total = public.paragraph_shares.total + 1;
  return true;
end;
$$;
comment on function public.record_passage_share(text, text, integer, integer) is
  'Counts one share of a passage or picture link for its chapter and paragraphs; never records who (IDEAS-1d).';
revoke execute on function public.record_passage_share(text, text, integer, integer) from public, anon;
grant execute on function public.record_passage_share(text, text, integer, integer) to authenticated;

/* ---------- The writer's view ---------- */

/**
 * paragraph_excerpt: the first words of a paragraph as the dashboard shows them: a picture as
 *   its alt text in brackets, other Markdown marks dropped, at most 160 characters.
 * Input: the block's text. Returns: the excerpt. Internal: writer_loved_lines().
 */
create or replace function public.paragraph_excerpt(block_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(btrim(regexp_replace(regexp_replace(
    regexp_replace(coalesce(block_text, ''), '!\[([^\]]*)\]\([^)]*\)', '[\1]', 'g'),
    '[*_>#`]+', '', 'g'), '\s+', ' ', 'g')), 160);
$$;
comment on function public.paragraph_excerpt(text) is
  'Internal: a paragraph''s first words for the dashboard (IDEAS-1d).';
revoke execute on function public.paragraph_excerpt(text) from public, anon, authenticated;

/**
 * writer_loved_lines: a chapter's five paragraphs that readers shared and commented on most
 *   (idea IDEA-20261031-1).
 * Inputs: the chapter and its writer. Returns: JSON array of {number, excerpt, shares, comments,
 *   total}, most first; only paragraphs in today's text with at least one action. Every count
 *   goes through shown_count() ("fewer than 5"). Comments are other people's paragraph comments
 *   still shown under the chapter; the writer's own never count.
 * Internal: writer_chapter_insights().
 */
create or replace function public.writer_loved_lines(target_chapter_id uuid, writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with paragraphs as (
    select blocks.block_number, blocks.block_text, public.paragraph_key_of(blocks.block_text) as paragraph_key
    from public.chapters, lateral public.chapter_blocks(chapters.published_body) as blocks
    where chapters.id = target_chapter_id
  ),
  counted as (
    select paragraphs.block_number, paragraphs.block_text,
      (select coalesce(sum(paragraph_shares.total), 0) from public.paragraph_shares
        where paragraph_shares.chapter_id = target_chapter_id
          and paragraph_shares.paragraph_key = paragraphs.paragraph_key) as shares,
      (select count(*) from public.comments
        where comments.chapter_id = target_chapter_id
          and comments.paragraph_key = paragraphs.paragraph_key
          and comments.user_id <> writer_id
          and public.comment_is_shown_to_caller(comments)) as comments
    from paragraphs
  ),
  top_five as (
    select * from counted where shares + comments > 0
    order by shares + comments desc, block_number
    limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'number', top_five.block_number,
    'excerpt', public.paragraph_excerpt(top_five.block_text),
    'shares', public.shown_count(top_five.shares),
    'comments', public.shown_count(top_five.comments),
    'total', public.shown_count(top_five.shares + top_five.comments)
  ) order by top_five.shares + top_five.comments desc, top_five.block_number), '[]'::jsonb)
  from top_five;
$$;
comment on function public.writer_loved_lines(uuid, uuid) is
  'Internal: a chapter''s five most shared and commented paragraphs, "fewer than 5" below five (IDEAS-1d).';
revoke execute on function public.writer_loved_lines(uuid, uuid) from public, anon, authenticated;

/**
 * writer_reader_stops: where readers' saved places sit in a chapter, in tenths (idea
 *   IDEA-20261031-5).
 * Inputs: the chapter and its writer. Returns: JSON {readers, tenths}: readers through
 *   shown_count(); tenths is ten whole percentages (0 to 10 %, 10 to 20 % … 90 to 100 %, the end
 *   counted in the last), or null below five readers, so no bar can point to one reader. Each
 *   reader counts once (their latest place); the writer's own place never counts.
 * Internal: writer_chapter_insights().
 */
create or replace function public.writer_reader_stops(target_chapter_id uuid, writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with places as (
    select least(reading_positions.percent / 10, 9) as tenth
    from public.reading_positions
    where reading_positions.chapter_id = target_chapter_id and reading_positions.user_id <> writer_id
  ),
  totals as (select count(*) as readers from places)
  select jsonb_build_object(
    'readers', public.shown_count(totals.readers),
    'tenths', case when totals.readers < 5 then null else (
      select jsonb_agg(round(100.0 * (select count(*) from places where places.tenth = slot) / totals.readers)::integer
        order by slot)
      from generate_series(0, 9) as slot) end)
  from totals;
$$;
comment on function public.writer_reader_stops(uuid, uuid) is
  'Internal: where readers stop in a chapter, in tenths, only from five readers (IDEAS-1d).';
revoke execute on function public.writer_reader_stops(uuid, uuid) from public, anon, authenticated;

/**
 * writer_chapter_insights: the writer's "Lines and stops" for one of their own chapters (ideas
 *   IDEA-20261031-1 and -5).
 * Inputs: story_slug, chapter_code.
 * Returns: JSON {loved_lines, stops} (see writer_loved_lines() and writer_reader_stops()), or
 *   null when the chapter isn't the caller's, is deleted or was never published.
 * Errors: insufficient_privilege when signed out.
 * Flow: the dashboard's chapter picker → src/features/writing/api/insights.ts → this.
 */
create or replace function public.writer_chapter_insights(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_chapter_id uuid;
begin
  -- Step 1: a signed-in writer and a published chapter of their own live story.
  if caller_id is null then
    raise exception 'Log in to see your numbers.' using errcode = 'insufficient_privilege';
  end if;
  select chapters.id into target_chapter_id
  from public.chapters
  where chapters.story_id = public.my_live_story_id(story_slug)
    and chapters.code = chapter_code
    and chapters.deleted_at is null
    and chapters.published_body is not null;
  if target_chapter_id is null then
    return null;
  end if;
  -- Step 2: both views, every number already rounded by the "fewer than 5" rule.
  return jsonb_build_object(
    'loved_lines', public.writer_loved_lines(target_chapter_id, caller_id),
    'stops', public.writer_reader_stops(target_chapter_id, caller_id));
end;
$$;
comment on function public.writer_chapter_insights(text, text) is
  'The writer''s most-loved lines and where readers stop for one of their own chapters; totals only (IDEAS-1d).';
revoke execute on function public.writer_chapter_insights(text, text) from public, anon;
grant execute on function public.writer_chapter_insights(text, text) to authenticated;
