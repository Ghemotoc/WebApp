-- Database tests for the learning path (bundle GAPS-12g; board WritersHub).
-- What it proves:
-- - the path ships with exactly seven days, each with a title, a lesson and a task in both
--   languages;
-- - learning_path_steps_select_members: a signed-in member reads the days, a visitor can't;
-- - learning_path_progress_select_own: a writer reads their own ticks, another member and staff
--   read none;
-- - a writer ticks a day, ticking twice changes nothing, the tick comes off again, a day outside
--   the path is refused, and a signed-out caller is refused;
-- - writers_hub_learning_path() gives the seven days in order with only the caller's ticks;
-- - only staff with the contests area change a day's words, each change in the audit log; an
--   empty or long text and a day outside the path are refused, and no day can be added;
-- - the ticks are in Download my data and go with the account.
-- Personas: adult_writer (…01), teen_17 (…02), teacher (…07), admin (…09), moderator (…10).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or 'ok' when it runs.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
-- A day's texts as JSON, with one title for both languages.
create function pg_temp.step(title text) returns jsonb language sql as $$
  select jsonb_build_object('title_ro', title, 'title_en', title, 'lesson_ro', 'Lecție zq.', 'lesson_en', 'Lesson zq.',
    'task_ro', 'Sarcină zq.', 'task_en', 'Task zq.');
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The audit log is append-only, so the test counts from what was there before it.
create temporary table audit_before on commit drop as
  select pg_temp.audit_count('learning_step.saved') as saved;
grant select on audit_before to authenticated;
delete from public.learning_path_progress;

/* ---------- 1. The seven days ---------- */

select is((select array_agg(day_number order by day_number) from public.learning_path_steps), array[1, 2, 3, 4, 5, 6, 7],
  'the path ships with days 1 to 7');
select is((select count(*)::integer from public.learning_path_steps
           where btrim(title_ro) = '' or btrim(title_en) = '' or btrim(lesson_ro) = '' or btrim(lesson_en) = ''
              or btrim(task_ro) = '' or btrim(task_en) = ''), 0,
  'every day has its title, lesson and task in both languages');
select is(pg_temp.refusal($$ insert into public.learning_path_steps (day_number, title_ro, title_en, lesson_ro, lesson_en, task_ro, task_en)
  values (8, 'a', 'a', 'a', 'a', 'a', 'a') $$), '23514', 'the path never grows an eighth day');

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select count(*) from public.learning_path_steps $$), '42501',
  'denied: learning_path_steps_select_members: a visitor who isn''t logged in can''t read the days');
select is(pg_temp.refusal($$ select * from public.writers_hub_learning_path() $$), '42501',
  'nor through the hub''s function');
select is(pg_temp.refusal($$ select public.mark_learning_step(1, true) $$), '42501', 'nor tick a day');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.learning_path_steps), 7,
  'allowed: learning_path_steps_select_members: a signed-in member, a 17-year-old included, reads the seven days');

/* ---------- 2. Ticks ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.mark_learning_step(1, true), true, 'a writer ticks day 1');
select is(public.mark_learning_step(1, true), true, 'ticking it again changes nothing');
select public.mark_learning_step(3, true);
select is((select array_agg(day_number order by day_number) from public.learning_path_progress), array[1, 3],
  'allowed: learning_path_progress_select_own: the writer reads their own ticks, one per day');
select is((select array_agg(day_number order by day_number) from public.writers_hub_learning_path() where is_done), array[1, 3],
  'the hub''s list marks those days done');
select is((select array_agg(day_number) from public.writers_hub_learning_path()), array[1, 2, 3, 4, 5, 6, 7],
  'and gives the seven days in order');
select is(public.mark_learning_step(3, false), false, 'a tick comes off again');
select is((select count(*)::integer from public.learning_path_progress), 1, 'and its row is gone');
select is(pg_temp.refusal($$ select public.mark_learning_step(8, true) $$), '23514', 'day 8 is refused');
select is(pg_temp.refusal($$ select public.mark_learning_step(null, true) $$), '23514', 'and so is no day at all');
select is(pg_temp.refusal($$ insert into public.learning_path_progress (user_id, day_number)
  values ('00000000-0000-4000-8000-000000000001', 2) $$), '42501', 'a tick can''t be written past the function');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.learning_path_progress), 0,
  'denied: learning_path_progress_select_own: another member reads none');
select is((select count(*)::integer from public.writers_hub_learning_path() where is_done), 0,
  'and sees no tick of someone else''s on their own path');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.learning_path_progress), 0, 'an admin reads none either');

/* ---------- 3. Staff change the words ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.admin_save_learning_step(1, pg_temp.step('Titlu zq')) $$), '42501',
  'a member can''t change a day');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select public.admin_save_learning_step(1, pg_temp.step('Titlu zq')) $$), '42501',
  'a moderator, who has no contests area, can''t either');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.refusal($$ select public.admin_save_learning_step(1, pg_temp.step(' ')) $$)
    || ',' || pg_temp.refusal($$ select public.admin_save_learning_step(1, pg_temp.step(repeat('x', 81))) $$)
    || ',' || pg_temp.refusal($$ select public.admin_save_learning_step(8, pg_temp.step('Titlu zq')) $$)
    || ',' || pg_temp.refusal($$ select public.admin_save_learning_step(1, pg_temp.step('Titlu zq') - 'lesson_en') $$),
  '23514,23514,P0002,23514', 'an empty title, a long title, a day outside the path and a missing lesson are refused');
select public.admin_save_learning_step(1, pg_temp.step('  Titlu zq  '));
select is((select title_en || '|' || (pg_temp.audit_count('learning_step.saved') - (select saved from audit_before))
           from public.learning_path_steps where day_number = 1),
  'Titlu zq|1', 'an admin changes a day, trimmed, and it is in the audit log once');

/* ---------- 4. Download my data and account deletion ---------- */

-- The two rule lists are internal, so the test reads them as the database owner.
reset role;
select is((select string_agg(is_included::text, ',') from public.data_export_tables() where table_name = 'learning_path_progress')
    || '|' || (select action from public.account_deletion_rules() where table_name = 'learning_path_progress'),
  'true|delete', 'the ticks are in Download my data and go with the account');

select * from finish();
rollback;
