-- g10a_atlas_glance: what the liquid glass Story Atlas pages show beyond what they read before.
--
-- Story: bundle G10 ATLAS, part a (the liquid glass boards AtlasHome, AtlasStory, AtlasCharacters
-- and AtlasCharacterSheet, approved by Robert on 7 Nov 2026, 19:51 UTC).
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes (no table, no policy, no row):
-- 1. character_sheet_keys() gains 'summary', the character "in a line" ("13, sings alto, counts
--    everything") that the boards show under each name on the cast cards and the sheet.
-- 2. story_plan_chapters() adds each recent chapter's publishing status, its dates and its
--    planning status, so the at-a-glance page can show "Published 30 Oct" and a status pill.
-- 3. story_plan() lists the five characters edited last (it was three), each with its role and
--    its line, as the at-a-glance board's "Characters · edited recently" list shows them.
-- 4. my_story_plans(): new. One row per live story of the caller, with the plan's logline,
--    writing status and word target and the words written, for the /plan list of story plans.
-- Everything stays private to the writer, as before: every function reads only the caller's own
-- stories and never returns a user ID (CLAUDE.md rule 15).

/**
 * character_sheet_keys: the sheet's text fields. As in …_s1_e17_08_characters.sql, with 'summary'
 * first: the character in a line, shown under the name on the cast cards and the sheet (G10a).
 * Returns: the keys. Internal: the save check in update_story_character().
 */
create or replace function public.character_sheet_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'summary',
    'also_known_as', 'species', 'pronouns', 'age_or_born', 'life_status', 'occupation', 'origin',
    'appearance', 'distinguishing_marks', 'voice',
    'personality', 'wants', 'needs', 'fear_or_wound', 'secrets', 'values_and_code',
    'backstory', 'arc', 'key_lines', 'notes'];
$$;

comment on function public.character_sheet_keys() is
  'Internal: the keys of a character sheet''s text fields, the one-line summary first (S1-E17-09, G10a).';
revoke execute on function public.character_sheet_keys() from public, anon, authenticated;

/**
 * story_plan_chapters: words written, chapter counts and the five chapters edited last of one
 * story. As in …_s1_e17_01_story_plans.sql, and each recent chapter now also carries `status`
 * (draft, scheduled or published), `scheduled_for`, `published_at` (the last time it went out)
 * and `planning_status` (idea to done, from chapter_plans; null when the chapter has no plan yet).
 * Input: the story's ID. Returns: { words_written, chapter_count, published_count, recent }.
 * Internal: story_plan() and my_story_plans().
 */
create or replace function public.story_plan_chapters(plan_story_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    -- The words in the writer's current drafts, published or not (S1-E17-06).
    'words_written', coalesce(sum(chapters.word_count), 0),
    'chapter_count', count(*),
    'published_count', count(*) filter (where chapters.status = 'published'),
    'recent', coalesce((
      select jsonb_agg(recent_chapter order by recent_chapter ->> 'edited_at' desc)
      from (
        select jsonb_build_object(
          'code', latest.code, 'position', latest.position, 'title', latest.draft_title,
          'edited_at', coalesce(latest.draft_saved_at, latest.updated_at),
          'status', latest.status, 'scheduled_for', latest.scheduled_for,
          'published_at', latest.last_published_at,
          'planning_status', plans.planning_status
        ) as recent_chapter
        from public.chapters as latest
        left join public.chapter_plans as plans on plans.chapter_id = latest.id
        where latest.story_id = plan_story_id and latest.deleted_at is null
        order by coalesce(latest.draft_saved_at, latest.updated_at) desc
        limit 5
      ) as recent_rows
    ), '[]'::jsonb)
  )
  from public.chapters
  where chapters.story_id = plan_story_id and chapters.deleted_at is null;
$$;

comment on function public.story_plan_chapters(uuid) is
  'Internal: words written, chapter counts and the recently edited chapters of one story, with their status (S1-E17-06, G10a).';
revoke execute on function public.story_plan_chapters(uuid) from public, anon, authenticated;

/**
 * story_plan: everything the at-a-glance page shows for one of the caller's stories. As in
 * …_s1_e17_08_characters.sql, except that `cast.recent` holds the five characters edited last
 * (it was three), each with `role` and `summary` (G10a: the board's "Characters · edited recently").
 * Input: the story's slug. Returns: { outcome: 'ok', story, plan, acts, chapters, cast } or
 *   { outcome: 'not_found' }. Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/storyPlans.ts (the at-a-glance page).
 */
create or replace function public.story_plan(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  result jsonb;
begin
  -- Step 1: a signed-in writer and their own live story.
  if caller_id is null then
    raise exception 'Sign in to see your plan.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: the story's own fields and the plan's, never the user ID (rule 15).
  select jsonb_build_object(
    'outcome', 'ok',
    'story', jsonb_build_object(
      'slug', stories.slug, 'title', stories.title, 'blurb', stories.blurb,
      'category_slug', categories.slug, 'rating', stories.rating,
      'first_published_at', stories.first_published_at
    ),
    'plan', jsonb_build_object(
      'logline', plans.logline, 'series_name', plans.series_name, 'word_target', plans.word_target,
      'writing_status', plans.writing_status, 'publishing_route', plans.publishing_route,
      'linked_project_label', plans.linked_project_label, 'linked_project_url', plans.linked_project_url,
      'updated_at', plans.updated_at
    ),
    'acts', coalesce((
      select jsonb_agg(jsonb_build_object('position', acts.position, 'name', acts.name) order by acts.position)
      from public.story_plan_acts as acts where acts.story_id = stories.id
    ), '[]'::jsonb),
    'chapters', public.story_plan_chapters(stories.id),
    -- Step 3: the cast count and the five characters edited last, with role and line (G10a).
    'cast', jsonb_build_object(
      'count', (select count(*) from public.story_characters where story_characters.story_id = stories.id),
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object(
                           'id', recent.id, 'name', recent.name, 'role', recent.role,
                           'summary', coalesce(recent.sheet ->> 'summary', ''),
                           'updated_at', recent.updated_at)
                         order by recent.updated_at desc)
        from (select story_characters.id, story_characters.name, story_characters.role,
                     story_characters.sheet, story_characters.updated_at
              from public.story_characters where story_characters.story_id = stories.id
              order by story_characters.updated_at desc limit 5) as recent
      ), '[]'::jsonb))
  )
  into result
  from public.stories
  join public.story_plans as plans on plans.story_id = stories.id
  join public.categories on categories.id = stories.category_id
  where stories.id = target_story_id;
  return result;
end;
$$;

comment on function public.story_plan(text) is
  'The at-a-glance page of one of the caller''s stories: the story, its plan, acts, chapter numbers and cast (S1-E17-06, G10a).';
revoke execute on function public.story_plan(text) from public, anon;
grant execute on function public.story_plan(text) to authenticated;

/**
 * my_story_plans: the list of story plans on /plan (G10a, board AtlasHome: "Your story plans").
 * One row per live story of the caller, newest plan change first: the story's slug, the plan's
 * logline, writing status and word target, and the words written so far. The title and cover
 * come from the writer's own story list (my_stories), which the page already reads.
 * Input: none. Returns: a JSON array of { slug, logline, writing_status, word_target,
 *   words_written }; empty for a writer with no stories.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/storyPlans.ts (AtlasHomePage).
 */
create or replace function public.my_story_plans()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in writer has plans.
  if caller_id is null then
    raise exception 'Sign in to see your plans.' using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: the caller's live stories and their plans; the words come from the chapters' own
  -- counts, the same sum the at-a-glance page shows (story_plan_chapters()).
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'slug', stories.slug,
             'logline', plans.logline,
             'writing_status', plans.writing_status,
             'word_target', plans.word_target,
             'words_written', coalesce((
               select sum(chapters.word_count) from public.chapters
               where chapters.story_id = stories.id and chapters.deleted_at is null
             ), 0))
           order by greatest(plans.updated_at, stories.updated_at) desc)
    from public.stories
    join public.story_plans as plans on plans.story_id = stories.id
    where stories.user_id = caller_id and stories.deleted_at is null
  ), '[]'::jsonb);
end;
$$;

comment on function public.my_story_plans() is
  'The caller''s story plans for the /plan list: slug, logline, writing status, word target and words written (G10a).';
revoke execute on function public.my_story_plans() from public, anon;
grant execute on function public.my_story_plans() to authenticated;
