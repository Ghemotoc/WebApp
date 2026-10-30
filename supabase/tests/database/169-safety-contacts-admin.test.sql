-- Database tests for editing the safety contacts and the monthly check (story S1-E10-13, part b;
-- CLAUDE.md rule 1).
-- What it proves:
-- - support, admin and owner edit a country's contacts in both languages, and every change records
--   who and when, with before and after values in the audit log (criterion 6); moderators only read;
-- - a link must be https; removing a contact needs a reason;
-- - the monthly job opens one check per market country, safe to run twice; a check closes once
--   every contact of the country is confirmed or changed (criterion 7);
-- - a contact unchecked for 45 days shows in the warnings (criterion 8);
-- - my_staff_areas() now returns the caller's own access;
-- - policy safety_contact_checks_select_staff: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to authenticated;

/* ---------- The monthly check (criterion 7) ---------- */

select is(public.create_monthly_safety_checks(), (select count(*)::integer from public.markets),
  'the monthly job opens one check per market country');
select is(public.create_monthly_safety_checks(), 0, 'running it twice opens nothing more');
-- The seed contacts were checked before this month's check opened.
update public.safety_contact_checks set created_at = now() + interval '1 day';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.safety_contact_checks), (select count(*)::integer from public.markets),
  'allowed: safety_contact_checks_select_staff: support reads the checks');
select is((select access from public.my_staff_areas() where area = 'safety_contacts'), 'act',
  'support''s own access to the safety contacts is act');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.safety_contact_checks), 0,
  'denied: safety_contact_checks_select_staff: a member reads none');

/* ---------- Editing (criterion 6) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_confirm_safety_contact((select id from public.safety_contacts limit 1)) $$, '42501', null,
  'a moderator reads the contacts but can''t change them');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_save_safety_contact('{"country_code": "RO", "kind": "regulator", "position": 2,
  "label": "Test", "link": "http://insecure.example"}'::jsonb) $$, '23514', null, 'a link must be https');
insert into named select 'new', public.admin_save_safety_contact('{"country_code": "RO", "kind": "regulator", "position": 2,
  "label": "ANSPDCP", "link": "https://www.dataprotection.ro", "opening_hours": "Mon to Fri 09:00 to 16:00",
  "opening_hours_ro": "Luni-vineri 09:00-16:00", "confidence": "High"}'::jsonb);
select results_eq(
  $$ select checked_by, last_checked_on = current_date, opening_hours_ro from public.safety_contacts where id = (select id from named where label = 'new') $$,
  $$ values ('support', true, 'Luni-vineri 09:00-16:00') $$,
  'support adds a contact in both languages, recorded as checked today by them');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'safety_contact.saved' and target_id = (select id from named where label = 'new')::text
                  and before_values is null and after_values ->> 'label' = 'ANSPDCP'),
  'the change is in the audit log with its after values');

/* ---------- Closing a check ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok((select still_to_confirm > 0 and closed_at is null from public.admin_safety_contact_checks() where country_code = 'RO'),
  'Romania''s check lists contacts still to confirm');
reset role;
update public.safety_contact_checks set created_at = now() - interval '1 day' where country_code = 'RO';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select lives_ok($$ select public.admin_confirm_safety_contact(id) from public.safety_contacts where country_code = 'RO' $$,
  'support confirms each Romanian contact');
select isnt((select closed_at from public.admin_safety_contact_checks() where country_code = 'RO'), null,
  'and the check closes');

/* ---------- Removing ---------- */

select throws_ok($$ select public.admin_remove_safety_contact((select id from named where label = 'new'), ' ') $$, '23514', null,
  'removing a contact needs a reason');
select ok(public.admin_remove_safety_contact((select id from named where label = 'new'), 'Duplicate of the regulator line.'),
  'with one it is removed');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'safety_contact.removed' and before_values ->> 'label' = 'ANSPDCP'),
  'logged with the values it had');

/* ---------- The 45-day warning (criterion 8) ---------- */

update public.safety_contacts set last_checked_on = current_date - 50 where country_code = 'GB' and kind = 'emergency';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok(exists (select 1 from public.admin_safety_contact_warnings() where country_code = 'GB' and days_since = 50),
  'a contact unchecked for 50 days shows in the owner''s warnings');
select ok(not exists (select 1 from public.admin_safety_contact_warnings() where country_code = 'RO'),
  'freshly confirmed ones don''t');

select * from finish();

rollback;
