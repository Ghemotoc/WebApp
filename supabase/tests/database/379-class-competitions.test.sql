-- Database tests for class competitions (bundle CLASS-POINTS, part 2; story S1-E8-15 "Class
-- competition: one winner by the teacher's criteria"; Robert, 13 Nov 2026).
-- What it proves:
-- - a competition needs the class's school year, a name, dates inside the class's life and 1 to 6
--   criteria, each with a label, a maximum, a description and 1 to 8 outcomes;
-- - only the class's teacher starts, changes, ends or deletes one, one at a time, and it can't
--   change once pupils joined;
-- - pupils read the name, dates and every criterion from the start, choose to join and can leave
--   before the end; nobody is added automatically; nobody outside the class learns anything;
-- - each table policy has an allowed and a denied test (CLAUDE.md rule 1).
-- Scoring, results, Readers' choice and templates are in test 380.
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), teacher (…07), moderator (…10),
-- support (…11), blocker (…15, outside the class). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(63);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement raises, or null when it runs.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class, so this test runs with the age gate on (as in tests 232 to 234).
update public.feature_flags set is_enabled = false where key = 'adults_only';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;
-- A value kept earlier, as text and as an ID.
create function pg_temp.kept(wanted text) returns text language sql as $$
  select value from kept where name = wanted $$;
create function pg_temp.kept_id(wanted text) returns uuid language sql as $$
  select value::uuid from kept where name = wanted $$;
-- Today where class weeks are counted.
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Europe/Bucharest')::date $$;
-- Two good criteria, as the competition form sends them.
create function pg_temp.criteria() returns jsonb language sql as $$
  select '[{"label": "Limbaj", "max_points": 10, "description": "Cum folosește limba.",
            "outcomes": ["Folosește dialogul ca să arate un personaj", "Cel mult cinci greșeli de ortografie"]},
           {"label": "Poveste", "max_points": 20, "description": "Cum e construită povestea.",
            "outcomes": ["Are început, mijloc și sfârșit"]}]'::jsonb $$;
-- A competition's details from today for a week, with the criteria given.
create function pg_temp.details(name text, criteria jsonb) returns jsonb language sql as $$
  select jsonb_build_object('name', name, 'starts_on', pg_temp.today(),
                            'ends_on', pg_temp.today() + 7, 'criteria', criteria) $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. A class with three pupils ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a IX-a C', 'Atelier de scris.');
insert into kept select 'code', public.make_class_invite('clasa-a-ix-a-c', 30, 10) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.join_class_space(pg_temp.kept('code'));

/* ---------- 2. The school year comes first ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_competitions('clasa-a-ix-a-c') ->> 'role', 'teacher', 'the teacher is told they are the teacher');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'grade', 'null'::jsonb, 'a new class has no school year');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concursul de toamnă', pg_temp.criteria()))), 'competition:grade',
  'a competition needs the class''s school year first');
select is(pg_temp.hint_of($$select public.set_class_grade('clasa-a-ix-a-c', 14)$$), 'grade:range',
  'a school year is 1 to 13');
select is(public.set_class_grade('clasa-a-ix-a-c', 9) ->> 'winners_allowed', 'true',
  'the 9th grade has a Winner and Finalists');
select is((public.class_competitions('clasa-a-ix-a-c') ->> 'today')::date, pg_temp.today(),
  'the class page carries today''s date as the database counts it, for the form''s first day');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of($$select public.set_class_grade('clasa-a-ix-a-c', 5)$$), 'space:not_allowed',
  'a pupil can''t set the school year');

/* ---------- 3. Criteria must be clear: a label, points, a description and outcomes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', '[]'::jsonb))), 'criteria:count', 'a competition needs at least one criterion');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', (select jsonb_agg(pg_temp.criteria() -> 0) from generate_series(1, 7))))),
  'criteria:count', 'and at most six');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', '[{"label": "Limbaj", "max_points": 10, "description": "Cum scrie.", "outcomes": []}]'::jsonb))),
  'criteria:outcomes', 'a criterion without an outcome can''t be saved');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', (select jsonb_build_array(jsonb_build_object('label', 'Limbaj', 'max_points', 10,
      'description', 'Cum scrie.', 'outcomes', (select jsonb_agg('Un rezultat'::text) from generate_series(1, 9)))))))),
  'criteria:outcomes', 'nor with nine outcomes');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', '[{"label": "Limbaj", "max_points": 10, "description": "", "outcomes": ["Unu"]}]'::jsonb))),
  'criteria:description', 'a criterion needs a description');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', '[{"label": "Limbaj", "max_points": 0, "description": "Cum scrie.", "outcomes": ["Unu"]}]'::jsonb))),
  'criteria:points', 'and a maximum of at least one point');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', '[{"label": "<b>Limbaj</b>", "max_points": 5, "description": "Cum scrie.", "outcomes": ["Unu"]}]'::jsonb))),
  'criteria:html', 'HTML is refused in a criterion (rule 8)');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('', pg_temp.criteria()))), 'competition:name', 'a competition needs a name');

/* ---------- 4. Dates ---------- */

select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', pg_temp.criteria()) || jsonb_build_object('ends_on', pg_temp.today() - 1))),
  'competition:dates', 'the end can''t come before the start');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', pg_temp.criteria()) || jsonb_build_object('starts_on', pg_temp.today() - 2))),
  'competition:dates', 'a new competition can''t start in the past');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concurs', pg_temp.criteria()) || jsonb_build_object('ends_on',
      (select (locks_at at time zone 'Europe/Bucharest')::date from public.spaces where slug = 'clasa-a-ix-a-c')))),
  'competition:dates', 'it must end before the class closes');

/* ---------- 5. The teacher starts one; only the teacher ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Concursul meu', pg_temp.criteria()))), 'space:not_allowed', 'a pupil can''t start a competition');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'competition', public.save_class_competition('clasa-a-ix-a-c',
  pg_temp.details('  Concursul   de toamnă ', pg_temp.criteria())) -> 'running' ->> 'id';
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' ->> 'name', 'Concursul de toamnă',
  'the competition is saved, its name on one line');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' ->> 'phase', 'open', 'it is open from its first day');
select is(jsonb_array_length(public.class_competitions('clasa-a-ix-a-c') -> 'running' -> 'criteria'), 2,
  'with its two criteria');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' -> 'criteria' -> 0 -> 'outcomes' ->> 1,
  'Cel mult cinci greșeli de ortografie', 'and each criterion''s outcomes, in order');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L)$$,
    pg_temp.details('Al doilea', pg_temp.criteria()))), 'competition:exists', 'a class has one competition at a time');
select is(pg_temp.hint_of($$select public.set_class_grade('clasa-a-ix-a-c', 7)$$), 'grade:running',
  'the school year can''t move under a running competition');
select is((select count(*)::integer from public.space_moderation_log
           where action = 'competition_started' and details ->> 'name' = 'Concursul de toamnă'), 1,
  'starting it is in the class''s log');
-- Changing it before anyone joins.
select is(public.save_class_competition('clasa-a-ix-a-c',
    pg_temp.details('Concursul de toamnă', pg_temp.criteria() - 1), pg_temp.kept_id('competition'))
    -> 'running' -> 'criteria' -> 0 ->> 'label', 'Limbaj', 'the teacher changes it while nobody has joined');
select is(jsonb_array_length(public.class_competitions('clasa-a-ix-a-c') -> 'running' -> 'criteria'), 1,
  'and the criteria are replaced, not added to');
select public.save_class_competition('clasa-a-ix-a-c',
  pg_temp.details('Concursul de toamnă', pg_temp.criteria()), pg_temp.kept_id('competition'));

/* ---------- 6. Pupils see everything from the start and choose to join ---------- */

select pg_temp.as_postgres();
select is((select count(*)::integer from public.class_competition_entrants), 0, 'nobody is added automatically');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.class_competitions('clasa-a-ix-a-c') ->> 'role', 'pupil', 'a pupil is told they are a pupil');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' -> 'criteria' -> 1 ->> 'description',
  'Cum e construită povestea.', 'a pupil reads every criterion in full from the start');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' ->> 'can_join', 'true', 'and is offered to join');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' -> 'entrant_count', 'null'::jsonb,
  'a pupil isn''t told how many joined');
select is(public.join_class_competition(pg_temp.kept_id('competition')) -> 'running' ->> 'is_entrant', 'true',
  'a pupil joins');
select lives_ok(format($$select public.join_class_competition(%L)$$, pg_temp.kept('competition')),
  'joining twice changes nothing');
select is(public.leave_class_competition(pg_temp.kept_id('competition')) -> 'running' ->> 'is_entrant', 'false',
  'and leaves before it ends');
select public.join_class_competition(pg_temp.kept_id('competition'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_competition(pg_temp.kept_id('competition'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.join_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:missing', 'the teacher can''t join their own competition');
select is(public.class_competitions('clasa-a-ix-a-c') -> 'running' ->> 'entrant_count', '2', 'the teacher sees how many joined');
select is(pg_temp.hint_of(format($$select public.save_class_competition('clasa-a-ix-a-c', %L, %L)$$,
    pg_temp.details('Alt nume', pg_temp.criteria()), pg_temp.kept('competition'))), 'competition:started',
  'once pupils joined, the competition can''t change');
-- Someone outside the class.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.class_competitions('clasa-a-ix-a-c'), null, 'someone outside the class is told nothing');
select is(pg_temp.hint_of(format($$select public.join_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:missing', 'and can''t join');
select is(pg_temp.hint_of(format($$select public.class_competition_scoring(%L)$$, pg_temp.kept('competition'))),
  'competition:missing', 'nor read the scoring page');
select is(pg_temp.hint_of(format($$select public.end_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:missing', 'nor end it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.hint_of(format($$select public.class_competition_scoring(%L)$$, pg_temp.kept('competition'))),
  'competition:missing', 'a pupil can''t read the scoring page either');
select is(pg_temp.hint_of(format($$select public.delete_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:missing', 'nor delete the competition');

/* ---------- 7. Each table policy: allowed and denied (CLAUDE.md rule 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.class_competitions), 1,
  'class_competitions_select_own allows: the teacher reads their competition');
select is((select count(*)::integer from public.class_competition_criteria), 2,
  'class_competition_criteria_select_own allows: the teacher reads their criteria');
select is((select count(*)::integer from public.class_competition_entrants), 0,
  'class_competition_entrants_select_own denies: the teacher doesn''t read entries from the table');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select count(*)::integer from public.class_competitions), 0,
  'class_competitions_select_own denies: a pupil doesn''t read the table');
select is((select count(*)::integer from public.class_competition_criteria), 0,
  'class_competition_criteria_select_own denies: nor the criteria table');
select is((select count(*)::integer from public.class_competition_entrants), 1,
  'class_competition_entrants_select_own allows: a pupil reads their own entry, and only theirs');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.class_competitions), 1,
  'class_competitions_select_moderators allows: a moderator reads a competition');
select is((select count(*)::integer from public.class_competition_criteria), 2,
  'class_competition_criteria_select_moderators allows: and its criteria');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.class_competitions), 0,
  'class_competitions_select_moderators denies: support staff don''t');
select is((select count(*)::integer from public.class_competition_criteria), 0,
  'class_competition_criteria_select_moderators denies: nor the criteria');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok(format($$insert into public.class_competition_entrants (user_id, competition_id, space_id)
    select %L, %L, id from public.spaces where slug = 'clasa-a-ix-a-c'$$,
    '00000000-0000-4000-8000-000000000003', pg_temp.kept('competition')), '42501', null,
  'nobody writes the tables directly');

/* ---------- 8. Ending and deleting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.save_class_competition_scores(%L, 'kid_14_ok', '{}')$$,
    pg_temp.kept('competition'))), 'competition:not_judging', 'scores wait until the competition ends');
select is(public.end_class_competition(pg_temp.kept_id('competition')) -> 'running' ->> 'phase', 'judging',
  'the teacher ends it early');
select is(pg_temp.hint_of(format($$select public.end_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:not_open', 'only an open competition can be ended');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$select public.join_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:closed', 'nobody joins after the end');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.hint_of(format($$select public.leave_class_competition(%L)$$, pg_temp.kept('competition'))),
  'competition:closed', 'or leaves');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.delete_class_competition(pg_temp.kept_id('competition')) -> 'running', 'null'::jsonb,
  'the teacher deletes a competition whose results aren''t published');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.class_competition_entrants)
        + (select count(*)::integer from public.class_competition_criteria), 0,
  'and its criteria and entries go with it');

select * from finish();
rollback;
