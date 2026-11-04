-- Database tests for "Sponsored by" on a contest's own page (story S1-E12-02 criterion 3; bundle
-- SPONSORS-b3).
-- What it proves:
-- - a visitor on a contest's page (/c/<slug>) gets the live sponsor of that contest;
-- - the contest's ID still works as in part b1;
-- - another page, an archived page or a campaign that isn't live gives no credit.
-- Personas: admin (…09) makes the sponsor and the campaign through the staff functions.
-- Test data: made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;

create temporary table kept (label text primary key, id uuid);
grant all on kept to anon, authenticated;

-- Step 1: a contest page and its contest, made directly (their own tests cover the staff screens).
insert into public.landing_pages (slug, page_type) values ('premiul-test-272', 'contest'), ('alt-test-272', 'contest');
insert into public.contests (landing_page_id, name_ro, name_en)
select id, 'Premiul de test', 'Test prize' from public.landing_pages where slug = 'premiul-test-272';
insert into kept (label, id) select 'contest', contests.id from public.contests
  join public.landing_pages on landing_pages.id = contests.landing_page_id where landing_pages.slug = 'premiul-test-272';

-- Step 2: the admin adds a sponsor and an approved contest credit that runs today.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) select 'sponsor', (public.admin_save_sponsor(null, 'Editura Test', 'https://editura.example'));
insert into kept (label, id)
select 'credit', (public.admin_save_sponsor_campaign(null, jsonb_build_object(
  'sponsor_id', (select id from kept where label = 'sponsor'), 'name', 'Premiul, sponsorizat',
  'placement', 'contest', 'contest_id', (select id from kept where label = 'contest'),
  'starts_on', public.romania_today()::text, 'ends_on', (public.romania_today() + 30)::text)) ->> 'id')::uuid;
select public.admin_submit_sponsor_campaign((select id from kept where label = 'credit'));
select public.admin_review_sponsor_campaign((select id from kept where label = 'credit'), 'approve', public.sponsor_review_checks(), '');
reset role;

-- Step 3: what a visitor gets.
select pg_temp.as_visitor();
select is(public.sponsor_credit('contest_page', 'premiul-test-272') ->> 'sponsor_name', 'Editura Test',
  'a visitor on the contest''s page sees "Sponsored by" with the sponsor''s name');
select is(public.sponsor_credit('contest', (select id::text from kept where label = 'contest')) ->> 'sponsor_name',
  'Editura Test', 'the contest''s ID still names the same sponsor');
select is(public.sponsor_credit('contest_page', 'alt-test-272'), null, 'another contest''s page has no credit');
reset role;

-- Step 4: an archived page, then a campaign that has ended.
update public.landing_pages set archived_at = now() where slug = 'premiul-test-272';
select pg_temp.as_visitor();
select is(public.sponsor_credit('contest_page', 'premiul-test-272'), null, 'an archived page shows no credit');
reset role;
update public.landing_pages set archived_at = null where slug = 'premiul-test-272';
update public.sponsor_campaigns set state = 'ended' where id = (select id from kept where label = 'credit');
select pg_temp.as_visitor();
select is(public.sponsor_credit('contest_page', 'premiul-test-272'), null, 'an ended campaign shows no credit');
reset role;

select * from finish();
rollback;
