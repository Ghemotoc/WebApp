-- calm9e25_relationship_colours: the colour the writer picks for each relationship category.
--
-- Story: CALM-9, board E25 (Story Atlas relationship map; the 23 Nov 2026 canvas changes approved
-- by Robert at 08:33 UTC): "A Category colours fold under the chips: one row per category with
-- 8 round swatches (Blue, Pink, Yellow, Aqua, Orange, Violet, Green, Red) as a radio group. Save
-- the choice per story."
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes (one table gains a column; no new table, no policy):
-- 1. story_plans gains `relationship_colours`: a map from category to swatch name, holding only
--    the categories the writer changed. A category that isn't there keeps its default colour,
--    which the app knows (src/features/atlas/lib/relationshipCategories.ts).
-- 2. set_relationship_colour() saves one category's colour on one of the caller's stories.
-- 3. story_cast() returns the map, so the writer's map, list and chips draw in their colours.

/**
 * relationship_colours_are_valid: true when a colours map holds only known categories, each with
 * one of the eight swatches. Used by the column's check.
 * Input: the map. Returns: boolean. Immutable, no side effects.
 */
create function public.relationship_colours_are_valid(colours jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(colours) = 'object'
    and not exists (
      select 1 from jsonb_each(colours) as entries
      where entries.key not in ('family', 'love', 'lineage', 'allies', 'conflict', 'other')
        or jsonb_typeof(entries.value) <> 'string'
        or (entries.value #>> '{}') not in
          ('blue', 'pink', 'yellow', 'aqua', 'orange', 'violet', 'green', 'red'));
$$;

comment on function public.relationship_colours_are_valid(jsonb) is
  'True when a relationship colours map holds only known categories and swatches (CALM-9, E25).';

-- Step 1: the column; empty means every category keeps its default colour.
alter table public.story_plans
  add column relationship_colours jsonb not null default '{}'::jsonb,
  add constraint story_plans_relationship_colours_known
    check (public.relationship_colours_are_valid(relationship_colours));

comment on column public.story_plans.relationship_colours is
  'The swatch the writer picked for each relationship category, only those changed (CALM-9, E25).';

/**
 * set_relationship_colour: saves the colour of one relationship category on one of the caller's
 * stories. Picking a category's default colour stores it too; the map looks the same either way.
 * Input: the story's slug, the category (family, love, lineage, allies, conflict or other) and the
 * swatch (blue, pink, yellow, aqua, orange, violet, green or red).
 * Returns: { outcome: 'ok', relationship_colours } or { outcome: 'not_found' } (not the caller's
 * live story).
 * Errors: insufficient_privilege when signed out; check_violation for an unknown category or
 * swatch.
 * Who calls it: src/features/atlas/api/characters.ts (setRelationshipColour).
 */
create function public.set_relationship_colour(story_slug text, category text, colour text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  saved jsonb;
begin
  -- Step 1: a signed-in writer and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your plan.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the new colour; the column's check refuses an unknown category or swatch.
  update public.story_plans
  set relationship_colours = relationship_colours || jsonb_build_object(category, colour)
  where story_plans.story_id = target_story_id
  returning relationship_colours into saved;
  return jsonb_build_object('outcome', 'ok', 'relationship_colours', saved);
end;
$$;

comment on function public.set_relationship_colour(text, text, text) is
  'Saves the colour of one relationship category on one of the caller''s stories (CALM-9, E25).';
revoke execute on function public.set_relationship_colour(text, text, text) from public, anon;
grant execute on function public.set_relationship_colour(text, text, text) to authenticated;

/**
 * story_cast: the cast of one of the caller's stories: its characters, custom fields, chapters,
 * relationships and, since CALM-9 (E25), the colours the writer picked for the relationship
 * categories.
 * Input: the story's slug. Returns: { outcome: 'ok', story, characters, fields, chapters,
 * relationships, relationship_colours } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/characters.ts (fetchCast).
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

  -- Step 2: the characters, the writer's own fields with their places, the chapters to pick from,
  -- the relationships between the characters, with their notes (the writer's own), and the
  -- colours picked for the relationship categories.
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
      from public.story_character_relationships as links where links.story_id = stories.id), '[]'::jsonb),
    'relationship_colours', coalesce((
      select story_plans.relationship_colours from public.story_plans
      where story_plans.story_id = stories.id), '{}'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$$;

comment on function public.story_cast(text) is
  'The cast of one of the caller''s stories: its characters, custom fields, chapters, relationships and relationship colours (S1-E17-08 to S1-E17-16; CALM-9, E25).';
