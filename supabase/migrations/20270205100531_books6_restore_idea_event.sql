-- books6_restore_idea_event: "Removed. Undo" brings a note or a timeline event back exactly as it
-- was (user stories bundle 6: story 6.10, board E29, "Delete (“Removed. Undo” for 8 seconds)";
-- story 6.12, board E31, "Delete (the bin) takes the note away with “Removed. Undo” for 8
-- seconds"; design books item 14, "Undo").
--
-- Why: deleting a question or idea, or a timeline event, no longer asks first. It happens at once
-- and a note offers Undo for 8 seconds. Both deletes are hard deletes, so delete_story_idea() and
-- delete_story_event() now also hand back the row they removed, and restore_story_idea() and
-- restore_story_event() put that row back with the same id: a ticked note keeps its "Done on"
-- date and outcome, and an event keeps its "Keep private" choice and the chapter it waits for.
-- The same pattern as restore_character_relationship() (books14_restore_relationship).
-- Who calls them: src/features/atlas/api/ideas.ts (deleteStoryIdea, restoreStoryIdea) through
-- useStoryIdeas, and src/features/atlas/api/storyline.ts (deleteStoryEvent, restoreStoryEvent)
-- through useStoryline.

/**
 * delete_story_idea(idea_id): deletes one of the caller's questions or ideas.
 *
 * Allows: only the writer whose note it is (my_story_idea()).
 * Returns: {outcome: 'ok', idea: {...}} with the removed row, without user_id and story_id (the
 *   restore reads those from the story again), or {outcome: 'not_found'}.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_story_idea(idea_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_idea public.story_ideas;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your notes.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: only the caller's own note.
  target_idea := public.my_story_idea(idea_id);
  if target_idea.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  delete from public.story_ideas where story_ideas.id = target_idea.id;
  -- Step 2: hand the row back for Undo; the owner's id and the story's id stay on the server.
  return jsonb_build_object('outcome', 'ok',
    'idea', to_jsonb(target_idea) - 'user_id' - 'story_id');
end;
$$;

comment on function public.delete_story_idea(uuid) is
  'Deletes one of the caller''s questions or ideas and returns it for Undo (S1-E17-28; story 6.12).';

/**
 * restore_story_idea(story_slug, removed): puts back a note the caller just deleted.
 *
 * Input: the story's slug and the "idea" object delete_story_idea() returned.
 * Allows: only the writer of that story (my_planned_story_id()); the owner and the story come
 *   from the slug and the session, never from the input. The note goes back with the same id,
 *   type, words, outcome, "Done on" date and creation time.
 * Returns: {outcome: 'ok'}, or {outcome: 'not_found'} when the story isn't the caller's.
 * Errors: insufficient_privilege when signed out; check_violation 'too_many_ideas' at 1,000
 *   notes, as add_story_idea(); the table's own checks refuse a type or length that doesn't fit.
 */
create or replace function public.restore_story_idea(story_slug text, removed jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: a signed-in writer and one of their own stories.
  if (select auth.uid()) is null then
    raise exception 'Sign in to add a note.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the same limit as adding a note.
  if (select count(*) from public.story_ideas where story_ideas.story_id = target_story_id) >= 1000 then
    raise exception 'A story can hold at most 1,000 notes.' using errcode = 'check_violation', hint = 'too_many_ideas';
  end if;
  -- Step 3: the row as it was; a second Undo of the same row changes nothing.
  insert into public.story_ideas (id, story_id, user_id, kind, body, outcome, done_at, created_at)
  values ((removed ->> 'id')::uuid, target_story_id, (select auth.uid()), removed ->> 'kind',
    public.plan_text(removed ->> 'body'), public.plan_text(coalesce(removed ->> 'outcome', '')),
    (removed ->> 'done_at')::timestamptz, coalesce((removed ->> 'created_at')::timestamptz, now()))
  on conflict (id) do nothing;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.restore_story_idea(text, jsonb) is
  'Puts back a question or idea the caller just deleted, with the same id, outcome and Done date (story 6.12; design books item 14).';

revoke execute on function public.restore_story_idea(text, jsonb) from public, anon;
grant execute on function public.restore_story_idea(text, jsonb) to authenticated;

/**
 * delete_story_event(event_id): deletes one of the caller's timeline events.
 *
 * Allows: only the writer whose event it is (my_story_event()).
 * Returns: {outcome: 'ok', event: {...}} with the removed row, without user_id and story_id, or
 *   {outcome: 'not_found'}.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_story_event(event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.story_events;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your timeline.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: only the caller's own event.
  target_event := public.my_story_event(event_id);
  if target_event.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  delete from public.story_events where story_events.id = target_event.id;
  -- Step 2: hand the row back for Undo; the owner's id and the story's id stay on the server.
  return jsonb_build_object('outcome', 'ok',
    'event', to_jsonb(target_event) - 'user_id' - 'story_id');
end;
$$;

comment on function public.delete_story_event(uuid) is
  'Deletes one of the caller''s timeline events and returns it for Undo (S1-E17-20; story 6.10).';

/**
 * restore_story_event(story_slug, removed): puts back a timeline event the caller just deleted.
 *
 * Input: the story's slug and the "event" object delete_story_event() returned.
 * Allows: only the writer of that story (my_live_story_id(), as add_story_event()); the owner and
 *   the story come from the slug and the session, never from the input. The event goes back with
 *   the same id, title, date, sort value, description, "Keep private" and creation time; the
 *   chapter it waited for comes back only while that chapter is still in the same story and not
 *   deleted.
 * Returns: {outcome: 'ok'}, or {outcome: 'not_found'} when the story isn't the caller's.
 * Errors: insufficient_privilege when signed out; check_violation 'too_many_events' at 500
 *   events, as add_story_event(); the table's own checks refuse a length that doesn't fit.
 */
create or replace function public.restore_story_event(story_slug text, removed jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  waits_for uuid;
begin
  -- Step 1: a signed-in writer and one of their own stories.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your timeline.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the same limit as adding an event.
  if (select count(*) from public.story_events where story_events.story_id = target_story_id) >= 500 then
    raise exception 'A timeline can hold at most 500 events.' using errcode = 'check_violation', hint = 'too_many_events';
  end if;
  -- Step 3: the chapter it waited for, only if it is still a chapter of this story.
  select chapters.id into waits_for
  from public.chapters
  where chapters.id = (removed ->> 'show_from_chapter_id')::uuid
    and chapters.story_id = target_story_id
    and chapters.deleted_at is null;
  -- Step 4: the row as it was; a second Undo of the same row changes nothing.
  insert into public.story_events (id, story_id, user_id, title, display_date, sort_value,
    description, is_private, show_from_chapter_id, created_at)
  values ((removed ->> 'id')::uuid, target_story_id, (select auth.uid()),
    public.plan_text(removed ->> 'title'), public.plan_text(coalesce(removed ->> 'display_date', '')),
    (removed ->> 'sort_value')::numeric, public.plan_text(coalesce(removed ->> 'description', '')),
    coalesce((removed ->> 'is_private')::boolean, false), waits_for,
    coalesce((removed ->> 'created_at')::timestamptz, now()))
  on conflict (id) do nothing;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.restore_story_event(text, jsonb) is
  'Puts back a timeline event the caller just deleted, with the same id and privacy (story 6.10; design books item 14).';

revoke execute on function public.restore_story_event(text, jsonb) from public, anon;
grant execute on function public.restore_story_event(text, jsonb) to authenticated;
