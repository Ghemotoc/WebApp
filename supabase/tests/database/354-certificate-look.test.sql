-- Database tests for the certificate look (bundle G13a; the canvas's SpaceCertificates board,
-- "Certificate look: colour and pattern").
-- What it proves:
-- - a certificate signed without a look is Plum with no pattern;
-- - the teacher's colour and pattern are saved on each certificate at signing;
-- - signing again with another look re-signs the certificates, and the same look changes nothing;
-- - an unknown colour or pattern, or a look that isn't an object, is refused before anything is
--   written;
-- - the student reads the look in my_certificates() and the teacher in class_certificates();
-- - nobody can change a certificate's look directly (the table has no update grant).
-- Personas: adult_writer (…01), pending_check (…05), teacher (…07), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
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

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- Set-up: a pilot class with two students ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_create_class_space('teacher', 'Clasa de culori', 'Școala Gimnazială nr. 3', 'Cercul de scriere.');
insert into kept select 'invite', public.make_class_invite('clasa-de-culori', 30, 30) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.join_class_space((select value from kept where name = 'invite'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.join_class_space((select value from kept where name = 'invite'));

/* ---------- 1. The default and a chosen look ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.issue_class_certificates('clasa-de-culori', 'Atelier 2027', '[{"handle": "pending_check", "result": "winner"}]');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is((public.my_certificates() -> 0 ->> 'look_colour') || '/' || (public.my_certificates() -> 0 ->> 'look_pattern'),
  'plum/none', 'a certificate signed without a look is Plum with no pattern');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.issue_class_certificates('clasa-de-culori', 'Atelier 2027',
  '[{"handle": "pending_check", "result": "winner"}, {"handle": "adult_writer", "result": "participant"}]',
  '{"colour": "sea_glass", "pattern": "waves"}') ->> 'issued', '2',
  'signing with Sea glass and waves re-signs the first and signs the second');
select is(public.issue_class_certificates('clasa-de-culori', 'Atelier 2027',
  '[{"handle": "pending_check", "result": "winner"}]', '{"colour": "sea_glass", "pattern": "waves"}') ->> 'issued', '0',
  'the same result and look again changes nothing');
select is(public.issue_class_certificates('clasa-de-culori', 'Atelier 2027',
  '[{"handle": "pending_check", "result": "winner"}]', '{"colour": "ember"}') ->> 'issued', '1',
  'a new colour alone re-signs the certificate, and a missing pattern means none');

/* ---------- 2. Refused looks ---------- */

select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-de-culori', 'Atelier 2028',
  '[{"handle": "pending_check", "result": "winner"}]', '{"colour": "gold"}')$$),
  'certificate:look', 'an unknown colour is refused');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-de-culori', 'Atelier 2028',
  '[{"handle": "pending_check", "result": "winner"}]', '{"colour": "plum", "pattern": "sparkles"}')$$),
  'certificate:look', 'a pattern the certificates don''t offer is refused');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-de-culori', 'Atelier 2028',
  '[{"handle": "pending_check", "result": "winner"}]', '"plum"')$$),
  'certificate:look', 'a look that isn''t an object is refused');
reset role;
select is((select count(*)::integer from public.certificates where programme_name = 'Atelier 2028'), 0,
  'and a refused look writes no certificate');

/* ---------- 3. Who reads the look ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is((public.my_certificates() -> 0 ->> 'look_colour') || '/' || (public.my_certificates() -> 0 ->> 'look_pattern'),
  'ember/none', 'the student reads the look saved at signing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_certificates() -> 0 ->> 'look_colour') || '/' || (public.my_certificates() -> 0 ->> 'look_pattern'),
  'sea_glass/waves', 'and another student keeps the look theirs was signed with');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.class_certificates('clasa-de-culori') @> '[{"look_colour": "ember", "look_pattern": "none"}]',
  'the teacher reads each certificate''s look');
select throws_ok($$update public.certificates set look_colour = 'cobalt'$$, '42501', null,
  'nobody changes a certificate''s look directly');

select * from finish();
rollback;
