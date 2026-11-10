/**
 * GAPS-2b: a writer adds details of their own to a story's marketing notes.
 *
 * Why: the liquid glass board AtlasMarketing draws "Add detail" under the launch notes, in
 * "Getting it out". Until now the Marketing page held five fixed notes (story S1-E17-29) and
 * nothing a writer could add ("Newsletter", "Reading dates", "Agents to query"). Robert, 10 Nov
 * 2026: where a board asks for something the data does not support, create the data.
 *
 * What changes:
 *   story_marketing.own_details     new: the writer's own details, a list of { id, name, text }
 *   add_marketing_detail()          new: adds a detail with a name
 *   update_marketing_detail()       new: changes a detail's name or text
 *   delete_marketing_detail()       new: removes a detail
 *   story_marketing()               also returns own_details
 *   story_search_texts()            searches the details too, one result each
 *
 * No new table and no new policy: the column sits on story_marketing, which only its writer
 * reads (story_marketing_select_own) and only these functions write. Being a column of a table
 * already registered, it is in "Download my data" and goes with the account like the other notes.
 */

/* ---------- Where the details live ---------- */

alter table public.story_marketing
  add column own_details jsonb not null default '[]'::jsonb,
  -- A list, and a short one: 12 details, so the page stays one page (builder's choice).
  add constraint story_marketing_own_details_list
    check (jsonb_typeof(own_details) = 'array' and jsonb_array_length(own_details) <= 12);

comment on column public.story_marketing.own_details is
  'kind: user_content. The writer''s own marketing details, in the order added: a list of { id, name (1 to 80 characters), text (up to 5,000) }; at most 12 (GAPS-2b).';

/* ---------- Add a detail ---------- */

/**
 * add_marketing_detail: adds one of the writer's own details to a story's marketing notes, after
 * the others, with no text yet.
 *
 * Inputs: the story's address and the detail's name.
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' } for a story that isn't the caller's.
 * Errors: insufficient_privilege when signed out; check_violation with hint name_length (an empty
 *   name or one over 80 characters), name_taken (the story has a detail with that name, capitals
 *   aside) or too_many_details (12 in a story).
 * Where it fits: "Add detail" in "Getting it out" on the Marketing page
 *   (useStoryMarketing.addDetail).
 */
create function public.add_marketing_detail(story_slug text, detail_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  clean_name text := public.plan_text(detail_name);
  current_details jsonb;
  new_id uuid := gen_random_uuid();
begin
  -- Step 1: a signed-in writer and their own planned story.
  if caller_id is null then
    raise exception 'Sign in to add a detail.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: a real name.
  if char_length(clean_name) not between 1 and 80 then
    raise exception 'A detail''s name has 1 to 80 characters.'
      using errcode = 'check_violation', hint = 'name_length';
  end if;
  -- Step 3: the row, made empty on the first save, then the bound.
  insert into public.story_marketing (story_id, user_id) values (target_story_id, caller_id)
  on conflict (story_id) do nothing;
  -- The row is locked until this change ends: two presses of "Add" at the same moment wait for
  -- each other, so the checks below see the first one's detail (break test, 10 Nov 2026).
  select own_details into current_details from public.story_marketing
  where story_id = target_story_id for update;
  -- One name once, capitals aside, so two boxes never carry the same label.
  if exists (select 1 from jsonb_array_elements(current_details) as detail
             where lower(detail ->> 'name') = lower(clean_name)) then
    raise exception 'This story already has a marketing detail with that name.'
      using errcode = 'check_violation', hint = 'name_taken';
  end if;
  if jsonb_array_length(current_details) >= 12 then
    raise exception 'A story can hold at most 12 marketing details of your own.'
      using errcode = 'check_violation', hint = 'too_many_details';
  end if;
  -- Step 4: the detail, after the others.
  update public.story_marketing
  set own_details = own_details || jsonb_build_object('id', new_id, 'name', clean_name, 'text', '')
  where story_id = target_story_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_marketing_detail(text, text) is
  'Adds one of the caller''s own details to a story''s marketing notes (GAPS-2b; S1-E17-29).';

revoke all on function public.add_marketing_detail(text, text) from public;
grant execute on function public.add_marketing_detail(text, text) to authenticated;

/* ---------- Change a detail ---------- */

/**
 * update_marketing_detail: changes the name or the text of one of the writer's own marketing
 * details (each saves by itself, like the page's other fields).
 *
 * Inputs: the story's address, the detail's ID (as text) and the changes: { name } and/or
 *   { text }.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } for a story that isn't the caller's or a
 *   detail it doesn't have.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change (a key
 *   other than name and text), name_length (1 to 80 characters), name_taken (another detail of
 *   the story has that name, capitals aside; a detail may change its own capitals) or text_length
 *   (over 5,000).
 * Where it fits: the detail's boxes on the Marketing page (useStoryMarketing.saveDetail).
 */
create function public.update_marketing_detail(story_slug text, detail_id text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  current_details jsonb;
  new_name text := public.plan_text(changes ->> 'name');
  new_text text := public.plan_text(changes ->> 'text');
begin
  -- Step 1: a signed-in writer, their own planned story and one of its details.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a detail.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  -- (The row is locked until this change ends, so a rename and an add at the same moment can't
  -- both take one name.)
  select own_details into current_details from public.story_marketing
  where story_id = target_story_id for update;
  if current_details is null or not exists (
      select 1 from jsonb_array_elements(current_details) as detail where detail ->> 'id' = detail_id) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: only known changes, each within its length.
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('name', 'text')) then
    raise exception 'Unknown change to a marketing detail.'
      using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  if changes ? 'name' and char_length(new_name) not between 1 and 80 then
    raise exception 'A detail''s name has 1 to 80 characters.'
      using errcode = 'check_violation', hint = 'name_length';
  end if;
  if changes ? 'name' and exists (
      select 1 from jsonb_array_elements(current_details) as detail
      where detail ->> 'id' <> detail_id and lower(detail ->> 'name') = lower(new_name)) then
    raise exception 'This story already has a marketing detail with that name.'
      using errcode = 'check_violation', hint = 'name_taken';
  end if;
  if changes ? 'text' and char_length(new_text) > 5000 then
    raise exception 'A detail holds at most 5,000 characters.'
      using errcode = 'check_violation', hint = 'text_length';
  end if;
  -- Step 3: the list again, in the same order, with this detail changed.
  update public.story_marketing
  set own_details = (
    select jsonb_agg(
      case when detail ->> 'id' = detail_id then
        detail
          || case when changes ? 'name' then jsonb_build_object('name', new_name) else '{}'::jsonb end
          || case when changes ? 'text' then jsonb_build_object('text', new_text) else '{}'::jsonb end
      else detail end
      order by place)
    from jsonb_array_elements(current_details) with ordinality as listed(detail, place))
  where story_id = target_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.update_marketing_detail(text, text, jsonb) is
  'Changes the name or text of one of the caller''s own marketing details (GAPS-2b; S1-E17-29).';

revoke all on function public.update_marketing_detail(text, text, jsonb) from public;
grant execute on function public.update_marketing_detail(text, text, jsonb) to authenticated;

/* ---------- Delete a detail ---------- */

/**
 * delete_marketing_detail: removes one of the writer's own marketing details, with its text.
 *
 * Inputs: the story's address and the detail's ID (as text).
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } for a story that isn't the caller's or a
 *   detail it doesn't have.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Delete detail" on the Marketing page (useStoryMarketing.deleteDetail); the
 *   screen asks first.
 */
create function public.delete_marketing_detail(story_slug text, detail_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  current_details jsonb;
begin
  -- Step 1: a signed-in writer, their own planned story and one of its details.
  if (select auth.uid()) is null then
    raise exception 'Sign in to delete a detail.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  select own_details into current_details from public.story_marketing
  where story_id = target_story_id;
  if current_details is null or not exists (
      select 1 from jsonb_array_elements(current_details) as detail where detail ->> 'id' = detail_id) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the list again, in the same order, without this detail.
  update public.story_marketing
  set own_details = coalesce((
    select jsonb_agg(detail order by place)
    from jsonb_array_elements(current_details) with ordinality as listed(detail, place)
    where detail ->> 'id' <> detail_id), '[]'::jsonb)
  where story_id = target_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_marketing_detail(text, text) is
  'Deletes one of the caller''s own marketing details (GAPS-2b; S1-E17-29).';

revoke all on function public.delete_marketing_detail(text, text) from public;
grant execute on function public.delete_marketing_detail(text, text) to authenticated;

/* ---------- The notes carry the details ---------- */

/**
 * story_marketing: as in S1-E17-29 (the caller's five marketing notes on one story, empty before
 * the first save), and now also own_details, the writer's own details in the order added
 * (GAPS-2b).
 *
 * Inputs: the story's address. Returns: { outcome: 'ok', notes, own_details } or
 *   { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: the Marketing page (useStoryMarketing).
 */
create or replace function public.story_marketing(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  notes public.story_marketing;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your marketing notes.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into notes from public.story_marketing where story_marketing.story_id = target_story_id;
  return jsonb_build_object('outcome', 'ok',
    'notes', jsonb_build_object(
      'back_cover_blurb', coalesce(notes.back_cover_blurb, ''),
      'comparable_titles', coalesce(notes.comparable_titles, ''),
      'hooks_keywords', coalesce(notes.hooks_keywords, ''),
      'query_pitch', coalesce(notes.query_pitch, ''),
      'launch_notes', coalesce(notes.launch_notes, '')),
    'own_details', coalesce(notes.own_details, '[]'::jsonb));
end;
$$;

/* ---------- Search finds the details ---------- */

/**
 * story_search_texts: as in S1-E17-30 (every searchable text of one story: characters, bible
 * entries, chapters, scenes, ideas, events and marketing notes), and now the writer's own
 * marketing details too, one result each (GAPS-2b). The list of own details is no longer read as
 * a note of its own.
 *
 * Inputs: the story's ID. Returns: one row per thing: its kind, its reference, its title, its
 *   chapter (scenes only) and the text to search.
 * Errors: none. Internal: only the search functions call it.
 */
create or replace function public.story_search_texts(target_story_id uuid)
returns table (kind text, ref text, title text, chapter text, haystack text)
language sql
stable
security definer
set search_path = ''
as $$
  -- Characters: the name, every sheet field and the writer's own fields (S1-E17-30).
  select 'character', cast_member.id::text, cast_member.name, null::text,
    concat_ws(' ', cast_member.name, public.jsonb_values_text(cast_member.sheet),
      public.jsonb_values_text(cast_member.custom_values))
  from public.story_characters as cast_member where cast_member.story_id = target_story_id
  union all
  -- Bible entries: the title, the tags and the text.
  select 'entry', entries.id::text, entries.title, null,
    concat_ws(' ', entries.title, array_to_string(entries.tags, ' '), entries.body)
  from public.story_bible_entries as entries where entries.story_id = target_story_id
  union all
  -- Chapters: the title and the manuscript, then the plan's place, date and summary.
  select 'chapter', chapters.code, chapters.draft_title, null,
    concat_ws(' ', chapters.draft_title, chapters.draft_body, plans.location, plans.world_date,
      plans.summary)
  from public.chapters
  left join public.chapter_plans as plans on plans.chapter_id = chapters.id
  where chapters.story_id = target_story_id and chapters.deleted_at is null
  union all
  -- Scenes: the title and summary, with their chapter so the result opens it.
  select 'scene', scenes.id::text, scenes.title, chapters.code,
    concat_ws(' ', scenes.title, scenes.summary)
  from public.chapter_scenes as scenes
  join public.chapters on chapters.id = scenes.chapter_id
  where scenes.story_id = target_story_id and chapters.deleted_at is null
  union all
  -- Questions and ideas: the line and its outcome.
  select 'idea', ideas.id::text, ideas.body, null, concat_ws(' ', ideas.body, ideas.outcome)
  from public.story_ideas as ideas where ideas.story_id = target_story_id
  union all
  -- Timeline events: the title, the date as shown and the description.
  select 'event', events.id::text, events.title, null,
    concat_ws(' ', events.title, events.display_date, events.description)
  from public.story_events as events where events.story_id = target_story_id
  union all
  -- Marketing notes: one result per field, named by the field.
  select 'marketing', notes.key, notes.key, null, notes.value
  from public.story_marketing as marketing,
    jsonb_each_text(to_jsonb(marketing)
      - array['story_id', 'user_id', 'created_at', 'updated_at', 'own_details']) as notes
  where marketing.story_id = target_story_id
  union all
  -- The writer's own marketing details (GAPS-2b): one result each, named by the detail's name;
  -- the ref is "detail-<id>", the detail's place on the Marketing page.
  select 'marketing', 'detail-' || (detail ->> 'id'), detail ->> 'name', null,
    concat_ws(' ', detail ->> 'name', detail ->> 'text')
  from public.story_marketing as marketing, jsonb_array_elements(marketing.own_details) as detail
  where marketing.story_id = target_story_id;
$$;
