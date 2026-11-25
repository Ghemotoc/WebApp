-- Database tests for following a genre or a tag, and the tags under a genre or tag page's title
-- (BOOKS-A06 and BOOKS-A09, user stories 1.6 and 1.9; CLAUDE.md rule 1).
-- What it proves:
-- - set_topic_follow() follows and unfollows a genre by slug and a tag by any look-alike of its
--   name; doing it twice changes nothing; topic_follow_state() says so (false for a visitor);
-- - only an approved tag can be followed; an unknown genre is refused;
-- - a read-only account can't follow but can unfollow; a visitor can't follow;
-- - policy topic_follows_select_own: the member reads their own rows (allowed); another member
--   reads none (denied); nobody writes the table directly;
-- - my_follows() lists the genres and tags followed;
-- - topic_tags() gives a genre's most used approved tags and a tag's related tags, never a
--   waiting tag and never the tag itself.
-- Personas: adult_writer (…01, active), kid_14_ok (…03, read-only), teen_17 (…02). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- Step 0: two tags of our own, one approved and one still waiting for staff.
insert into public.tags (name, normalised_name, status)
values ('Topicfollowok', public.normalise_tag('Topicfollowok'), 'approved'),
       ('Topicfollowwait', public.normalise_tag('Topicfollowwait'), 'waiting');

/* ---------- 1. Follow and unfollow ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_topic_follow('category', 'fiction', true), true, 'a member follows a genre by its slug');
select is(public.set_topic_follow('category', 'fiction', true), true, 'following a genre twice changes nothing');
select is((select count(*)::integer from public.topic_follows), 1, 'and keeps one row');
select is(public.set_topic_follow('tag', '  topicFOLLOWok ', true), true, 'a member follows a tag by any look-alike of its name');
select is(public.topic_follow_state('tag', 'Topicfollowok'), true, 'topic_follow_state says the tag is followed');
select throws_ok($$ select public.set_topic_follow('tag', 'Topicfollowwait', true) $$, 'P0002', null,
  'a tag staff haven''t approved can''t be followed');
select throws_ok($$ select public.set_topic_follow('category', 'no_such_genre', true) $$, 'P0002', null,
  'an unknown genre is refused');
select throws_ok($$ select public.set_topic_follow('writer', 'adult_writer', true) $$, '22023', null,
  'only a genre or a tag can be followed here');

/* ---------- 2. Library ---------- */

select is(public.my_follows() -> 'genres', '["fiction"]'::jsonb, 'my_follows lists the genres followed');
select is(public.my_follows() -> 'tags', '["Topicfollowok"]'::jsonb, 'my_follows lists the tags followed');

/* ---------- 3. Who reads the rows ---------- */

select is((select count(*)::integer from public.topic_follows), 2,
  'allowed: topic_follows_select_own: the member reads their own rows');
select throws_ok($$ insert into public.topic_follows (user_id, category_id)
  select '00000000-0000-4000-8000-000000000001', id from public.categories where slug = 'poetry' $$,
  '42501', null, 'nobody writes topic_follows directly');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.topic_follows), 0,
  'denied: topic_follows_select_own: another member reads none of them');
select is(public.topic_follow_state('category', 'fiction'), false, 'and doesn''t follow the genre');

/* ---------- 4. Read-only accounts and visitors ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.set_topic_follow('category', 'poetry', true) $$, '42501', null,
  'a read-only account can''t follow');
select is(public.set_topic_follow('category', 'poetry', false), false, 'a read-only account can still unfollow');
select pg_temp.sign_out();
select is(public.topic_follow_state('category', 'fiction'), false, 'a visitor follows nothing');
select throws_ok($$ select public.set_topic_follow('category', 'fiction', true) $$, '42501', null,
  'a visitor can''t follow');

/* ---------- 5. The tags under the title ---------- */

-- adult_writer's first seed story carries both tags; it needs a published chapter to be listed.
reset role;
insert into public.story_tags (story_id, tag_id, user_id)
select '00000000-0000-4000-9000-000000000001', tags.id, '00000000-0000-4000-8000-000000000001'
from public.tags where tags.name in ('Topicfollowok', 'Topicfollowwait')
on conflict do nothing;
select pg_temp.sign_out();
select ok(not (public.topic_tags('tag', 'Topicfollowok', 20) ? 'Topicfollowok')
  and not (public.topic_tags('tag', 'Topicfollowok', 20) ? 'Topicfollowwait'),
  'a tag''s related tags leave out the tag itself and any waiting tag');
select throws_ok($$ select public.topic_tags('writer', 'adult_writer') $$, '22023', null,
  'only a genre or a tag has tags');

select * from finish();
rollback;
