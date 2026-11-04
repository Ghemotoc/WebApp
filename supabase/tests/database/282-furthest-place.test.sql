-- Database tests for "the read-through rate counts the furthest place" (bundle IDEAS-2, part d;
-- idea IDEA-20261101-9).
-- What it proves:
-- - saving a place keeps the furthest place reached, and scrolling back never lowers it;
-- - a reader who reached the end and scrolled back still counts as finished (criterion 1);
-- - the latest place is still the one "Continue reading" uses;
-- - below five readers the rate still reads "fewer than 5" (null) (criterion 2);
-- - "Where readers stop" counts the furthest place too.
-- Test data: one published chapter on adult_writer's seed story statia-meteo-seed01, read by
-- seeded personas through save_reading_position(); rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create function pg_temp.sign_in(persona_number integer) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-'
           || lpad(persona_number::text, 12, '0') || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) seed story gets one published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'furt0001', 1,
  'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '10 days');
update public.feature_flags set is_enabled = false where key = 'adults_only';

/* ---------- 1. The furthest place never goes back ---------- */

-- teacher (…07) reads to the end, then scrolls back to the middle.
select pg_temp.sign_in(7);
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 100, 'computer');
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 45, 'computer');
select pg_temp.as_owner();
select is((select percent from public.reading_positions
           where user_id = '00000000-0000-4000-8000-000000000007'
             and chapter_id = (select id from public.chapters where code = 'furt0001')),
  45::smallint, 'the latest place stays where the reader is now, for "Continue reading"');
select is((select furthest_percent from public.reading_positions
           where user_id = '00000000-0000-4000-8000-000000000007'
             and chapter_id = (select id from public.chapters where code = 'furt0001')),
  100::smallint, 'the furthest place stays at the end after scrolling back');
select is((select finished from public.writer_chapter_numbers('00000000-0000-4000-8000-000000000001', null)
           where chapter_id = (select id from public.chapters where code = 'furt0001')),
  1::bigint, 'a reader who reached the end and scrolled back counts as finished (criterion 1)');

/* ---------- 2. Fewer than five readers ---------- */

select is(public.read_through_percent(1, 1), null::integer,
  'with one reader the rate still reads "fewer than 5" (criterion 2)');

/* ---------- 3. Five readers ---------- */

-- Four more readers: two reach the end and scroll back, two stop at 30 %.
select pg_temp.sign_in(2);
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 97, 'phone');
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 20, 'phone');
select pg_temp.sign_in(15);
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 100, 'phone');
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 60, 'phone');
select pg_temp.sign_in(16);
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 30, 'tablet');
select pg_temp.sign_in(9);
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 30, 'tablet');
select pg_temp.as_owner();

select is((select readers from public.writer_chapter_numbers('00000000-0000-4000-8000-000000000001', null)
           where chapter_id = (select id from public.chapters where code = 'furt0001')),
  5::bigint, 'five readers have a place');
select is((select public.read_through_percent(numbers.readers, numbers.finished)
           from public.writer_chapter_numbers('00000000-0000-4000-8000-000000000001', null) as numbers
           where numbers.chapter_id = (select id from public.chapters where code = 'furt0001')),
  60, 'three of five reached the end, so the rate is 60 %, not 0 %');
select is(public.writer_reader_stops((select id from public.chapters where code = 'furt0001'),
            '00000000-0000-4000-8000-000000000001') -> 'tenths' -> 9,
  '60'::jsonb, '"Where readers stop" puts the three who reached the end in the last tenth');

/* ---------- 4. The writer's own place ---------- */

select pg_temp.sign_in(1);
select public.save_reading_position('statia-meteo-seed01', 'furt0001', 100, 'computer');
select pg_temp.as_owner();
select is((select finished from public.writer_chapter_numbers('00000000-0000-4000-8000-000000000001', null)
           where chapter_id = (select id from public.chapters where code = 'furt0001')),
  3::bigint, 'the writer''s own place still never counts');

select * from finish();
rollback;
