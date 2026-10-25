-- Epic check for S1-E15, analytics and the March test (story S1-E15-QA).
-- It adds no feature: it walks the epic's main journey through the database, crossing S1-E15-02
-- with the reader that records the totals (S1-E4-01a) and the ratings (S1-E3-06), with the seed
-- personas the story names.
-- Journey (S1-E4-01a × S1-E15-02): teen_17, kid_14_ok and teacher open a chapter → today's total
--   grows by three and nothing about them is kept → the daily job counts the day → the owner's
--   Metrics answer shows the reads and the writer, with no user ID anywhere.
-- Ratings (S1-E3-06 × S1-E4-01a × S1-E15-02): at 16+, kid_14_ok and kid_14_waiting can't add a
--   read; teen_17 still can.
-- Who sees the numbers (architecture 1.8.3): the owner and admins; a moderator, teen_17,
--   kid_14_ok and kid_14_waiting are refused.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- Today's read total for this file's chapter, read as the test's owner.
create function pg_temp.reads_today() returns integer language sql security definer as $$
  select coalesce((select total from public.chapter_reads join public.chapters on chapters.id = chapter_reads.chapter_id
                   where chapters.code = 'epics151'
                     and read_on = (now() at time zone 'Europe/Bucharest')::date), 0);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A published chapter on adult_writer's "Stația meteo" (All ages), out three days ago.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epics151', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '3 days');
update public.stories set first_published_at = now() - interval '3 days',
  last_chapter_published_at = now() - interval '3 days'
where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 1. Reading adds to a total, and keeps nothing about the reader ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epics151'), 'teen_17''s read is counted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epics151'), 'and kid_14_ok''s, on an All ages story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epics151'), 'and teacher''s');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(not public.record_chapter_read('statia-meteo-seed01', 'epics151'), 'the writer''s own read isn''t');
reset role;
select is(pg_temp.reads_today(), 3, 'today''s total for the chapter is three (S1-E4-01a × S1-E15-02)');
select is((select count(*)::integer from information_schema.columns
           where table_schema = 'public' and table_name in ('chapter_reads', 'daily_metrics')
             and column_name like '%user_id%'), 0,
  'neither the reads nor the daily numbers have a column for a person (criterion 3)');

/* ---------- 2. Ratings decide whose read can count ---------- */

update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(not public.record_chapter_read('statia-meteo-seed01', 'epics151'),
  'at 16+, kid_14_ok can''t add a read (S1-E3-06)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select ok(not public.record_chapter_read('statia-meteo-seed01', 'epics151'), 'nor can kid_14_waiting');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(public.record_chapter_read('statia-meteo-seed01', 'epics151'), 'teen_17 still can');
reset role;

/* ---------- 3. The job counts the day, and only the owner and admins see it ---------- */

select public.compute_daily_metrics((now() at time zone 'Europe/Bucharest')::date);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok((select (day ->> 'reads')::integer >= 4
           from jsonb_array_elements(public.admin_march_numbers(7) -> 'reads_per_day') as day
           where day ->> 'day' = ((now() at time zone 'Europe/Bucharest')::date)::text),
  'the owner sees today''s reads, the four just counted among them (criterion 1)');
select ok((public.admin_march_numbers(7) ->> 'writers')::integer >= 1
  and public.admin_march_numbers(7)::text !~ '00000000-0000-4000-8000',
  'and the writers who published, with no user ID anywhere');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_march_numbers() $$, '42501', null, 'a moderator is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.admin_march_numbers() $$, '42501', null, 'and so is teen_17');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from public.daily_metrics), 0,
  'and kid_14_ok reads no daily number directly');

select * from finish();
rollback;
