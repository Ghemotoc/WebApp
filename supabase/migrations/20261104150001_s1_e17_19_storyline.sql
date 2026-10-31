/*
 * Migration: the storyline in Story Atlas: the chapter board, the timeline and the point-of-view
 * lanes (stories S1-E17-19 to S1-E17-22; docs/stories/s1-e17-story-atlas.md; bundle ATLAS,
 * part f).
 *
 * What it adds:
 * - story_events: the writer's in-world events for the timeline (S1-E17-20): a title, the date
 *   as the writer writes it ("Spring 2055"), a number to sort by (2055.3) and a description.
 * - story_storyline(): everything the three views draw in one reading: the chapters in book
 *   order with their planning (type, status, point of view, act, words, target, in-world date),
 *   the acts, the characters and the events.
 * - place_chapter_on_board(): saves a move on the board (drag or the move buttons): the story's
 *   chapters in their new order and the moved chapter's act. A move that changes the order
 *   readers see is refused until the writer confirms it (S1-E17-19, as Manage chapters does,
 *   S1-E3-04).
 * - add_chapter_to_act(): "Add chapter" at the end of an act column.
 * - add_story_event(), update_story_event() and delete_story_event() for the timeline.
 * Acts stay private groupings: readers never see them; they see only the chapters' order.
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer reads or changes any of it.
 * Personal data: the writer's own planning notes, read only by them; no new processor.
 * Who calls it: src/features/atlas/api/storyline.ts.
 * Tests: supabase/tests/database/195-storyline.test.sql.
 */

/* ---------- Timeline events ---------- */

create table public.story_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  -- The date as the writer shows it: "Spring 2055", "Year 3 of the war".
  display_date text not null default '',
  -- What the timeline sorts by, beside the chapters' own sort values (S1-E17-20).
  sort_value numeric not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_events_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint story_events_display_date_length check (char_length(display_date) <= 80),
  constraint story_events_description_length check (char_length(description) <= 5000)
);

comment on table public.story_events is
  'kind: user_content; reportable: story
The in-world events on a story''s timeline (S1-E17-20). Only the writer reads them.';
comment on column public.story_events.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index story_events_story_id_idx on public.story_events (story_id, sort_value);

create trigger story_events_set_updated_at
  before update on public.story_events
  for each row execute function public.set_updated_at();

create trigger story_events_refuse_user_id_change
  before update on public.story_events
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_events enable row level security;

grant select on public.story_events to authenticated;

/**
 * story_events_select_own: the writer reads the events of their own timelines. Nobody else reads
 * them through the app (private by default).
 */
create policy story_events_select_own
  on public.story_events for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_events_select_own on public.story_events is
  'Allows a writer to read the events on their own timelines, and nobody else (S1-E17-20).';

/* ---------- Helpers ---------- */

/**
 * my_story_event: one of the caller's events on a live story.
 * Input: the event's ID. Returns: the row, or a row of nulls when it isn't the caller's.
 * Internal: update_story_event() and delete_story_event().
 */
create or replace function public.my_story_event(target_event_id uuid)
returns public.story_events
language sql
stable
security definer
set search_path = ''
as $$
  select events.* from public.story_events as events
  join public.stories on stories.id = events.story_id
  where events.id = target_event_id
    and events.user_id = (select auth.uid())
    and stories.deleted_at is null;
$$;

comment on function public.my_story_event(uuid) is
  'Internal: one of the caller''s timeline events on a live story, or nulls (S1-E17-20).';
revoke execute on function public.my_story_event(uuid) from public, anon, authenticated;

/**
 * storyline_chapters_json: a story's live chapters in book order with their planning, for
 * story_storyline().
 * Input: the story's ID. Returns: [{ code, position, title, status, kind, planning_status,
 *   pov_character_id, act_id, word_count, word_target, world_date, world_sort }].
 * Internal: story_storyline() calls it after checking the story is the caller's.
 */
create or replace function public.storyline_chapters_json(target_story_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', chapters.code, 'position', chapters.position, 'title', chapters.draft_title,
      'status', chapters.status, 'kind', coalesce(plans.kind, 'chapter'),
      'planning_status', coalesce(plans.planning_status, 'idea'),
      'pov_character_id', plans.pov_character_id, 'act_id', plans.act_id,
      'word_count', chapters.word_count, 'word_target', plans.word_target,
      'world_date', coalesce(plans.world_date, ''), 'world_sort', plans.world_sort)
    order by chapters.position, chapters.created_at), '[]'::jsonb)
  from public.chapters
  left join public.chapter_plans as plans on plans.chapter_id = chapters.id
  where chapters.story_id = target_story_id and chapters.deleted_at is null;
$$;

comment on function public.storyline_chapters_json(uuid) is
  'Internal: a story''s live chapters in book order with their planning (S1-E17-19 to 21).';
revoke execute on function public.storyline_chapters_json(uuid) from public, anon, authenticated;

/**
 * published_order: the codes of a story's published chapters in the order readers see them.
 * Inputs: the story's ID; an order of codes to read it from (null means the order saved now).
 * Returns: the published codes, in that order.
 * Internal: place_chapter_on_board() compares the two to see whether readers would notice.
 */
create or replace function public.published_order(target_story_id uuid, chapter_codes text[])
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(chapters.code order by coalesce(listed.place, chapters.position)), '{}')
  from public.chapters
  left join unnest(chapter_codes) with ordinality as listed(code, place) on listed.code = chapters.code
  where chapters.story_id = target_story_id and chapters.deleted_at is null
    and chapters.status = 'published';
$$;

comment on function public.published_order(uuid, text[]) is
  'Internal: a story''s published chapter codes in a given or the saved order (S1-E17-19).';
revoke execute on function public.published_order(uuid, text[]) from public, anon, authenticated;

/* ---------- Reading ---------- */

/**
 * story_storyline: everything the board, the timeline and the point-of-view lanes draw
 * (S1-E17-19 to S1-E17-22).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', title, chapters: [...] (storyline_chapters_json), acts: [{ id, name,
 *   position }], characters: [{ id, name }], events: [{ id, title, display_date, sort_value,
 *   description }] }, or { outcome: 'not_found' }. Never a user ID (rule 15).
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/storyline.ts (the storyline page).
 */
create or replace function public.story_storyline(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story with its plan.
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your storyline.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null or not exists (
    select 1 from public.story_plans where story_plans.story_id = target_story_id) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the chapters, acts, characters and events.
  return jsonb_build_object(
    'outcome', 'ok',
    'title', (select stories.title from public.stories where stories.id = target_story_id),
    'chapters', public.storyline_chapters_json(target_story_id),
    'acts', coalesce((select jsonb_agg(jsonb_build_object('id', acts.id, 'name', acts.name,
        'position', acts.position) order by acts.position)
      from public.story_plan_acts as acts where acts.story_id = target_story_id), '[]'::jsonb),
    'characters', coalesce((select jsonb_agg(jsonb_build_object('id', cast_member.id, 'name', cast_member.name)
        order by lower(cast_member.name), cast_member.created_at)
      from public.story_characters as cast_member where cast_member.story_id = target_story_id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', events.id, 'title', events.title,
        'display_date', events.display_date, 'sort_value', events.sort_value,
        'description', events.description) order by events.sort_value, events.created_at)
      from public.story_events as events where events.story_id = target_story_id), '[]'::jsonb));
end;
$$;

comment on function public.story_storyline(text) is
  'The caller''s chapters, acts, characters and timeline events of one story (S1-E17-19 to 22).';
revoke execute on function public.story_storyline(text) from public, anon;
grant execute on function public.story_storyline(text) to authenticated;

/* ---------- The board (S1-E17-19) ---------- */

/**
 * place_chapter_on_board: saves one move on the board: every chapter in its new order, and the
 * act the moved chapter now sits in.
 * Inputs: chapter_code (the moved chapter); act_id (its act, '' for none); chapter_codes (every
 *   live chapter of the story exactly once, in the new order); confirmed (true once the writer
 *   agreed that readers will see a new order).
 * Returns: { outcome: 'ok' }; { outcome: 'needs_confirmation' } when the published chapters
 *   would change order and confirmed is false (nothing changes); 'not_active', 'not_found' or
 *   'wrong_list' (a code missing, repeated or not the story's: the board was out of date).
 * Errors: insufficient_privilege when signed out; check_violation with hint other_story for an
 *   act of another story.
 * Where it fits: positions are the order readers see (S1-E3-04), so this is set_chapter_order()
 *   with the act and the question first (S1-E17-19).
 */
create or replace function public.place_chapter_on_board(
  chapter_code text,
  act_id text,
  chapter_codes text[],
  confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan public.chapter_plans;
  new_act_id uuid;
  live_codes text[];
begin
  -- Step 1: a signed-in writer who may write, and their own live chapter (the account gate:
  -- the order readers see is public, S1-E3-04).
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your storyline.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_plan := public.my_chapter_plan(chapter_code);
  if target_plan.chapter_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  new_act_id := public.act_of_story(target_plan.story_id, act_id);
  -- Step 2: lock the story's live chapters, then the list must be exactly those, each once.
  perform 1 from public.chapters
  where chapters.story_id = target_plan.story_id and chapters.deleted_at is null for update;
  select array_agg(chapters.code order by chapters.code) into live_codes
  from public.chapters where chapters.story_id = target_plan.story_id and chapters.deleted_at is null;
  if (select array_agg(listed order by listed) from unnest(chapter_codes) as listed) is distinct from live_codes
     or cardinality(chapter_codes) <> cardinality(live_codes) then
    return jsonb_build_object('outcome', 'wrong_list');
  end if;
  -- Step 3: ask first when readers would see the published chapters in a new order.
  if not coalesce(confirmed, false)
     and public.published_order(target_plan.story_id, chapter_codes)
         is distinct from public.published_order(target_plan.story_id, null) then
    return jsonb_build_object('outcome', 'needs_confirmation');
  end if;
  -- Step 4: each chapter takes its place (from 1), and the moved one its act.
  update public.chapters set position = ordered.place
  from unnest(chapter_codes) with ordinality as ordered(code, place)
  where chapters.code = ordered.code and chapters.story_id = target_plan.story_id
    and chapters.position is distinct from ordered.place::integer;
  update public.chapter_plans set act_id = new_act_id
  where chapter_plans.chapter_id = target_plan.chapter_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.place_chapter_on_board(text, text, text[], boolean) is
  'Saves a move on the caller''s storyline board: the new order and the act; asks first when readers would notice (S1-E17-19).';
revoke execute on function public.place_chapter_on_board(text, text, text[], boolean) from public, anon;
grant execute on function public.place_chapter_on_board(text, text, text[], boolean) to authenticated;

/**
 * add_chapter_to_act: "Add chapter" on an act column: a new draft chapter at the end of that act
 * (S1-E17-19). A draft never changes the order readers see, so it never asks.
 * Inputs: story_slug; act_id (the act, '' for the "No act" column, which adds at the end).
 * Returns: { outcome: 'ok', code, position }, 'not_active' or 'not_found'.
 * Errors: insufficient_privilege when signed out; check_violation with hint other_story for an
 *   act of another story.
 * Where it fits: create_chapter() makes the chapter (and its plan, through the trigger); this
 *   then moves it up behind the act's last chapter, or behind the earlier acts' when it is empty.
 */
create or replace function public.add_chapter_to_act(story_slug text, act_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  target_act public.story_plan_acts;
  made jsonb;
  goal integer;
begin
  -- Step 1: the story and the act (create_chapter() checks the account gate again).
  if (select auth.uid()) is null then
    raise exception 'Sign in to add a chapter.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into target_act from public.story_plan_acts
  where story_plan_acts.id = public.act_of_story(target_story_id, act_id);
  -- Step 2: the chapter, at the end of the book for now.
  made := public.create_chapter(story_slug);
  if made ->> 'outcome' <> 'ok' or target_act.id is null then
    return made;
  end if;
  -- Step 3: its place: after the last chapter of this act or an earlier one (0 for none).
  select coalesce(max(chapters.position), 0) + 1 into goal
  from public.chapters
  join public.chapter_plans as plans on plans.chapter_id = chapters.id
  join public.story_plan_acts as acts on acts.id = plans.act_id
  where chapters.story_id = target_story_id and chapters.deleted_at is null
    and acts.position <= target_act.position;
  -- Step 4: the chapters from there on move one place down; the new one takes the gap.
  update public.chapters set position = position + 1
  where chapters.story_id = target_story_id and chapters.deleted_at is null
    and chapters.position >= goal and chapters.code <> made ->> 'code';
  update public.chapters set position = goal where chapters.code = made ->> 'code';
  update public.chapter_plans set act_id = target_act.id
  where chapter_plans.chapter_id = (select chapters.id from public.chapters where chapters.code = made ->> 'code');
  return jsonb_build_object('outcome', 'ok', 'code', made ->> 'code', 'position', goal);
end;
$$;

comment on function public.add_chapter_to_act(text, text) is
  'Adds a draft chapter at the end of one of the caller''s acts (S1-E17-19).';
revoke execute on function public.add_chapter_to_act(text, text) from public, anon;
grant execute on function public.add_chapter_to_act(text, text) to authenticated;

/* ---------- The timeline (S1-E17-20) ---------- */

/**
 * add_story_event: adds an event to the caller's timeline.
 * Inputs: story_slug; event_title (1 to 200 characters); display_date (up to 80); sort_value
 *   (any number); description (up to 5,000).
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for a missing title or sort
 *   value, over-long text, and with hint too_many_events past 500 in one story (a bound).
 */
create or replace function public.add_story_event(
  story_slug text,
  event_title text,
  display_date text,
  sort_value numeric,
  description text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  new_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story with its plan.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your timeline.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null or not exists (
    select 1 from public.story_plans where story_plans.story_id = target_story_id) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: a sort value is needed to place it; a bound on how many.
  if sort_value is null then
    raise exception 'An event needs a number to sort by.' using errcode = 'check_violation', hint = 'sort_value_required';
  end if;
  if (select count(*) from public.story_events where story_events.story_id = target_story_id) >= 500 then
    raise exception 'A timeline can hold at most 500 events.' using errcode = 'check_violation', hint = 'too_many_events';
  end if;
  -- Step 3: the event, its texts cleaned (rule 4).
  insert into public.story_events (story_id, user_id, title, display_date, sort_value, description)
  values (target_story_id, (select auth.uid()), public.plan_text(event_title), public.plan_text(display_date),
          sort_value, public.plan_text(description))
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_story_event(text, text, text, numeric, text) is
  'Adds an event to the caller''s story timeline (S1-E17-20).';
revoke execute on function public.add_story_event(text, text, text, numeric, text) from public, anon;
grant execute on function public.add_story_event(text, text, text, numeric, text) to authenticated;

/**
 * update_story_event: changes one of the caller's events; each field saves by itself.
 * Inputs: event_id; changes, an object with any of title, display_date, sort_value (a number)
 *   and description.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change for a
 *   key it doesn't know, bad_number for a sort value that isn't a number, and from the checks.
 */
create or replace function public.update_story_event(event_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.story_events;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer, their own event and only known changes.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your timeline.' using errcode = 'insufficient_privilege';
  end if;
  target_event := public.my_story_event(event_id);
  if target_event.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('title', 'display_date', 'sort_value', 'description')) then
    raise exception 'Unknown change to an event.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  -- Step 2: the sort value stays a number (it can't be cleared: the timeline needs it).
  if changes ? 'sort_value' and jsonb_typeof(changes -> 'sort_value') <> 'number' then
    raise exception 'An event sorts by a number.' using errcode = 'check_violation', hint = 'bad_number';
  end if;
  -- Step 3: change only what was given.
  update public.story_events set
    title = case when changes ? 'title' then public.plan_text(changes ->> 'title') else title end,
    display_date = case when changes ? 'display_date' then public.plan_text(changes ->> 'display_date') else display_date end,
    sort_value = case when changes ? 'sort_value' then (changes ->> 'sort_value')::numeric else sort_value end,
    description = case when changes ? 'description' then public.plan_text(changes ->> 'description') else description end
  where story_events.id = target_event.id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_story_event(uuid, jsonb) is
  'Changes one of the caller''s timeline events (S1-E17-20).';
revoke execute on function public.update_story_event(uuid, jsonb) from public, anon;
grant execute on function public.update_story_event(uuid, jsonb) to authenticated;

/**
 * delete_story_event: deletes one of the caller's events, after the screen's second, confirming
 * click (S1-E17-20).
 * Input: event_id. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_story_event(event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.story_events;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your timeline.' using errcode = 'insufficient_privilege';
  end if;
  target_event := public.my_story_event(event_id);
  if target_event.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  delete from public.story_events where story_events.id = target_event.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_story_event(uuid) is
  'Deletes one of the caller''s timeline events (S1-E17-20).';
revoke execute on function public.delete_story_event(uuid) from public, anon;
grant execute on function public.delete_story_event(uuid) to authenticated;
