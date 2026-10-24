-- Database tests for the daily read totals (story S1-E4-01a; architecture 1.6 and 1.7.9).
-- What it proves:
-- - record_chapter_read() adds one to today's total (the Romanian date) for a reader who may
--   read the chapter; the writer's own reads, drafts and chapters above the reader's age don't
--   count; a signed-out visitor is refused;
-- - chapter_reads keeps totals only: no column says who read;
-- - chapter_reads_select_owner: the writer reads their own chapter's totals; another person
--   reads none.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- Created before anyone signs in, so it reads with the test's own rights.
create function pg_temp.today_total(code text) returns integer language sql security definer as $$
  select coalesce((select total from public.chapter_reads
    join public.chapters on chapters.id = chapter_reads.chapter_id
    where chapters.code = today_total.code
      and read_on = (now() at time zone 'Europe/Bucharest')::date), 0) $$;

-- A published chapter and a draft on adult_writer's "Stația meteo".
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rdcnta01', 1, 'Unu',
   'Text.', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rdcntb02', 2, 'Doi',
   'Ciornă.', 1, 'draft', null, null, null, null);

select hasnt_column('public', 'chapter_reads', 'user_id', 'chapter_reads keeps no user ID: totals only');

-- 1. Counting.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.record_chapter_read('statia-meteo-seed01', 'rdcnta01'), true, 'a reader''s visit is counted');
select public.record_chapter_read('statia-meteo-seed01', 'rdcnta01');
select is(pg_temp.today_total('rdcnta01'), 2, 'a second visit adds one to the same day''s total');
select is(public.record_chapter_read('statia-meteo-seed01', 'rdcntb02'), false, 'a draft is not counted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.record_chapter_read('statia-meteo-seed01', 'rdcnta01'), false, 'the writer''s own read is not counted');
select is(pg_temp.today_total('rdcnta01'), 2, 'so the total stays at 2');

-- 2. The policy.
select is((select total from public.chapter_reads), 2, 'allowed: chapter_reads_select_owner: the writer reads their chapter''s total');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.chapter_reads), 0,
  'denied: chapter_reads_select_owner: a reader sees no totals, not even of chapters they read');

-- 3. Ratings and visitors.
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.record_chapter_read('statia-meteo-seed01', 'rdcnta01'), false, 'kid_14_ok''s visit to a 16+ chapter is not counted');
select is(pg_temp.today_total('rdcnta01'), 2, 'the total is unchanged');
select pg_temp.sign_out();
select throws_ok($$ select public.record_chapter_read('statia-meteo-seed01', 'rdcnta01') $$, '42501', null,
  'a signed-out visitor can''t record a read');

select * from finish();

rollback;
