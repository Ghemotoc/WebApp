-- Database tests for "To follow this week" in the Read page's Writers box (user story 1.4, board
-- A04; CLAUDE.md rules 1, 6 and 15; S1-E5-11: only writers who may be suggested to strangers).
-- What it proves:
-- - only admins and the owner read and save the picks (a moderator and a member are refused);
-- - a save checks the reason, the length (3 at most), unknown usernames, the same writer twice
--   and writers who may not be suggested (a 17-year-old without the switch), then keeps the order
--   and logs before and after;
-- - readers get the picks in order, never themselves, never across a block, and never a writer
--   who turned suggestions off after the pick;
-- - with no pick that may show, the list is the writers who gained the most followers in 7 days;
-- - nothing readers get carries a user ID;
-- - the policy: writer_follow_picks select (allowed for an admin, denied for a moderator); nobody
--   writes the table directly.
-- Personas: admin (…09), moderator (…10), adult_writer (…01), teen_17 (…02), pending_check (…05),
-- teacher (…07), owner (…08), support (…11). Test data: a story each for teacher and
-- adult_writer; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- The usernames in "To follow this week", in order, for whoever is signed in.
create function pg_temp.to_follow() returns text[] language sql as $$
  select coalesce(array_agg(card ->> 'handle' order by ordinality), '{}')
  from jsonb_array_elements(public.writers_to_follow_now() -> 'writers') with ordinality as cards (card, ordinality);
$$;
create function pg_temp.source() returns text language sql as $$
  select public.writers_to_follow_now() ->> 'source';
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- teacher and adult_writer each get a public story with a chapter out, so both are writers anyone
-- may find (the automatic list counts only writers with such a story).
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id, first_published_at)
values
  ('00000000-0000-4000-9406-00000000000a', '00000000-0000-4000-8000-000000000007', 'To follow A',
   'to-follow-a-qa406', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'), now() - interval '5 days'),
  ('00000000-0000-4000-9406-00000000000b', '00000000-0000-4000-8000-000000000001', 'To follow B',
   'to-follow-b-qa406', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'), now() - interval '5 days');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'q406' || right(stories.id::text, 1) || 'aa1', 1,
  'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '1 day'
from public.stories where stories.slug like 'to-follow-%-qa406';
update public.stories set last_chapter_published_at = now() - interval '1 day'
where slug like 'to-follow-%-qa406';

/* ---------- 1. Who may read and save ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_writer_follow_picks() $$, '42501', null,
  'a moderator can''t open the writers to follow');
select throws_ok($$ select public.admin_set_writer_follow_picks(array['teacher'], 'Try') $$, '42501', null,
  'a moderator can''t save the writers to follow');
select is_empty($$ select 1 from public.writer_follow_picks $$,
  'denied: writer_follow_picks_select_featured_staff: a moderator reads no picks');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_writer_follow_picks('{}', 'Try') $$, '42501', null,
  'a member can''t save the writers to follow');
select throws_ok($$ insert into public.writer_follow_picks (writer_user_id, position, user_id)
  values ('00000000-0000-4000-8000-000000000007', 1, '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'nobody writes writer_follow_picks directly');

/* ---------- 2. What a save refuses ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_set_writer_follow_picks(array['teacher'], ' ') $$, '23514', null,
  'a save needs a reason');
select throws_ok($$ select public.admin_set_writer_follow_picks(
    array['teacher', 'adult_writer', 'pending_check', 'blocker'], 'Week') $$,
  '23514', null, 'a fourth writer is refused');
select throws_ok($$ select public.admin_set_writer_follow_picks(array['nobody_by_this_name'], 'Week') $$,
  '23514', null, 'an unknown username is refused');
select throws_ok($$ select public.admin_set_writer_follow_picks(array['teacher', '@teacher'], 'Week') $$,
  '23514', null, 'the same writer twice is refused, however the username is typed');
select throws_ok($$ select public.admin_set_writer_follow_picks(array['teen_17'], 'Week') $$,
  '23514', null, 'a writer who may not be suggested is refused');

/* ---------- 3. A save, in order, logged ---------- */

select lives_ok($$ select public.admin_set_writer_follow_picks(array['@teacher', 'adult_writer'], 'Week 48') $$,
  'an admin saves two writers');
select is((select array_agg(pick ->> 'handle' order by ordinality)
           from jsonb_array_elements(public.admin_writer_follow_picks()) with ordinality as picks (pick, ordinality)),
  array['teacher', 'adult_writer'], 'the staff screen lists the picks in order');
select is((select count(*)::integer from public.writer_follow_picks where removed_at is null), 2,
  'allowed: writer_follow_picks_select_featured_staff: an admin reads the picks');
select is((select after_values -> 'handles' from public.audit_log
           where action = 'featured.writers_set' order by created_at desc limit 1),
  '["teacher", "adult_writer"]'::jsonb, 'the save is in the audit log with the new list');

/* ---------- 4. What readers get ---------- */

select pg_temp.sign_out();
select is(pg_temp.to_follow(), array['teacher', 'adult_writer'], 'a visitor sees the picks in order');
select is(pg_temp.source(), 'picked', 'the list says the picks came from staff');
select ok(public.writers_to_follow_now()::text not like '%00000000-0000-4000-8000-%',
  'the list carries no user ID');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.to_follow(), array['teacher'], 'a writer never sees themself in the list');

-- adult_writer blocks teacher: neither sees the other, so no pick shows for either of them.
reset role;
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(not ('adult_writer' = any (pg_temp.to_follow())), 'a pick is hidden across a block');
select is(pg_temp.source(), 'automatic', 'with no pick this reader may see, the automatic list shows');

-- teacher turns suggestions off after the pick: they leave the list at once.
reset role;
update public.profiles set suggest_me = false where id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_out();
select is(pg_temp.to_follow(), array['adult_writer'], 'a writer who turned suggestions off leaves the list');
reset role;
update public.profiles set suggest_me = true where id = '00000000-0000-4000-8000-000000000007';

/* ---------- 5. The automatic list ---------- */

-- Six people follow teacher today, so teacher gained the most followers this week.
insert into public.follows_users (user_id, followed_user_id)
select follower_id::uuid, '00000000-0000-4000-8000-000000000007'
from unnest(array['00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000008',
                  '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000010',
                  '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000012']) as follower_id
on conflict (user_id, followed_user_id) do update set created_at = now();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_set_writer_follow_picks('{}', 'Back to automatic') $$,
  'an admin clears the picks');
select pg_temp.sign_out();
select is(pg_temp.source(), 'automatic', 'with no picks, the list is automatic');
select is((public.writers_to_follow_now() -> 'writers' -> 0 ->> 'handle'), 'teacher',
  'the writer who gained the most followers this week comes first');
select ok((public.writers_to_follow_now() -> 'writers' -> 0 ->> 'followers_this_week')::integer >= 5,
  'a gain of 5 or more is shown');

select * from finish();
rollback;
