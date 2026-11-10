-- Migration: a contest's cover picture and entry count on the Writers' hub
-- (bundle GAPS-12, part a; liquid glass WritersHub board, G9a; S1-E11-15 rules).
--
-- Why: the board's contest card shows a cover picture and "412 entries"; the hub left both
-- out because writers_hub_contests() didn't hand them over (docs/board-fixes.md).
-- What it changes: writers_hub_contests() also returns
--   - entry_count: how many entries count today (status 'valid'). A number only: who entered
--     stays between each writer and contest staff (contest_entries' own rules).
--   - cover: the first picture of the contest's live landing page, as {"<picture ID>":
--     picture_state_json}, so the file is named only when the caller may see it (it passed its
--     check and a moderator approved it; CLAUDE.md rule 19). Empty when the page has no picture.
--   - cover_alt_ro, cover_alt_en: the alt text the admin wrote for that picture.
-- No new table and no new policy. Tests: supabase/tests/database/317-writers-hub.test.sql.

-- The answer has new columns, so the function is made again.
drop function public.writers_hub_contests();

/**
 * writers_hub_contests: the contests the signed-in writer can enter today.
 * Inputs: none; the writer is the caller (auth.uid()).
 * Returns: one row per contest that is open, inside its entry window and whose age groups and
 *   markets include the caller, with the landing page's address (/c/<page_slug>), the dates and
 *   limits the hub shows, how many entries count today, and the landing page's first picture
 *   with its alt text (GAPS-12a). Soonest closing first. Nothing for a visitor who isn't
 *   signed in.
 * Errors: none. Where it fits: the Writers' hub (src/features/hub/) calls it through
 *   useHubContests(); writers enter from their story's settings (contest_entry_options()).
 */
create function public.writers_hub_contests()
returns table (
  contest_id uuid,
  name_ro text,
  name_en text,
  page_slug text,
  entries_close_on date,
  word_limit integer,
  prize_ro text,
  prize_en text,
  entry_count integer,
  cover jsonb,
  cover_alt_ro text,
  cover_alt_en text
)
language sql
stable
security definer
set search_path = ''
as $$
  select contests.id, contests.name_ro, contests.name_en, pages.slug,
    contests.entries_close_on, contests.word_limit, contests.prize_ro, contests.prize_en,
    -- Entries that count today: not withdrawn, not disqualified.
    (select count(*)::integer from public.contest_entries
     where contest_entries.contest_id = contests.id and contest_entries.status = 'valid'),
    -- The picture as this caller may see it; {} when the page has none.
    coalesce((select jsonb_build_object(picture_checks.id, public.picture_state_json(picture_checks))
              from public.picture_checks
              where picture_checks.id::text = cover_block.block ->> 'picture_id'
                and picture_checks.kind = 'landing_picture' and picture_checks.deleted_at is null),
             '{}'::jsonb),
    coalesce(cover_block.block -> 'ro' ->> 'alt', ''),
    coalesce(cover_block.block -> 'en' ->> 'alt', '')
  from public.contests
  join public.landing_pages as pages on pages.id = contests.landing_page_id
  -- The live version's first block that carries a picture, top to bottom (the hero comes first).
  left join lateral (
    select each_block.block
    from public.landing_page_live_version(pages.id) as live
    cross join lateral jsonb_array_elements(coalesce(live.content -> 'blocks', '[]'::jsonb))
      with ordinality as each_block(block, place)
    where each_block.block ->> 'picture_id' is not null
    order by each_block.place
    limit 1
  ) as cover_block on true
  -- Step 1: only signed-in writers; a visitor sees the contest on its landing page instead.
  where (select auth.uid()) is not null
    -- Step 2: the contest takes entries today and its landing page still shows.
    and public.contest_takes_entries_today(contests)
    and pages.archived_at is null
    -- Step 3: the writer's age group and market are among the contest's (criterion 1).
    and public.contest_writer_fits(contests)
  order by contests.entries_close_on, contests.name_en;
$$;

comment on function public.writers_hub_contests() is
  'The contests the signed-in writer can enter today, each with its entry count and cover picture, for the Writers'' hub (G9a, GAPS-12a; S1-E11-15 rules).';
revoke execute on function public.writers_hub_contests() from public, anon;
grant execute on function public.writers_hub_contests() to authenticated;
