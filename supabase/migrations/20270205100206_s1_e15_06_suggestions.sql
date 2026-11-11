-- Migration: suggestions from reading (story S1-E15-06, bundle ANALYTICS-1c; research doc
-- "Research: reading analytics and suggestions").
--
-- What it does:
-- 1. profiles.suggests_from_reading: the member's switch "Suggestions from my reading" in
--    Settings › Privacy. Null means "not chosen": on for adults, off for anyone under 18, who may
--    turn it on themselves (13 to 15 without a parent: it shares nothing about them, it only lets
--    their finished stories count in totals).
-- 2. story_pairs: each night, how many members finished both of two stories, counted only from
--    the Finished shelves of members whose switch is on and kept only when 5 or more did (the
--    small-number rule, metrics_minimum_group). Totals only: never who.
-- 3. Three rows, each read through the same list rules as every shelf (listed_stories(): rating,
--    blocks, moderation, class spaces, unlisted stories):
--    more_by_writer(story_slug), stories_like_this(story_slug) and because_you_read(), worked out
--    when the page asks and never stored.
-- Who calls it: the story page and the end of a story's latest chapter (src/features/suggestions),
--   Discover ("Because you read"), Settings › Privacy (the switch); pg_cron each night.
-- What it calls next: listed_stories(), story_card_json(), age_band_of().

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('suggestions_row_size', '12'::jsonb, false,
   'Suggestions: how many stories each suggestion row shows, at most 20 (S1-E15-06).')
on conflict (key) do nothing;

/* ---------- 1. The switch ---------- */

alter table public.profiles
  add column suggests_from_reading boolean;
comment on column public.profiles.suggests_from_reading is
  'Suggestions from my reading (S1-E15-06): null until chosen (on for adults, off under 18). Private to the member.';

/**
 * suggests_from_reading_of: is this member's switch on?
 * Input: person_id. Returns: their choice, or, until they choose, true for adults and false for
 *   anyone under 18 or of unknown age (S1-E15-06, criterion 5; the under-18 defaults are the most
 *   private choice, decided 16 Oct 2026, Q50).
 * Internal: compute_story_pairs(), because_you_read(), my_privacy_settings().
 */
create function public.suggests_from_reading_of(person_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(profiles.suggests_from_reading, public.age_band_of(profiles.id) = '18_plus')
  from public.profiles where profiles.id = person_id;
$$;
comment on function public.suggests_from_reading_of(uuid) is
  'Internal: the member''s Suggestions from my reading switch, on for adults and off under 18 until chosen (S1-E15-06).';
revoke execute on function public.suggests_from_reading_of(uuid) from public, anon, authenticated;

/**
 * set_suggests_from_reading: the signed-in member turns "Suggestions from my reading" on or off.
 * Input: should_suggest (null counts as off). Returns nothing.
 * Errors: insufficient_privilege when signed out (require_live_profile()).
 * Where it fits: Settings › Privacy → this → profiles.suggests_from_reading. Turning it off takes
 *   the member's finished stories out of the next night's pairs and hides "Because you read".
 */
create function public.set_suggests_from_reading(should_suggest boolean)
returns void
language sql security definer set search_path = ''
as $$
  update public.profiles set suggests_from_reading = coalesce(should_suggest, false), updated_at = now()
  where profiles.id = public.require_live_profile();
$$;
comment on function public.set_suggests_from_reading(boolean) is
  'The signed-in member turns Suggestions from my reading on or off (S1-E15-06).';
revoke execute on function public.set_suggests_from_reading(boolean) from public, anon;
grant execute on function public.set_suggests_from_reading(boolean) to authenticated;

/**
 * my_privacy_settings: as in MUST-1b, plus suggests_from_reading (S1-E15-06).
 */
create or replace function public.my_privacy_settings()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'profile_audience', public.profile_audience_of(profiles),
    'library_audience', profiles.library_visible_to,
    'shows_online_status', profiles.shows_online_status,
    'message_audience', public.message_audience_of(profiles),
    'is_under_18', public.message_age_group(profiles) <> 'adult',
    'suggest_me', coalesce(public.suggests_me(profiles.id), false),
    'parent_spotlight', case
      when public.age_band_of(profiles.id) <> '13_to_15' then 'not_needed'
      when public.has_spotlight_consent(profiles.id) then 'agreed'
      when exists (select 1 from public.parental_consents
                   where parental_consents.user_id = profiles.id and parental_consents.status = 'agreed'
                     and parental_consents.spotlight_requested_at is not null
                     and parental_consents.spotlight_requested_at
                         > coalesce(parental_consents.spotlight_withdrawn_at, '-infinity')) then 'asked'
      else 'none'
    end,
    'can_ask_parent', public.age_band_of(profiles.id) = '13_to_15' and public.has_parental_consent(profiles.id),
    'shows_reader_level', profiles.shows_reader_level,
    -- MUST-1b: whether the browser asks "Post anyway?" before sending what looks like contact details.
    'checks_personal_details', public.checks_personal_details_of(profiles),
    -- S1-E15-06: "Suggestions from my reading".
    'suggests_from_reading', coalesce(public.suggests_from_reading_of(profiles.id), false))
  from public.profiles where profiles.id = public.require_live_profile();
$$;
comment on function public.my_privacy_settings() is
  'The signed-in member''s privacy settings, with Suggest me, the parent''s separate yes, the reading level switch, the personal details heads-up and Suggestions from my reading (S1-E13-01, S1-E5-11, S1-E2-03b, G7a, MUST-1b, S1-E15-06).';

/* ---------- 2. The pairs ---------- */

create table public.story_pairs (
  -- The story a row is shown beside, and a story finished by the same readers.
  story_id uuid not null references public.stories (id) on delete cascade,
  paired_story_id uuid not null references public.stories (id) on delete cascade,
  -- How many members finished both: 5 or more, or the pair isn't kept.
  readers integer not null check (readers > 0),
  counted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_id, paired_story_id),
  constraint story_pairs_two_stories check (story_id <> paired_story_id)
);
comment on table public.story_pairs is
  'kind: platform. Each night: how many members (with Suggestions from my reading on) finished both of two stories, kept only at 5 or more. Totals only, never who (S1-E15-06).';

alter table public.story_pairs enable row level security;

-- Who: staff who may view stories. Why: the pairs are totals, read by readers only through
-- stories_like_this() and because_you_read(), which apply the list rules; staff may look at the
-- table itself to check why a row shows what it shows.
create policy story_pairs_select_staff on public.story_pairs
  for select to authenticated
  using (public.staff_may('stories', 'view'));

grant select on public.story_pairs to authenticated;

/**
 * compute_story_pairs: the nightly count of which stories the same readers finished.
 * Returns how many pairs were kept.
 * Rules: only the Finished shelf of a live member whose switch is on counts (criterion 2); a pair
 *   is kept only when metrics_minimum_group (5) or more members finished both (the small-number
 *   rule, S1-E15-04); the old pairs are replaced in the same transaction, so a member who turned
 *   the switch off leaves the totals the next night.
 * Internal: pg_cron "compute-story-pairs".
 */
create function public.compute_story_pairs()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  smallest_group integer := coalesce((select (settings.value #>> '{}')::integer from public.settings
                                      where settings.key = 'metrics_minimum_group'), 5);
  kept integer;
begin
  -- Step 1: forget last night's pairs.
  delete from public.story_pairs where true;
  -- Step 2: each finished story of a counting member, then every two of them, counted.
  with counting_finishes as (
    select library_entries.user_id, library_entries.story_id
    from public.library_entries
    join public.profiles on profiles.id = library_entries.user_id and profiles.deleted_at is null
    join public.stories on stories.id = library_entries.story_id and stories.deleted_at is null
    where library_entries.shelf = 'finished'
      and coalesce(public.suggests_from_reading_of(library_entries.user_id), false)
  )
  insert into public.story_pairs (story_id, paired_story_id, readers)
  select first_story.story_id, second_story.story_id, count(*)::integer
  from counting_finishes as first_story
  join counting_finishes as second_story
    on second_story.user_id = first_story.user_id and second_story.story_id <> first_story.story_id
  group by first_story.story_id, second_story.story_id
  having count(*) >= smallest_group;
  get diagnostics kept = row_count;
  return kept;
end;
$$;
comment on function public.compute_story_pairs() is
  'Nightly: how many members finished both of two stories, from switch-on members'' Finished shelves, kept at 5 or more (S1-E15-06).';
revoke execute on function public.compute_story_pairs() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('compute-story-pairs', '25 4 * * *', 'select public.compute_story_pairs();');

/* ---------- 3. The rows ---------- */

/**
 * suggestion_row_size: how many stories a suggestion row shows (the setting, held between 1 and 20,
 * CLAUDE.md rule 20).
 * Internal: the three row functions.
 */
create function public.suggestion_row_size()
returns integer
language sql stable security definer set search_path = ''
as $$
  select least(20, greatest(1, coalesce((select (settings.value #>> '{}')::integer from public.settings
                                         where settings.key = 'suggestions_row_size'), 12)));
$$;
comment on function public.suggestion_row_size() is
  'Internal: how many stories a suggestion row shows, 1 to 20 (S1-E15-06).';
revoke execute on function public.suggestion_row_size() from public, anon, authenticated;

/**
 * visible_story_by_slug: the story behind a slug, only when the caller may find it in a list.
 * Input: story_slug. Returns the story's ID and writer, or no row (unknown, deleted, or not one the
 *   caller may see: the same rules as every shelf, through listed_stories()).
 * Internal: more_by_writer(), stories_like_this().
 */
create function public.visible_story_by_slug(story_slug text)
returns table (story_id uuid, writer_id uuid)
language sql stable security definer set search_path = ''
as $$
  select listed.id, listed.user_id
  from public.listed_stories('popular', null, null, null, null) as listed
  where listed.slug = story_slug;
$$;
comment on function public.visible_story_by_slug(text) is
  'Internal: a story the caller may find in a list, by its slug (S1-E15-06).';
revoke execute on function public.visible_story_by_slug(text) from public, anon, authenticated;

/**
 * more_by_writer: "More by <writer>", the writer's other stories the caller may see.
 * Input: story_slug, the story the row is shown beside.
 * Returns: {stories: [story cards]}, most popular first; no stories for a story the caller may not
 *   see, so the row can't reveal one (criterion 1).
 * Errors: none. Where it fits: the story page and the end of the latest chapter
 *   (useStorySuggestions).
 */
create function public.more_by_writer(story_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with shown_beside as (
    select * from public.visible_story_by_slug(story_slug)
  ),
  others as (
    select listed.id, coalesce(scores.score, 0) as score, listed.first_published_at
    from public.listed_stories('popular', null, null, null, null) as listed
    join shown_beside on shown_beside.writer_id = listed.user_id and listed.id <> shown_beside.story_id
    left join public.story_scores as scores on scores.story_id = listed.id
    order by score desc, listed.first_published_at desc nulls last
    limit public.suggestion_row_size()
  )
  select jsonb_build_object('stories', coalesce(
    (select jsonb_agg(public.story_card_json(others.id) order by others.score desc,
                      others.first_published_at desc nulls last) from others), '[]'::jsonb));
$$;
comment on function public.more_by_writer(text) is
  'More by this writer: the writer''s other stories the caller may see, most popular first (S1-E15-06).';
revoke execute on function public.more_by_writer(text) from public;
grant execute on function public.more_by_writer(text) to anon, authenticated;

/**
 * paired_cards: story cards for the stories paired with one story, as the caller may see them.
 * Inputs: source_story_id; left_out, stories not to suggest (the caller's library).
 * Returns: a JSON array of cards, the most shared readers first, then the most popular.
 * Internal: stories_like_this(), because_you_read().
 */
create function public.paired_cards(source_story_id uuid, left_out uuid[])
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with paired as (
    select listed.id, pairs.readers, coalesce(scores.score, 0) as score
    from public.story_pairs as pairs
    join public.listed_stories('popular', null, null, null, null) as listed on listed.id = pairs.paired_story_id
    left join public.story_scores as scores on scores.story_id = listed.id
    where pairs.story_id = source_story_id
      and not (listed.id = any (coalesce(left_out, '{}'::uuid[])))
    order by pairs.readers desc, score desc
    limit public.suggestion_row_size()
  )
  select coalesce(jsonb_agg(public.story_card_json(paired.id) order by paired.readers desc, paired.score desc),
                  '[]'::jsonb)
  from paired;
$$;
comment on function public.paired_cards(uuid, uuid[]) is
  'Internal: cards for the stories paired with one story, as the caller may see them (S1-E15-06).';
revoke execute on function public.paired_cards(uuid, uuid[]) from public, anon, authenticated;

/**
 * stories_like_this: "Stories like this", stories finished by at least 5 of the same readers.
 * Input: story_slug. Returns: {stories: [story cards]}; none for a story the caller may not see.
 * Errors: none. Where it fits: the story page and the end of the latest chapter.
 */
create function public.stories_like_this(story_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('stories', coalesce(
    (select public.paired_cards(shown_beside.story_id, null)
     from public.visible_story_by_slug(story_slug) as shown_beside), '[]'::jsonb));
$$;
comment on function public.stories_like_this(text) is
  'Stories like this: stories finished by at least 5 of the same readers, as the caller may see them (S1-E15-06).';
revoke execute on function public.stories_like_this(text) from public;
grant execute on function public.stories_like_this(text) to anon, authenticated;

/**
 * because_you_read: "Because you read <title>" on Discover, worked out when the page opens and
 * never stored (criterion 3).
 * Returns: {source: the finished story's card, stories: [cards]}, or {source: null, stories: []}
 *   when the caller is signed out, their switch is off, or none of their last 10 finished stories
 *   has a pair they may see. Stories already in the caller's library aren't suggested.
 * Rules: the caller's most recently finished story that has something to suggest; every story
 *   passes the same list rules as any shelf.
 * Errors: none. Where it fits: DiscoverPage → BecauseYouReadShelf.
 */
create function public.because_you_read()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  in_library uuid[];
  finished record;
  cards jsonb;
begin
  -- Step 1: signed in, with the switch on.
  if caller_id is null or not coalesce(public.suggests_from_reading_of(caller_id), false) then
    return jsonb_build_object('source', null, 'stories', '[]'::jsonb);
  end if;
  in_library := array(select library_entries.story_id from public.library_entries
                      where library_entries.user_id = caller_id);
  -- Step 2: the latest finished stories the caller may still see, newest first.
  for finished in
    select listed.id
    from public.library_entries
    join public.listed_stories('popular', null, null, null, null) as listed on listed.id = library_entries.story_id
    where library_entries.user_id = caller_id and library_entries.shelf = 'finished'
    order by library_entries.updated_at desc
    limit 10
  loop
    -- Step 3: the first one with something to suggest gives the row.
    cards := public.paired_cards(finished.id, in_library);
    if jsonb_array_length(cards) > 0 then
      return jsonb_build_object('source', public.story_card_json(finished.id), 'stories', cards);
    end if;
  end loop;
  return jsonb_build_object('source', null, 'stories', '[]'::jsonb);
end;
$$;
comment on function public.because_you_read() is
  'Because you read: stories paired with the caller''s latest finished story, worked out when asked, never stored (S1-E15-06).';
revoke execute on function public.because_you_read() from public, anon;
grant execute on function public.because_you_read() to authenticated;
