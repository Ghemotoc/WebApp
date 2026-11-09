-- Migration: reader levels, the reading counterpart of writer ranks (bundle G7a; Robert approved
-- reader levels on 7 Nov 2026, 19:53 UTC; the DESIGN thread set the tests and the switch on
-- 7 Nov 2026, 19:56 UTC).
--
-- The four levels, one test each, and time never counts:
--   New reader      the first chapter read
--   Reader          50 chapters read
--   Bookworm        10 stories finished
--   Story devourer  40 stories finished
-- A chapter counts as read when the reader reached 95 per cent of it (the same mark that moves a
-- completed story to the Finished shelf, finishes_story()); a story counts as finished when the
-- reader reached that mark in the last chapter of a story its writer marked completed. A writer's
-- own chapters and stories never count.
--
-- What it adds:
--   reader_level (enum)              the four levels, lowest first
--   profiles.shows_reader_level      Settings › Privacy › "Your reading level": Hidden (false, the
--                                    default for everyone) or "Show it on my profile" (true)
--   reader_level_from()              the one rule from the two counts to a level
--   reader_level_counts()            internal: one person's chapters read and stories finished
--   profile_reader_level()           a profile's level for the profile page: always for its owner,
--                                    for anyone else only when the owner chose to show it
--   set_shows_reader_level()         the switch in Settings › Privacy
--   my_privacy_settings()            also says where that switch stands
--
-- Who calls it: the profile page (src/features/people) and Settings › Privacy
-- (src/features/privacy).
--
-- Rules it follows:
--   - Privacy by default (GDPR art. 25(2); DoD privacy): hidden unless the reader turns it on.
--   - Architecture 1.6 and CLAUDE.md rule 15: nothing here returns a user ID, and only counts leave
--     the database, never which chapters or stories someone read (reading_positions stays private).
--   - Rule 6: a person who blocked the viewer shows them nothing.

/* ---------- 1. The levels and the switch ---------- */

create type public.reader_level as enum ('new_reader', 'reader', 'bookworm', 'story_devourer');

comment on type public.reader_level is
  'New reader (first chapter read), Reader (50 chapters read), Bookworm (10 stories finished), Story devourer (40 stories finished) (G7a).';

alter table public.profiles
  add column shows_reader_level boolean not null default false;

comment on column public.profiles.shows_reader_level is
  'Settings › Privacy › Your reading level: false keeps it hidden (the default for everyone), true shows it on the profile (G7a).';

/* ---------- 2. From counts to a level ---------- */

/**
 * reader_level_from: the one rule from the two counts to a level.
 * Inputs: chapters_read and stories_finished (null counts as 0).
 * Returns: the highest level reached, or null before the first chapter read.
 * Where it fits: profile_reader_level() and the database tests; the screens never repeat the rule.
 */
create or replace function public.reader_level_from(chapters_read integer, stories_finished integer)
returns public.reader_level
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(stories_finished, 0) >= 40 then 'story_devourer'
    when coalesce(stories_finished, 0) >= 10 then 'bookworm'
    when coalesce(chapters_read, 0) >= 50 then 'reader'
    when coalesce(chapters_read, 0) >= 1 then 'new_reader'
  end::public.reader_level;
$$;

comment on function public.reader_level_from(integer, integer) is
  'The reader level for a number of chapters read and stories finished (G7a).';

/**
 * reader_level_counts: how many chapters one person read and how many stories they finished.
 * Input: person_id. Returns: one row (chapters_read, stories_finished), zeros for a new reader.
 * Internal only: it reads the private reading_positions table, so nobody may call it directly.
 */
create or replace function public.reader_level_counts(person_id uuid)
returns table (chapters_read integer, stories_finished integer)
language sql
stable
security definer
set search_path = ''
as $$
  -- Step 1: the person's places in other people's chapters, read to 95 per cent or more.
  with read_places as (
    select chapters as chapter, reading_positions.furthest_percent
    from public.reading_positions
    join public.chapters on chapters.id = reading_positions.chapter_id
    join public.stories on stories.id = reading_positions.story_id
    where reading_positions.user_id = person_id
      and stories.user_id <> person_id
      and reading_positions.furthest_percent >= 95
  )
  -- Step 2: every such chapter counts once; a story counts when its last chapter was finished.
  select count(*)::integer,
         (count(distinct (read_places.chapter).story_id)
           filter (where public.finishes_story(read_places.chapter, read_places.furthest_percent)))::integer
  from read_places;
$$;

comment on function public.reader_level_counts(uuid) is
  'Internal: one person''s chapters read (95 per cent or more) and stories finished, never their own (G7a).';
revoke execute on function public.reader_level_counts(uuid) from public, anon, authenticated;

/* ---------- 3. The profile page ---------- */

/**
 * profile_reader_level: a profile's reading level for its profile page.
 * Input: wanted_handle, the profile's username.
 * Returns: {level, chapters_read, stories_finished, is_shown, is_own}. The owner always gets it,
 *   level null before their first chapter read, so the card can say how to reach New reader.
 *   Anyone else gets it only when the owner shows it, the profile is open to them and the owner
 *   hasn't blocked them; otherwise null.
 * Errors: none; an unknown handle answers null.
 * Where it fits: the reading level pill beside the writing rank and the Reading level card (G7a).
 */
create or replace function public.profile_reader_level(wanted_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'level', public.reader_level_from(counts.chapters_read, counts.stories_finished),
    'chapters_read', counts.chapters_read,
    'stories_finished', counts.stories_finished,
    'is_shown', reader.shows_reader_level,
    'is_own', reader.id = (select auth.uid()))
  from public.profile_for_handle(wanted_handle) as reader
  cross join lateral public.reader_level_counts(reader.id) as counts
  -- The owner always sees their own; anyone else only what the owner chose to show.
  where reader.id = (select auth.uid())
     or (reader.shows_reader_level
         and public.profile_is_open_to(reader, (select auth.uid()))
         and not exists (select 1 from public.blocks
                         where blocks.user_id = reader.id
                           and blocks.blocked_user_id = (select auth.uid())));
$$;

comment on function public.profile_reader_level(text) is
  'A profile''s reading level: always for its owner, for others only when shown, by the profile''s own visibility rules (G7a).';
revoke execute on function public.profile_reader_level(text) from public;
grant execute on function public.profile_reader_level(text) to anon, authenticated;

/* ---------- 4. Settings › Privacy ---------- */

/**
 * set_shows_reader_level: the signed-in member shows or hides their reading level.
 * Input: should_show (null counts as hidden). Returns: nothing.
 * Errors: as require_live_profile() (signed out or a closed account).
 */
create or replace function public.set_shows_reader_level(should_show boolean)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles set shows_reader_level = coalesce(should_show, false), updated_at = now()
  where profiles.id = public.require_live_profile();
$$;

comment on function public.set_shows_reader_level(boolean) is
  'The signed-in member shows or hides their reading level on their profile (G7a).';
revoke execute on function public.set_shows_reader_level(boolean) from public, anon;
grant execute on function public.set_shows_reader_level(boolean) to authenticated;

/**
 * my_privacy_settings: as in LOOK-4c, plus shows_reader_level (Settings › Privacy › Your reading
 * level).
 */
create or replace function public.my_privacy_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
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
    'shows_reader_level', profiles.shows_reader_level)
  from public.profiles where profiles.id = public.require_live_profile();
$$;

comment on function public.my_privacy_settings() is
  'The signed-in member''s privacy settings, with Suggest me, the parent''s separate yes and the reading level switch (S1-E13-01, S1-E5-11, S1-E2-03b, G7a).';
