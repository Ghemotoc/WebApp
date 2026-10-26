-- Database tests for removal orders (story S1-E10-09; CLAUDE.md rule 1; Regulation (EU)
-- 2021/784).
-- What it proves:
-- - the rota: only owners and admins set it, only people with the on-call permission take a
--   shift, shifts never overlap, and gaps are listed (criterion 2);
-- - an order's alert names who is on call and goes out at once; nobody acknowledging within 15
--   minutes escalates it; acknowledging stops that (criteria 1 and 2);
-- - Emergency disable takes the item down everywhere in one action, decides the case, keeps the
--   item six months (the purge leaves it) and logs every timestamp (criteria 3 and 4);
-- - the uploader gets a statement unless the order forbids it (criterion 5);
-- - policy on_call_rota_select_staff: staff allowed, a member denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

select vault.create_secret('test-notice-secret', 'public_notice_secret')
  where not exists (select 1 from vault.secrets where name = 'public_notice_secret');
select vault.update_secret(id, 'test-notice-secret') from vault.secrets where name = 'public_notice_secret';

-- A known state: the seed's rota is cleared, teacher has no open case, and the admin gets the
-- on-call permission next to the owner's (seed).
delete from public.on_call_rota;
create temp table cleared as select id from public.cases where user_id = (select teacher from ids);
delete from public.notifications where case_id in (select id from cleared);
delete from public.sanctions where case_id in (select id from cleared);
delete from public.moderated_items where case_id in (select id from cleared);
delete from public.case_actions where case_id in (select id from cleared);
delete from public.public_notices where case_id in (select id from cleared);
delete from public.on_call_alerts where case_id in (select id from cleared);
delete from public.reports where case_id in (select id from cleared);
delete from public.cases where id in (select id from cleared);
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values ((select admin from ids), 'on_call', (select owner from ids)) on conflict do nothing;

/* ---------- 1. The rota (criterion 2) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select public.admin_set_on_call_shift((select moderator from ids), now(), now() + interval '1 day', 'x') $$,
  '42501', null, 'a moderator can''t set the rota');
select pg_temp.sign_in_as((select owner from ids));
select throws_ok($$ select public.admin_set_on_call_shift((select support from ids), now(), now() + interval '1 day', 'Cover') $$,
  '23514', null, 'nobody without the on-call permission takes a shift');
select lives_ok($$ select public.admin_set_on_call_shift((select owner from ids), now() - interval '1 hour', now() + interval '1 day', 'This week') $$,
  'the owner puts themself on call');
select throws_ok($$ select public.admin_set_on_call_shift((select admin from ids), now() + interval '12 hours', now() + interval '2 days', 'Overlap') $$,
  '23P01', null, 'shifts never overlap: one person on call at a time');
select lives_ok($$ select public.admin_set_on_call_shift((select admin from ids), now() + interval '2 days', now() + interval '3 days', 'Next') $$,
  'the admin takes a later shift');
select is(jsonb_array_length(public.admin_on_call_rota() -> 'gaps'), 2,
  'the rota page shows the gaps nobody covers (between the shifts, and after them)');
select is(public.admin_on_call_rota() -> 'on_call_now' ->> 'handle', 'owner', 'and who is on call now');

select is((select count(*)::integer from public.on_call_rota), 2, 'allowed: on_call_rota_select_staff, the owner reads the rota');
select pg_temp.sign_in_as((select support from ids));
select is((select count(*)::integer from public.on_call_rota), 2, 'allowed: on_call_rota_select_staff, so does support');
select pg_temp.sign_in_as((select adult_writer from ids));
select is((select count(*)::integer from public.on_call_rota), 0, 'denied: on_call_rota_select_staff, a member reads none');
select throws_ok($$ select public.admin_on_call_rota() $$, '42501', null, 'nor the rota page');

/* ---------- 2. The alert (criteria 1 and 2) ---------- */

select lives_ok($$ select * from public.submit_public_notice(
    '{"kind": "removal_order", "contentUrl": "/u/teacher", "explanation": "Removal order under Regulation (EU) 2021/784.",
      "authorityName": "Test authority", "orderReference": "RO-1", "notifierEmail": "orders@authority.test", "language": "en"}',
    encode(extensions.hmac('{"kind": "removal_order", "contentUrl": "/u/teacher", "explanation": "Removal order under Regulation (EU) 2021/784.",
      "authorityName": "Test authority", "orderReference": "RO-1", "notifierEmail": "orders@authority.test", "language": "en"}',
      'test-notice-secret', 'sha256'), 'hex')) $$,
  'an authority sends a removal order through the form');
reset role;
create temp table order_case as select id from public.cases where user_id = (select teacher from ids) and source = 'authority_order';
grant select on order_case to authenticated;
select is((select on_call_user_id from public.on_call_alerts where case_id = (select id from order_case)), (select owner from ids),
  'the alert goes to whoever is on call');
select ok((select alerted_at is not null and escalated_at is null from public.on_call_alerts where case_id = (select id from order_case)),
  'at once, and isn''t escalated yet');
update public.on_call_alerts set created_at = now() - interval '16 minutes' where case_id = (select id from order_case);
select is(public.escalate_on_call_alerts(), 1, 'nobody acknowledged within 15 minutes: the rest of the team is alerted');
select ok((select escalated_at is not null from public.on_call_alerts where case_id = (select id from order_case)),
  'and the escalation is logged');

set local role authenticated;
select pg_temp.sign_in_as((select support from ids));
select throws_ok($$ select public.admin_acknowledge_on_call_alert((select id from public.on_call_alerts where case_id = (select id from order_case))) $$,
  '42501', null, 'only someone with the on-call permission acknowledges');

/* ---------- 3. Emergency disable (criteria 3 to 5) ---------- */

select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select public.admin_emergency_disable((select id from order_case), 'Order', 'Removed on an order.', true) $$,
  '42501', null, 'a moderator without the on-call permission can''t use Emergency disable');
select pg_temp.sign_in_as((select owner from ids));
select lives_ok($$ select public.admin_emergency_disable((select id from order_case), 'TCO order RO-1, valid.',
                    'Your profile was removed on a legal order from an authority.', true) $$,
  'the person on call uses Emergency disable');
reset role;
select is(public.is_moderated_away('profile', (select teacher from ids)), true,
  'the item is unavailable everywhere at once');
select ok((select disabled_at is not null and preserve_until > now() + interval '179 days' from public.cases where id = (select id from order_case)),
  'its time is recorded and it is preserved for six months');
select is(public.content_is_held_for_moderation('profile', (select teacher from ids)), true,
  'so no purge job deletes it');
select ok((select acknowledged_at is not null from public.on_call_alerts where case_id = (select id from order_case)),
  'acting on the order acknowledges its alert');
select ok((select after_values ? 'received_at' and after_values ? 'disabled_at' and after_values ? 'alerted_at'
           from public.audit_log where action = 'removal_order.disabled' and target_id = (select id from order_case)::text),
  'every timestamp is in the audit log as proof');
select is((select ground::text || ':' || ground_key from public.statements_of_reasons where case_id = (select id from order_case)),
  'law:authority_order', 'the uploader gets a statement resting on the order');
set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select is(public.admin_order_timeline((select id from order_case)) ->> 'uploader_told', 'true',
  'and the timeline says they were told');

/* ---------- 4. An order that forbids telling the uploader ---------- */

reset role;
insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
values ('TCO-9999', (select adult_writer from ids), 'story', '00000000-0000-4000-9000-000000000001', 'authority_order',
        'one_hour', now() + interval '1 hour');
set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select lives_ok($$ select public.admin_emergency_disable((select id from public.cases where reference = 'TCO-9999'),
                    'The order forbids telling the uploader.', null, false) $$,
  'Emergency disable without telling the uploader (TCO art. 11(3))');
reset role;
select is((select count(*)::integer from public.statements_of_reasons
           where case_id = (select id from public.cases where reference = 'TCO-9999')), 0,
  'sends no statement');
select is((select count(*)::integer from public.notifications
           where case_id = (select id from public.cases where reference = 'TCO-9999')), 0,
  'and no notification either');

select * from finish();
rollback;
