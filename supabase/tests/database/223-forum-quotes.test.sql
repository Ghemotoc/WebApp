-- Database tests for forum quotes (bundle FORUMS-1, part c; story S1-E8-03; CLAUDE.md rule 6).
-- What it proves:
-- - "Quote" stores one quoted post; the reply draws it with its number, author and words
--   (criterion 1);
-- - "Add to quotes" stores several, always in thread order whatever order they were picked in,
--   and drops repeats (criterion 2);
-- - a reply can't quote a post of another thread, a deleted post, or past the limit;
-- - a quote follows the quoted post: deleted or removed by staff, it becomes a marker in every
--   reply, so removed words never live on inside a quote; a reader who blocks the quoted author
--   sees "unavailable", never the words or the name;
-- - a reply without quotes still works as in part b (the quick reply box, criterion 3).
-- No new table or policy: quotes are a column of forum_posts, read only through forum_thread().
-- Personas: adult_writer (…01), teacher (…07), moderator (…10), blocker (…15). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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
grant execute on all functions in schema pg_temp to anon, authenticated;

-- IDs and numbers the test names later, kept where every role can read them.
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns text language sql as $$
  select value from named where label = wanted;
$$;
-- One post of the test's thread as the caller sees it, by its number.
create function pg_temp.post(number integer) returns jsonb language sql as $$
  select post from jsonb_array_elements((public.forum_thread(pg_temp.named('thread')::bigint)) -> 'posts') as post
  where (post ->> 'number')::integer = number;
$$;
-- A post's ID by its number in the test's thread.
create function pg_temp.post_id(number integer) returns uuid language sql security definer as $$
  select forum_posts.id from public.forum_posts
  join public.forum_threads on forum_threads.id = forum_posts.thread_id
  where forum_threads.thread_number = pg_temp.named('thread')::bigint and forum_posts.post_number = number;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The seed accounts are new, so the new-account post limit applies; this test posts more than it allows.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

/* ---------- 1. A thread with three posts ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'thread', (public.start_forum_thread('first-chapters', 'Citate', 'Primul gând.')) ->> 'thread_number';
insert into named select 'other_thread', (public.start_forum_thread('first-chapters', 'Alt fir', 'Altceva.')) ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Al doilea gând, cu **sens**.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Al treilea gând.');

/* ---------- 2. Quote and multi-quote (criteria 1 and 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Exact.',
  array[pg_temp.post_id(2)])) ->> 'post_number', '4', 'a reply quoting one post is saved');
select is(pg_temp.post(4) #>> '{quotes,0,number}', '2', 'the reply draws the quote with the quoted post''s number');
select is(pg_temp.post(4) #>> '{quotes,0,body}', 'Al doilea gând, cu **sens**.', 'its words');
select is(pg_temp.post(4) #>> '{quotes,0,author,handle}', 'teacher', 'and its author, never a user ID');
select is((public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Amândouă.',
  array[pg_temp.post_id(3), pg_temp.post_id(1), pg_temp.post_id(3)])) ->> 'post_number', '5',
  'a multi-quote is saved');
select is(jsonb_path_query_array(pg_temp.post(5), '$.quotes[*].number'), '[1, 3]'::jsonb,
  'its quotes are in thread order, without repeats');

/* ---------- 3. What can't be quoted ---------- */

select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Nu.', array[%L::uuid]) $$,
  pg_temp.named('thread'), (select forum_posts.id from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
    where forum_threads.title = 'Alt fir'))), 'quote:missing', 'a post of another thread can''t be quoted');
reset role;
update public.settings set value = '1'::jsonb where key = 'forum_post_max_quotes';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Prea multe.', array[%L::uuid, %L::uuid]) $$,
  pg_temp.named('thread'), pg_temp.post_id(1), pg_temp.post_id(2))), 'quote:too_many', 'nor more posts than the limit');
reset role;
update public.settings set value = '10'::jsonb where key = 'forum_post_max_quotes';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Doar text.')) ->> 'post_number', '6',
  'a reply without quotes works as before (the quick reply, criterion 3)');
select is(pg_temp.post(6) -> 'quotes', '[]'::jsonb, 'and has no quotes');

/* ---------- 4. A quote follows the quoted post ---------- */

-- teacher deletes #2: every reply quoting it shows the marker, not the words.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.delete_forum_post(pg_temp.post_id(2));
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Târziu.', array[%L::uuid]) $$,
  pg_temp.named('thread'), pg_temp.post_id(2))), 'quote:missing', 'a deleted post can''t be quoted');
select is((pg_temp.post(4) -> 'quotes' -> 0) - 'author', '{"number": 2, "state": "deleted", "body": null}'::jsonb,
  'a quote of a deleted post becomes the marker, without its words');
-- Staff remove #3: the quote becomes the removal marker.
reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000015', 'forum_post', pg_temp.post_id(3), 'removed',
  '00000000-0000-4000-8000-000000000010', 'Test remove');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(jsonb_path_query_array(pg_temp.post(5), '$.quotes[*] ? (@.number == 3) .state'), '["removed"]'::jsonb,
  'a quote of a removed post becomes the removal marker for everyone');
-- blocked (…16) is blocked by blocker (…15); a quote of blocker's post shows them nothing.
reset role;
delete from public.moderated_items where item_type = 'forum_post';
select set_config('role', 'authenticated', true),
  set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000016", "role": "authenticated"}', true);
select is(pg_temp.post(5) -> 'quotes' -> 1, '{"number": 3, "state": "unavailable", "body": null, "author": null}'::jsonb,
  'a reader who is blocked sees an unavailable quote, without the words or the name');

select * from finish();
rollback;
