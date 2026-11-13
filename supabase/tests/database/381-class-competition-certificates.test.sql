-- Database tests for certificates from class competition results (bundle CLASS-POINTS, part 3;
-- story S1-E8-17; Robert, 13 Nov 2026).
-- What it proves:
-- - the teacher signs a confirmed competition's results as certificates: Winner, Contestant and
--   a second "Readers' choice" certificate for the same pupil and programme;
-- - approving the same list again changes nothing;
-- - a certificate named after a confirmed competition must say what the teacher confirmed
--   there: no other result, and nothing for a pupil who didn't enter;
-- - Readers' choice is never typed by hand: not for another pupil, not for another programme;
-- - one refused line refuses the whole list;
-- - a programme that isn't a competition keeps the S1-E8-12 rules;
-- - below the 8th grade nobody gets a Winner or Finalist certificate;
-- - a competition result itself can never be Readers' choice;
-- - a pupil reads their own two certificates and nobody else's (certificates_select_own, allowed
--   and denied).
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), teacher (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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

-- The SQLSTATE a statement raises, or null when it runs.
create function pg_temp.state_of(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. A 9th grade class with a confirmed competition ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a IX-a F', 'Atelier de scris.');
insert into kept select 'code', public.make_class_invite('clasa-a-ix-a-f', 30, 10) ->> 'code';
select public.set_class_points('clasa-a-ix-a-f', true);
select public.set_class_grade('clasa-a-ix-a-f', 9);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code'));
select public.create_story('Caietul albastru', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c3a01',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.join_class_space(pg_temp.kept('code'));
select pg_temp.as_postgres();
insert into kept select 'space', id::text from public.spaces where slug = 'clasa-a-ix-a-f';
insert into kept select 'kid_slug', slug from public.stories where id = '00000000-0000-4000-9000-0000000c3a01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
insert into kept select 'kid_code', public.create_chapter(pg_temp.kept('kid_slug')) ->> 'code';
select public.save_chapter_draft(pg_temp.kept('kid_code'), 'Începutul', 'Prima zi de școală.', 1);
select public.publish_chapter(pg_temp.kept('kid_code'));
select public.set_story_class(pg_temp.kept('kid_slug'), 'clasa-a-ix-a-f');
select pg_temp.as_postgres();
insert into kept select 'kid_chapter', id::text from public.chapters where code = pg_temp.kept('kid_code');

-- The competition: the kid and the teen join, adult_writer doesn't. Classmates give the kid's
-- chapter the most points; the teacher confirms the teen as Winner, so the kid is a Contestant
-- and Readers' choice.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'competition', public.save_class_competition('clasa-a-ix-a-f',
  pg_temp.details('Concursul de iarnă', pg_temp.criteria())) -> 'running' ->> 'id';
select pg_temp.as_postgres();
insert into kept select 'criterion_1', id::text from public.class_competition_criteria
  where competition_id = pg_temp.kept_id('competition') and position = 1;
insert into kept select 'criterion_2', id::text from public.class_competition_criteria
  where competition_id = pg_temp.kept_id('competition') and position = 2;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_competition(pg_temp.kept_id('competition'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_competition(pg_temp.kept_id('competition'));
select pg_temp.as_postgres();
insert into public.class_point_gifts (user_id, space_id, chapter_id, receiver_user_id, week_start, points) values
  ('00000000-0000-4000-8000-000000000002', pg_temp.kept_id('space'), pg_temp.kept_id('kid_chapter'),
   '00000000-0000-4000-8000-000000000003', public.class_points_week_start(), 3);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.end_class_competition(pg_temp.kept_id('competition'));
select public.save_class_competition_scores(pg_temp.kept_id('competition'), 'teen_17',
  jsonb_build_object(pg_temp.kept('criterion_1'), 9, pg_temp.kept('criterion_2'), 18));
select public.publish_class_competition(pg_temp.kept_id('competition'), '{"winner": "teen_17", "finalists": []}');

/* ---------- 2. The confirmed results become certificates ---------- */

select is(public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "teen_17", "result": "winner"}, {"handle": "kid_14_ok", "result": "participant"},
      {"handle": "kid_14_ok", "result": "readers_choice"}]') ->> 'issued', '3',
  'the teacher signs the Winner, the Contestant and the Readers'' choice certificate');
select is(public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "teen_17", "result": "winner"}, {"handle": "kid_14_ok", "result": "participant"},
      {"handle": "kid_14_ok", "result": "readers_choice"}]') ->> 'issued', '0',
  'approving the same list again changes nothing');
select pg_temp.as_postgres();
select is((select string_agg(result::text, ', ' order by award_slot) from public.certificates
    where user_id = '00000000-0000-4000-8000-000000000003' and space_id = pg_temp.kept_id('space')
      and programme_name = 'Concursul de iarnă'), 'participant, readers_choice',
  'one pupil holds two certificates for the competition: their result and Readers'' choice');
select is((select programme_name from public.certificates
    where user_id = '00000000-0000-4000-8000-000000000002' and space_id = pg_temp.kept_id('space')),
  'Concursul de iarnă', 'the competition''s name prints as the programme');
select is((select details ->> 'count' from public.space_moderation_log
    where space_id = pg_temp.kept_id('space') and action = 'certificates_issued'
    order by created_at limit 1), '3', 'the class''s log says three certificates were signed');

/* ---------- 3. A competition's certificate says what was confirmed ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "kid_14_ok", "result": "winner"}]')$$), 'certificate:competition_result',
  'a Contestant can''t get a Winner certificate for the competition');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "teen_17", "result": "finalist"}]')$$), 'certificate:competition_result',
  'nor can the Winner be printed as a Finalist');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'CONCURSUL DE IARNĂ',
    '[{"handle": "kid_14_ok", "result": "winner"}]')$$), 'certificate:competition_result',
  'typing the competition''s name in capitals doesn''t get around its results');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "adult_writer", "result": "participant"}]')$$), 'certificate:competition_result',
  'a pupil who didn''t join gets no certificate for the competition');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "teen_17", "result": "readers_choice"}]')$$), 'certificate:readers_choice',
  'Readers'' choice goes only to the pupil the results name');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Clubul de scris',
    '[{"handle": "kid_14_ok", "result": "readers_choice"}]')$$), 'certificate:readers_choice',
  'and never to a programme that isn''t a competition');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "kid_14_ok", "result": "champion"}]')$$), 'certificate:result',
  'an unknown result is refused');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Clubul de scris',
    '[{"handle": "adult_writer", "result": "participant"}, {"handle": "kid_14_ok", "result": "readers_choice"}]')$$),
  'certificate:readers_choice', 'one refused line refuses the whole list');
select pg_temp.as_postgres();
select is((select count(*)::int from public.certificates
    where space_id = pg_temp.kept_id('space') and programme_name = 'Clubul de scris'), 0,
  'so nothing from that list was signed');

/* ---------- 4. A programme that isn't a competition keeps the S1-E8-12 rules ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.issue_class_certificates('clasa-a-ix-a-f', 'Clubul de scris',
    '[{"handle": "adult_writer", "result": "winner"}, {"handle": "kid_14_ok", "result": "finalist"}]') ->> 'issued',
  '2', 'in the 9th grade the teacher still picks results by hand for another programme');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-ix-a-f', 'Concursul de iarnă',
    '[{"handle": "kid_14_ok", "result": "participant"}]')$$), 'space:not_allowed',
  'a pupil can''t sign certificates');

/* ---------- 5. Who reads a certificate (certificates_select_own) ---------- */

select is((select count(*)::int from public.certificates where programme_name = 'Concursul de iarnă'), 2,
  'allowed: a pupil reads their own two certificates for the competition');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.certificates where programme_name = 'Concursul de iarnă'), 0,
  'denied: a classmate reads nobody else''s certificates');

/* ---------- 6. A competition result is never Readers' choice ---------- */

select pg_temp.as_postgres();
select is(pg_temp.state_of(format($$update public.class_competition_results set result = 'readers_choice'
    where competition_id = %L$$, pg_temp.kept('competition'))), '23514',
  'the results table refuses Readers'' choice as a result');

/* ---------- 7. Below the 8th grade: no Winner or Finalist certificate ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a VI-a G', 'Atelier de scris.');
insert into kept select 'code_6', public.make_class_invite('clasa-a-vi-a-g', 30, 10) ->> 'code';
select public.set_class_grade('clasa-a-vi-a-g', 6);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space(pg_temp.kept('code_6'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vi-a-g', 'Clubul de lectură',
    '[{"handle": "kid_14_ok", "result": "winner"}]')$$), 'certificate:no_winners',
  'a 6th grade class has no Winner certificate');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vi-a-g', 'Clubul de lectură',
    '[{"handle": "kid_14_ok", "result": "finalist"}]')$$), 'certificate:no_winners',
  'and no Finalist certificate');
select is(public.issue_class_certificates('clasa-a-vi-a-g', 'Clubul de lectură',
    '[{"handle": "kid_14_ok", "result": "participant"}]') ->> 'issued', '1',
  'every pupil there can get a Contestant certificate');

select * from finish();
rollback;
