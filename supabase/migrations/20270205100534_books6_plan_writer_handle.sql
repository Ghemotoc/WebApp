/**
 * books6_plan_writer_handle: the readers' plan band links "by inkwolf" to the writer's profile
 * (user stories bundle 6, story 6.16, board E35: "by <a>inkwolf</a> · shared by the writer").
 *
 * What changes: public_plan_json()'s "story" part also holds writer_handle, the writer's
 * username (public on every story page), or null for a classic, whose byline is its real author.
 * Never the user ID (rule 15). No table, column or policy changes; get_public_story_plan() and
 * preview_story_plan() keep their checks and return the fuller answer.
 * Who calls it: src/features/atlas/api/publicPlan.ts (PublicPlanHero).
 */

/**
 * public_plan_json: everything readers see of one story's plan (S1-E17-33; GAPS-4; story 6.16).
 *
 * Inputs: the story's ID; true for the writer's "Preview as a reader" (items waiting for a
 *   chapter are marked instead of left out).
 * Returns: { story: { id, slug, title, cover, writer_name, writer_handle }, areas, characters,
 *   fields, relationships, sections, events, chapters }.
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
        'background', shown.cover_background, 'accent', shown.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', shown.cover_style, 'title_font', shown.cover_title_font),
      -- The pen name, else the username; never the user ID (rule 15).
      'writer_name', (select public.story_writer_name(shown.id, profiles.handle, profiles.pen_name)
                      from public.profiles where profiles.id = shown.user_id),
      -- Story 6.16: the byline links to the writer's profile; a classic's real author has none.
      'writer_handle', (select profiles.handle from public.profiles
                        where profiles.id = shown.user_id and shown.classic_author_id is null)),
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
  'Internal: what readers see of a story''s plan, with the story''s cover, writer''s name and username (S1-E17-33; GAPS-4; story 6.16).';
