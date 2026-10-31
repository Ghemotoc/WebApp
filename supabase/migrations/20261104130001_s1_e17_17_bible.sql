/*
 * Migration: the story bible in Story Atlas (stories S1-E17-17 and S1-E17-18;
 * docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part d).
 *
 * What it adds:
 * - story_bible_sections: the sections of one story's bible, in the writer's order. Every plan
 *   starts with the seven default sections of S1-E17-17 (Premise and themes, World and places,
 *   Magic and rules, Cosmology and belief, Factions and organisations, History, Glossary). A
 *   default section keeps a `preset` key and an empty name, so the screen shows its name in the
 *   writer's language; renaming it stores the writer's own name.
 * - story_bible_entries: the entries inside each section (S1-E17-18): a title, tags and free text
 *   in the Markdown subset (CLAUDE.md rule 8: checked on save here, sanitised again on display).
 * - make_story_plan() again, now also making the seven sections, and a backfill for every plan
 *   made before the bible.
 * - story_bible(), and the functions to add, rename, move and delete sections and to create,
 *   change and delete entries. Only an empty section can be deleted (S1-E17-17).
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer reads or changes the bible.
 * Personal data: the writer's own planning notes, read only by them; no new processor.
 * Who calls it: src/features/atlas/api/bible.ts.
 * Tests: supabase/tests/database/193-story-bible.test.sql.
 */

/* ---------- Sections ---------- */

create table public.story_bible_sections (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- One of the seven defaults (shown in the writer's language), or null for the writer's own.
  preset text,
  -- The writer's own name; empty while a default section keeps its default name.
  name text not null default '',
  -- 1, 2, 3 …: the section's place in the bible.
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_bible_sections_preset_known check (
    preset is null
    or preset in ('premise', 'world', 'magic', 'cosmology', 'factions', 'history', 'glossary')
  ),
  -- A section of the writer's own always has a name; a default one may fall back on its preset.
  constraint story_bible_sections_named check (
    char_length(name) <= 80 and (preset is not null or char_length(btrim(name)) >= 1)
  ),
  constraint story_bible_sections_position_counts_from_one check (position >= 1),
  -- Checked at the end of the transaction, so a move can shift the others first.
  constraint story_bible_sections_one_per_place unique (story_id, position) deferrable initially deferred
);

comment on table public.story_bible_sections is
  'kind: user_content; reportable: story
The sections of one story''s bible (S1-E17-17), in the writer''s order. Only the writer reads them.';
comment on column public.story_bible_sections.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';
comment on column public.story_bible_sections.preset is
  'premise, world, magic, cosmology, factions, history or glossary for the seven default sections; null for the writer''s own.';

create index story_bible_sections_story_id_idx on public.story_bible_sections (story_id);

create trigger story_bible_sections_set_updated_at
  before update on public.story_bible_sections
  for each row execute function public.set_updated_at();

create trigger story_bible_sections_refuse_user_id_change
  before update on public.story_bible_sections
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_bible_sections enable row level security;

-- The writer reads their own sections; every write goes through the functions below.
grant select on public.story_bible_sections to authenticated;

/**
 * story_bible_sections_select_own: the writer reads the sections of their own bibles. Nobody
 * else, staff included, reads them through the app (private by default).
 */
create policy story_bible_sections_select_own
  on public.story_bible_sections for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_bible_sections_select_own on public.story_bible_sections is
  'Allows a writer to read the sections of their own story bibles, and nobody else (S1-E17-17).';

/* ---------- Entries ---------- */

create table public.story_bible_entries (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- No action (checked at the end of the statement): delete_bible_section() deletes only an
  -- empty section (S1-E17-17), and a purged story still takes its sections and entries together.
  section_id uuid not null references public.story_bible_sections (id) on delete no action,
  title text not null,
  -- Short labels the writer chooses ("city", "north"), at most 20.
  tags text[] not null default '{}',
  -- Free text in the Markdown subset (rule 8), checked by check_bible_text() on save.
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_bible_entries_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint story_bible_entries_tag_count check (cardinality(tags) <= 20),
  constraint story_bible_entries_body_length check (char_length(body) <= 100000)
);

comment on table public.story_bible_entries is
  'kind: user_content; reportable: story
The entries of one story''s bible (S1-E17-18): a title, tags and free text. Only the writer reads them.';
comment on column public.story_bible_entries.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index story_bible_entries_story_id_idx on public.story_bible_entries (story_id);
create index story_bible_entries_section_id_idx on public.story_bible_entries (section_id);

create trigger story_bible_entries_set_updated_at
  before update on public.story_bible_entries
  for each row execute function public.set_updated_at();

create trigger story_bible_entries_refuse_user_id_change
  before update on public.story_bible_entries
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_bible_entries enable row level security;

grant select on public.story_bible_entries to authenticated;

/**
 * story_bible_entries_select_own: the writer reads the entries of their own bibles. Nobody else,
 * staff included, reads them through the app (private by default).
 */
create policy story_bible_entries_select_own
  on public.story_bible_entries for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_bible_entries_select_own on public.story_bible_entries is
  'Allows a writer to read the entries of their own story bibles, and nobody else (S1-E17-18).';

/* ---------- Every plan gets the default sections ---------- */

/**
 * make_bible_sections: gives one plan the seven default sections of S1-E17-17, unless it already
 * has sections. Input: the story's ID and its writer. Internal: make_story_plan() and the backfill.
 */
create or replace function public.make_bible_sections(plan_story_id uuid, writer_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.story_bible_sections (story_id, user_id, preset, position)
  select plan_story_id, writer_id, defaults.preset, defaults.position
  from (values (1, 'premise'), (2, 'world'), (3, 'magic'), (4, 'cosmology'), (5, 'factions'),
               (6, 'history'), (7, 'glossary')) as defaults (position, preset)
  where not exists (select 1 from public.story_bible_sections where story_id = plan_story_id);
$$;

comment on function public.make_bible_sections(uuid, uuid) is
  'Internal: the seven default bible sections for a plan that has none (S1-E17-17).';
revoke execute on function public.make_bible_sections(uuid, uuid) from public, anon, authenticated;

/**
 * make_story_plan: as in …_s1_e17_01_story_plans.sql (the plan and its three acts), plus the
 * bible's default sections (S1-E17-01: "its plan has the default bible sections").
 * Returns: the new row, unchanged.
 */
create or replace function public.make_story_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the plan, with the defaults of S1-E17-01 (a 90,000-word target).
  insert into public.story_plans (story_id, user_id) values (new.id, new.user_id)
  on conflict (story_id) do nothing;
  -- Step 2: the three acts every plan starts with.
  insert into public.story_plan_acts (story_id, user_id, position, name)
  values (new.id, new.user_id, 1, 'Act I'), (new.id, new.user_id, 2, 'Act II'), (new.id, new.user_id, 3, 'Act III')
  on conflict (story_id, position) do nothing;
  -- Step 3: the bible's seven default sections (S1-E17-17).
  perform public.make_bible_sections(new.id, new.user_id);
  return new;
end;
$$;

comment on function public.make_story_plan() is
  'Trigger: makes a new story''s plan, its three acts and its default bible sections (S1-E17-01, S1-E17-17).';

-- The plans made before the bible: each gets its default sections now.
select public.make_bible_sections(story_plans.story_id, story_plans.user_id) from public.story_plans;

/* ---------- Checks ---------- */

/**
 * check_bible_text: the save-time rule for an entry's text (CLAUDE.md rule 8).
 * Input: the text. Returns: the text with ş and ţ corrected and the ends trimmed.
 * Errors: check_violation with hint too_long over 100,000 characters, html for raw HTML tags,
 *   script_link for javascript:, data: or vbscript: links (the same rule as comments).
 * Internal: update_bible_entry().
 */
create or replace function public.check_bible_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
begin
  if char_length(clean_body) > 100000 then
    raise exception 'An entry holds at most 100,000 characters.' using errcode = 'check_violation', hint = 'too_long';
  end if;
  -- No raw HTML; escaped text ("\<b\>") is the literal words, as for chapters and comments.
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in an entry (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'html';
  end if;
  if clean_body ~* '(javascript|data|vbscript)\s*:' then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).'
      using errcode = 'check_violation', hint = 'script_link';
  end if;
  return clean_body;
end;
$$;

comment on function public.check_bible_text(text) is
  'Internal: refuses over-long, HTML and script-link entry text; corrects ş/ţ (S1-E17-18, rule 8).';
revoke execute on function public.check_bible_text(text) from public, anon, authenticated;

/**
 * clean_bible_tags: an entry's tags, trimmed, without empties or repeats.
 * Input: a jsonb array of strings. Returns: the tags as text[].
 * Errors: check_violation with hint bad_tags when it isn't an array of strings, a tag is over 40
 *   characters or there are more than 20.
 * Internal: update_bible_entry().
 */
create or replace function public.clean_bible_tags(raw_tags jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text[];
begin
  if jsonb_typeof(raw_tags) <> 'array'
     or exists (select 1 from jsonb_array_elements(raw_tags) as tag where jsonb_typeof(tag) <> 'string') then
    raise exception 'Tags are a list of words.' using errcode = 'check_violation', hint = 'bad_tags';
  end if;
  -- Trimmed, empties dropped, each kept once in the order typed.
  select coalesce(array_agg(tag order by first_place), '{}') into cleaned
  from (select btrim(tags.value) as tag, min(tags.place) as first_place
        from jsonb_array_elements_text(raw_tags) with ordinality as tags (value, place)
        where btrim(tags.value) <> ''
        group by btrim(tags.value)) as unique_tags;
  if cardinality(cleaned) > 20 or exists (select 1 from unnest(cleaned) as tag where char_length(tag) > 40) then
    raise exception 'An entry has at most 20 tags of up to 40 characters.'
      using errcode = 'check_violation', hint = 'bad_tags';
  end if;
  return cleaned;
end;
$$;

comment on function public.clean_bible_tags(jsonb) is
  'Internal: trims and de-duplicates an entry''s tags; at most 20 of up to 40 characters (S1-E17-18).';
revoke execute on function public.clean_bible_tags(jsonb) from public, anon, authenticated;

/* ---------- Finding the caller's rows ---------- */

/**
 * my_bible_section: one of the caller's sections, in a story of theirs that isn't deleted.
 * Returns: the row, or nulls. Internal: the section and entry functions.
 */
create or replace function public.my_bible_section(target_section_id uuid)
returns public.story_bible_sections
language sql
stable
security definer
set search_path = ''
as $$
  select story_bible_sections.* from public.story_bible_sections
  join public.stories on stories.id = story_bible_sections.story_id
  where story_bible_sections.id = target_section_id
    and story_bible_sections.user_id = (select auth.uid())
    and stories.deleted_at is null;
$$;

comment on function public.my_bible_section(uuid) is
  'Internal: one of the caller''s bible sections, in a story of theirs that isn''t deleted (S1-E17-17).';
revoke execute on function public.my_bible_section(uuid) from public, anon, authenticated;

/**
 * my_bible_entry: one of the caller's entries, in a story of theirs that isn't deleted.
 * Returns: the row, or nulls. Internal: the entry functions.
 */
create or replace function public.my_bible_entry(target_entry_id uuid)
returns public.story_bible_entries
language sql
stable
security definer
set search_path = ''
as $$
  select story_bible_entries.* from public.story_bible_entries
  join public.stories on stories.id = story_bible_entries.story_id
  where story_bible_entries.id = target_entry_id
    and story_bible_entries.user_id = (select auth.uid())
    and stories.deleted_at is null;
$$;

comment on function public.my_bible_entry(uuid) is
  'Internal: one of the caller''s bible entries, in a story of theirs that isn''t deleted (S1-E17-18).';
revoke execute on function public.my_bible_entry(uuid) from public, anon, authenticated;

/* ---------- Reading the bible ---------- */

/**
 * story_bible: one of the caller's story bibles (S1-E17-17 and S1-E17-18).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', story: { id, slug, title }, sections: [{ id, preset, name, position }],
 *   entries: [{ id, section_id, title, tags, body, updated_at }] } (sections in order, entries by
 *   title), or { outcome: 'not_found' }. Never a user ID (rule 15).
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/bible.ts.
 */
create or replace function public.story_bible(story_slug text)
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
    raise exception 'Sign in to see your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the sections in order and every entry.
  return (select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object('id', stories.id, 'slug', stories.slug, 'title', stories.title),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('id', sections.id, 'preset', sections.preset,
          'name', sections.name, 'position', sections.position) order by sections.position)
      from public.story_bible_sections as sections where sections.story_id = stories.id), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('id', entries.id, 'section_id', entries.section_id,
          'title', entries.title, 'tags', to_jsonb(entries.tags), 'body', entries.body,
          'updated_at', entries.updated_at) order by lower(entries.title), entries.created_at)
      from public.story_bible_entries as entries where entries.story_id = stories.id), '[]'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$$;

comment on function public.story_bible(text) is
  'One of the caller''s story bibles: its sections and entries (S1-E17-17, S1-E17-18).';
revoke execute on function public.story_bible(text) from public, anon;
grant execute on function public.story_bible(text) to authenticated;

/* ---------- Changing sections (S1-E17-17) ---------- */

/**
 * add_bible_section: adds a section of the writer's own at the end of the bible.
 * Inputs: story_slug; section_name (1 to 80 characters).
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty or over-long name,
 *   and with hint too_many_sections past 50 (a bound).
 */
create or replace function public.add_bible_section(story_slug text, section_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if (select count(*) from public.story_bible_sections where story_id = target_story_id) >= 50 then
    raise exception 'A bible can hold at most 50 sections.' using errcode = 'check_violation', hint = 'too_many_sections';
  end if;
  -- At the end; the table's checks refuse an empty or over-long name.
  insert into public.story_bible_sections (story_id, user_id, name, position)
  select target_story_id, (select auth.uid()), btrim(public.normalise_romanian_letters(coalesce(section_name, ''))),
    coalesce(max(position), 0) + 1
  from public.story_bible_sections where story_id = target_story_id
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_bible_section(text, text) is
  'Adds a section of the writer''s own at the end of one of their story bibles (S1-E17-17).';
revoke execute on function public.add_bible_section(text, text) from public, anon;
grant execute on function public.add_bible_section(text, text) to authenticated;

/**
 * rename_bible_section: renames one of the caller's sections. An empty name gives a default
 * section its default name back; a section of the writer's own always needs a name.
 * Inputs: section_id; section_name. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation from the table's checks.
 */
create or replace function public.rename_bible_section(section_id uuid, section_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_section public.story_bible_sections;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_section := public.my_bible_section(section_id);
  if target_section.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  update public.story_bible_sections
  set name = btrim(public.normalise_romanian_letters(coalesce(section_name, '')))
  where story_bible_sections.id = target_section.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.rename_bible_section(uuid, text) is
  'Renames one of the caller''s bible sections; empty gives a default section its default name back (S1-E17-17).';
revoke execute on function public.rename_bible_section(uuid, text) from public, anon;
grant execute on function public.rename_bible_section(uuid, text) to authenticated;

/**
 * move_bible_section: puts one of the caller's sections at a new place, shifting the ones in
 * between (S1-E17-17: by dragging, or with the earlier and later buttons).
 * Inputs: section_id; new_position (from 1; beyond the last means last).
 * Returns: { outcome: 'ok', position } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.move_bible_section(section_id uuid, new_position integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_section public.story_bible_sections;
  last_position integer;
  goal integer;
begin
  -- Step 1: a signed-in writer and their own section.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_section := public.my_bible_section(section_id);
  if target_section.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the goal, kept between the first and the last place.
  select max(position) into last_position from public.story_bible_sections where story_id = target_section.story_id;
  goal := greatest(1, least(coalesce(new_position, target_section.position), last_position));
  -- Step 3: the sections in between move one place towards the gap, then this one takes the goal.
  -- The unique place is checked at the end of the transaction, so the shift can pass through it.
  if goal < target_section.position then
    update public.story_bible_sections set position = position + 1
    where story_id = target_section.story_id and position >= goal and position < target_section.position;
  elsif goal > target_section.position then
    update public.story_bible_sections set position = position - 1
    where story_id = target_section.story_id and position <= goal and position > target_section.position;
  end if;
  update public.story_bible_sections set position = goal where story_bible_sections.id = target_section.id;
  return jsonb_build_object('outcome', 'ok', 'position', goal);
end;
$$;

comment on function public.move_bible_section(uuid, integer) is
  'Moves one of the caller''s bible sections to a new place, shifting the others (S1-E17-17).';
revoke execute on function public.move_bible_section(uuid, integer) from public, anon;
grant execute on function public.move_bible_section(uuid, integer) to authenticated;

/**
 * delete_bible_section: deletes one of the caller's sections, only when it is empty, after the
 * screen's second, confirming click (S1-E17-17). The sections after it move up one place.
 * Input: section_id. Returns: { outcome: 'ok' }, { outcome: 'not_empty' } or
 *   { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_bible_section(section_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_section public.story_bible_sections;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_section := public.my_bible_section(section_id);
  if target_section.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from public.story_bible_entries where story_bible_entries.section_id = target_section.id) then
    return jsonb_build_object('outcome', 'not_empty');
  end if;
  delete from public.story_bible_sections where story_bible_sections.id = target_section.id;
  -- Close the gap it leaves.
  update public.story_bible_sections set position = position - 1
  where story_id = target_section.story_id and position > target_section.position;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_bible_section(uuid) is
  'Deletes one of the caller''s bible sections, only when it has no entries (S1-E17-17).';
revoke execute on function public.delete_bible_section(uuid) from public, anon;
grant execute on function public.delete_bible_section(uuid) to authenticated;

/* ---------- Changing entries (S1-E17-18) ---------- */

/**
 * create_bible_entry: adds an entry to one of the caller's sections.
 * Inputs: section_id; entry_title (1 to 200 characters).
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty or over-long
 *   title, and with hint too_many_entries past 2,000 in one story (a bound).
 */
create or replace function public.create_bible_entry(section_id uuid, entry_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_section public.story_bible_sections;
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_section := public.my_bible_section(section_id);
  if target_section.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if (select count(*) from public.story_bible_entries where story_id = target_section.story_id) >= 2000 then
    raise exception 'A bible can hold at most 2,000 entries.' using errcode = 'check_violation', hint = 'too_many_entries';
  end if;
  insert into public.story_bible_entries (story_id, user_id, section_id, title)
  values (target_section.story_id, target_section.user_id, target_section.id,
    btrim(public.normalise_romanian_letters(coalesce(entry_title, ''))))
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.create_bible_entry(uuid, text) is
  'Adds an entry to one of the caller''s bible sections (S1-E17-18).';
revoke execute on function public.create_bible_entry(uuid, text) from public, anon;
grant execute on function public.create_bible_entry(uuid, text) to authenticated;

/**
 * update_bible_entry: changes one of the caller's entries; each field saves by itself.
 * Inputs: entry_id; changes, an object with any of title, tags (an array of words), body and
 *   section_id (moving the entry to another section of the same story).
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change for
 *   a key it doesn't know, other_story for a section of another story, and from
 *   check_bible_text(), clean_bible_tags() and the table's checks.
 */
create or replace function public.update_bible_entry(entry_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_entry public.story_bible_entries;
  target_section public.story_bible_sections;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer, their own entry and only known changes.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  target_entry := public.my_bible_entry(entry_id);
  if target_entry.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('title', 'tags', 'body', 'section_id')) then
    raise exception 'Unknown change to an entry.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  -- Step 2: a move stays inside the same story.
  if changes ? 'section_id' then
    target_section := public.my_bible_section((changes ->> 'section_id')::uuid);
    if target_section.id is null or target_section.story_id <> target_entry.story_id then
      raise exception 'An entry moves only to a section of its own story.' using errcode = 'check_violation', hint = 'other_story';
    end if;
  end if;
  -- Step 3: change only what was given; the checks refuse the rest.
  update public.story_bible_entries set
    title = case when changes ? 'title' then btrim(public.normalise_romanian_letters(changes ->> 'title')) else title end,
    tags = case when changes ? 'tags' then public.clean_bible_tags(changes -> 'tags') else tags end,
    body = case when changes ? 'body' then public.check_bible_text(changes ->> 'body') else body end,
    section_id = coalesce(target_section.id, section_id)
  where story_bible_entries.id = target_entry.id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_bible_entry(uuid, jsonb) is
  'Changes one of the caller''s bible entries: title, tags, text or section (S1-E17-18).';
revoke execute on function public.update_bible_entry(uuid, jsonb) from public, anon;
grant execute on function public.update_bible_entry(uuid, jsonb) to authenticated;

/**
 * delete_bible_entry: deletes one of the caller's entries, after the screen's second, confirming
 * click (S1-E17-18). Input: entry_id. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_bible_entry(entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your story bible.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.story_bible_entries
  where story_bible_entries.id = (public.my_bible_entry(entry_id)).id;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_bible_entry(uuid) is
  'Deletes one of the caller''s bible entries (S1-E17-18).';
revoke execute on function public.delete_bible_entry(uuid) from public, anon;
grant execute on function public.delete_bible_entry(uuid) to authenticated;
