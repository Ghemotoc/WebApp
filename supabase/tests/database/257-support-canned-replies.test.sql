-- Database tests for support tickets, part 3b: canned replies (story S1-E11-13, part 13b; bundle
-- ADMIN-2h3b; criterion 8).
-- What it proves:
-- - support staff read the canned replies; a moderator and a member read none (both policy sides);
-- - starting replies ship with Romanian and English words and the two placeholders;
-- - support staff add, change and delete one, each in the audit log with before and after words;
-- - an empty or long field is refused, and so is a moderator;
-- - the staff ticket gives the person's display name for the greeting.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;

/* ---------- 1. Reading ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok((select count(*) from public.support_canned_replies) >= 3,
  'allowed: support_canned_replies_select_support_staff: support reads the canned replies');
select ok((select bool_and(body_ro like '%{{name}}%' and body_en like '%{{name}}%') from public.support_canned_replies),
  'the starting replies greet the person by {{name}} in both languages');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.support_canned_replies), 0,
  'denied: support_canned_replies_select_support_staff: a moderator reads none');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.support_canned_replies), 0,
  'denied: support_canned_replies_select_support_staff: a member reads none');

/* ---------- 2. Adding, changing and deleting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
create temporary table saved (id uuid) on commit drop;
grant all on saved to authenticated;
insert into saved
  select public.admin_save_canned_reply(null, '  Lost drafts  ', 'Bună, {{name}}!', 'Hi {{name}}!');
select is((select title from public.support_canned_replies where id = (select id from saved)), 'Lost drafts',
  'support adds a reply, with the spaces trimmed');

select public.admin_save_canned_reply((select id from saved), 'Lost drafts', 'Bună, {{name}}! Ciorne.', 'Hi {{name}}! Drafts.');
select is((select body_en from public.support_canned_replies where id = (select id from saved)), 'Hi {{name}}! Drafts.',
  'support changes it');

select throws_ok($$ select public.admin_save_canned_reply(null, '', 'x', 'y') $$, '23514', null,
  'an empty title is refused');
select throws_ok(format($$ select public.admin_save_canned_reply(null, 'Long', %L, 'y') $$, repeat('x', 4001)), '23514', null,
  'words longer than 4,000 characters are refused');
select throws_ok($$ select public.admin_save_canned_reply('00000000-0000-4000-8000-00000000abcd', 'T', 'x', 'y') $$, 'P0002', null,
  'changing a reply that doesn''t exist is refused');

select public.admin_delete_canned_reply((select id from saved));
select is((select count(*)::integer from public.support_canned_replies where id = (select id from saved)), 0,
  'support deletes it, and it leaves the list');

reset role;
-- One transaction gives every row the same time, so the actions are compared in name order.
select is((select array_agg(action order by action) from public.audit_log
           where target_type = 'support_canned_replies' and target_id = (select id::text from saved)),
  array['support_canned_reply.deleted', 'support_canned_reply.saved', 'support_canned_reply.saved'],
  'each change is in the audit log');
select is((select before_values ->> 'body_en' from public.audit_log
           where action = 'support_canned_reply.deleted' and target_id = (select id::text from saved)),
  'Hi {{name}}! Drafts.', 'the audit log keeps the deleted words');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_canned_reply(null, 'T', 'x', 'y') $$, '42501', null,
  'a moderator can''t add one');

/* ---------- 3. The name in the ticket ---------- */

reset role;
insert into public.support_tickets (number, requester_user_id, subject, channel, last_message_at)
  values (900101, '00000000-0000-4000-8000-000000000001', 'Name check', 'in_app', now());
-- The expected name is worked out before signing in, as the database itself sees it.
create temporary table expected_name on commit drop as
  select public.display_name(handle, pen_name) as name from public.profiles
  where id = '00000000-0000-4000-8000-000000000001';
grant select on expected_name to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(public.admin_support_ticket(900101) -> 'requester' ->> 'display_name',
  (select name from expected_name),
  'the staff ticket gives the person''s display name for the greeting');

select * from finish();
rollback;
