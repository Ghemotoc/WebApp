-- Database tests for the content settings screen (story S1-E11-03; CLAUDE.md rule 1).
-- What it proves:
-- - owner and admin switch a flag and change a setting; each change is in the audit log with the
--   before and after values; a moderator, a content editor and a member are refused (criterion 1);
-- - a setting keeps its shape: another type, a number below zero, a repeated item or a changed set
--   of parts is refused;
-- - categories move one place at a time and stay in order at the ends;
-- - reserved names and username words are added and removed; the platform's own names stay.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to authenticated;

/* ---------- Flags ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_set_flag('maintenance_mode', true), true, 'an admin switches maintenance mode on');
select is((select is_enabled from public.feature_flags where key = 'maintenance_mode'), true,
  'and the flag is on at once');
select throws_ok($$ select public.admin_set_flag('no_such_flag', true) $$, 'P0002', null, 'an unknown flag is refused');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'settings.flag' and target_id = 'maintenance_mode'
                  and before_values ->> 'is_enabled' = 'false' and after_values ->> 'is_enabled' = 'true'),
  'the switch is logged with before and after');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_set_flag('maintenance_mode', false) $$, '42501', null, 'a moderator is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_set_flag('maintenance_mode', false) $$, '42501', null, 'a content editor is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_setting('teaser_length', '300') $$, '42501', null, 'a member is refused');

/* ---------- Named values ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(public.admin_set_setting('teaser_length', '300'), '300'::jsonb, 'the owner changes the teaser length');
select throws_ok($$ select public.admin_set_setting('teaser_length', '"long"') $$, '23514', null,
  'a number can''t become a word');
select throws_ok($$ select public.admin_set_setting('ranking_weight_likes', '-1') $$, '23514', null,
  'a number can''t go below zero');
select throws_ok($$ select public.admin_set_setting('discover_shelves', '["new", "new"]') $$, '23514', null,
  'a list can''t repeat an item');
select is(public.admin_set_setting('discover_shelves', '["new", "popular"]'), '["new", "popular"]'::jsonb,
  'a list can be reordered and shortened');
select throws_ok($$ select public.admin_set_setting('rate_limits', '{"appeal": {"new_account": 1, "older_account": 2}}') $$,
  '23514', null, 'an object keeps all its parts');
select lives_ok($$ select public.admin_set_setting('rate_limits', jsonb_set(value, '{appeal,new_account}', '2'))
                   from public.settings where key = 'rate_limits' $$,
  'and one part of it can change');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'settings.value' and target_id = 'teaser_length'
                  and before_values ->> 'value' = '600' and after_values ->> 'value' = '300'),
  'a setting change is logged with before and after');

/* ---------- Categories ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_move_category('poetry', -1), 1, 'poetry moves to the top');
select is(public.admin_move_category('poetry', -1), 1, 'and stays there when moved up again');
select results_eq($$ select slug from public.categories order by position $$,
  $$ values ('poetry'), ('fiction'), ('nonfiction_essays') $$, 'the order readers see changed');

/* ---------- Reserved names and words ---------- */

insert into named select 'name', public.admin_add_reserved_name('editura', 'whole_name');
select ok(public.admin_remove_reserved_name((select id from named where label = 'name')),
  'an admin reserves a name and frees it again');
select throws_ok($$ select public.admin_remove_reserved_name((select id from public.reserved_names where reason = 'system' limit 1)) $$,
  '23514', null, 'the platform''s own names stay reserved');
insert into named select 'word', public.admin_add_name_word('ro', 'cuvântdetest', 'anywhere');
select ok(public.admin_remove_name_word((select id from named where label = 'word')),
  'an admin adds a word to the Romanian list and removes it');

select * from finish();
rollback;
