-- 18+ stories for visitors who aren't logged in (bundle CALM-9m; Robert, 23 Nov 2026, 09:04 UTC).
-- What it proves:
-- - a visitor opens an 18+ story's page and its reader, but gets no chapter text until the app
--   says they answered "I'm 18 or over" (the X-Visitor-Adult header), and then the usual teaser;
-- - 16+ stays closed to visitors, header or not (visitors count as under 16, Q6);
-- - a signed-in under-18 account never opens an 18+ story, even with the header;
-- - lists still leave 18+ out for visitors (the usual mature filter).
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true),
         set_config('request.headers', '{}', true);
$$;
create function pg_temp.visitor(said_adult boolean) returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true),
         set_config('request.headers',
           case when said_adult then '{"x-visitor-adult": "yes"}' else '{}' end, true);
$$;

-- adult_writer's "Stația meteo" gets one published chapter and an 18+ rating.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'matur396', 1,
  'Caietele', 'Primul rând al poveștii.', 5, 'draft');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.publish_chapter('matur396') ->> 'outcome', 'ok', 'adult_writer publishes a chapter');
reset role;
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001';

-- 1. A visitor who hasn't answered yet.
select pg_temp.visitor(false);
select isnt(public.get_story_page('statia-meteo-seed01'), null,
  'a visitor opens an 18+ story''s page');
select is(public.get_chapter('statia-meteo-seed01', 'matur396') ->> 'needs_adult_answer', 'true',
  'the reader asks a visitor first');
select is(public.get_chapter('statia-meteo-seed01', 'matur396') ->> 'body', '',
  'and sends no chapter text before the answer');

-- 2. The same visitor after "I'm 18 or over, show it".
select pg_temp.visitor(true);
select is(public.get_chapter('statia-meteo-seed01', 'matur396') ->> 'needs_adult_answer', 'false',
  'after the answer the reader doesn''t ask again');
select is(public.get_chapter('statia-meteo-seed01', 'matur396') ->> 'body', 'Primul rând al poveștii.',
  'and sends the text as for any story (the teaser, here the whole short chapter)');
select is(public.rating_allows('18_plus'), false,
  'lists still leave 18+ out for visitors: their rating filter (rating_allows) is unchanged');

-- 3. 16+ stays closed to visitors, answer or not.
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.visitor(true);
select is(public.get_story_page('statia-meteo-seed01'), null, 'a visitor still can''t open a 16+ story');
select is(public.get_chapter('statia-meteo-seed01', 'matur396'), null, 'nor its chapters');

-- 4. A signed-in under-18 account never opens an 18+ story, whatever its browser sends.
reset role;
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select set_config('request.headers', '{"x-visitor-adult": "yes"}', true);
select is(public.get_story_page('statia-meteo-seed01'), null, 'teen_17 can''t open an 18+ story');
select is(public.get_chapter('statia-meteo-seed01', 'matur396'), null,
  'nor read its chapter, even with the visitor''s answer sent');

select * from finish();
rollback;
