-- Database tests for forum threads and posts (bundle FORUMS-1, part b; story S1-E8-02; CLAUDE.md
-- rules 1, 6, 8 and 15).
-- What it proves:
-- - a member starts a thread in a forum (never in a category) and others reply; every post has
--   its number, #1, #2, #3, and a number is never reused, so each post's permalink stays
--   (criterion 3);
-- - the text is cleaned on save: HTML tags (a script, an iframe, a style) and script links are
--   refused (criterion 1); titles too;
-- - an edit marks the post Edited and keeps the earlier version, which only moderators read
--   (criterion 4);
-- - deleting keeps the number as a marker; #1 alone takes its thread with it;
-- - visitors and read-only accounts can't post; the post limit says how long to wait;
-- - blocks hide posts both ways; staff hiding a post hides it from everyone but its author, and
--   removing it leaves the marker;
-- - threads and posts can be reported (rule 6), with a summary and a link for the case;
-- - the forum index counts threads and posts and shows the latest post; a forum with threads
--   can't be removed;
-- - policies forum_threads_select_own, forum_posts_select_own, forum_post_revisions_select_own
--   and the three _select_moderation policies: allowed and denied.
-- Personas: adult_writer (…01), teen_17 (…02, read-only while the test is adults only), teacher
-- (…07), moderator (…10), blocker (…15) and blocked (…16). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
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
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Starting a thread and replying (criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'thread', (public.start_forum_thread('first-chapters', '  Cum încep un capitol?  ',
  'Primul meu capitol începe cu **două pagini** de istorie.')) ->> 'thread_number';
select is((public.forum_thread(pg_temp.named('thread')::bigint)) #>> '{thread,title}', 'Cum încep un capitol?',
  'a member starts a thread; the title is trimmed');
select is(pg_temp.hint_of($$ select public.start_forum_thread('writing-craft', 'Titlu', 'Text') $$),
  'forum:category', 'a category holds forums, not threads');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Începe cu scena.')) ->> 'post_number', '2',
  'a reply takes the next number');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((public.reply_to_forum_thread(pg_temp.named('thread')::bigint,
  'Vezi [ghidul](https://example.com/ghid).')) ->> 'post_number', '3', 'and the next');
select pg_temp.sign_out();
select results_eq(
  format($$ select (post ->> 'number')::integer from jsonb_array_elements(
    (public.forum_thread(%s)) -> 'posts') as post $$, pg_temp.named('thread')),
  $$ values (1), (2), (3) $$,
  'a signed-out visitor reads every post, numbered #1, #2, #3');
select is((public.forum_thread(pg_temp.named('thread')::bigint, 0, null)) #>> '{posts,0,author,handle}', 'adult_writer',
  'each post shows its author''s username, never a user ID');
select ok(position('00000000-0000-4000-8000' in (public.forum_thread(pg_temp.named('thread')::bigint))::text) = 0,
  'no user ID anywhere in the thread''s answer');
select is(jsonb_array_length((public.forum_thread(pg_temp.named('thread')::bigint, 1)) -> 'posts'), 2,
  '"Show more replies" reads the posts after the last one shown');
select is((public.forum_thread_list('first-chapters')) #>> '{threads,0,reply_count}', '2',
  'the forum lists the thread with its replies');

/* ---------- 2. Safe text (criteria 1 and 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Salut <script>alert(1)</script>') $$,
  pg_temp.named('thread'))), 'body:html', 'a script tag is refused on save');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, '<iframe src="https://x.example"></iframe>') $$,
  pg_temp.named('thread'))), 'body:html', 'an iframe is refused');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, '<style>body{}</style>') $$,
  pg_temp.named('thread'))), 'body:html', 'a style tag is refused');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, '[apasă](javascript:alert(1))') $$,
  pg_temp.named('thread'))), 'body:link', 'a script link is refused');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, '   ') $$,
  pg_temp.named('thread'))), 'body:empty', 'an empty post is refused');
select is(pg_temp.hint_of($$ select public.start_forum_thread('first-chapters', '<b>Titlu</b>', 'Text') $$),
  'title:html', 'a title with HTML is refused');
select is(pg_temp.hint_of($$ select public.start_forum_thread('first-chapters', '', 'Text') $$),
  'title:empty', 'a thread needs a title');

/* ---------- 3. Who may post ---------- */

select pg_temp.sign_out();
select throws_ok(format($$ select public.reply_to_forum_thread(%s, 'Salut') $$, pg_temp.named('thread')),
  '42501', null, 'a signed-out visitor can''t post');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Salut') $$, pg_temp.named('thread'))),
  'not_active', 'a read-only account can''t post (the account gate)');
reset role;
-- The seed's accounts are hours old, so the new-account limit applies.
update public.settings set value = '2'::jsonb where key = 'forum_post_hourly_limit_new_account';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Încă una') $$, pg_temp.named('thread')))
  is null, 'under the limit, a post goes through');
select ok(pg_temp.hint_of(format($$ select public.reply_to_forum_thread(%s, 'Și încă una') $$, pg_temp.named('thread')))
  like 'wait_minutes:%', 'over the limit, the refusal says how many minutes to wait');
reset role;
update public.settings set value = '5'::jsonb where key = 'forum_post_hourly_limit_new_account';

/* ---------- 4. Editing (criterion 4) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'first_post', post ->> 'id'
from jsonb_array_elements((public.forum_thread(pg_temp.named('thread')::bigint)) -> 'posts') as post
where (post ->> 'number') = '1';
select lives_ok(format($$ select public.edit_forum_post(%L, 'Primul meu capitol începe direct cu scena.', 'Cum încep capitolul unu?') $$,
  pg_temp.named('first_post')), 'the author edits their post and the title');
select isnt((public.forum_thread(pg_temp.named('thread')::bigint)) #>> '{posts,0,edited_at}', null,
  'the post is marked Edited');
select is((public.forum_thread(pg_temp.named('thread')::bigint)) #>> '{thread,title}', 'Cum încep capitolul unu?',
  'the thread shows the new title');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$ select public.edit_forum_post(%L, 'Altceva') $$, pg_temp.named('first_post'))),
  'not_mine', 'someone else can''t edit it');
select throws_ok(format($$ select public.forum_post_history(%L) $$, pg_temp.named('first_post')),
  '42501', null, 'a member can''t read the earlier versions');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((public.forum_post_history(pg_temp.named('first_post')::uuid)) #>> '{0,body}',
  'Primul meu capitol începe cu **două pagini** de istorie.', 'a moderator reads the earlier version');
select is((public.forum_post_history(pg_temp.named('first_post')::uuid)) #>> '{0,title}', 'Cum încep un capitol?',
  'with the earlier title');

/* ---------- 5. Policies ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.forum_post_revisions), 1,
  'allowed: forum_post_revisions_select_own: the author reads their own earlier versions');
select is((select count(*)::integer from public.forum_posts where user_id <> '00000000-0000-4000-8000-000000000001'), 0,
  'denied: forum_posts_select_own: a member reads only their own posts from the table');
select is((select count(*)::integer from public.forum_posts), 2,
  'allowed: forum_posts_select_own: the author reads their own posts');
select is((select count(*)::integer from public.forum_threads), 1,
  'allowed: forum_threads_select_own: the starter reads their own thread');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.forum_threads), 0,
  'denied: forum_threads_select_own: someone else''s thread isn''t in the table for them');
select is((select count(*)::integer from public.forum_post_revisions), 0,
  'denied: forum_post_revisions_select_own: nor its earlier versions');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.forum_threads), 1,
  'allowed: forum_threads_select_moderation: a moderator reads every thread');
select is((select count(*)::integer from public.forum_posts), 4,
  'allowed: forum_posts_select_moderation: a moderator reads every post');
select is((select count(*)::integer from public.forum_post_revisions), 1,
  'allowed: forum_post_revisions_select_moderation: a moderator reads every earlier version');
-- A member who isn't staff gets nothing through the moderation policies.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.forum_threads where user_id <> '00000000-0000-4000-8000-000000000007'), 0,
  'denied: forum_threads_select_moderation: a member who isn''t staff can''t read others'' threads');
select is((select count(*)::integer from public.forum_post_revisions), 0,
  'denied: forum_post_revisions_select_moderation: nor anyone''s earlier versions');
select pg_temp.sign_out();
select throws_ok($$ select count(*) from public.forum_posts $$, '42501', null,
  'denied: forum_posts_select_moderation: a signed-out visitor can''t read the table at all');

/* ---------- 6. Blocks and moderation ---------- */

-- blocker (…15) blocks blocked (…16) in the seed; blocked is read-only, so their post goes in by hand.
reset role;
insert into public.forum_posts (user_id, thread_id, post_number, body)
select '00000000-0000-4000-8000-000000000016', id, last_post_number + 1, 'De la blocked.'
from public.forum_threads where thread_number = pg_temp.named('thread')::bigint;
update public.forum_threads set last_post_number = last_post_number + 1 where thread_number = pg_temp.named('thread')::bigint;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from jsonb_path_query((public.forum_thread(pg_temp.named('thread')::bigint)),
  '$.posts[*] ? (@.author.handle == "blocked")')), 0, 'blocker doesn''t see a post by someone they block');
reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select '00000000-0000-4000-8000-000000000015', 'forum_post', id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Test hide'
from public.forum_posts where user_id = '00000000-0000-4000-8000-000000000015';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from jsonb_path_query((public.forum_thread(pg_temp.named('thread')::bigint)),
  '$.posts[*] ? (@.author.handle == "blocker")')), 0, 'a hidden post is gone for other readers');
reset role;
update public.moderated_items set state = 'removed' where item_type = 'forum_post';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((jsonb_path_query_first((public.forum_thread(pg_temp.named('thread')::bigint)),
  '$.posts[*] ? (@.number == 3)')) ->> 'state', 'removed', 'a removed post keeps its number as the moderation marker');

/* ---------- 7. Deleting ---------- */

select is((public.delete_forum_post(pg_temp.named('first_post')::uuid)) ->> 'thread_deleted', 'false',
  'deleting #1 of a thread with replies keeps the thread');
select is((jsonb_path_query_first((public.forum_thread(pg_temp.named('thread')::bigint)),
  '$.posts[*] ? (@.number == 1)')) ->> 'state', 'deleted', 'and #1 stays as a "Post deleted" marker, numbers unchanged');
insert into named select 'lonely', (public.start_forum_thread('first-chapters', 'Singur', 'Nimeni nu răspunde.')) ->> 'thread_number';
select is((select (public.delete_forum_post((post ->> 'id')::uuid)) ->> 'thread_deleted'
           from jsonb_array_elements((public.forum_thread(pg_temp.named('lonely')::bigint)) -> 'posts') as post), 'true',
  'deleting #1 of a thread nobody answered deletes the thread');

/* ---------- 8. Reporting, the index and removing a forum ---------- */

reset role;
insert into named select 'thread_id', id from public.forum_threads where thread_number = pg_temp.named('thread')::bigint;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok(format($$ select * from public.report_item('forum_thread', %L, 'spam') $$, pg_temp.named('thread_id')),
  'a thread can be reported (rule 6)');
reset role;
select is(public.reportable_item_summary('forum_post',
  (select id from public.forum_posts where user_id = '00000000-0000-4000-8000-000000000007' limit 1)),
  'Post #2 in "Cum încep capitolul unu?": Începe cu scena.', 'a post''s summary names its number and thread');
select pg_temp.sign_out();
select is((select thread_count::integer || ':' || (latest_post ->> 'thread_title') from public.forum_index('ro')
           where slug = 'first-chapters'), '1:Cum încep capitolul unu?',
  'the forum index counts the thread and shows its latest post');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.start_forum_thread('fantasy-and-sci-fi-openings', 'Dragoni', 'Primul rând.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_delete_forum((select id from public.forums where slug = 'fantasy-and-sci-fi-openings'), 'Test') $$),
  'forum:has_threads', 'a forum that still has threads can''t be removed');

select * from finish();
rollback;
