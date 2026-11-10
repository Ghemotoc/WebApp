-- Database tests for a forum's rules thread and a locked thread that points to the next one
-- (bundle GAPS-9; story S1-E8-05; architecture 1.8.1: the server decides, not the menu).
-- What it proves:
-- - a moderator makes a thread its forum's rules thread: it is pinned, and every other thread of
--   the forum answers it for the strip (number, title, a short line of its first post, whether it
--   is locked); a forum has one rules thread at a time; taking the mark away empties the strip;
-- - a moderator points a locked thread at another thread: readers get its number and title; an
--   open thread can't point on, a thread can't point at itself, and unlocking takes the pointer away;
-- - a reader who may not open the rules thread or the next thread never gets its title (here: a
--   reader who blocked its writer), and a thread number that isn't there reads the same as one
--   the caller may not open;
-- - only moderators can do either, a reason is required, and every change is logged in the same
--   transaction: the audit log in the main forums, the space's log in a space.
-- No new table or policy: the columns sit on forums and forum_threads, read only through the
-- forum functions.
-- Personas: adult_writer (…01, owns the seed's 16+ space), teacher (…07), moderator (…10),
-- blocker (…15). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement raises, 'ok' when it runs, or the SQLSTATE when it raises without a hint.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return coalesce(nullif(raised_hint, ''), sqlstate);
end;
$$;
-- Thread numbers the test names later, kept where every role can read them.
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns bigint language sql as $$
  select value::bigint from named where label = wanted;
$$;
-- A thread's heading as the caller sees it.
create function pg_temp.header(label text) returns jsonb language sql as $$
  select (public.forum_thread(pg_temp.named(label))) -> 'thread';
$$;
-- How many audit-log rows have an action and a reason (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text, wanted_reason text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log
  where audit_log.action = wanted and audit_log.reason = wanted_reason;
$$;
-- The newest action in the seed space's log, read past the policies.
create function pg_temp.last_space_log() returns text language sql security definer as $$
  select log.action from public.space_moderation_log as log
  where log.space_id = '00000000-0000-4000-a000-000000000a01' order by log.created_at desc, log.id desc limit 1;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The seed accounts are new, so the new-account post limit applies; this test posts more than it allows.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

-- Four threads in the main forums and one in the seed's space.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'rules', (public.start_forum_thread('first-chapters', 'Reguli zq', 'Cel mult **2.000** de cuvinte.')) ->> 'thread_number';
insert into named select 'space', (public.start_forum_thread('space-fantasy-writers-circle', 'Fir în cerc zq', 'Unu.')) ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'old', (public.start_forum_thread('first-chapters', 'Tema din septembrie zq', 'Doi.')) ->> 'thread_number';
insert into named select 'other', (public.start_forum_thread('first-chapters', 'Alt fir zq', 'Trei.')) ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'new', (public.start_forum_thread('first-chapters', 'Tema din octombrie zq', 'Patru.')) ->> 'thread_number';

/* ---------- 1. The rules thread ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_rules_thread(%s, true, 'Regulile') $$, pg_temp.named('rules'))),
  '42501', 'a member can''t make a thread the rules thread');
select is(pg_temp.header('old') -> 'rules', 'null'::jsonb, 'a forum with no rules thread shows no strip');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_rules_thread(%s, true, ' ') $$, pg_temp.named('rules'))),
  'reason:empty', 'a moderator must say why');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_rules_thread(%s, true, 'Regulile forumului') $$, pg_temp.named('rules'))),
  'ok', 'a moderator makes a thread the forum''s rules thread');
select is(pg_temp.audit_count('forum_thread.rules_set', 'Regulile forumului'), 1, 'and it is in the audit log');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.header('rules') - 'rules' @> '{"is_rules": true, "is_sticky": true}'::jsonb, true,
  'the rules thread is marked and pinned');
select is(pg_temp.header('rules') -> 'rules', 'null'::jsonb, 'the rules thread shows no strip about itself');
select is(pg_temp.header('old') -> 'rules',
  jsonb_build_object('number', pg_temp.named('rules'), 'title', 'Reguli zq', 'forum_slug', 'first-chapters',
                     'summary', 'Cel mult 2.000 de cuvinte.', 'is_locked', false),
  'every other thread of the forum answers the rules thread, with a plain line of its first post');
select is(pg_temp.header('space') -> 'rules', 'null'::jsonb, 'a thread in another forum shows no strip');
select pg_temp.sign_out();
select is(pg_temp.header('old') #>> '{rules,title}', 'Reguli zq', 'a visitor who isn''t logged in sees the strip too');

-- blocker blocks the rules thread's writer: they may not open that thread, so they get no strip.
reset role;
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.header('old') -> 'rules', 'null'::jsonb,
  'a reader who may not open the rules thread never gets its title');

-- One rules thread per forum.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_set_forum_rules_thread(pg_temp.named('other'), true, 'Reguli noi');
select is((pg_temp.header('rules') ->> 'is_rules')::boolean, false, 'a new rules thread replaces the earlier one');
select is(pg_temp.header('old') #>> '{rules,title}', 'Alt fir zq', 'and the strip names the new one');
select public.admin_set_forum_rules_thread(pg_temp.named('rules'), false, 'Nu e acesta');
select is(pg_temp.header('old') #>> '{rules,title}', 'Alt fir zq',
  'taking the mark off a thread that isn''t the rules thread leaves the forum''s rules alone');
select public.admin_set_forum_rules_thread(pg_temp.named('other'), false, 'Fără reguli');
select is(pg_temp.header('old') -> 'rules', 'null'::jsonb, 'taking the mark away empties the strip');
select is((pg_temp.header('other') ->> 'is_sticky')::boolean, true, 'while the thread stays pinned until a moderator unpins it');

/* ---------- 2. A locked thread points to the next one ---------- */

select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_next(%s, 'Continuă', %s) $$, pg_temp.named('old'), pg_temp.named('new'))),
  'thread:not_locked', 'an open thread can''t point on');
select public.admin_lock_forum_thread(pg_temp.named('old'), 'Tema s-a încheiat.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_next(%s, 'Continuă', %s) $$, pg_temp.named('old'), pg_temp.named('new'))),
  '42501', 'a member can''t point a thread on');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_next(%s, 'Continuă', 999999999) $$, pg_temp.named('old'))),
  'next:missing', 'the next thread must be there');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_next(%s, 'Continuă', %s) $$, pg_temp.named('old'), pg_temp.named('old'))),
  'next:same', 'a thread can''t point at itself');
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_next(%s, 'Continuă în octombrie', %s) $$, pg_temp.named('old'), pg_temp.named('new'))),
  'ok', 'a moderator points a locked thread at the next one');
select is(pg_temp.audit_count('forum_thread.next_set', 'Continuă în octombrie'), 1, 'and it is in the audit log');

select pg_temp.sign_out();
select is((pg_temp.header('old') #> '{lock,next}') - 'summary'::text,
  jsonb_build_object('number', pg_temp.named('new'), 'title', 'Tema din octombrie zq', 'forum_slug', 'first-chapters', 'is_locked', false),
  'everyone reading the locked thread gets where it carries on');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.header('old') #> '{lock,next}', 'null'::jsonb,
  'a reader who may not open the next thread never gets its title');
select is(pg_temp.header('old') #>> '{lock,reason}', 'Tema s-a încheiat.', 'while they still read why it was locked');

-- The permission check comes first, so a member learns nothing about the other thread.
select is(pg_temp.hint_of(format($$ select public.admin_set_forum_thread_next(%s, 'Continuă', %s) $$, pg_temp.named('old'), pg_temp.named('new'))),
  '42501', 'and a member who can''t open the next thread can''t point at it either');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_set_forum_thread_next(pg_temp.named('old'), 'Nu mai continuă');
select is(pg_temp.header('old') #> '{lock,next}', 'null'::jsonb, 'a moderator takes the pointer away');
select public.admin_set_forum_thread_next(pg_temp.named('old'), 'Continuă totuși', pg_temp.named('new'));
select public.admin_unlock_forum_thread(pg_temp.named('old'), 'Redeschis');
reset role;
select is((select continues_in_thread_id from public.forum_threads where thread_number = pg_temp.named('old')), null,
  'unlocking takes the pointer away with the lock');
select throws_ok(format($$ update public.forum_threads set continues_in_thread_id = (select id from public.forum_threads where thread_number = %s)
  where thread_number = %s $$, pg_temp.named('new'), pg_temp.named('old')), '23514', null,
  'the table itself refuses a pointer on an open thread');

/* ---------- 3. In a space, and the internal helper ---------- */

-- The space's owner has the posts power there: the change goes in the space's log.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.admin_set_forum_rules_thread(pg_temp.named('space'), true, 'Regulile cercului');
select is(pg_temp.last_space_log(), 'thread_rules_set', 'in a space, the space''s log records the rules thread');
select is(pg_temp.hint_of($$ select public.forum_thread_pointer_json(gen_random_uuid()) $$), '42501',
  'a member can''t call the internal pointer helper');

select * from finish();
rollback;
