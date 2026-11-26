-- Database tests for searching spaces, the search results' Spaces tab (user story 1.8, board
-- A08-SearchResults).
-- What it proves:
-- - a space is found by its name or its description, without diacritics or capitals;
-- - a term under 2 letters finds nothing;
-- - a class space shows only to its class, an under-16 space only to under-16s, as on the Spaces
--   page (space_card_visible());
-- - the answer carries no user ID.
-- Personas: adult_writer (…01), teen_17 (…02, made 14 here, as in 227-spaces), teacher (…07).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The addresses of the spaces a search found, in order.
create function pg_temp.found(term text) returns text language sql as $$
  select coalesce(string_agg(space ->> 'slug', ',' order by position), '')
  from jsonb_array_elements(public.search_spaces(term) -> 'spaces') with ordinality as listed(space, position);
$$;
-- Makes teen_17 14 by year of birth, as 227-spaces does; the year of birth never changes in the
-- app (S1-E2-12), so the test lifts that trigger for this transaction only.
alter table public.profiles disable trigger profiles_birth_year_never_changes;
update public.profiles set birth_year = extract(year from now())::integer - 14, birth_month = null
where profiles.id = '00000000-0000-4000-8000-000000000002';
-- The March flag keeps under-18s read-only (adults_only) and parental consent is for its own
-- tests; both are off here so an under-16 can start a space, as in 227-spaces.
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Three spaces with the same odd word: an open 16+ one, a class and an under-16 one.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_space('Cercul poeților Qwzx', 'Ne întâlnim seara să citim.', readers => 'everybody');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a IX-a Qwzx', 'Cercul de lectură al clasei.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.create_space('Tineri Qwzx', 'Povești scurte.');

/* ---------- 1. Name and description, without diacritics ---------- */

select pg_temp.sign_out();
select is(pg_temp.found('poetilor qwzx'), 'cercul-poetilor-qwzx',
  'a visitor finds a space by its name, typed without diacritics');
select is(pg_temp.found('INTALNIM SEARA'), 'cercul-poetilor-qwzx',
  'and by words of its description, in any case');
select is((public.search_spaces('qwzx') ->> 'total')::integer, 1,
  'a visitor finds only the open 16+ space, and the total counts it alone');
select is(pg_temp.found('q'), '', 'a term under 2 letters finds nothing');

/* ---------- 2. Who sees which card ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(pg_temp.found('qwzx') !~ 'clasa', 'an adult outside the class doesn''t find the class space');
select ok(pg_temp.found('qwzx') !~ 'tineri', 'an adult doesn''t find an under-16 space');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(pg_temp.found('qwzx') ~ 'clasa-a-ix-a-qwzx', 'the teacher finds their own class space');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(pg_temp.found('qwzx') ~ 'tineri-qwzx', 'a 14-year-old finds the under-16 space');

/* ---------- 3. No user ID ---------- */

select ok(not (public.search_spaces('qwzx')::text ~ '00000000-0000-4000-8000'),
  'no space found carries a user ID');

select * from finish();
rollback;
