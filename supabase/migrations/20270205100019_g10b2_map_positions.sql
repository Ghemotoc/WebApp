-- g10b2_map_positions: where the writer put each character on the relationship map.
--
-- Story: bundle G10 ATLAS, part b2 (board AtlasConnections and the handoff tab "Story Atlas and
-- editor", A6: "Drag a card to move it", "Arrange for me"; approved by Robert on 7 Nov 2026,
-- 19:51 UTC).
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes (one table gains columns; no new table, no policy):
-- 1. story_characters gains `map_x` and `map_y`: the card's top-left corner on the map, in map
--    pixels, or both null when the map places it by itself.
-- 2. Moving a card is not an edit of the character: the update stamp is kept when only the map
--    place changes, so "Characters · edited recently" doesn't fill up with cards that were moved.
-- 3. set_character_map_position() saves one card's place; clear_map_positions() puts every card
--    of a story back where the map places it ("Arrange for me").
-- 4. character_json() returns the place, for the writer's own story_cast() only. Readers' maps
--    (public_character_json) never get it: their map is laid out by itself.

-- Step 1: the columns, both set or both empty, inside a map the size the page can draw.
alter table public.story_characters
  add column map_x smallint,
  add column map_y smallint,
  add constraint story_characters_map_place check (
    (map_x is null and map_y is null)
    or (map_x between 0 and 4000 and map_y between 0 and 4000));

comment on column public.story_characters.map_x is
  'The card''s left edge on the relationship map, in map pixels; null when the map places it (G10b2).';
comment on column public.story_characters.map_y is
  'The card''s top edge on the relationship map, in map pixels; null when the map places it (G10b2).';

/**
 * set_character_updated_at: the update stamp for story_characters. Like set_updated_at(), except
 * that a change to the map place alone keeps the old stamp (moving a card is not editing).
 * Input: the trigger's old and new rows. Returns: the new row. Internal: trigger only.
 */
create function public.set_character_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Step 1: only the map place moved; everything else, the stamp aside, is as it was.
  if (new.map_x, new.map_y) is distinct from (old.map_x, old.map_y)
     and (to_jsonb(new) - 'map_x' - 'map_y' - 'updated_at')
       = (to_jsonb(old) - 'map_x' - 'map_y' - 'updated_at') then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

comment on function public.set_character_updated_at() is
  'Trigger: keeps story_characters.updated_at current, except when only the map place changed (G10b2).';
revoke execute on function public.set_character_updated_at() from public, anon, authenticated;

drop trigger story_characters_set_updated_at on public.story_characters;
create trigger story_characters_set_updated_at
  before update on public.story_characters
  for each row execute function public.set_character_updated_at();

/**
 * set_character_map_position: saves where the writer dropped one character's card on the map.
 * Input: the character and the card's top-left corner (0 to 4,000 each; the page keeps it there).
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } (not the caller's character).
 * Errors: insufficient_privilege when signed out; check_violation for a place off the map.
 * Who calls it: src/features/atlas/api/characters.ts (moveOnMap).
 */
create function public.set_character_map_position(character_id uuid, x integer, y integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.story_characters;
begin
  -- Step 1: a signed-in writer and their own character.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target := public.my_story_character(character_id);
  if target.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the place; the table's check refuses one off the map.
  update public.story_characters set map_x = x, map_y = y where id = target.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_character_map_position(uuid, integer, integer) is
  'Saves where the writer put a character''s card on the relationship map (G10b2).';
revoke execute on function public.set_character_map_position(uuid, integer, integer) from public, anon;
grant execute on function public.set_character_map_position(uuid, integer, integer) to authenticated;

/**
 * clear_map_positions: "Arrange for me": every card of one of the caller's stories goes back to
 * where the map places it.
 * Input: the story's slug. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/characters.ts (arrangeMap).
 */
create function public.clear_map_positions(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: a signed-in writer and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: every saved place goes; the map lays the cards out again.
  update public.story_characters set map_x = null, map_y = null
  where story_id = target_story_id and map_x is not null;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.clear_map_positions(text) is
  'Arrange for me: forgets where the writer put the cards on a story''s relationship map (G10b2).';
revoke execute on function public.clear_map_positions(text) from public, anon;
grant execute on function public.clear_map_positions(text) to authenticated;

/**
 * character_json: one character for Story Atlas, without the user ID. As in
 * …_s1_e17_08_characters.sql and later, plus `map_x` and `map_y` (G10b2). Internal: the writer's
 * story_cast() only.
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
