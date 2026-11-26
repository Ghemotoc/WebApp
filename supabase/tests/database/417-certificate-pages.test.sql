-- Database tests for the winner's notice and the public check (bundle BOOKS-8, part 8c; boards
-- G13 and G17, user stories 8.13 and 8.17).
-- What it proves:
-- - the Winner gets the "You're the winner" notice with the competition, the teacher's name and
--   the winning chapter; a Finalist, the teacher and a visitor get none;
-- - closing it works once, only for the Winner, and the notice never comes back;
-- - the public check shows the class, school and teacher, and never the pupil's name, real or pen
--   (story S1-E8-12 criterion 6, which wins over board G17's "first name and last initial");
-- - a revoked certificate says when it was revoked; an unknown code says so.
-- No table or policy is added (one column on an existing table, read only through these
-- functions), so there is no new policy to test. Personas: adult_writer (…01, pen name
-- "Lia Scrie"), pending_check (…05), teacher (…07). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;
create function pg_temp.kept(wanted text) returns text language sql as $$
  select value from kept where name = wanted $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Other tests on the same database may have used up the personas' hourly limits; rolled back.
delete from public.rate_limit_events
where user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005',
                  '00000000-0000-4000-8000-000000000007');

/* ---------- Set-up: a class with two pupils, a winning chapter and published results ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa 9B diplome', 'Atelier.', '', 'plum', 9, 'Liceul Teoretic Nr. 1');
insert into kept select 'code', public.make_class_invite('clasa-9b-diplome', 30, 10) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.join_class_space(pg_temp.kept('code'));
select public.create_story('Clopotul de la nouă', 'O poveste.', 'ro', 'fiction', '{}', '{"kind": "automatic"}',
  '00000000-0000-4000-9000-0000000c8c41', '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
insert into kept select 'story', slug from public.stories where id = '00000000-0000-4000-9000-0000000c8c41';
select public.create_chapter(pg_temp.kept('story'));
insert into kept select 'chapter', code from public.chapters where story_id = '00000000-0000-4000-9000-0000000c8c41';
select public.save_chapter_draft(pg_temp.kept('chapter'), 'Clopotul', 'Prima pagină.', 1);
select public.publish_chapter(pg_temp.kept('chapter'));
select public.set_story_class(pg_temp.kept('story'), 'clasa-9b-diplome');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.join_class_space(pg_temp.kept('code'));

select pg_temp.as_postgres();
insert into public.class_competitions (user_id, space_id, name, starts_on, ends_on, starts_at, ends_at, ended_at, published_at)
select '00000000-0000-4000-8000-000000000007', id, 'Concursul de toamnă', current_date - 30, current_date - 3,
  now() - interval '30 days', now() - interval '3 days', now() - interval '3 days', now() - interval '1 day'
from public.spaces where slug = 'clasa-9b-diplome';
insert into kept select 'competition', id::text from public.class_competitions where name = 'Concursul de toamnă';
insert into public.class_competition_results (user_id, competition_id, pupil_user_id, result, winning_chapter_id)
values ('00000000-0000-4000-8000-000000000007', pg_temp.kept('competition')::uuid,
        '00000000-0000-4000-8000-000000000001', 'winner',
        (select id from public.chapters where story_id = '00000000-0000-4000-9000-0000000c8c41')),
       ('00000000-0000-4000-8000-000000000007', pg_temp.kept('competition')::uuid,
        '00000000-0000-4000-8000-000000000005', 'finalist', null);

/* ---------- 1. The winner's notice (G13) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.class_winner_notice('clasa-9b-diplome') ->> 'name', 'Concursul de toamnă',
          'the Winner gets the notice for the competition they won');
select is(public.class_winner_notice('clasa-9b-diplome') ->> 'story_title', 'Clopotul de la nouă',
          'the notice names the winning story, so "Read the chapter again" can open it');
select is(public.class_winner_notice('clasa-9b-diplome') ->> 'teacher_name', 'teacher',
          'the notice says which teacher picked the winner');
select is(public.class_winner_notice('clasa-9b-diplome') ->> 'winner_name', 'Lia Scrie',
          'the notice says "by" the Winner''s own pen name');
select ok(not (public.class_winner_notice('clasa-9b-diplome') ?| array['score', 'points', 'total']),
          'the notice carries no score or points');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.class_winner_notice('clasa-9b-diplome'), null, 'a Finalist gets no winner''s notice');
select is(public.dismiss_class_winner_notice(pg_temp.kept('competition')::uuid), false,
          'a Finalist can''t close the Winner''s notice');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.class_winner_notice('clasa-9b-diplome'), null, 'the teacher gets no winner''s notice');
select pg_temp.sign_out();
select throws_ok($$select public.class_winner_notice('clasa-9b-diplome')$$, '42501', null,
                 'a visitor can''t ask for the notice at all');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.dismiss_class_winner_notice(pg_temp.kept('competition')::uuid), true,
          'the Winner closes the notice with Done');
select is(public.class_winner_notice('clasa-9b-diplome'), null, 'once closed, the notice doesn''t come back');
select is(public.dismiss_class_winner_notice(pg_temp.kept('competition')::uuid), false,
          'closing it a second time changes nothing');

/* ---------- 2. The public check (G17) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.issue_class_certificates('clasa-9b-diplome', 'Concursul de toamnă',
  '[{"handle": "adult_writer", "result": "winner"}, {"handle": "pending_check", "result": "finalist"}]'::jsonb, null);
select pg_temp.as_postgres();
insert into kept select 'winner_code', code from public.certificates
  where user_id = '00000000-0000-4000-8000-000000000001' and class_name = 'Clasa 9B diplome';
insert into kept select 'finalist_code', code from public.certificates
  where user_id = '00000000-0000-4000-8000-000000000005' and class_name = 'Clasa 9B diplome';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.set_certificate_printed_name(
  (select id from public.certificates where code = pg_temp.kept('finalist_code')), 'Ana Maria Popescu');

select pg_temp.sign_out();
select is(public.verify_certificate(pg_temp.kept('finalist_code')) ->> 'class_name', 'Clasa 9B diplome',
          'a visitor sees the class the certificate came from');
select ok(public.verify_certificate(pg_temp.kept('finalist_code'))::text not like '%Popescu%'
          and public.verify_certificate(pg_temp.kept('finalist_code'))::text not like '%Ana%',
          'the printed real name never reaches a visitor, not even in part');
select ok(public.verify_certificate(lower(pg_temp.kept('winner_code')))::text not like '%Lia Scrie%',
          'the pen name doesn''t show either, and the case of the code doesn''t matter');
select is(public.verify_certificate(pg_temp.kept('winner_code')) ->> 'teacher_name', 'teacher',
          'the check says who signed it');

select pg_temp.as_postgres();
update public.certificates set revoked_at = now(), revoke_reason = 'Test.'
where code = pg_temp.kept('winner_code');
select pg_temp.sign_out();
select ok(public.verify_certificate(pg_temp.kept('winner_code')) ->> 'revoked_at' is not null
          and public.verify_certificate(pg_temp.kept('winner_code')) ->> 'status' = 'revoked',
          'a revoked certificate says it was revoked, and when');

select is(public.verify_certificate('ZZ00-NOPE') ->> 'status', 'unknown', 'an unknown code says so');

select * from finish();
rollback;
