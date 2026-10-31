/*
 * Migration: relationships between characters in Story Atlas (stories S1-E17-14 to S1-E17-16;
 * docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part c).
 *
 * What it adds:
 * - story_character_relationships: one row per connection between two characters of the same
 *   story, with its type (S1-E17-14's list: parent of, sibling of, partner or spouse of, loves,
 *   turned or made, friend of, ally of, mentors, works for, enemy of, resents, killed, or custom
 *   with the writer's own label) and an optional note. A relationship is read from the first
 *   character to the second: "Ana is parent of Vali".
 * - add_character_relationship() and delete_character_relationship(); story_cast() again, now
 *   with the relationships, which the sheets, the relationship map (S1-E17-15) and the family
 *   tree (S1-E17-16) all draw from.
 * Deleting a character deletes its relationships (S1-E17-13: "their relationships and image go
 * with them"), through the foreign keys.
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer reads or changes them.
 * Personal data: the writer's own planning notes, read only by them; no new processor.
 * Who calls it: src/features/atlas/api/characters.ts.
 * Tests: supabase/tests/database/192-character-relationships.test.sql.
 */

create table public.story_character_relationships (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Read from the first character to the second: "<from> is <kind> <to>". Both go with a deleted
  -- character (S1-E17-13).
  from_character_id uuid not null references public.story_characters (id) on delete cascade,
  to_character_id uuid not null references public.story_characters (id) on delete cascade,
  kind text not null,
  -- The writer's own label, only for a custom relationship ("rival of", "owes a debt to").
  custom_label text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_character_relationships_two_characters check (from_character_id <> to_character_id),
  constraint story_character_relationships_kind_known check (
    kind in ('parent_of', 'sibling_of', 'partner_of', 'loves', 'made', 'friend_of', 'ally_of',
             'mentors', 'works_for', 'enemy_of', 'resents', 'killed', 'custom')
  ),
  -- A custom relationship needs its label; the others take none.
  constraint story_character_relationships_custom_label check (
    (kind = 'custom' and char_length(btrim(custom_label)) between 1 and 60)
    or (kind <> 'custom' and custom_label = '')
  ),
  constraint story_character_relationships_note_length check (char_length(note) <= 1000)
);

comment on table public.story_character_relationships is
  'kind: user_content; reportable: story
How two characters of one story''s plan are connected (S1-E17-14), read from the first to the second. The map (S1-E17-15) and the family tree (S1-E17-16) are drawn from these rows. Only the writer reads them.';
comment on column public.story_character_relationships.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';
comment on column public.story_character_relationships.kind is
  'parent_of, sibling_of, partner_of, loves, made (turned or made), friend_of, ally_of, mentors, works_for, enemy_of, resents, killed or custom (S1-E17-14).';

create index story_character_relationships_story_id_idx on public.story_character_relationships (story_id);
create index story_character_relationships_from_idx on public.story_character_relationships (from_character_id);
create index story_character_relationships_to_idx on public.story_character_relationships (to_character_id);

create trigger story_character_relationships_set_updated_at
  before update on public.story_character_relationships
  for each row execute function public.set_updated_at();

create trigger story_character_relationships_refuse_user_id_change
  before update on public.story_character_relationships
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_character_relationships enable row level security;

-- The writer reads their own relationships; every write goes through the functions below.
grant select on public.story_character_relationships to authenticated;

/**
 * story_character_relationships_select_own: the writer reads the relationships in their own
 * plans. Nobody else, staff included, reads them through the app (private by default).
 */
create policy story_character_relationships_select_own
  on public.story_character_relationships for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_character_relationships_select_own on public.story_character_relationships is
  'Allows a writer to read the relationships between their own characters, and nobody else (S1-E17-14).';

/**
 * add_character_relationship: records how two of the caller's characters are connected, from a
 * sheet or the Connections page (S1-E17-14).
 * Inputs: from_character_id and to_character_id (two different characters of the same story);
 *   relationship_kind (one of the types); custom_label (only for 'custom'); note (optional).
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' } when either character isn't the
 *   caller's.
 * Errors: insufficient_privilege when signed out; check_violation with hint
 *   different_stories when the two characters aren't in the same story, and from the table's
 *   checks for the same character twice, an unknown type, a missing or extra label, or a note
 *   over 1,000 characters; hint too_many_relationships past 2,000 in one story (a bound).
 */
create or replace function public.add_character_relationship(
  from_character_id uuid,
  to_character_id uuid,
  relationship_kind text,
  custom_label text,
  note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  from_character public.story_characters;
  to_character public.story_characters;
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
  -- Step 3: the relationship; the table's checks refuse the rest.
  insert into public.story_character_relationships
    (story_id, user_id, from_character_id, to_character_id, kind, custom_label, note)
  values (from_character.story_id, from_character.user_id, from_character.id, to_character.id,
    relationship_kind,
    case when relationship_kind = 'custom' then btrim(coalesce(custom_label, '')) else '' end,
    btrim(coalesce(note, '')))
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_character_relationship(uuid, uuid, text, text, text) is
  'Records how two of the caller''s characters in one story are connected (S1-E17-14).';
revoke execute on function public.add_character_relationship(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.add_character_relationship(uuid, uuid, text, text, text) to authenticated;

/**
 * delete_character_relationship: deletes one of the caller's relationships, after the screen's
 * second, confirming click (S1-E17-14: "I can delete it").
 * Input: relationship_id. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_character_relationship(relationship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.story_character_relationships
  where story_character_relationships.id = relationship_id
    and story_character_relationships.user_id = (select auth.uid());
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_character_relationship(uuid) is
  'Deletes one of the caller''s relationships between characters (S1-E17-14).';
revoke execute on function public.delete_character_relationship(uuid) from public, anon;
grant execute on function public.delete_character_relationship(uuid) to authenticated;

/**
 * story_cast: as in …_s1_e17_08_characters.sql, plus `relationships`: [{ id, from, to, kind,
 *   custom_label, note }], the character IDs read "<from> is <kind> <to>" (S1-E17-14 to 16).
 * Input: the story's slug. Returns: { outcome: 'ok', story, characters, fields, chapters,
 *   relationships } or { outcome: 'not_found' }. Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/characters.ts.
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
  -- relationships between the characters.
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
      select jsonb_agg(jsonb_build_object('id', links.id, 'from', links.from_character_id,
          'to', links.to_character_id, 'kind', links.kind, 'custom_label', links.custom_label,
          'note', links.note) order by links.created_at)
      from public.story_character_relationships as links where links.story_id = stories.id), '[]'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$$;

comment on function public.story_cast(text) is
  'The cast of one of the caller''s stories: its characters, custom fields, chapters and relationships (S1-E17-08 to S1-E17-16).';
revoke execute on function public.story_cast(text) from public, anon;
grant execute on function public.story_cast(text) to authenticated;
