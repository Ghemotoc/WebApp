-- Database tests for private downvotes on comments (story S1-E6-04; Q22; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - a member downvotes a comment and can take it back; chapter_comments() tells them only their
--   own vote, and nobody, the comment's author included, ever gets a count (criterion 1);
-- - once enough counted accounts downvote, the comment enters the queue once, at the lowest tier,
--   as a 'downvotes' case (criterion 2);
-- - an account under 24 hours old downvotes without being counted (criterion 3);
-- - one's own comment, a visitor, a read-only account and a blocked pair are refused;
-- - policies: comment_downvotes_select_own (the voter reads their own row: allowed; the author
--   reads none: denied) and comment_downvotes_select_moderation (a moderator reads all: allowed;
--   support reads none: denied); nobody writes the table directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- The seed accounts were made today; all but pending_check (…05) are made older so their votes
-- count. The active members besides the author are adult_writer, blocker and pending_check, so
-- the threshold is lowered to 2 for the test (it is a setting).
update public.profiles set created_at = now() - interval '30 days'
where id <> '00000000-0000-4000-8000-000000000005';
update public.settings set value = '2'::jsonb where key = 'downvote_case_threshold';

-- adult_writer's (…01) first seed story gets a published chapter; teacher (…07) comments on it.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'downa001', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
-- The comment's cases, read as the test's owner (members can't read cases).
create function pg_temp.comment_cases() returns table (source text, tier text, status text, prefix text)
language sql security definer as $$
  select cases.source::text, cases.tier::text, cases.status::text, left(cases.reference, 2)
  from public.cases where cases.item_id = (select id from named where label = 'comment');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'comment', (public.post_comment('statia-meteo-seed01', 'downa001',
  'Un comentariu.') ->> 'id')::uuid;

/* ---------- 1. Down, and back ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.downvote_comment((select id from named where label = 'comment'), true), true,
  'adult_writer downvotes teacher''s comment');
select is(public.chapter_comments('statia-meteo-seed01', 'downa001') #>> '{comments,0,downvoted_by_me}', 'true',
  'chapter_comments() tells them it''s theirs');
select is(public.downvote_comment((select id from named where label = 'comment'), false), false,
  'and they can take it back');
select is(public.downvote_comment((select id from named where label = 'comment'), true), true,
  'and downvote again');

/* ---------- 2. Nobody sees a count ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.chapter_comments('statia-meteo-seed01', 'downa001') #>> '{comments,0,downvoted_by_me}', 'false',
  'the author sees only that they didn''t downvote it themselves');
select ok(public.chapter_comments('statia-meteo-seed01', 'downa001')::text !~ 'downvote(s|_count)"',
  'and no answer carries a downvote count');
select is((select count(*)::integer from public.comment_downvotes), 0,
  'denied: comment_downvotes_select_own, the author reads no downvote on their comment');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.comment_downvotes), 1,
  'allowed: comment_downvotes_select_own, the voter reads their own row');

/* ---------- 3. New accounts and the threshold ---------- */

-- pending_check (…05) is under a day old: kept, not counted.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.downvote_comment((select id from named where label = 'comment'), true), true,
  'a new account''s downvote is accepted');
select is((select is_counted from public.comment_downvotes where user_id = '00000000-0000-4000-8000-000000000005'), false,
  'but not counted (criterion 3)');
select is((select count(*)::integer from pg_temp.comment_cases()), 0,
  'one counted downvote and one uncounted open no case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok($$ select public.downvote_comment((select id from named where label = 'comment'), true) $$,
  'blocker downvotes: two counted');
select results_eq(
  $$ select * from pg_temp.comment_cases() $$,
  $$ values ('downvotes', 'seven_days', 'open', 'D-') $$,
  'the second counted account puts the comment in the queue at the lowest tier (criterion 2)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.downvote_comment((select id from named where label = 'comment'), false),
                          public.downvote_comment((select id from named where label = 'comment'), true) $$,
  'adult_writer takes theirs back and downvotes again');
select is((select count(*)::integer from pg_temp.comment_cases()), 1,
  'and no second case opens');

/* ---------- 4. Refusals ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.downvote_comment((select id from named where label = 'comment'), true) $$,
  '23514', null, 'nobody downvotes their own comment');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select throws_ok($$ select public.downvote_comment((select id from named where label = 'comment'), true) $$,
  '42501', null, 'a read-only account (waiting for a parent) can''t downvote');

/* ---------- 5. Staff reads ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.comment_downvotes), 3,
  'allowed: comment_downvotes_select_moderation, a moderator reads every downvote');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.comment_downvotes), 0,
  'denied: comment_downvotes_select_moderation, support reads none');

select * from finish();
rollback;
