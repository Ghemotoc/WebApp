-- G10c2 (bundle G10 ATLAS, part c2; board AtlasPov): the Narrator as a chapter's point of view.
--
-- What it is for: a chapter can be told by "the Narrator, outside the story" and not by one of the
-- cast. Until now the only choices were a character or nobody, so a story with a narrator showed
-- those chapters as "No point of view yet" on the board and left them off the POV lanes.
-- What changes:
-- - chapter_plans.pov_is_narrator (false by default), and a check that a chapter is told by a
--   character or by the Narrator, never both;
-- - update_chapter_plan() takes "pov_is_narrator" and keeps the two in step;
-- - chapter_plan() and storyline_chapters_json() return it.
-- Who can read and write it: nothing new. The column sits on chapter_plans, whose policies and
-- grants are unchanged (the writer reads their own rows; every write goes through
-- update_chapter_plan(), which checks the chapter is the caller's). Not personal data.
-- Scenes keep a character or nobody: the board asks for the Narrator on chapters only.
-- Tests: supabase/tests/database/321-atlas-narrator-pov.test.sql.

alter table public.chapter_plans
  add column pov_is_narrator boolean not null default false,
  add constraint chapter_plans_one_teller check (not (pov_is_narrator and pov_character_id is not null));

comment on column public.chapter_plans.pov_is_narrator is
  'True when the chapter is told by the Narrator, outside the story, and not by a character (G10c2).';

/**
 * update_chapter_plan: changes the planning of one of the caller's chapters (S1-E17-24), now with
 * the Narrator (G10c2).
 * Inputs: the chapter's code and the changes, any of kind, planning_status, pov_character_id,
 * pov_is_narrator, act_id, word_target, world_date, world_sort, location, summary.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an unknown change
 * (unknown_change), a number that isn't one (bad_number), a Narrator that isn't true or false
 * (bad_narrator), or a chapter told by both a character and the Narrator.
 * Where it fits: ChapterPlanBasics → useChapterPlan → updateChapterPlan() → here.
 */
CREATE OR REPLACE FUNCTION public.update_chapter_plan(chapter_code text, changes jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
             where change_key not in ('kind', 'planning_status', 'pov_character_id', 'pov_is_narrator', 'act_id',
                                      'word_target',
                                      'world_date', 'world_sort', 'location', 'summary')) then
    raise exception 'Unknown change to a chapter plan.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  -- Step 2: numbers must be numbers (or null, which clears them).
  if (changes ? 'word_target' and jsonb_typeof(changes -> 'word_target') not in ('number', 'null'))
     or (changes ? 'world_sort' and jsonb_typeof(changes -> 'world_sort') not in ('number', 'null')) then
    raise exception 'A target or sort value is a number.' using errcode = 'check_violation', hint = 'bad_number';
  end if;
  -- Step 2b (G10c2): the Narrator is yes or no, never anything else.
  if changes ? 'pov_is_narrator' and jsonb_typeof(changes -> 'pov_is_narrator') <> 'boolean' then
    raise exception 'The Narrator is true or false.' using errcode = 'check_violation', hint = 'bad_narrator';
  end if;
  -- Step 3: change only what was given; the helpers and the table's checks refuse the rest.
  update public.chapter_plans set
    kind = case when changes ? 'kind' then changes ->> 'kind' else kind end,
    planning_status = case when changes ? 'planning_status' then changes ->> 'planning_status' else planning_status end,
    -- One teller at a time (G10c2): picking a character takes the Narrator off, and picking the
    -- Narrator clears the character, unless the same call says otherwise (the table's check then
    -- refuses a chapter told by both).
    pov_character_id = case
      when changes ? 'pov_character_id'
        then public.character_of_story(target_plan.story_id, changes ->> 'pov_character_id')
      when (changes ->> 'pov_is_narrator')::boolean then null
      else pov_character_id end,
    pov_is_narrator = case
      when changes ? 'pov_is_narrator' then (changes ->> 'pov_is_narrator')::boolean
      when changes ->> 'pov_character_id' is not null then false
      else pov_is_narrator end,
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

/**
 * chapter_plan: one of the caller's chapters with its plan, who is present, its scenes and the
 * story's characters and acts (S1-E17-24); the plan now carries pov_is_narrator (G10c2).
 * Input: the chapter's code. Returns: { outcome: 'ok', plan, present, … } or 'not_found'.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: the writing view's plan panel → useChapterPlan → here.
 */
CREATE OR REPLACE FUNCTION public.chapter_plan(chapter_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
      'pov_character_id', target_plan.pov_character_id,
      'pov_is_narrator', target_plan.pov_is_narrator, 'act_id', target_plan.act_id,
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

/**
 * storyline_chapters_json: a story's chapters with their planning, for story_storyline()
 * (S1-E17-19); each now carries pov_is_narrator (G10c2).
 * Input: the story's ID. Returns: the chapters in book order.
 * Internal: story_storyline() calls it after checking the story is the caller's.
 */
CREATE OR REPLACE FUNCTION public.storyline_chapters_json(target_story_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', chapters.code, 'position', chapters.position, 'title', chapters.draft_title,
      'status', chapters.status, 'kind', coalesce(plans.kind, 'chapter'),
      'planning_status', coalesce(plans.planning_status, 'idea'),
      'pov_character_id', plans.pov_character_id,
      'pov_is_narrator', coalesce(plans.pov_is_narrator, false), 'act_id', plans.act_id,
      'word_count', chapters.word_count, 'word_target', plans.word_target,
      'world_date', coalesce(plans.world_date, ''), 'world_sort', plans.world_sort)
    order by chapters.position, chapters.created_at), '[]'::jsonb)
  from public.chapters
  left join public.chapter_plans as plans on plans.chapter_id = chapters.id
  where chapters.story_id = target_story_id and chapters.deleted_at is null;
$$;
