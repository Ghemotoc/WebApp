-- books14_restore_relationship: "Relationship deleted. Undo" brings a relationship back exactly as
-- it was (design books item 14, "Undo"; Robert approved the design books review on 23 Nov 2026).
--
-- Why: deleting a relationship in the Story Atlas no longer asks "Delete …?" first. It happens at
-- once and a note offers Undo for 8 seconds. The delete is a hard delete, so
-- delete_character_relationship() now also hands back the row it removed, and
-- restore_character_relationship() puts that row back with the same id, so its "Keep private"
-- choice (is_private) and anything keyed by the id come back with it.
-- Who calls them: src/features/atlas/api/characters.ts → deleteRelationship() and
-- restoreRelationship(), through useRelationshipChangers.

/**
 * delete_character_relationship(relationship_id): deletes one of the caller's relationships.
 *
 * Allows: only the writer whose relationship it is.
 * Returns: {outcome: 'ok', relationship: {...}} with the removed row (without user_id and
 *   story_id, which the restore reads from the characters again), or {outcome: 'not_found'}.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_character_relationship(relationship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.story_character_relationships;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your characters.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: delete only the caller's own relationship, keeping what was removed.
  delete from public.story_character_relationships
  where story_character_relationships.id = relationship_id
    and story_character_relationships.user_id = (select auth.uid())
  returning * into removed;
  if removed.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: hand the row back for Undo; the owner's id and the story's id stay on the server.
  return jsonb_build_object('outcome', 'ok',
    'relationship', to_jsonb(removed) - 'user_id' - 'story_id');
end;
$$;

comment on function public.delete_character_relationship(uuid) is
  'Deletes one of the caller''s relationships between characters and returns it for Undo (S1-E17-14; design books item 14).';

/**
 * restore_character_relationship(removed): puts back a relationship the caller just deleted.
 *
 * Input: the "relationship" object delete_character_relationship() returned.
 * Allows: only a writer whose two characters both still exist, in the same story. The row goes
 *   back with the same id, kind, labels, note, cousin numbers and is_private; the owner and the
 *   story are read from the characters, never from the input.
 * Returns: {outcome: 'ok'}, or {outcome: 'not_found'} when a character is gone.
 * Errors: insufficient_privilege when signed out; check_violation 'already_there' when the same
 *   relationship was added again meanwhile; the table's own checks refuse values that don't fit.
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
  -- Step 3: the row as it was; a second Undo of the same row changes nothing.
  insert into public.story_character_relationships
    (id, story_id, user_id, from_character_id, to_character_id, kind, custom_label,
     reverse_label, note, cousin_degree, cousin_removed, is_private, created_at)
  values ((removed ->> 'id')::uuid, from_character.story_id, from_character.user_id,
    from_character.id, to_character.id, removed_kind,
    coalesce(removed ->> 'custom_label', ''), coalesce(removed ->> 'reverse_label', ''),
    coalesce(removed ->> 'note', ''), (removed ->> 'cousin_degree')::smallint,
    (removed ->> 'cousin_removed')::smallint, coalesce((removed ->> 'is_private')::boolean, false),
    coalesce((removed ->> 'created_at')::timestamptz, now()))
  on conflict (id) do nothing;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.restore_character_relationship(jsonb) is
  'Puts back a relationship the caller just deleted, with the same id and privacy (design books item 14).';

revoke execute on function public.restore_character_relationship(jsonb) from public, anon;
grant execute on function public.restore_character_relationship(jsonb) to authenticated;
