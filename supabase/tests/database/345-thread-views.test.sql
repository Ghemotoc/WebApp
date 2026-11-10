-- Database tests for a forum thread's view total (bundle GAPS-16, part d; story S1-E8-02;
-- board 5.2, "Views").
-- What it proves:
-- - a visitor and a member each add one to the total; the thread's starter doesn't;
-- - a thread that isn't there, or that the caller may not open, isn't counted;
-- - the thread page shows the total to everyone, and nothing in the table says who opened it;
-- - forum_thread_views_select_moderation: a moderator reads the totals, a member reads none.
-- Personas: adult_writer (…01), teacher (…07), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.thread() returns bigint language sql as $$
  select value::bigint from named where label = 'thread';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'thread',
  (public.start_forum_thread('first-chapters', 'Câți au citit?', 'Prima postare.')) ->> 'thread_number';

/* ---------- 1. Counting ---------- */

select is(public.record_forum_thread_view(pg_temp.thread()), false, 'the starter''s own visit isn''t counted');
select pg_temp.sign_out();
select is(public.record_forum_thread_view(pg_temp.thread()), true, 'a visitor''s visit counts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.record_forum_thread_view(pg_temp.thread()), true, 'a member''s visit counts');
select is((public.forum_thread(pg_temp.thread()) #>> '{thread,view_count}')::integer, 2,
  'the thread page shows the total');
select is(public.record_forum_thread_view(-1), false, 'a thread that isn''t there isn''t counted');
select is((select count(*)::integer from public.forum_thread_views), 0,
  'denied: forum_thread_views_select_moderation, a member reads no total directly');

select pg_temp.sign_out();
select is((public.forum_thread(pg_temp.thread()) #>> '{thread,view_count}')::integer, 2,
  'a visitor sees the same total');

/* ---------- 2. What is kept ---------- */

reset role;
select is(
  (select array_agg(column_name::text order by column_name) from information_schema.columns
   where table_schema = 'public' and table_name = 'forum_thread_views'),
  array['thread_id', 'total', 'updated_at'],
  'the table keeps the thread and a total, never who opened it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select total::integer from public.forum_thread_views), 2,
  'allowed: forum_thread_views_select_moderation, a moderator reads the total');

/* ---------- 3. A thread the caller may not open ---------- */

reset role;
update public.forum_threads set deleted_at = now() where thread_number = pg_temp.thread();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.record_forum_thread_view(pg_temp.thread()), false, 'a deleted thread isn''t counted');
reset role;
select is((select total::integer from public.forum_thread_views), 2, 'and its total stays as it was');

select * from finish();
rollback;
