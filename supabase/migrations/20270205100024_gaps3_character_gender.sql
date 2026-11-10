/**
 * GAPS-3: a character can have a gender, so family words can say mother, father, daughter, son,
 * sister and brother.
 *
 * Why: the liquid glass boards (AtlasCharacterRelationship, AtlasFamilyTree) write family
 * relationships with those words ("Mara is the daughter of Elena Rus"). The Atlas only had
 * neutral words (parent, sibling), because a character had no gender. Robert, 10 Nov 2026: where
 * a board asks for something the data does not support, create the data.
 *
 * What changes:
 *   story_characters.gender        new: 'she', 'he', 'they' or null (not set). Optional; it only
 *                                  picks the family word, and "they" and null keep the neutral one
 *   update_story_character()       also takes "gender" (a known value, or null or '' to clear it)
 *   character_json()               also answers gender (the writer's cast)
 *   public_character_json()        also answers gender, so readers get the same family words on
 *                                  the relationships the writer shares
 *   add_character_relationship()   refuses a relationship that is already there (hint
 *                                  'already_there'), so a double click on the family tree's
 *                                  "Add" records it once (break test, 10 Nov 2026)
 *
 * A character is made up, so its gender is story content, not personal data (rule 5 is about
 * people). No new table and no new policy: the column sits on story_characters, which only its
 * writer reads and only these functions write.
 */

/* ---------- The column ---------- */

alter table public.story_characters
  add column gender text,
  add constraint story_characters_gender_known
    check (gender is null or gender in ('she', 'he', 'they'));

comment on column public.story_characters.gender is
  'kind: user_content. The character''s gender for family words: she (mother, daughter, sister), he (father, son, brother), they or null (parent, child, sibling) (GAPS-3).';

/* ---------- Saving it ---------- */

/**
 * update_story_character: as before (name, role, sheet text, custom values, first appearance,
 * picture alt text), and now also the gender (GAPS-3).
 *
 * Inputs: the character's ID and the changes; "gender" is 'she', 'he', 'they', or null or '' for
 *   not set.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' } for a character that isn't
 *   the caller's.
 * Errors: insufficient_privilege when signed out; check_violation for an unknown gender, an
 *   unknown sheet field, an empty name or text that is too long.
 * Where it fits: every field of the character sheet saves through it (useStoryCast.saveChange).
 */
create or replace function public.update_story_character(character_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer and their own character.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the texts use only known fields and stay within bounds.
  perform public.check_character_texts(coalesce(changes -> 'sheet', '{}'::jsonb), public.character_sheet_keys());
  perform public.check_custom_value_keys(target_character.story_id, coalesce(changes -> 'custom', '{}'::jsonb));

  -- Step 3: change only what was given; the table's checks refuse the rest (an unknown gender
  -- among them). An empty gender means "not set".
  update public.story_characters set
    name = coalesce(btrim(changes ->> 'name'), name),
    role = coalesce(changes ->> 'role', role),
    gender = case when changes ? 'gender' then nullif(changes ->> 'gender', '') else gender end,
    sheet = sheet || coalesce(changes -> 'sheet', '{}'::jsonb),
    custom_values = custom_values || coalesce(changes -> 'custom', '{}'::jsonb),
    first_appearance_chapter_id = case when changes ? 'first_appearance'
      then public.chapter_of_story(target_character.story_id, changes ->> 'first_appearance')
      else first_appearance_chapter_id end,
    picture_alt = coalesce(btrim(changes ->> 'picture_alt'), picture_alt)
  where story_characters.id = target_character.id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_story_character(uuid, jsonb) is
  'Changes one of the caller''s characters: name, role, gender, sheet text, custom values, first appearance or picture alt text (S1-E17-08 to S1-E17-11; GAPS-3).';

/* ---------- Reading it: the writer's cast ---------- */

/**
 * character_json: one character for Story Atlas, without the user ID; now with the gender
 * (GAPS-3).
 *
 * Inputs: the character's row. Returns: its JSON. Errors: none.
 * Where it fits: story_cast() calls it for every character.
 */
create or replace function public.character_json(target_character public.story_characters)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target_character.id, 'name', target_character.name, 'role', target_character.role,
    'gender', target_character.gender,
    'sheet', target_character.sheet, 'custom_values', target_character.custom_values,
    'first_appearance', (select chapters.code from public.chapters
                         where chapters.id = target_character.first_appearance_chapter_id
                           and chapters.deleted_at is null),
    'picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                where picture_checks.id = target_character.picture_id and picture_checks.deleted_at is null),
    'picture_alt', target_character.picture_alt,
    'map_x', target_character.map_x, 'map_y', target_character.map_y,
    'updated_at', target_character.updated_at);
$$;

/* ---------- Reading it: what readers see ---------- */

/**
 * public_character_json: one character as readers see it, with only the sheet's open parts; now
 * with the gender, so a shared relationship reads the same for readers as for the writer
 * ("Elena is the mother of Mara"; GAPS-3).
 *
 * Inputs: the character's row, whether the sheet shows (the Characters area is public) and
 *   whether this is the writer's preview. Returns: its JSON. Errors: none.
 * Where it fits: public_plan_characters() and the reader page of one item call it.
 */
create or replace function public.public_character_json(
  target_character public.story_characters,
  with_sheet boolean,
  as_preview boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target_character.id, 'name', target_character.name, 'role', target_character.role,
    'gender', target_character.gender,
    'sheet', case when with_sheet then coalesce((
        select jsonb_object_agg(sheet_text.key, sheet_text.value)
        from jsonb_each(target_character.sheet) as sheet_text
        where sheet_text.key = any (public.character_part_keys(target_character.public_sheet_parts))
          and sheet_text.value #>> '{}' <> ''), '{}'::jsonb) else '{}'::jsonb end,
    'custom_values', case when with_sheet then coalesce((
        select jsonb_object_agg(custom.key, custom.value)
        from jsonb_each(target_character.custom_values) as custom
        join public.story_character_fields as fields on fields.id::text = custom.key
        where custom.key = any (target_character.public_sheet_parts)
          and fields.hidden_at is null and custom.value #>> '{}' <> ''), '{}'::jsonb) else '{}'::jsonb end,
    'first_appearance', case when with_sheet and 'in_the_story' = any (target_character.public_sheet_parts) then (
        select chapters.code from public.chapters
        where chapters.id = target_character.first_appearance_chapter_id
          and public.chapter_is_readable(chapters.id)) end,
    -- Only a picture that passed its check and wasn't moderated away (rule 19).
    'picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                where picture_checks.id = target_character.picture_id
                  and picture_checks.deleted_at is null
                  and public.picture_is_visible(picture_checks.bucket, picture_checks.path)),
    'picture_alt', target_character.picture_alt,
    'show_from', public.plan_guard_json(target_character.show_from_chapter_id, as_preview));
$$;

/* ---------- The same relationship is recorded once (break test, 10 Nov 2026) ---------- */

/**
 * add_character_relationship: as in …_g10b_relationships.sql, and now a relationship that is
 * already there is refused instead of being recorded a second time (GAPS-3 break test, 10 Nov
 * 2026: a double click on "Add" drew the same parent twice in the family tree).
 *
 * "Already there" means the same two characters and the same type, the same way round. The
 * types that read the same from both sides (sibling, partner, cousin, friend, ally, enemy)
 * also count the other way round. An "Other" relationship is the writer's own words, so two of
 * those may sit side by side.
 * Input: the two characters, the type, the label and reverse label (custom only), the note, and
 *   the cousin's degree (1 to 3) and removal (0 to 3) for cousin_of.
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' } (not the caller's characters).
 * Errors: insufficient_privilege when signed out; check_violation for two stories, more than
 *   2,000 relationships, a relationship already there (hint 'already_there') or values the
 *   table's checks refuse.
 * Who calls it: src/features/atlas/api/characters.ts (addRelationship).
 */
create or replace function public.add_character_relationship(
  from_character_id uuid,
  to_character_id uuid,
  relationship_kind text,
  custom_label text,
  note text,
  reverse_label text default '',
  cousin_degree integer default null,
  cousin_removed integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  from_character public.story_characters;
  to_character public.story_characters;
  is_custom boolean := relationship_kind = 'custom';
  is_cousin boolean := relationship_kind = 'cousin_of';
  -- The types that say the same thing from both sides.
  reads_both_ways boolean := relationship_kind in
    ('sibling_of', 'partner_of', 'cousin_of', 'friend_of', 'ally_of', 'enemy_of');
  new_id uuid;
begin
  -- Step 1: a signed-in writer and two of their own characters.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  from_character := public.my_story_character(from_character_id);
  to_character := public.my_story_character(to_character_id);
  if from_character.id is null or to_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: both in the same story, within the bound.
  if from_character.story_id <> to_character.story_id then
    raise exception 'Both characters must be in the same story.'
      using errcode = 'check_violation', hint = 'different_stories';
  end if;
  -- One add at a time per story, so two clicks at once can't both pass the checks below.
  perform pg_advisory_xact_lock(hashtext('story_character_relationships:' || from_character.story_id));
  if (select count(*) from public.story_character_relationships
      where story_id = from_character.story_id) >= 2000 then
    raise exception 'A story can hold at most 2,000 relationships.'
      using errcode = 'check_violation', hint = 'too_many_relationships';
  end if;
  -- Step 3: the same relationship is recorded once.
  if not is_custom and exists (
    select 1 from public.story_character_relationships as existing
    where existing.kind = relationship_kind
      and ((existing.from_character_id = from_character.id and existing.to_character_id = to_character.id)
        or (reads_both_ways
            and existing.from_character_id = to_character.id and existing.to_character_id = from_character.id))
  ) then
    raise exception 'That relationship is already there.'
      using errcode = 'check_violation', hint = 'already_there';
  end if;
  -- Step 4: the relationship; values that don't belong to its type are dropped, and the table's
  -- checks refuse the rest (a custom one with no label, a cousin with no degree).
  insert into public.story_character_relationships
    (story_id, user_id, from_character_id, to_character_id, kind, custom_label, reverse_label,
     note, cousin_degree, cousin_removed)
  values (from_character.story_id, from_character.user_id, from_character.id, to_character.id,
    relationship_kind,
    case when is_custom then btrim(coalesce(custom_label, '')) else '' end,
    case when is_custom then btrim(coalesce(reverse_label, '')) else '' end,
    btrim(coalesce(note, '')),
    case when is_cousin then cousin_degree end,
    case when is_cousin then coalesce(cousin_removed, 0) end)
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_character_relationship(uuid, uuid, text, text, text, text, integer, integer) is
  'Records how two of the caller''s characters are connected, once: the same relationship a second time is refused (S1-E17-14, G10b, GAPS-3).';
