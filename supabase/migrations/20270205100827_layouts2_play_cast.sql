/*
 * LAYOUTS-2: the play editor's cast, the story's list of characters (Robert, 27 Nov 2026, 17:34
 * UTC: "Yes, as drawn"; board D14-EditorPlay, the "Characters" panel: "For the whole story.
 * Readers see this list at the start of the play.").
 *
 * How it works:
 * - stories.play_cast holds the cast as a JSON array of { "name": "Mara", "note": "sings alto,
 *   sixteen" }, in the writer's order. It belongs to the whole story, so every chapter written as
 *   a play suggests the same names (the name suggestions under a speech, the phone's name chips).
 * - Readers will see it at the start of a play (LAYOUTS-3), so it is the story's public text, not
 *   the writer's private planning: that is why it is not Story Atlas's story_characters table,
 *   which only the writer ever sees (decisions.md, LAYOUTS-2).
 * - set_story_cast(story_slug, cast): the writer replaces their own story's cast. It checks the
 *   shape: at most 60 characters, a name of 1 to 40 characters and a note of up to 80, no two
 *   names the same (ignoring capitals), so a play's list stays a list.
 * - Nothing else changes: the speeches themselves stay in the chapter's Markdown
 *   (`**NAME:** words`, LAYOUTS-1's storage format), so a name typed in a speech that isn't in
 *   the cast still reads as a speech.
 * Who calls it: src/features/writing/ (the Characters panel and the editor's name suggestions).
 * Tests: supabase/tests/database/428-play-cast.test.sql.
 */

/* ---------- 1. The data ---------- */

alter table public.stories
  add column play_cast jsonb not null default '[]'::jsonb
  constraint stories_play_cast_is_list check (jsonb_typeof(play_cast) = 'array');
comment on column public.stories.play_cast is
  'The cast of a story written as a play: [{name, note}], in the writer''s order (LAYOUTS-2). Readers see it at the start of the play. Changed only through set_story_cast().';

/* ---------- 2. Checking a cast ---------- */

/**
 * play_cast_problem: what is wrong with a cast, or null when it is fine.
 * Inputs: cast, the list as the editor sends it.
 * Returns: null, or 'not_a_list', 'too_many' (more than 60), 'bad_entry' (an entry that isn't
 *   {name, note} text), 'bad_name' (a name empty or over 40 characters), 'bad_note' (a note over
 *   80 characters) or 'duplicate_name' (two names the same, ignoring capitals and outer spaces).
 * Raises nothing. Flow: set_story_cast() refuses a cast this answers for.
 */
create function public.play_cast_problem(cast_list jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  entry jsonb;
  seen_names text[] := '{}';
  entry_name text;
begin
  -- Step 1: a list, and not a long one.
  if cast_list is null or jsonb_typeof(cast_list) <> 'array' then
    return 'not_a_list';
  end if;
  if jsonb_array_length(cast_list) > 60 then
    return 'too_many';
  end if;
  -- Step 2: each entry is {name, note}, both text, within their lengths.
  for entry in select value from jsonb_array_elements(cast_list) loop
    if jsonb_typeof(entry) <> 'object'
       or jsonb_typeof(entry -> 'name') is distinct from 'string'
       or jsonb_typeof(coalesce(entry -> 'note', '""'::jsonb)) <> 'string' then
      return 'bad_entry';
    end if;
    entry_name := btrim(entry ->> 'name');
    if char_length(entry_name) not between 1 and 40 then
      return 'bad_name';
    end if;
    if char_length(coalesce(entry ->> 'note', '')) > 80 then
      return 'bad_note';
    end if;
    -- Step 3: no name twice, "Mara" and "MARA" being one character.
    if lower(entry_name) = any (seen_names) then
      return 'duplicate_name';
    end if;
    seen_names := seen_names || lower(entry_name);
  end loop;
  return null;
end;
$$;
comment on function public.play_cast_problem(jsonb) is
  'Internal: what is wrong with a play''s cast list, or null (LAYOUTS-2).';
revoke all on function public.play_cast_problem(jsonb) from public, anon, authenticated;

/* ---------- 3. Changing it ---------- */

/**
 * set_story_cast: the writer replaces their own story's cast (the editor's Characters panel).
 * Inputs: story_slug (the story's address); cast_list, the whole new list [{name, note}].
 * Returns: 'ok'; 'not_found' when the caller has no live story at that address (someone else's
 *   included, so nothing is given away); or one of play_cast_problem()'s answers.
 * Errors: insufficient_privilege when signed out.
 * Flow: src/features/writing/hooks/usePlayCast.ts → this → stories.play_cast. Names and notes
 *   are stored trimmed, the note kept as '' when there is none.
 */
create function public.set_story_cast(story_slug text, cast_list jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  problem text;
begin
  -- Step 1: a signed-in writer.
  if caller_id is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a cast of the right shape.
  problem := public.play_cast_problem(cast_list);
  if problem is not null then
    return problem;
  end if;
  -- Step 3: only their own live story, with each name and note trimmed.
  update public.stories set play_cast = coalesce((
      select jsonb_agg(jsonb_build_object(
          'name', btrim(entry ->> 'name'), 'note', btrim(coalesce(entry ->> 'note', '')))
        order by place)
      from jsonb_array_elements(cast_list) with ordinality as entries(entry, place)), '[]'::jsonb)
  where stories.slug = story_slug
    and stories.user_id = caller_id
    and stories.deleted_at is null;
  if not found then
    return 'not_found';
  end if;
  return 'ok';
end;
$$;
comment on function public.set_story_cast(text, jsonb) is
  'Replaces the caller''s own story''s play cast, [{name, note}] (LAYOUTS-2).';
revoke all on function public.set_story_cast(text, jsonb) from public, anon;
grant execute on function public.set_story_cast(text, jsonb) to authenticated;
