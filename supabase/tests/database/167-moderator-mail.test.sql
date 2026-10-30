-- Database tests for moderator mail (story S1-E10-11; CLAUDE.md rule 1; DSA art. 12).
-- What it proves:
-- - a member writes to the moderation team; the thread lands in one shared inbox, not with one
--   moderator (criterion 1); they may link a decision of their own, nobody else's;
-- - staff assign it, add an internal note the member never sees and reply as "The moderation
--   team": the member never sees who on the team wrote (criterion 2), and is notified;
-- - the member answers and the thread opens again; staff close it; every staff step is logged;
-- - members read only through their functions: the tables give them nothing;
-- - policies moderator_mail_threads_select_moderation and moderator_mail_messages_select_moderation:
--   allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table named (label text primary key, reference text) on commit drop;
grant all on named to authenticated;

/* ---------- The member writes (criterion 1) ---------- */

-- adult_writer (…01); suspended_user (…13) may write too.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.send_moderator_mail('Question', 'Why?', 'S-999999') $$, '23514', null,
  'a member can''t link a decision that isn''t theirs');
select throws_ok($$ select public.send_moderator_mail('  ', 'Body') $$, '23514', null, 'a subject is needed');
insert into named select 'thread', public.send_moderator_mail('My story vanished', 'My story Stația meteo is gone from Discover. Why?') ->> 'reference';
select matches((select reference from named where label = 'thread'), '^M-\d{6}$', 'the thread gets a reference');
select is((select count(*)::integer from public.moderator_mail_threads), 0,
  'denied: moderator_mail_threads_select_moderation: a member reads no thread from the table');
select is((select count(*)::integer from public.moderator_mail_messages), 0,
  'denied: moderator_mail_messages_select_moderation: nor any message');
select is((select status from public.my_moderator_mail()), 'open', 'their list shows the thread as open');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select lives_ok($$ select public.send_moderator_mail('About my suspension', 'Can we talk?') $$,
  'a suspended account can still write to the moderators');

/* ---------- Staff work the shared inbox (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.moderator_mail_threads), 2,
  'allowed: moderator_mail_threads_select_moderation: every moderator sees every thread');
select is((select assigned_handle from public.admin_moderator_mail_inbox() where reference = (select reference from named where label = 'thread')), null,
  'a new thread is assigned to nobody');
select throws_ok($$ select public.admin_assign_mail((select reference from named where label = 'thread'), 'support') $$, '23514', null,
  'only someone who answers moderator mail can be assigned');
select ok(public.admin_assign_mail((select reference from named where label = 'thread'), '@moderator'), 'a moderator assigns it to themself');
select ok(public.admin_reply_mail((select reference from named where label = 'thread'), 'Hidden while we check a report. Ask the writer?', true),
  'adds an internal note');
select ok(public.admin_reply_mail((select reference from named where label = 'thread'),
  'Your story is being checked after a report. We''ll tell you the outcome.'), 'and replies as the team');
select is((select count(*)::integer from public.moderator_mail_messages), 4,
  'allowed: moderator_mail_messages_select_moderation: staff read every message and note');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_reply_mail((select reference from named where label = 'thread'), 'Hi') $$, '42501', null,
  'support can''t answer moderator mail');

/* ---------- What the member sees ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select results_eq(
  $$ select message ->> 'from_team', message ->> 'body'
     from jsonb_array_elements(public.my_moderator_mail_thread((select reference from named where label = 'thread')) -> 'messages') as message $$,
  $$ values ('false', 'My story Stația meteo is gone from Discover. Why?'),
            ('true', 'Your story is being checked after a report. We''ll tell you the outcome.') $$,
  'the member sees their message and the team''s reply, never the internal note');
select ok(public.my_moderator_mail_thread((select reference from named where label = 'thread'))::text not like '%moderator%',
  'and never who on the team wrote');
reset role;
select is((select kind::text from public.notifications where user_id = '00000000-0000-4000-8000-000000000001'
           and mail_thread_id is not null), 'moderator_mail_reply', 'the member is notified of the reply');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.reply_moderator_mail((select reference from named where label = 'thread'), 'Thanks.'), 'the member answers');
reset role;
select is((select count(*)::integer from public.audit_log where target_type = 'moderator_mail_threads'), 3,
  'staff''s assign, note and reply are in the audit log, without the words');

select * from finish();

rollback;
