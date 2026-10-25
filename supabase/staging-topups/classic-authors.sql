-- Staging top-up: the classics' real authors (part of S1-E5-06; Robert, 25 Oct 2026). GENERATED FILE.
--
-- Made by `npm run demo:build` from content/classics/texts/*.md; edit those files, not this one.
-- What it does: adds the 11 real authors to classic_authors and names each of the 20
-- classics' author, so every byline shows "Ion Creangă" and not the classics account. Needs the
-- migration 20261028130001_s1_e5_06_classic_authors.sql and part 2a. Adds no accounts.
-- Rules (supabase/staging-topups/README.md): safe to run twice; never production (step 1).
-- How to check it worked: the last query shows classics_with_author 20, authors 11.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000100000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000200000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000300000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000400000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000500000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000600000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000700000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000800000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000900000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Ion Luca Caragiale$demo$, 1912)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$)
where stories.id = '00000000-0000-4000-9300-001000000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Ion Luca Caragiale$demo$, 1912)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$)
where stories.id = '00000000-0000-4000-9300-001100000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$);
insert into public.classic_authors (name, died_year) values ($demo$George Coșbuc$demo$, 1918)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$George Coșbuc$demo$)
where stories.id = '00000000-0000-4000-9300-001200000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$George Coșbuc$demo$);
insert into public.classic_authors (name, died_year) values ($demo$George Topîrceanu$demo$, 1937)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$George Topîrceanu$demo$)
where stories.id = '00000000-0000-4000-9300-001300000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$George Topîrceanu$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Barbu Ștefănescu Delavrancea$demo$, 1918)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Barbu Ștefănescu Delavrancea$demo$)
where stories.id = '00000000-0000-4000-9300-001400000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Barbu Ștefănescu Delavrancea$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Charles Dickens$demo$, 1870)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Charles Dickens$demo$)
where stories.id = '00000000-0000-4000-9300-001500000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Charles Dickens$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Edgar Allan Poe$demo$, 1849)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$)
where stories.id = '00000000-0000-4000-9300-001600000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Edgar Allan Poe$demo$, 1849)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$)
where stories.id = '00000000-0000-4000-9300-001700000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Charlotte Perkins Gilman$demo$, 1935)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Charlotte Perkins Gilman$demo$)
where stories.id = '00000000-0000-4000-9300-001800000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Charlotte Perkins Gilman$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Samuel Taylor Coleridge$demo$, 1834)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Samuel Taylor Coleridge$demo$)
where stories.id = '00000000-0000-4000-9300-001900000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Samuel Taylor Coleridge$demo$);
insert into public.classic_authors (name, died_year) values ($demo$Christina Rossetti$demo$, 1894)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Christina Rossetti$demo$)
where stories.id = '00000000-0000-4000-9300-002000000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Christina Rossetti$demo$);
commit;

select json_build_object(
  'classics_with_author', (select count(*) from public.stories where slug like '%-classic' and classic_author_id is not null),
  'authors', (select count(*) from public.classic_authors)
)::text as after_classic_authors;
