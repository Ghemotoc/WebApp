-- Database tests for hiding a story in chosen countries (bundle COUNTRY-1; Robert, 21 Nov 2026;
-- boards D07, B11 and S29).
-- What it proves:
-- - a story is hidden nowhere by default, and only its writer sets the countries (another member
--   gets 'not_found', a visitor is refused, a bad code is refused); codes are saved cleaned;
-- - a reader whose connection is in a hidden country can't open the story or find it in a list,
--   and story_unavailable_here() says so; the same reader connecting from elsewhere (travelling)
--   sees it again; a visitor is treated the same way;
-- - without a genuine, fresh token the member's own country decides; an old or forged token
--   counts as no token;
-- - the writer always sees their own story;
-- - staff with the classics role set the countries on a classic, logged; a member is refused and
--   a writer's story is not a classic.
-- No new table or policy: stories' policies are tested elsewhere; the setters check the owner or
-- the staff role themselves.
-- Personas: adult_writer (…01, the seed story's writer), teacher (…07, a reader living in RO),
-- admin (…09).
-- Test data: one published chapter of the seed story and one classic, inserted here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- A country token as server/signup-context.ts makes it, issued the given seconds ago.
create function pg_temp.token(country text, age_seconds integer) returns text language sql as $$
  select 'v1.' || country || '.' || (extract(epoch from now())::bigint - age_seconds)::text || '.'
    || encode(extensions.hmac('v1.' || country || '.' || (extract(epoch from now())::bigint - age_seconds)::text,
         'test-signup-secret', 'sha256'), 'hex');
$$;
-- The header the app sends on every request (src/lib/viewerCountry.ts), or none.
create function pg_temp.connect_from(token text) returns void language sql as $$
  select set_config('request.headers',
    case when token is null then '{}' else json_build_object('x-viewer-country', token)::text end, true);
$$;
-- Whether the story opens and whether the New list holds it (both functions are internal).
create function pg_temp.opens() returns boolean language sql security definer as $$
  select exists (select 1 from public.reader_visible_story('statia-meteo-seed01'));
$$;
create function pg_temp.listed() returns boolean language sql security definer as $$
  select exists (select 1 from public.listed_stories('new', null, null, null, null) as listed
                 where listed.slug = 'statia-meteo-seed01');
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- The secret the Pages Function and the database share (as 028-country.test.sql sets it).
select vault.create_secret('test-signup-secret', 'signup_context_secret')
  where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
select vault.update_secret(id, 'test-signup-secret') from vault.secrets where name = 'signup_context_secret';

insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'country1',
  96, 'Peste graniță', 'x', 2, 'published', 'Peste graniță', 'Primul paragraf.', 2, now());
update public.stories set first_published_at = now()
where id = '00000000-0000-4000-9000-000000000001' and first_published_at is null;

/* ---------- 1. The default and who may set it ---------- */

select is((select hidden_in_countries from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  '{}'::text[], 'a story is hidden in no country by default');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_my_story_hidden_countries('statia-meteo-seed01', array['MD']) ->> 'outcome',
  'not_found', 'another member can''t hide someone else''s story');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_story_hidden_countries('statia-meteo-seed01', array['MD']) $$,
  '42501', null, 'a visitor who isn''t signed in can''t hide a story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.set_my_story_hidden_countries('statia-meteo-seed01', array['Moldova']) $$,
  '23514', null, 'something that isn''t a two-letter country code is refused');
select is(public.set_my_story_hidden_countries('statia-meteo-seed01', array['no', ' md', 'NO']) ->> 'outcome',
  'ok', 'the writer hides their story in Moldova and Norway');
reset role;
select is((select hidden_in_countries from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  array['MD', 'NO'], 'the codes are saved in capitals, once each, in order');

/* ---------- 2. A reader in a hidden country, and the same reader travelling ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select pg_temp.connect_from(pg_temp.token('MD', 0));
select is(pg_temp.opens(), false, 'a reader connecting from Moldova can''t open the story');
select is(pg_temp.listed(), false, 'a reader connecting from Moldova doesn''t find it in a list');
-- COUNTRY-3 (Robert, 28 Nov 2026): the book page still opens there; only the chapters are refused.
select is(public.get_story_page('statia-meteo-seed01') ->> 'unavailable_here', 'true',
  'the book page still opens for them, saying the book isn''t available in their country');
select is(public.story_unavailable_here('statia-meteo-seed01'), true,
  'the page learns the country is the reason, so it can say the page isn''t available here');
select pg_temp.connect_from(pg_temp.token('SE', 0));
select is(pg_temp.opens(), true, 'the same reader connecting from Sweden opens it again');
select is(pg_temp.listed(), true, 'and finds it in the lists again');
select is(public.get_story_page('statia-meteo-seed01') ->> 'unavailable_here', 'false',
  'from Sweden the book page lets them read again');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select pg_temp.connect_from(pg_temp.token('MD', 0));
select is(public.get_story_page('statia-meteo-seed01') ->> 'unavailable_here', 'false',
  'the writer connecting from Moldova still sees their own story as readable');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select pg_temp.connect_from(pg_temp.token('SE', 0));
select is(public.story_unavailable_here('statia-meteo-seed01'), false,
  'a story that opens is not "unavailable here"');
select is(public.story_unavailable_here('no-such-story'), false,
  'a story that doesn''t exist is not "unavailable here" either, so nothing more is given away');

/* ---------- 3. No token, an old token, a forged token: the member's own country decides ---------- */

select pg_temp.connect_from(null);
select is(pg_temp.opens(), true, 'without a token a reader living in Romania opens a story hidden in Moldova');
reset role;
update public.profiles set country_code = 'MD' where id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.opens(), false, 'without a token a reader living in Moldova can''t open it');
select pg_temp.connect_from(pg_temp.token('SE', 7200));
select is(pg_temp.opens(), false, 'a token two hours old counts as no token');
select pg_temp.connect_from('v1.SE.' || extract(epoch from now())::bigint::text || '.' || repeat('0', 64));
select is(pg_temp.opens(), false, 'a forged token counts as no token');
reset role;
update public.profiles set country_code = 'RO' where id = '00000000-0000-4000-8000-000000000007';

/* ---------- 4. The writer, and a visitor ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select pg_temp.connect_from(pg_temp.token('MD', 0));
select is(pg_temp.opens(), true, 'the writer opens their own story from a country where it is hidden');
select pg_temp.sign_out();
select is(pg_temp.opens(), false, 'a visitor connecting from Norway or Moldova can''t open it');
select is(public.story_unavailable_here('statia-meteo-seed01'), true,
  'and the visitor is told the page isn''t available here');
select pg_temp.connect_from(null);
select is(pg_temp.opens(), true, 'a visitor whose country is unknown opens it (a block, not a lock)');

/* ---------- 5. Classics: staff set it, logged ---------- */

reset role;
select pg_temp.connect_from(null);
update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
create temporary table saved (story_id uuid, author_id uuid);
grant all on saved to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into saved (author_id) select public.admin_add_classic_author('Ion Creangă', 1889);
update saved set story_id = (public.admin_save_classic_work(jsonb_build_object(
  'title', 'Amintiri din copilărie', 'blurb', 'Copilăria la Humulești.',
  'author_id', (select author_id from saved), 'kind', 'novel', 'original_language', 'ro',
  'language_code', 'ro', 'category_slug', 'fiction', 'rating', 'all_ages',
  'source_title', 'Wikisource, ediția 1892', 'source_url', 'https://ro.wikisource.org/wiki/Amintiri_din_copilărie'))
  ->> 'story_id')::uuid;
select is(public.admin_set_classic_hidden_countries((select story_id from saved), array['us'])
  -> 'hidden_in_countries', '["US"]'::jsonb, 'an admin hides a classic in the United States');
select throws_ok($$ select public.admin_set_classic_hidden_countries('00000000-0000-4000-9000-000000000001', array['US']) $$,
  'P0002', null, 'a writer''s own story is not a classic, so staff can''t set it here');
select is(public.admin_save_classic_work(jsonb_build_object('edition_of_story_id', (select story_id from saved),
    'language_code', 'en', 'title', 'Memories of My Boyhood', 'blurb', 'A childhood in Humulești.',
    'translator_name', 'Ana Vlad')) -> 'hidden_in_countries',
  '["US"]'::jsonb, 'a new English edition starts hidden where the first edition is');
reset role;
select is((select count(*)::integer from public.audit_log
           where action = 'classics.hidden_countries_changed' and target_id = (select story_id from saved)::text),
  1, 'the change is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_classic_hidden_countries((select story_id from saved), array['US']) $$,
  '42501', null, 'a member can''t hide a classic');
reset role;
select is((select hidden_in_countries from public.stories where id = (select story_id from saved)),
  array['US'], 'the member''s try changed nothing');

select * from finish();
rollback;
