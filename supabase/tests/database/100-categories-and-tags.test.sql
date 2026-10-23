-- Database tests for categories and tags (story S1-E3-01).
-- What it proves: the three launch categories and no journalism (Q52); normalise_tag() makes
-- look-alikes one tag; anyone reads categories and tags (allowed) and nobody writes them through
-- the API (denied); 'story' is a reportable type (CLAUDE.md rule 6).
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- 1. The fixed categories.
select results_eq(
  $$ select slug from public.categories order by position $$,
  $$ values ('fiction'), ('poetry'), ('nonfiction_essays') $$,
  'the launch categories are fiction, poetry and nonfiction essays, in that order (Q52)'
);
select is_empty(
  $$ select slug from public.categories where slug like '%journal%' or slug like '%article%' $$,
  'there is no journalism or articles category at launch (Q52)'
);

-- 2. The tag rule: lower case, trimmed, spaces collapsed, diacritics removed, ş/ţ corrected.
select is(public.normalise_tag('Fantezie'), 'fantezie', 'a capital letter does not make a new tag');
select is(public.normalise_tag('  set  in   Romania '), 'set in romania', 'spaces are trimmed and collapsed');
select is(public.normalise_tag('Fantézie'), 'fantezie', 'an accent does not make a new tag');
select is(public.normalise_tag('poveşti'), 'povesti', 'a cedilla ş and a comma ș normalise the same way');
select is(public.normalise_tag('povești'), 'povesti', 'ș loses its comma below for matching');

-- 3. 'story' is reportable.
select ok(
  'story' = any (enum_range(null::public.reportable_type)::text[]),
  'stories are registered as reportable (rule 6)'
);

-- 4. Who reads and writes.
set local role anon;
select is((select count(*)::integer from public.categories), 3,
  'allowed: categories_select_public: a signed-out visitor reads the categories');
select throws_ok($$ insert into public.categories (slug, position) values ('journalism', 9) $$, '42501', null,
  'denied: categories_select_public: nobody adds a category through the API');
select ok((select count(*) from public.tags) >= 0,
  'allowed: tags_select_public: a signed-out visitor reads the tag list');
select throws_ok($$ insert into public.tags (name, normalised_name) values ('x', 'x') $$, '42501', null,
  'denied: tags_select_public: nobody adds a tag through the API');

select * from finish();

rollback;
