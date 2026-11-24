-- books16_new_chapter_dot: the Library's covers show a dot when a chapter came out after the
-- reader last read the story (design books item 16, "Show what is inside"; Robert approved the
-- design books review on 23 Nov 2026).
--
-- Why: the Library already says "Chapter 4 of 15"; the dot says there is something new to read
-- without opening the story. my_library() now adds has_new_chapter to each card's place: true
-- when stories.last_chapter_published_at is later than the reader's saved place.
-- Who calls it: src/features/library/api/library.ts → fetchLibraryOverview(), for LibraryShelves.
-- Nothing else changes: same inputs, same grants, same other fields.

/**
 * my_library(): the Library page's shelf counts, the stories to continue and each card's place.
 *
 * Allows: the signed-in reader, for their own library only.
 * Returns: {counts, continue_reading, places}; each place is {number, total, last_chapter_number,
 *   has_new_chapter}.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_library()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  counts jsonb;
  continuing jsonb;
  places jsonb;
begin
  if caller_id is null then
    raise exception 'Log in to see your library.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: each shelf's size, counted as the shelves list them.
  select jsonb_object_agg(shelf_name, (select count(*) from public.listed_stories('library', shelf_name, null, null, null)))
  into counts
  from unnest(array['reading', 'saved', 'finished']) as shelf_name;
  -- Step 2: the stories being read, with the latest place first.
  select coalesce(jsonb_agg(jsonb_build_object('story', public.story_card_json(found.id), 'place', found.place)
      order by found.place ->> 'saved_at' desc), '[]'::jsonb)
  into continuing
  from (
    select with_place.id, with_place.place
    from (
      select listed.id, public.latest_place_json(listed.id) as place
      from public.listed_stories('library', 'reading', null, null, null) as listed
    ) as with_place
    where with_place.place is not null
    order by with_place.place ->> 'saved_at' desc
    limit 4
  ) as found;
  -- Step 3: "Chapter n of N" for every card.
  select coalesce(jsonb_object_agg(found.slug, jsonb_build_object('number', found.place -> 'number', 'total', found.place -> 'total',
    -- CALM-6: "of N" only while a last chapter is marked.
    'last_chapter_number', found.place -> 'last_chapter_number',
    -- Design books item 16: a chapter came out after the reader last read, so the cover shows a dot.
    'has_new_chapter', coalesce(found.last_chapter_published_at > (found.place ->> 'saved_at')::timestamptz, false)
    )), '{}'::jsonb)
  into places
  from (
    select stories.slug, stories.last_chapter_published_at, public.latest_place_json(stories.id) as place
    from public.library_entries
    join public.stories on stories.id = library_entries.story_id
    where library_entries.user_id = caller_id
  ) as found
  where found.place is not null;
  return jsonb_build_object('counts', counts, 'continue_reading', continuing, 'places', places);
end;
$$;
