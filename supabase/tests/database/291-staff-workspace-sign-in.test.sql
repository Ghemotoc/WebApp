-- Database tests for staff signing in through Google Workspace (story S1-E2-07b; bundle 17 CHECK,
-- part b).
-- What it proves:
-- - while the Vault secret staff_email_domain isn't set, staff sign in as in March (S1-E2-07a);
-- - once it is, a password session holds no staff powers (is_staff_session(), staff_may(),
--   my_staff_areas()) and my_staff_sign_in() asks for a Google sign-in, naming the domain only to
--   staff;
-- - only a Google sign-in on a Google Workspace account of that domain (the hd claim) counts: not
--   another Workspace domain, not a personal Google account made with a work address, not a
--   password session on a connected account;
-- - a role can only be granted to an account with such a Google account (criterion 3);
-- - deleting the secret brings the March sign-in back (the recovery in
--   docs/runbooks/staff-sign-in.md).
-- Personas: adult_writer (…01), teacher (…07), owner (…08), admin (…09), moderator (…10).
-- Test data: made here; rolled back. example.com is a test domain, never the real one.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- A session as Supabase's tokens carry it: the person and how they signed in, just now.
create function pg_temp.sign_in(persona_id uuid, method text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', method, 'timestamp', extract(epoch from now())::bigint))
         )::text, true);
$$;
-- Links a Google identity to an existing account, as the Settings connect flow does.
create function pg_temp.link_google(persona_id uuid, google_email text, workspace_domain text)
returns void language plpgsql as $$
begin
  insert into public.identity_link_requests (user_id, provider) values (persona_id, 'google');
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values ('google-' || persona_id, persona_id,
    jsonb_strip_nulls(jsonb_build_object('sub', 'google-' || persona_id, 'email', google_email,
      'email_verified', true, 'custom_claims', case when workspace_domain is null then null
        else jsonb_build_object('hd', workspace_domain) end)),
    'google', now(), now());
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator;
grant select on ids to authenticated;

/* ---------- 1. March: no staff domain yet ---------- */

delete from vault.secrets where name = 'staff_email_domain';
select pg_temp.sign_in((select admin from ids), 'password');
select ok(public.is_staff_session(), 'without a staff domain, an admin''s password session is a staff session (S1-E2-07a)');
select is(public.my_staff_sign_in() ->> 'needs_workspace', 'false',
  'without a staff domain, nobody is asked to sign in with Google');
reset role;

/* ---------- 2. The staff domain is set ---------- */

-- Spaces, capitals and an "@" are forgiven, as an owner might type them in the SQL editor.
select vault.create_secret(' @Example.COM ', 'staff_email_domain');

select pg_temp.sign_in((select admin from ids), 'password');
select ok(not public.is_staff_session(), 'once the domain is set, an admin''s password session holds no staff powers');
select ok(not public.staff_may('moderation', 'view'), 'staff_may() refuses the password session too');
select is((select count(*)::integer from public.my_staff_areas()), 0, 'the admin menu is empty for it');
select is(public.my_staff_sign_in(),
  '{"needs_workspace": true, "domain": "example.com", "connected": false}'::jsonb,
  'the admin is asked to connect and sign in with their example.com Google account');
select pg_temp.sign_in((select adult_writer from ids), 'password');
select is(public.my_staff_sign_in(),
  '{"needs_workspace": false, "domain": null, "connected": false}'::jsonb,
  'a member is asked nothing and never learns the staff domain');
reset role;

/* ---------- 3. Which Google sign-ins count ---------- */

select pg_temp.link_google((select admin from ids), 'admin@example.com', 'example.com');
select pg_temp.sign_in((select admin from ids), 'password');
select ok(not public.is_staff_session(), 'a connected account still needs a Google sign-in, not a password one');
select is(public.my_staff_sign_in() ->> 'connected', 'true', 'the page then only asks the admin to sign in with Google');
select pg_temp.sign_in((select admin from ids), 'oauth');
select ok(public.is_staff_session(), 'a Google sign-in on an example.com Workspace account is a staff session');
select ok(public.staff_may('settings', 'act'), 'and staff_may() allows the admin''s areas again');
select is(public.my_staff_sign_in() ->> 'needs_workspace', 'false', 'and nothing more is asked');
reset role;

select pg_temp.link_google((select owner from ids), 'owner@other.example', 'other.example');
select pg_temp.sign_in((select owner from ids), 'oauth');
select ok(not public.is_staff_session(), 'a Google Workspace account of another domain doesn''t count');
reset role;

-- A personal Google account made with a work address: verified email on the domain, no hd claim.
select pg_temp.link_google((select moderator from ids), 'moderator@example.com', null);
select pg_temp.sign_in((select moderator from ids), 'oauth');
select ok(not public.is_staff_session(), 'a personal Google account with a work address doesn''t count (no hd claim)');
reset role;

-- A provider sign-in that isn't Google on the domain (here: no Google identity at all).
select pg_temp.sign_in((select teacher from ids), 'oauth');
select ok(not public.is_staff_session(), 'a provider sign-in without a Workspace account is no staff session');
select is(public.my_staff_sign_in() ->> 'needs_workspace', 'false', 'and the teacher, who holds no staff role, is asked nothing');
reset role;

/* ---------- 4. Granting a role ---------- */

-- The owner signs in with an example.com Workspace account (their other.example one doesn't count).
delete from auth.identities where user_id = (select owner from ids) and provider = 'google';
select pg_temp.link_google((select owner from ids), 'owner@example.com', 'example.com');
select pg_temp.sign_in((select owner from ids), 'oauth');
select throws_ok(format($$ select public.admin_grant_role(%L, 'support', 'Joins the support team') $$, (select adult_writer from ids)),
  '23514', null, 'a personal account without a Workspace account can''t be given a staff role');
reset role;
select pg_temp.link_google((select teacher from ids), 'teacher@example.com', 'example.com');
select pg_temp.sign_in((select owner from ids), 'oauth');
select is(public.admin_grant_role((select teacher from ids), 'support', 'Joins the support team'), true,
  'an account with an example.com Workspace account can be given one');
select pg_temp.sign_in((select teacher from ids), 'oauth');
select ok(public.is_staff_session(), 'and their Google sign-in is a staff session at once');
reset role;

/* ---------- 5. Recovery: deleting the secret ---------- */

delete from vault.secrets where name = 'staff_email_domain';
select pg_temp.sign_in((select moderator from ids), 'password');
select ok(public.is_staff_session(), 'deleting the secret brings the March sign-in back');
select is(public.my_staff_sign_in() ->> 'needs_workspace', 'false', 'and the page stops asking for Google');
reset role;
select is(public.staff_email_domain(), null::text, 'staff_email_domain() answers null without the secret');

select * from finish();
rollback;
