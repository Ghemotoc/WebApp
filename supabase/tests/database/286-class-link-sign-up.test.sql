-- Database tests for the class link standing in for the platform invitation (bundle 14d IDEAS-3,
-- part c; idea IDEA-20261102-4).
-- What it proves, while sign-up is invite only:
-- - a working class code is a valid invitation, and signing up with it makes the account and
--   joins the class at once, logged in the class's log and in the audit log (criterion 1);
-- - the code's place is taken, so a used-up code, a locked class's code or an unknown code is
--   refused, and the refused sign-up leaves no account behind (criterion 2);
-- - a platform invite still works as before.
-- How a sign-up is simulated: an insert into auth.users with the sign-up data in
-- raw_user_meta_data, as in test 023. Personas: teacher (…07), admin (…09). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The sign-up data the form sends, with the current terms and privacy notice in English.
create function pg_temp.sign_up_data(invite_code text) returns jsonb language sql as $$
  select jsonb_build_object(
    'invite_code', invite_code, 'birth_year', '1990', 'locale', 'en',
    'accepted_terms_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en'));
$$;
-- Inserts an account the way Supabase Auth does; returns its user ID.
create function pg_temp.sign_up(email text, invite_code text) returns uuid language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    email, 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}',
    pg_temp.sign_up_data(invite_code), now(), now(), '', '', '', '')
  returning id;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = true where key = 'invite_only';

-- Codes kept between steps.
create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- Set-up: two classes, three codes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a V-a', 'Atelier.');
select public.create_class_space('Clasa a VI-a', 'Atelier.');
insert into kept select 'one_place', public.make_class_invite('clasa-a-v-a', 30, 1) ->> 'code';
insert into kept select 'locked', public.make_class_invite('clasa-a-vi-a', 30, 5) ->> 'code';
select public.set_class_lock('clasa-a-vi-a', now());
select pg_temp.as_postgres();

/* ---------- 1. A working class code opens sign-up and joins the class ---------- */

select is(public.check_invite((select value from kept where name = 'one_place')), 'valid',
  'a working class code counts as a valid invitation');
select lives_ok($$ insert into kept select 'student', pg_temp.sign_up('student.286@example.com',
    (select value from kept where name = 'one_place'))::text $$,
  'a student signs up with the class code and no other invitation');
select is((select status::text from public.space_members
           where user_id = (select value::uuid from kept where name = 'student')
             and space_id = (select id from public.spaces where slug = 'clasa-a-v-a')),
  'active', 'the new account is a member of the class at once');
select is((select count(*)::integer from public.space_moderation_log
           where user_id = (select value::uuid from kept where name = 'student') and action = 'member_joined'),
  1, 'the class''s log shows them joining');
select is((select after_values ->> 'purpose' from public.audit_log
           where user_id = (select value::uuid from kept where name = 'student') and action = 'invite.redeemed'),
  'class_space', 'the audit log names the class code that let the account in');

/* ---------- 2. Codes that don't work any more (criterion 2) ---------- */

select is(public.check_invite((select value from kept where name = 'one_place')), 'ended',
  'the code''s one place is taken, so it has ended');
select throws_ok($$ select pg_temp.sign_up('second.286@example.com', (select value from kept where name = 'one_place')) $$,
  '23514', 'This invitation is not valid any more.', 'a used-up class code is refused at sign-up');
select is((select count(*)::integer from auth.users where email = 'second.286@example.com'), 0,
  'and the refused sign-up leaves no account behind');
select is(public.check_invite((select value from kept where name = 'locked')), 'ended',
  'a locked class''s code doesn''t open sign-up');
select throws_ok($$ select pg_temp.sign_up('third.286@example.com', (select value from kept where name = 'locked')) $$,
  '23514', 'This invitation is not valid any more.', 'nor can anyone sign up with it');
select is(public.check_invite('AAAA-BBBB-CCCC'), 'unknown', 'an unknown code is still unknown');

/* ---------- 3. Platform invites as before ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept select 'platform', code from public.admin_create_invite(1, 14, null);
select pg_temp.as_postgres();
select lives_ok($$ select pg_temp.sign_up('platform.286@example.com', (select value from kept where name = 'platform')) $$,
  'a platform invite still opens sign-up');

select * from finish();
rollback;
