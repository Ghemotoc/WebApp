/**
 * GAPS-2a: a writer adds, renames and deletes the acts of a story's plan.
 *
 * Why: the liquid glass board AtlasStoryline draws "Add act" beside the chapter board, and until
 * now a story only ever had the three acts its plan was made with (make_story_plan(): Act I to
 * III, story S1-E17-01); no function added, renamed or removed one. Robert, 10 Nov 2026: where a
 * board asks for something the data does not support, create the data.
 *
 * What changes:
 *   add_plan_act()      new: adds an act after the others
 *   rename_plan_act()   new: gives an act a new name
 *   delete_plan_act()   new: removes an act; its chapters stay in the book and move to "No act"
 *
 * No new table, column or policy: story_plan_acts stays readable only by its writer
 * (story_plan_acts_select_own) and is written only through these functions. No chapter's place
 * in the book changes, so readers see nothing different.
 */

/* ---------- Add an act ---------- */

/**
 * add_plan_act: adds an act to a story's plan, after the acts it has.
 *
 * Inputs: the story's address and the act's name.
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' } for a story that isn't the caller's.
 * Errors: insufficient_privilege when signed out; check_violation with hint too_many_acts (12
 *   acts in a story), and the table's own check for an empty or over-long name (1 to 80
 *   characters).
 * Where it fits: "Add act" on the Storyline page's chapter board (useStoryline.addAct).
 */
create function public.add_plan_act(story_slug text, act_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  new_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to add an act.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the bound. 12 acts, so the board stays readable (builder's choice, GAPS-2a).
  if (select count(*) from public.story_plan_acts where story_id = target_story_id) >= 12 then
    raise exception 'A story can hold at most 12 acts.'
      using errcode = 'check_violation', hint = 'too_many_acts';
  end if;
  -- Step 3: the act, after the others.
  insert into public.story_plan_acts (story_id, user_id, position, name)
  values (target_story_id, caller_id,
    coalesce((select max(position) from public.story_plan_acts where story_id = target_story_id), 0) + 1,
    btrim(act_name))
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_plan_act(text, text) is
  'Adds an act to the caller''s own story plan, after the acts it has (GAPS-2a; S1-E17-01).';

revoke all on function public.add_plan_act(text, text) from public;
grant execute on function public.add_plan_act(text, text) to authenticated;

/* ---------- Rename an act ---------- */

/**
 * rename_plan_act: gives one of a story's acts a new name.
 *
 * Inputs: the story's address, the act's ID (as text) and the new name.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } for a story that isn't the caller's or
 *   an act that story doesn't have.
 * Errors: insufficient_privilege when signed out; the table's own check for an empty or
 *   over-long name.
 * Where it fits: "Rename" on an act's column of the chapter board (useStoryline.renameAct).
 */
create function public.rename_plan_act(story_slug text, act_id text, act_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  target_act_id uuid;
begin
  -- Step 1: a signed-in writer, their own live story and one of its acts.
  if (select auth.uid()) is null then
    raise exception 'Sign in to rename an act.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  -- (Looked up here, not with act_of_story(), which raises for an act of another story; here
  -- such an act is simply not found.)
  select acts.id into target_act_id from public.story_plan_acts as acts
  where acts.story_id = target_story_id and acts.id::text = act_id;
  if target_story_id is null or target_act_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the new name.
  update public.story_plan_acts set name = btrim(act_name) where id = target_act_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.rename_plan_act(text, text, text) is
  'Renames one of the acts of the caller''s own story plan (GAPS-2a; S1-E17-01).';

revoke all on function public.rename_plan_act(text, text, text) from public;
grant execute on function public.rename_plan_act(text, text, text) to authenticated;

/* ---------- Delete an act ---------- */

/**
 * delete_plan_act: removes one of a story's acts. Its chapters are not deleted and keep their
 * place in the book: they move to "No act" (chapter_plans.act_id is set to null by its foreign
 * key).
 *
 * Inputs: the story's address and the act's ID (as text).
 * Returns: { outcome: 'ok', chapters_moved } (how many chapters went to "No act") or
 *   { outcome: 'not_found' } for a story that isn't the caller's or an act it doesn't have.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Delete act" on an act's column of the chapter board (useStoryline.deleteAct);
 *   the screen asks first.
 */
create function public.delete_plan_act(story_slug text, act_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  target_act_id uuid;
  moved integer;
begin
  -- Step 1: a signed-in writer, their own live story and one of its acts.
  if (select auth.uid()) is null then
    raise exception 'Sign in to delete an act.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  -- (Looked up here, not with act_of_story(), which raises for an act of another story; here
  -- such an act is simply not found.)
  select acts.id into target_act_id from public.story_plan_acts as acts
  where acts.story_id = target_story_id and acts.id::text = act_id;
  if target_story_id is null or target_act_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: how many chapters will move to "No act", for the screen's message.
  select count(*) into moved from public.chapter_plans where chapter_plans.act_id = target_act_id;
  -- Step 3: the act goes; the foreign key clears it from its chapters' plans.
  delete from public.story_plan_acts where id = target_act_id;
  return jsonb_build_object('outcome', 'ok', 'chapters_moved', moved);
end;
$$;

comment on function public.delete_plan_act(text, text) is
  'Deletes one of the acts of the caller''s own story plan; its chapters move to "No act" (GAPS-2a; S1-E17-01).';

revoke all on function public.delete_plan_act(text, text) from public;
grant execute on function public.delete_plan_act(text, text) to authenticated;
