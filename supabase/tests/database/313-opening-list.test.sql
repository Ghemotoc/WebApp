-- Database tests for "Tell me when you open here" (bundle G5, part a; story S1-E2-10; Robert,
-- 7 Nov 2026, 11:57 UTC; CLAUDE.md rule 1).
-- What it proves:
-- - only a payload our server signed, for this purpose, joins the list: a wrong signature or a
--   public notice's payload is refused, so the bot check can't be skipped;
-- - joining keeps the address in lower case with both countries and hands back a token; asking
--   again within 10 minutes sends nothing; an open country is refused (sign up instead);
-- - the token confirms the address; a wrong token is refused; "remove" deletes it;
-- - the worker claims only confirmed addresses whose country is open, never twice, and only with
--   its key; the nightly clean-up deletes unconfirmed addresses after 7 days and the rest 7 days
--   after their opening email;
-- - policy opening_list_select_staff: admin allowed; a moderator, a member and a visitor denied;
--   the counts for Staff › Waitlist likewise, and they never carry an address.
-- Personas: adult_writer (…01), admin (…09), moderator (…10). Test countries: FR (closed, not
-- listed) and a made-up open market, ZZ. Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- The secret our server signs with, as Robert sets it by hand in Vault on staging.
select vault.create_secret('test-notice-secret', 'public_notice_secret')
  where not exists (select 1 from vault.secrets where name = 'public_notice_secret');
select vault.update_secret(id, 'test-notice-secret') from vault.secrets where name = 'public_notice_secret';

create function pg_temp.join(payload jsonb) returns text language sql as $$
  select public.join_opening_list(payload::text, encode(extensions.hmac(payload::text, 'test-notice-secret', 'sha256'), 'hex'));
$$;
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create temporary table worker as
  select decrypted_secret as worker_key from vault.decrypted_secrets where name = 'email_worker_key';
grant select on worker to anon, authenticated;

/* ---------- 1. Only through our server ---------- */

select pg_temp.sign_out();
select throws_ok(
  $$ select public.join_opening_list('{"purpose": "opening_list", "email": "a@b.co", "countryCode": "FR"}', 'nope') $$,
  '42501', null, 'a payload without our server''s signature is refused');
select throws_ok(
  $$ select pg_temp.join('{"kind": "notice", "email": "a@b.co", "countryCode": "FR"}') $$,
  '42501', null, 'a signed payload for another purpose (a public notice) is refused');

/* ---------- 2. Joining ---------- */

insert into named
  select 'token', pg_temp.join('{"purpose": "opening_list", "email": " Reader@Example.com ", "countryCode": "fr",
    "detectedCountryCode": "FR", "language": "en"}');
select ok((select value from named where label = 'token') ~ '^[0-9a-f]{48}$',
  'joining hands back a one-time token for the confirm email');
reset role;
select is((select email || ' ' || country_code || ' ' || detected_country_code || ' ' || language
           from public.opening_list where email = 'reader@example.com'),
  'reader@example.com FR FR en', 'the address is kept in lower case, with both countries and the language');
select is((select token_hash from public.opening_list where email = 'reader@example.com'),
  public.opening_list_token_hash((select value from named where label = 'token')),
  'only the token''s hash is kept');
select pg_temp.sign_out();
select is(pg_temp.join('{"purpose": "opening_list", "email": "reader@example.com", "countryCode": "FR", "language": "en"}'),
  null, 'asking again within 10 minutes sends nothing, so the form can''t flood an inbox');
select throws_ok(
  $$ select pg_temp.join('{"purpose": "opening_list", "email": "not-an-address", "countryCode": "FR"}') $$,
  '23514', null, 'a malformed address is refused');
reset role;
insert into public.markets (country_code, status, languages) values ('ZZ', 'open', array['en']);
select pg_temp.sign_out();
select throws_ok(
  $$ select pg_temp.join('{"purpose": "opening_list", "email": "reader@example.com", "countryCode": "ZZ"}') $$,
  '23514', 'We are already open there.', 'an open country has no list: the visitor can sign up');

/* ---------- 3. Confirming and leaving ---------- */

select throws_ok($$ select public.confirm_opening_list('wrong') $$, '23514', null, 'a wrong link confirms nothing');
select is(public.confirm_opening_list((select value from named where label = 'token')), 'FR',
  'the emailed link confirms the address and names its country');
select is(pg_temp.join('{"purpose": "opening_list", "email": "reader@example.com", "countryCode": "FR"}'), null,
  'a confirmed address gets no new confirm email');
insert into named
  select 'leaver', pg_temp.join('{"purpose": "opening_list", "email": "leaver@example.com", "countryCode": "FR"}');
select ok(public.leave_opening_list((select value from named where label = 'leaver')), '"Remove" takes the address off the list');
reset role;
select is((select count(*) from public.opening_list where email = 'leaver@example.com'), 0::bigint,
  'and nothing of it is left');

/* ---------- 4. The opening emails ---------- */

select pg_temp.sign_out();
select is(jsonb_array_length(public.opening_email_worker_claim((select worker_key from worker))), 0,
  'nothing is due while the country is closed');
reset role;
-- The country opens.
insert into public.markets (country_code, status, languages) values ('FR', 'open', array['en']);
select pg_temp.sign_out();
insert into named
  select 'claimed', public.opening_email_worker_claim((select worker_key from worker))::text;
select is((select value::jsonb -> 0 ->> 'to' || ' ' || (value::jsonb -> 0 ->> 'country_code') from named where label = 'claimed'),
  'reader@example.com FR', 'once the country opens, the worker claims the confirmed address');
select is(jsonb_array_length(public.opening_email_worker_claim((select worker_key from worker))), 0,
  'a claimed email isn''t claimed again while it is being sent');
select throws_ok($$ select public.opening_email_worker_claim('wrong-key') $$, '42501', null,
  'only the worker''s key may claim emails');
select is(public.opening_email_worker_mark_sent((select worker_key from worker),
  array[(select (value::jsonb -> 0 ->> 'id')::uuid from named where label = 'claimed')]), 1,
  'the worker marks the email that left');

/* ---------- 5. The nightly clean-up ---------- */

reset role;
insert into public.opening_list (email, country_code, language, token_hash, created_at)
  values ('late@example.com', 'DE', 'en', public.opening_list_token_hash('late'), now() - interval '8 days'),
         ('fresh@example.com', 'DE', 'en', public.opening_list_token_hash('fresh'), now());
update public.opening_list set open_email_sent_at = now() - interval '8 days' where email = 'reader@example.com';
select is(public.purge_opening_list(), 2,
  'unconfirmed after 7 days, and 7 days after the opening email, the address is deleted');

/* ---------- 6. Who may read ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*) from public.opening_list), 1::bigint, 'allowed: opening_list_select_staff (an admin reads the list)');
select is((select confirmed || '/' || unconfirmed from public.admin_opening_list_counts() where country_code = 'DE'),
  '0/1', 'and the counts by country, which never carry an address');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*) from public.opening_list), 0::bigint, 'denied: opening_list_select_staff (a moderator reads nothing)');
select throws_ok('select * from public.admin_opening_list_counts()', '42501', null, 'nor the counts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.opening_list), 0::bigint, 'a member reads nothing');
select pg_temp.sign_out();
select throws_ok('select count(*) from public.opening_list', '42501', null, 'a visitor can''t read the table at all');

select * from finish();

rollback;
