-- Database tests for writing certificates (bundle CLASSES, part e; story S1-E8-12).
-- What it proves:
-- - only the class's own teacher approves and signs the results list; a student, staff and a
--   name that isn't a student of the class are refused; every student named gets a certificate
--   with a unique code and a notification (criteria 1 and 5);
-- - approving again changes only a changed result;
-- - the teacher sees the class's certificates without printed names; the table's own policy lets
--   a student read only their own rows (allowed and denied);
-- - the student types and clears their real name, only on their own certificate (criterion 2);
-- - anyone checks a code and sees valid, revoked or "no longer available", never a name
--   (criteria 6 to 8);
-- - staff with Schools access revoke a certificate, logged; support staff can't (criterion 7);
-- - archiving the class tells the teacher in the app and by email; the printed names are deleted
--   30 days later by the retention job (criterion 3).
-- Personas: adult_writer (…01), pending_check (…05), teacher (…07), moderator (…10, with the
-- Schools permission), support (…11). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

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
select public.admin_create_class_space('teacher', 'Clasa a VII-a', 'Școala Gimnazială nr. 3', 'Cercul de scriere.');
insert into kept select 'invite', public.make_class_invite('clasa-a-vii-a', 30, 30) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.join_class_space((select value from kept where name = 'invite'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.join_class_space((select value from kept where name = 'invite'));

/* ---------- 1. Only the teacher signs ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027', '[{"handle": "pending_check", "result": "winner"}]')$$),
  'space:not_allowed', 'a student can''t issue certificates');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027', '[{"handle": "pending_check", "result": "winner"}]')$$),
  'certificate:teacher_only', 'staff can''t sign for the teacher');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027', '[]')$$),
  'certificate:empty', 'an empty list is refused');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', '  ', '[{"handle": "pending_check", "result": "winner"}]')$$),
  'certificate:programme', 'the programme needs a name');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027', '[{"handle": "pending_check", "result": "best"}]')$$),
  'certificate:result', 'a result must be taking part, finalist or winner');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027', '[{"handle": "support", "result": "winner"}]')$$),
  'certificate:not_member', 'someone outside the class gets none');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027', '[{"handle": "teacher", "result": "winner"}]')$$),
  'certificate:not_member', 'nor does the teacher');

select is(public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027',
  '[{"handle": "pending_check", "result": "winner"}, {"handle": "@adult_writer", "result": "participant"}]') ->> 'issued',
  '2', 'the teacher approves the list and each student gets a certificate');
select is(public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027',
  '[{"handle": "pending_check", "result": "winner"}]') ->> 'issued', '0', 'approving the same result again changes nothing');
select is(public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2027',
  '[{"handle": "adult_writer", "result": "finalist"}]') ->> 'issued', '1', 'a changed result is signed again');

select pg_temp.as_postgres();
insert into kept select 'code', code from public.certificates where user_id = '00000000-0000-4000-8000-000000000005';
insert into kept select 'other_id', id::text from public.certificates where user_id = '00000000-0000-4000-8000-000000000001';
insert into kept select 'own_id', id::text from public.certificates where user_id = '00000000-0000-4000-8000-000000000005';
select matches((select value from kept where name = 'code'), '^CL[0-9]{2}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{2}$',
  'the code reads like CL27-7K4M-Q9, without letters that look alike');
select is((select teacher_name || ' / ' || school_name from public.certificates
           where user_id = '00000000-0000-4000-8000-000000000005'),
  public.display_name('teacher', (select pen_name from public.profiles where handle = 'teacher')) || ' / Școala Gimnazială nr. 3',
  'it prints the teacher''s name and the school');
select is((select count(*)::integer from public.notifications where kind = 'certificate_issued'
           and user_id in ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001')), 3,
  'each student is told, and again when their result changes');
select is((select count(*)::integer from public.space_moderation_log where action = 'certificates_issued'), 3,
  'each approval is in the class''s log');

/* ---------- 2. Who reads what ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(jsonb_array_length(public.class_certificates('clasa-a-vii-a')), 2, 'the teacher sees the class''s certificates');
select ok(not (public.class_certificates('clasa-a-vii-a') -> 0 ? 'printed_name'), 'but never a printed name');
select is((select count(*)::integer from public.certificates), 0, 'denied: certificates_select_own: the teacher can''t read the rows directly');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is((select count(*)::integer from public.certificates), 1, 'allowed: certificates_select_own: a student reads their own certificate');
select is(pg_temp.hint_of($$select public.class_certificates('clasa-a-vii-a')$$), 'space:not_allowed',
  'but not the class''s list');
select pg_temp.sign_out();
select throws_ok($$select count(*) from public.certificates$$, '42501', null, 'a visitor can''t read the table at all');

/* ---------- 3. The student's printed name ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(jsonb_array_length(public.my_certificates()), 1, 'the student sees it under My certificates');
select is(public.my_certificates() -> 0 ->> 'printed_name', null, 'with no real name until they type one');
select is(public.set_certificate_printed_name((select value::uuid from kept where name = 'own_id'), '  Ana   Popescu ') ->> 'printed_name',
  'Ana Popescu', 'the student types their real name');
select is(pg_temp.hint_of(format($$select public.set_certificate_printed_name(%L, repeat('a', 81))$$, (select value from kept where name = 'own_id'))),
  'certificate:name_length', 'a name stays short');
select is(pg_temp.hint_of(format($$select public.set_certificate_printed_name(%L, 'Altcineva')$$, (select value from kept where name = 'other_id'))),
  'certificate:missing', 'nobody names someone else''s certificate');

/* ---------- 4. Anyone checks a code ---------- */

select pg_temp.sign_out();
select is(public.verify_certificate((select value from kept where name = 'code')) ->> 'status', 'valid', 'a visitor checks a code');
select is(public.verify_certificate(lower(' ' || (select value from kept where name = 'code'))) ->> 'result', 'winner',
  'in any case and with spaces, and sees the result');
select ok(public.verify_certificate((select value from kept where name = 'code'))::text not like '%Popescu%',
  'never the student''s name');
select is(public.verify_certificate('CL99-AAAA-AA') ->> 'status', 'unknown', 'a made-up code is unknown');

/* ---------- 5. Staff revoke ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(pg_temp.hint_of(format($$select public.admin_revoke_certificate(%L, 'Greșeală')$$, (select value from kept where name = 'code'))),
  'not_allowed', 'support staff can''t revoke');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_certificate((select value from kept where name = 'code')) ->> 'status', 'valid', 'Schools staff look a code up');
select is(public.admin_revoke_certificate((select value from kept where name = 'code'), 'Rezultat trecut greșit.') ->> 'status',
  'revoked', 'and revoke it with a reason');
select is(pg_temp.hint_of(format($$select public.admin_revoke_certificate(%L, 'Încă o dată')$$, (select value from kept where name = 'code'))),
  'certificate:revoked', 'only once');
select pg_temp.sign_out();
select is(public.verify_certificate((select value from kept where name = 'code')) ->> 'status', 'revoked', 'the check page says revoked');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'certificate.revoked'), 1, 'revoking is in the audit log');

/* ---------- 6. Archiving and the 30 days ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_certificate_printed_name((select value::uuid from kept where name = 'other_id'), 'Ion Ionescu');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.archive_class_space('clasa-a-vii-a');
select is(pg_temp.hint_of($$select public.issue_class_certificates('clasa-a-vii-a', 'Cercul 2028', '[{"handle": "pending_check", "result": "winner"}]')$$),
  'space:archived', 'an archived class issues no more certificates');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications where kind = 'class_archived'
           and user_id = '00000000-0000-4000-8000-000000000007'), 1, 'the teacher is told in the app');
select is((select count(*)::integer from public.email_outbox where user_id = '00000000-0000-4000-8000-000000000007'
           and delivery = 'required'), 1, 'and by email, which can''t be switched off');

update public.spaces set archived_at = now() - interval '31 days' where slug = 'clasa-a-vii-a';
select is(public.purge_class_certificate_names(), 2, '30 days after archiving the retention job deletes the printed names');
select is((select printed_name from public.certificates where id = (select value::uuid from kept where name = 'other_id')), null,
  'it is gone');

/* ---------- 7. Deleted with the account ---------- */

delete from public.certificates where user_id = '00000000-0000-4000-8000-000000000005';
select pg_temp.sign_out();
select is(public.verify_certificate((select value from kept where name = 'code')) ->> 'status', 'retired',
  'a certificate deleted with its account is "no longer available"');

-- The retired codes table's own policy: an admin reads it, a student doesn't.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.retired_certificate_codes) >= 1,
  'allowed: retired_certificate_codes_select_admin: an admin reads the retired codes');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is((select count(*)::integer from public.retired_certificate_codes), 0,
  'denied: retired_certificate_codes_select_admin: a student can''t read the retired codes');

select * from finish();
rollback;
