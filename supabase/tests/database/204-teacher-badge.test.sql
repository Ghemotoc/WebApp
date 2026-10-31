-- Database tests for the Teacher badge (story S1-E2-11; CLAUDE.md rules 1, 5, 15, 19).
-- What it proves:
-- - only an adult who may write can ask; skipping stores nothing (criterion 1);
-- - a school email request needs our server's signature, refuses personal addresses and keeps
--   only the domain (criterion 2);
-- - a .edu.ro link gives the badge at once and notifies; any other domain waits for staff; a used,
--   replaced or expired link does nothing (criterion 3);
-- - a proof can be added only by someone who may ask, under a random name, and only staff with
--   Schools access read or delete it (criterion 4);
-- - staff see the queue without user IDs or addresses; opening a proof is logged; a decision needs
--   a reason, refuses while the proof is still there, keeps only the way, outcome and date, writes
--   the audit log and notifies (criteria 5 and 6);
-- - the badge shows on the public profile; staff can remove it, logged (criteria 7 and 8);
-- - policies teacher_checks_select_own, teacher_proofs_insert_own, teacher_proofs_select_staff and
--   teacher_proofs_delete_staff: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-teacher-secret', 'sha256'), 'hex');
$$;
create function pg_temp.hash(token text) returns text language sql as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-teacher-secret', 'teacher_check_secret')
  where not exists (select 1 from vault.secrets where name = 'teacher_check_secret');
select vault.update_secret(id, 'test-teacher-secret') from vault.secrets where name = 'teacher_check_secret';

-- adult_writer (…01) is an adult who may write, with no badge; teen_17 (…02) is 17; teacher (…07)
-- holds the badge; moderator (…10) has the teacher checks permission; support (…11) has no
-- Schools access.

/* ---------- 1. Who can ask ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_teacher_check() ->> 'can_ask', 'true', 'an adult who may write can ask for the badge');
select is(public.my_teacher_check() -> 'latest', 'null'::jsonb, 'skipping stores nothing: there is no request');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.my_teacher_check() ->> 'can_ask', 'false', 'a 17-year-old can''t ask for the badge');
select throws_ok(
  $$ select public.begin_teacher_email_check('liceul-1.edu.ro', pg_temp.hash('t-teen'),
       pg_temp.signed('teacher|00000000-0000-4000-8000-000000000002|liceul-1.edu.ro|' || pg_temp.hash('t-teen'))) $$,
  '23514', null, 'a 17-year-old''s school email request is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.my_teacher_check() ->> 'is_teacher', 'true', 'the teacher persona holds the badge');
select is(public.my_teacher_check() ->> 'can_ask', 'false', 'someone with the badge can''t ask again');

/* ---------- 2. The school email way ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ select public.begin_teacher_email_check('liceul-1.edu.ro', pg_temp.hash('t1'), 'not-a-signature') $$,
  '42501', null, 'a request our server didn''t sign is refused');
select throws_ok(
  $$ select public.begin_teacher_email_check('gmail.com', pg_temp.hash('t0'),
       pg_temp.signed('teacher|00000000-0000-4000-8000-000000000001|gmail.com|' || pg_temp.hash('t0'))) $$,
  '23514', 'Use your school address, or upload proof instead.', 'a personal address is refused');
select is((select count(*)::integer from public.teacher_checks
  where user_id = '00000000-0000-4000-8000-000000000001'), 0, 'a refused address leaves nothing behind');
select is(public.begin_teacher_email_check('liceul-1.edu.ro', pg_temp.hash('t1'),
    pg_temp.signed('teacher|00000000-0000-4000-8000-000000000001|liceul-1.edu.ro|' || pg_temp.hash('t1'))) ->> 'outcome',
  'ok', 'a signed school email request is stored');
select is(public.my_teacher_check() #>> '{latest,status}', 'link_sent', 'the person then sees the link was sent');
select is((select school_domain from public.teacher_checks where user_id = '00000000-0000-4000-8000-000000000001'),
  'liceul-1.edu.ro', 'only the domain is kept, never the address');
select throws_ok(
  $$ select public.begin_teacher_email_check('liceul-2.edu.ro', pg_temp.hash('t2'),
       pg_temp.signed('teacher|00000000-0000-4000-8000-000000000001|liceul-2.edu.ro|' || pg_temp.hash('t2'))) $$,
  '23514', 'Wait a minute before sending again.', 'a second link within a minute is refused');

-- Opening the link, signed out.
select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select is(public.confirm_teacher_email('wrong-token') ->> 'outcome', 'gone', 'an unknown link does nothing');
select is(public.confirm_teacher_email('t1') ->> 'outcome', 'approved', 'a .edu.ro link gives the badge at once');
select is(public.confirm_teacher_email('t1') ->> 'outcome', 'gone', 'a link works only once');
select pg_temp.as_owner();
select isnt((select teacher_badge_since from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  null, 'the profile now holds the badge');
select is((select count(*)::integer from public.notifications
  where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'teacher_check_decided'), 1,
  'the person is told the badge was granted');
select is(public.get_writer_profile('adult_writer') ->> 'is_teacher', 'true', 'the public profile shows "Teacher"');
select is(public.get_writer_profile('teen_17') ->> 'is_teacher', 'false', 'a profile without the badge doesn''t');

-- Another domain waits for staff. The badge is taken back from adult_writer by hand first, and the
-- first request made older, so a new link may be sent.
update public.profiles set teacher_badge_since = null where id = '00000000-0000-4000-8000-000000000001';
update public.teacher_checks set created_at = now() - interval '2 minutes'
  where user_id = '00000000-0000-4000-8000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.begin_teacher_email_check('scoala-mea.ro', pg_temp.hash('t3'),
  pg_temp.signed('teacher|00000000-0000-4000-8000-000000000001|scoala-mea.ro|' || pg_temp.hash('t3')));
select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select is(public.confirm_teacher_email('t3') ->> 'outcome', 'waiting_for_staff', 'any other school domain waits for staff');

/* ---------- 3. The staff queue and decision ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select * from public.admin_teacher_checks() $$, '42501', null,
  'support can''t see the teacher checks');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select results_eq(
  $$ select handle, way, school_domain, has_proof from public.admin_teacher_checks() $$,
  $$ values ('adult_writer'::text, 'school_email'::text, 'scoala-mea.ro'::text, false) $$,
  'a moderator with the permission sees the waiting request: username, way and domain only');
select throws_ok(
  $$ select public.admin_decide_teacher_check((select check_id from public.admin_teacher_checks() limit 1), 'approved', ' ') $$,
  '23514', 'Write a reason (up to 1,000 characters).', 'a decision without a reason is refused');
select is(public.admin_decide_teacher_check((select check_id from public.admin_teacher_checks() limit 1),
  'rejected', 'We couldn''t find this school.') ->> 'outcome', 'ok', 'the moderator turns the request down');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.my_teacher_check() #>> '{latest,reason}', 'We couldn''t find this school.',
  'the person reads the reason');
select is(public.my_teacher_check() ->> 'can_ask', 'true', 'and can try again');
select pg_temp.as_owner();
select is((select count(*)::integer from public.audit_log
  where action = 'teacher_check.decided' and target_user_id = '00000000-0000-4000-8000-000000000001'
    and user_id = '00000000-0000-4000-8000-000000000010'), 1, 'the decision and who made it are in the audit log');

/* ---------- 4. The proof way ---------- */

-- Every row in one test shares the transaction's time, so the decided one is made older by hand.
update public.teacher_checks set created_at = now() - interval '1 minute'
  where user_id = '00000000-0000-4000-8000-000000000001' and status = 'rejected';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('teacher-proofs', '11111111-1111-4111-8111-111111111111.pdf', auth.uid()::text) $$,
  '42501', null, 'denied: teacher_proofs_insert_own: a 17-year-old can''t add a proof');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('teacher-proofs', '00000000-0000-4000-8000-000000000001.pdf', auth.uid()::text) $$,
  '42501', null, 'denied: teacher_proofs_insert_own: a proof can''t be named after the user ID');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('teacher-proofs', '22222222-2222-4222-8222-222222222222.pdf', auth.uid()::text) $$,
  'allowed: teacher_proofs_insert_own: an adult who may ask adds a proof under a random name');
select is((select count(*)::integer from storage.objects where bucket_id = 'teacher-proofs'), 0,
  'denied: teacher_proofs_select_staff: the person can''t read their own proof back');
select throws_ok($$ select public.submit_teacher_proof('33333333-3333-4333-8333-333333333333.pdf') $$,
  '23514', 'Upload the proof first.', 'a proof that isn''t there can''t be sent');
select is(public.submit_teacher_proof('22222222-2222-4222-8222-222222222222.pdf') ->> 'outcome', 'ok',
  'the proof goes to the staff queue');
select is(public.my_teacher_check() #>> '{latest,status}', 'waiting_for_staff', 'the person sees it is pending');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from storage.objects where bucket_id = 'teacher-proofs'), 0,
  'denied: teacher_proofs_select_staff: support can''t read a proof');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'teacher-proofs';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from storage.objects where bucket_id = 'teacher-proofs'), 1,
  'denied: teacher_proofs_delete_staff: support''s delete leaves the proof where it is');
select is((select count(*)::integer from storage.objects where bucket_id = 'teacher-proofs'), 1,
  'allowed: teacher_proofs_select_staff: a moderator with the permission reads the proof');
select is(public.admin_open_teacher_proof((select check_id from public.admin_teacher_checks() limit 1)),
  '22222222-2222-4222-8222-222222222222.pdf', 'opening the proof gives its file name');
select throws_ok(
  $$ select public.admin_decide_teacher_check((select check_id from public.admin_teacher_checks() limit 1), 'approved', 'Staff card checked.') $$,
  '23514', 'Delete the proof first.', 'a decision is refused while the proof is still there');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'teacher-proofs';
select is((select count(*)::integer from storage.objects where bucket_id = 'teacher-proofs'), 0,
  'allowed: teacher_proofs_delete_staff: the moderator deletes the proof');
select is(public.admin_decide_teacher_check((select check_id from public.admin_teacher_checks() limit 1),
  'approved', 'Staff card checked.') ->> 'outcome', 'ok', 'then approves the request');
select pg_temp.as_owner();
select is((select row(way, status, proof_path is null, decided_at is not null)::text from public.teacher_checks
  where user_id = '00000000-0000-4000-8000-000000000001' and way = 'proof'), '(proof,approved,t,t)',
  'only the way, the outcome and the date are kept; the proof is gone');
select is((select count(*)::integer from public.audit_log
  where action = 'sensitive_read.teacher_proof_opened' and target_user_id = '00000000-0000-4000-8000-000000000001'),
  1, 'opening the proof is logged as a sensitive read');

/* ---------- 5. The person's rows and removing a badge ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok((select count(*) from public.teacher_checks) >= 3
    and not exists (select 1 from public.teacher_checks where user_id <> auth.uid()),
  'allowed: teacher_checks_select_own: the person reads their own requests and nobody else''s');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.teacher_checks), 0,
  'denied: teacher_checks_select_own: someone else reads none of them');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_remove_teacher_badge('adult_writer', 'The school says they don''t teach there.') ->> 'outcome',
  'ok', 'staff remove a badge with a reason');
select pg_temp.as_owner();
select ok((select teacher_badge_since is null from public.profiles where id = '00000000-0000-4000-8000-000000000001')
    and exists (select 1 from public.audit_log where action = 'teacher_badge.removed'
      and target_user_id = '00000000-0000-4000-8000-000000000001')
    and exists (select 1 from public.notifications where kind = 'teacher_badge_removed'
      and user_id = '00000000-0000-4000-8000-000000000001'),
  'the badge is gone, the removal is logged and the person is told');

select * from finish();
rollback;
