-- Epic check for S1-E11, the admin site (story S1-E11-QA).
-- It adds no feature: it walks the epic's main journey through the database, crossing the March
-- stories built so far (S1-E11-01, S1-E11-17) and the staff rules they rest on (S1-E2-07a). The
-- CMS stories (S1-E11-06, 10, 12), S1-E11-18 and S1-E11-02 are not built yet
-- (docs/epic-reports/S1-E11.md).
-- Journey (S1-E11-17 × S1-E2-01 × S1-E11-01):
--   the admin makes a one-use invite link → an invited adult signs up with the code → the link is
--   used up; the log has the admin's invite.created, the new account's invite.redeemed (user ID
--   only, never the email) and the system's invite.used_up (CTO, 24 Oct 2026) → the owner finds them by searching "invite." and exports them (the export logged
--   too) → the moderator can't search the audit log → each persona's menu is what its role
--   allows (the moderator gets Moderation; support gets only areas without a page yet).
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create temp table ids as select
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support;
grant select on ids to authenticated, anon;

-- Staff claims with a fresh sign-in (amr), as the admin shell's rules expect (S1-E11-01).
create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint)))::text, true);
$$;

/* ---------- 1. The admin makes a link (S1-E11-17) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
create temp table made as select * from public.admin_create_invite(1, 7, 'Epic check');
grant select on made to authenticated;
select matches((select code from made), '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$', 'the admin gets a one-use code');

/* ---------- 2. An invited adult joins with it (S1-E11-17 × S1-E2-01) ---------- */

reset role;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'epic-s1-e11@example.com', 'x', '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('invite_code', (select code from made), 'birth_year', '1990', 'locale', 'ro',
    'accepted_terms_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id where documents.slug = 'terms' and versions.language = 'ro'),
    'accepted_privacy_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id where documents.slug = 'privacy' and versions.language = 'ro')),
  now(), now(), '', '', '', '');
select is((select use_count from public.invites where id = (select invite_id from made)), 1, 'the link is used up');
select results_eq(
  $$ select action, actor::text, user_id from public.audit_log where target_id = (select invite_id::text from made) order by action $$,
  $$ values ('invite.created', 'person', (select admin from ids)),
            ('invite.redeemed', 'person', (select id from auth.users where email = 'epic-s1-e11@example.com')),
            ('invite.used_up', 'system', null::uuid) $$,
  'the admin made it, the new account used it and the system closed it: nothing on behalf of the admin');
select is((select count(*)::integer from public.audit_log where target_id = (select invite_id::text from made)
  and (coalesce(before_values::text, '') || coalesce(after_values::text, '') || coalesce(reason, '')) like '%example.com%'), 0,
  'the new account appears by user ID only, never by email');
select is((select count(*)::integer from public.audit_log where user_id = (select admin from ids)
  and target_id = (select invite_id::text from made) and action <> 'invite.created'), 0,
  'the admin is the actor of nothing but making the link');

/* ---------- 3. The owner searches and exports; the moderator can't (S1-E11-01) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select results_eq(
  $$ select action from public.admin_search_audit_log(action_prefix => 'invite.', from_date => current_date)
     where target_id = (select invite_id::text from made) order by action $$,
  $$ values ('invite.created'), ('invite.redeemed'), ('invite.used_up') $$,
  'the owner finds all three rows by searching "invite."');
select lives_ok($$ select * from public.admin_export_audit_log(action_prefix => 'invite.', from_date => current_date) $$,
  'and exports them');
reset role;
select is((select count(*)::integer from public.audit_log where action = 'audit_log.exported' and user_id = (select owner from ids) and created_at >= now()), 1,
  'the export itself is logged');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select * from public.admin_search_audit_log() $$, '42501', null, 'the moderator can''t search the audit log');
select throws_ok($$ select * from public.admin_list_invites() $$, '42501', null, 'nor list invite links');

/* ---------- 4. The menus (S1-E11-01 × S1-E2-07a × S1-E10-03a) ---------- */

select ok(exists (select 1 from public.my_staff_areas() where area = 'moderation'), 'the moderator''s areas include moderation');
select ok(not exists (select 1 from public.my_staff_areas() where area in ('audit_log', 'invites')), 'and neither the audit log nor invites');
select pg_temp.sign_in_as((select support from ids));
select ok(not exists (select 1 from public.my_staff_areas() where area in ('moderation', 'audit_log', 'invites')),
  'support gets none of the areas that have a page today');
select pg_temp.sign_in_as((select owner from ids));
select ok((select count(*) >= 3 from public.my_staff_areas() where area in ('moderation', 'audit_log', 'invites', 'roles')),
  'the owner gets them all');

select * from finish();

rollback;
