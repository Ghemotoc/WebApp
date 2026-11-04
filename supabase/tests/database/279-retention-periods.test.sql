-- Database tests for "How long we keep things" in Settings › Privacy (bundle IDEAS-2, part a;
-- idea IDEA-20261101-5).
-- What it proves:
-- - a signed-in member reads each kind of their data with its period, from the settings the
--   clean-up jobs use, in the screen's order;
-- - when staff change a period, the member reads the new one at once;
-- - a setting that isn't a whole number is left out rather than shown wrong;
-- - a visitor who isn't signed in can't call it, and it reveals no other setting.
-- Personas: adult_writer (…01).
-- Test data: two settings changed here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Step 1: a member reads the periods. The setting is read first, because members can't read it.
select set_config('test.notifications_keep_days',
  (select value #>> '{}' from public.settings where key = 'notifications_keep_days'), true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select array_agg(kind) from public.retention_periods()),
  array['notifications', 'deleted_content', 'reported_messages', 'moderator_mail', 'support_tickets',
        'reading_minutes', 'scrambled_ip', 'invites', 'account_deletion'],
  'a member sees each kind of their data, in the screen''s order');
select is((select amount || ' ' || unit from public.retention_periods() where kind = 'notifications'),
  current_setting('test.notifications_keep_days') || ' days',
  'each period is the setting the clean-up job reads');
select is((select unit from public.retention_periods() where kind = 'support_tickets'), 'years',
  'a period kept in years says so');
reset role;

-- Step 2: staff change a period; the member reads the new one.
update public.settings set value = '120'::jsonb where key = 'notifications_keep_days';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select amount from public.retention_periods() where kind = 'notifications'), 120,
  'a period staff changed shows straight away');
reset role;

-- Step 3: a setting that isn't a whole number is left out.
update public.settings set value = '"soon"'::jsonb where key = 'invites_keep_days';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.retention_periods() where kind = 'invites'), 0::bigint,
  'a period that isn''t a whole number is left out, never shown wrong');
reset role;

-- Step 4: visitors are refused, and nothing beyond the listed settings comes out.
set local role anon;
select throws_ok('select * from public.retention_periods()', '42501', null,
  'a visitor who isn''t signed in can''t read the periods');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.settings where key = 'notifications_keep_days'), 0::bigint,
  'the settings table itself stays closed to members: the function is the only way in');
reset role;

select * from finish();
rollback;
