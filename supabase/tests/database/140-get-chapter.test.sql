-- Database tests for reading a chapter (story S1-E4-01a; ADR 0004).
-- What it proves, for get_chapter(story_slug, chapter_code):
-- - a signed-in reader gets the published text with "chapter n of N" counted among the readable
--   chapters, the previous and next codes, the dates and the minutes to read; never the user ID;
-- - a signed-out visitor gets the title and places with needs_sign_in, and only the teaser
--   (S1-E4-04; the cut itself is tested in 142-teaser);
-- - a draft, an unpublished chapter, a code from another story, a deleted story and a story rated
--   above the reader's age answer null; the owner reads their own story whatever its rating;
-- - is_blocked_with() exists as the blocks stub and answers false (Q8).
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- Three chapters on adult_writer's "Stația meteo": A published, B a draft, C published (an edit
-- after publishing), and an unpublished D. 450 words in A, so 3 minutes to read.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, edited_at, unpublished_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rdtsta01', 1, 'Unu',
   'Text unu.', 450, 'published', 'Unu', 'Bunica **notează** vremea.', 450, now() - interval '3 days', null, null),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rdtstb02', 2, 'Doi',
   'Ciornă.', 1, 'draft', null, null, null, null, null, null),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rdtstc03', 3, 'Trei',
   'Text trei.', 2, 'published', 'Trei', 'Text trei.', 2, now() - interval '2 days', now() - interval '1 day', null),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rdtstd04', 4, 'Patru',
   'Text patru.', 2, 'draft', 'Patru', 'Text patru.', 2, now() - interval '5 days', null, now());

-- 1. A signed-in adult reader (the teacher persona).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'body', 'Bunica **notează** vremea.',
  'a signed-in reader gets the published text');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'needs_sign_in', 'false', 'and is not asked to log in');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'minutes_to_read', '3', '450 words read in 3 minutes');
select is(public.get_chapter('statia-meteo-seed01', 'rdtstc03') ->> 'number', '2',
  'chapter C is number 2: the draft between them is not counted');
select is(public.get_chapter('statia-meteo-seed01', 'rdtstc03') ->> 'total', '2', 'of 2 readable chapters');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'next_code', 'rdtstc03',
  'the next chapter skips the draft');
select is(public.get_chapter('statia-meteo-seed01', 'rdtstc03') ->> 'previous_code', 'rdtsta01', 'and so does the previous one');
select ok(public.get_chapter('statia-meteo-seed01', 'rdtstc03') ->> 'edited_at' is not null, 'the edited date is there');
select ok(public.get_chapter('statia-meteo-seed01', 'rdtsta01')::text not like '%00000000-0000-4000-8000-000000000001%',
  'the writer''s user ID is never in the answer (rule 15)');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') -> 'story' -> 'writer' ->> 'display_name', 'Lia Scrie',
  'the writer is named by pen name');

-- 2. What a reader can't open.
select is(public.get_chapter('statia-meteo-seed01', 'rdtstb02'), null, 'a draft answers null');
select is(public.get_chapter('statia-meteo-seed01', 'rdtstd04'), null, 'an unpublished chapter answers null');
select is(public.get_chapter('the-girl-who-fixed-radios-seed02', 'rdtsta01'), null,
  'a chapter code under another story''s address answers null');

-- 3. A signed-out visitor: the title and places, and only the teaser.
select pg_temp.sign_out();
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'needs_sign_in', 'true', 'a visitor is asked to log in');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'is_teaser', 'true', 'and gets the teaser, not the chapter (S1-E4-04)');

-- 4. Ratings (rule 18): the story becomes 16+.
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01'), null, 'kid_14_ok can''t open a 16+ chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select isnt(public.get_chapter('statia-meteo-seed01', 'rdtsta01'), null, 'teen_17 can');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01') ->> 'is_owner', 'true',
  'the owner reads their own chapter whatever its rating');

-- 5. A deleted story.
reset role;
update public.stories set deleted_at = now() where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('statia-meteo-seed01', 'rdtsta01'), null, 'a deleted story''s chapters answer null');

-- 6. The blocks stub (Q8).
select is(public.is_blocked_with('00000000-0000-4000-8000-000000000001'), false, 'is_blocked_with() is the stub: no blocks yet');

select * from finish();

rollback;
