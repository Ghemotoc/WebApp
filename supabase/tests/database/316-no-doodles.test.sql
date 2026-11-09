-- Database tests for bundle NO-DOODLES (Robert, 9 Nov 2026: no doodles anywhere in the app; the
-- "Doodles" cover pattern gets another name). Migration 20270205100014_no_doodles_retire_doodles.
-- What it proves:
-- - the seasonal doodle schedule is gone: no seasonal_occasions table, no seasonal_doodle type and
--   no current_seasonal_doodle() for Discover to call;
-- - forums have no doodle column, and forum_index() and admin_list_forums() return none;
-- - a drawn cover can use "sparkles" and can no longer use "doodles".
-- No policy or grant was added, so there is no new policy to test here; the forum functions keep
-- their staff checks, which 221-forum-categories tests.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- 1. The seasonal doodle schedule (S1-E11-11) is retired.
select hasnt_table('public', 'seasonal_occasions', 'the seasonal doodle schedule table is gone');
select hasnt_type('public', 'seasonal_doodle', 'the seasonal doodle list is gone');
select hasnt_function('public', 'current_seasonal_doodle', 'Discover has no seasonal doodle to ask for');

-- 2. Forums carry no doodle.
select hasnt_column('public', 'forums', 'doodle', 'a forum has no doodle');
select is_empty(
  $$ select 1 from information_schema.parameters
     where specific_schema = 'public' and parameter_name = 'doodle'
       and specific_name like any (array['forum_index%', 'admin_list_forums%', 'admin_save_forum%']) $$,
  'no forum function takes or returns a doodle'
);

-- 3. The "doodles" cover pattern is now "sparkles". The seed story of adult_writer (…01) is used.
select lives_ok(
  $$ update public.stories set cover_kind = 'drawn', cover_design = 'sparkles',
       cover_background = 'paper', cover_accent = 'violet'
     where id = '00000000-0000-4000-9000-000000000001' $$,
  'a drawn cover can use the Sparkles pattern'
);
select throws_ok(
  $$ update public.stories set cover_design = 'doodles' where id = '00000000-0000-4000-9000-000000000001' $$,
  '23514', null,
  'a drawn cover can no longer use the old Doodles name'
);
select is_empty(
  $$ select 1 from public.stories where cover_design = 'doodles' $$,
  'no story keeps the old Doodles name'
);

select * from finish();
rollback;
