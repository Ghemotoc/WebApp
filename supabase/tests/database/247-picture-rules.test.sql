-- Database tests for the picture rules and ratings by the writer's age (bundle ADMIN-2, part e1;
-- Robert's brief of 2 Nov 2026, sections 1 and 2).
-- What it proves:
-- - the allowed kinds of picture are a public setting, so every upload screen can list them;
-- - the chapter picture's rights tick box is gone: register_chapter_picture() takes the file only;
-- - a writer under 16 rates a story All ages or 13+ only, whoever sets the rating, staff included;
--   a writer aged 16 or 17 may rate up to 18+, and so may an adult.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. The allowed kinds and the rights tick box ---------- */

select is((select value from public.settings where key = 'picture_allowed_kinds' and is_public),
  '["drawing", "illustration", "non_photographic_ai"]'::jsonb,
  'drawings, illustrations and AI pictures that don''t look like photos are the allowed kinds, a public setting');
select hasnt_function('public', 'register_chapter_picture', array['text', 'boolean'],
  'a chapter picture no longer asks for a rights tick');
select has_function('public', 'register_chapter_picture', array['text'],
  'it takes the file only');

/* ---------- 2. Ratings by the writer's age ---------- */

-- kid_14_ok (…03) is 14, teen_17 (…02) is 17.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, content_note)
values
  ('00000000-0000-4000-9000-000000002471', '00000000-0000-4000-8000-000000000003', 'kid-story-t247', 'Caietul',
   'ro', (select id from public.categories where slug = 'fiction'), '13_plus', 'Ceartă în familie.'),
  ('00000000-0000-4000-9000-000000002472', '00000000-0000-4000-8000-000000000002', 'teen-story-t247', 'Night shift',
   'en', (select id from public.categories where slug = 'fiction'), '18_plus', 'Violence.');
select is((select rating::text from public.stories where id = '00000000-0000-4000-9000-000000002471'), '13_plus',
  'a 14-year-old writer rates a story 13+');
select is(pg_temp.error_hint($$ update public.stories set rating = '16_plus'
    where id = '00000000-0000-4000-9000-000000002471' $$), 'rating_too_high_for_age',
  'but not 16+');
select is(pg_temp.error_hint($$ update public.stories set rating = '18_plus'
    where id = '00000000-0000-4000-9000-000000002471' $$), 'rating_too_high_for_age',
  'nor 18+');
select is((select rating::text from public.stories where id = '00000000-0000-4000-9000-000000002472'), '18_plus',
  'a 17-year-old writer may rate a story 18+ (only readers of 18 and over read it)');
select lives_ok($$ update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001' $$,
  'an adult may rate a story 18+');

-- admin (…09) may raise ratings, but not past what the writer's age allows.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.error_hint($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-000000002471',
    '16_plus', 'Too intense for 13.') $$), 'rating_too_high_for_age',
  'staff can''t raise an under-16''s story past 13+ either');

select * from finish();
rollback;
