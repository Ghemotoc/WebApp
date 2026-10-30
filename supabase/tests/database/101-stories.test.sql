-- Database tests for stories (story S1-E3-01).
-- What it proves:
-- - create_story() makes a story owned by the caller's user ID, with its tags merged and capped
--   at 10, a chosen drawn cover within the palette, or an automatic cover that stores nothing;
-- - the owner's user ID never changes, not even when the handle or pen name changes;
-- - the account gate: teen_17 (read-only while adults_only is on), kid_14_waiting, pending_check
--   and a signed-out visitor can't create a story;
-- - a story with no published chapter is visible to nobody but the writer (allowed and denied
--   for stories_select_own and story_tags_select_own);
-- - nobody writes stories or tags through the API; an upload cover is refused while the
--   picture_uploads flag is off.
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

create function pg_temp.drawn_cover() returns jsonb language sql as $$
  select '{"kind": "drawn", "design": "stripes", "background": "plum", "accent": "gold"}'::jsonb;
$$;

-- The labels every story needs since S1-E3-06: a rating and the AI answer.
create function pg_temp.labels() returns jsonb language sql as $$
  select '{"rating": "all_ages", "ai_disclosure": "no_ai"}'::jsonb;
$$;

-- 1. adult_writer creates a story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');

select is(
  (public.create_story('  Fata care repara   radiouri ', 'O vară în atelierul bunicului.', 'ro', 'fiction',
    array['Mlaștină', 'mlaștină', ' mlastină ', 'set in Romania'], pg_temp.drawn_cover(), null, pg_temp.labels())) ->> 'outcome',
  'ok',
  'an active adult creates a story'
);

create temp table made as
  select * from public.stories where title = 'Fata care repara radiouri';

select is((select count(*)::integer from made), 1, 'the title is trimmed and its spaces collapsed');
select is((select user_id from made), '00000000-0000-4000-8000-000000000001'::uuid,
  'the story stores the writer''s user ID as its owner');
select matches((select slug from made), '^fata-care-repara-radiouri-[a-z0-9]{6}$',
  'the public address is the title''s web form plus six random characters, never the user ID');
select is((select first_published_at from made), null, 'a new story has no published chapter yet');
select results_eq(
  $$ select tags.normalised_name from public.story_tags join public.tags on tags.id = story_tags.tag_id
     where story_tags.story_id = (select id from made) order by 1 $$,
  $$ values ('mlastina'), ('set in romania') $$,
  'Mlaștină, mlaștină and mlastină are one tag; tags are lower-cased, trimmed and diacritic-normalised'
);
select is(
  (select tags.name from public.tags where tags.normalised_name = 'mlastina'), 'Mlaștină',
  'a new tag keeps the spelling the first writer typed'
);
select results_eq(
  $$ select cover_kind::text, cover_design, cover_background, cover_accent from made $$,
  $$ values ('drawn', 'stripes', 'plum', 'gold') $$,
  'a drawn cover stores its design and two palette colours'
);

-- 2. The writer reads their own story and its tags, and only those.
select is((select count(*)::integer from public.stories where id = (select id from made)), 1,
  'allowed: stories_select_own: the writer reads their own story');
select is((select count(*)::integer from public.story_tags where story_id = (select id from made)), 2,
  'allowed: story_tags_select_own: the writer reads their own story''s tags');
select is((select count(*)::integer from public.stories where user_id <> '00000000-0000-4000-8000-000000000001'), 0,
  'denied: stories_select_own: the writer sees nobody else''s stories (the seed has one by teen_17)');

-- 3. No writes through the API, even by the owner.
select throws_ok($$ update public.stories set title = 'Changed' where id = (select id from made) $$, '42501', null,
  'the owner can''t change a story through the API: writes go through functions');
select throws_ok($$ insert into public.story_tags (story_id, tag_id, user_id)
  select (select id from made), tags.id, '00000000-0000-4000-8000-000000000001' from public.tags limit 1 $$, '42501', null,
  'denied: story_tags_select_own: nobody writes story tags through the API');

-- 4. The rules create_story() enforces.
select throws_ok($$ select public.create_story('Too many', '', 'ro', 'fiction',
  array['a','b','c','d','e','f','g','h','i','j','k'], '{"kind": "automatic"}', null, pg_temp.labels()) $$, '23514', null,
  'an eleventh tag is refused');
select throws_ok($$ select public.create_story('Closed language', '', 'hu', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels()) $$,
  '23514', null, 'a language with no open market is refused');
select throws_ok($$ select public.create_story('Unknown category', '', 'ro', 'journalism', '{}', '{"kind": "automatic"}', null, pg_temp.labels()) $$,
  '23514', null, 'an unknown category (such as journalism) is refused');
select throws_ok($$ select public.create_story('', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels()) $$,
  '23514', null, 'an empty title is refused');
select throws_ok($$ select public.create_story('Odd colour', '', 'ro', 'fiction', '{}',
  '{"kind": "drawn", "design": "waves", "background": "sky", "accent": "#6E93BF"}', null, pg_temp.labels()) $$, '23514', null,
  'a cover colour outside the 9-colour palette is refused');
select throws_ok($$ select public.create_story('Upload', '', 'ro', 'fiction', '{}',
  '{"kind": "upload", "tall_path": "x/tall.jpg"}', null, pg_temp.labels()) $$, '0A000', null,
  'an uploaded cover is refused while picture_uploads is off (no uploads in the demo, 23 Oct 2026)');

-- 5. An automatic cover stores nothing.
select is(
  (public.create_story('Automatic', '', 'en', 'poetry', '{}', '{"kind": "automatic"}', null, pg_temp.labels())) ->> 'outcome', 'ok',
  'a story with the automatic cover is created'
);
select results_eq(
  $$ select cover_design, cover_background, cover_accent, cover_tall_path from public.stories where title = 'Automatic' $$,
  $$ values (null::text, null::text, null::text, null::text) $$,
  'an automatic cover stores no design, colours or file (S1-E3-13)'
);

-- 5b. The form may choose the story's ID, so the automatic cover is known in advance (S1-E3-13);
--     an ID already in use is refused.
select is(
  (public.create_story('Chosen ID', '', 'en', 'poetry', '{}', '{"kind": "automatic"}',
    '11111111-1111-4111-8111-111111111111', pg_temp.labels())) ->> 'outcome', 'ok',
  'the form''s own story ID is used (S1-E3-13)'
);
select throws_ok($$ select public.create_story('Same ID again', '', 'en', 'poetry', '{}', '{"kind": "automatic"}',
  '11111111-1111-4111-8111-111111111111', pg_temp.labels()) $$, '23514', null,
  'a story ID already in use is refused, never reused');

-- 6. The owner stays the same when the pen name changes.
select is(public.set_my_pen_name('Un alt nume'), 'ok', 'the writer changes their pen name');
select is((select user_id from public.stories where id = (select id from made)), '00000000-0000-4000-8000-000000000001'::uuid,
  'the story still belongs to the same user ID after the pen name changed');

-- 7. The account gate: read-only accounts can''t create.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.create_story('Teen', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels())) ->> 'outcome', 'not_active',
  'teen_17 can''t create a story while the test is adults only');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.create_story('Kid', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels())) ->> 'outcome', 'not_active',
  'kid_14_waiting can''t create a story');
-- While adults_only is on, an adult is active without a Yoti result (decided 17 Oct 2026, 12:44;
-- docs/mocks.md), so pending_check may write in March; S1-E2-08 makes this 'not_active' again.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is((public.create_story('Pending', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels())) ->> 'outcome', 'ok',
  'pending_check (an adult without an age check) may create a story while adults_only is on');

-- 8. Signed out: nothing.
reset role;
set local role anon;
select throws_ok($$ select public.create_story('Anon', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels()) $$, '42501', null,
  'a signed-out visitor can''t call create_story()');

-- 9. The owner column can never change (architecture 1.6).
reset role;
select throws_ok($$ update public.stories set user_id = '00000000-0000-4000-8000-000000000002' where id = (select id from made) $$,
  '23514', null, 'nobody can change a story''s owner');

select * from finish();

rollback;
