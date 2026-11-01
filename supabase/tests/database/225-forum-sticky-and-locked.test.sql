-- Database tests for sticky and locked threads and "Don't bump" (bundle FORUMS-1, part e; story
-- S1-E8-05; architecture 1.8.1: the server decides, not the menu).
-- What it proves:
-- - a moderator makes a thread sticky: it sits above the others on the forum's first page, and
--   only there; removing sticky puts it back in order of latest activity (criterion 1);
-- - a moderator locks a thread with a reason: everyone still reads it and sees the reason, nobody
--   can reply, and the thread never names who locked it; unlocking opens it again (criterion 2);
-- - "Don't bump" adds the reply but leaves the thread's place in the list, while "Latest post"
--   still moves (criterion 3);
-- - only moderation staff can pin or lock, a reason is required, and every change is in the audit
--   log in the same transaction.
-- No new table or policy: the columns sit on forum_threads, read only through the forum functions.
-- Personas: adult_writer (…01), teacher (…07), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint a statement raises, or null when it runs.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;

-- Thread numbers the test names later, kept where every role can read them.
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns text language sql as $$
  select value from named where label = wanted;
$$;
-- The titles of the forum's first page, in order, keeping only this test's threads.
create function pg_temp.first_page() returns jsonb language sql as $$
  select coalesce(jsonb_agg(thread ->> 'title' order by position), '[]'::jsonb)
  from jsonb_array_elements((public.forum_thread_list('first-chapters')) -> 'threads') with ordinality as listed(thread, position)
  where thread ->> 'title' like 'Fir %';
$$;
-- A thread's heading as the caller sees it.
create function pg_temp.header(label text) returns jsonb language sql as $$
  select (public.forum_thread(pg_temp.named(label)::bigint)) -> 'thread';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The seed accounts are new, so the new-account post limit applies; this test posts more than it allows.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

/* ---------- 1. Three threads, oldest activity last ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'old', (public.start_forum_thread('first-chapters', 'Fir vechi', 'Unu.')) ->> 'thread_number';
insert into named select 'middle', (public.start_forum_thread('first-chapters', 'Fir mijlociu', 'Doi.')) ->> 'thread_number';
insert into named select 'new', (public.start_forum_thread('first-chapters', 'Fir nou', 'Trei.')) ->> 'thread_number';
-- Everything in one transaction happens at the same now(), so the test spreads the times out by hand.
reset role;
update public.forum_threads set bumped_at = now() - interval '3 days', last_post_at = now() - interval '3 days' where title = 'Fir vechi';
update public.forum_threads set bumped_at = now() - interval '2 days', last_post_at = now() - interval '2 days' where title = 'Fir mijlociu';
update public.forum_threads set bumped_at = now() - interval '1 day', last_post_at = now() - interval '1 day' where title = 'Fir nou';
select is(pg_temp.first_page(), '["Fir nou", "Fir mijlociu", "Fir vechi"]'::jsonb,
  'threads are listed by latest activity');

/* ---------- 2. Sticky (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(format($$ select public.admin_set_forum_thread_sticky(%s, true, 'Regulile') $$, pg_temp.named('old')),
  '42501', null, 'a member can''t make a thread sticky');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_sticky(%s, true, '  ') $$, pg_temp.named('old'))),
  'reason:empty', 'a moderator must say why');
select lives_ok(format($$ select public.admin_set_forum_thread_sticky(%s, true, 'Regulile forumului') $$, pg_temp.named('old')),
  'a moderator makes a thread sticky');
select is(pg_temp.first_page(), '["Fir vechi", "Fir nou", "Fir mijlociu"]'::jsonb,
  'the sticky thread sits above the others, whatever its activity');
select is((select (thread ->> 'is_sticky')::boolean from jsonb_array_elements((public.forum_thread_list('first-chapters')) -> 'threads') as thread
  where thread ->> 'title' = 'Fir vechi'), true, 'and the list marks it as pinned');
select is((select count(*)::integer from jsonb_array_elements((public.forum_thread_list('first-chapters', now() - interval '12 hours')) -> 'threads') as thread
  where thread ->> 'title' = 'Fir vechi'), 0, 'a later page never shows the sticky thread again');
reset role;
select is((select count(*)::integer from public.audit_log where action = 'forum_thread.made_sticky' and reason = 'Regulile forumului'
  and user_id = '00000000-0000-4000-8000-000000000010'), 1, 'making it sticky is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_set_forum_thread_sticky(pg_temp.named('old')::bigint, false, 'Nu mai e nevoie');
select is(pg_temp.first_page(), '["Fir nou", "Fir mijlociu", "Fir vechi"]'::jsonb,
  'removing sticky puts it back in order of latest activity');

/* ---------- 3. Locked (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok(format($$ select public.admin_lock_forum_thread(%s, 'Gata') $$, pg_temp.named('middle')),
  '42501', null, 'a member can''t lock a thread');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_lock_forum_thread(pg_temp.named('middle')::bigint, 'Discuția s-a încheiat.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.header('middle') #>> '{lock,reason}', 'Discuția s-a încheiat.', 'everyone still reads a locked thread and its reason');
select is(pg_temp.header('middle') -> 'lock' ? 'locked_by', false, 'the thread never says who locked it');
select is((pg_temp.header('middle') ->> 'can_reply')::boolean, false, 'nobody is offered the reply box');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Încă ceva.') $$, pg_temp.named('middle'))),
  'thread:locked', 'and the server refuses a reply');
select is((pg_temp.header('middle') ->> 'can_moderate')::boolean, false, 'a member gets no moderator tools');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((pg_temp.header('middle') ->> 'can_moderate')::boolean, true, 'a moderator gets the moderator tools');
select public.admin_unlock_forum_thread(pg_temp.named('middle')::bigint, 'Redeschis');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.reply_to_forum_thread(pg_temp.named('middle')::bigint, 'Din nou deschis.')) ->> 'post_number', '2',
  'an unlocked thread takes replies again');
reset role;
select is((select array_agg(action order by action) from public.audit_log where action in ('forum_thread.locked', 'forum_thread.unlocked')),
  array['forum_thread.locked', 'forum_thread.unlocked'], 'locking and unlocking are in the audit log');

/* ---------- 4. Don't bump (criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.named('old')::bigint, 'Fără să-l urc.', '{}', false);
-- The reply to the unlocked thread bumped it to the top; the reply without a bump stays at the bottom.
select is(pg_temp.first_page(), '["Fir mijlociu", "Fir nou", "Fir vechi"]'::jsonb,
  '"Don''t bump" leaves the thread where it was in the list');
select is((pg_temp.header('old') ->> 'last_post_at')::timestamptz, now(),
  'while "Latest post" still says when the newest post was written');

select * from finish();
rollback;
