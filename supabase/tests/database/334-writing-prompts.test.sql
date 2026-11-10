-- Database tests for the prompt of the week (bundle GAPS-12c; board WritersHub).
-- What it proves:
-- - writing_prompts_select_contest_staff: staff with the contests area read the prompts; a member
--   and a moderator (no contests area) read none;
-- - only that staff adds, changes and deletes prompts, and each change is in the audit log; an
--   empty text, a missing day and a second prompt on the same start day are refused;
-- - writers_hub_prompts() shows started prompts only, newest first, says which is this week's
--   and when it ends, and refuses a signed-out caller;
-- - start_story_from_prompt() ties the caller's own story to a started prompt once; someone
--   else's story, an upcoming prompt and a second try answer false;
-- - the writer count is distinct writers with a live story, and a deleted prompt leaves the hub.
-- Personas: adult_writer (…01, two seed stories), teen_17 (…02, one seed story), admin (…09),
-- moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

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
-- Prompt IDs the test names later, kept where every role can read them.
create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept(wanted text) returns uuid language sql as $$
  select id from kept where label = wanted;
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
-- A story's prompt, read past the policies.
create function pg_temp.prompt_of(wanted_slug text) returns uuid language sql security definer as $$
  select writing_prompt_id from public.stories where slug = wanted_slug;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Who may write prompts ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.admin_save_writing_prompt(null, 'Scrie', 'Write', public.romania_today()) $$),
  '42501', 'a member can''t add a writing prompt');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select public.admin_save_writing_prompt(null, 'Scrie', 'Write', public.romania_today()) $$),
  '42501', 'a moderator, who has no contests area, can''t either');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.refusal($$ select public.admin_save_writing_prompt(null, ' ', 'Write', public.romania_today()) $$),
  '23514', 'a prompt needs words in Romanian');
select is(pg_temp.refusal($$ select public.admin_save_writing_prompt(null, 'Scrie', 'Write', null) $$),
  '23514', 'and a start day');
-- This week's prompt (started 2 days ago), last month's and next week's.
insert into kept select 'current', public.admin_save_writing_prompt(null, ' O scrisoare care ajunge prea târziu. ',
  'A letter that arrives too late.', public.romania_today() - 2);
insert into kept select 'old', public.admin_save_writing_prompt(null, 'Ultimul tren.', 'The last train.',
  public.romania_today() - 30);
insert into kept select 'upcoming', public.admin_save_writing_prompt(null, 'O ușă nouă.', 'A new door.',
  public.romania_today() + 5);
select is(pg_temp.audit_count('writing_prompt.saved'), 3, 'each added prompt is in the audit log');
select is(pg_temp.refusal($$ select public.admin_save_writing_prompt(null, 'Alta', 'Another', public.romania_today() - 2) $$),
  '23505', 'two prompts can''t start on the same day');
select is(pg_temp.refusal($$ select public.admin_save_writing_prompt(gen_random_uuid(), 'Alta', 'Another', public.romania_today()) $$),
  'P0002', 'an unknown prompt can''t be changed');
select public.admin_save_writing_prompt(pg_temp.kept('old'), 'Ultimul tren de noapte.', 'The last night train.',
  public.romania_today() - 30);
select is(pg_temp.audit_count('writing_prompt.saved'), 4, 'a change is logged too');

/* ---------- 2. Who reads the table ---------- */

select is((select count(*)::integer from public.writing_prompts where id in (select id from kept)), 3,
  'allowed: writing_prompts_select_contest_staff lets an admin read every prompt, the upcoming one included');
select is((select btrim(prompt_ro) = prompt_ro from public.writing_prompts where id = pg_temp.kept('current')), true,
  'the words are saved without spaces around them');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.writing_prompts), 0,
  'denied: writing_prompts_select_contest_staff shows a member nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.writing_prompts), 0,
  'denied: writing_prompts_select_contest_staff shows a moderator nothing');

/* ---------- 3. The hub's list ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select * from public.writers_hub_prompts() $$), '42501',
  'a visitor who isn''t logged in gets no prompts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select array_agg(prompt_id order by starts_on desc) from public.writers_hub_prompts()
           where prompt_id in (select id from kept)),
  array[pg_temp.kept('current'), pg_temp.kept('old')],
  'a member gets the started prompts, newest first, and never the upcoming one');
select is((select row(is_current, ends_on, writer_count)::text from public.writers_hub_prompts()
           where prompt_id = pg_temp.kept('current')),
  row(true, public.romania_today() + 4, 0)::text,
  'this week''s prompt says so, ends 6 days after it starts and starts with no writers');
select is((select is_current from public.writers_hub_prompts() where prompt_id = pg_temp.kept('old')), false,
  'last month''s prompt is not this week''s');

/* ---------- 4. Writing from a prompt ---------- */

select is(public.start_story_from_prompt('statia-meteo-seed01', pg_temp.kept('current')), true,
  'a writer ties their own story to this week''s prompt');
select is(pg_temp.prompt_of('statia-meteo-seed01'), pg_temp.kept('current'), 'and the story remembers it');
select is(public.start_story_from_prompt('statia-meteo-seed01', pg_temp.kept('old')), false,
  'a story keeps its first prompt');
select is(public.start_story_from_prompt('the-girl-who-fixed-radios-seed02', pg_temp.kept('upcoming')), false,
  'an upcoming prompt can''t be used yet');
select is(public.start_story_from_prompt('scrisori-din-cutia-postala-seed03', pg_temp.kept('current')), false,
  'someone else''s story can''t be tied to a prompt');
select is(pg_temp.prompt_of('scrisori-din-cutia-postala-seed03'), null, 'and it stays as it was');
select public.start_story_from_prompt('the-girl-who-fixed-radios-seed02', pg_temp.kept('current'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.start_story_from_prompt('scrisori-din-cutia-postala-seed03', pg_temp.kept('current'));
select is((select writer_count from public.writers_hub_prompts() where prompt_id = pg_temp.kept('current')), 2,
  'the count is writers, not stories: two stories by one writer count once');
select pg_temp.sign_out();
select is(pg_temp.refusal(format($$ select public.start_story_from_prompt('statia-meteo-seed01', %L) $$, pg_temp.kept('current'))),
  '42501', 'a visitor who isn''t logged in can''t tie a story to a prompt');

/* ---------- 5. Deleting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal(format($$ select public.admin_delete_writing_prompt(%L) $$, pg_temp.kept('current'))),
  '42501', 'a member can''t delete a prompt');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_delete_writing_prompt(pg_temp.kept('current'));
select is(pg_temp.audit_count('writing_prompt.deleted'), 1, 'an admin deletes one, and it is logged');
select is(pg_temp.refusal(format($$ select public.admin_delete_writing_prompt(%L) $$, pg_temp.kept('current'))),
  'P0002', 'a deleted prompt can''t be deleted again');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.writers_hub_prompts() where prompt_id = pg_temp.kept('current')), 0,
  'a deleted prompt leaves the hub');

select * from finish();
rollback;
