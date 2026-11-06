-- Staging top-up: the classics' real authors, Completed status and first publication year
-- (S1-E5-06; Robert, 25 Oct and 6 Nov 2026). GENERATED FILE.
--
-- Made by `npm run demo:build` from content/classics/texts/*.md; edit those files, not this one.
-- What it does: adds the 11 real authors to classic_authors and names each of the 20
-- classics' author, so every byline shows "Ion Creangă" and not the classics account; marks every
-- classic Completed; and sets the year each was first published (16 of 20; the rest are
-- blank until confirmed). Needs the migrations 20261028130001_s1_e5_06_classic_authors.sql and
-- 20270202110001_fix_classics_year_and_status.sql, and part 2a. Adds no accounts.
-- Rules (supabase/staging-topups/README.md): safe to run twice; never production (step 1).
-- How to check it worked: the last query shows classics_with_author 20, completed 20,
-- with_year 16, authors 11.
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
update public.stories
set completion_status = 'completed', first_published_year = 1875
where stories.id = '00000000-0000-4000-9300-000100000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1875);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000200000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1876
where stories.id = '00000000-0000-4000-9300-000200000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1876);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000300000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1880
where stories.id = '00000000-0000-4000-9300-000300000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1880);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000400000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1877
where stories.id = '00000000-0000-4000-9300-000400000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1877);
insert into public.classic_authors (name, died_year) values ($demo$Ion Creangă$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Creangă$demo$)
where stories.id = '00000000-0000-4000-9300-000500000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Creangă$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1876
where stories.id = '00000000-0000-4000-9300-000500000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1876);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000600000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1883
where stories.id = '00000000-0000-4000-9300-000600000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1883);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000700000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1873
where stories.id = '00000000-0000-4000-9300-000700000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1873);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000800000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1885
where stories.id = '00000000-0000-4000-9300-000800000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1885);
insert into public.classic_authors (name, died_year) values ($demo$Mihai Eminescu$demo$, 1889)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$)
where stories.id = '00000000-0000-4000-9300-000900000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Mihai Eminescu$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1876
where stories.id = '00000000-0000-4000-9300-000900000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1876);
insert into public.classic_authors (name, died_year) values ($demo$Ion Luca Caragiale$demo$, 1912)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$)
where stories.id = '00000000-0000-4000-9300-001000000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1900
where stories.id = '00000000-0000-4000-9300-001000000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1900);
insert into public.classic_authors (name, died_year) values ($demo$Ion Luca Caragiale$demo$, 1912)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$)
where stories.id = '00000000-0000-4000-9300-001100000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Ion Luca Caragiale$demo$);
update public.stories
set completion_status = 'completed', first_published_year = null
where stories.id = '00000000-0000-4000-9300-001100000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from null);
insert into public.classic_authors (name, died_year) values ($demo$George Coșbuc$demo$, 1918)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$George Coșbuc$demo$)
where stories.id = '00000000-0000-4000-9300-001200000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$George Coșbuc$demo$);
update public.stories
set completion_status = 'completed', first_published_year = null
where stories.id = '00000000-0000-4000-9300-001200000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from null);
insert into public.classic_authors (name, died_year) values ($demo$George Topîrceanu$demo$, 1937)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$George Topîrceanu$demo$)
where stories.id = '00000000-0000-4000-9300-001300000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$George Topîrceanu$demo$);
update public.stories
set completion_status = 'completed', first_published_year = null
where stories.id = '00000000-0000-4000-9300-001300000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from null);
insert into public.classic_authors (name, died_year) values ($demo$Barbu Ștefănescu Delavrancea$demo$, 1918)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Barbu Ștefănescu Delavrancea$demo$)
where stories.id = '00000000-0000-4000-9300-001400000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Barbu Ștefănescu Delavrancea$demo$);
update public.stories
set completion_status = 'completed', first_published_year = null
where stories.id = '00000000-0000-4000-9300-001400000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from null);
insert into public.classic_authors (name, died_year) values ($demo$Charles Dickens$demo$, 1870)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Charles Dickens$demo$)
where stories.id = '00000000-0000-4000-9300-001500000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Charles Dickens$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1843
where stories.id = '00000000-0000-4000-9300-001500000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1843);
insert into public.classic_authors (name, died_year) values ($demo$Edgar Allan Poe$demo$, 1849)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$)
where stories.id = '00000000-0000-4000-9300-001600000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1845
where stories.id = '00000000-0000-4000-9300-001600000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1845);
insert into public.classic_authors (name, died_year) values ($demo$Edgar Allan Poe$demo$, 1849)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$)
where stories.id = '00000000-0000-4000-9300-001700000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Edgar Allan Poe$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1839
where stories.id = '00000000-0000-4000-9300-001700000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1839);
insert into public.classic_authors (name, died_year) values ($demo$Charlotte Perkins Gilman$demo$, 1935)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Charlotte Perkins Gilman$demo$)
where stories.id = '00000000-0000-4000-9300-001800000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Charlotte Perkins Gilman$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1892
where stories.id = '00000000-0000-4000-9300-001800000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1892);
insert into public.classic_authors (name, died_year) values ($demo$Samuel Taylor Coleridge$demo$, 1834)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Samuel Taylor Coleridge$demo$)
where stories.id = '00000000-0000-4000-9300-001900000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Samuel Taylor Coleridge$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1798
where stories.id = '00000000-0000-4000-9300-001900000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1798);
insert into public.classic_authors (name, died_year) values ($demo$Christina Rossetti$demo$, 1894)
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = $demo$Christina Rossetti$demo$)
where stories.id = '00000000-0000-4000-9300-002000000000'::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = $demo$Christina Rossetti$demo$);
update public.stories
set completion_status = 'completed', first_published_year = 1862
where stories.id = '00000000-0000-4000-9300-002000000000'::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from 1862);
commit;

select json_build_object(
  'classics_with_author', (select count(*) from public.stories where slug like '%-classic' and classic_author_id is not null),
  'completed', (select count(*) from public.stories where slug like '%-classic' and completion_status = 'completed'),
  'with_year', (select count(*) from public.stories where slug like '%-classic' and first_published_year is not null),
  'authors', (select count(*) from public.classic_authors)
)::text as after_classic_authors;
