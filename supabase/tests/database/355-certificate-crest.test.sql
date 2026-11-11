-- Database tests for the school's crest in a certificate's seal (bundle G13b; the canvas's
-- SpaceCertificates board, "In the seal" and "Crest colours"; migration
-- …_g13b_certificate_crest.sql).
-- What it proves:
-- - only the class's own teacher uploads and chooses the crest, and only a crest of theirs;
-- - a crest seal needs a crest, and an unknown seal or crest colour is refused;
-- - the seal, the crest colours and the crest are saved on each certificate at signing, and a
--   change re-signs it;
-- - the student gets the crest's file only once its check passed (CLAUDE.md rule 19);
-- - a new crest leaves the certificates signed with the old one as they were, and the old crest
--   isn't deleted while a certificate shows it.
-- Personas: adult_writer (…01), pending_check (…05), teacher (…07), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement raises, 'ok' when it runs, or the message when there is no hint.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
  raised_message text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint, raised_message = message_text;
  return coalesce(nullif(raised_hint, ''), raised_message);
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

update public.feature_flags set is_enabled = true where key = 'picture_uploads';

/* ---------- Set-up: a pilot class with one student, and two crest files ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_create_class_space('teacher', 'Clasa cu stemă', 'Școala Gimnazială nr. 5', 'Cercul de scriere.');
insert into kept select 'invite', public.make_class_invite('clasa-cu-stema', 30, 30) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.join_class_space((select value from kept where name = 'invite'));

select pg_temp.as_postgres();
insert into kept select 'space', id::text from public.spaces where slug = 'clasa-cu-stema';
insert into kept values
  ('first_path', (select value from kept where name = 'space') || '/35500000-0000-4000-8000-000000000001.png'),
  ('second_path', (select value from kept where name = 'space') || '/35500000-0000-4000-8000-000000000002.png');
-- The teacher's two uploads, as Storage's API stamps them.
insert into storage.objects (bucket_id, name, owner_id)
select 'space-banners', value, '00000000-0000-4000-8000-000000000007' from kept where name in ('first_path', 'second_path');

/* ---------- 1. Who uploads and chooses the crest ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select isnt(pg_temp.hint_of(format($$select public.register_certificate_crest(%L)$$,
    (select value from kept where name = 'first_path'))), 'ok',
  'a student can''t register a crest for the class');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'first', public.register_certificate_crest((select value from kept where name = 'first_path'));
insert into kept select 'second', public.register_certificate_crest((select value from kept where name = 'second_path'));
select is((select kind::text from public.picture_checks where id = (select value from kept where name = 'first')::uuid),
  'certificate_crest', 'the teacher registers a crest, kept as its own kind of picture');

select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-cu-stema', 'Atelier cu stemă',
    '[{"handle": "pending_check", "result": "winner"}]', '{"seal": "crest"}')$$),
  'certificate:crest', 'a crest seal is refused while the class has no crest');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(pg_temp.hint_of(format($$select public.set_class_certificate_crest('clasa-cu-stema', %L)$$,
    (select value from kept where name = 'first'))), 'space:not_allowed',
  'a student can''t choose the class''s crest');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_class_certificate_crest('clasa-cu-stema', (select value from kept where name = 'first')::uuid) -> 'old_file',
  'null'::jsonb, 'the teacher chooses the crest; there was none before');
select is(public.class_certificate_crest('clasa-cu-stema') ->> 'state', 'checking',
  'the teacher sees the crest is being checked');

/* ---------- 2. Signing with the crest ---------- */

select is(public.issue_class_certificates('clasa-cu-stema', 'Atelier cu stemă',
    '[{"handle": "pending_check", "result": "winner"}]', '{"colour": "cobalt", "seal": "crest"}') ->> 'issued', '1',
  'signing with the crest seal makes the certificate');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-cu-stema', 'Atelier cu stemă',
    '[{"handle": "pending_check", "result": "winner"}]', '{"seal": "shield"}')$$),
  'certificate:look', 'an unknown seal is refused');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-cu-stema', 'Atelier cu stemă',
    '[{"handle": "pending_check", "result": "winner"}]', '{"seal": "crest", "crest_colours": "gold"}')$$),
  'certificate:look', 'unknown crest colours are refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is((public.my_certificates() -> 0 ->> 'look_seal') || '/' || (public.my_certificates() -> 0 ->> 'look_crest_colours')
    || '/' || (public.my_certificates() -> 0 -> 'crest' ->> 'state'),
  'crest/own/checking', 'the student reads the crest seal, its colours and that the crest is being checked');
select is(public.my_certificates() -> 0 -> 'crest' ->> 'path', null,
  'and gets no file while the crest is checked');

select pg_temp.as_postgres();
update public.picture_checks set status = 'passed' where id = (select value from kept where name = 'first')::uuid;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.my_certificates() -> 0 -> 'crest' ->> 'path', (select value from kept where name = 'first_path'),
  'once the check passed, the student gets the crest''s file');

/* ---------- 3. Changing the crest colours, then the crest ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.issue_class_certificates('clasa-cu-stema', 'Atelier cu stemă',
    '[{"handle": "pending_check", "result": "winner"}]', '{"colour": "cobalt", "seal": "crest", "crest_colours": "white"}') ->> 'issued', '1',
  'white crest colours re-sign the certificate');
select is(public.set_class_certificate_crest('clasa-cu-stema', (select value from kept where name = 'second')::uuid) -> 'old_file',
  'null'::jsonb, 'a new crest keeps the old one''s file, because a certificate shows it');

select pg_temp.as_postgres();
select is((select crest_picture_id::text from public.certificates where programme_name = 'Atelier cu stemă'),
  (select value from kept where name = 'first'), 'the signed certificate keeps the crest it was signed with');
select throws_ok($$update public.certificates set look_seal = 'cat' where programme_name = 'Atelier cu stemă'$$,
  '23514', null, 'a cat seal never names a crest');

/* ---------- Break tests: reading, swapping and planting a crest ---------- */

-- Another member can't read the class's crest, even knowing its address.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select isnt(pg_temp.hint_of($$select public.class_certificate_crest('clasa-cu-stema')$$), 'ok',
  'another member can''t read the class''s crest');

-- A crest someone else uploaded under this class's folder can't be made the class's crest.
select pg_temp.as_postgres();
insert into storage.objects (bucket_id, name, owner_id)
values ('space-banners', (select value from kept where name = 'space') || '/35500000-0000-4000-8000-000000000009.png',
        '00000000-0000-4000-8000-000000000001');
with planted as (
  insert into public.picture_checks (user_id, bucket, path, kind)
  values ('00000000-0000-4000-8000-000000000001', 'space-banners',
          (select value from kept where name = 'space') || '/35500000-0000-4000-8000-000000000009.png', 'certificate_crest')
  returning id)
insert into kept select 'planted', id::text from planted;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.set_class_certificate_crest('clasa-cu-stema', %L)$$,
    (select value from kept where name = 'planted'))), 'picture:not_yours',
  'the teacher can''t make someone else''s upload the class''s crest');

-- A crest file under a folder that isn't a class the teacher runs is refused.
select pg_temp.as_postgres();
insert into storage.objects (bucket_id, name, owner_id)
values ('space-banners', '35500000-0000-4000-8000-0000000000ff/35500000-0000-4000-8000-000000000008.png',
        '00000000-0000-4000-8000-000000000007');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select isnt(pg_temp.hint_of($$select public.register_certificate_crest('35500000-0000-4000-8000-0000000000ff/35500000-0000-4000-8000-000000000008.png')$$),
  'ok', 'a crest under a folder that isn''t the teacher''s class is refused');

select pg_temp.as_postgres();
-- PostgREST runs a stable function read-only, and the crest's read locks the class's row.
select is((select provolatile::text from pg_proc where proname = 'class_certificate_crest'), 'v',
  'the teacher''s crest read may run through the API (it is not marked stable)');

select * from finish();
rollback;
