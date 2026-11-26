-- books6_relationship_guard: a relationship can wait for a chapter too (user stories bundle 6,
-- story 6.14, board E33: "Spoilers stay safe: each character, relationship and entry shows from
-- a chapter the writer picks (The start, or Chapter N); a reader who hasn't reached it doesn't
-- see it, and the server never sends it").
--
-- Why: until now a relationship followed its two characters only (S1-E17-35), so "Mara and Teo
-- are siblings" showed as soon as both characters did, even when the story reveals it in
-- chapter 9. The story now asks for the same guard as characters, entries and events.
-- What changes:
-- - story_character_relationships gets show_from_chapter_id (a chapter of the same story; it
--   goes back to the start when that chapter is deleted for good);
-- - set_plan_item_show_from() takes a relationship; a section still follows its entries;
-- - story_plan_visibility() reports a relationship's chapter, as it does a character's;
-- - public_plan_relationships() holds a relationship back until the reader reaches its chapter,
--   and the writer's preview marks it, as it does the other items;
-- - restore_character_relationship() (Undo) puts the chapter back while it is still the story's.
-- Who calls them: src/features/atlas/api/readerView.ts (the switches) and the public plan's
-- readers through public_plan_json(); the relationships' Undo through api/relationships.ts.

/* ---------- The column ---------- */

alter table public.story_character_relationships
  add column show_from_chapter_id uuid references public.chapters (id) on delete set null;

comment on column public.story_character_relationships.show_from_chapter_id is
  'The spoiler guard: readers see the relationship only once they reached this chapter (story 6.14).';

-- The foreign key's index, as for the other guarded tables (Supabase's linter asks for one).
create index story_character_relationships_show_from_chapter_id_fk_idx
  on public.story_character_relationships (show_from_chapter_id);

/* ---------- Setting it ---------- */

/**
 * set_plan_item_show_from: the spoiler guard, "Readers see it from" (S1-E17-35; story 6.14).
 * Inputs: item_id, a character, relationship, world entry or event; chapter_code, one of the same
 *   story's chapters, or null or '' to show it from the start.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint no_guard for a
 *   section (it follows its entries), unknown_chapter for a chapter that isn't the story's.
 * Who calls it: src/features/atlas/api/readerView.ts (ItemVisibilityControls).
 */
create or replace function public.set_plan_item_show_from(item_id uuid, chapter_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_kind text;
  item_story_id uuid;
  guard_chapter_id uuid;
begin
  -- Step 1: a signed-in writer and their own item of a kind that takes a guard.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your settings.' using errcode = 'insufficient_privilege';
  end if;
  item_kind := public.my_plan_item_kind(item_id);
  if item_kind is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if item_kind not in ('character', 'relationship', 'entry', 'event') then
    raise exception 'Only characters, relationships, entries and events wait for a chapter.'
      using errcode = 'check_violation', hint = 'no_guard';
  end if;
  -- Step 2: the chapter, one of the same story's.
  select coalesce(
      (select story_id from public.story_characters where id = item_id),
      (select story_id from public.story_character_relationships where id = item_id),
      (select story_id from public.story_bible_entries where id = item_id),
      (select story_id from public.story_events where id = item_id))
    into item_story_id;
  if coalesce(chapter_code, '') <> '' then
    select chapters.id into guard_chapter_id from public.chapters
    where chapters.code = chapter_code and chapters.story_id = item_story_id and chapters.deleted_at is null;
    if guard_chapter_id is null then
      raise exception 'That chapter isn''t part of this story.'
        using errcode = 'check_violation', hint = 'unknown_chapter';
    end if;
  end if;
  -- Step 3: save it.
  case item_kind
    when 'character' then update public.story_characters set show_from_chapter_id = guard_chapter_id where id = item_id;
    when 'relationship' then update public.story_character_relationships set show_from_chapter_id = guard_chapter_id where id = item_id;
    when 'entry' then update public.story_bible_entries set show_from_chapter_id = guard_chapter_id where id = item_id;
    when 'event' then update public.story_events set show_from_chapter_id = guard_chapter_id where id = item_id;
  end case;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_plan_item_show_from(uuid, text) is
  'Sets or clears the chapter a public character, relationship, entry or event waits for (S1-E17-35; story 6.14).';
revoke execute on function public.set_plan_item_show_from(uuid, text) from public, anon;

/* ---------- Reading it back ---------- */

/**
 * story_plan_visibility: the writer's own switches for one story (S1-E17-32, S1-E17-35; story
 * 6.14 adds a relationship's chapter).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', areas, items: { "<item ID>": { is_private, show_from } } for every
 *   character, relationship, section, entry and event (show_from is a chapter code or null;
 *   always null for a section), sheet_parts: { "<character ID>": [...] }, chapters: [{ code,
 *   position, title }] for the spoiler guard's list }, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/readerView.ts.
 */
create or replace function public.story_plan_visibility(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your settings.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object(
    'outcome', 'ok',
    'areas', (select to_jsonb(story_plans.public_areas) from public.story_plans
              where story_plans.story_id = target_story_id),
    'items', coalesce((
      select jsonb_object_agg(item.id, jsonb_build_object('is_private', item.is_private,
          'show_from', (select chapters.code from public.chapters
                        where chapters.id = item.show_from and chapters.deleted_at is null)))
      from (
        select id, is_private, show_from_chapter_id as show_from from public.story_characters where story_id = target_story_id
        union all
        select id, is_private, show_from_chapter_id from public.story_character_relationships where story_id = target_story_id
        union all
        select id, is_private, null from public.story_bible_sections where story_id = target_story_id
        union all
        select id, is_private, show_from_chapter_id from public.story_bible_entries where story_id = target_story_id
        union all
        select id, is_private, show_from_chapter_id from public.story_events where story_id = target_story_id
      ) as item), '{}'::jsonb),
    'sheet_parts', coalesce((
      select jsonb_object_agg(characters.id, to_jsonb(characters.public_sheet_parts))
      from public.story_characters as characters where characters.story_id = target_story_id), '{}'::jsonb),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'position', chapters.position,
          'title', chapters.draft_title) order by chapters.position)
      from public.chapters
      where chapters.story_id = target_story_id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;

comment on function public.story_plan_visibility(text) is
  'The writer''s own "What readers can see" switches for one story (S1-E17-32; story 6.14).';
revoke execute on function public.story_plan_visibility(text) from public, anon;

/* ---------- What readers get ---------- */

/**
 * public_plan_relationships: the relationships readers may see on a story's public plan, without
 * the writer's note (S1-E17-33, G10b). A relationship shows only while it isn't kept private,
 * both its characters show, and the reader has reached the chapter it waits for (story 6.14); in
 * the writer's preview everything shows and a waiting one carries "show_from", as the other
 * items do (plan_guard_json()).
 * Internal: public_plan_json().
 */
create or replace function public.public_plan_relationships(target_story_id uuid, areas text[], as_preview boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.relationship_json(links, false)
        || jsonb_build_object('show_from', public.plan_guard_json(links.show_from_chapter_id, as_preview))
      order by links.created_at, links.id), '[]'::jsonb)
  from public.story_character_relationships as links
  join public.story_characters as from_character on from_character.id = links.from_character_id
  join public.story_characters as to_character on to_character.id = links.to_character_id
  where links.story_id = target_story_id
    and areas && array['relationship_map', 'family_tree']
    and public.plan_item_shows(links.id, links.is_private, links.show_from_chapter_id, as_preview)
    and public.plan_item_shows(from_character.id, from_character.is_private, from_character.show_from_chapter_id, as_preview)
    and public.plan_item_shows(to_character.id, to_character.is_private, to_character.show_from_chapter_id, as_preview);
$$;

comment on function public.public_plan_relationships(uuid, text[], boolean) is
  'Internal: the relationships readers see, without the writer''s notes, each from its chapter (S1-E17-33; story 6.14).';

/* ---------- Undo keeps the chapter ---------- */

/**
 * restore_character_relationship(removed): puts back a relationship the caller just deleted
 * (design books item 14), now with the chapter it waited for (story 6.14).
 * Input: the "relationship" object delete_character_relationship() returned.
 * Allows: only the writer of both characters (my_story_character()).
 * Returns: {outcome: 'ok'}, or {outcome: 'not_found'} when the characters aren't the caller's.
 * Errors: insufficient_privilege when signed out; check_violation 'already_there' when the same
 *   relationship was added again meanwhile; the table's own checks refuse values that don't fit.
 * Who calls it: src/features/atlas/api/relationships.ts.
 */
create or replace function public.restore_character_relationship(removed jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  from_character public.story_characters;
  to_character public.story_characters;
  waits_for uuid;
  removed_kind text := removed ->> 'kind';
  reads_both_ways boolean := (removed ->> 'kind') in
    ('sibling_of', 'partner_of', 'cousin_of', 'friend_of', 'ally_of', 'enemy_of');
begin
  -- Step 1: a signed-in writer and two of their own characters, in one story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  from_character := public.my_story_character((removed ->> 'from_character_id')::uuid);
  to_character := public.my_story_character((removed ->> 'to_character_id')::uuid);
  if from_character.id is null or to_character.id is null
     or from_character.story_id <> to_character.story_id then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the same lock and the same "recorded once" rule as add_character_relationship().
  perform pg_advisory_xact_lock(hashtext('story_character_relationships:' || from_character.story_id));
  if removed_kind <> 'custom' and exists (
    select 1 from public.story_character_relationships as existing
    where existing.kind = removed_kind
      -- The row itself, already back after a first Undo, doesn't count as a duplicate.
      and existing.id <> (removed ->> 'id')::uuid
      and ((existing.from_character_id = from_character.id and existing.to_character_id = to_character.id)
        or (reads_both_ways
            and existing.from_character_id = to_character.id and existing.to_character_id = from_character.id))
  ) then
    raise exception 'That relationship is already there.'
      using errcode = 'check_violation', hint = 'already_there';
  end if;
  -- Step 3: the chapter it waited for, only while it is still a chapter of this story.
  select chapters.id into waits_for
  from public.chapters
  where chapters.id = (removed ->> 'show_from_chapter_id')::uuid
    and chapters.story_id = from_character.story_id
    and chapters.deleted_at is null;
  -- Step 4: the row as it was; a second Undo of the same row changes nothing.
  insert into public.story_character_relationships
    (id, story_id, user_id, from_character_id, to_character_id, kind, custom_label,
     reverse_label, note, cousin_degree, cousin_removed, is_private, show_from_chapter_id, created_at)
  values ((removed ->> 'id')::uuid, from_character.story_id, from_character.user_id,
    from_character.id, to_character.id, removed_kind,
    coalesce(removed ->> 'custom_label', ''), coalesce(removed ->> 'reverse_label', ''),
    coalesce(removed ->> 'note', ''), (removed ->> 'cousin_degree')::smallint,
    (removed ->> 'cousin_removed')::smallint, coalesce((removed ->> 'is_private')::boolean, false),
    waits_for, coalesce((removed ->> 'created_at')::timestamptz, now()))
  on conflict (id) do nothing;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.restore_character_relationship(jsonb) is
  'Puts back a relationship the caller just deleted, with the same id, privacy and chapter (design books item 14; story 6.14).';

revoke execute on function public.restore_character_relationship(jsonb) from public, anon;
grant execute on function public.restore_character_relationship(jsonb) to authenticated;
