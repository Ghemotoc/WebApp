-- Database tests for suggestions from reading (story S1-E15-06, bundle ANALYTICS-1c).
-- What it proves:
-- - "More by" lists the writer's other stories, and "Stories like this" stories finished by at
--   least 5 of the same readers, each only as the caller may see them (criterion 1);
-- - the nightly pairs count only the Finished shelves of members whose switch is on, keep only
--   totals of 5 or more, and nothing else (criterion 2);
-- - "Because you read" comes from the caller's own finished story, leaves out what they already
--   keep, and shows nothing with the switch off (criterion 3);
-- - the switch is on for adults and off under 18 until chosen, and anyone may turn it on (5);
-- - policy story_pairs_select_staff: allowed and denied (CLAUDE.md rule 1).
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
-- A visitor: no claims left from an earlier sign-in (they last until the transaction ends).
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- Set-up: three readable stories ---------- */

-- seed01 and seed02 by adult_writer (…01), seed03 by teen_17 (…02), each with a published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'sugg0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 900, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'sugg0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 900, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'sugg0003', 1, 'Trei', 'x', 1, 'published', 'Trei', 'Text.', 900, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now(), rating = 'all_ages',
  visibility = 'public', class_only = false
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');

-- No library rows, pairs or choices left by the seed or an earlier run (rolled back at the end).
delete from public.library_entries;
delete from public.story_pairs;
update public.profiles set suggests_from_reading = null;

/* ---------- 5. The switch ---------- */

select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000001');
select is(public.my_privacy_settings() ->> 'suggests_from_reading', 'true', 'an adult starts with the switch on');
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000002');
select is(public.my_privacy_settings() ->> 'suggests_from_reading', 'false', 'a 17-year-old starts with it off');
select public.set_suggests_from_reading(true);
select is(public.my_privacy_settings() ->> 'suggests_from_reading', 'true', 'and may turn it on');
select public.set_suggests_from_reading(false);
reset role;

/* ---------- 2. The nightly pairs ---------- */

-- Five adults finished seed01 and seed03; teen_17 (switch off) finished both too.
insert into public.library_entries (user_id, story_id, shelf)
select readers.id, stories.id, 'finished'
from (values ('00000000-0000-4000-8000-000000000005'::uuid), ('00000000-0000-4000-8000-000000000007'),
             ('00000000-0000-4000-8000-000000000008'), ('00000000-0000-4000-8000-000000000010'),
             ('00000000-0000-4000-8000-000000000011'), ('00000000-0000-4000-8000-000000000002')) as readers (id)
cross join (values ('00000000-0000-4000-9000-000000000001'::uuid), ('00000000-0000-4000-9000-000000000003')) as stories (id);
-- Only four of them finished seed02 as well.
insert into public.library_entries (user_id, story_id, shelf)
select readers.id, '00000000-0000-4000-9000-000000000002', 'finished'
from (values ('00000000-0000-4000-8000-000000000005'::uuid), ('00000000-0000-4000-8000-000000000007'),
             ('00000000-0000-4000-8000-000000000008'), ('00000000-0000-4000-8000-000000000010')) as readers (id);
select is(public.compute_story_pairs(), 2, 'the nightly job keeps one pair each way');
select is((select readers from public.story_pairs
           where story_id = '00000000-0000-4000-9000-000000000001'
             and paired_story_id = '00000000-0000-4000-9000-000000000003'), 5,
  'five readers with the switch on count; the one with it off doesn''t');
select is((select count(*)::integer from public.story_pairs
           where '00000000-0000-4000-9000-000000000002' in (story_id, paired_story_id)), 0,
  'a pair only four readers share isn''t kept');
select is((select array_agg(column_name::text order by column_name::text) from information_schema.columns
           where table_schema = 'public' and table_name = 'story_pairs'),
  array['counted_at', 'created_at', 'paired_story_id', 'readers', 'story_id', 'updated_at'],
  'a pair holds totals only, never who');

/* ---------- 1. The story page rows ---------- */

select pg_temp.sign_out();
select is((select array_agg(card ->> 'slug') from jsonb_array_elements(public.more_by_writer('statia-meteo-seed01') -> 'stories') as card),
  array['the-girl-who-fixed-radios-seed02'], 'More by lists the writer''s other story, not this one');
select is((select array_agg(card ->> 'slug') from jsonb_array_elements(public.stories_like_this('statia-meteo-seed01') -> 'stories') as card),
  array['scrisori-din-cutia-postala-seed03'], 'Stories like this lists the story the same readers finished');
reset role;

-- An 18+ story is in nobody's row a visitor sees.
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000003';
select pg_temp.sign_out();
select is(jsonb_array_length(public.stories_like_this('statia-meteo-seed01') -> 'stories'), 0,
  'a visitor isn''t shown an 18+ story like this one');
select is(jsonb_array_length(public.stories_like_this('scrisori-din-cutia-postala-seed03') -> 'stories'), 0,
  'and gets no row beside a story they may not see');
reset role;
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000003';

/* ---------- 3. Because you read ---------- */

-- editor (…12) finished seed01 only, so seed03 is suggested to them.
insert into public.library_entries (user_id, story_id, shelf)
values ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-9000-000000000001', 'finished');
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000012');
select is(public.because_you_read() #>> '{source,slug}', 'statia-meteo-seed01',
  'Because you read names the reader''s finished story');
select is((select array_agg(card ->> 'slug') from jsonb_array_elements(public.because_you_read() -> 'stories') as card),
  array['scrisori-din-cutia-postala-seed03'], 'and suggests what the same readers finished');
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000005');
select is(jsonb_array_length(public.because_you_read() -> 'stories'), 0,
  'a story already in the reader''s library isn''t suggested');
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000012');
select public.set_suggests_from_reading(false);
select is(public.because_you_read() -> 'source', 'null'::jsonb, 'with the switch off, there is no row');
reset role;

select pg_temp.sign_out();
select throws_ok($$ select public.compute_story_pairs() $$, '42501', null,
  'a visitor can''t run the nightly job');
reset role;

/* ---------- Who reads the pairs ---------- */

select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.story_pairs) > 0,
  'allowed: story_pairs_select_staff, an admin reads the pair totals');
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.story_pairs), 0,
  'denied: story_pairs_select_staff, a member reads none');
reset role;

select * from finish();
rollback;
