/*
 * Migration: share a chapter and the quote-share card (stories S1-E4-05 and S1-E4-07; board 3.6
 * Share).
 *
 * What it adds:
 * - chapter_shares: how many times each chapter was shared each day, totals only, never who
 *   shared (S1-E4-05, third criterion). record_chapter_share() adds one; the hourly ranking now
 *   counts shares with the ranking_weight_shares setting that waited for them (S1-E5-03).
 * - stories.quote_cards_enabled: the writer's switch for quote cards (S1-E4-07, third criterion),
 *   saved through update_my_story() like the comments switch.
 * - quote_cards: which chapters a reader has made a quote card from, for the limit of one per
 *   chapter (Q17; S1-E4-07, second criterion). The passage itself is never stored: the card is
 *   drawn on the reader's device.
 * - quote_card_state() and make_quote_card(): what the reader screen asks before and when it
 *   makes a card.
 * - Rate limits: chapter_share and quote_card join the rate_limits setting (S1-E10-12), so one
 *   account can't push a story up the ranking by sharing it over and over.
 * Privacy: the shared link carries no identifier of the sharer and no tracking parameter
 *   (S1-E4-05, second criterion); shares are counted per chapter per day only. quote_cards
 *   records who made a card from which chapter, readable by that reader only, so the limit
 *   holds on every device.
 * Who calls it: src/features/sharing/ (the Share button, the share dialog and the quote card) and
 *   the story settings form (src/features/writing/).
 * Tests: supabase/tests/database/181-share-and-quote-cards.test.sql.
 */

/* ---------- Settings ---------- */

-- Hourly limits (S1-E10-12): a share past the limit is still shared, only not counted.
update public.settings
set value = value
  || '{"chapter_share": {"new_account": 10, "older_account": 30}}'::jsonb
  || '{"quote_card": {"new_account": 10, "older_account": 30}}'::jsonb
where key = 'rate_limits';

/* ---------- Daily share totals ---------- */

create table public.chapter_shares (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The day in Romania (Q7), as chapter_reads.
  shared_on date not null,
  total integer not null default 0,
  primary key (chapter_id, shared_on),
  constraint chapter_shares_total_not_negative check (total >= 0)
);
comment on table public.chapter_shares is
  'kind: platform. How many times each chapter was shared each day: totals only, never who shared (S1-E4-05).';
alter table public.chapter_shares enable row level security;

-- Who: the writer of the chapter. Why: their own share numbers (the writer dashboard, S1-E3-07);
-- nobody else sees another writer's totals. Writes go only through record_chapter_share() and
-- make_quote_card().
create policy chapter_shares_select_owner on public.chapter_shares
  for select to authenticated
  using (exists (
    select 1 from public.chapters
    where chapters.id = chapter_shares.chapter_id and chapters.user_id = (select auth.uid())
  ));

grant select on public.chapter_shares to authenticated;

/* ---------- The writer's switch ---------- */

alter table public.stories
  add column quote_cards_enabled boolean not null default true;
comment on column public.stories.quote_cards_enabled is
  'The writer''s switch: false hides "Share quote" on every chapter of the story (S1-E4-07).';

/* ---------- Quote cards made ---------- */

create table public.quote_cards (
  id uuid primary key default gen_random_uuid(),
  -- The reader who made the card (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Never changed; here because every table has one (CLAUDE.md conventions).
  updated_at timestamptz not null default now(),
  constraint quote_cards_one_per_chapter unique (user_id, chapter_id)
);
comment on table public.quote_cards is
  'kind: user_action
Which chapters a reader made a quote card from, for the limit of one per chapter (S1-E4-07, Q17). Never the passage.';
create index quote_cards_chapter_id on public.quote_cards (chapter_id);
alter table public.quote_cards enable row level security;

-- Who: the reader. Why: their own cards, so the limit shows on every device; nobody else needs
-- to know what someone quoted. Writes go only through make_quote_card().
create policy quote_cards_select_own on public.quote_cards
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.quote_cards to authenticated;

/* ---------- Helpers ---------- */

/*
 * shareable_chapter: the chapter behind an address when the caller may read it, with its
 *   story's writer and switch (S1-E4-05, S1-E4-07).
 * Inputs: story_slug, chapter_code. Returns: one row, or none when the caller may not read it
 *   (the same rules as get_chapter(): status, rating, moderation and blocks).
 * Internal: shared by record_chapter_share(), quote_card_state() and make_quote_card().
 */
create function public.shareable_chapter(story_slug text, chapter_code text)
returns table (chapter_id uuid, writer_id uuid, quote_cards_enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select chapters.id, story.user_id, story.quote_cards_enabled
  from public.reader_visible_story(story_slug) as story
  join public.chapters on chapters.story_id = story.id and chapters.code = chapter_code
  where public.chapter_is_readable(chapters.id);
$$;
comment on function public.shareable_chapter(text, text) is
  'Internal: a chapter the caller may read, with its writer and the quote card switch (S1-E4-05, S1-E4-07).';
revoke execute on function public.shareable_chapter(text, text) from public, anon, authenticated;

/*
 * add_chapter_share: one more on today's share total for a chapter. Internal.
 */
create function public.add_chapter_share(target_chapter_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.chapter_shares (chapter_id, shared_on, total)
  values (target_chapter_id, (now() at time zone 'Europe/Bucharest')::date, 1)
  on conflict (chapter_id, shared_on) do update set total = public.chapter_shares.total + 1;
$$;
comment on function public.add_chapter_share(uuid) is
  'Internal: adds one to today''s share total for a chapter; never records who (S1-E4-05).';
revoke execute on function public.add_chapter_share(uuid) from public, anon, authenticated;

/* ---------- Sharing ---------- */

/*
 * record_chapter_share: counts one share of a chapter the caller may read (S1-E4-05, third
 *   criterion).
 * Inputs: story_slug, chapter_code. Returns: true when counted; false when the caller may not
 *   read it, is its writer, or has shared a lot in the last hour (the share still happens on the
 *   device; it only isn't counted, S1-E10-12).
 * Errors: refuses a signed-out caller.
 * Flow: the Share button, after the system share sheet or the copy → this → chapter_shares →
 *   the hourly ranking (compute_story_scores()).
 */
create function public.record_chapter_share(story_slug text, chapter_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  shared record;
begin
  -- Step 1: only a signed-in reader's share counts.
  if caller_id is null then
    raise exception 'Log in to share chapters.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a chapter they may read; a writer sharing their own story isn't counted.
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if not found or shared.writer_id = caller_id then
    return false;
  end if;
  -- Step 3: the hourly limit; past it the share isn't counted, and nothing is refused.
  begin
    perform public.take_rate_limit('chapter_share');
  exception when program_limit_exceeded then
    return false;
  end;
  -- Step 4: one more on today's total.
  perform public.add_chapter_share(shared.chapter_id);
  return true;
end;
$$;
comment on function public.record_chapter_share(text, text) is
  'Counts one share of a chapter the caller may read; never records who (S1-E4-05).';
revoke execute on function public.record_chapter_share(text, text) from public, anon;
grant execute on function public.record_chapter_share(text, text) to authenticated;

/* ---------- Quote cards ---------- */

/*
 * quote_card_state: whether the caller may make a quote card from a chapter (S1-E4-07).
 * Inputs: story_slug, chapter_code.
 * Returns: {allowed, already_made}. allowed is false for a visitor, the chapter's own writer, a
 *   chapter the caller may not read or a story whose writer switched quote cards off;
 *   already_made is true once the caller made a card from this chapter.
 * Flow: the reader screen asks once per chapter, to show or hide "Share quote".
 */
create function public.quote_card_state(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  shared record;
begin
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if caller_id is null or not found or not shared.quote_cards_enabled then
    return jsonb_build_object('allowed', false, 'already_made', false);
  end if;
  return jsonb_build_object(
    'allowed', true,
    'already_made', exists (
      select 1 from public.quote_cards
      where quote_cards.user_id = caller_id and quote_cards.chapter_id = shared.chapter_id
    )
  );
end;
$$;
comment on function public.quote_card_state(text, text) is
  'Whether the caller may make a quote card from a chapter, and whether they already did (S1-E4-07).';
revoke execute on function public.quote_card_state(text, text) from public;
grant execute on function public.quote_card_state(text, text) to anon, authenticated;

/*
 * make_quote_card: records that the caller makes a quote card from a chapter, before the device
 *   draws it (S1-E4-07, Q17).
 * Inputs: story_slug, chapter_code.
 * Returns: {outcome}: 'ok' (recorded, and counted as a share), 'already_made' (the limit of one
 *   per chapter), 'switched_off' (the writer turned quote cards off) or 'not_found' (a chapter
 *   the caller may not read).
 * Errors: refuses a signed-out caller; program_limit_exceeded with "wait_minutes:<n>" past the
 *   hourly limit (S1-E10-12).
 * Flow: the quote card dialog's "Make the card" → this → quote_cards and chapter_shares.
 */
create function public.make_quote_card(story_slug text, chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  shared record;
begin
  -- Step 1: a signed-in reader and a chapter they may read.
  if caller_id is null then
    raise exception 'Log in to share a quote.' using errcode = 'insufficient_privilege';
  end if;
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the writer's switch, then the limit of one per chapter (Q17).
  if not shared.quote_cards_enabled then
    return jsonb_build_object('outcome', 'switched_off');
  end if;
  if exists (select 1 from public.quote_cards
             where quote_cards.user_id = caller_id and quote_cards.chapter_id = shared.chapter_id) then
    return jsonb_build_object('outcome', 'already_made');
  end if;
  -- Step 3: the hourly limit, then the record and one more share (not the writer's own).
  perform public.take_rate_limit('quote_card');
  insert into public.quote_cards (user_id, chapter_id) values (caller_id, shared.chapter_id);
  if shared.writer_id <> caller_id then
    perform public.add_chapter_share(shared.chapter_id);
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.make_quote_card(text, text) is
  'Records a quote card from a chapter, one per chapter per reader, and counts it as a share (S1-E4-07).';
revoke execute on function public.make_quote_card(text, text) from public, anon;
grant execute on function public.make_quote_card(text, text) to authenticated;

/* ---------- Shares in the ranking ---------- */

/*
 * story_share_points: each readable story's shares over the ranking window, each day's total
 *   counted less the older it is (it halves every half-life), as reads are (S1-E5-03).
 * Returns: story_id and points. Internal: read by compute_story_scores().
 */
create function public.story_share_points()
returns table (story_id uuid, points double precision)
language sql
stable
security definer
set search_path = ''
as $$
  with window_start as (
    select now() - make_interval(days => public.ranking_setting('ranking_window_days', 60)::integer) as since,
      public.ranking_setting('ranking_half_life_days', 7) as half_life
  )
  select chapters.story_id, sum(shares.total * power(0.5,
    ((now() at time zone 'Europe/Bucharest')::date - shares.shared_on) / window_start.half_life))
  from public.chapter_shares as shares
  join public.chapters on chapters.id = shares.chapter_id and public.chapter_is_readable(chapters.id)
  cross join window_start
  where shares.shared_on >= (window_start.since at time zone 'Europe/Bucharest')::date
  group by chapters.story_id;
$$;
comment on function public.story_share_points() is
  'Internal: each readable story''s decayed shares for the ranking (S1-E4-05, S1-E5-03).';
revoke execute on function public.story_share_points() from public, anon, authenticated;

/**
 * compute_story_scores: the hourly ranking job, as in S1-E5-03, now with shares (S1-E4-05).
 * Returns: how many stories got a score.
 * What it does: score = (reads × reads weight + likes × likes weight + comments × comments weight
 *   + shares × shares weight) × (1 + read-through × read-through weight). Stories that are no
 *   longer readable lose their score.
 * Where it fits: pg_cron every hour at :13; tests call it directly.
 */
create or replace function public.compute_story_scores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reads_weight double precision := public.ranking_setting('ranking_weight_reads', 1);
  likes_weight double precision := public.ranking_setting('ranking_weight_likes', 5);
  comments_weight double precision := public.ranking_setting('ranking_weight_comments', 8);
  shares_weight double precision := public.ranking_setting('ranking_weight_shares', 10);
  through_weight double precision := public.ranking_setting('ranking_weight_read_through', 0.5);
  scored integer;
begin
  -- Step 1: a score for every readable story, shares included.
  insert into public.story_scores (story_id, score, computed_at)
  select signals.story_id,
    greatest(0, (signals.reads * reads_weight + signals.likes * likes_weight
      + signals.comments * comments_weight + coalesce(shares.points, 0) * shares_weight)
      * (1 + signals.read_through * through_weight)),
    now()
  from public.story_signals() as signals
  left join public.story_share_points() as shares on shares.story_id = signals.story_id
  on conflict (story_id) do update set score = excluded.score, computed_at = excluded.computed_at;
  get diagnostics scored = row_count;

  -- Step 2: a story with no readable chapter left drops out of the scores.
  delete from public.story_scores
  where not public.story_has_readable_chapter(story_scores.story_id);
  return scored;
end;
$$;
comment on function public.compute_story_scores() is
  'Hourly: each story''s popularity score from reads, likes, comments, shares and read-through, never downvotes (S1-E5-03, S1-E4-05).';
revoke execute on function public.compute_story_scores() from public, anon, authenticated;

update public.settings
set description = 'Popularity: points for each share, counted per chapter per day (S1-E5-03, S1-E4-05).'
where key = 'ranking_weight_shares';

/* ---------- update_my_story() with the quote card switch ---------- */

/**
 * update_my_story: as in S1-E3-06, now also taking `quote_cards_enabled` in `changes` (S1-E4-07);
 * left out, it keeps its current value.
 */
create or replace function public.update_my_story(story_slug text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  current_row public.stories;
  new_title text;
  new_blurb text;
  new_language text;
  new_category_slug text;
  new_category_id uuid;
  new_cover jsonb;
  new_labels jsonb;
begin
  -- Step 1: a signed-in writer who may write, and their own live story.
  if caller_id is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into current_row from public.stories where stories.id = target_story_id;

  -- Step 2: the basics: anything not in `changes` keeps its current value, then all are checked.
  new_title := regexp_replace(btrim(coalesce(changes ->> 'title', current_row.title)), '\s+', ' ', 'g');
  new_blurb := btrim(coalesce(changes ->> 'blurb', current_row.blurb));
  new_language := coalesce(changes ->> 'language_code', current_row.language_code);
  new_category_slug := coalesce(changes ->> 'category_slug',
    (select categories.slug from public.categories where categories.id = current_row.category_id));
  new_category_id := public.check_story_basics(new_title, new_blurb, new_language, new_category_slug);

  -- Step 3: the cover, when given; the labels, filled from the current row and checked together.
  new_cover := changes -> 'cover';
  if new_cover is not null then
    perform public.check_story_cover(new_cover);
  end if;
  new_labels := jsonb_build_object(
    'rating', current_row.rating, 'is_fan_fiction', current_row.is_fan_fiction, 'is_parody', current_row.is_parody,
    'deals_with_abuse_or_coercion', current_row.deals_with_abuse_or_coercion,
    'content_note', current_row.content_note, 'ai_disclosure', current_row.ai_disclosure
  ) || coalesce(changes -> 'labels', '{}'::jsonb);
  perform public.check_story_labels(new_labels);

  -- Step 4: save. The slug never changes (shared links survive a rename, S1-E3-01).
  update public.stories set
    title = new_title,
    blurb = new_blurb,
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    -- S1-E4-07: the writer's switch for quote cards.
    quote_cards_enabled = coalesce((changes ->> 'quote_cards_enabled')::boolean, quote_cards_enabled),
    cover_kind = coalesce((new_cover ->> 'kind')::public.cover_kind, cover_kind),
    cover_design = case when new_cover is null then cover_design else new_cover ->> 'design' end,
    cover_background = case when new_cover is null then cover_background else new_cover ->> 'background' end,
    cover_accent = case when new_cover is null then cover_accent else new_cover ->> 'accent' end,
    cover_tall_path = case when new_cover is null then cover_tall_path else new_cover ->> 'tall_path' end,
    cover_square_path = case when new_cover is null then cover_square_path else new_cover ->> 'square_path' end,
    rating = (new_labels ->> 'rating')::public.story_rating,
    is_fan_fiction = (new_labels ->> 'is_fan_fiction')::boolean,
    is_parody = (new_labels ->> 'is_parody')::boolean,
    deals_with_abuse_or_coercion = (new_labels ->> 'deals_with_abuse_or_coercion')::boolean,
    content_note = btrim(coalesce(new_labels ->> 'content_note', '')),
    ai_disclosure = (new_labels ->> 'ai_disclosure')::public.ai_disclosure
  where stories.id = target_story_id;

  -- Step 5: the tags, when given.
  if changes ? 'tag_names' then
    if jsonb_array_length(changes -> 'tag_names') > 10 then
      raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
    end if;
    perform public.set_story_tags(target_story_id, caller_id,
      array(select jsonb_array_elements_text(changes -> 'tag_names')));
  end if;

  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.update_my_story(text, jsonb) is
  'Changes the writer''s own story: basics, cover, status, comments, quote cards, labels and tags (S1-E3-05, S1-E3-06, S1-E4-07).';
revoke execute on function public.update_my_story(text, jsonb) from public, anon;
grant execute on function public.update_my_story(text, jsonb) to authenticated;
