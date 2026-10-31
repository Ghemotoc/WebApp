/*
 * Migration: what readers can see of a story's plan (stories S1-E17-32 to S1-E17-35;
 * docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part i).
 *
 * What it adds:
 * - The writer's switches (S1-E17-32): story_plans.public_areas lists the areas readers see once
 *   the story is published (characters, relationship_map, family_tree, bible, timeline); empty
 *   by default, so nothing is public until the writer turns it on. Every character, relationship,
 *   world section, world entry and timeline event gets is_private ("Keep private"), and every
 *   character public_sheet_parts: which groups of its sheet (basics, look_and_voice, inside,
 *   in_the_story, notes) and which of the writer's own fields readers see. Inside, notes and the
 *   writer's own fields are private by default.
 * - The spoiler guard (S1-E17-35): show_from_chapter_id on characters, world entries and events.
 *   A reader sees the item only once their reading progress (reading_positions, S1-E4-03) has
 *   reached that chapter; a visitor who isn't signed in never sees it. Only "reached or not" is
 *   read, never the progress itself.
 * - The readers' view (S1-E17-33): get_public_story_plan() answers a story's public parts to
 *   anyone the story's own read rules allow: a readable chapter, the rating (rule 18), blocks and
 *   moderation, all checked here in the database. preview_story_plan() gives the writer the same
 *   answer before or after publishing ("Preview as a reader").
 * - Reporting and moderation (S1-E17-34): the 'atlas_item' branches of the shared reporting
 *   contract (architecture 1.7.11); a hidden or removed item is left out of every public answer,
 *   and a character's picture shows only once its picture check passed (rule 19), through the new
 *   atlas_images_select_public storage policy.
 * - The writer's settings: story_plan_visibility(), set_story_public_areas(),
 *   set_plan_item_privacy(), set_plan_item_show_from() and set_character_public_parts().
 * Private items never appear in any public answer, link target or link preview, and no answer
 * carries a user ID (rule 15).
 * Personal data: none new. The reader's progress is read only as "reached chapter N or not".
 * Who calls it: src/features/atlas/api/readerView.ts and src/features/atlas/api/publicPlan.ts.
 * Tests: supabase/tests/database/198-public-plan.test.sql.
 */

/* ---------- The switches ---------- */

alter table public.story_plans add column public_areas text[] not null default '{}';
alter table public.story_plans add constraint story_plans_public_areas_known check (
  public_areas <@ array['characters', 'relationship_map', 'family_tree', 'bible', 'timeline']);
comment on column public.story_plans.public_areas is
  'The plan''s areas readers see once the story is published (S1-E17-32); none by default.';

alter table public.story_characters add column is_private boolean not null default false;
alter table public.story_characters add column show_from_chapter_id uuid
  references public.chapters (id) on delete set null;
-- Inside and notes stay private until the writer opens them (S1-E17-32); the writer's own fields
-- join the list by ID, one at a time.
alter table public.story_characters add column public_sheet_parts text[] not null
  default array['basics', 'look_and_voice', 'in_the_story'];
alter table public.story_characters add constraint story_characters_public_sheet_parts_known check (
  cardinality(public_sheet_parts) <= 200);
comment on column public.story_characters.is_private is
  '"Keep private": readers never see this character, even when Characters is public (S1-E17-32).';
comment on column public.story_characters.show_from_chapter_id is
  'The spoiler guard: readers see the character only once they reached this chapter (S1-E17-35).';
comment on column public.story_characters.public_sheet_parts is
  'The sheet''s groups (basics, look_and_voice, inside, in_the_story, notes) and the writer''s own field IDs readers see (S1-E17-32).';

alter table public.story_character_relationships add column is_private boolean not null default false;
comment on column public.story_character_relationships.is_private is
  '"Keep private": readers never see this relationship (S1-E17-32).';

alter table public.story_bible_sections add column is_private boolean not null default false;
comment on column public.story_bible_sections.is_private is
  '"Keep private": readers never see this section or its entries (S1-E17-32).';

alter table public.story_bible_entries add column is_private boolean not null default false;
alter table public.story_bible_entries add column show_from_chapter_id uuid
  references public.chapters (id) on delete set null;
comment on column public.story_bible_entries.is_private is
  '"Keep private": readers never see this entry (S1-E17-32).';
comment on column public.story_bible_entries.show_from_chapter_id is
  'The spoiler guard for this entry (S1-E17-35).';

alter table public.story_events add column is_private boolean not null default false;
alter table public.story_events add column show_from_chapter_id uuid
  references public.chapters (id) on delete set null;
comment on column public.story_events.is_private is
  '"Keep private": readers never see this event (S1-E17-32).';
comment on column public.story_events.show_from_chapter_id is
  'The spoiler guard for this event (S1-E17-35).';

comment on table public.story_characters is
  'kind: user_content; reportable: atlas_item
The characters of one story''s plan in Story Atlas (S1-E17-08 to S1-E17-11): role, the sheet''s text, the writer''s own fields, the first appearance and a picture. Only the writer reads the table; readers see the public parts through get_public_story_plan() (S1-E17-33).';
comment on table public.story_character_relationships is
  'kind: user_content; reportable: atlas_item
How two characters of one story''s plan are connected (S1-E17-14). Only the writer reads the table; readers see the public ones through get_public_story_plan() (S1-E17-33).';
comment on table public.story_bible_sections is
  'kind: user_content; reportable: atlas_item
The sections of one story''s bible (S1-E17-17). Only the writer reads the table; readers see the public ones through get_public_story_plan() (S1-E17-33).';
comment on table public.story_bible_entries is
  'kind: user_content; reportable: atlas_item
The entries of one story''s bible (S1-E17-18). Only the writer reads the table; readers see the public ones through get_public_story_plan() (S1-E17-33).';
comment on table public.story_events is
  'kind: user_content; reportable: atlas_item
The in-world events on one story''s timeline (S1-E17-20). Only the writer reads the table; readers see the public ones through get_public_story_plan() (S1-E17-33).';

/* ---------- Helpers ---------- */

/**
 * plan_area_names: the areas a writer can make public, in the order the settings show them.
 * Internal: the checks and the settings answer.
 */
create or replace function public.plan_area_names()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['characters', 'relationship_map', 'family_tree', 'bible', 'timeline'];
$$;

comment on function public.plan_area_names() is
  'Internal: the plan''s areas a writer can make public (S1-E17-32).';
revoke execute on function public.plan_area_names() from public, anon, authenticated;

/**
 * character_part_keys: the sheet keys a list of public parts opens.
 * Input: parts, the groups (and field IDs, which open no sheet key). Returns: the keys.
 * Internal: public_character_json().
 */
create or replace function public.character_part_keys(parts text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(sheet_key), '{}') from (
    select unnest(array['also_known_as', 'species', 'pronouns', 'age_or_born', 'life_status',
                        'occupation', 'origin']) as sheet_key where 'basics' = any (parts)
    union all
    select unnest(array['appearance', 'distinguishing_marks', 'voice']) where 'look_and_voice' = any (parts)
    union all
    select unnest(array['personality', 'wants', 'needs', 'fear_or_wound', 'secrets', 'values_and_code'])
      where 'inside' = any (parts)
    union all
    select unnest(array['backstory', 'arc', 'key_lines']) where 'in_the_story' = any (parts)
    union all
    select 'notes' where 'notes' = any (parts)) as opened;
$$;

comment on function public.character_part_keys(text[]) is
  'Internal: the character sheet keys a list of public groups opens (S1-E17-32).';
revoke execute on function public.character_part_keys(text[]) from public, anon, authenticated;

/**
 * plan_story_readable: may the caller read this story as a reader? The story page's own rules
 * (get_story_page()): live, a readable chapter, the rating allows the caller's age (rule 18), no
 * moderator hid it and neither side blocks the other. The writer gets no exception here: the
 * readers' view is what readers see; the writer uses preview_story_plan().
 * Internal: get_public_story_plan() and atlas_picture_is_public().
 */
create or replace function public.plan_story_readable(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stories
    where stories.id = target_story_id
      and stories.deleted_at is null
      and public.story_has_readable_chapter(stories.id)
      and public.rating_allows(stories.rating)
      and not public.is_moderated_away('story', stories.id)
      and not public.is_blocked_with(stories.user_id));
$$;

comment on function public.plan_story_readable(uuid) is
  'Internal: true when the caller may read the story as a reader (S1-E17-33).';
revoke execute on function public.plan_story_readable(uuid) from public, anon, authenticated;

/**
 * reader_reached_chapter: has the caller's reading reached this chapter? (S1-E17-35)
 * Input: target_chapter_id, or null for an item without a spoiler guard (always true).
 * Returns: true when the caller has a reading position on that chapter or a later one of the
 *   same story and the chapter is published; false for a visitor who isn't signed in. Only the
 *   answer leaves the function, never the progress.
 * Internal: plan_item_shows().
 */
create or replace function public.reader_reached_chapter(target_chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_chapter_id is null or exists (
    select 1 from public.chapters as target
    join public.chapters as read_chapter on read_chapter.story_id = target.story_id
    join public.reading_positions on reading_positions.chapter_id = read_chapter.id
    where target.id = target_chapter_id
      and target.status = 'published'
      and target.deleted_at is null
      and read_chapter.position >= target.position
      and reading_positions.user_id = (select auth.uid()));
$$;

comment on function public.reader_reached_chapter(uuid) is
  'Internal: true when the caller''s reading reached the chapter, or there is no chapter (S1-E17-35).';
revoke execute on function public.reader_reached_chapter(uuid) from public, anon, authenticated;

/**
 * plan_item_shows: does one item of a public area show? Not kept private, not hidden or removed
 * by a moderator (S1-E17-34) and, for a reader, past its spoiler guard. The preview skips only
 * the guard, which it marks instead.
 * Internal: the public answer's parts.
 */
create or replace function public.plan_item_shows(
  item_id uuid,
  item_is_private boolean,
  show_from uuid,
  as_preview boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not item_is_private
    and not public.is_moderated_away('atlas_item', item_id)
    and (as_preview or public.reader_reached_chapter(show_from));
$$;

comment on function public.plan_item_shows(uuid, boolean, uuid, boolean) is
  'Internal: true when a public area''s item shows to the caller (S1-E17-32 to S1-E17-35).';
revoke execute on function public.plan_item_shows(uuid, boolean, uuid, boolean) from public, anon, authenticated;

/**
 * plan_guard_json: the spoiler guard as the preview marks it: { code, position, title }, or null.
 * Internal: the public answer's parts.
 */
create or replace function public.plan_guard_json(show_from uuid, as_preview boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when as_preview then (
    select jsonb_build_object('code', chapters.code, 'position', chapters.position,
      'title', coalesce(nullif(chapters.published_title, ''), chapters.draft_title))
    from public.chapters where chapters.id = show_from and chapters.deleted_at is null) end;
$$;

comment on function public.plan_guard_json(uuid, boolean) is
  'Internal: the chapter an item waits for, for the writer''s preview only (S1-E17-35).';
revoke execute on function public.plan_guard_json(uuid, boolean) from public, anon, authenticated;

/* ---------- The public answer's parts ---------- */

/**
 * public_character_json: one character as readers see it. The name, role and picture always (the
 * map and the tree need them); the sheet's open groups, the open custom fields and the first
 * appearance (with In the story, when that chapter is readable) only while Characters is public.
 * Internal: public_plan_characters().
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

comment on function public.public_character_json(public.story_characters, boolean, boolean) is
  'Internal: one character as readers see it, with only the sheet''s open parts (S1-E17-32, S1-E17-33).';
revoke execute on function public.public_character_json(public.story_characters, boolean, boolean) from public, anon, authenticated;

/**
 * public_plan_characters: the characters that show, by name, while any of Characters, the
 * relationship map or the family tree is public.
 * Internal: public_plan_json().
 */
create or replace function public.public_plan_characters(
  target_story_id uuid,
  areas text[],
  as_preview boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.public_character_json(characters, 'characters' = any (areas), as_preview)
      order by lower(characters.name), characters.created_at), '[]'::jsonb)
  from public.story_characters as characters
  where characters.story_id = target_story_id
    and areas && array['characters', 'relationship_map', 'family_tree']
    and public.plan_item_shows(characters.id, characters.is_private, characters.show_from_chapter_id, as_preview);
$$;

comment on function public.public_plan_characters(uuid, text[], boolean) is
  'Internal: the characters that show to readers (S1-E17-33).';
revoke execute on function public.public_plan_characters(uuid, text[], boolean) from public, anon, authenticated;

/**
 * public_plan_fields: the writer's own fields some shown character opened, by position, so a
 * private field's name never shows either.
 * Internal: public_plan_json().
 */
create or replace function public.public_plan_fields(
  target_story_id uuid,
  areas text[],
  as_preview boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', fields.id, 'name', fields.name)
      order by fields.position, fields.created_at), '[]'::jsonb)
  from public.story_character_fields as fields
  where fields.story_id = target_story_id
    and fields.hidden_at is null
    and 'characters' = any (areas)
    and exists (
      select 1 from public.story_characters as characters
      where characters.story_id = target_story_id
        and fields.id::text = any (characters.public_sheet_parts)
        and public.plan_item_shows(characters.id, characters.is_private, characters.show_from_chapter_id, as_preview));
$$;

comment on function public.public_plan_fields(uuid, text[], boolean) is
  'Internal: the names of the writer''s own fields readers see (S1-E17-32).';
revoke execute on function public.public_plan_fields(uuid, text[], boolean) from public, anon, authenticated;

/**
 * public_plan_relationships: the relationships that show while the map or the family tree is
 * public: not kept private and both characters shown. The writer's note stays private.
 * Internal: public_plan_json().
 */
create or replace function public.public_plan_relationships(
  target_story_id uuid,
  areas text[],
  as_preview boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', links.id, 'from', links.from_character_id,
      'to', links.to_character_id, 'kind', links.kind, 'custom_label', links.custom_label)
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

comment on function public.public_plan_relationships(uuid, text[], boolean) is
  'Internal: the relationships readers see, without the writer''s notes (S1-E17-33).';
revoke execute on function public.public_plan_relationships(uuid, text[], boolean) from public, anon, authenticated;

/**
 * public_plan_bible: the world (the story bible) while it is public: each shown section with its
 * shown entries, in the writer's order; a section with no entry to show is left out.
 * Internal: public_plan_json().
 */
create or replace function public.public_plan_bible(
  target_story_id uuid,
  areas text[],
  as_preview boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(section_json order by section_position), '[]'::jsonb) from (
    select sections.position as section_position,
      jsonb_build_object('id', sections.id, 'preset', sections.preset, 'name', sections.name,
        'entries', jsonb_agg(jsonb_build_object('id', entries.id, 'title', entries.title,
            'tags', to_jsonb(entries.tags), 'body', entries.body,
            'show_from', public.plan_guard_json(entries.show_from_chapter_id, as_preview))
          order by lower(entries.title), entries.created_at)) as section_json
    from public.story_bible_sections as sections
    join public.story_bible_entries as entries on entries.section_id = sections.id
    where sections.story_id = target_story_id
      and 'bible' = any (areas)
      and public.plan_item_shows(sections.id, sections.is_private, null, as_preview)
      and public.plan_item_shows(entries.id, entries.is_private, entries.show_from_chapter_id, as_preview)
    group by sections.id) as shown_sections;
$$;

comment on function public.public_plan_bible(uuid, text[], boolean) is
  'Internal: the world sections and entries readers see (S1-E17-33).';
revoke execute on function public.public_plan_bible(uuid, text[], boolean) from public, anon, authenticated;

/**
 * public_plan_events: the timeline's events while it is public, in in-world order.
 * Internal: public_plan_json().
 */
create or replace function public.public_plan_events(
  target_story_id uuid,
  areas text[],
  as_preview boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', events.id, 'title', events.title,
      'display_date', events.display_date, 'sort_value', events.sort_value,
      'description', events.description,
      'show_from', public.plan_guard_json(events.show_from_chapter_id, as_preview))
      order by events.sort_value, events.created_at), '[]'::jsonb)
  from public.story_events as events
  where events.story_id = target_story_id
    and 'timeline' = any (areas)
    and public.plan_item_shows(events.id, events.is_private, events.show_from_chapter_id, as_preview);
$$;

comment on function public.public_plan_events(uuid, text[], boolean) is
  'Internal: the timeline events readers see (S1-E17-33).';
revoke execute on function public.public_plan_events(uuid, text[], boolean) from public, anon, authenticated;

/**
 * public_plan_json: everything readers see of one story's plan.
 * Inputs: target_story_id; as_preview, true for the writer's preview (no spoiler guard, marked
 *   instead). Returns: { story: { slug, title }, areas, characters, fields, relationships,
 *   sections, events, chapters } where chapters are the readable ones, for [[Name]] links to a
 *   chapter. Never a user ID (rule 15).
 * Internal: get_public_story_plan() and preview_story_plan().
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
begin
  -- Step 1: the areas the writer made public, in the settings' order.
  select array(select area from unnest(public.plan_area_names()) as area
               where area = any (story_plans.public_areas))
    into areas
  from public.story_plans where story_plans.story_id = target_story_id;
  areas := coalesce(areas, '{}');
  -- Step 2: each area's items that show.
  return (select jsonb_build_object(
    'story', jsonb_build_object('slug', stories.slug, 'title', stories.title),
    'areas', to_jsonb(areas),
    'characters', public.public_plan_characters(stories.id, areas, as_preview),
    'fields', public.public_plan_fields(stories.id, areas, as_preview),
    'relationships', public.public_plan_relationships(stories.id, areas, as_preview),
    'sections', public.public_plan_bible(stories.id, areas, as_preview),
    'events', public.public_plan_events(stories.id, areas, as_preview),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'title', chapters.published_title)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)), '[]'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$$;

comment on function public.public_plan_json(uuid, boolean) is
  'Internal: everything readers see of one story''s plan (S1-E17-33).';
revoke execute on function public.public_plan_json(uuid, boolean) from public, anon, authenticated;

/* ---------- Reading ---------- */

/**
 * get_public_story_plan: a story's public plan, for the story page's tabs and the readers' pages
 * (S1-E17-33).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', … public_plan_json() } when the caller may read the story (the same
 *   rules as its page: a readable chapter, the rating, blocks, moderation), else
 *   { outcome: 'not_found' }, the same answer as for a story that doesn't exist. Signed-out
 *   visitors get it too, without any item behind a spoiler guard (S1-E17-35).
 * Who calls it: src/features/atlas/api/publicPlan.ts.
 */
create or replace function public.get_public_story_plan(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  select stories.id into target_story_id from public.stories
  where stories.slug = story_slug and stories.deleted_at is null;
  if target_story_id is null or not public.plan_story_readable(target_story_id) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok') || public.public_plan_json(target_story_id, false);
end;
$$;

comment on function public.get_public_story_plan(text) is
  'The public parts of a story''s plan, for anyone who may read the story (S1-E17-33).';
revoke execute on function public.get_public_story_plan(text) from public;
grant execute on function public.get_public_story_plan(text) to anon, authenticated;

/**
 * preview_story_plan: "Preview as a reader" (S1-E17-32): what readers see, before or after
 * publishing, with each spoiler guard shown instead of applied.
 * Input: the story's slug.
 * Returns: { outcome: 'ok', is_published, … public_plan_json() } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/readerView.ts.
 */
create or replace function public.preview_story_plan(story_slug text)
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
    raise exception 'Sign in to preview your story.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok',
      'is_published', public.story_has_readable_chapter(target_story_id))
    || public.public_plan_json(target_story_id, true);
end;
$$;

comment on function public.preview_story_plan(text) is
  'The writer''s own preview of what readers see of their plan (S1-E17-32).';
revoke execute on function public.preview_story_plan(text) from public, anon;
grant execute on function public.preview_story_plan(text) to authenticated;

/**
 * story_plan_visibility: the writer's own switches for one story (S1-E17-32, S1-E17-35).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', areas, items: { "<item ID>": { is_private, show_from } } for every
 *   character, relationship, section, entry and event (show_from is a chapter code or null),
 *   sheet_parts: { "<character ID>": [...] }, chapters: [{ code, position, title }] for the
 *   spoiler guard's list }, or { outcome: 'not_found' }.
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
        select id, is_private, null from public.story_character_relationships where story_id = target_story_id
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
  'The writer''s own "What readers can see" switches for one story (S1-E17-32).';
revoke execute on function public.story_plan_visibility(text) from public, anon;
grant execute on function public.story_plan_visibility(text) to authenticated;

/* ---------- Changing ---------- */

/**
 * set_story_public_areas: the "What readers can see" switches (S1-E17-32). Turning an area off
 * takes it away from readers at once: every public answer reads the switches live.
 * Inputs: story_slug; areas, the areas to make public (any of plan_area_names()).
 * Returns: { outcome: 'ok', areas } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_area.
 */
create or replace function public.set_story_public_areas(story_slug text, areas text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  saved_areas text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your settings.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if not coalesce(areas, '{}') <@ public.plan_area_names() then
    raise exception 'Unknown area.' using errcode = 'check_violation', hint = 'unknown_area';
  end if;
  -- Each area once, in the settings' order.
  update public.story_plans
  set public_areas = array(select area from unnest(public.plan_area_names()) as area
                           where area = any (coalesce(set_story_public_areas.areas, '{}')))
  where story_plans.story_id = target_story_id
  returning public_areas into saved_areas;
  return jsonb_build_object('outcome', 'ok', 'areas', to_jsonb(saved_areas));
end;
$$;

comment on function public.set_story_public_areas(text, text[]) is
  'Sets which areas of the caller''s plan readers see (S1-E17-32).';
revoke execute on function public.set_story_public_areas(text, text[]) from public, anon;
grant execute on function public.set_story_public_areas(text, text[]) to authenticated;

/**
 * my_plan_item_kind: which of the caller's plan tables holds this item, on a live story.
 * Input: the item's ID. Returns: character, relationship, section, entry or event; null when it
 *   isn't the caller's.
 * Internal: the setters below.
 */
create or replace function public.my_plan_item_kind(target_item_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select item.kind from (
    select 'character' as kind, story_id, user_id from public.story_characters where id = target_item_id
    union all
    select 'relationship', story_id, user_id from public.story_character_relationships where id = target_item_id
    union all
    select 'section', story_id, user_id from public.story_bible_sections where id = target_item_id
    union all
    select 'entry', story_id, user_id from public.story_bible_entries where id = target_item_id
    union all
    select 'event', story_id, user_id from public.story_events where id = target_item_id
  ) as item
  join public.stories on stories.id = item.story_id
  where item.user_id = (select auth.uid()) and stories.deleted_at is null
  limit 1;
$$;

comment on function public.my_plan_item_kind(uuid) is
  'Internal: the kind of one of the caller''s plan items on a live story, or null (S1-E17-32).';
revoke execute on function public.my_plan_item_kind(uuid) from public, anon, authenticated;

/**
 * set_plan_item_privacy: "Keep private" on one character, relationship, world section, world
 * entry or event (S1-E17-32).
 * Inputs: item_id; keep_private. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.set_plan_item_privacy(item_id uuid, keep_private boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_kind text;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your settings.' using errcode = 'insufficient_privilege';
  end if;
  item_kind := public.my_plan_item_kind(item_id);
  if item_kind is null or keep_private is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  case item_kind
    when 'character' then update public.story_characters set is_private = keep_private where id = item_id;
    when 'relationship' then update public.story_character_relationships set is_private = keep_private where id = item_id;
    when 'section' then update public.story_bible_sections set is_private = keep_private where id = item_id;
    when 'entry' then update public.story_bible_entries set is_private = keep_private where id = item_id;
    when 'event' then update public.story_events set is_private = keep_private where id = item_id;
  end case;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_plan_item_privacy(uuid, boolean) is
  'Keeps one of the caller''s plan items private, or lets it show with its area (S1-E17-32).';
revoke execute on function public.set_plan_item_privacy(uuid, boolean) from public, anon;
grant execute on function public.set_plan_item_privacy(uuid, boolean) to authenticated;

/**
 * set_plan_item_show_from: the spoiler guard, "Show from chapter N" (S1-E17-35).
 * Inputs: item_id, a character, world entry or event; chapter_code, one of the same story's
 *   chapters, or null or '' to show it from the start.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint no_guard for a
 *   relationship or section (they follow their characters or entries), unknown_chapter for a
 *   chapter that isn't the story's.
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
  if item_kind not in ('character', 'entry', 'event') then
    raise exception 'Only characters, entries and events wait for a chapter.'
      using errcode = 'check_violation', hint = 'no_guard';
  end if;
  -- Step 2: the chapter, one of the same story's.
  select coalesce(
      (select story_id from public.story_characters where id = item_id),
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
    when 'entry' then update public.story_bible_entries set show_from_chapter_id = guard_chapter_id where id = item_id;
    when 'event' then update public.story_events set show_from_chapter_id = guard_chapter_id where id = item_id;
  end case;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_plan_item_show_from(uuid, text) is
  'Sets or clears the chapter a public character, entry or event waits for (S1-E17-35).';
revoke execute on function public.set_plan_item_show_from(uuid, text) from public, anon;
grant execute on function public.set_plan_item_show_from(uuid, text) to authenticated;

/**
 * set_character_public_parts: which groups of one sheet (and which of the writer's own fields)
 * readers see (S1-E17-32).
 * Inputs: character_id; parts, any of basics, look_and_voice, inside, in_the_story and notes,
 *   plus the IDs of the story's own fields.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_part.
 */
create or replace function public.set_character_public_parts(character_id uuid, parts text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your settings.' using errcode = 'insufficient_privilege';
  end if;
  if public.my_plan_item_kind(character_id) is distinct from 'character' then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select story_id into target_story_id from public.story_characters where id = character_id;
  -- Every part is a group or one of this story's own fields.
  if exists (
    select 1 from unnest(coalesce(parts, '{}')) as part
    where part not in ('basics', 'look_and_voice', 'inside', 'in_the_story', 'notes')
      and not exists (select 1 from public.story_character_fields as fields
                      where fields.story_id = target_story_id and fields.id::text = part)) then
    raise exception 'Unknown part of a character sheet.' using errcode = 'check_violation', hint = 'unknown_part';
  end if;
  update public.story_characters
  set public_sheet_parts = array(select distinct part from unnest(coalesce(parts, '{}')) as part order by part)
  where id = character_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_character_public_parts(uuid, text[]) is
  'Sets which parts of one of the caller''s character sheets readers see (S1-E17-32).';
revoke execute on function public.set_character_public_parts(uuid, text[]) from public, anon;
grant execute on function public.set_character_public_parts(uuid, text[]) to authenticated;

/* ---------- Pictures (rule 19) ---------- */

/**
 * atlas_picture_is_public: may the caller see this Story Atlas picture as a reader? Only a
 * picture that passed its check, on a character readers see, of a story the caller may read.
 * Input: object_name, the path inside `atlas-images`.
 * Where it fits: the atlas_images_select_public policy.
 */
create or replace function public.atlas_picture_is_public(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.picture_checks
    join public.story_characters as characters on characters.picture_id = picture_checks.id
    join public.story_plans on story_plans.story_id = characters.story_id
    where picture_checks.bucket = 'atlas-images'
      and picture_checks.path = object_name
      and public.picture_is_visible(picture_checks.bucket, picture_checks.path)
      and story_plans.public_areas && array['characters', 'relationship_map', 'family_tree']
      and public.plan_item_shows(characters.id, characters.is_private, characters.show_from_chapter_id, false)
      and public.plan_story_readable(characters.story_id));
$$;

comment on function public.atlas_picture_is_public(text) is
  'True when a Story Atlas picture passed its check and belongs to a character readers see (S1-E17-33, S1-E17-34).';
revoke execute on function public.atlas_picture_is_public(text) from public;
grant execute on function public.atlas_picture_is_public(text) to anon, authenticated;

/**
 * Policy atlas_images_select_public: readers (signed in or not) read the picture of a character
 * the writer made public, once its picture check passed. Why: the public cast, map and tree show
 * the portraits (S1-E17-33); everything else in the bucket stays the writer's.
 */
create policy atlas_images_select_public
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'atlas-images' and public.atlas_picture_is_public(name));

comment on policy atlas_images_select_public on storage.objects is
  'Allows anyone who may read a story to see a passed picture of a character its writer made public (S1-E17-33; rule 19).';

/* ---------- Reporting and moderation (S1-E17-34) ---------- */

/**
 * plan_item_row: one plan item for the reporting contract, whoever owns it.
 * Input: the item's ID. Returns: its kind, story, owner, a short title, whether it is kept
 *   private, and, for an entry or a relationship, whether its section or one of its characters is.
 * Internal: plan_item_is_public(), reportable_item_owner(), reportable_item_summary(),
 *   case_item_content() and notification_item_json().
 */
create or replace function public.plan_item_row(target_item_id uuid)
returns table (item_kind text, story_id uuid, owner_user_id uuid, title text, item_is_private boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select 'character', characters.story_id, characters.user_id, characters.name, characters.is_private
  from public.story_characters as characters where characters.id = target_item_id
  union all
  select 'relationship', links.story_id, links.user_id, format('%s and %s', from_character.name, to_character.name),
    links.is_private or from_character.is_private or to_character.is_private
  from public.story_character_relationships as links
  join public.story_characters as from_character on from_character.id = links.from_character_id
  join public.story_characters as to_character on to_character.id = links.to_character_id
  where links.id = target_item_id
  union all
  select 'section', sections.story_id, sections.user_id, coalesce(nullif(sections.name, ''), sections.preset), sections.is_private
  from public.story_bible_sections as sections where sections.id = target_item_id
  union all
  select 'entry', entries.story_id, entries.user_id, entries.title, entries.is_private or sections.is_private
  from public.story_bible_entries as entries
  join public.story_bible_sections as sections on sections.id = entries.section_id
  where entries.id = target_item_id
  union all
  select 'event', events.story_id, events.user_id, events.title, events.is_private
  from public.story_events as events where events.id = target_item_id;
$$;

comment on function public.plan_item_row(uuid) is
  'Internal: one Story Atlas item''s kind, story, owner and title, for reporting (S1-E17-34).';
revoke execute on function public.plan_item_row(uuid) from public, anon, authenticated;

/**
 * plan_item_area_is_public: is the area this kind of item belongs to public in its story?
 * Internal: plan_item_is_public().
 */
create or replace function public.plan_item_area_is_public(item_kind text, areas text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case item_kind
    when 'character' then areas && array['characters', 'relationship_map', 'family_tree']
    when 'relationship' then areas && array['relationship_map', 'family_tree']
    when 'section' then 'bible' = any (areas)
    when 'entry' then 'bible' = any (areas)
    when 'event' then 'timeline' = any (areas)
    else false end;
$$;

comment on function public.plan_item_area_is_public(text, text[]) is
  'Internal: true when the area of a kind of Story Atlas item is public (S1-E17-34).';
revoke execute on function public.plan_item_area_is_public(text, text[]) from public, anon, authenticated;

/**
 * plan_item_is_public: can readers see this item at all? Not kept private, in a public area of a
 * live, published story. A private item can't be reported, so its existence never leaks.
 * Internal: reportable_item_owner().
 */
create or replace function public.plan_item_is_public(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plan_item_row(target_item_id) as item
    join public.stories on stories.id = item.story_id
    join public.story_plans on story_plans.story_id = item.story_id
    where not item.item_is_private
      and stories.deleted_at is null
      and stories.first_published_at is not null
      and public.plan_item_area_is_public(item.item_kind, story_plans.public_areas));
$$;

comment on function public.plan_item_is_public(uuid) is
  'Internal: true when readers can see a Story Atlas item (S1-E17-34).';
revoke execute on function public.plan_item_is_public(uuid) from public, anon, authenticated;

/**
 * plan_item_address: where readers see an item: the character's page, or the area's page.
 * Internal: notification_item_json().
 */
create or replace function public.plan_item_address(target_item_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select '/s/' || stories.slug || '/atlas/' || case item.item_kind
      when 'character' then 'characters/' || target_item_id
      when 'relationship' then 'map'
      when 'event' then 'timeline'
      else 'world' end
  from public.plan_item_row(target_item_id) as item
  join public.stories on stories.id = item.story_id;
$$;

comment on function public.plan_item_address(uuid) is
  'Internal: the reader page that shows a Story Atlas item (S1-E17-34).';
revoke execute on function public.plan_item_address(uuid) from public, anon, authenticated;

/**
 * plan_item_content: what readers saw of an item, for the case page and evidence pack: its kind,
 * title and public text (a character's open sheet parts, an entry's text, an event's text, a
 * relationship's type and label).
 * Internal: case_item_content().
 */
create or replace function public.plan_item_content(target_item_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('kind', item.item_kind, 'title', item.title,
    'text', case item.item_kind
      when 'character' then (select public.public_character_json(characters, true, true)
                             from public.story_characters as characters where characters.id = target_item_id)
      when 'relationship' then (select jsonb_build_object('kind', links.kind, 'custom_label', links.custom_label)
                                from public.story_character_relationships as links where links.id = target_item_id)
      when 'entry' then (select to_jsonb(entries.body) from public.story_bible_entries as entries
                         where entries.id = target_item_id)
      when 'event' then (select to_jsonb(events.display_date || ' ' || events.description)
                         from public.story_events as events where events.id = target_item_id)
      else to_jsonb(item.title) end)
  from public.plan_item_row(target_item_id) as item;
$$;

comment on function public.plan_item_content(uuid) is
  'Internal: what readers saw of a Story Atlas item, for moderators (S1-E17-34).';
revoke execute on function public.plan_item_content(uuid) from public, anon, authenticated;

/* ---------- The shared reporting and notification contracts ---------- */

/**
 * reportable_item_owner: as in S1-E3-10, plus the 'atlas_item' branch: a Story Atlas item readers
 * can see (S1-E17-34); a private one answers as if it didn't exist.
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
    when 'embed' then
      return query
        select chapter_embeds.id, chapter_embeds.user_id from public.chapter_embeds
        join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapter_embeds.id = item_reference::uuid
          and chapter_embeds.deleted_at is null
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    -- A Story Atlas item only while readers can see it, so a private one never leaks (S1-E17-34).
    when 'atlas_item' then
      return query
        select item_reference::uuid, item.owner_user_id
        from public.plan_item_row(case when is_row_id then item_reference::uuid end) as item
        where public.plan_item_is_public(item_reference::uuid);
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;
comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10; atlas_item S1-E17-34).';

/**
 * reportable_item_summary: as in S1-E3-10, and a Story Atlas item says what it is and whose world:
 * 'Character "Ana" in the world of <story>' (S1-E17-34).
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
    when 'embed' then
      select format('%s from %s in chapter %s of %s',
          case when chapter_embeds.service in ('spotify', 'apple_music') then 'Music' else 'Video' end,
          case chapter_embeds.service when 'youtube' then 'YouTube' when 'vimeo' then 'Vimeo'
            when 'loom' then 'Loom' when 'spotify' then 'Spotify' else 'Apple Music' end,
          chapters.position, stories.title)
        into summary
      from public.chapter_embeds
      join public.chapters on chapters.id = chapter_embeds.chapter_id
      join public.stories on stories.id = chapters.story_id
      where chapter_embeds.id = item_id;
    when 'atlas_item' then
      select format('%s "%s" in the world of %s',
          case item.item_kind when 'character' then 'Character' when 'relationship' then 'Relationship between'
            when 'section' then 'World section' when 'entry' then 'World entry' else 'Timeline event' end,
          item.title, stories.title)
        into summary
      from public.plan_item_row(item_id) as item
      join public.stories on stories.id = item.story_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in S1-E3-10, and what readers saw of a Story Atlas item (S1-E17-34).
 */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then (select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
        'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
        'checked_at', picture_checks.checked_at) from public.picture_checks where picture_checks.id = target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
  end;
$$;

/**
 * notification_item_json: as in S1-E3-10, and a Story Atlas item links to the reader page that
 * shows it (S1-E17-34).
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
          when 'chapter_picture' then (select '/s/' || stories.slug || '/' || chapters.code
            from public.chapters join public.stories on stories.id = chapters.story_id
            where chapters.id = picture_checks.chapter_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
      when 'embed' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapter_embeds join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id where chapter_embeds.id = cases.item_id)
      when 'atlas_item' then public.plan_item_address(cases.item_id)
    end)
  from public.cases where cases.id = case_id;
$$;
