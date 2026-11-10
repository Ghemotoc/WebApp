/**
 * GAPS-1: a writer's own details sit where the writer puts them on a character sheet.
 *
 * Why: the liquid glass board AtlasCharacterSheet draws "Add detail" under each of the sheet's
 * four groups and "Add a group of details" under them. Until now a writer's own field (story
 * S1-E17-10) had no place: every one sat in "Your own fields". Robert, 10 Nov 2026: where a board
 * asks for something the data does not support, create the data.
 *
 * What changes:
 *   story_character_fields.sheet_group   new: the built-in group the detail sits under
 *                                        (basics, look_and_voice, inside, in_the_story), or null
 *   story_character_fields.own_group     new: the writer's own group it sits in ("Magic",
 *                                        "School"), or null. A group lives as long as one of its
 *                                        details does, so there is no table of empty groups
 *   add_character_detail()               new: adds a detail in a place
 *   rename_character_detail_group()      new: renames one of the writer's own groups
 *   story_cast()                         each field also says where it sits
 *
 * Nothing changes for readers: a detail is shared one by one, as before
 * (story_characters.public_sheet_parts holds the field's ID; S1-E17-32).
 * No new table and no new policy: the columns sit on story_character_fields, which only its
 * writer reads (story_character_fields_select_own) and only these functions write.
 */

/* ---------- Where a detail sits ---------- */

alter table public.story_character_fields
  add column sheet_group text,
  add column own_group text,
  add constraint story_character_fields_sheet_group_known
    check (sheet_group is null
      or sheet_group in ('basics', 'look_and_voice', 'inside', 'in_the_story')),
  add constraint story_character_fields_own_group_length
    check (own_group is null or char_length(btrim(own_group)) between 1 and 60),
  -- One place at most: under a built-in group, in one of the writer's groups, or neither.
  add constraint story_character_fields_one_place
    check (sheet_group is null or own_group is null);

comment on column public.story_character_fields.sheet_group is
  'kind: setting. The built-in sheet group this detail shows under (basics, look_and_voice, inside, in_the_story); null when it sits elsewhere (GAPS-1).';
comment on column public.story_character_fields.own_group is
  'kind: user_content. The name of the writer''s own group this detail sits in; null when it sits elsewhere. A group exists while one of its details does (GAPS-1).';

/* ---------- Add a detail in a place ---------- */

/**
 * add_character_detail: adds one of the writer's own details to every character sheet of a story,
 * under a built-in group, in one of the writer's own groups (new or existing), or in neither.
 *
 * Inputs: the story's address, the detail's name, the built-in group or null, the writer's own
 *   group's name or null.
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' } for a story that isn't the caller's.
 * Errors: insufficient_privilege when signed out; check_violation with hint too_many_fields (40
 *   details in a story, hidden ones included), too_many_groups (12 groups of the writer's own),
 *   two_places (both a built-in and an own group), detail_name_taken (the place already holds a
 *   detail with that name, removed ones included; capitals don't count), and the table's own
 *   checks for an empty or over-long name or an unknown built-in group.
 * A group's name is matched without minding capitals: a detail added to "magic" joins "Magic".
 * Where it fits: "Add detail" and "Add a group of details" on the character sheet
 *   (useStoryCast.addDetail). add_character_field() stays for the at-a-glance page.
 */
create function public.add_character_detail(
  story_slug text,
  field_name text,
  sheet_group text,
  own_group text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  wanted_group text := nullif(btrim(coalesce(own_group, '')), '');
  wanted_name text := btrim(coalesce(field_name, ''));
  new_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to add a detail.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- One change to a story's details at a time: two presses of "Add" at the same moment wait
  -- for each other, so the checks below see the first one's detail (break test, 10 Nov 2026).
  perform pg_advisory_xact_lock(hashtext('story_character_fields:' || target_story_id::text));
  -- Step 2: one place at most.
  if sheet_group is not null and wanted_group is not null then
    raise exception 'A detail sits in one place.'
      using errcode = 'check_violation', hint = 'two_places';
  end if;
  -- A group that differs only in capitals is the same group: the detail joins it under the
  -- spelling it already has, so a sheet never shows "Magic" and "magic" as two cards.
  if wanted_group is not null then
    wanted_group := coalesce(
      (select fields.own_group from public.story_character_fields as fields
       where fields.story_id = target_story_id and lower(fields.own_group) = lower(wanted_group)
       order by fields.position limit 1),
      wanted_group);
  end if;
  -- One name once in a place (removed details included: they come back from the at-a-glance
  -- page), so two boxes with the same label never sit side by side.
  if exists (select 1 from public.story_character_fields as fields
             where fields.story_id = target_story_id
               and lower(fields.name) = lower(wanted_name)
               and fields.sheet_group is not distinct from add_character_detail.sheet_group
               and fields.own_group is not distinct from wanted_group) then
    raise exception 'This place already has a detail with that name.'
      using errcode = 'check_violation', hint = 'detail_name_taken';
  end if;
  -- Step 3: the bounds. 40 details as in add_character_field(), hidden ones included (they keep
  -- their values); 12 groups of the writer's own, so a sheet stays readable.
  if (select count(*) from public.story_character_fields where story_id = target_story_id) >= 40 then
    raise exception 'A story can hold at most 40 character fields of your own.'
      using errcode = 'check_violation', hint = 'too_many_fields';
  end if;
  if wanted_group is not null
     and not exists (select 1 from public.story_character_fields as fields
                     where fields.story_id = target_story_id and fields.own_group = wanted_group)
     and (select count(distinct fields.own_group) from public.story_character_fields as fields
          where fields.story_id = target_story_id) >= 12 then
    raise exception 'A story can hold at most 12 groups of your own details.'
      using errcode = 'check_violation', hint = 'too_many_groups';
  end if;
  -- Step 4: the detail, after the others.
  insert into public.story_character_fields (story_id, user_id, position, name, sheet_group, own_group)
  values (target_story_id, caller_id,
    coalesce((select max(position) from public.story_character_fields where story_id = target_story_id), 0) + 1,
    wanted_name, sheet_group, wanted_group)
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_character_detail(text, text, text, text) is
  'Adds one of the caller''s own details to every character sheet of a story, under a built-in group, in a group of their own or in neither (GAPS-1; S1-E17-10).';

revoke all on function public.add_character_detail(text, text, text, text) from public;
grant execute on function public.add_character_detail(text, text, text, text) to authenticated;

/* ---------- Rename one of the writer's own groups ---------- */

/**
 * rename_character_detail_group: gives one of the writer's own groups a new name, on every detail
 * in it (removed ones too, so a detail brought back is still in its group).
 *
 * Inputs: the story's address, the group's name now, the new name.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } for a story that isn't the caller's or a
 *   group that story doesn't have.
 * Errors: insufficient_privilege when signed out; check_violation with hint name_taken when the
 *   story already has another group with the new name (capitals don't count, so "magic" is taken
 *   while "Magic" exists; a group may change its own capitals), and the table's own check for an
 *   empty or over-long name.
 * Where it fits: "Rename" beside a group's name on the character sheet
 *   (useStoryCast.renameDetailGroup).
 */
create function public.rename_character_detail_group(
  story_slug text,
  group_name text,
  new_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  wanted_name text := btrim(coalesce(new_name, ''));
begin
  -- Step 1: a signed-in writer and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to rename a group.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the same name is nothing to do; another group's name would merge two groups unasked.
  if wanted_name = group_name then
    return jsonb_build_object('outcome', 'ok');
  end if;
  if exists (select 1 from public.story_character_fields as fields
             where fields.story_id = target_story_id
               and lower(fields.own_group) = lower(wanted_name)
               and fields.own_group <> group_name) then
    raise exception 'This story already has a group with that name.'
      using errcode = 'check_violation', hint = 'name_taken';
  end if;
  -- Step 3: every detail in the group takes the new name.
  update public.story_character_fields
  set own_group = wanted_name
  where story_id = target_story_id and own_group = group_name;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.rename_character_detail_group(text, text, text) is
  'Renames one of the caller''s own groups of character details, on every detail in it (GAPS-1).';

revoke all on function public.rename_character_detail_group(text, text, text) from public;
grant execute on function public.rename_character_detail_group(text, text, text) to authenticated;

/* ---------- The cast says where each detail sits ---------- */

/**
 * story_cast: as in G10b (characters, the writer's own fields, the chapters to pick from and the
 * relationships), and each field now also carries sheet_group and own_group (GAPS-1), so the
 * sheet can show it in its place.
 *
 * Inputs: the story's address. Returns: { outcome: 'ok', story, characters, fields, chapters,
 *   relationships } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: the Characters and Connections pages (useStoryCast).
 */
create or replace function public.story_cast(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the characters, the writer's own fields with their places, the chapters to pick from
  -- and the relationships between the characters, with their notes (the writer's own).
  return (select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object('id', stories.id, 'slug', stories.slug, 'title', stories.title),
    'characters', coalesce((
      select jsonb_agg(public.character_json(story_characters) order by lower(story_characters.name), story_characters.created_at)
      from public.story_characters where story_characters.story_id = stories.id), '[]'::jsonb),
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object('id', fields.id, 'name', fields.name, 'position', fields.position,
          'is_hidden', fields.hidden_at is not null,
          'sheet_group', fields.sheet_group, 'own_group', fields.own_group)
        order by fields.position, fields.created_at)
      from public.story_character_fields as fields where fields.story_id = stories.id), '[]'::jsonb),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'position', chapters.position,
          'title', chapters.draft_title) order by chapters.position)
      from public.chapters where chapters.story_id = stories.id and chapters.deleted_at is null), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(public.relationship_json(links, true) order by links.created_at)
      from public.story_character_relationships as links where links.story_id = stories.id), '[]'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$$;
