-- Database tests for "what we hold about you" in Download my data (QA-7, finding P2; GDPR
-- art. 15).
-- What it proves:
-- - every staff table with a user_id is in data_export_held_tables(), included or left out with
--   a reason, so a new staff table can't be forgotten;
-- - the included tables are exactly the groups export_held_about_of() gives;
-- - a sanction on the account reaches the person's export, without the staff member's ID or the
--   internal note; the same export for staff answering a data request has it too;
-- - another person's export doesn't carry it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

/* ---------- 1. The one list ---------- */

select is(
  (select coalesce(string_agg(classes.relname, ', ' order by classes.relname), '')
   from pg_class as classes join pg_namespace on pg_namespace.oid = classes.relnamespace
   where pg_namespace.nspname = 'public' and classes.relkind = 'r'
     and obj_description(classes.oid) ~ '^kind: staff'
     and exists (select 1 from pg_attribute where attrelid = classes.oid and attname = 'user_id' and not attisdropped)
     and classes.relname not in (select listed.table_name from public.data_export_held_tables() as listed)
     and classes.relname not in (select listed.table_name from public.data_export_tables() as listed)),
  '', 'every staff table with a user_id is listed, in the export or left out');
select is(
  (select count(*)::integer from public.data_export_held_tables() as listed
   where not listed.is_included and coalesce(listed.why_left_out, '') = ''), 0,
  'every staff table left out says why');
select is(
  (select array_agg(key order by key) from jsonb_object_keys(public.export_held_about_of('00000000-0000-4000-8000-000000000015')) as key),
  (select array_agg(listed.table_name order by listed.table_name) from public.data_export_held_tables() as listed where listed.is_included),
  'the export gives exactly the included tables');

/* ---------- 2. A sanction reaches the person's export ---------- */

-- moderator (…10) warns blocker (…15), with an internal note.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_apply_sanction('00000000-0000-4000-8000-000000000015', 'warning',
  null, null, 'Internal: same link in many comments.', 'You posted the same link in many comments.');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(
  (select jsonb_array_length(public.my_data_export() #> '{tables,held_about_you,sanctions}')), 1,
  'the person''s export lists the warning on their account');
select is(
  (select public.my_data_export() #>> '{tables,held_about_you,sanctions,0,kind}'), 'warning',
  'with its kind');
select ok(
  (select (public.my_data_export() -> 'tables' -> 'held_about_you')::text !~ '(_user_id|Internal: same link)'),
  'without the staff member''s ID or the internal note');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select jsonb_array_length(public.my_data_export() #> '{tables,held_about_you,sanctions}')), 0,
  'another person''s export doesn''t carry it');

/* ---------- 3. The same group when staff answer a data request ---------- */

reset role;
select ok(public.export_tables_of('00000000-0000-4000-8000-000000000015') ? 'held_about_you',
  'export_tables_of(), which admin_data_request_export() uses, carries the group too');

select * from finish();
rollback;
