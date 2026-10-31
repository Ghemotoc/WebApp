/*
 * Migration: chapter planning in Story Atlas (stories S1-E17-23 to S1-E17-26 and the "Appears
 * in" half of S1-E17-12; docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part e).
 *
 * What it adds:
 * - chapter_plans: one private planning row beside every chapter (S1-E17-24): its type
 *   (chapter, prologue, interlude, epilogue), planning status, point of view, act, word target,
 *   in-world date and sort value, location and summary. A trigger makes the row with each new
 *   chapter, and a backfill gives every chapter made before it one. The planning lives in its own
 *   table, not in columns on chapters, because readers may read a published chapter's row: what
 *   sits here is never readable by anyone but the writer (S1-E17-24: "none of them shows to
 *   readers").
 * - chapter_plan_characters: the characters present in a chapter (the toggle chips).
 * - chapter_scenes: the scenes inside a chapter (S1-E17-25), in the writer's order.
 * - chapter_plan() and story_chapter_progress() to read them, and the functions to change the
 *   plan, mark a character present and add, change, move and delete scenes.
 * - character_appearances(): the chapters a character is the point of view of or is present in,
 *   for "Appears in" on the sheet (S1-E17-12).
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer reads or changes any of it.
 * Personal data: the writer's own planning notes, read only by them; no new processor.
 * Who calls it: src/features/atlas/api/chapterPlans.ts.
 * Tests: supabase/tests/database/194-chapter-plans.test.sql.
 */

/* ---------- Chapter plans ---------- */

create table public.chapter_plans (
  -- One plan per chapter; it goes when the chapter is purged.
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- S1-E17-24: Chapter, Prologue, Interlude or Epilogue.
  kind text not null default 'chapter',
  -- Where the writer is with it, from an idea to done.
  planning_status text not null default 'idea',
  -- The point-of-view character; cleared when that character is deleted.
  pov_character_id uuid references public.story_characters (id) on delete set null,
  -- The act it belongs to (the plan's acts, S1-E17-01); cleared when that act goes.
  act_id uuid references public.story_plan_acts (id) on delete set null,
  -- Words the writer aims for in this chapter; null for no target.
  word_target integer,
  -- The in-world date as the writer writes it ("Spring, year 3"), and a number to sort by.
  world_date text not null default '',
  world_sort numeric,
  location text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_plans_kind_known check (kind in ('chapter', 'prologue', 'interlude', 'epilogue')),
  constraint chapter_plans_planning_status_known check (
    planning_status in ('idea', 'outlined', 'drafting', 'revising', 'done')
  ),
  constraint chapter_plans_word_target_range check (word_target is null or word_target between 1 and 1000000),
  constraint chapter_plans_world_date_length check (char_length(world_date) <= 80),
  constraint chapter_plans_location_length check (char_length(location) <= 200),
  constraint chapter_plans_summary_length check (char_length(summary) <= 5000)
);

comment on table public.chapter_plans is
  'kind: user_content; reportable: story
The private planning beside each chapter (S1-E17-24). Only the writer reads it; readers never see it.';
comment on column public.chapter_plans.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index chapter_plans_story_id_idx on public.chapter_plans (story_id);
create index chapter_plans_pov_character_id_idx on public.chapter_plans (pov_character_id);
create index chapter_plans_act_id_idx on public.chapter_plans (act_id);

create trigger chapter_plans_set_updated_at
  before update on public.chapter_plans
  for each row execute function public.set_updated_at();

create trigger chapter_plans_refuse_user_id_change
  before update on public.chapter_plans
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.chapter_plans enable row level security;

-- The writer reads their own plans; every write goes through the functions below.
grant select on public.chapter_plans to authenticated;

/**
 * chapter_plans_select_own: the writer reads the planning of their own chapters. Nobody else,
 * readers and staff included, reads it through the app (S1-E17-24, private by default).
 */
create policy chapter_plans_select_own
  on public.chapter_plans for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy chapter_plans_select_own on public.chapter_plans is
  'Allows a writer to read the planning of their own chapters, and nobody else (S1-E17-24).';

/* ---------- Characters present ---------- */

create table public.chapter_plan_characters (
  chapter_id uuid not null references public.chapter_plans (chapter_id) on delete cascade,
  -- Deleting a character takes it off every chapter.
  character_id uuid not null references public.story_characters (id) on delete cascade,
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (chapter_id, character_id)
);

comment on table public.chapter_plan_characters is
  'kind: user_content; reportable: story
The characters present in a chapter (S1-E17-24, the toggle chips). Only the writer reads them.';
comment on column public.chapter_plan_characters.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index chapter_plan_characters_character_id_idx on public.chapter_plan_characters (character_id);
create index chapter_plan_characters_story_id_idx on public.chapter_plan_characters (story_id);

create trigger chapter_plan_characters_refuse_user_id_change
  before update on public.chapter_plan_characters
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.chapter_plan_characters enable row level security;

grant select on public.chapter_plan_characters to authenticated;

/**
 * chapter_plan_characters_select_own: the writer reads who is present in their own chapters.
 * Nobody else reads it through the app (private by default).
 */
create policy chapter_plan_characters_select_own
  on public.chapter_plan_characters for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy chapter_plan_characters_select_own on public.chapter_plan_characters is
  'Allows a writer to read the characters present in their own chapters, and nobody else (S1-E17-24).';

/* ---------- Scenes ---------- */

create table public.chapter_scenes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapter_plans (chapter_id) on delete cascade,
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 1, 2, 3 …: the scene's place in its chapter.
  position integer not null,
  title text not null,
  pov_character_id uuid references public.story_characters (id) on delete set null,
  status text not null default 'idea',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_scenes_position_counts_from_one check (position >= 1),
  constraint chapter_scenes_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint chapter_scenes_status_known check (status in ('idea', 'outlined', 'drafting', 'revising', 'done')),
  constraint chapter_scenes_summary_length check (char_length(summary) <= 5000),
  -- Checked at the end of the transaction, so a move can shift the others first.
  constraint chapter_scenes_one_per_place unique (chapter_id, position) deferrable initially deferred
);

comment on table public.chapter_scenes is
  'kind: user_content; reportable: story
The scenes inside a chapter (S1-E17-25), in the writer''s order. Only the writer reads them.';
comment on column public.chapter_scenes.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index chapter_scenes_story_id_idx on public.chapter_scenes (story_id);
create index chapter_scenes_pov_character_id_idx on public.chapter_scenes (pov_character_id);

create trigger chapter_scenes_set_updated_at
  before update on public.chapter_scenes
  for each row execute function public.set_updated_at();

create trigger chapter_scenes_refuse_user_id_change
  before update on public.chapter_scenes
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.chapter_scenes enable row level security;

grant select on public.chapter_scenes to authenticated;

/**
 * chapter_scenes_select_own: the writer reads the scenes of their own chapters. Nobody else reads
 * them through the app (private by default).
 */
create policy chapter_scenes_select_own
  on public.chapter_scenes for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy chapter_scenes_select_own on public.chapter_scenes is
  'Allows a writer to read the scenes of their own chapters, and nobody else (S1-E17-25).';

/* ---------- Every chapter gets its plan ---------- */

/**
 * make_chapter_plan: gives a new chapter its empty planning row (S1-E17-24: "a planned chapter …
 * is an ordinary draft chapter"; the plan sits beside it).
 * Returns: the new chapter row, unchanged. Called by the trigger on chapters.
 */
create or replace function public.make_chapter_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.chapter_plans (chapter_id, story_id, user_id)
  values (new.id, new.story_id, new.user_id)
  on conflict (chapter_id) do nothing;
  return new;
end;
$$;

comment on function public.make_chapter_plan() is
  'Trigger: makes a new chapter''s empty planning row (S1-E17-24).';
revoke execute on function public.make_chapter_plan() from public, anon, authenticated;

create trigger chapters_make_chapter_plan
  after insert on public.chapters
  for each row execute function public.make_chapter_plan();

-- The chapters written before chapter planning: each gets its empty plan now.
insert into public.chapter_plans (chapter_id, story_id, user_id)
select chapters.id, chapters.story_id, chapters.user_id from public.chapters
on conflict (chapter_id) do nothing;

/* ---------- Checks and finding the caller's rows ---------- */

/**
 * my_chapter_plan: the plan of one of the caller's live chapters, in a story of theirs that isn't
 * deleted. Input: the chapter's code. Returns: the row, or nulls.
 * Internal: the chapter planning functions.
 */
create or replace function public.my_chapter_plan(chapter_code text)
returns public.chapter_plans
language sql
stable
security definer
set search_path = ''
as $$
  select chapter_plans.* from public.chapter_plans
  join public.chapters on chapters.id = chapter_plans.chapter_id
  join public.stories on stories.id = chapters.story_id
  where chapters.code = chapter_code
    and chapter_plans.user_id = (select auth.uid())
    and chapters.deleted_at is null
    and stories.deleted_at is null;
$$;

comment on function public.my_chapter_plan(text) is
  'Internal: the plan of one of the caller''s live chapters (S1-E17-24).';
revoke execute on function public.my_chapter_plan(text) from public, anon, authenticated;

/**
 * my_chapter_scene: one of the caller's scenes, in a live chapter of a live story of theirs.
 * Returns: the row, or nulls. Internal: the scene functions.
 */
create or replace function public.my_chapter_scene(target_scene_id uuid)
returns public.chapter_scenes
language sql
stable
security definer
set search_path = ''
as $$
  select chapter_scenes.* from public.chapter_scenes
  join public.chapters on chapters.id = chapter_scenes.chapter_id
  join public.stories on stories.id = chapters.story_id
  where chapter_scenes.id = target_scene_id
    and chapter_scenes.user_id = (select auth.uid())
    and chapters.deleted_at is null
    and stories.deleted_at is null;
$$;

comment on function public.my_chapter_scene(uuid) is
  'Internal: one of the caller''s scenes, in a live chapter of theirs (S1-E17-25).';
revoke execute on function public.my_chapter_scene(uuid) from public, anon, authenticated;

/**
 * character_of_story: the ID of a character of this story, for a point of view ('' means none).
 * Inputs: the story's ID and the character's ID as text. Returns: the ID, or null for ''.
 * Errors: check_violation with hint other_story for a character that isn't one of the story's.
 * Internal: update_chapter_plan(), set_chapter_character_present() and update_chapter_scene().
 */
create or replace function public.character_of_story(target_story_id uuid, character_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_id uuid;
begin
  if coalesce(character_id, '') = '' then
    return null;
  end if;
  select story_characters.id into found_id from public.story_characters
  where story_characters.story_id = target_story_id and story_characters.id::text = character_id;
  if found_id is null then
    raise exception 'That character isn''t in this story.' using errcode = 'check_violation', hint = 'other_story';
  end if;
  return found_id;
end;
$$;

comment on function public.character_of_story(uuid, text) is
  'Internal: a character of this story by its ID, or null for none (S1-E17-24, S1-E17-25).';
revoke execute on function public.character_of_story(uuid, text) from public, anon, authenticated;

/**
 * act_of_story: the ID of one of the plan's acts ('' means none).
 * Inputs: the story's ID and the act's ID as text. Returns: the ID, or null for ''.
 * Errors: check_violation with hint other_story for an act that isn't one of the story's.
 * Internal: update_chapter_plan().
 */
create or replace function public.act_of_story(target_story_id uuid, act_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_id uuid;
begin
  if coalesce(act_id, '') = '' then
    return null;
  end if;
  select story_plan_acts.id into found_id from public.story_plan_acts
  where story_plan_acts.story_id = target_story_id and story_plan_acts.id::text = act_id;
  if found_id is null then
    raise exception 'That act isn''t in this story.' using errcode = 'check_violation', hint = 'other_story';
  end if;
  return found_id;
end;
$$;

comment on function public.act_of_story(uuid, text) is
  'Internal: one of the story''s acts by its ID, or null for none (S1-E17-24).';
revoke execute on function public.act_of_story(uuid, text) from public, anon, authenticated;

/**
 * plan_text: a planning text as stored: ş and ţ corrected and the ends trimmed (rule 4).
 * Input: the text, or null. Returns: the clean text, '' for null. Internal: the functions below.
 */
create or replace function public.plan_text(raw_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(public.normalise_romanian_letters(coalesce(raw_text, '')));
$$;

comment on function public.plan_text(text) is
  'Internal: a planning text with ş/ţ corrected and the ends trimmed (S1-E17-24).';
revoke execute on function public.plan_text(text) from public, anon, authenticated;

/* ---------- Reading ---------- */

/**
 * chapter_scenes_json: a chapter's scenes in order, for chapter_plan().
 * Input: the chapter's ID. Returns: [{ id, position, title, pov_character_id, status, summary }].
 * Internal: chapter_plan() calls it after checking the chapter is the caller's.
 */
create or replace function public.chapter_scenes_json(target_chapter_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', scenes.id, 'position', scenes.position, 'title', scenes.title,
      'pov_character_id', scenes.pov_character_id, 'status', scenes.status, 'summary', scenes.summary)
    order by scenes.position), '[]'::jsonb)
  from public.chapter_scenes as scenes where scenes.chapter_id = target_chapter_id;
$$;

comment on function public.chapter_scenes_json(uuid) is
  'Internal: a chapter''s scenes in order (S1-E17-25).';
revoke execute on function public.chapter_scenes_json(uuid) from public, anon, authenticated;

/**
 * chapter_plan: the planning of one of the caller's chapters, with what its pickers offer
 * (S1-E17-24 and S1-E17-25).
 * Input: the chapter's code.
 * Returns: { outcome: 'ok', plan: { kind, planning_status, pov_character_id, act_id,
 *   word_target, world_date, world_sort, location, summary, updated_at }, present: [character
 *   IDs], scenes: [...], characters: [{ id, name }], acts: [{ id, name, position }] }, or
 *   { outcome: 'not_found' }. Never a user ID (rule 15).
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/chapterPlans.ts (the planning panel in the editor).
 */
create or replace function public.chapter_plan(chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_plan public.chapter_plans;
begin
  -- Step 1: a signed-in writer and their own live chapter.
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_plan := public.my_chapter_plan(chapter_code);
  if target_plan.chapter_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the plan, who is present, the scenes and the story's characters and acts.
  return jsonb_build_object(
    'outcome', 'ok',
    'plan', jsonb_build_object(
      'kind', target_plan.kind, 'planning_status', target_plan.planning_status,
      'pov_character_id', target_plan.pov_character_id, 'act_id', target_plan.act_id,
      'word_target', target_plan.word_target, 'world_date', target_plan.world_date,
      'world_sort', target_plan.world_sort, 'location', target_plan.location,
      'summary', target_plan.summary, 'updated_at', target_plan.updated_at),
    'present', coalesce((select jsonb_agg(present.character_id)
      from public.chapter_plan_characters as present
      where present.chapter_id = target_plan.chapter_id), '[]'::jsonb),
    'scenes', public.chapter_scenes_json(target_plan.chapter_id),
    'characters', coalesce((select jsonb_agg(jsonb_build_object('id', cast_member.id, 'name', cast_member.name)
        order by lower(cast_member.name), cast_member.created_at)
      from public.story_characters as cast_member where cast_member.story_id = target_plan.story_id), '[]'::jsonb),
    'acts', coalesce((select jsonb_agg(jsonb_build_object('id', acts.id, 'name', acts.name,
        'position', acts.position) order by acts.position)
      from public.story_plan_acts as acts where acts.story_id = target_plan.story_id), '[]'::jsonb));
end;
$$;

comment on function public.chapter_plan(text) is
  'The planning of one of the caller''s chapters, with its scenes and the story''s characters and acts (S1-E17-24).';
revoke execute on function public.chapter_plan(text) from public, anon;
grant execute on function public.chapter_plan(text) to authenticated;

/**
 * story_chapter_progress: the chapter list beside the writing view, with each chapter's words
 * against its target (S1-E17-23 and S1-E17-26).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', chapters: [{ code, position, title, status, kind, word_count,
 *   word_target }] } in reading order, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/chapterPlans.ts.
 */
create or replace function public.story_chapter_progress(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your chapters.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- The writer's own titles and word counts (the draft), never readers' numbers.
  return jsonb_build_object('outcome', 'ok', 'chapters', coalesce((
    select jsonb_agg(jsonb_build_object(
        'code', chapters.code, 'position', chapters.position, 'title', chapters.draft_title,
        'status', chapters.status, 'kind', coalesce(plans.kind, 'chapter'),
        'word_count', chapters.word_count, 'word_target', plans.word_target)
      order by chapters.position)
    from public.chapters
    left join public.chapter_plans as plans on plans.chapter_id = chapters.id
    where chapters.story_id = target_story_id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;

comment on function public.story_chapter_progress(text) is
  'The caller''s chapters of one story with words against each target (S1-E17-23, S1-E17-26).';
revoke execute on function public.story_chapter_progress(text) from public, anon;
grant execute on function public.story_chapter_progress(text) to authenticated;

/**
 * character_appearances: the chapters a character of the caller's is in, as the point of view or
 * marked present (S1-E17-12: "Appears in").
 * Input: the character's ID.
 * Returns: { outcome: 'ok', chapters: [{ code, position, title, is_pov, is_present }] } in
 *   reading order, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/chapterPlans.ts (the character sheet).
 */
create or replace function public.character_appearances(character_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok', 'chapters', coalesce((
    select jsonb_agg(jsonb_build_object(
        'code', chapters.code, 'position', chapters.position, 'title', chapters.draft_title,
        'is_pov', plans.pov_character_id is not distinct from target_character.id,
        'is_present', exists (select 1 from public.chapter_plan_characters as present
          where present.chapter_id = plans.chapter_id and present.character_id = target_character.id))
      order by chapters.position)
    from public.chapter_plans as plans
    join public.chapters on chapters.id = plans.chapter_id
    where plans.story_id = target_character.story_id
      and chapters.deleted_at is null
      and (plans.pov_character_id = target_character.id
        or exists (select 1 from public.chapter_plan_characters as present
          where present.chapter_id = plans.chapter_id and present.character_id = target_character.id))
  ), '[]'::jsonb));
end;
$$;

comment on function public.character_appearances(uuid) is
  'The chapters one of the caller''s characters is the point of view of or present in (S1-E17-12).';
revoke execute on function public.character_appearances(uuid) from public, anon;
grant execute on function public.character_appearances(uuid) to authenticated;

/* ---------- Changing the plan (S1-E17-24) ---------- */

/**
 * update_chapter_plan: changes the planning of one of the caller's chapters; each field saves by
 * itself.
 * Inputs: chapter_code; changes, an object with any of kind, planning_status, pov_character_id
 *   and act_id ('' clears them), word_target and world_sort (null clears them), world_date,
 *   location and summary.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change for a
 *   key it doesn't know, other_story for a character or act of another story, bad_number for a
 *   target or sort value that isn't a number, and from the table's checks.
 */
create or replace function public.update_chapter_plan(chapter_code text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan public.chapter_plans;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer, their own chapter and only known changes.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_plan := public.my_chapter_plan(chapter_code);
  if target_plan.chapter_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('kind', 'planning_status', 'pov_character_id', 'act_id', 'word_target',
                                      'world_date', 'world_sort', 'location', 'summary')) then
    raise exception 'Unknown change to a chapter plan.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  -- Step 2: numbers must be numbers (or null, which clears them).
  if (changes ? 'word_target' and jsonb_typeof(changes -> 'word_target') not in ('number', 'null'))
     or (changes ? 'world_sort' and jsonb_typeof(changes -> 'world_sort') not in ('number', 'null')) then
    raise exception 'A target or sort value is a number.' using errcode = 'check_violation', hint = 'bad_number';
  end if;
  -- Step 3: change only what was given; the helpers and the table's checks refuse the rest.
  update public.chapter_plans set
    kind = case when changes ? 'kind' then changes ->> 'kind' else kind end,
    planning_status = case when changes ? 'planning_status' then changes ->> 'planning_status' else planning_status end,
    pov_character_id = case when changes ? 'pov_character_id'
      then public.character_of_story(target_plan.story_id, changes ->> 'pov_character_id') else pov_character_id end,
    act_id = case when changes ? 'act_id' then public.act_of_story(target_plan.story_id, changes ->> 'act_id') else act_id end,
    word_target = case when changes ? 'word_target' then (changes ->> 'word_target')::numeric::integer else word_target end,
    world_date = case when changes ? 'world_date' then public.plan_text(changes ->> 'world_date') else world_date end,
    world_sort = case when changes ? 'world_sort' then (changes ->> 'world_sort')::numeric else world_sort end,
    location = case when changes ? 'location' then public.plan_text(changes ->> 'location') else location end,
    summary = case when changes ? 'summary' then public.plan_text(changes ->> 'summary') else summary end
  where chapter_plans.chapter_id = target_plan.chapter_id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_chapter_plan(text, jsonb) is
  'Changes the planning of one of the caller''s chapters (S1-E17-24).';
revoke execute on function public.update_chapter_plan(text, jsonb) from public, anon;
grant execute on function public.update_chapter_plan(text, jsonb) to authenticated;

/**
 * set_chapter_character_present: marks a character present in one of the caller's chapters, or
 * not (S1-E17-24's toggle chips).
 * Inputs: chapter_code; character_id; is_present.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint other_story for a
 *   character of another story.
 */
create or replace function public.set_chapter_character_present(
  chapter_code text,
  character_id uuid,
  is_present boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan public.chapter_plans;
  present_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_plan := public.my_chapter_plan(chapter_code);
  if target_plan.chapter_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  present_id := public.character_of_story(target_plan.story_id, coalesce(character_id::text, '-'));
  if is_present then
    insert into public.chapter_plan_characters (chapter_id, character_id, story_id, user_id)
    values (target_plan.chapter_id, present_id, target_plan.story_id, target_plan.user_id)
    on conflict on constraint chapter_plan_characters_pkey do nothing;
  else
    delete from public.chapter_plan_characters
    where chapter_plan_characters.chapter_id = target_plan.chapter_id
      and chapter_plan_characters.character_id = present_id;
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_chapter_character_present(text, uuid, boolean) is
  'Marks one of the story''s characters present in one of the caller''s chapters, or not (S1-E17-24).';
revoke execute on function public.set_chapter_character_present(text, uuid, boolean) from public, anon;
grant execute on function public.set_chapter_character_present(text, uuid, boolean) to authenticated;

/* ---------- Scenes (S1-E17-25) ---------- */

/**
 * add_chapter_scene: adds a scene at the end of one of the caller's chapters.
 * Inputs: chapter_code; scene_title (1 to 200 characters).
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty or over-long
 *   title, and with hint too_many_scenes past 100 in one chapter (a bound).
 */
create or replace function public.add_chapter_scene(chapter_code text, scene_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan public.chapter_plans;
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_plan := public.my_chapter_plan(chapter_code);
  if target_plan.chapter_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if (select count(*) from public.chapter_scenes where chapter_id = target_plan.chapter_id) >= 100 then
    raise exception 'A chapter can hold at most 100 scenes.' using errcode = 'check_violation', hint = 'too_many_scenes';
  end if;
  insert into public.chapter_scenes (chapter_id, story_id, user_id, position, title)
  select target_plan.chapter_id, target_plan.story_id, target_plan.user_id, coalesce(max(position), 0) + 1,
    public.plan_text(scene_title)
  from public.chapter_scenes where chapter_id = target_plan.chapter_id
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_chapter_scene(text, text) is
  'Adds a scene at the end of one of the caller''s chapters (S1-E17-25).';
revoke execute on function public.add_chapter_scene(text, text) from public, anon;
grant execute on function public.add_chapter_scene(text, text) to authenticated;

/**
 * update_chapter_scene: changes one of the caller's scenes; each field saves by itself.
 * Inputs: scene_id; changes, an object with any of title, pov_character_id ('' clears it),
 *   status and summary.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change for a
 *   key it doesn't know, other_story for a character of another story, and from the checks.
 */
create or replace function public.update_chapter_scene(scene_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_scene public.chapter_scenes;
  saved_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_scene := public.my_chapter_scene(scene_id);
  if target_scene.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('title', 'pov_character_id', 'status', 'summary')) then
    raise exception 'Unknown change to a scene.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  update public.chapter_scenes set
    title = case when changes ? 'title' then public.plan_text(changes ->> 'title') else title end,
    pov_character_id = case when changes ? 'pov_character_id'
      then public.character_of_story(target_scene.story_id, changes ->> 'pov_character_id') else pov_character_id end,
    status = case when changes ? 'status' then changes ->> 'status' else status end,
    summary = case when changes ? 'summary' then public.plan_text(changes ->> 'summary') else summary end
  where chapter_scenes.id = target_scene.id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_chapter_scene(uuid, jsonb) is
  'Changes one of the caller''s scenes: title, point of view, status or summary (S1-E17-25).';
revoke execute on function public.update_chapter_scene(uuid, jsonb) from public, anon;
grant execute on function public.update_chapter_scene(uuid, jsonb) to authenticated;

/**
 * move_chapter_scene: puts one of the caller's scenes at a new place in its chapter, shifting the
 * ones in between (S1-E17-25: reordering with buttons).
 * Inputs: scene_id; new_position (from 1; beyond the last means last).
 * Returns: { outcome: 'ok', position } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.move_chapter_scene(scene_id uuid, new_position integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_scene public.chapter_scenes;
  last_position integer;
  goal integer;
begin
  -- Step 1: a signed-in writer and their own scene.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_scene := public.my_chapter_scene(scene_id);
  if target_scene.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the goal, kept between the first and the last place.
  select max(position) into last_position from public.chapter_scenes where chapter_id = target_scene.chapter_id;
  goal := greatest(1, least(coalesce(new_position, target_scene.position), last_position));
  -- Step 3: the scenes in between move one place towards the gap, then this one takes the goal.
  if goal < target_scene.position then
    update public.chapter_scenes set position = position + 1
    where chapter_id = target_scene.chapter_id and position >= goal and position < target_scene.position;
  elsif goal > target_scene.position then
    update public.chapter_scenes set position = position - 1
    where chapter_id = target_scene.chapter_id and position <= goal and position > target_scene.position;
  end if;
  update public.chapter_scenes set position = goal where chapter_scenes.id = target_scene.id;
  return jsonb_build_object('outcome', 'ok', 'position', goal);
end;
$$;

comment on function public.move_chapter_scene(uuid, integer) is
  'Moves one of the caller''s scenes to a new place in its chapter, shifting the others (S1-E17-25).';
revoke execute on function public.move_chapter_scene(uuid, integer) from public, anon;
grant execute on function public.move_chapter_scene(uuid, integer) to authenticated;

/**
 * delete_chapter_scene: deletes one of the caller's scenes, after the screen's second, confirming
 * click (S1-E17-25). The scenes after it move up one place.
 * Input: scene_id. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_chapter_scene(scene_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_scene public.chapter_scenes;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your chapter plan.' using errcode = 'insufficient_privilege';
  end if;
  target_scene := public.my_chapter_scene(scene_id);
  if target_scene.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  delete from public.chapter_scenes where chapter_scenes.id = target_scene.id;
  -- Close the gap it leaves.
  update public.chapter_scenes set position = position - 1
  where chapter_id = target_scene.chapter_id and position > target_scene.position;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_chapter_scene(uuid) is
  'Deletes one of the caller''s scenes (S1-E17-25).';
revoke execute on function public.delete_chapter_scene(uuid) from public, anon;
grant execute on function public.delete_chapter_scene(uuid) to authenticated;
