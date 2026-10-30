-- Database tests for the country from the connection and markets (story S1-E2-10).
-- What it proves:
-- - only a two-letter country code is stored; profiles has no IP address column;
-- - a token signed with the Vault secret and at most 10 minutes old gives the country; a forged,
--   old or unsigned token gives none;
-- - while invite_only and adults_only are on, a valid invite admits any country, unknown included;
-- - once sign-up is public: a closed or unknown country is refused, an under-16 in Australia is
--   refused, and nothing is stored;
-- - anyone reads the markets; nobody changes them through the API (allowed and denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- The secret, as set by hand on staging (inside this test's transaction only).
select vault.create_secret('test-signup-secret', 'signup_context_secret')
  where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
select vault.update_secret(id, 'test-signup-secret') from vault.secrets where name = 'signup_context_secret';

-- A token as /api/signup-context makes it, for a country and an age in seconds.
create function pg_temp.token_for(country text, seconds_ago integer, secret text default 'test-signup-secret')
returns text language sql as $$
  select 'v1.' || country || '.' || (extract(epoch from now())::bigint - seconds_ago)::text || '.'
    || encode(extensions.hmac('v1.' || country || '.' || (extract(epoch from now())::bigint - seconds_ago)::text, secret, 'sha256'), 'hex');
$$;

-- Sign-up data with the current legal versions, the working invite and a country token.
create function pg_temp.sign_up_data(birth_year text, token text)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'invite_code', 'PERSONAS-TEST-INVITE', 'birth_year', birth_year, 'signup_context', token,
    'accepted_terms_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')));
$$;

create function pg_temp.sign_up(email text, sign_up_data jsonb)
returns uuid language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', email,
    'not-a-real-hash', '{"provider": "email", "providers": ["email"]}', sign_up_data, now(), now(), '', '', '', '')
  returning id;
$$;

create function pg_temp.years_ago(years integer) returns text language sql as $$
  select (extract(year from (now() at time zone 'Europe/Bucharest'))::integer - years)::text;
$$;

-- 1. Only a country code, never an IP address.
select hasnt_column('public', 'profiles', 'ip_address', 'profiles has no IP address column');
select col_has_check('public', 'profiles', 'country_code', 'the country is checked to be a two-letter code');

-- 2. The token.
select is(public.verified_signup_country(pg_temp.token_for('RO', 5)), 'RO', 'a fresh, signed token gives the country');
select is(public.verified_signup_country(pg_temp.token_for('RO', 700)), null, 'a token older than 10 minutes gives none');
select is(public.verified_signup_country(pg_temp.token_for('RO', 5, 'guessed-secret')), null,
  'a token signed with another secret gives none');
select is(public.verified_signup_country('v1.RO.1.' || repeat('0', 64)), null, 'a made-up token gives none');

-- 3. The invited test: any country with a valid invite.
select lives_ok($$ select pg_temp.sign_up('from.ro@example.com', pg_temp.sign_up_data(pg_temp.years_ago(30), pg_temp.token_for('RO', 5))) $$,
  'an invited adult signs up from Romania');
select is((select country_code from public.profiles join auth.users on users.id = profiles.id where users.email = 'from.ro@example.com'),
  'RO', 'only the country code is stored');
select lives_ok($$ select pg_temp.sign_up('from.gb@example.com', pg_temp.sign_up_data(pg_temp.years_ago(30), pg_temp.token_for('GB', 5))) $$,
  'while invite_only and adults_only are on, an invite admits someone from a closed market (Q6c)');
select lives_ok($$ select pg_temp.sign_up('unknown@example.com', pg_temp.sign_up_data(pg_temp.years_ago(30), null)) $$,
  'while invite_only and adults_only are on, an invite admits an unknown country, VPN or Tor (Q6b)');

-- 4. Once sign-up is public.
update public.feature_flags set is_enabled = false where key in ('invite_only', 'adults_only');
select throws_ok($$ select pg_temp.sign_up('closed@example.com', pg_temp.sign_up_data(pg_temp.years_ago(30), pg_temp.token_for('GB', 5))) $$,
  '23514', null, 'once public, a closed market is refused');
select throws_ok($$ select pg_temp.sign_up('unknown.public@example.com', pg_temp.sign_up_data(pg_temp.years_ago(30), null)) $$,
  '23514', null, 'once public, an unknown country counts as closed');
update public.markets set status = 'open', legal_check = 'done' where country_code = 'AU';  -- is_open follows the status (S1-E11-05)
select is(public.sign_up_market_outcome('AU', pg_temp.years_ago(15)::integer), 'under_market_age',
  'once public and open, Australia refuses an under-16 (Q19)');
select is_empty($$ select id from auth.users where email in ('closed@example.com', 'unknown.public@example.com') $$,
  'nothing is kept from a refused sign-up');

-- 5. Who reads and changes markets.
set local role anon;
select isnt_empty($$ select id from public.markets where is_open $$,
  'allowed: markets_select_public: a signed-out visitor reads the open markets');
select throws_ok($$ update public.markets set is_open = true $$, '42501', null,
  'denied: markets_select_public: nobody opens a market through the API');

select * from finish();

rollback;
