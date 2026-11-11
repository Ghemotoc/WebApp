-- Database tests for following a forum thread (bundle GAPS-16, part a; story S1-E8-02; board 5.2).
-- What it proves:
-- - starting a thread follows it for its starter, and the thread page says so;
-- - a member follows a thread, following twice changes nothing, unfollowing stops it; a visitor
--   can't follow, and a thread that isn't there is refused with one answer;
-- - forum_thread_follows_select_own: a member reads their own follows, another member and staff
--   read none;
-- - a reply reaches every follower but its writer, as one forum_reply row per thread that grows
--   with each new person; never across a block; an unfollowed member hears nothing more;
-- - the row names the thread, and it leaves the list once the thread is deleted;
-- - the follows are in Download my data and go with the account.
-- Personas: adult_writer (…01), pending_check (…05, active while adults_only is on), teacher (…07),
-- admin (…09). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The SQLSTATE and hint a statement raises, or 'ok' when it runs.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return sqlstate || coalesce(' ' || nullif(raised_hint, ''), '');
end;
$$;
-- A persona's forum_reply row for the test thread, read as the table's owner.
create function pg_temp.reply_row(persona_id text) returns public.notifications
language sql security definer as $$
  select * from public.notifications
  where notifications.user_id = persona_id::uuid and notifications.kind = 'forum_reply'
  order by created_at desc limit 1;
$$;
create function pg_temp.reply_rows(persona_id text) returns integer language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = persona_id::uuid and notifications.kind = 'forum_reply';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.thread() returns bigint language sql as $$
  select value::bigint from named where label = 'thread';
$$;
-- The caller's forum_reply row as their notification list shows it, or null.
create function pg_temp.listed_reply() returns jsonb language sql as $$
  select item from jsonb_array_elements(public.my_notifications() -> 'notifications') as item
  where item ->> 'kind' = 'forum_reply' limit 1;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Starting and following ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'thread',
  (public.start_forum_thread('first-chapters', 'Cine urmărește?', 'Prima postare.')) ->> 'thread_number';
select is((public.forum_thread(pg_temp.thread()) #>> '{thread,is_following}')::boolean, true,
  'starting a thread follows it, and the thread page says so');
select is((select count(*)::integer from public.forum_thread_follows), 1,
  'allowed: forum_thread_follows_select_own: the starter reads their one follow');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.forum_thread(pg_temp.thread()) #>> '{thread,is_following}')::boolean, false,
  'another member doesn''t follow it yet');
select is((select count(*)::integer from public.forum_thread_follows), 0,
  'denied: forum_thread_follows_select_own: another member reads nobody else''s follows');
select is(public.follow_forum_thread(pg_temp.thread(), true), true, 'a member follows the thread');
select is(public.follow_forum_thread(pg_temp.thread(), true), true, 'following twice is fine');
select is((select count(*)::integer from public.forum_thread_follows), 1, 'and still makes one follow');
select is(pg_temp.refusal('select public.follow_forum_thread(999999999, true)'), 'P0002 thread:missing',
  'a thread that isn''t there is refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.forum_thread_follows), 0,
  'denied: forum_thread_follows_select_own: nor does an admin');

select pg_temp.sign_out();
select is(pg_temp.refusal(format('select public.follow_forum_thread(%s, true)', pg_temp.thread())), '42501',
  'a visitor can''t follow');
select is(public.forum_thread(pg_temp.thread()) #>> '{thread,is_following}', 'false',
  'and the thread page says they don''t');

/* ---------- 2. Replies reach the followers ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.reply_to_forum_thread(pg_temp.thread(), 'Eu urmăresc.');
select is(pg_temp.reply_rows('00000000-0000-4000-8000-000000000007') || '|'
          || pg_temp.reply_rows('00000000-0000-4000-8000-000000000001'), '1|0',
  'a reply reaches the starter, never its own writer');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.reply_to_forum_thread(pg_temp.thread(), 'Și eu am ceva de spus.');
select is((pg_temp.reply_row('00000000-0000-4000-8000-000000000007')).actor_count || '|'
          || pg_temp.reply_rows('00000000-0000-4000-8000-000000000007'), '2|1',
  'a second person''s reply joins the same row');
select is(pg_temp.reply_rows('00000000-0000-4000-8000-000000000001'), 1,
  'and reaches the other follower too');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.listed_reply() #>> '{forum_thread,title}', 'Cine urmărește?',
  'the row names the thread');
select is((pg_temp.listed_reply() #>> '{forum_thread,number}')::bigint, pg_temp.thread(),
  'and its number, for the link');

-- Unfollowing: the writer hears nothing more.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.follow_forum_thread(pg_temp.thread(), false), false, 'a member unfollows the thread');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.thread(), 'Mulțumesc amândurora.');
select is((pg_temp.reply_row('00000000-0000-4000-8000-000000000001')).actor_count, 1,
  'an unfollowed member hears nothing more');

-- Blocks: the writer follows again and blocks pending_check, whose next reply doesn't reach them.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.follow_forum_thread(pg_temp.thread(), true);
reset role;
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005');
update public.notifications set read_at = now() where user_id = '00000000-0000-4000-8000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.reply_to_forum_thread(pg_temp.thread(), 'Încă o dată.');
select is((pg_temp.reply_row('00000000-0000-4000-8000-000000000001')).read_at is not null, true,
  'never across a block: the row isn''t woken');
reset role;
delete from public.blocks where user_id = '00000000-0000-4000-8000-000000000001';

-- A deleted thread takes the row out of the list.
update public.forum_threads set deleted_at = now() where thread_number = pg_temp.thread();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.listed_reply(), null, 'once the thread is deleted, the row leaves the list');

/* ---------- 3. Download my data and account deletion ---------- */

reset role;
select is((select is_included::text from public.data_export_tables() where table_name = 'forum_thread_follows')
    || '|' || (select action from public.account_deletion_rules() where table_name = 'forum_thread_follows'),
  'true|delete', 'the follows are in Download my data and go with the account');

select * from finish();
rollback;
