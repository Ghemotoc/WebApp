-- Database tests for comments on a chapter (story S1-E6-01; CLAUDE.md rules 1, 6, 8, 15 and 18).
-- What it proves:
-- - a member comments; the comment (up to 2,000 characters) shows with its replies one level
--   deep; a reply to a reply is refused (criterion 1);
-- - a spoiler is marked, so the screen can hide it behind "Show spoiler" (criterion 2);
-- - the story's writer deletes any comment on their own story; a third member can't; the author
--   deletes their own; a deleted comment keeps its place as a marker only while it has replies
--   (criterion 3);
-- - over the limit, the next comment is refused with the minutes to wait (criterion 4);
-- - the text is sanitised on save: HTML tags and script links are refused (rule 8);
-- - visitors and read-only accounts can't comment; a 14-year-old can't read a 16+ chapter's
--   comments (rule 18); comments switched off hide the list and refuse new ones;
-- - blocks hide comments both ways; staff hiding a comment hides it from everyone but its author,
--   removing it leaves the "[Removed by the moderation team]" marker where replies keep it;
-- - every comment can be reported (rule 6), with a summary of what it says for the queue;
-- - a 'comment_posted' job carries IDs only; deleted comments are purged after 30 days;
-- - policies comments_select_own and comments_select_moderation: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) two seed stories get a published chapter each; the second is made 16+.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'comma001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'commb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';

-- IDs the test names later, kept where every role can read them.
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. Comments, replies, spoilers ---------- */

-- teacher (…07) is an active adult.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'first', (public.post_comment('statia-meteo-seed01', 'comma001',
  'Am pus telefonul jos un minut.') ->> 'id')::uuid;
select is(public.chapter_comments('statia-meteo-seed01', 'comma001') #>> '{comments,0,body}',
  'Am pus telefonul jos un minut.', 'teacher''s comment shows under the chapter');
select is(public.chapter_comments('statia-meteo-seed01', 'comma001') #>> '{comments,0,author,handle}', 'teacher',
  'with the author''s username');
select ok(public.chapter_comments('statia-meteo-seed01', 'comma001')::text not like '%00000000-0000-4000-8000-%',
  'and never a user ID');
select is(public.post_comment('statia-meteo-seed01', 'comma001', repeat('a', 2000)) ? 'id', true,
  '2,000 characters is allowed');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', repeat('a', 2001)) $$,
  '23514', null, '2,001 characters is refused');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', '   ') $$, '23514', null,
  'an empty comment is refused');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Hi <script>alert(1)</script>') $$,
  '23514', null, 'an HTML tag is refused (rule 8)');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', '[x](javascript:alert(1))') $$,
  '23514', null, 'a script link is refused (rule 8)');

-- adult_writer replies; a reply to the reply is refused.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'reply', (public.post_comment('statia-meteo-seed01', 'comma001',
  'Replica aceea a avut patru variante.', false, (select id from named where label = 'first')) ->> 'id')::uuid;
select is(
  (select jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'comma001'),
     '$.comments[*] ? (@.author.handle == "teacher" && @.body like_regex "telefonul").replies[0]') ->> 'is_writer'),
  'true', 'the writer''s reply sits under the comment, marked as the writer''s');
select throws_ok(format($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Deeper', false, %L) $$,
  (select id from named where label = 'reply')), '23514', null, 'replies go one level deep only');

-- blocker (…15) posts a spoiler.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
insert into named select 'spoiler', (public.post_comment('statia-meteo-seed01', 'comma001',
  'Capitolul 15 spune cine era în lift.', true) ->> 'id')::uuid;
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '$.comments[*] ? (@.author.handle == "blocker")')) ->> 'is_spoiler', 'true',
  'a spoiler is marked, so the screen can hide it (criterion 2)');
select is((public.chapter_comments('statia-meteo-seed01', 'comma001') ->> 'total')::integer, 4,
  'the total counts comments and replies');

/* ---------- 2. Deleting ---------- */

select throws_ok(format($$ select public.delete_comment(%L) $$, (select id from named where label = 'first')),
  '42501', null, 'a third member can''t delete someone else''s comment');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.delete_comment((select id from named where label = 'first')),
  'the story''s writer deletes a comment on their own story (criterion 3)');
select is(
  (select jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'comma001'),
     '$.comments[*] ? (@.state == "deleted")') ->> 'body'),
  null, 'the deleted comment keeps its place as a marker, without its words');
select is(
  jsonb_array_length(jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'comma001'),
     '$.comments[*] ? (@.state == "deleted")') -> 'replies'), 1, 'because its reply still stands');
select ok(public.delete_comment((select id from named where label = 'reply')), 'the author deletes their own reply');
select is(
  (select count(*)::integer from jsonb_path_query(public.chapter_comments('statia-meteo-seed01', 'comma001'),
     '$.comments[*] ? (@.state == "deleted")')),
  0, 'with no reply left, the deleted comment disappears');
select throws_ok(format($$ select public.delete_comment(%L) $$, (select id from named where label = 'reply')),
  'P0002', null, 'a comment can''t be deleted twice');

/* ---------- 3. The limit ---------- */

-- The seed personas were made today, so teacher counts as new: lower that limit to 2 for the test
-- (teacher has posted two comments this hour).
reset role;
update public.settings set value = '2'::jsonb where key = 'comment_hourly_limit_new_account';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Al patrulea') $$, '54000', null,
  'over the limit, the next comment is refused (criterion 4)');
select matches(pg_temp.error_hint($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Încă unul') $$),
  '^wait_minutes:[0-9]+$', 'with the minutes to wait, for the message');
reset role;
update public.settings set value = '5'::jsonb where key = 'comment_hourly_limit_new_account';
update public.profiles set created_at = now() - interval '2 days' where id = '00000000-0000-4000-8000-000000000007';
update public.settings set value = '2'::jsonb where key = 'comment_hourly_limit';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Mai vechi') $$, '54000', null,
  'an older account has its own limit (comment_hourly_limit)');
reset role;
update public.settings set value = '60'::jsonb where key = 'comment_hourly_limit';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Acum merge.') $$,
  'under the older account''s 60 an hour, it posts again');

/* ---------- 4. Who may comment and read ---------- */

select pg_temp.sign_out();
select is((public.chapter_comments('statia-meteo-seed01', 'comma001') ->> 'total')::integer, 3,
  'a visitor may read the comments');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Salut') $$, '42501', null,
  'a visitor can''t comment');
-- teen_17 (…02) is read-only while the test is adults only.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Salut') $$, '42501', null,
  'a read-only account can''t comment (the account gate)');
-- kid_14_ok (…03) can't read the 16+ story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.chapter_comments('the-girl-who-fixed-radios-seed02', 'commb001'), null,
  'a 14-year-old can''t read a 16+ chapter''s comments (rule 18)');

-- Comments switched off: nothing listed, nothing new; switched back on, they are all still there.
reset role;
update public.stories set comments_enabled = false where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '{"total": 0, "comments": [], "has_more": false, "comments_enabled": false}'::jsonb,
  'with comments off the list is empty and says so');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'comma001', 'Salut') $$, '55000', null,
  'and a new comment is refused');
reset role;
update public.stories set comments_enabled = true where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.chapter_comments('statia-meteo-seed01', 'comma001') ->> 'total')::integer, 3,
  'switched back on, the comments are all there');

/* ---------- 5. Blocks and moderation ---------- */

-- blocked (…16) is read-only, so their comment is put in by hand; blocker blocks them in the seed.
reset role;
with made as (
  insert into public.comments (user_id, chapter_id, body)
  select '00000000-0000-4000-8000-000000000016', id, 'Nimeni nu te-a întrebat.' from public.chapters where code = 'comma001'
  returning id)
insert into named select 'by_blocked', id from made;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from jsonb_path_query(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '$.comments[*] ? (@.author.handle == "blocked")')), 0, 'blocker doesn''t see a comment by someone they block');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is((select count(*)::integer from jsonb_path_query(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '$.comments[*] ? (@.author.handle == "blocker")')), 0, 'and blocked doesn''t see blocker''s comments');

-- A moderator hides blocker's spoiler: gone for others, still there for its author.
reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select '00000000-0000-4000-8000-000000000015', 'comment', id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Test hide'
from named where label = 'spoiler';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from jsonb_path_query(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '$.comments[*] ? (@.author.handle == "blocker")')), 0, 'a hidden comment is gone for other readers');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '$.comments[*] ? (@.author.handle == "blocker")')) ->> 'state', 'hidden', 'its author still sees it, marked hidden');

-- Removed with a reply under it: the marker stays, without the words.
reset role;
update public.moderated_items set state = 'removed' where item_type = 'comment';
insert into public.comments (user_id, chapter_id, parent_comment_id, body)
select '00000000-0000-4000-8000-000000000007', chapter_id, id, 'Mie mi-a plăcut.' from public.comments
where id = (select id from named where label = 'spoiler');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'comma001'),
  '$.comments[*] ? (@.state == "removed")')) ->> 'body', null,
  'a removed comment with a reply shows the moderation marker, without its words');

/* ---------- 6. Reporting ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'teacher_last', id from public.comments
  where user_id = '00000000-0000-4000-8000-000000000007' and body = 'Acum merge.';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok(format($$ select * from public.report_item('comment', %L, 'spam') $$,
  (select id from named where label = 'teacher_last')), 'a comment can be reported (rule 6)');
reset role;
select is(public.reportable_item_summary('comment', (select id from named where label = 'teacher_last')),
  'Comment on chapter 1 of Stația meteo: Acum merge.', 'the queue''s summary says what the comment says');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok(format($$ select * from public.report_item('comment', %L, 'spam') $$,
  (select id from named where label = 'teacher_last')), '23514', null, 'nobody reports their own comment');

/* ---------- 7. The job and the purge ---------- */

reset role;
select ok((select bool_and(payload ? 'comment_id' and payload ? 'chapter_id' and not payload ? 'body')
  from public.jobs where kind = 'comment_posted'), 'each new comment queues a job with IDs only, no text');
select is((select count(*)::integer from public.jobs where kind = 'comment_posted'), 5,
  'one job for each comment posted through post_comment()');
update public.comments set deleted_at = now() - interval '31 days' where id = (select id from named where label = 'reply');
select is(public.purge_deleted_comments(), 1, 'a comment deleted 31 days ago is purged');
update public.comments set deleted_at = now() - interval '31 days' where id = (select id from named where label = 'first');
select is(public.purge_deleted_comments(), 1, 'its parent goes once no reply is left under it');

/* ---------- 8. Policies ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok((select count(*) from public.comments) > 0
  and (select bool_and(user_id = '00000000-0000-4000-8000-000000000007') from public.comments),
  'allowed: comments_select_own, the author reads their own comments, and only those');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.comments where user_id <> '00000000-0000-4000-8000-000000000001'), 0,
  'denied: comments_select_own, the story''s writer reads nobody else''s row directly');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok((select count(*) from public.comments where user_id = '00000000-0000-4000-8000-000000000016') = 1,
  'allowed: comments_select_moderation, a moderator reads any comment');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.comments), 0,
  'denied: comments_select_moderation, support (no moderation area) reads none');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ insert into public.comments (user_id, chapter_id, body)
    select '00000000-0000-4000-8000-000000000007', id, 'Direct' from public.chapters where code = 'comma001' $$,
  '42501', null, 'nobody writes comments directly');

select * from finish();
rollback;
