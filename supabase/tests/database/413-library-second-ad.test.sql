-- Database tests for the Library's second advert (bundle 3, board C01; Robert, 25 Nov 2026,
-- 09:50 UTC: no widget missing between the canvas and the live site).
-- What it proves:
-- - the Library has its two wide slots, library_wide and library_lower_wide, in that order;
-- - page_ads('library', …) fills both for a signed-in reader, never with the same ad twice;
-- - a campaign booked for story lists (placement list_banner) can fill the lower one too.
-- Personas: adult_writer (…01).
-- Test data: none; everything is read only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

-- 1. The catalogue: two wide slots on the Library, the new one second.
select is(
  (select string_agg(slot_key || ':' || position || ':' || format, ' ' order by position)
   from public.ad_slots where page_key = 'library'),
  'library_wide:1:wide library_lower_wide:2:wide',
  'the Library has two wide slots: library_wide first, library_lower_wide second');

-- 2. Filling the page as a signed-in reader.
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
create temporary table filled on commit drop as
  select public.page_ads('library', '{"language": "ro"}') as words;
select is(jsonb_array_length((select words from filled)), 2, 'the Library page gets both slots');
select ok(
  (select (words -> 0 -> 'ad' ->> 'key') is distinct from (words -> 1 -> 'ad' ->> 'key') from filled),
  'the two Library banners never carry the same ad');
reset role;

-- 3. Booking: the story lists placement reaches the lower banner.
select ok(
  'library_lower_wide' = any (public.sponsor_placement_slots('list_banner')),
  'a campaign booked for story lists can fill the Library''s lower banner');

select * from finish();
rollback;
