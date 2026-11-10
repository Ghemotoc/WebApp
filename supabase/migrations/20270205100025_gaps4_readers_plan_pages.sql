/**
 * GAPS-4: the readers' plan pages carry the story's cover and who wrote it.
 *
 * Why: the liquid glass boards AtlasPreview, AtlasPreviewArea and AtlasPreviewCharacter open with
 * a band holding the story's cover and "by inkwolf · shared by the writer". The public plan's
 * answer held only the story's address and title, so the band had neither. Robert, 10 Nov 2026:
 * where a board asks for something the data does not support, create the data.
 *
 * What changes:
 *   public_plan_json()   its "story" part also holds the story's ID (never the writer's; the
 *                        automatic cover is drawn from it, S1-E3-13), the cover (kind, design and
 *                        colours, as get_story_page() answers them) and the writer's name as
 *                        readers see it (the pen name, else the username; a classic's real author)
 *
 * A cover staff hid reads as the automatic cover for everyone but the writer and staff
 * (story_as_shown(), S1-E11-08). An uploaded cover still goes through the picture check: the
 * screen reads it with story_cover_picture(), as every other cover does (rule 19).
 * No new table, column or policy. get_public_story_plan() and preview_story_plan() keep their
 * checks and simply return the fuller answer.
 */

/**
 * public_plan_json: everything readers see of one story's plan (S1-E17-33), now with the story's
 * cover and writer's name for the band at the top (GAPS-4).
 *
 * Inputs: the story's ID; true for the writer's "Preview as a reader" (items waiting for a
 *   chapter are marked instead of left out).
 * Returns: { story: { id, slug, title, cover: { kind, design, background, accent }, writer_name },
 *   areas, characters, fields, relationships, sections, events, chapters }.
 * Errors: none of its own.
 * Where it fits: internal to get_public_story_plan() and preview_story_plan(), which decide
 *   whether the caller may read the story at all.
 */
create or replace function public.public_plan_json(target_story_id uuid, as_preview boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  areas text[];
  shown public.stories;
begin
  -- Step 1: the areas the writer made public, in the settings' order.
  select array(select area from unnest(public.plan_area_names()) as area
               where area = any (story_plans.public_areas))
    into areas
  from public.story_plans where story_plans.story_id = target_story_id;
  areas := coalesce(areas, '{}');
  -- Step 2: the story as this caller may see it (a title or cover staff hid is replaced).
  select (public.story_as_shown(stories)).* into shown
  from public.stories where stories.id = target_story_id;
  if shown.id is null then
    return null;
  end if;
  -- Step 3: the story's band, then each area's items that show.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'id', shown.id, 'slug', shown.slug, 'title', shown.title,
      'cover', jsonb_build_object('kind', shown.cover_kind, 'design', shown.cover_design,
        'background', shown.cover_background, 'accent', shown.cover_accent),
      -- The pen name, else the username; never the user ID (rule 15).
      'writer_name', (select public.story_writer_name(shown.id, profiles.handle, profiles.pen_name)
                      from public.profiles where profiles.id = shown.user_id)),
    'areas', to_jsonb(areas),
    'characters', public.public_plan_characters(shown.id, areas, as_preview),
    'fields', public.public_plan_fields(shown.id, areas, as_preview),
    'relationships', public.public_plan_relationships(shown.id, areas, as_preview),
    'sections', public.public_plan_bible(shown.id, areas, as_preview),
    'events', public.public_plan_events(shown.id, areas, as_preview),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'title', chapters.published_title)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = shown.id and public.chapter_is_readable(chapters.id)), '[]'::jsonb));
end;
$$;

comment on function public.public_plan_json(uuid, boolean) is
  'Internal: what readers see of a story''s plan, with the story''s cover and writer''s name (S1-E17-33; GAPS-4).';
