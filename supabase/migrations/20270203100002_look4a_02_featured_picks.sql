-- Migration: Featured this week, picked by staff with help from the ranking (story S1-E5-10,
-- bundle LOOK-4a; Robert, 6 Nov 2026, answer D2: "Staff pick it. They see the ranks of all current
-- active stories and choose from them … The writer must be 16 or over").
--
-- What it adds:
--   settings featured_max, featured_active_days, featured_promising_read_through
--   staff area 'featured'          owner and admin act; nobody else sees the screen
--   story_rank_snapshots           each story's rank once a day, kept 35 days, so the screen can
--                                  show how far a story moved in 7 days
--   snapshot_story_ranks()         writes today's ranks and drops rows older than 35 days; daily job
--   featured_picks                 the stories staff put in the band, in order (1 to featured_max)
--   is_classics_account()          the classics account, without an error when it is missing
--   may_feature_writer()           may this writer's work be put on show in Featured? (16 or over,
--                                  active account; the classics account always may)
--   featured_ineligible_reason()   why a story can't be featured, or null when it can
--   admin_featured_candidates()    the ranking screen: every current active story with its signals
--   admin_set_featured_picks()     replaces the picks, logs before and after, tells new writers
--   featured_stories_now()         the band's cards for this reader (visitors and members)
--   notification_category()        story_featured joins the stories group
--   data_export_held_tables()      gains featured_picks (its user_id is the staff member)
--
-- Who calls it: Stories › Featured (src/features/staff/components/featured/) and the Discover
-- band (src/features/discovery/components/FeaturedBand.tsx), through their api files.
--
-- Rules it follows:
--   - CLAUDE.md rule 1: RLS on both tables, select policies for staff with the Featured area;
--     writes only through the functions, so no write privilege is granted.
--   - Rule 15: featured_picks.user_id is the staff member who picked (not null, references
--     profiles); the writer is reached through the story.
--   - Rule 18 and rule 6: the band never shows a story above the reader's rating or across a
--     block, the same tests listed_stories() uses.
--   - Architecture 1.8.1: staff writes check the role and the staff session and log in the same
--     transaction.
--   - Robert, 6 Nov 2026 (D2): writers under 16 are never featured; there is no consent route in.
--     The rule is checked when staff pick and again every time the band is read, so a later
--     suspension takes a story out at once.

/* ---------- 1. Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('featured_max', '5'::jsonb, false,
   'The most stories staff may put in Featured this week (S1-E5-10).'),
  ('featured_active_days', '60'::jsonb, false,
   'A story is "current" for the Featured screen when a chapter came out within this many days (S1-E5-10; Robert, 6 Nov 2026).'),
  ('featured_promising_read_through', '0.6'::jsonb, false,
   'The read-through (0 to 1) a story needs for the Promising view, with fewer reads than the median (S1-E5-10; Robert, 6 Nov 2026).')
on conflict (key) do nothing;

/* ---------- 2. Who may use the screen ---------- */

-- Admins and the owner pick Featured (Robert, 6 Nov 2026); moderators, support and content
-- editors get no access, so staff_may('featured', …) is false for them.
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('featured', 'owner', 'act', null), ('featured', 'admin', 'act', null)
on conflict (role, area) do nothing;

/* ---------- 3. Daily rank snapshots ---------- */

create table public.story_rank_snapshots (
  story_id uuid not null references public.stories (id) on delete cascade,
  -- The day in Romanian time the snapshot was taken.
  snapshot_on date not null,
  -- The story's place in the ranking that day, 1 the highest; ties share a place.
  rank integer not null,
  score double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_id, snapshot_on),
  constraint story_rank_snapshots_rank_positive check (rank >= 1)
);

comment on table public.story_rank_snapshots is
  'kind: platform
Each story''s rank and score once a day, kept 35 days, so Stories › Featured can show how far a story moved in 7 days (S1-E5-10). No personal data beyond story_scores.';

create index story_rank_snapshots_day_idx on public.story_rank_snapshots (snapshot_on);

alter table public.story_rank_snapshots enable row level security;

/**
 * Policy story_rank_snapshots_select_featured_staff: admins and the owner, in a staff session,
 * read the snapshots for the Featured screen. Nobody else reads them.
 */
create policy story_rank_snapshots_select_featured_staff
  on public.story_rank_snapshots
  for select
  to authenticated
  using ((select public.staff_may('featured', 'view')));
comment on policy story_rank_snapshots_select_featured_staff on public.story_rank_snapshots is
  'Allows staff with the Featured area (owner, admin) to read the daily ranks (S1-E5-10).';

-- Only the select the policy needs; rows arrive only through snapshot_story_ranks().
revoke all on public.story_rank_snapshots from anon, authenticated;
grant select on public.story_rank_snapshots to authenticated;  -- story_rank_snapshots_select_featured_staff

/**
 * snapshot_story_ranks: stores today's rank of every scored story and drops snapshots older than
 * 35 days.
 * Inputs: none. Returns: how many stories were stored.
 * Errors: none expected.
 * Where it fits: the daily job below, after compute_story_scores() has run in the night; the
 *   Featured screen compares today's rank with the one from 7 days ago.
 */
create or replace function public.snapshot_story_ranks()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Bucharest')::date;
  stored integer;
begin
  -- Step 1: today's ranks; running twice in a day replaces the morning's values.
  insert into public.story_rank_snapshots (story_id, snapshot_on, rank, score)
  select story_scores.story_id, today,
    rank() over (order by story_scores.score desc), story_scores.score
  from public.story_scores
  on conflict (story_id, snapshot_on) do update
    set rank = excluded.rank, score = excluded.score, updated_at = now();
  get diagnostics stored = row_count;
  -- Step 2: keep 35 days, enough for the 7-day change with room to spare.
  delete from public.story_rank_snapshots where snapshot_on < today - 35;
  return stored;
end;
$$;

comment on function public.snapshot_story_ranks() is
  'Internal: stores today''s story ranks and keeps 35 days of them, for the Featured screen (S1-E5-10).';
revoke execute on function public.snapshot_story_ranks() from public, anon, authenticated;

-- Every night at 00:27 UTC (after the 00:13 score run), a minute no other job uses.
-- cron.schedule replaces a job of the same name, so running the migration twice is safe.
select cron.schedule('snapshot-story-ranks', '27 0 * * *', 'select public.snapshot_story_ranks();');

-- A first snapshot now, so the screen has today's ranks straight away.
select public.snapshot_story_ranks();

/* ---------- 4. The picks ---------- */

create table public.featured_picks (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  -- The place in the band, 1 first.
  position integer not null,
  -- The staff member who picked it.
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set when a later save took the story out; the row stays as a record.
  removed_at timestamptz,
  constraint featured_picks_position_range check (position between 1 and 20)
);

comment on table public.featured_picks is
  'kind: staff
The stories staff put in Featured this week, in order. A save replaces the list: old rows get removed_at, new rows are added (S1-E5-10; Robert, 6 Nov 2026).';
comment on column public.featured_picks.user_id is 'The staff member who picked the story.';

-- One story per place and each story once, among the current picks.
create unique index featured_picks_current_position_idx on public.featured_picks (position)
  where removed_at is null;
create unique index featured_picks_current_story_idx on public.featured_picks (story_id)
  where removed_at is null;
create index featured_picks_user_idx on public.featured_picks (user_id);

alter table public.featured_picks enable row level security;

/**
 * Policy featured_picks_select_featured_staff: admins and the owner, in a staff session, read the
 * picks and their history. Readers get the band only through featured_stories_now(), which
 * never returns who picked.
 */
create policy featured_picks_select_featured_staff
  on public.featured_picks
  for select
  to authenticated
  using ((select public.staff_may('featured', 'view')));
comment on policy featured_picks_select_featured_staff on public.featured_picks is
  'Allows staff with the Featured area (owner, admin) to read the picks (S1-E5-10).';

revoke all on public.featured_picks from anon, authenticated;
grant select on public.featured_picks to authenticated;  -- featured_picks_select_featured_staff

/* ---------- 5. Who may be featured ---------- */

/**
 * is_classics_account: is this person the official classics account?
 * Input: person_id. Returns: true only for the account named by the classics_account_handle
 *   setting; false (never an error) when that account doesn't exist yet, as on a fresh local
 *   database, so lists that ask it keep working (classics_account_id() raises instead).
 * Where it fits: may_feature_writer(), may_spotlight_writer() and admin_set_featured_picks().
 */
create or replace function public.is_classics_account(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = person_id
      and profiles.handle = (public.setting_value('classics_account_handle') #>> '{}')
      and profiles.deleted_at is null);
$$;

comment on function public.is_classics_account(uuid) is
  'Internal: true for the classics account, false when it does not exist yet (S1-E5-10).';
revoke execute on function public.is_classics_account(uuid) from public, anon, authenticated;

/**
 * may_feature_writer: may this person's stories be put in Featured this week?
 * Input: person_id, the writer. Returns: true for the classics account, or for an active account
 *   (not suspended, banned, closed or waiting for anything) whose age group is 16 to 17 or 18
 *   and over. Under-16s and unknown ages are never featured (Robert, 6 Nov 2026, D2).
 * LOOK-4c adds the writer's own "Suggest me" switch and the shared may_spotlight_writer().
 * Where it fits: admin_featured_candidates(), admin_set_featured_picks() and, on every read,
 *   featured_stories_now().
 */
create or replace function public.may_feature_writer(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select person_id is not null and (
    public.is_classics_account(person_id)
    or (public.account_state(person_id) = 'active'
        and public.age_band_of(person_id) in ('16_to_17', '18_plus')));
$$;

comment on function public.may_feature_writer(uuid) is
  'Internal: true when a writer may be featured: the classics account, or active and 16 or over (S1-E5-10; Robert, 6 Nov 2026).';
revoke execute on function public.may_feature_writer(uuid) from public, anon, authenticated;

/**
 * featured_ineligible_reason: why a story can't go in Featured, or null when it can.
 * Input: target_story_id. Returns one of: not_found, not_public (deleted, private, unlisted or
 *   class only), moderated, restricted, no_chapter, writer_not_active, writer_under_16,
 *   writer_age_unknown; or null.
 * Where it fits: the ranking screen shows the reason before staff save (criterion 4), and
 *   admin_set_featured_picks() refuses any story with one.
 */
create or replace function public.featured_ineligible_reason(target_story_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.stories%rowtype;
  writer_band public.age_band;
begin
  -- Step 1: the story itself must be open to everyone on the web.
  select * into target from public.stories where stories.id = target_story_id;
  if not found then
    return 'not_found';
  end if;
  if target.deleted_at is not null or target.visibility <> 'public' or target.class_only then
    return 'not_public';
  end if;
  -- Step 2: moderators haven't hidden or restricted it, and it has a chapter to read.
  if public.is_moderated_away('story', target.id) then
    return 'moderated';
  end if;
  if exists (select 1 from public.story_restrictions
             where story_restrictions.story_id = target.id and story_restrictions.lifted_at is null) then
    return 'restricted';
  end if;
  if not public.story_has_readable_chapter(target.id) then
    return 'no_chapter';
  end if;
  -- Step 3: the writer (the classics account always passes).
  if public.may_feature_writer(target.user_id) then
    return null;
  end if;
  if public.account_state(target.user_id) <> 'active' then
    return 'writer_not_active';
  end if;
  writer_band := public.age_band_of(target.user_id);
  if writer_band in ('under_13', '13_to_15') then
    return 'writer_under_16';
  end if;
  return 'writer_age_unknown';
end;
$$;

comment on function public.featured_ineligible_reason(uuid) is
  'Internal: why a story can''t be featured, or null when it can (S1-E5-10).';
revoke execute on function public.featured_ineligible_reason(uuid) from public, anon, authenticated;

/* ---------- 6. The ranking screen ---------- */

/**
 * featured_candidate_rows: every current active story with the signals the Featured screen shows.
 * Inputs: none. Returns one row per story that is public on the web, not deleted, not moderated
 *   away, has a readable chapter and had a chapter out within featured_active_days.
 * Where it fits: the body of admin_featured_candidates(), kept apart so that function stays short.
 */
create or replace function public.featured_candidate_rows()
returns table (
  story_id uuid,
  slug text,
  title text,
  writer_handle text,
  writer_pen_name text,
  rank integer,
  rank_change integer,
  score double precision,
  reads_7d bigint,
  read_through double precision,
  followers bigint,
  first_published_at timestamptz,
  rating public.story_rating,
  category_slug text,
  is_new_writer boolean,
  ineligible_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'Europe/Bucharest')::date as day
  ),
  current_ranks as (
    select story_scores.story_id, story_scores.score,
      rank() over (order by story_scores.score desc)::integer as rank
    from public.story_scores
  ),
  candidates as (
    select stories.* from public.stories
    where stories.deleted_at is null
      and stories.visibility = 'public'
      and not stories.class_only
      and stories.last_chapter_published_at >= now()
        - make_interval(days => (public.setting_value('featured_active_days'))::text::integer)
      and not public.is_moderated_away('story', stories.id)
      and public.story_has_readable_chapter(stories.id)
  ),
  writer_firsts as (
    select stories.user_id, min(stories.first_published_at) as first_at
    from public.stories where stories.deleted_at is null
    group by stories.user_id
  )
  select candidates.id, candidates.slug, candidates.title,
    profiles.handle, profiles.pen_name,
    current_ranks.rank,
    -- A positive change means the story climbed (rank 9 a week ago, 4 today: +5).
    (select snapshots.rank from public.story_rank_snapshots as snapshots, today
     where snapshots.story_id = candidates.id and snapshots.snapshot_on = today.day - 7)
      - current_ranks.rank,
    coalesce(current_ranks.score, 0),
    coalesce((select sum(reads.total) from public.chapter_reads as reads
              join public.chapters on chapters.id = reads.chapter_id, today
              where chapters.story_id = candidates.id and reads.read_on > today.day - 7), 0)::bigint,
    coalesce(signals.read_through, 0),
    (select count(*) from public.follows_users where follows_users.followed_user_id = candidates.user_id),
    candidates.first_published_at,
    candidates.rating,
    categories.slug,
    coalesce(writer_firsts.first_at >= now()
      - make_interval(days => (public.setting_value('rising_writer_days'))::text::integer), false),
    public.featured_ineligible_reason(candidates.id)
  from candidates
  join public.profiles on profiles.id = candidates.user_id
  join public.categories on categories.id = candidates.category_id
  left join current_ranks on current_ranks.story_id = candidates.id
  left join public.story_signals() as signals on signals.story_id = candidates.id
  left join writer_firsts on writer_firsts.user_id = candidates.user_id;
$$;

comment on function public.featured_candidate_rows() is
  'Internal: every current active story with its rank, signals and whether it can be featured (S1-E5-10).';
revoke execute on function public.featured_candidate_rows() from public, anon, authenticated;

/**
 * admin_featured_candidates: the Stories › Featured screen's table.
 * Inputs: view, one of 'all' (by rank), 'rising' (biggest climb over 7 days), 'new_writers'
 *   (writers whose first story is within rising_writer_days) and 'promising' (read-through at least
 *   featured_promising_read_through with fewer reads this week than the median); category_slug and
 *   rating, optional filters; page_size (1 to 500) and page_offset.
 * Returns: jsonb {total, median_reads_7d, featured_max, picks: [story IDs in order], stories: [...]}.
 *   Staff sort the page on screen; that never changes a rank (criterion 2).
 * Errors: insufficient_privilege (42501) without the Featured area in a staff session;
 *   invalid_parameter_value (22023) for an unknown view.
 * Where it fits: hooks/useFeaturedCandidates.ts → api/featured.ts → here.
 */
create or replace function public.admin_featured_candidates(
  view text default 'all',
  category_slug text default null,
  rating public.story_rating default null,
  page_size integer default 200,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  promising_through double precision :=
    (public.setting_value('featured_promising_read_through'))::text::double precision;
  first_row integer := greatest(page_offset, 0);
  last_row integer := greatest(page_offset, 0) + least(greatest(page_size, 1), 500);
  answer jsonb;
begin
  -- Step 1: admins and the owner only, in a staff session.
  if not public.staff_may('featured', 'view') then
    raise exception 'Only admins can open Featured this week.' using errcode = 'insufficient_privilege';
  end if;
  if view not in ('all', 'rising', 'new_writers', 'promising') then
    raise exception 'Unknown view: %', view using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: the candidates once; the median of this week's reads across all of them; then the
  -- view and filters, numbered in the view's order (rising: biggest climb first; else by rank).
  with candidate_rows as materialized (
    select * from public.featured_candidate_rows()
  ),
  median as (
    select coalesce(percentile_cont(0.5) within group (order by candidate_rows.reads_7d), 0) as reads
    from candidate_rows
  ),
  chosen as (
    select candidate_rows.*,
      row_number() over (order by
        case when view = 'rising' then -coalesce(candidate_rows.rank_change, 0) end,
        candidate_rows.rank nulls last, candidate_rows.title) as sort_order,
      count(*) over () as matching_total
    from candidate_rows, median
    where (admin_featured_candidates.category_slug is null
           or candidate_rows.category_slug = admin_featured_candidates.category_slug)
      and (admin_featured_candidates.rating is null
           or candidate_rows.rating = admin_featured_candidates.rating)
      and (view <> 'rising' or coalesce(candidate_rows.rank_change, 0) > 0)
      and (view <> 'new_writers' or candidate_rows.is_new_writer)
      and (view <> 'promising'
           or (candidate_rows.read_through >= promising_through and candidate_rows.reads_7d < median.reads))
  )
  -- Step 3: one page, with the totals and the current picks so the screen can tick them.
  select jsonb_build_object(
    'total', coalesce((select max(chosen.matching_total) from chosen), 0),
    'median_reads_7d', (select median.reads from median),
    'featured_max', (public.setting_value('featured_max'))::text::integer,
    'picks', coalesce((select jsonb_agg(featured_picks.story_id order by featured_picks.position)
                       from public.featured_picks where featured_picks.removed_at is null), '[]'::jsonb),
    'stories', coalesce((select jsonb_agg(
        (to_jsonb(chosen) - 'story_id' - 'sort_order' - 'matching_total')
          || jsonb_build_object('id', chosen.story_id)
        order by chosen.sort_order)
      from chosen where chosen.sort_order > first_row and chosen.sort_order <= last_row), '[]'::jsonb))
  into answer;
  return answer;
end;
$$;

comment on function public.admin_featured_candidates(text, text, public.story_rating, integer, integer) is
  'Admins and the owner: every current active story with its rank, signals and whether it can be featured (S1-E5-10).';
revoke execute on function public.admin_featured_candidates(text, text, public.story_rating, integer, integer)
  from public, anon;
grant execute on function public.admin_featured_candidates(text, text, public.story_rating, integer, integer)
  to authenticated;

/* ---------- 7. Saving the picks ---------- */

/**
 * admin_set_featured_picks: replaces the Featured list with these stories, in this order.
 * Inputs: story_ids, 0 to featured_max story IDs (an empty list empties the band); reason, why
 *   (required, for the audit log).
 * Returns: nothing.
 * Errors: insufficient_privilege (42501) without the Featured area in a staff session;
 *   check_violation (23514) for no reason, too many stories, a story twice, or a story that
 *   can't be featured (the message names the reason).
 * Logged as featured.picks_set with the before and after lists. Each writer who wasn't in the
 *   list before gets a story_featured notification (the classics account gets none).
 * Where it fits: the Save button on Stories › Featured → api/featured.ts → here.
 */
create or replace function public.admin_set_featured_picks(story_ids uuid[], reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  picks uuid[] := coalesce(story_ids, '{}');
  before_list uuid[];
  refused text;
  pick_position integer;
begin
  -- Step 1: admins and the owner only, in a staff session, with a reason.
  if not public.staff_may('featured', 'act') then
    raise exception 'Only admins can change Featured this week.' using errcode = 'insufficient_privilege';
  end if;
  if reason is null or btrim(reason) = '' then
    raise exception 'Say why you are changing Featured this week.' using errcode = 'check_violation';
  end if;
  -- Step 2: the list's shape: not too long, no story twice.
  if cardinality(picks) > (public.setting_value('featured_max'))::text::integer then
    raise exception 'Featured this week holds at most % stories.',
      (public.setting_value('featured_max'))::text using errcode = 'check_violation';
  end if;
  if cardinality(picks) <> (select count(distinct pick) from unnest(picks) as pick) then
    raise exception 'A story is in the list twice.' using errcode = 'check_violation';
  end if;
  -- Step 3: every story must be one we may put on show (Robert, 6 Nov 2026: 16 or over).
  select public.featured_ineligible_reason(pick) into refused
  from unnest(picks) as pick
  where public.featured_ineligible_reason(pick) is not null
  limit 1;
  if refused is not null then
    raise exception 'A story in the list can''t be featured: %.', refused using errcode = 'check_violation';
  end if;
  -- Step 4: take the old list out (kept as a record) and put the new one in, in order.
  select coalesce(array_agg(featured_picks.story_id order by featured_picks.position), '{}')
  into before_list
  from public.featured_picks where featured_picks.removed_at is null;
  update public.featured_picks set removed_at = now(), updated_at = now() where removed_at is null;
  for pick_position in 1 .. cardinality(picks) loop
    insert into public.featured_picks (story_id, position, user_id)
    values (picks[pick_position], pick_position, (select auth.uid()));
  end loop;
  -- Step 5: the audit row with both lists, in the same transaction.
  perform public.log_staff_action('featured.picks_set', 'featured_picks', null, null, reason,
    jsonb_build_object('story_ids', to_jsonb(before_list)),
    jsonb_build_object('story_ids', to_jsonb(picks)));
  -- Step 6: tell each newly picked writer (not the classics account), once per story.
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, is_required)
  select stories.user_id, 'story_featured', '{}'::uuid[], 0, stories.id, false
  from public.stories
  where stories.id = any (picks)
    and not (stories.id = any (before_list))
    and not public.is_classics_account(stories.user_id);
end;
$$;

comment on function public.admin_set_featured_picks(uuid[], text) is
  'Admins and the owner: replace Featured this week, logged with before and after; new writers are told (S1-E5-10).';
revoke execute on function public.admin_set_featured_picks(uuid[], text) from public, anon;
grant execute on function public.admin_set_featured_picks(uuid[], text) to authenticated;

/* ---------- 8. The band ---------- */

/**
 * featured_stories_now: the Featured band's cards for whoever is reading.
 * Inputs: none. Returns: a jsonb array of story cards (story_card_json) in the staff's order,
 *   leaving out any story this reader may not see (rating above their age, a block either way,
 *   moderated away, restricted, no longer public) and any whose writer no longer passes
 *   may_feature_writer(). An empty array means the band is hidden (no automatic fallback).
 *   Cards carry the handle and pen name, never a user ID.
 * Where it fits: the Discover band → api/featured.ts → here. The same tests as listed_stories(),
 *   written out here because the band only ever checks five stories.
 */
create or replace function public.featured_stories_now()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select (select auth.uid()) as id
  ),
  blocked as (
    select blocks.blocked_user_id as person_id from public.blocks, caller where blocks.user_id = caller.id
    union
    select blocks.user_id from public.blocks, caller where blocks.blocked_user_id = caller.id
  )
  select coalesce(jsonb_agg(public.story_card_json(stories.id) order by featured_picks.position), '[]'::jsonb)
  from public.featured_picks
  join public.stories on stories.id = featured_picks.story_id
  where featured_picks.removed_at is null
    -- The story is still open to everyone and nothing has taken it off show.
    and public.featured_ineligible_reason(stories.id) is null
    -- CLAUDE.md rule 18: never above the reader's rating; rule 6: never across a block.
    and public.rating_allows(stories.rating)
    and not exists (select 1 from blocked where blocked.person_id = stories.user_id);
$$;

comment on function public.featured_stories_now() is
  'The Featured this week cards this reader may see, in the staff''s order; empty hides the band (S1-E5-10).';
revoke execute on function public.featured_stories_now() from public;
grant execute on function public.featured_stories_now() to anon, authenticated;

/* ---------- 9. The notification's group ---------- */

/** notification_category: as in IDEAS-3e, plus story_featured under stories. */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    else 'replies'
  end;
$$;

/* ---------- 10. Download my data ---------- */

/** data_export_held_tables: as in LOGS-1a, plus featured_picks (its user_id is the staff member who picked). */
create or replace function public.data_export_held_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('abuse_image_evidence', false, 'evidence kept for the police about a suspected child abuse image; handing it out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('account_staff_notes', false, 'staff notes can name other people (a reporter, a linked account) or a safeguarding concern, so they are not in the automatic file; when the person asks for their data, staff copy the notes in by hand after taking out other people''s details (GDPR art. 15(4) and art. 23; lawyer to check)'),
    ('audit_log', false, 'the record of what staff did; the changes it records about the person are in the groups below'),
    ('brand_assets', false, 'user_id is the staff member who chose a logo, not data about their account'),
    ('case_account_links', false, 'a moderator''s note that two accounts may be one person, kept to spot banned accounts coming back; telling the person would defeat it (GDPR art. 23; lawyer to check)'),
    ('case_actions', false, 'user_id is the staff member who decided; the decisions reach the person as statements of reasons, which are included'),
    ('cases', false, 'open moderation cases; decisions reach the person as statements of reasons, which are included, and an open case may be held back while it is looked into (GDPR art. 23; lawyer to check)'),
    ('compliance_log_entries', false, 'user_id is the staff member who logged an authority order, not data about their account'),
    ('copied_work_notes', true, null),
    ('data_requests', true, null),
    ('featured_picks', false, 'user_id is the staff member who picked a story for Featured this week, not data about their account; the writer is told by a notification, which is in their export'),
    ('interface_text_overrides', false, 'user_id is the admin who edited interface text, not data about their account'),
    ('moderated_items', true, null),
    ('on_call_rota', true, null),
    ('removed_passages', false, 'the exact words staff removed, which may be someone else''s personal data removed to protect them; the removal itself is in story_revisions'),
    ('safeguarding_referrals', false, 'referrals to the police or a prosecutor; handing them out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('sanctions', true, null),
    ('sign_up_ips', true, null),
    ('staff_interns', true, null),
    ('staff_permissions', true, null),
    ('staff_roles', true, null),
    ('story_restrictions', true, null),
    ('story_revisions', true, null);
$$;

comment on function public.data_export_held_tables() is
  'Internal: every staff table with a user_id and whether Download my data''s "held_about_you" includes it, or why not (QA-7, LOGS-1a, LOOK-4a; GDPR art. 15).';
revoke execute on function public.data_export_held_tables() from public, anon, authenticated;
