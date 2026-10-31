/*
 * Migration: search across a story, [[Name]] cross-links and "Mentioned in" in Story Atlas
 * (stories S1-E17-30, S1-E17-31 and the second half of S1-E17-12;
 * docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part h).
 *
 * What it adds (no new tables: everything reads what the earlier parts store):
 * - atlas_fold(): text folded for matching: lower case, with the Romanian and other common
 *   accents taken off, one letter for one letter, so a match's place in the folded text is its
 *   place in the original (the snippet relies on that).
 * - atlas_snippet(): about 160 characters of a text around the first match, with "…" where it
 *   was cut.
 * - search_story(slug, query): S1-E17-30's one search box. It searches the open story's
 *   characters (every field, the writer's own too), bible entries, chapters (the manuscript and
 *   the plan), scenes, questions and ideas, timeline events and marketing notes, and answers
 *   each match with its type, title and snippet; at most 20 per type.
 * - story_link_targets(slug): everything a [[Name]] can point to (S1-E17-31): characters by
 *   name and every "also known as", bible entries by title, chapters by title. The screen
 *   resolves the links itself, ignoring capitals, so typing never waits for the database.
 * - character_mentions(character_id): "Mentioned in" on a character sheet (S1-E17-12): the
 *   bible entries, chapters, scenes, ideas, events and other characters whose text has
 *   [[their name]] or [[an alias]], ignoring capitals.
 * Private by default (Robert, 31 Oct 2026, 08:02): every function reads only the caller's own
 * story; signed out, nothing.
 * Personal data: none new; the writer's own planning notes, read only by them.
 * Who calls it: src/features/atlas/api/search.ts and src/features/atlas/api/links.ts.
 * Tests: supabase/tests/database/197-search-and-links.test.sql.
 */

/* ---------- Helpers ---------- */

/**
 * atlas_fold: a text folded for matching, one letter for one letter.
 * Input: any text. Returns: it in lower case with common accents off ("Ștefan" → "stefan"); the
 *   length never changes, so a place found in the folded text is the same place in the original.
 * Internal: atlas_snippet() and search_story().
 */
create or replace function public.atlas_fold(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(value), 'ăâîșşțţáàäãåéèêëíìïóòôöõúùûüçñ',
                                 'aaissttaaaaaeeeeiiiooooouuuucn');
$$;

comment on function public.atlas_fold(text) is
  'Internal: text in lower case with common accents off, letter for letter (S1-E17-30).';
revoke execute on function public.atlas_fold(text) from public, anon, authenticated;

/**
 * atlas_snippet: a short piece of a text around the first match.
 * Inputs: haystack, the text searched; needle, what the writer typed.
 * Returns: about 160 characters with runs of spaces and line breaks made one space, starting a
 *   little before the match, with "…" at a cut end; the start of the text when nothing matches.
 * Internal: search_story().
 */
create or replace function public.atlas_snippet(haystack text, needle text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  -- One line of text: the screen shows a snippet on one or two lines.
  cleaned text := btrim(regexp_replace(coalesce(haystack, ''), '\s+', ' ', 'g'));
  found_at integer;
  start_at integer;
begin
  found_at := strpos(public.atlas_fold(cleaned), public.atlas_fold(needle));
  -- Start 60 characters before the match, so the reader sees what leads up to it.
  start_at := greatest(1, found_at - 60);
  return case when start_at > 1 then '…' else '' end
    || substr(cleaned, start_at, 160)
    || case when start_at + 160 <= char_length(cleaned) then '…' else '' end;
end;
$$;

comment on function public.atlas_snippet(text, text) is
  'Internal: about 160 characters of a text around the first match (S1-E17-30).';
revoke execute on function public.atlas_snippet(text, text) from public, anon, authenticated;

/**
 * jsonb_values_text: every text value of a jsonb object, joined by spaces.
 * Input: an object (a character's sheet or the writer's own fields). Returns: the values, or ''.
 * Internal: search_story() and character_mentions().
 */
create or replace function public.jsonb_values_text(document jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(string_agg(entry.value, ' '), '')
  from jsonb_each_text(coalesce(document, '{}'::jsonb)) as entry;
$$;

comment on function public.jsonb_values_text(jsonb) is
  'Internal: a jsonb object''s text values joined by spaces (S1-E17-30, S1-E17-12).';
revoke execute on function public.jsonb_values_text(jsonb) from public, anon, authenticated;

/**
 * story_search_texts: every searchable item of one story, with the text to search.
 * Input: the story's ID (the caller checked it is theirs).
 * Returns: one row per item: kind (character, entry, chapter, scene, idea, event or
 *   marketing), ref (the ID, the chapter's code or the marketing field's name), title, chapter
 *   (a scene's chapter code, else null) and haystack.
 * Internal: search_story().
 */
create or replace function public.story_search_texts(target_story_id uuid)
returns table (kind text, ref text, title text, chapter text, haystack text)
language sql
stable
security definer
set search_path = ''
as $$
  -- Characters: the name, every sheet field and the writer's own fields (S1-E17-30).
  select 'character', cast_member.id::text, cast_member.name, null::text,
    concat_ws(' ', cast_member.name, public.jsonb_values_text(cast_member.sheet),
      public.jsonb_values_text(cast_member.custom_values))
  from public.story_characters as cast_member where cast_member.story_id = target_story_id
  union all
  -- Bible entries: the title, the tags and the text.
  select 'entry', entries.id::text, entries.title, null,
    concat_ws(' ', entries.title, array_to_string(entries.tags, ' '), entries.body)
  from public.story_bible_entries as entries where entries.story_id = target_story_id
  union all
  -- Chapters: the title and the manuscript, then the plan's place, date and summary.
  select 'chapter', chapters.code, chapters.draft_title, null,
    concat_ws(' ', chapters.draft_title, chapters.draft_body, plans.location, plans.world_date,
      plans.summary)
  from public.chapters
  left join public.chapter_plans as plans on plans.chapter_id = chapters.id
  where chapters.story_id = target_story_id and chapters.deleted_at is null
  union all
  -- Scenes: the title and summary, with their chapter so the result opens it.
  select 'scene', scenes.id::text, scenes.title, chapters.code,
    concat_ws(' ', scenes.title, scenes.summary)
  from public.chapter_scenes as scenes
  join public.chapters on chapters.id = scenes.chapter_id
  where scenes.story_id = target_story_id and chapters.deleted_at is null
  union all
  -- Questions and ideas: the line and its outcome.
  select 'idea', ideas.id::text, ideas.body, null, concat_ws(' ', ideas.body, ideas.outcome)
  from public.story_ideas as ideas where ideas.story_id = target_story_id
  union all
  -- Timeline events: the title, the date as shown and the description.
  select 'event', events.id::text, events.title, null,
    concat_ws(' ', events.title, events.display_date, events.description)
  from public.story_events as events where events.story_id = target_story_id
  union all
  -- Marketing notes: one result per field, named by the field.
  select 'marketing', notes.key, notes.key, null, notes.value
  from public.story_marketing as marketing,
    jsonb_each_text(to_jsonb(marketing) - array['story_id', 'user_id', 'created_at', 'updated_at'])
      as notes
  where marketing.story_id = target_story_id;
$$;

comment on function public.story_search_texts(uuid) is
  'Internal: every searchable item of one story, with the text to search (S1-E17-30).';
revoke execute on function public.story_search_texts(uuid) from public, anon, authenticated;

/* ---------- Search (S1-E17-30) ---------- */

/**
 * search_story: one search across the open story (S1-E17-30).
 * Inputs: story_slug; query, what the writer typed (at least 2 letters once trimmed; anything
 *   past 200 characters is ignored). Matching ignores capitals and common accents.
 * Returns: { outcome: 'ok', results: [{ kind, ref, title, chapter, snippet }] }, grouped by kind
 *   in the order characters, entries, chapters, scenes, ideas, events, marketing, then by title;
 *   at most 20 per kind; an empty list for a query under 2 letters. { outcome: 'not_found' }
 *   when the story isn't the caller's. Never a user ID (rule 15).
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/search.ts.
 */
create or replace function public.search_story(story_slug text, query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  -- One space between words, as atlas_snippet() reads the text.
  wanted text := left(btrim(regexp_replace(coalesce(query, ''), '\s+', ' ', 'g')), 200);
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to search your story.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- One letter would match nearly everything; the screen asks for two.
  if char_length(wanted) < 2 then
    return jsonb_build_object('outcome', 'ok', 'results', '[]'::jsonb);
  end if;
  return jsonb_build_object('outcome', 'ok', 'results', coalesce((
    select jsonb_agg(jsonb_build_object('kind', ranked.kind, 'ref', ranked.ref,
        'title', ranked.title, 'chapter', ranked.chapter,
        'snippet', public.atlas_snippet(ranked.haystack, wanted))
      order by array_position(array['character', 'entry', 'chapter', 'scene', 'idea', 'event',
        'marketing'], ranked.kind), ranked.place)
    from (
      select texts.*, row_number() over (partition by texts.kind
        order by public.atlas_fold(texts.title), texts.ref) as place
      from public.story_search_texts(target_story_id) as texts
      where strpos(public.atlas_fold(regexp_replace(texts.haystack, '\s+', ' ', 'g')),
        public.atlas_fold(wanted)) > 0
    ) as ranked
    where ranked.place <= 20
  ), '[]'::jsonb));
end;
$$;

comment on function public.search_story(text, text) is
  'One search across the caller''s story: characters, bible, chapters, scenes, ideas, events, marketing (S1-E17-30).';
revoke execute on function public.search_story(text, text) from public, anon;
grant execute on function public.search_story(text, text) to authenticated;

/* ---------- Cross-links (S1-E17-31) ---------- */

/**
 * character_link_names: the names a [[link]] can use for one character.
 * Input: the character. Returns: the name, then each "also known as" (comma-separated on the
 *   sheet, S1-E17-09), trimmed, empty ones left out.
 * Internal: story_link_targets() and character_mentions().
 */
create or replace function public.character_link_names(target_character public.story_characters)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[btrim(target_character.name)] || coalesce(array(
    select btrim(alias) from regexp_split_to_table(
      coalesce(target_character.sheet ->> 'also_known_as', ''), ',') as alias
    where btrim(alias) <> ''), '{}');
$$;

comment on function public.character_link_names(public.story_characters) is
  'Internal: a character''s name and aliases, as [[links]] may use them (S1-E17-31).';
revoke execute on function public.character_link_names(public.story_characters)
  from public, anon, authenticated;

/**
 * story_link_targets: everything a [[Name]] in the open story can point to (S1-E17-31).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', targets: [{ kind: 'character' | 'entry' | 'chapter', ref (an ID or
 *   a chapter code), title, names: [the names that resolve to it] }] }, or
 *   { outcome: 'not_found' }. Characters answer to their name and every alias, entries and
 *   chapters to their title. The screen matches them ignoring capitals.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/links.ts.
 */
create or replace function public.story_link_targets(story_slug text)
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
    raise exception 'Sign in to see your story.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok', 'targets', coalesce((
    select jsonb_agg(targets.target order by targets.kind_place, targets.title)
    from (
      select 1 as kind_place, cast_member.name as title, jsonb_build_object('kind', 'character',
          'ref', cast_member.id, 'title', cast_member.name,
          'names', to_jsonb(public.character_link_names(cast_member))) as target
      from public.story_characters as cast_member where cast_member.story_id = target_story_id
      union all
      select 2, entries.title, jsonb_build_object('kind', 'entry', 'ref', entries.id,
          'title', entries.title, 'names', jsonb_build_array(btrim(entries.title)))
      from public.story_bible_entries as entries where entries.story_id = target_story_id
      union all
      -- A chapter without a title can't be named, so it can't be linked.
      select 3, chapters.draft_title, jsonb_build_object('kind', 'chapter', 'ref', chapters.code,
          'title', chapters.draft_title, 'names', jsonb_build_array(btrim(chapters.draft_title)))
      from public.chapters
      where chapters.story_id = target_story_id and chapters.deleted_at is null
        and btrim(chapters.draft_title) <> ''
    ) as targets
  ), '[]'::jsonb));
end;
$$;

comment on function public.story_link_targets(text) is
  'What a [[Name]] in the caller''s story can point to: characters, bible entries, chapters (S1-E17-31).';
revoke execute on function public.story_link_targets(text) from public, anon;
grant execute on function public.story_link_targets(text) to authenticated;

/**
 * character_mentions: "Mentioned in" on a character sheet (S1-E17-12).
 * Input: the character's ID.
 * Returns: { outcome: 'ok', items: [{ kind, ref, title, chapter }] }: the bible entries,
 *   chapters (manuscript or plan summary), scenes, ideas, timeline events and other characters
 *   whose text holds [[the name]] or [[an alias]], ignoring capitals; grouped by kind, then by
 *   title. { outcome: 'not_found' } when the character isn't the caller's.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/links.ts.
 */
create or replace function public.character_mentions(character_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_character public.story_characters;
  -- Each name as a link would be written, in lower case: "[[ana]]", "[[ani]]".
  wanted text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your characters.' using errcode = 'insufficient_privilege';
  end if;
  target_character := public.my_story_character(character_id);
  if target_character.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  wanted := array(select lower('[[' || name || ']]')
    from unnest(public.character_link_names(target_character)) as name);
  return jsonb_build_object('outcome', 'ok', 'items', coalesce((
    select jsonb_agg(jsonb_build_object('kind', texts.kind, 'ref', texts.ref,
        'title', texts.title, 'chapter', texts.chapter)
      order by array_position(array['character', 'entry', 'chapter', 'scene', 'idea', 'event'],
        texts.kind), lower(texts.title), texts.ref)
    from public.story_search_texts(target_character.story_id) as texts
    -- Marketing notes are for readers outside the book; the sheet doesn't list them.
    where texts.kind <> 'marketing'
      and not (texts.kind = 'character' and texts.ref = target_character.id::text)
      and exists (select 1 from unnest(wanted) as link
        where strpos(lower(texts.haystack), link) > 0)
  ), '[]'::jsonb));
end;
$$;

comment on function public.character_mentions(uuid) is
  'Where one of the caller''s characters is linked with [[their name]] or an alias (S1-E17-12).';
revoke execute on function public.character_mentions(uuid) from public, anon;
grant execute on function public.character_mentions(uuid) to authenticated;
