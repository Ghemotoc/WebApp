-- Database tests for classics showing their real author (part of story S1-E5-06; Robert,
-- 25 Oct 2026; CLAUDE.md rule 1).
-- What it proves:
-- - policy classic_authors_select_everyone: a visitor and a member read the authors (allowed);
--   nobody adds, changes or removes one directly (denied: no write policy, no grant);
-- - an author must have died in 1955 or earlier (public domain in Romania in 2026);
-- - a classic's byline is its real author on the cards, the story page, the reader and the link
--   preview, with classic_author {name, died_year}; a writer's own story keeps the pen name and
--   has no classic_author.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- The card a list draws for one story, by slug.
create function pg_temp.card_of(answer jsonb, target_slug text) returns jsonb language sql as $$
  select story from jsonb_array_elements(answer -> 'stories') as story where story ->> 'slug' = target_slug;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) two seed stories each get a published chapter. seed01 becomes a classic
-- by Ion Creangă; seed02 stays the writer's own.
insert into public.classic_authors (id, name, died_year)
values ('00000000-0000-4000-9400-000000000001', 'Ion Creangă', 1889);
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'clas0001', 1,
   'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'clas0002', 1,
   'One', 'x', 3, 'published', 'One', 'The first chapter here.', 3, now() - interval '1 day');
update public.stories set classic_author_id = '00000000-0000-4000-9400-000000000001',
  first_published_at = now() - interval '2 days', last_chapter_published_at = now() - interval '2 days'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '1 day', last_chapter_published_at = now() - interval '1 day'
where id = '00000000-0000-4000-9000-000000000002';

/* ---------- 1. The authors table ---------- */

-- Since S1-E11-16 any real year of death is allowed: classic_free_markets() decides by date
-- whether a work may be published (test 160), so authors who become free next 1 January fit.
select throws_ok($$ insert into public.classic_authors (name, died_year) values ('Not Born Yet', 2200) $$,
  '23514', null, 'an impossible year of death is refused');

select pg_temp.as_visitor();
select is((select name from public.classic_authors where died_year = 1889), 'Ion Creangă',
  'allowed: classic_authors_select_everyone, a visitor reads the authors');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.classic_authors where name = 'Ion Creangă'), 1,
  'allowed: classic_authors_select_everyone, a member reads them too');
select throws_ok($$ insert into public.classic_authors (name, died_year) values ('Mihai Eminescu', 1889) $$,
  '42501', null, 'denied: classic_authors_select_everyone only reads, so a member can''t add an author');
select throws_ok($$ update public.classic_authors set name = 'Someone else' $$,
  '42501', null, 'denied: nor change one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ delete from public.classic_authors $$,
  '42501', null, 'denied: nor can an admin remove one directly (the staff form comes with S1-E11-16)');

/* ---------- 2. The bylines ---------- */

select pg_temp.as_visitor();
select is(pg_temp.card_of(public.browse_stories('new'), 'statia-meteo-seed01') -> 'writer' ->> 'display_name',
  'Ion Creangă', 'a classic''s card names its real author');
select is(pg_temp.card_of(public.browse_stories('new'), 'statia-meteo-seed01') -> 'writer' -> 'classic_author',
  jsonb_build_object('name', 'Ion Creangă', 'died_year', 1889, 'source_title', null,
    'source_url', null, 'translator_name', null),
  'and says it is a classic, with the year of death (the source comes with S1-E11-16)');
select is(pg_temp.card_of(public.browse_stories('new'), 'the-girl-who-fixed-radios-seed02') -> 'writer' -> 'classic_author',
  'null'::jsonb, 'a writer''s own story is no classic');
select isnt(pg_temp.card_of(public.browse_stories('new'), 'the-girl-who-fixed-radios-seed02') -> 'writer' ->> 'display_name',
  'Ion Creangă', 'and keeps the writer''s own name');
select is(public.get_story_page('statia-meteo-seed01') -> 'writer' ->> 'display_name', 'Ion Creangă',
  'the story page names the real author');
select is(public.get_chapter('statia-meteo-seed01', 'clas0001') -> 'story' -> 'writer' ->> 'display_name',
  'Ion Creangă', 'so does the reader');
select is(public.get_link_preview('statia-meteo-seed01') -> 'writer' ->> 'display_name', 'Ion Creangă',
  'and the link preview');

select * from finish();
rollback;
