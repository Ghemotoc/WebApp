-- Database tests for notifications that open a paragraph's thread and the "Most shared this week"
-- shelf (bundle IDEAS-1, part e; ideas IDEA-20261031-2 and -9).
-- What it proves:
-- - a notification about a paragraph comment says which paragraph it is on today; one on a
--   paragraph the writer has since changed says "earlier"; one on the whole chapter says nothing,
--   and a reply takes its comment's paragraph (idea 2);
-- - the 'shared' list holds only stories shared in the last 7 days, most shared first, and each
--   reader gets only the stories their age allows (idea 9, both criteria);
-- - the 'shared' sort works only on that list; the shelf joins discover_shelves; the helper isn't
--   callable from the app.
-- Personas: adult_writer (…01) and teen_17 (…02) write; teacher (…07) comments and reads as an
-- adult; kid_14_ok (…03) reads as a 14-year-old. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The slugs of a list, in order.
create function pg_temp.slugs(answer jsonb) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by position), '')
  from jsonb_array_elements(answer -> 'stories') with ordinality as listed(story, position);
$$;
-- Where a notification's comment sits, found by the comment's first words.
create function pg_temp.place_of(excerpt text) returns jsonb language sql as $$
  select listed -> 'comment_place'
  from jsonb_array_elements(public.my_notifications() -> 'notifications') as listed
  where listed ->> 'comment_excerpt' = excerpt;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Notifications open the paragraph ---------- */

-- A chapter of three paragraphs on adult_writer's seed01.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('21900000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-8000-000000000001', 'plink001', 1, 'Unu', 'x', 3, 'published', 'Unu',
  E'Unu.\n\nDoi.\n\nTrei.', 3, now());
-- teacher's comments: on paragraph 2, on a paragraph since changed, and on the whole chapter.
insert into public.comments (id, user_id, chapter_id, body, paragraph_key, paragraph_number)
values
  ('21900000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000007',
   '21900000-0000-4000-8000-000000000001', 'Pe al doilea.', public.paragraph_key_of('Doi.'), 2),
  ('21900000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000007',
   '21900000-0000-4000-8000-000000000001', 'Pe cel vechi.', public.paragraph_key_of('Vechi.'), 1),
  ('21900000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000007',
   '21900000-0000-4000-8000-000000000001', 'Pe tot capitolul.', null, null);
-- The writer's reply to the paragraph 2 comment, which takes its paragraph (take_parent_paragraph()).
insert into public.comments (id, user_id, chapter_id, body, parent_comment_id)
values ('21900000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-000000000001',
  '21900000-0000-4000-8000-000000000001', 'Mulțumesc!', '21900000-0000-4000-8000-0000000000c1');
-- The notifications, put in by hand: the writer is told about each comment, teacher about the reply.
insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id, comment_id)
select recipient::uuid, kind::public.notification_kind, array[actor::uuid], 1,
  '00000000-0000-4000-9000-000000000001', '21900000-0000-4000-8000-000000000001', comment::uuid
from (values
  ('00000000-0000-4000-8000-000000000001', 'comment_on_chapter', '00000000-0000-4000-8000-000000000007', '21900000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-000000000001', 'comment_on_chapter', '00000000-0000-4000-8000-000000000007', '21900000-0000-4000-8000-0000000000c2'),
  ('00000000-0000-4000-8000-000000000001', 'comment_on_chapter', '00000000-0000-4000-8000-000000000007', '21900000-0000-4000-8000-0000000000c3'),
  ('00000000-0000-4000-8000-000000000007', 'comment_reply', '00000000-0000-4000-8000-000000000001', '21900000-0000-4000-8000-0000000000c4')
) as wanted (recipient, kind, actor, comment);

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.place_of('Pe al doilea.'), '2'::jsonb,
  'a notification about a paragraph comment names the paragraph it is on today');
select is(pg_temp.place_of('Pe cel vechi.'), '"earlier"'::jsonb,
  'one on a paragraph the writer has since changed says "earlier"');
select is(pg_temp.place_of('Pe tot capitolul.'), 'null'::jsonb,
  'one on the whole chapter has no paragraph');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.place_of('Mulțumesc!'), '2'::jsonb, 'a reply opens its comment''s paragraph');
reset role;
-- The writer moves paragraph 2 down by adding one before it: the link follows the paragraph.
update public.chapters set published_body = E'Unu.\n\nNou.\n\nDoi.\n\nTrei.'
where id = '21900000-0000-4000-8000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.place_of('Pe al doilea.'), '3'::jsonb, 'when the paragraph moves, the link moves with it');

/* ---------- 2. "Most shared this week" ---------- */

reset role;
-- seed01 (All ages), seed02 (made 16+) and seed03 (teen_17's, 13+) get a published chapter each,
-- and a fourth All ages story was shared only ten days ago.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'shrd0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'shrd0003', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
update public.stories set first_published_at = now() - interval '1 day', last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  first_published_at, last_chapter_published_at)
values ('21900000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000000001', 'demult-seed219',
  'Demult', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('21900000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000000001', 'shrd0004', 1,
  'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
-- This week: seed02 9, seed03 5 (two days ago), seed01 3 today and 50 ten days ago; the fourth
-- story 40 ten days ago.
insert into public.chapter_shares (chapter_id, shared_on, total)
select chapters.id, (now() at time zone 'Europe/Bucharest')::date - shares.days_ago, shares.total
from (values ('shrd0002', 0, 9), ('shrd0003', 2, 5), ('plink001', 0, 3), ('plink001', 10, 50),
             ('shrd0004', 10, 40)) as shares (code, days_ago, total)
join public.chapters on chapters.code = shares.code;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');  -- teacher, an adult
select is(pg_temp.slugs(public.browse_stories('shared')),
  'the-girl-who-fixed-radios-seed02,scrisori-din-cutia-postala-seed03,statia-meteo-seed01',
  'an adult gets this week''s most shared stories first, and nothing shared only before the week');
select is((public.browse_stories('shared') ->> 'total')::integer, 3, 'and the total counts them');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');  -- kid_14_ok
select is(pg_temp.slugs(public.browse_stories('shared')),
  'scrisori-din-cutia-postala-seed03,statia-meteo-seed01',
  'a 14-year-old never gets the 16+ story (rule 18)');
select pg_temp.sign_out();
select is(pg_temp.slugs(public.browse_stories('shared')),
  'scrisori-din-cutia-postala-seed03,statia-meteo-seed01',
  'nor does a visitor');
select ok(public.browse_stories('shared')::text not like '%00000000-0000-4000-8000-%',
  'and no card carries a user ID');

/* ---------- 3. The sort, the setting and the helper ---------- */

reset role;
select is(public.list_default_sort('shared'), 'shared', 'the list''s own order is this week''s shares');
select ok((select value ? 'shared' from public.settings where key = 'discover_shelves'),
  'the Discover setting has the new shelf');
select pg_temp.sign_out();
select is(pg_temp.slugs(public.browse_stories('shared', sort_order => 'title_az')),
  'scrisori-din-cutia-postala-seed03,statia-meteo-seed01', 'and the reader can still pick another sort');
select throws_ok($$ select public.browse_stories('popular', sort_order => 'shared') $$, '22023', null,
  'the shares sort is refused on any other list');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.story_shares_this_week('00000000-0000-4000-9000-000000000001') $$,
  '42501', null, 'the shares helper isn''t callable from the app');

select * from finish();
rollback;
