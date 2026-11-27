-- Migration BC-YEARS: classics may carry years before Christ (CONTENT thread, 27 Nov 2026,
-- for works such as Plato's and Sophocles'; queued after COUNTRY-2).
--
-- Why: an author's death year and a work's first publication year were checked to lie between
-- 1 and 2100, so a classic from antiquity couldn't be stored with its real years. A year before
-- Christ is now a negative number: 428 BC is -428. There is no year 0 (1 BC is followed by
-- AD 1), so 0 is refused. The earliest year allowed is 3000 BC.
-- The screens write a negative year as "428 BC" in English and "428 î.Hr." in Romanian
-- (src/lib/historicalYear.ts).
--
-- What changes: the year checks on classic_authors.died_year, classic_works.first_published_year
-- and stories.first_published_year. The public-domain rule (author died 1955 or earlier, work
-- published before 1931) needs no change: a year before Christ is earlier still.
-- Who calls it: nothing new; admin_add_classic_author(), admin_save_classic_work() and the
-- classics loader (scripts/classics/load-classic.sql) write these columns.
-- Personal data: none.

-- Step 1: the author's death year.
alter table public.classic_authors drop constraint classic_authors_died_year_check;
alter table public.classic_authors add constraint classic_authors_died_year_check
  check (died_year between -3000 and 2100 and died_year <> 0);

-- Step 2: the work's first publication year, on the work and on its story.
alter table public.classic_works drop constraint classic_works_first_published_year_check;
alter table public.classic_works add constraint classic_works_first_published_year_check
  check (first_published_year between -3000 and 2100 and first_published_year <> 0);
alter table public.stories drop constraint stories_first_published_year_range;
alter table public.stories add constraint stories_first_published_year_range
  check (first_published_year between -3000 and 2100 and first_published_year <> 0);
