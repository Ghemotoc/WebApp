-- Database tests for years before Christ on classics (BC-YEARS; CONTENT thread, 27 Nov 2026).
-- What it proves:
-- - an author's death year and a work's first publication year may be before Christ (negative);
-- - there is no year 0, and nothing earlier than 3000 BC;
-- - staff add an author from antiquity through admin_add_classic_author().
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select lives_ok($$ insert into public.classic_authors (name, died_year) values ('Platon', -348) $$,
  'an author who died in 348 BC is kept');
select throws_ok($$ insert into public.classic_authors (name, died_year) values ('Nimeni', 0) $$,
  '23514', null, 'there is no year 0');
select throws_ok($$ insert into public.classic_authors (name, died_year) values ('Prea vechi', -3001) $$,
  '23514', null, 'nothing earlier than 3000 BC');
select lives_ok($$ update public.stories set first_published_year = -429
  where id = '00000000-0000-4000-9000-000000000001' $$,
  'a story may be first published in 429 BC');
select throws_ok($$ update public.stories set first_published_year = 0
  where id = '00000000-0000-4000-9000-000000000001' $$,
  '23514', null, 'but never in year 0');
select ok(exists (select 1 from pg_constraint where conname = 'classic_works_first_published_year_check'
  and pg_get_constraintdef(oid) like '%-3000%'),
  'a work''s own first publication year takes the same range');

-- Staff add an author from antiquity (the owner persona, as 393-hide-in-countries signs in).
update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
select set_config('role', 'authenticated', true),
  set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}', true);
select ok(public.admin_add_classic_author('Sofocle', -406) is not null,
  'staff add Sophocles, who died in 406 BC');

select * from finish();
rollback;
