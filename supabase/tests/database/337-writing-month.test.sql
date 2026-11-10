-- Database tests for the writing month, streaks and badges (bundle GAPS-12f; board WritersHub).
-- What it proves:
-- - writing_days_select_own: a writer reads their own days, another member and staff read none;
-- - the writer's own saves add the change in a chapter's word count to today's row; words taken
--   away come off again, never below zero; a change made by anyone else (staff, the database
--   owner) counts nothing; days older than 400 are pruned;
-- - my_writing_month() adds the month's words up against 15,000, counts the running streak
--   (across the month's edge, and still alive when the last day was yesterday), and marks each
--   of the five badges from the writer's own activity only; a signed-out caller is refused;
-- - the table is in Download my data and goes with the account.
-- Personas: adult_writer (…01), teacher (…07), admin (…09). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or 'ok' when it runs.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
-- A text of that many words.
create function pg_temp.words(how_many integer) returns text language sql as $$
  select btrim(repeat('cuvânt ', how_many));
$$;
-- The writer's words today, read as the database owner; null when there is no row.
create function pg_temp.words_today() returns integer language sql security definer as $$
  select words from public.writing_days
  where user_id = '00000000-0000-4000-8000-000000000001' and day = public.romania_today();
$$;
-- Saves the test chapter's draft as whoever is signed in, with whatever version it is at.
create function pg_temp.save(body text) returns text language sql as $$
  select public.save_chapter_draft('month001', 'Luna', body,
    (select draft_version from public.chapters where code = 'month001')) ->> 'status';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A clean month for the writer, and one empty draft chapter in the seed story.
delete from public.writing_days where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.comments where user_id = '00000000-0000-4000-8000-000000000001';
delete from public.contest_entries where user_id = '00000000-0000-4000-8000-000000000001';
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'month001', 950, 'Luna', '', 0, 'draft');

/* ---------- 1. Saves count the day's words ---------- */

select is(pg_temp.words_today(), null, 'a chapter made by the database owner counts nothing for the writer');
select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.my_writing_month() $$), '42501', 'a visitor who isn''t logged in gets no writing month');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_writing_month() - 'month_start',
  '{"goal": 15000, "words": 0, "streak_days": 0, "badges": {"streak_5": false, "first_5000": false, "comments_10": false, "contest_entry": false, "words_15000": false}}'::jsonb,
  'a writer who wrote nothing this month starts at zero with no badge');
select is(pg_temp.save(pg_temp.words(120)), 'saved', 'the writer saves 120 words');
select is(pg_temp.words_today(), 120, 'and today''s row holds them');
select pg_temp.save(pg_temp.words(200));
select is(pg_temp.words_today(), 200, 'a later save adds only the new words');
select pg_temp.save(pg_temp.words(150));
select is(pg_temp.words_today(), 150, 'words taken away come off again');
select pg_temp.save('');
select is(pg_temp.words_today(), 0, 'and the day never goes below zero');
select pg_temp.save(pg_temp.words(300));
select is((public.my_writing_month() ->> 'words')::integer, 300, 'the month adds the day up');
select is((public.my_writing_month() ->> 'streak_days')::integer, 1, 'one day of writing is a 1-day streak');

/* ---------- 2. Who reads the days ---------- */

select is((select count(*)::integer from public.writing_days), 1,
  'allowed: writing_days_select_own: the writer reads their own day');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.writing_days), 0,
  'denied: writing_days_select_own: another member reads none');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.writing_days), 0, 'and neither does an admin');
-- An admin's own change to the writer's chapter never counts as the writer's writing.
reset role;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}', true);
update public.chapters set word_count = 9000 where code = 'month001';
select is(pg_temp.words_today(), 300, 'a change by someone else counts nothing for the writer');
update public.chapters set word_count = 300 where code = 'month001';

/* ---------- 3. Streaks ---------- */

-- Yesterday and the three days before it, and a stray day a week earlier; today has words too.
insert into public.writing_days (user_id, day, words)
select '00000000-0000-4000-8000-000000000001', public.romania_today() - back, 100
from unnest(array[1, 2, 3, 4, 9]) as back;
insert into public.writing_days (user_id, day, words)
values ('00000000-0000-4000-8000-000000000001', public.romania_today() - 500, 100);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() ->> 'streak_days')::integer, 5,
  'five days in a row ending today are a 5-day streak, even across the month''s edge');
-- The badge needs the five days inside this month, so it depends on how far into the month today is.
select is((public.my_writing_month() #>> '{badges,streak_5}')::boolean,
  extract(day from public.romania_today()) >= 5,
  'the 5-day streak badge counts only days of this month');
reset role;
delete from public.writing_days
where user_id = '00000000-0000-4000-8000-000000000001' and day = public.romania_today();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() ->> 'streak_days')::integer, 4,
  'a streak that reached yesterday is still alive before today''s first words');
select pg_temp.save(pg_temp.words(301));
reset role;
select is((select count(*)::integer from public.writing_days
           where user_id = '00000000-0000-4000-8000-000000000001' and day < public.romania_today() - 400), 0,
  'the next new words prune the days older than 400');

/* ---------- 4. Badges from the writer's own activity ---------- */

update public.writing_days set words = 5200
where user_id = '00000000-0000-4000-8000-000000000001' and day = public.romania_today();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select string_agg(badge.key, ',' order by badge.key) from jsonb_each(public.my_writing_month() -> 'badges') as badge
           where badge.key in ('first_5000', 'words_15000', 'comments_10', 'contest_entry') and badge.value = 'true'::jsonb),
  'first_5000', '5,000 words in the month earn "First 5,000" and nothing else');
reset role;
update public.writing_days set words = 15000
where user_id = '00000000-0000-4000-8000-000000000001' and day = public.romania_today();
-- Nine comments by the writer and one by someone else: not ten yet.
insert into public.comments (user_id, chapter_id, body)
select '00000000-0000-4000-8000-000000000001', chapters.id, 'Frumos.'
from public.chapters, generate_series(1, 9) where chapters.code = 'month001';
insert into public.comments (user_id, chapter_id, body)
select '00000000-0000-4000-8000-000000000007', chapters.id, 'Frumos.' from public.chapters where chapters.code = 'month001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() -> 'badges') - 'streak_5',
  '{"first_5000": true, "comments_10": false, "contest_entry": false, "words_15000": true}'::jsonb,
  '15,000 words earn the goal badge; nine comments and someone else''s don''t earn "10 comments"');
reset role;
insert into public.comments (user_id, chapter_id, body)
select '00000000-0000-4000-8000-000000000001', chapters.id, 'Al zecelea.' from public.chapters where chapters.code = 'month001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() #>> '{badges,comments_10}')::boolean, true, 'the tenth comment earns it');
-- A contest entry made this month earns its badge; a withdrawn one doesn't.
reset role;
with page as (
  insert into public.landing_pages (slug, page_type) values ('concurs-luna-de-scris', 'contest') returning id
), contest as (
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select page.id, 'Concursul lunii', 'The month''s contest', public.romania_today() - 1, public.romania_today() + 5,
    public.romania_today() + 10, array['18_plus'], array['RO'], array['ro'], now()
  from page
  returning id
)
insert into public.contest_entries (user_id, contest_id, story_id, status, withdrawn_at)
select '00000000-0000-4000-8000-000000000001', contest.id, '00000000-0000-4000-9000-000000000001', 'withdrawn', now()
from contest;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() #>> '{badges,contest_entry}')::boolean, false, 'a withdrawn contest entry earns no badge');
reset role;
update public.contest_entries set status = 'valid', withdrawn_at = null
where user_id = '00000000-0000-4000-8000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() #>> '{badges,contest_entry}')::boolean, true, 'an entry that stands earns "Contest entry"');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.my_writing_month() ->> 'words')::integer, 0, 'another member''s month shows none of it');

/* ---------- 5. Download my data and account deletion ---------- */

-- The two rule lists are internal, so the test reads them as the database owner.
reset role;
select is((select is_included from public.data_export_tables() where table_name = 'writing_days'), true,
  'the days are in Download my data');
select is((select action from public.account_deletion_rules() where table_name = 'writing_days'), 'delete',
  'and they go with the account');

select * from finish();
rollback;
