-- g10b_relationships: the relationship form of the liquid glass Story Atlas.
--
-- Story: bundle G10 ATLAS, part b (board AtlasCharacterRelationship and the handoff tab "Story
-- Atlas and editor", A4 and A5, approved by Robert on 7 Nov 2026, 19:51 UTC).
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes (one table gains columns; no new table, no policy):
-- 1. story_character_relationships gains:
--    - `cousin_of`, a family relationship with its degree (first, second or third cousin) and how
--      many times removed (0 to 3): "Corina is the second cousin once removed of Mara";
--    - `reverse_label`, for an "Other" relationship only: what the second character is to the
--      first, so both sheets read naturally ("Ilinca: goddaughter of Ana" and "Ana: godmother of
--      Ilinca"). Optional.
-- 2. add_character_relationship() takes the three new values (the old five-argument version is
--    dropped, so there is one way in).
-- 3. story_cast() and public_plan_relationships() return them. The note stays the writer's own:
--    readers never get it (it is where "How both are true" is kept, A5).
-- The clash warning (A5) needs nothing here: it is advice, never a block, so the form works it
-- out from the relationships it already has (src/features/atlas/lib/relationshipClash.ts).

-- Step 1: the new columns and the checks that keep them consistent.
alter table public.story_character_relationships
  add column reverse_label text not null default '',
  add column cousin_degree smallint,
  add column cousin_removed smallint;

alter table public.story_character_relationships
  drop constraint story_character_relationships_kind_known,
  add constraint story_character_relationships_kind_known check (kind = any (array[
    'parent_of', 'sibling_of', 'partner_of', 'cousin_of', 'loves', 'made', 'friend_of', 'ally_of',
    'mentors', 'works_for', 'enemy_of', 'resents', 'killed', 'custom'])),
  -- The reverse label belongs to an "Other" relationship only, and is as short as the label.
  add constraint story_character_relationships_reverse_label check (
    (kind = 'custom' and char_length(reverse_label) <= 60 and reverse_label = btrim(reverse_label))
    or (kind <> 'custom' and reverse_label = '')),
  -- A cousin always says which cousin and how removed; nothing else does. (coalesce: a check
  -- passes on null, so a missing degree has to count as false.)
  add constraint story_character_relationships_cousin check (
    (kind = 'cousin_of' and coalesce(cousin_degree between 1 and 3, false)
      and coalesce(cousin_removed between 0 and 3, false))
    or (kind <> 'cousin_of' and cousin_degree is null and cousin_removed is null));

comment on column public.story_character_relationships.reverse_label is
  'For an "Other" (custom) relationship only: what the second character is to the first, shown on the second''s sheet; empty when not given (G10b).';
comment on column public.story_character_relationships.cousin_degree is
  'For cousin_of only: 1 (cousin), 2 (second cousin) or 3 (third cousin) (G10b).';
comment on column public.story_character_relationships.cousin_removed is
  'For cousin_of only: how many generations apart, 0 (not removed) to 3 (G10b).';

-- Step 2: one way to add a relationship, taking the new values.
drop function public.add_character_relationship(uuid, uuid, text, text, text);

/**
 * add_character_relationship: records how two of the caller's characters are connected, from a
 * sheet or the Connections page. As in …_s1_e17_14_relationships.sql, plus the reverse label of
 * an "Other" relationship and a cousin's degree and removal (G10b).
 * Input: the two characters, the type, the label and reverse label (custom only), the note, and
 *   the cousin's degree (1 to 3) and removal (0 to 3) for cousin_of.
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' } (not the caller's characters).
 * Errors: insufficient_privilege when signed out; check_violation for two stories, more than
 *   2,000 relationships, or values the table's checks refuse.
 * Who calls it: src/features/atlas/api/characters.ts (addRelationship).
 */
create function public.add_character_relationship(
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
  if (select count(*) from public.story_character_relationships
      where story_id = from_character.story_id) >= 2000 then
    raise exception 'A story can hold at most 2,000 relationships.'
      using errcode = 'check_violation', hint = 'too_many_relationships';
  end if;
  -- Step 3: the relationship; values that don't belong to its type are dropped, and the table's
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
  'Records how two of the caller''s characters are connected, with the reverse label of an "Other" one and a cousin''s degree (S1-E17-14, G10b).';
revoke execute on function public.add_character_relationship(uuid, uuid, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.add_character_relationship(uuid, uuid, text, text, text, text, integer, integer) to authenticated;

/**
 * relationship_json: one relationship as the Atlas pages read it. Internal: story_cast() (with
 * the note, for the writer) and public_plan_relationships() (without it, for readers).
 * Input: the row and whether to include the note. Returns: { id, from, to, kind, custom_label,
 *   reverse_label, cousin_degree, cousin_removed[, note] }.
 */
create function public.relationship_json(link public.story_character_relationships, with_note boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('id', link.id, 'from', link.from_character_id,
      'to', link.to_character_id, 'kind', link.kind, 'custom_label', link.custom_label,
      'reverse_label', link.reverse_label, 'cousin_degree', link.cousin_degree,
      'cousin_removed', link.cousin_removed)
    || case when with_note then jsonb_build_object('note', link.note) else '{}'::jsonb end;
$$;

comment on function public.relationship_json(public.story_character_relationships, boolean) is
  'Internal: one relationship as JSON, with the writer''s note only when asked (G10b).';
revoke execute on function public.relationship_json(public.story_character_relationships, boolean) from public, anon, authenticated;

-- Step 3: the writer's cast and the readers' relationships return the new values.

/**
 * story_cast: a story's characters, the writer's own fields, the chapters and the
 * relationships. As in …_s1_e17_14_relationships.sql, the relationships now through
 * relationship_json() (G10b: reverse label, cousin degree and removal).
 * Input: the story's slug. Returns: { outcome: 'ok', story, characters, fields, chapters,
 *   relationships } or { outcome: 'not_found' }. Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/characters.ts (fetchStoryCast).
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

  -- Step 2: the characters, the writer's own fields, the chapters to pick from and the
  -- relationships between the characters, with their notes (the writer's own).
  return (select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object('id', stories.id, 'slug', stories.slug, 'title', stories.title),
    'characters', coalesce((
      select jsonb_agg(public.character_json(story_characters) order by lower(story_characters.name), story_characters.created_at)
      from public.story_characters where story_characters.story_id = stories.id), '[]'::jsonb),
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object('id', fields.id, 'name', fields.name, 'position', fields.position,
          'is_hidden', fields.hidden_at is not null) order by fields.position, fields.created_at)
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

/**
 * public_plan_relationships: the relationships readers may see on a story's public plan. As in
 * the readers' migration (S1-E17-32 to 35), through relationship_json() without the note (G10b).
 * Internal: the public plan functions.
 */
create or replace function public.public_plan_relationships(target_story_id uuid, areas text[], as_preview boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.relationship_json(links, false)
      order by links.created_at, links.id), '[]'::jsonb)
  from public.story_character_relationships as links
  join public.story_characters as from_character on from_character.id = links.from_character_id
  join public.story_characters as to_character on to_character.id = links.to_character_id
  where links.story_id = target_story_id
    and areas && array['relationship_map', 'family_tree']
    and public.plan_item_shows(links.id, links.is_private, null, as_preview)
    and public.plan_item_shows(from_character.id, from_character.is_private, from_character.show_from_chapter_id, as_preview)
    and public.plan_item_shows(to_character.id, to_character.is_private, to_character.show_from_chapter_id, as_preview);
$$;
