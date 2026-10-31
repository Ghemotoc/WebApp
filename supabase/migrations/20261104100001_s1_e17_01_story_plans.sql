/*
 * Migration: every story's plan, the private side of Story Atlas (stories S1-E17-01 to S1-E17-06;
 * docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part a).
 *
 * One story, two sides (Robert, 31 Oct 2026, 08:00): the story a writer makes with New story
 * (S1-E3-01) is the same story they plan in Story Atlas. This migration gives every story its plan.
 *
 * What it adds:
 * - story_plans: one row per story with the plan's own fields: logline, series name, word target,
 *   writing status, publishing route and a link to a project outside the platform. The story's title,
 *   category (genre) and rating (audience) stay on stories, so they are changed in one place for
 *   both sides, through update_my_story() (S1-E17-03).
 * - story_plan_acts: Act I, Act II and Act III for every plan (S1-E17-01). Acts are private
 *   groupings and are never shown to readers.
 * - A trigger that makes the plan and its three acts whenever a story is made, and a backfill for
 *   the stories made before Story Atlas (S1-E17-01: "Stories created before Story Atlas get their
 *   plan the first time it is opened"; making it now means it is there when first opened).
 * - story_plan(): the at-a-glance page's data (S1-E17-06). update_story_plan(): changes the plan's
 *   own fields (S1-E17-03, S1-E17-04).
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer can read or change a plan.
 *   Making parts of it public comes in S1-E17-32. Deleting the story deletes its plan (S1-E17-05:
 *   the plan rows cascade from stories, which the nightly purge deletes after the undo days).
 * Personal data: the writer's own planning notes, read only by them; no new processor.
 * Who calls it: src/features/atlas/api/storyPlans.ts.
 * Tests: supabase/tests/database/190-story-plans.test.sql.
 */

/* ---------- The plan ---------- */

create table public.story_plans (
  -- One plan per story; it goes with the story when the story is purged (S1-E17-05).
  story_id uuid primary key references public.stories (id) on delete cascade,
  -- The writer (CLAUDE.md rule 15); always the story's own writer.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- A sentence or two that sums the story up, for the writer's eyes (S1-E17-06).
  logline text not null default '',
  series_name text not null default '',
  -- The story's word target (S1-E17-01: 90,000 by default).
  word_target integer not null default 90000,
  writing_status text not null default 'planning',
  publishing_route text not null default 'undecided',
  -- A related project outside the platform, such as a shared drive or a mood board (S1-E17-04).
  linked_project_label text not null default '',
  linked_project_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_plans_logline_length check (char_length(logline) <= 400),
  constraint story_plans_series_name_length check (char_length(series_name) <= 120),
  constraint story_plans_word_target_range check (word_target between 1 and 5000000),
  constraint story_plans_writing_status_known check (
    writing_status in ('planning', 'drafting', 'revising', 'editing', 'finished', 'on_hold')
  ),
  constraint story_plans_publishing_route_known check (
    publishing_route in ('undecided', 'serial_here', 'complete_here', 'here_and_elsewhere')
  ),
  constraint story_plans_linked_project_label_length check (char_length(linked_project_label) <= 60),
  -- Only web addresses (S1-E17-04: "an address that isn't http or https is refused").
  constraint story_plans_linked_project_url_web check (
    linked_project_url = ''
    or (linked_project_url ~* '^https?://[^\s]+$' and char_length(linked_project_url) <= 2000)
  )
);

comment on table public.story_plans is
  'kind: user_content; reportable: story
The private plan of one story in Story Atlas (S1-E17-01 to S1-E17-06): logline, series, word target, writing status, publishing route and a linked project. Only the writer reads it.';
comment on column public.story_plans.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';
comment on column public.story_plans.writing_status is
  'Where the writer is with the story: planning, drafting, revising, editing, finished or on_hold (S1-E17-03).';
comment on column public.story_plans.publishing_route is
  'How the writer means to publish it: undecided, serial_here, complete_here or here_and_elsewhere (S1-E17-06).';

create trigger story_plans_set_updated_at
  before update on public.story_plans
  for each row execute function public.set_updated_at();

create trigger story_plans_refuse_user_id_change
  before update on public.story_plans
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_plans enable row level security;

-- The writer reads their own plans; every write goes through the functions below.
grant select on public.story_plans to authenticated;

/**
 * story_plans_select_own: the writer reads the plans of their own stories, for Story Atlas.
 * Nobody else, staff included, reads a private plan through the app (S1-E17 notes).
 */
create policy story_plans_select_own
  on public.story_plans for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_plans_select_own on public.story_plans is
  'Allows a writer to read the plans of their own stories, and nobody else (S1-E17-01; private by default, Robert 31 Oct 2026).';

/* ---------- Acts ---------- */

create table public.story_plan_acts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 1, 2, 3 …: the act's place in the story.
  position integer not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_plan_acts_position_counts_from_one check (position >= 1),
  constraint story_plan_acts_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint story_plan_acts_one_per_place unique (story_id, position)
);

comment on table public.story_plan_acts is
  'kind: user_content; reportable: story
The acts of one story''s plan (S1-E17-01: Act I, Act II and Act III to start with). Private groupings of chapters; never shown to readers.';
comment on column public.story_plan_acts.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create trigger story_plan_acts_set_updated_at
  before update on public.story_plan_acts
  for each row execute function public.set_updated_at();

create trigger story_plan_acts_refuse_user_id_change
  before update on public.story_plan_acts
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_plan_acts enable row level security;

grant select on public.story_plan_acts to authenticated;

/**
 * story_plan_acts_select_own: the writer reads the acts of their own plans, for Story Atlas.
 */
create policy story_plan_acts_select_own
  on public.story_plan_acts for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_plan_acts_select_own on public.story_plan_acts is
  'Allows a writer to read the acts of their own story plans, and nobody else (S1-E17-01).';

/* ---------- Every story gets its plan ---------- */

/**
 * make_story_plan: the trigger that gives a new story its plan and three acts (S1-E17-01).
 * Runs after a story is inserted, by New story (create_story()), the seed or staff tools alike.
 * Returns: the new row, unchanged.
 */
create or replace function public.make_story_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the plan, with the defaults of S1-E17-01 (a 90,000-word target).
  insert into public.story_plans (story_id, user_id) values (new.id, new.user_id)
  on conflict (story_id) do nothing;
  -- Step 2: the three acts every plan starts with.
  insert into public.story_plan_acts (story_id, user_id, position, name)
  values (new.id, new.user_id, 1, 'Act I'), (new.id, new.user_id, 2, 'Act II'), (new.id, new.user_id, 3, 'Act III')
  on conflict (story_id, position) do nothing;
  return new;
end;
$$;

comment on function public.make_story_plan() is
  'Trigger: makes a new story''s plan and its three acts (S1-E17-01).';
revoke execute on function public.make_story_plan() from public, anon, authenticated;

create trigger stories_make_plan
  after insert on public.stories
  for each row execute function public.make_story_plan();

-- The stories made before Story Atlas: each gets its plan and acts now.
insert into public.story_plans (story_id, user_id)
select stories.id, stories.user_id from public.stories
on conflict (story_id) do nothing;
insert into public.story_plan_acts (story_id, user_id, position, name)
select stories.id, stories.user_id, acts.position, acts.name
from public.stories
cross join (values (1, 'Act I'), (2, 'Act II'), (3, 'Act III')) as acts (position, name)
on conflict (story_id, position) do nothing;

/* ---------- Reading the plan ---------- */

/**
 * story_plan_chapters: the chapter numbers the at-a-glance page shows (S1-E17-06).
 * Input: a story's ID. Returns: { words_written, chapter_count, published_count,
 *   recent: [{ code, position, title, edited_at }] }, the five chapters edited most recently.
 * Internal: story_plan() calls it after checking the story is the caller's.
 */
create or replace function public.story_plan_chapters(plan_story_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    -- The words in the writer's current drafts, published or not (S1-E17-06).
    'words_written', coalesce(sum(chapters.word_count), 0),
    'chapter_count', count(*),
    'published_count', count(*) filter (where chapters.status = 'published'),
    'recent', coalesce((
      select jsonb_agg(recent_chapter order by recent_chapter ->> 'edited_at' desc)
      from (
        select jsonb_build_object(
          'code', latest.code, 'position', latest.position, 'title', latest.draft_title,
          'edited_at', coalesce(latest.draft_saved_at, latest.updated_at)
        ) as recent_chapter
        from public.chapters as latest
        where latest.story_id = plan_story_id and latest.deleted_at is null
        order by coalesce(latest.draft_saved_at, latest.updated_at) desc
        limit 5
      ) as recent_rows
    ), '[]'::jsonb)
  )
  from public.chapters
  where chapters.story_id = plan_story_id and chapters.deleted_at is null;
$$;

comment on function public.story_plan_chapters(uuid) is
  'Internal: words written, chapter counts and the recently edited chapters of one story (S1-E17-06).';
revoke execute on function public.story_plan_chapters(uuid) from public, anon, authenticated;

/**
 * story_plan: everything the at-a-glance page shows for one of the caller's stories (S1-E17-06).
 * Input: the story's slug. Returns: { outcome: 'ok', story: {...}, plan: {...}, acts: [...],
 *   chapters: {...} }, or { outcome: 'not_found' } when it isn't the caller's live story.
 * The story's title, category and rating come from stories (one place for both sides, S1-E17-03).
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/storyPlans.ts (the at-a-glance page).
 */
create or replace function public.story_plan(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  result jsonb;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to see your plan.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the story's own fields and the plan's, never the user ID (rule 15).
  select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object(
      'slug', stories.slug, 'title', stories.title, 'blurb', stories.blurb,
      'category_slug', categories.slug, 'rating', stories.rating,
      'first_published_at', stories.first_published_at
    ),
    'plan', jsonb_build_object(
      'logline', plans.logline, 'series_name', plans.series_name, 'word_target', plans.word_target,
      'writing_status', plans.writing_status, 'publishing_route', plans.publishing_route,
      'linked_project_label', plans.linked_project_label, 'linked_project_url', plans.linked_project_url,
      'updated_at', plans.updated_at
    ),
    'acts', coalesce((
      select jsonb_agg(jsonb_build_object('position', acts.position, 'name', acts.name) order by acts.position)
      from public.story_plan_acts as acts where acts.story_id = stories.id
    ), '[]'::jsonb),
    'chapters', public.story_plan_chapters(stories.id)
  )
  into result
  from public.stories
  join public.story_plans as plans on plans.story_id = stories.id
  join public.categories on categories.id = stories.category_id
  where stories.id = target_story_id;
  return result;
end;
$$;

comment on function public.story_plan(text) is
  'The at-a-glance page of one of the caller''s stories: the story, its plan, acts and chapter numbers (S1-E17-06).';
revoke execute on function public.story_plan(text) from public, anon;
grant execute on function public.story_plan(text) to authenticated;

/* ---------- Changing the plan ---------- */

/**
 * update_story_plan: changes the plan's own fields of one of the caller's stories (S1-E17-03,
 * S1-E17-04). Each field saves by itself as the writer types (the Story Atlas principle: no Save
 * button), so `changes` holds only the fields that changed.
 * Inputs: the story's slug; changes, any of logline, series_name, word_target, writing_status,
 *   publishing_route, linked_project_label and linked_project_url.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation (from the table's checks) for a
 *   value out of range, such as an address that isn't http or https.
 * The title, genre and audience are the story's own: they go through update_my_story().
 * Who calls it: src/features/atlas/api/storyPlans.ts.
 */
create or replace function public.update_story_plan(story_slug text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer and their own live story. A plan is private, so a read-only
  -- account may still plan; the account gate guards what others can see, not the writer's notes.
  if caller_id is null then
    raise exception 'Sign in to change your plan.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: change only the fields given; the text is trimmed, and the table's checks refuse
  -- anything out of range.
  update public.story_plans set
    logline = coalesce(btrim(changes ->> 'logline'), logline),
    series_name = coalesce(btrim(changes ->> 'series_name'), series_name),
    word_target = coalesce((changes ->> 'word_target')::integer, word_target),
    writing_status = coalesce(changes ->> 'writing_status', writing_status),
    publishing_route = coalesce(changes ->> 'publishing_route', publishing_route),
    linked_project_label = coalesce(btrim(changes ->> 'linked_project_label'), linked_project_label),
    linked_project_url = coalesce(btrim(changes ->> 'linked_project_url'), linked_project_url)
  where story_plans.story_id = target_story_id
  returning updated_at into saved_at;

  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_story_plan(text, jsonb) is
  'Changes the plan''s own fields of one of the caller''s stories: logline, series, word target, writing status, publishing route and linked project (S1-E17-03, S1-E17-04).';
revoke execute on function public.update_story_plan(text, jsonb) from public, anon;
grant execute on function public.update_story_plan(text, jsonb) to authenticated;
