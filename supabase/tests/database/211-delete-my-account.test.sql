-- Database tests for Delete my account (story S1-E13-03; GDPR art. 17).
-- What it proves:
-- - criterion 1: request_account_deletion() needs a log-in from the last few minutes, closes the
--   account at once (the account gate says "deleted", stories and comments go out of sight) and
--   sets the deletion 14 days later; cancel_account_deletion() brings back exactly what it hid;
-- - criterion 2: when the 14 days pass, purge_closed_accounts() deletes the stories, chapters,
--   comments, messages, follows, blocks, library and every other row of the person's; a comment
--   with other people's replies keeps its place with its words erased;
-- - criterion 3: the profile and login stay as an empty tombstone, so the user ID can never be
--   given to another account;
-- - criterion 4: a chapter and a comment under an open case are kept (and the story holding the
--   chapter, out of sight), everything around them goes;
-- - the one list account_deletion_rules() covers every user_content and user_action table;
-- - policy account_deletions_select_own: allowed and denied.
-- Personas: adult_writer (…01, the one leaving), teen_17 (…02), moderator (…10).
-- Test data: two stories, comments, a chat and follows by adult_writer, a story by teen_17 with
-- a reply; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

-- A sign-in as Supabase's tokens carry it, with the log-in time in "amr" (minutes ago).
create function pg_temp.sign_in(persona_suffix text, minutes_ago integer default 0) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', '00000000-0000-4000-8000-0000000000' || persona_suffix, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password',
             'timestamp', extract(epoch from now() - make_interval(mins => minutes_ago))::bigint)))::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Test data. adult_writer: story 1 (one chapter), story 2 (a chapter under an open case and one
-- not), a story they deleted themselves earlier, a comment on teen_17's chapter with teen_17's
-- reply, a plain comment and one under an open case, a chat with teen_17, follows and a block.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, completion_status, deleted_at)
values
  ('00000000-0000-4000-9211-000000000001', '00000000-0000-4000-8000-000000000001', 'leave1', 'Unu', 'ro',
    (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', null),
  ('00000000-0000-4000-9211-000000000002', '00000000-0000-4000-8000-000000000001', 'leave2', 'Doi', 'ro',
    (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', null),
  ('00000000-0000-4000-9211-000000000003', '00000000-0000-4000-8000-000000000001', 'leave3', 'Trei', 'ro',
    (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now() - interval '2 days'),
  ('00000000-0000-4000-9211-000000000004', '00000000-0000-4000-8000-000000000002', 'stay4', 'Patru', 'ro',
    (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', null);
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values
  ('00000000-0000-4000-9211-000000000011', '00000000-0000-4000-9211-000000000001', '00000000-0000-4000-8000-000000000001', 'lv1ch001', 1, 'A', 'Text.', 1, 'draft'),
  ('00000000-0000-4000-9211-000000000012', '00000000-0000-4000-9211-000000000002', '00000000-0000-4000-8000-000000000001', 'lv2ch001', 1, 'B', 'Held.', 1, 'draft'),
  ('00000000-0000-4000-9211-000000000013', '00000000-0000-4000-9211-000000000002', '00000000-0000-4000-8000-000000000001', 'lv2ch002', 2, 'C', 'Not held.', 2, 'draft'),
  ('00000000-0000-4000-9211-000000000014', '00000000-0000-4000-9211-000000000004', '00000000-0000-4000-8000-000000000002', 'st4ch001', 1, 'D', 'Teen.', 1, 'draft');
insert into public.comments (id, user_id, chapter_id, parent_comment_id, body)
values
  ('00000000-0000-4000-9211-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9211-000000000014', null, 'Has a reply.'),
  ('00000000-0000-4000-9211-000000000022', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9211-000000000014', '00000000-0000-4000-9211-000000000021', 'The reply.'),
  ('00000000-0000-4000-9211-000000000023', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9211-000000000014', null, 'Plain.'),
  ('00000000-0000-4000-9211-000000000024', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9211-000000000014', null, 'Reported.');
insert into public.conversations (id, user_id, recipient_user_id, status)
values ('00000000-0000-4000-9211-000000000031', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'accepted');
insert into public.conversation_members (conversation_id, user_id)
values ('00000000-0000-4000-9211-000000000031', '00000000-0000-4000-8000-000000000001'),
       ('00000000-0000-4000-9211-000000000031', '00000000-0000-4000-8000-000000000002')
on conflict do nothing;
insert into public.messages (user_id, conversation_id, body)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9211-000000000031', 'Mine.'),
       ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9211-000000000031', 'Theirs.');
insert into public.follows_users (user_id, followed_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'),
       ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;
insert into public.library_entries (user_id, story_id, shelf)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9211-000000000004', 'reading')
on conflict do nothing;
-- Open cases on chapter B and the "Reported." comment (criterion 4).
insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
values ('R-211001', '00000000-0000-4000-8000-000000000001', 'chapter',
  '00000000-0000-4000-9211-000000000012', 'report', 'two_days', now() + interval '2 days'),
       ('R-211002', '00000000-0000-4000-8000-000000000001', 'comment',
  '00000000-0000-4000-9211-000000000024', 'report', 'two_days', now() + interval '2 days');

/* ---------- 1. The one list ---------- */

select pg_temp.as_owner();
select is(
  (select coalesce(string_agg(classes.relname, ', ' order by classes.relname), '')
   from pg_class as classes join pg_namespace on pg_namespace.oid = classes.relnamespace
   where pg_namespace.nspname = 'public' and classes.relkind = 'r'
     and obj_description(classes.oid) ~ '^kind: (user_content|user_action)'
     and classes.relname not in (select rules.table_name from public.account_deletion_rules() as rules)),
  '', 'every user_content and user_action table says what deleting an account does to it');
select is(
  (select count(*)::integer from public.account_deletion_rules() as rules
   where rules.action <> 'delete' and coalesce(rules.why, '') = ''),
  0, 'every table that is kept or has a step of its own says why');
select is(
  (select coalesce(string_agg(rules.table_name, ', '), '') from public.account_deletion_rules() as rules
   where rules.action = 'delete' and not exists (
     select 1 from information_schema.columns
     where columns.table_schema = 'public' and columns.table_name = rules.table_name
       and columns.column_name = 'user_id')),
  '', 'every table deleted row by row exists and has a user_id');

/* ---------- 2. Asking ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.request_account_deletion() $$, '42501', null,
  'signed out, nobody can ask to delete an account');

select pg_temp.sign_in('01', 30);
select throws_ok($$ select public.request_account_deletion() $$, '23514', 'Log in again to confirm.',
  'a log-in from half an hour ago is not enough to confirm (criterion 1)');
select is(public.my_account_deletion() ->> 'signed_in_recently', 'false',
  'my_account_deletion() says the person must log in again');

select pg_temp.sign_in('10');
select throws_ok($$ select public.request_account_deletion() $$, '23514', 'A staff account can''t be deleted here.',
  'a staff account is refused until its staff role is removed');

select pg_temp.sign_in('01', 2);
select is(public.my_account_deletion() ->> 'signed_in_recently', 'true',
  'a log-in two minutes ago lets the person confirm');
-- The answer is kept first: "between" would call the function twice.
create temporary table request_answer as select public.request_account_deletion() as answer;
select ok(
  (select (answer ->> 'delete_after')::timestamptz - now() from request_answer)
    between interval '13 days 23 hours' and interval '14 days 1 hour',
  'the account is deleted for good 14 days after the request (criterion 1)');

/* ---------- 3. Closed at once ---------- */

select pg_temp.as_owner();
select is(public.account_state('00000000-0000-4000-8000-000000000001')::text, 'deleted',
  'the account closes at once: the account gate says deleted, so nothing can be written');
select is(
  (select count(*)::integer from public.stories
   where user_id = '00000000-0000-4000-8000-000000000001' and slug like 'leave%' and deleted_at is null),
  0, 'the stories go out of sight at once');
select is(
  (select count(*)::integer from public.comments
   where user_id = '00000000-0000-4000-8000-000000000001' and id::text like '00000000-0000-4000-9211-%' and deleted_at is null),
  0, 'the comments go out of sight at once');

select pg_temp.sign_in('01', 2);
select is(public.my_account_deletion() ->> 'state', 'closing',
  'my_account_deletion() says the account is closing');
select ok((select count(*) from public.account_deletions) = 1,
  'allowed: account_deletions_select_own: the person reads their own request');
select throws_ok($$ select public.request_account_deletion() $$, '42501', null,
  'a closing account can''t ask again');

select pg_temp.sign_in('02');
select is((select count(*)::integer from public.account_deletions), 0,
  'denied: account_deletions_select_own: nobody reads someone else''s request');

/* ---------- 4. Cancelling ---------- */

select pg_temp.sign_in('01', 600);
select is(public.cancel_account_deletion() ->> 'outcome', 'ok',
  'the person can log in and keep the account, with no fresh log-in needed');
select is(public.cancel_account_deletion() ->> 'outcome', 'not_found',
  'cancelling twice finds nothing waiting');
select pg_temp.as_owner();
select is(public.account_state('00000000-0000-4000-8000-000000000001')::text, 'active',
  'the account is open again');
select is(
  (select string_agg(slug, ',' order by slug) from public.stories
   where user_id = '00000000-0000-4000-8000-000000000001' and slug like 'leave%' and deleted_at is null),
  'leave1,leave2', 'the stories the request hid come back, and one deleted earlier stays deleted');
select is(
  (select count(*)::integer from public.comments
   where user_id = '00000000-0000-4000-8000-000000000001' and id::text like '00000000-0000-4000-9211-%' and deleted_at is null),
  3, 'the comments come back');

/* ---------- 5. Deleted for good after 14 days ---------- */

select pg_temp.sign_in('01', 1);
select lives_ok($$ select public.request_account_deletion() $$, 'the person asks again');
select pg_temp.as_owner();
select is(public.purge_closed_accounts(), 0, 'nothing is deleted before the 14 days pass');
update public.account_deletions set requested_at = now() - interval '15 days', delete_after = now() - interval '1 day'
where user_id = '00000000-0000-4000-8000-000000000001' and cancelled_at is null;
select is(public.purge_closed_accounts(), 1, 'the nightly job deletes the account once the 14 days pass');

select is(
  (select string_agg(chapters.code, ',') from public.chapters
   where chapters.user_id = '00000000-0000-4000-8000-000000000001' and chapters.code like 'lv%'),
  'lv2ch001', 'only the chapter under an open case is kept (criterion 4)');
select is(
  (select string_agg(slug || ':' || (deleted_at is not null)::text, ',') from public.stories
   where user_id = '00000000-0000-4000-8000-000000000001' and slug like 'leave%'),
  'leave2:true', 'the story holding it stays, out of sight; the others are deleted (criterion 2)');
select is(
  (select string_agg(coalesce(nullif(body, ''), '(erased)'), ',' order by body) from public.comments
   where user_id = '00000000-0000-4000-8000-000000000001' and chapter_id = '00000000-0000-4000-9211-000000000014'),
  '(erased),Reported.', 'comments go: one with a reply keeps its place with no words, one under a case stays');
select is(
  (select count(*)::integer from public.comments where id = '00000000-0000-4000-9211-000000000022'),
  1, 'the other person''s reply stays in place');
select is(
  (select string_agg(body, ',') from public.messages where conversation_id = '00000000-0000-4000-9211-000000000031'),
  'Theirs.', 'the person''s messages go; the other person keeps their own');
select ok(
  (select deleted_at is not null from public.conversation_members
   where conversation_id = '00000000-0000-4000-9211-000000000031' and user_id = '00000000-0000-4000-8000-000000000001'),
  'the person leaves the chat, so it goes once the other person deletes it');
select is(
  (select count(*)::integer from public.follows_users
   where user_id = '00000000-0000-4000-8000-000000000001' or followed_user_id = '00000000-0000-4000-8000-000000000001'),
  0, 'follows go both ways');
select is(
  (select count(*)::integer from public.library_entries where user_id = '00000000-0000-4000-8000-000000000001')
  + (select count(*)::integer from public.notification_email_settings where user_id = '00000000-0000-4000-8000-000000000001')
  + (select count(*)::integer from public.reading_preferences where user_id = '00000000-0000-4000-8000-000000000001'),
  0, 'the library, email choices and likes go with every other row of the person''s');

/* ---------- 6. The user ID is never reused ---------- */

select is(
  (select row(birth_year, pen_name, bio, handle_slug is not null, deleted_at is not null)::text
   from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  '(,,"",t,t)', 'the profile is an empty tombstone; the username stays reserved (criterion 3)');
select is(
  (select email || ':' || (select count(*) from auth.identities where user_id = users.id)
   from auth.users where id = '00000000-0000-4000-8000-000000000001'),
  '00000000-0000-4000-8000-000000000001@deleted.invalid:0', 'the login loses its email and ways in');
select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email) values ('00000000-0000-4000-8000-000000000001',
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new@example.test') $$,
  '23505', null, 'a new account can never get the deleted account''s user ID (criterion 3)');
select ok(
  (select completed_at is not null from public.account_deletions
   where user_id = '00000000-0000-4000-8000-000000000001' and cancelled_at is null),
  'the request is marked done, the record that the account was deleted');

select is((select count(*)::integer from cron.job where jobname = 'purge-closed-accounts'), 1,
  'the deletion runs every night (job purge-closed-accounts)');

select pg_temp.sign_in('01', 1);
select throws_ok($$ select public.delete_account_data('00000000-0000-4000-8000-000000000002') $$, '42501', null,
  'nobody can run the deletion on someone else through the API');

select * from finish();
rollback;
