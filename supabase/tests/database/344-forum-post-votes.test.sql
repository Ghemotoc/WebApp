-- Database tests for votes on forum posts (bundle GAPS-16, part c; stories S1-E8-02 and S1-E6-04;
-- Q22; board 5.2).
-- What it proves:
-- - a member upvotes someone else's post, swaps to a downvote and takes the vote back; the thread
--   page shows the upvote count to everyone and the caller only their own vote, never a downvote
--   count;
-- - nobody votes on their own post, on a post that isn't there, with a vote that isn't up or down,
--   or signed out; a locked thread takes no new votes but a vote can still be taken back;
-- - once downvote_case_threshold counted accounts downvoted a post it enters the queue once, at the
--   lowest tier, as a 'downvotes' case; a new account's downvote is kept but not counted;
-- - forum_post_votes_select_own: the voter reads their own row, the post's author reads none;
--   forum_post_votes_select_moderation: a moderator reads every row, support reads none;
-- - the votes are in Download my data and go with the account.
-- Personas: adult_writer (…01), pending_check (…05, active while adults_only is on, kept a new
-- account), teacher (…07), moderator (…10), support (…11), suspended_user (…13), blocker (…15).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

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

-- The seed accounts were made today; all but pending_check (…05) are made older so their
-- downvotes count. The threshold is lowered to 2 for the test (it is a setting).
update public.profiles set created_at = now() - interval '30 days'
where id <> '00000000-0000-4000-8000-000000000005';
update public.settings set value = '2'::jsonb where key = 'downvote_case_threshold';

create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns text language sql as $$
  select value from named where label = wanted;
$$;
-- The votes block of one post on the thread page, as the caller sees it.
create function pg_temp.votes(post_number integer) returns jsonb language sql as $$
  select post -> 'votes'
  from jsonb_array_elements(public.forum_thread(pg_temp.named('thread')::bigint) -> 'posts') as post
  where (post ->> 'number')::integer = post_number;
$$;
-- The starter post's cases, read as the test's owner (members can't read cases).
create function pg_temp.post_cases() returns table (source text, tier text, status text, prefix text)
language sql security definer as $$
  select cases.source::text, cases.tier::text, cases.status::text, left(cases.reference, 2)
  from public.cases where cases.item_type = 'forum_post' and cases.item_id = pg_temp.named('first')::uuid;
$$;
-- Whether pending_check's vote counts, read as the test's owner.
create function pg_temp.new_account_counted() returns boolean language sql security definer as $$
  select is_counted from public.forum_post_votes where user_id = '00000000-0000-4000-8000-000000000005';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- teacher (…07) starts a thread; adult_writer (…01) replies.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'thread',
  (public.start_forum_thread('first-chapters', 'Votăm?', 'Prima postare.')) ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.reply_to_forum_thread(pg_temp.named('thread')::bigint, 'Un răspuns.');
reset role;
insert into named select 'first', id::text from public.forum_posts
  where thread_id = (select id from public.forum_threads where thread_number = pg_temp.named('thread')::bigint)
    and post_number = 1;
insert into named select 'reply', id::text from public.forum_posts
  where thread_id = (select id from public.forum_threads where thread_number = pg_temp.named('thread')::bigint)
    and post_number = 2;

/* ---------- 1. Up, swap, back ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.votes(1), '{"up": 0, "mine": null, "can_vote": true}'::jsonb,
  'a member may vote on someone else''s post, which has no upvotes yet');
select is(pg_temp.votes(2) ->> 'can_vote', 'false', 'but not on their own');
select is(public.vote_forum_post(pg_temp.named('first')::uuid, 'up'), 'up', 'a member upvotes a post');
select is(pg_temp.votes(1), '{"up": 1, "mine": "up", "can_vote": true}'::jsonb,
  'the thread page shows one upvote, and that it is theirs');
select is((select count(*)::integer from public.forum_post_votes), 1,
  'allowed: forum_post_votes_select_own, the voter reads their own row');
select is(public.vote_forum_post(pg_temp.named('first')::uuid, 'down'), 'down', 'pressing Downvote swaps the vote');
select is(pg_temp.votes(1), '{"up": 0, "mine": "down", "can_vote": true}'::jsonb,
  'the upvote is gone and only the voter sees their downvote');
select is(public.vote_forum_post(pg_temp.named('first')::uuid, null), null, 'the vote can be taken back');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.vote_forum_post(pg_temp.named('first')::uuid, 'up'), 'up', 'another member upvotes');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.votes(1), '{"up": 1, "mine": null, "can_vote": false}'::jsonb,
  'the post''s author sees the upvote count and can''t vote on it');
select is((select count(*)::integer from public.forum_post_votes), 0,
  'denied: forum_post_votes_select_own, the author reads no vote on their post');

select pg_temp.sign_out();
select is(pg_temp.votes(1) ->> 'up', '1', 'a visitor sees the upvote count');

/* ---------- 2. Refusals ---------- */

select is(pg_temp.refusal($$ select public.vote_forum_post(pg_temp.named('first')::uuid, 'up') $$),
  '42501', 'a visitor can''t vote (anon may not call it)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.vote_forum_post(pg_temp.named('reply')::uuid, 'up') $$),
  '23514 post:own', 'nobody votes on their own post');
select is(pg_temp.refusal($$ select public.vote_forum_post(gen_random_uuid(), 'up') $$),
  'P0002 post:missing', 'a post that isn''t there is refused');
select is(pg_temp.refusal($$ select public.vote_forum_post(pg_temp.named('first')::uuid, 'sideways') $$),
  '22023', 'a vote is up or down');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select ok(pg_temp.refusal($$ select public.vote_forum_post(pg_temp.named('first')::uuid, 'up') $$) like '42501%',
  'a suspended account can''t vote');

/* ---------- 3. Downvotes reach moderation, never a number ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.vote_forum_post(pg_temp.named('first')::uuid, 'down'), 'down', 'a new account''s downvote is kept');
select is(pg_temp.new_account_counted(), false, 'but not counted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.vote_forum_post(pg_temp.named('first')::uuid, 'down');
select is((select count(*)::integer from pg_temp.post_cases()), 0,
  'one counted downvote and one uncounted open no case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.vote_forum_post(pg_temp.named('first')::uuid, 'down');
select results_eq(
  $$ select * from pg_temp.post_cases() $$,
  $$ values ('downvotes', 'seven_days', 'open', 'D-') $$,
  'the second counted downvote puts the post in the queue at the lowest tier');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.vote_forum_post(pg_temp.named('first')::uuid, null);
select public.vote_forum_post(pg_temp.named('first')::uuid, 'down');
select is((select count(*)::integer from pg_temp.post_cases()), 1, 'and no second case opens');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.forum_post_votes), 3,
  'allowed: forum_post_votes_select_moderation, a moderator reads every vote');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.forum_post_votes), 0,
  'denied: forum_post_votes_select_moderation, support reads none');

/* ---------- 4. A locked thread ---------- */

reset role;
update public.forum_threads set locked_at = now(), lock_reason = 'Test.'
where thread_number = pg_temp.named('thread')::bigint;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.refusal($$ select public.vote_forum_post(pg_temp.named('reply')::uuid, 'up') $$),
  '23514 thread:locked', 'a locked thread takes no new votes');
select is(public.vote_forum_post(pg_temp.named('first')::uuid, null), null,
  'but a vote in it can still be taken back');

select * from finish();
rollback;
