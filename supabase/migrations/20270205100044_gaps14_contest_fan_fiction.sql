/*
 * Migration: contests are for original work (bundle GAPS-14; Robert, 7 Nov 2026: fan fiction is
 * welcome on the platform and ads may run on it, but there are no contests unless the story is
 * original).
 * What it changes:
 * - contest_story_problems(): a story labelled fan fiction (stories.is_fan_fiction) has the
 *   problem 'fan_fiction', so enter_contest() refuses it with that hint and the story's contest
 *   card says why before the writer tries;
 * - admin_contest_entries(): each entry says whether its story is labelled fan fiction now, so
 *   staff see a story that was relabelled after it was entered and can disqualify it with a
 *   statement of reasons (admin_disqualify_contest_entry(), unchanged). An entry is never
 *   dropped by itself: the writer may have fixed a wrong label.
 * Who calls it: enter_contest() and contest_entry_options() (the writer's story settings), and
 * the staff contest page through admin_contest_entries(). Inputs, returns and grants unchanged.
 */

/**
 * contest_story_problems: as before, plus 'fan_fiction' for a story labelled fan fiction.
 */
CREATE OR REPLACE FUNCTION public.contest_story_problems(target contests, story stories)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select array_remove(array[
    case when story.deleted_at is not null or public.is_moderated_away('story', story.id)
           or not public.story_has_readable_chapter(story.id) then 'not_readable' end,
    case when story.class_only then 'class_only' end,
    -- GAPS-14: contests are for original work; a story labelled fan fiction can't be entered
    -- (Robert, 7 Nov 2026: fan fiction is welcome on the platform, but no contests unless original).
    case when story.is_fan_fiction then 'fan_fiction' end,
    case when not story.language_code = any (target.language_codes) then 'language' end,
    case when '13_to_15' = any (target.age_groups) and story.rating not in ('all_ages', '13_plus')
      then 'rating' end,
    case when target.word_limit is not null and (
        select coalesce(sum(chapters.published_word_count), 0) from public.chapters
        where chapters.story_id = story.id and chapters.status = 'published' and chapters.deleted_at is null
      ) > target.word_limit then 'word_limit' end
  ]::text[], null);
$$;

/**
 * admin_contest_entries: as before, plus is_fan_fiction for each entry's story.
 */
CREATE OR REPLACE FUNCTION public.admin_contest_entries(target_contest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
begin
  -- Step 1: only the owner and admins run contests.
  perform public.require_contest_staff();
  -- Step 2: the entries, with only what judging needs to know about the writer.
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', entries.id,
        'pen_name', public.display_name(profiles.handle, profiles.pen_name),
        'age_group', public.age_band_of(entries.user_id),
        'story_title', stories.title,
        'story_slug', stories.slug,
        'rating', stories.rating,
        -- GAPS-14: a story labelled fan fiction after it was entered, for staff to judge.
        'is_fan_fiction', stories.is_fan_fiction,
        'words', (select coalesce(sum(chapters.published_word_count), 0) from public.chapters
                  where chapters.story_id = stories.id and chapters.status = 'published'
                    and chapters.deleted_at is null),
        'entered_at', entries.entered_at,
        'status', entries.status,
        'statement_reference', statements.reference,
        'placing', entries.award,
        'prize_sent_at', entries.prize_sent_at,
        'needs_parent_consent', public.age_band_of(entries.user_id) not in ('16_to_17', '18_plus')
      ) order by entries.entered_at desc), '[]'::jsonb)
    from public.contest_entries as entries
    join public.profiles on profiles.id = entries.user_id
    join public.stories on stories.id = entries.story_id
    left join public.statements_of_reasons as statements on statements.id = entries.statement_id
    where entries.contest_id = target_contest_id
  );
end;
$$;
