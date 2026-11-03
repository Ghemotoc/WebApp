-- Database tests for possible returning users (bundle ADMIN-2, part f2; Robert's brief of 2 Nov
-- 2026, section 6).
-- What it proves:
-- - the sign-up IP token is trusted only when it is signed, recent and well formed;
-- - a sign-up keeps its scrambled IP (never the address) and always goes ahead;
-- - a sign-up sharing a scrambled IP (from a sign-up or a picture upload, under the same month's
--   key) with an account banned in the last 30 days opens a "returning_user" case on the new
--   profile, linked to the banned account; no match, an older ban or a lifted ban opens nothing;
-- - the nightly job deletes sign-up IPs after 30 days;
-- - who may read sign_up_ips and case_account_links (allowed and denied);
-- - a moderator links and unlinks accounts with a reason, logged; members can't;
-- - a statement of reasons from such a case says automated means found it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

-- A fresh password sign-in, as Supabase's tokens carry it in "amr": staff changes need one.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password',
                                                     'timestamp', extract(epoch from now())::bigint)))::text, true);
$$;
-- The test secret the token is signed with, as /api/signup-context signs it.
do $$
begin
  if exists (select 1 from vault.secrets where name = 'signup_context_secret') then
    perform vault.update_secret(id, 'local-test-signup-secret') from vault.secrets where name = 'signup_context_secret';
  else
    perform vault.create_secret('local-test-signup-secret', 'signup_context_secret');
  end if;
end;
$$;
-- A signed IP token for two scrambled values (this month's and last month's), issued some seconds ago.
create function pg_temp.ip_token(this_value text, last_value text, age_seconds integer default 0) returns text
language sql as $$
  select signed || '.' || encode(extensions.hmac(signed, 'local-test-signup-secret', 'sha256'), 'hex')
  from (select 'ip1.' || this_value || '.' || to_char(now(), 'YYYY-MM') || '.' || last_value || '.'
               || to_char(now() - interval '1 month', 'YYYY-MM') || '.'
               || (extract(epoch from now())::bigint - age_seconds)::text as signed) as token;
$$;
-- Signs up the way Supabase Auth does, with the IP token; returns the new user ID.
create function pg_temp.sign_up(email text, token text) returns uuid language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    email, 'x', '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('invite_code', 'PERSONAS-TEST-INVITE', 'birth_year', '1990', 'locale', 'en', 'signup_ip', token,
      'accepted_terms_version_id', (select versions.id from public.legal_document_versions as versions
        join public.legal_documents as documents on documents.id = versions.document_id
        where documents.slug = 'terms' and versions.language = 'en' order by versions.published_at desc limit 1),
      'accepted_privacy_version_id', (select versions.id from public.legal_document_versions as versions
        join public.legal_documents as documents on documents.id = versions.document_id
        where documents.slug = 'privacy' and versions.language = 'en' order by versions.published_at desc limit 1)),
    now(), now(), '', '', '', '')
  returning id;
$$;

-- Three scrambled values: the banned account's, a picture's and somebody else's.
create temp table ip as select repeat('a', 64) as banned, repeat('b', 64) as picture, repeat('c', 64) as other,
  repeat('d', 64) as last_month;
-- banned_user (banned by the seed) signed up from "banned"; their picture came from "picture".
insert into public.sign_up_ips (user_id, ip_scrambled, ip_period)
  values ('00000000-0000-4000-8000-000000000014', (select banned from ip), to_char(now(), 'YYYY-MM'));
update public.sanctions set created_at = now() - interval '3 days'
  where user_id = '00000000-0000-4000-8000-000000000014' and kind = 'ban';

/* ---------- 1. The token ---------- */

select is((select count(*)::integer from public.verified_signup_ips(pg_temp.ip_token((select other from ip), (select last_month from ip)))), 2,
  'a signed, recent token gives this month''s and last month''s values');
select is((select count(*)::integer from public.verified_signup_ips(
            replace(pg_temp.ip_token((select other from ip), (select last_month from ip)), 'ip1.c', 'ip1.e'))), 0,
  'a changed token is not trusted');
select is((select count(*)::integer from public.verified_signup_ips(pg_temp.ip_token((select other from ip), (select last_month from ip), 900))), 0,
  'a token older than 10 minutes is not trusted');
select is((select count(*)::integer from public.verified_signup_ips('203.0.113.7')), 0,
  'an address in place of a token is not trusted');

/* ---------- 2. The sign-up ---------- */

create temp table clean as select pg_temp.sign_up('clean@example.com', pg_temp.ip_token((select other from ip), (select last_month from ip))) as id;
select is((select count(*)::integer from public.sign_up_ips where user_id = (select id from clean)), 2,
  'a sign-up keeps its scrambled IP under both months'' keys');
select is((select count(*)::integer from public.cases where item_id = (select id from clean)), 0,
  'a sign-up that matches nobody opens no case');

create temp table returning_one as
  select pg_temp.sign_up('came-back@example.com', pg_temp.ip_token((select banned from ip), (select last_month from ip))) as id;
select ok(exists (select 1 from public.profiles where id = (select id from returning_one)),
  'a sign-up sharing an IP with a banned account still goes ahead: never a block');
select results_eq(
  $$ select source::text, tier::text, item_type::text, reference like 'U-%' from public.cases where item_id = (select id from returning_one) $$,
  $$ values ('returning_user', 'two_days', 'profile', true) $$,
  'it opens a "Possible returning user" case on the new profile, due in 48 hours');
select results_eq(
  $$ select linked_user_id, source from public.case_account_links where user_id = (select id from returning_one) $$,
  $$ values ('00000000-0000-4000-8000-000000000014'::uuid, 'sign_up_ip') $$,
  'the case links the new account to the banned one');

-- A picture upload from the banned account, under last month's key, matches too.
insert into public.picture_checks (user_id, bucket, path, kind, uploader_ip_scrambled, uploader_ip_period)
  values ('00000000-0000-4000-8000-000000000014', 'avatars', '00000000-0000-4000-8000-000000000014/f2-test.png', 'avatar',
          (select picture from ip), to_char(now() - interval '1 month', 'YYYY-MM'));
create temp table via_picture as
  select pg_temp.sign_up('picture-match@example.com', pg_temp.ip_token((select other from ip), (select picture from ip))) as id;
select is((select count(*)::integer from public.case_account_links where user_id = (select id from via_picture)), 1,
  'a match with a banned account''s picture upload, under last month''s key, is flagged too');

-- A ban older than 30 days, or a lifted ban, flags nothing.
update public.sanctions set created_at = now() - interval '40 days'
  where user_id = '00000000-0000-4000-8000-000000000014' and kind = 'ban';
create temp table old_ban as
  select pg_temp.sign_up('old-ban@example.com', pg_temp.ip_token((select banned from ip), (select last_month from ip))) as id;
select is((select count(*)::integer from public.cases where item_id = (select id from old_ban)), 0,
  'a ban older than 30 days flags nothing');
update public.sanctions set created_at = now() - interval '3 days', lifted_at = now(),
    lifted_by_user_id = '00000000-0000-4000-8000-000000000010', lift_reason = 'Test'
  where user_id = '00000000-0000-4000-8000-000000000014' and kind = 'ban';
create temp table lifted as
  select pg_temp.sign_up('lifted@example.com', pg_temp.ip_token((select banned from ip), (select last_month from ip))) as id;
select is((select count(*)::integer from public.cases where item_id = (select id from lifted)), 0,
  'a lifted ban flags nothing');

/* ---------- 3. Retention ---------- */

update public.sign_up_ips set created_at = now() - interval '31 days' where user_id = (select id from clean);
select ok(public.blank_old_scrambled_ips() >= 2, 'the nightly job runs');
select is((select count(*)::integer from public.sign_up_ips where user_id = (select id from clean)), 0,
  'sign-up IPs are deleted after 30 days (Q48)');

/* ---------- 4. Who may read ---------- */

create temp table flagged as select id from public.cases where item_id = (select id from returning_one);
grant select on returning_one, ip, flagged to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok((select count(*) from public.sign_up_ips) > 0,
  'allowed: sign_up_ips_select_moderation lets a moderator read the scrambled IPs');
select is((select count(*)::integer from public.case_account_links where user_id = (select id from returning_one)), 1,
  'allowed: case_account_links_select_moderation lets a moderator read a case''s links');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.sign_up_ips), 0,
  'denied: sign_up_ips_select_moderation shows a member nothing');
select is((select count(*)::integer from public.case_account_links), 0,
  'denied: case_account_links_select_moderation shows a member nothing');

/* ---------- 5. The moderator's action ---------- */

select throws_ok($$ select public.admin_link_returning_user((select id from flagged), 'blocker', 'Same writing style') $$,
  '42501', null, 'a member can''t link accounts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(jsonb_array_length(public.admin_case_account_links((select id from flagged))), 1,
  'the case page lists the automatic link');
select ok(public.admin_link_returning_user((select id from flagged), '@blocker', 'Same writing style and pen name') is not null,
  'a moderator links another account by username, with a reason');
select throws_ok($$ select public.admin_link_returning_user((select id from flagged), 'blocker', 'Again') $$,
  '23514', null, 'the same account can''t be linked twice in one case');
select throws_ok($$ select public.admin_link_returning_user((select id from flagged), 'no_such_person', 'x') $$,
  '23514', null, 'an unknown username is refused');
select ok(public.admin_unlink_returning_user(
    (select (link ->> 'id')::uuid from jsonb_array_elements(public.admin_case_account_links((select id from flagged))) as link
     where link ->> 'handle' = 'blocker'), 'Different person after all'),
  'a moderator removes a wrong link with a reason');
select is(jsonb_array_length(public.admin_case_account_links((select id from flagged))), 1,
  'the removed link leaves the panel');
reset role;
select is((select count(*)::integer from public.audit_log
           where action in ('moderation.returning_user_linked', 'moderation.returning_user_unlinked')
             and user_id = '00000000-0000-4000-8000-000000000010'
             and created_at >= now()), 2,
  'linking and unlinking are both in the audit log');

/* ---------- 6. Statements of reasons ---------- */

create temp table statement as
  select public.issue_statement_of_reasons((select id from returning_one), 'ban', 'terms',
    'guidelines.closed_for_good', null, jsonb_build_object('case_id', (select id from flagged))) as id;
select ok((select automated_detection from public.statements_of_reasons where id = (select id from statement)),
  'a statement from a possible returning user case says automated means found it');

select * from finish();
rollback;
