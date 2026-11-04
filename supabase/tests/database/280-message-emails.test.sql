-- Database tests for message emails with quiet hours (bundle IDEAS-2, part c1; idea
-- IDEA-20261101-6; Q50).
-- What it proves:
-- - the defaults: emails on for everyone; quiet hours off for an adult (22:00 to 07:00 offered)
--   and on for someone under 18, 21:00 to 07:00, which they must keep;
-- - a message queues one email per chat, held at least 5 minutes, however many messages arrive;
--   inside the recipient's quiet hours it waits for their end (criterion 1: 23:00 waits to 07:00);
-- - the worker leaves a held email alone; once due it sends one line naming the sender, never the
--   words; a chat read in the meantime closes it without sending;
-- - an under-18 can move quiet hours but not end them or shorten them past 22:00 to 07:00
--   (criterion 2); an adult can turn emails off, and then nothing is queued;
-- - the one-click unsubscribe turns message emails off too.
-- Personas: adult_writer (…01) and teacher (…07), who share the seeded chat, and teen_17 (…02).
-- Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- adult_writer's waiting message emails.
create function pg_temp.waiting_for_writer() returns bigint language sql as $$
  select count(*) from public.email_outbox
  where user_id = '00000000-0000-4000-8000-000000000001' and delivery = 'message' and sent_at is null;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The local worker key, as seeded.
create temporary table worker (worker_key text) on commit drop;
insert into worker select decrypted_secret from vault.decrypted_secrets where name = 'email_worker_key';
-- Start clean: no message emails waiting, and the three people on their defaults.
delete from public.email_outbox where delivery = 'message';
update public.profiles set message_emails_on = null, message_quiet_hours_on = null,
  message_quiet_from = null, message_quiet_until = null
  where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
               '00000000-0000-4000-8000-000000000007');

/* ---------- 1. Defaults ---------- */

select pg_temp.sign_in('01');
select is(public.my_message_settings() -> 'email',
  '{"emails_on": true, "quiet_hours_on": false, "quiet_from": "22:00", "quiet_until": "07:00",
    "must_keep_quiet_hours": false}'::jsonb,
  'an adult gets message emails, with quiet hours off until they choose');
select pg_temp.sign_in('02');
select is(public.my_message_settings() -> 'email',
  '{"emails_on": true, "quiet_hours_on": true, "quiet_from": "21:00", "quiet_until": "07:00",
    "must_keep_quiet_hours": true}'::jsonb,
  'someone under 18 starts with quiet hours on, 21:00 to 07:00 (criterion 2)');

/* ---------- 2. Queueing ---------- */

select pg_temp.sign_in('07');
select public.send_message('adult_writer', 'Did you get my notes on chapter 2?');
select pg_temp.as_owner();
select is(pg_temp.waiting_for_writer(), 1::bigint, 'a message queues one email to the other person');
select ok((select send_after >= now() + interval '5 minutes' from public.email_outbox
           where user_id = '00000000-0000-4000-8000-000000000001' and delivery = 'message' and sent_at is null),
  'the email waits at least 5 minutes, so someone chatting in the app gets none');
select pg_temp.sign_in('07');
select public.send_message('adult_writer', 'And the map?');
select pg_temp.as_owner();
select is(pg_temp.waiting_for_writer(), 1::bigint, 'more messages in the same chat add no second email');

/* ---------- 3. Sending ---------- */

select is(
  (select count(*) from jsonb_array_elements(public.email_worker_claim((select worker_key from worker), 100)) as claimed
   where claimed ->> 'delivery' = 'message'),
  0::bigint,
  'the worker leaves a held email alone');

update public.email_outbox set send_after = now() - interval '1 minute'
  where user_id = '00000000-0000-4000-8000-000000000001' and delivery = 'message' and sent_at is null;
create temporary table claimed on commit drop as
  select claimed from jsonb_array_elements(public.email_worker_claim((select worker_key from worker), 100)) as claimed
  where claimed ->> 'delivery' = 'message';
select is((select claimed -> 'items' -> 0 ->> 'kind' from claimed), 'new_message',
  'once due, the worker sends it as a message email');
select is((select claimed -> 'items' -> 0 -> 'actors' -> 0 ->> 'handle' from claimed), 'teacher',
  'the email names who wrote');
select is((select (claimed -> 'items' -> 0 ->> 'actor_count')::integer from claimed), 2,
  'it counts the unread messages from them');
select ok((select claimed::text not like '%chapter 2%' and claimed::text not like '%map%' from claimed),
  'the email never carries the words of a message (CLAUDE.md rule 12)');

-- That one left; a new message, read before it is due, is closed without sending.
select public.email_worker_mark_sent((select worker_key from worker),
  array(select (claimed ->> 'outbox_id')::uuid from claimed));
select pg_temp.sign_in('07');
select public.send_message('adult_writer', 'One more thing.');
select pg_temp.sign_in('01');
select public.mark_conversation_read('teacher');
select pg_temp.as_owner();
update public.email_outbox set send_after = now() - interval '1 minute'
  where user_id = '00000000-0000-4000-8000-000000000001' and delivery = 'message' and sent_at is null
    and claimed_at is null;
select is(
  (select count(*) from jsonb_array_elements(public.email_worker_claim((select worker_key from worker), 100)) as claimed
   where claimed ->> 'delivery' = 'message'),
  0::bigint,
  'a chat read in the meantime sends no email');
select is(pg_temp.waiting_for_writer(), 0::bigint, 'and that email is closed');

/* ---------- 4. Quiet hours ---------- */

select is(public.quiet_hours_end_after('2026-11-04 23:00', '22:00', '07:00'), '2026-11-05 07:00'::timestamp,
  'a message at 23:00 in quiet hours of 22:00 to 07:00 waits until 07:00 (criterion 1)');
select is(public.quiet_hours_end_after('2026-11-04 15:00', '22:00', '07:00'), null,
  'outside quiet hours nothing waits');
select is(
  public.message_email_send_time('00000000-0000-4000-8000-000000000002', '2026-11-04 23:00 Europe/Bucharest'),
  '2026-11-05 07:00 Europe/Bucharest'::timestamptz,
  'a teen''s email at 23:00 Romanian time goes at 07:00');

/* ---------- 5. Choices ---------- */

select pg_temp.sign_in('02');
select is(pg_temp.refusal($$ select public.set_message_emails(true, false, '21:00', '07:00') $$), '23514',
  'someone under 18 can''t turn quiet hours off (Q50)');
select is(pg_temp.refusal($$ select public.set_message_emails(true, true, '23:00', '06:00') $$), '23514',
  'nor make them shorter than 22:00 to 07:00');
select is(public.set_message_emails(true, true, '21:30', '07:30') ->> 'quiet_from', '21:30',
  'but can move them');

select pg_temp.sign_in('01');
select public.set_message_emails(false, false, '22:00', '07:00');
select pg_temp.sign_in('07');
select public.send_message('adult_writer', 'Last one, promise.');
select pg_temp.as_owner();
select is(
  (select count(*) from public.email_outbox
   where user_id = '00000000-0000-4000-8000-000000000001' and delivery = 'message' and claimed_at is null
     and sent_at is null),
  0::bigint,
  'with message emails off, a new message queues nothing');

-- The one-click unsubscribe turns them off too (teacher, still on the default).
select public.unsubscribe_from_emails(public.email_worker_unsubscribe_key('00000000-0000-4000-8000-000000000007'));
select is((select message_emails_on from public.profiles where id = '00000000-0000-4000-8000-000000000007'), false,
  'the one-click unsubscribe turns message emails off too');

select * from finish();
rollback;
