-- Database tests for notification emails and digests (story S1-E7-02).
-- What it proves:
-- - each of the three new tables shows a person their own rows and nobody else's (allowed and
--   denied for every policy);
-- - the defaults, and that a choice can be changed but a moderation decision can't be switched off;
-- - "Instant" queues one email per notification, "Daily digest" one email a day for all of them,
--   and a moderation decision is always queued (criterion 1);
-- - the worker needs the Vault key, gets the address only there, never a user ID, and nothing the
--   person wouldn't see on their Notifications page (a block);
-- - the one-click unsubscribe turns every optional email off, signed out included (criterion 2);
-- - marketing email is refused to anyone under 18 (criterion 3; Q50);
-- - sent rows are purged after 30 days.
-- Test data: notifications for adult_writer (…01) from seeded personas; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
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
-- A persona's ID from its number.
create function pg_temp.persona(persona_number integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-' || lpad(persona_number::text, 12, '0'))::uuid;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The local worker key, from the Vault as seeded, and adult_writer's address to compare with.
create temporary table worker (worker_key text, writer_email text) on commit drop;
insert into worker
select decrypted_secret, (select email from auth.users where id = '00000000-0000-4000-8000-000000000001')
from vault.decrypted_secrets where name = 'email_worker_key';
grant select on worker to anon, authenticated;

/* ---------- Defaults and choices ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  public.my_notification_email_settings(),
  '[{"kind": "comment_reply", "delivery": "instant"}, {"kind": "new_chapter", "delivery": "daily"},
    {"kind": "comment_on_chapter", "delivery": "daily"}, {"kind": "new_follower", "delivery": "daily"}]'::jsonb,
  'replies are emailed at once and the rest in the daily digest until the person chooses');

select public.set_notification_email('new_chapter', 'instant');
select is(
  (select delivery::text from public.notification_email_settings where kind = 'new_chapter'),
  'instant',
  'allowed: notification_email_settings_select_own: a person reads their own email choice');

select is(
  pg_temp.refusal($$ select public.set_notification_email('moderation_decision', 'off') $$),
  '22023',
  'account, safety and legal emails can''t be switched off');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(
  (select count(*) from public.notification_email_settings),
  0::bigint,
  'denied: notification_email_settings_select_own: nobody else sees a person''s email choices');

select pg_temp.sign_out();
select is(
  pg_temp.refusal($$ select public.my_notification_email_settings() $$),
  '42501',
  'signed out, there are no email choices to read');

/* ---------- Filling the outbox ---------- */

select pg_temp.as_postgres();
-- adult_writer goes back to the defaults for the rest of the test, and the seeded notifications
-- and their emails are put aside so the counts below are this test's own.
delete from public.notification_email_settings where user_id = pg_temp.persona(1);
update public.notifications set read_at = now() where read_at is null;
delete from public.email_outbox;

-- A reply (instant), two new followers (daily) and a moderation decision (required).
insert into public.notifications (user_id, kind, actor_user_ids, actor_count)
values (pg_temp.persona(1), 'comment_reply', array[pg_temp.persona(2)], 1),
       (pg_temp.persona(1), 'new_follower', array[pg_temp.persona(3)], 1),
       (pg_temp.persona(1), 'new_follower', array[pg_temp.persona(7)], 1),
       (pg_temp.persona(1), 'comment_reactions', array[pg_temp.persona(7)], 1);
select is(
  (select array_agg(delivery order by delivery) from public.email_outbox where user_id = pg_temp.persona(1)),
  array['instant'],
  'an instant kind queues its own email; daily kinds and reactions don''t');

select is(public.queue_daily_digests(), 1, 'the daily job queues one digest per person');
select is(
  (select cardinality(notification_ids) from public.email_outbox
   where user_id = pg_temp.persona(1) and delivery = 'daily'),
  2,
  'the digest carries both new followers and leaves the reactions out');
select is(public.queue_daily_digests(), 0, 'a notification already in an email isn''t sent again');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select count(*) from public.email_outbox),
  2::bigint,
  'allowed: email_outbox_select_own: a person sees their own queued emails');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(
  (select count(*) from public.email_outbox),
  0::bigint,
  'denied: email_outbox_select_own: nobody else sees a person''s queued emails');

/* ---------- The worker ---------- */

select pg_temp.sign_out();
select is(
  pg_temp.refusal($$ select public.email_worker_claim('wrong-key', 10) $$),
  '42501',
  'the worker is refused without the Vault key');

-- adult_writer blocks one of the two new followers before the digest leaves.
select pg_temp.as_postgres();
insert into public.blocks (user_id, blocked_user_id) values (pg_temp.persona(1), pg_temp.persona(3));
select pg_temp.sign_out();

create temporary table claimed (batch jsonb) on commit drop;
grant all on claimed to anon, authenticated;
insert into claimed select public.email_worker_claim((select worker_key from worker), 10);
select is(jsonb_array_length((select batch from claimed)), 2, 'the worker gets both due emails');
select is(
  (select batch -> 0 ->> 'to' from claimed),
  (select writer_email from worker),
  'the address is handed only to the worker, through the key');
select ok(
  (select batch::text from claimed) not like '%00000000-0000-4000-8000-0000000000%',
  'no user ID is in what the worker gets');
select ok(
  (select bool_and(length(item ->> 'unsubscribe_key') = 48) from claimed, jsonb_array_elements(batch) as item),
  'every optional email carries the person''s 48-character unsubscribe key');
select is(
  (select jsonb_array_length(item -> 'items') from claimed, jsonb_array_elements(batch) as item
   where item ->> 'delivery' = 'daily'),
  1,
  'someone the person blocked is left out of the email, as on the Notifications page');
select is(
  jsonb_array_length(public.email_worker_claim((select worker_key from worker), 10)),
  0,
  'a claimed email isn''t handed out twice');
select is(
  public.email_worker_mark_sent((select worker_key from worker),
    (select array_agg((item ->> 'outbox_id')::uuid) from claimed, jsonb_array_elements(batch) as item)),
  2,
  'the worker marks what it sent');

/* ---------- One-click unsubscribe ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select count(*) from public.email_unsubscribe_keys),
  1::bigint,
  'allowed: email_unsubscribe_keys_select_own: a person reads their own unsubscribe key');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(
  (select count(*) from public.email_unsubscribe_keys),
  0::bigint,
  'denied: email_unsubscribe_keys_select_own: nobody else reads a person''s unsubscribe key');

select pg_temp.as_postgres();
-- One more reply waits when the person unsubscribes.
insert into public.notifications (user_id, kind, actor_user_ids, actor_count)
values (pg_temp.persona(1), 'comment_reply', array[pg_temp.persona(2)], 1);

select pg_temp.sign_out();
select is(public.unsubscribe_from_emails('not-a-key'), false, 'an unknown key changes nothing');
select is(
  public.unsubscribe_from_emails((select item ->> 'unsubscribe_key' from claimed, jsonb_array_elements(batch) as item limit 1)),
  true,
  'the link works signed out');

select pg_temp.as_postgres();
select is(
  (select count(*) from public.email_outbox where user_id = pg_temp.persona(1) and sent_at is null),
  0::bigint,
  'after unsubscribing every optional email is off, the waiting one included');
insert into public.notifications (user_id, kind, is_required, decision)
values (pg_temp.persona(1), 'moderation_decision', true, 'remove');
select is(
  (select delivery from public.email_outbox where user_id = pg_temp.persona(1) and sent_at is null),
  'required',
  'a moderation decision is still emailed after unsubscribing');

/* ---------- Marketing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(
  pg_temp.refusal($$ select public.set_marketing_email_opt_in(true) $$),
  '23514',
  'someone under 18 can''t opt in to marketing email');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_marketing_email_opt_in(true);
select pg_temp.as_postgres();
select is(
  public.marketing_email_allowed(pg_temp.persona(1)) and not public.marketing_email_allowed(pg_temp.persona(2)),
  true,
  'marketing email may reach an adult who opted in, never a 17-year-old');

/* ---------- Retention ---------- */

update public.email_outbox set sent_at = now() - interval '31 days' where user_id = pg_temp.persona(1) and sent_at is not null;
select ok(public.purge_sent_emails() >= 2, 'sent emails are deleted after 30 days');

select * from finish();
rollback;
