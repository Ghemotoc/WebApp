-- Database tests for the under-18 defaults (design books review, item S5).
-- What it proves:
-- - email_delivery_for(): a reply, Instant by default, is a Daily digest by default for a
--   17-year-old and stays Instant for an adult; a choice the teenager saved wins; a moderation
--   decision stays required;
-- - a new reply notification for a teenager queues no instant email, and a required one still
--   goes at once;
-- - instant_email_send_time(): under 18, an instant email made at 23:00 Romanian time waits for
--   07:00; one made at 15:00 goes at once; an adult's goes at once at any hour;
-- - writing_streak(): one rest day keeps the streak, two in a week end it, and a day without
--   words yet today doesn't break it; my_writing_month() shows that streak.
-- Personas: adult_writer (…01), teen_17 (…02). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- A moment at a Romanian wall-clock time today, as a timestamptz.
create function pg_temp.romanian(at_time time) returns timestamptz language sql as $$
  select ((public.romania_today() + at_time) at time zone 'Europe/Bucharest');
$$;

-- Both personas start from the defaults, with nothing waiting in the outbox.
delete from public.notification_email_settings
where user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
delete from public.email_outbox;

/* ---------- 1. Daily digest by default under 18 ---------- */

select is(public.email_delivery_for('00000000-0000-4000-8000-000000000002', 'comment_reply'), 'daily',
  'a reply to a 17-year-old is a daily digest by default');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000001', 'comment_reply'), 'instant',
  'a reply to an adult stays instant by default');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000002', 'moderation_decision'), 'required',
  'a moderation decision stays required for a 17-year-old');

insert into public.notifications (user_id, kind, actor_user_ids, actor_count)
values ('00000000-0000-4000-8000-000000000002', 'comment_reply', array['00000000-0000-4000-8000-000000000001'::uuid], 1);
select is((select count(*) from public.email_outbox where user_id = '00000000-0000-4000-8000-000000000002'),
  0::bigint, 'a reply to a 17-year-old queues no instant email');
insert into public.notifications (user_id, kind, is_required, decision)
values ('00000000-0000-4000-8000-000000000002', 'moderation_decision', true, 'remove');
select is((select delivery from public.email_outbox where user_id = '00000000-0000-4000-8000-000000000002'),
  'required', 'a moderation decision is still emailed to a 17-year-old at once');

insert into public.notification_email_settings (user_id, kind, delivery)
values ('00000000-0000-4000-8000-000000000002', 'comment_reply', 'instant');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000002', 'comment_reply'), 'instant',
  'a 17-year-old who picked instant gets instant');

/* ---------- 2. Quiet hours for instant emails under 18 ---------- */

select is(public.instant_email_send_time('00000000-0000-4000-8000-000000000002', pg_temp.romanian('23:00')),
  pg_temp.romanian('07:00') + interval '1 day',
  'an instant email to a 17-year-old at 23:00 waits for 07:00');
select is(public.instant_email_send_time('00000000-0000-4000-8000-000000000002', pg_temp.romanian('15:00')),
  pg_temp.romanian('15:00'), 'an instant email to a 17-year-old at 15:00 goes at once');
select is(public.instant_email_send_time('00000000-0000-4000-8000-000000000001', pg_temp.romanian('23:00')),
  pg_temp.romanian('23:00'), 'an instant email to an adult goes at once, even at night');

/* ---------- 3. A rest day keeps the writing streak ---------- */

delete from public.writing_days where user_id = '00000000-0000-4000-8000-000000000001';
-- Words yesterday and the four days before, except one rest day three days ago; none yet today.
insert into public.writing_days (user_id, day, words)
select '00000000-0000-4000-8000-000000000001', public.romania_today() - offset_days, 200
from unnest(array[1, 2, 4, 5]) as offset_days;
select is(public.writing_streak('00000000-0000-4000-8000-000000000001', public.romania_today()), 4,
  'one rest day keeps the streak, and today without words yet doesn''t break it');

-- A second rest day in the same week: six days ago is empty too, with words seven days ago.
insert into public.writing_days (user_id, day, words)
values ('00000000-0000-4000-8000-000000000001', public.romania_today() - 7, 200);
select is(public.writing_streak('00000000-0000-4000-8000-000000000001', public.romania_today()), 4,
  'a second rest day in the same week ends the streak');

-- Two days in a row without words end it too.
delete from public.writing_days
where user_id = '00000000-0000-4000-8000-000000000001' and day = public.romania_today() - 2;
select is(public.writing_streak('00000000-0000-4000-8000-000000000001', public.romania_today()), 1,
  'two days in a row without words end the streak');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.my_writing_month() ->> 'streak_days')::integer, 1,
  'the writing month shows the streak with its rest days');

select * from finish();
rollback;
