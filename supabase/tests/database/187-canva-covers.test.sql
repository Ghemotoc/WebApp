-- Database tests for designing a cover in Canva (story S1-E3-12; ADR 0009; CLAUDE.md rule 1).
-- What it proves:
-- - a writer stores their own encrypted Canva connection, only while canva_covers is on and only
--   when the account may write; a second connection replaces the first;
-- - a writer can always disconnect, whatever the flag says;
-- - policy canva_connections_select_own: allowed (the writer) and denied (another member, and a
--   moderator: staff never see someone's Canva tokens);
-- - nobody signed out can call the functions, and nobody can write the table directly.
-- Test data: adult_writer (…01), blocker (…15) as another member, suspended_user (…13),
-- moderator (…10). Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Connecting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.save_canva_connection('a1', 'r1', now() + interval '1 hour') $$),
  '0A000', 'nothing is stored while canva_covers is off');

select pg_temp.as_postgres();
update public.feature_flags set is_enabled = true where key = 'canva_covers';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select is(pg_temp.refusal($$ select public.save_canva_connection('a1', 'r1', now() + interval '1 hour') $$),
  '42501', 'a suspended account can''t connect Canva');

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.save_canva_connection('a1', 'r1', now() + interval '1 hour') $$),
  '42501', 'a signed-out visitor can''t call it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.save_canva_connection('a1', 'r1', now() + interval '1 hour') $$,
  'the writer stores their encrypted tokens');
select lives_ok($$ select public.save_canva_connection('a2', 'r2', now() + interval '2 hours') $$,
  'connecting again replaces the old tokens');

/* ---------- 2. Reading: canva_connections_select_own ---------- */

select results_eq(
  $$ select access_token_ciphertext, refresh_token_ciphertext from public.canva_connections $$,
  $$ values ('a2'::text, 'r2'::text) $$,
  'allowed: canva_connections_select_own: the writer reads their own (one) connection');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*) from public.canva_connections), 0::bigint,
  'denied: canva_connections_select_own: another member can''t read someone else''s connection');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*) from public.canva_connections), 0::bigint,
  'denied: canva_connections_select_own: a moderator can''t read anyone''s Canva tokens');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ insert into public.canva_connections (user_id, access_token_ciphertext,
    refresh_token_ciphertext, access_expires_at) values ('00000000-0000-4000-8000-000000000001', 'x', 'y', now()) $$),
  '42501', 'nobody writes the table directly');

/* ---------- 3. Disconnecting ---------- */

select pg_temp.as_postgres();
update public.feature_flags set is_enabled = false where key = 'canva_covers';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.disconnect_canva(), true, 'the writer disconnects, even with the flag off');
select is(public.disconnect_canva(), false, 'disconnecting twice finds nothing the second time');

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.disconnect_canva() $$), '42501',
  'a signed-out visitor can''t call disconnect_canva()');

select * from finish();
rollback;
