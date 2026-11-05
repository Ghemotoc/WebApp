-- Times the main read paths on the 50,000-account volume seed and checks each against its budget
-- (independent QA check, 5 Nov 2026, findings S1 and S2; fix bundle QA-2).
--
-- Who runs it: scripts/volume/run-volume-check.sh, after scripts/volume/seed-volume.sql, in the
-- throwaway database qa_volume. Output: one line per path, "name | milliseconds | budget | ok",
-- and the script ends with an error when any path is over its budget, so the runner fails.
-- Budgets (QA report, fix bundles): Discover and search under 1 second; a chapter, the story page
-- and notifications under half a second. Each path runs twice and the second (warm) run counts,
-- because the first also pays for reading the tables from disk.

\set ON_ERROR_STOP on
-- A path that takes longer than this is stopped and recorded as "stopped" (over any budget).
set statement_timeout = '30s';

-- The results, kept until the end so the budget check sees them all.
create temporary table timings (name text, milliseconds numeric, budget numeric, stopped boolean default false);
grant insert, select on timings to anon, authenticated;

/**
 * time_once: runs one statement as one person and records how long the second run took.
 * Inputs: name, the statement, the person's user ID (null for a signed-out visitor) and the
 *   budget in milliseconds.
 * Where it fits: every line below calls it.
 */
create function pg_temp.time_once(name text, statement text, person uuid, budget numeric)
returns void language plpgsql as $$
declare
  started timestamptz;
  ignored text;
begin
  -- Step 1: become the person, as PostgREST would.
  if person is null then
    perform set_config('request.jwt.claims', '{"role": "anon"}', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', person, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
  -- Step 2: a warm-up run, then the timed one. A run stopped by statement_timeout is recorded
  -- as stopped, so one slow path doesn't hide the others.
  begin
    execute statement into ignored;
    started := clock_timestamp();
    execute statement into ignored;
    insert into timings values (name, round(extract(epoch from clock_timestamp() - started) * 1000, 1), budget);
  exception when query_canceled then
    insert into timings values (name, null, budget, true);
  end;
  perform set_config('role', 'postgres', true);
end;
$$;
grant execute on function pg_temp.time_once(text, text, uuid, numeric) to anon, authenticated;

begin;
-- An adult reader (qa_user_5), a 14-year-old (qa_user_10) and a signed-out visitor.
select pg_temp.time_once('Discover Popular, page 1, adult',
  $$select length(public.browse_stories('popular')::text)::text$$,
  '10000000-0000-4000-8000-000000000005', 1000);
select pg_temp.time_once('Discover Popular, page 1, 14-year-old',
  $$select length(public.browse_stories('popular')::text)::text$$,
  '10000000-0000-4000-8000-000000000010', 1000);
select pg_temp.time_once('Discover Popular, page 1, visitor',
  $$select length(public.browse_stories('popular')::text)::text$$, null, 1000);
select pg_temp.time_once('New, page 50, adult',
  $$select length(public.browse_stories('new', null, null, null, null, 'newest', 21, 1029)::text)::text$$,
  '10000000-0000-4000-8000-000000000005', 1000);
select pg_temp.time_once('Search "vânt", adult',
  $$select (public.browse_stories('search', 'vânt', null, null, null, 'relevance', 21, 0)) ->> 'total'$$,
  '10000000-0000-4000-8000-000000000005', 1000);
select pg_temp.time_once('Search "strengari" without diacritics, adult',
  $$select (public.browse_stories('search', 'strengari', null, null, null, 'relevance', 21, 0)) ->> 'total'$$,
  '10000000-0000-4000-8000-000000000005', 1000);
select pg_temp.time_once('Story page',
  $$select length(public.get_story_page('qa-story-77')::text)::text$$,
  '10000000-0000-4000-8000-000000000005', 500);
select pg_temp.time_once('Chapter',
  $$select length(public.get_chapter('qa-story-77',
      (select code from public.chapters where story_id = '20000000-0000-4000-8000-000000000077' and position = 5))::text)::text$$,
  '10000000-0000-4000-8000-000000000005', 500);
select pg_temp.time_once('Notifications',
  $$select length(public.my_notifications()::text)::text$$,
  '10000000-0000-4000-8000-000000000005', 500);
commit;

-- The hourly ranking job (S1-E5-03), as pg_cron runs it: as postgres, once. Budget 15 s: it
-- runs in the background, but a minute of work every hour holds the scores table (QA-2d).
do $$
declare
  started timestamptz := clock_timestamp();
begin
  perform public.compute_story_scores();
  insert into timings values ('Ranking job, compute_story_scores()',
    round(extract(epoch from clock_timestamp() - started) * 1000, 1), 15000);
exception when query_canceled then
  insert into timings values ('Ranking job, compute_story_scores()', null, 15000, true);
end;
$$;

-- The report, slowest first.
select name, coalesce(milliseconds::text, 'stopped after 30 s') as milliseconds, budget,
  not stopped and milliseconds <= budget as ok
from timings order by stopped desc, timings.milliseconds desc nulls first;

-- Fail the run when any path is over budget.
do $$
begin
  if exists (select 1 from timings where stopped or milliseconds > budget) then
    raise exception 'A read path is over its time budget; see the table above (QA-2).';
  end if;
end;
$$;
