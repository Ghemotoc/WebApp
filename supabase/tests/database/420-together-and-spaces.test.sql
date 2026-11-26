-- Database tests for bundle BOOKS-7, Together and spaces (user stories 7.1 to 7.12, boards F01 to
-- F12).
-- What it proves:
-- - a moderator invitation waits for the member to accept or decline, sends them a notification
--   under Follows, and only an accepted one gives the powers (user stories 7.7 and 7.10);
-- - blocking takes someone out of a space and keeps them from asking again until unblocked; the
--   owner, moderators with the members power and our moderation team see the list, nobody else
--   (policy space_blocks_select_runners allowed and denied; user story 7.11);
-- - a forum's threads sort by latest activity, newest or most replies, page by page, with the
--   total (user stories 7.3 and 7.8);
-- - the forum search sorts the same way and says how many results there are (user story 7.2);
-- - the spaces list splits into Joined and More spaces and sorts by members or newest (7.6);
-- - the space's log filters by who acted (user story 7.12).
-- Seed: "fantasy-writers-circle" (16+, owned by adult_writer, approve to join, teacher a member).
-- Personas: adult_writer (…01), teen_17 (…02), teacher (…07), moderator (…10), blocker (…15).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint a statement raises, 'ok' when it runs, or the message when there is no hint.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
  raised_message text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint, raised_message = message_text;
  return coalesce(nullif(raised_hint, ''), raised_message);
end;
$$;
-- A person's role in the seed's 16+ space, read past the policies.
create function pg_temp.role_of(persona_id text) returns text language sql security definer as $$
  select space_members.role::text || ' ' || space_members.status::text from public.space_members
  where space_members.space_id = '00000000-0000-4000-a000-000000000a01' and space_members.user_id = persona_id::uuid;
$$;
-- Puts a persona into the 16+ space as a plain member, as approving them would.
create function pg_temp.add_member(persona_id text) returns void language sql security definer as $$
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values (persona_id::uuid, '00000000-0000-4000-a000-000000000a01', 'member', 'active', now());
$$;
-- The newest action in the space's log, read past the policies.
create function pg_temp.last_log() returns text language sql security definer as $$
  select log.action from public.space_moderation_log as log
  where log.space_id = '00000000-0000-4000-a000-000000000a01' order by log.created_at desc, log.id desc limit 1;
$$;
-- How many notifications of one kind a persona has, read past the policies.
create function pg_temp.notification_count(persona_id text, wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = persona_id::uuid and notifications.kind::text = wanted;
$$;
-- Gives a thread (and its first post) its start and its latest activity, as if hours ago.
create function pg_temp.age_thread(wanted_title text, started_hours integer, bumped_hours integer)
returns void language sql security definer as $$
  update public.forum_threads
  set created_at = now() - make_interval(hours => started_hours),
      bumped_at = now() - make_interval(hours => bumped_hours)
  where forum_threads.title = wanted_title;
  update public.forum_posts
  set created_at = now() - make_interval(hours => started_hours)
  where forum_posts.post_number = 1
    and forum_posts.thread_id = (select forum_threads.id from public.forum_threads where forum_threads.title = wanted_title);
$$;
-- The thread titles of one forum page, in order.
create function pg_temp.titles(listing jsonb) returns text language sql as $$
  select string_agg(entry ->> 'title', ', ' order by place)
  from jsonb_array_elements(listing -> 'threads') with ordinality as rows (entry, place);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The seed accounts are new, so the new-account limits apply; this test posts more than they allow.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';
-- The March flag keeps under-18s read-only (adults_only); this test is about the full app.
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
select pg_temp.add_member('00000000-0000-4000-8000-000000000015');

/* ---------- 1. Moderator invitations (user stories 7.7 and 7.10) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_space_moderator('fantasy-writers-circle', 'teacher', array['members']::public.space_power[]) ->> 'outcome',
  'invited', 'the owner invites a member to help run the space');
select is(pg_temp.notification_count('00000000-0000-4000-8000-000000000007', 'space_moderator_invited'), 1,
  'the member is told about the invitation');
select is(public.notification_category('space_moderator_invited'), 'follows',
  'the invitation sits under Follows with the other space invitations');
select is((select entry -> 'invited_powers' from jsonb_array_elements(public.space_member_list('fantasy-writers-circle')) as entry
           where entry -> 'person' ->> 'handle' = 'teacher'),
  '["members"]'::jsonb, 'the owner sees the waiting invitation on the member list');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.hint_of($$select public.answer_space_moderator_invite('fantasy-writers-circle', true)$$),
  'invite:missing', 'someone who wasn''t invited has nothing to accept');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.space_page('fantasy-writers-circle') -> 'viewer' -> 'moderator_invite', '["members"]'::jsonb,
  'the space''s page shows the member their invitation');
select is(public.answer_space_moderator_invite('fantasy-writers-circle', false) ->> 'outcome', 'declined',
  'the member declines');
select is(pg_temp.role_of('00000000-0000-4000-8000-000000000007'), 'member active', 'declining leaves them a member');
select is(pg_temp.last_log(), 'moderator_invite_declined', 'declining is in the space''s log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_space_moderator('fantasy-writers-circle', 'teacher', array['members']::public.space_power[]);
select is(public.set_space_moderator('fantasy-writers-circle', 'teacher', '{}'::public.space_power[]) ->> 'outcome',
  'invite_cancelled', 'the owner takes a waiting invitation back');
select public.set_space_moderator('fantasy-writers-circle', 'teacher', array['members']::public.space_power[]);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.answer_space_moderator_invite('fantasy-writers-circle', true) ->> 'outcome', 'accepted',
  'the member accepts a new invitation');
select is(pg_temp.role_of('00000000-0000-4000-8000-000000000007'), 'moderator active',
  'the powers start only once they accept');

/* ---------- 2. Blocking (user story 7.11) ---------- */

select is(public.block_space_member('fantasy-writers-circle', 'blocker', 'Spam repetat.') ->> 'blocked', 'true',
  'a moderator with the members power blocks a member');
select is(pg_temp.role_of('00000000-0000-4000-8000-000000000015'), null, 'the blocked person is out of the space');
select is(pg_temp.last_log(), 'member_blocked', 'blocking is in the space''s log');
select is(pg_temp.hint_of($$select public.block_space_member('fantasy-writers-circle', 'adult_writer')$$),
  'member:owner', 'nobody blocks the owner');
select is((select count(*)::integer from public.space_blocks), 1,
  'allowed: space_blocks_select_runners: a moderator with the members power sees the block');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.space_blocks), 1,
  'allowed: space_blocks_select_runners: the owner sees the block');
select is(public.space_blocked_members('fantasy-writers-circle') -> 0 -> 'person' ->> 'handle', 'blocker',
  'the members page lists the blocked person by handle');
select is(position('00000000-0000-4000-8000' in public.space_blocked_members('fantasy-writers-circle')::text), 0,
  'the blocked list never shows a user ID');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.space_blocks), 0,
  'denied: space_blocks_select_runners: the blocked person never sees the list');
select is((public.space_page('fantasy-writers-circle') -> 'viewer' ->> 'is_blocked')::boolean, true,
  'the space''s page tells the blocked person why there is no Join');
select is(pg_temp.hint_of($$select public.join_space('fantasy-writers-circle')$$), 'space:blocked',
  'the blocked person can''t ask to join again');
select is(pg_temp.hint_of($$select public.space_blocked_members('fantasy-writers-circle')$$), 'space:not_allowed',
  'without the members power there is no blocked list');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.space_blocks), 0,
  'denied: space_blocks_select_runners: someone outside the space sees none of it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.space_blocks), 1,
  'allowed: space_blocks_select_runners: our moderation team sees every space''s blocks');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.unblock_space_member('fantasy-writers-circle', '@blocker') ->> 'unblocked', 'true',
  'the owner unblocks');
select is(pg_temp.last_log(), 'member_unblocked', 'unblocking is in the space''s log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.join_space('fantasy-writers-circle') ->> 'status', 'pending',
  'once unblocked, they can ask to join again');

/* ---------- 3. Sorting a forum's threads (user stories 7.3 and 7.8) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.start_forum_thread('space-fantasy-writers-circle', 'Firul A zq', 'Unu.');
select public.start_forum_thread('space-fantasy-writers-circle', 'Firul B zq', 'Doi.');
select public.start_forum_thread('space-fantasy-writers-circle', 'Firul C zq', 'Trei.');
select public.reply_to_forum_thread((select thread_number from public.forum_threads where title = 'Firul A zq'), 'Răspuns unu.');
select public.reply_to_forum_thread((select thread_number from public.forum_threads where title = 'Firul A zq'), 'Răspuns doi.');
-- A started first and was answered last; C is the newest; B has had nothing since it started.
select pg_temp.age_thread('Firul A zq', 30, 1);
select pg_temp.age_thread('Firul B zq', 20, 20);
select pg_temp.age_thread('Firul C zq', 10, 10);
select is(pg_temp.titles(public.forum_thread_list('space-fantasy-writers-circle')), 'Firul A zq, Firul C zq, Firul B zq',
  'latest activity first by default');
select is(pg_temp.titles(public.forum_thread_list('space-fantasy-writers-circle', null, 'newest')), 'Firul C zq, Firul B zq, Firul A zq',
  'newest first');
select is(pg_temp.titles(public.forum_thread_list('space-fantasy-writers-circle', null, 'replies')), 'Firul A zq, Firul C zq, Firul B zq',
  'most replies first, the rest by latest activity');
select is((public.forum_thread_list('space-fantasy-writers-circle') ->> 'total')::integer, 3,
  'the list says how many threads there are ("7 of 312")');
select set_config('role', 'postgres', true);
update public.settings set value = '2'::jsonb where key = 'forum_threads_page_size';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.forum_thread_list('space-fantasy-writers-circle', null, 'newest') ->> 'has_more')::boolean, true,
  'a full page says there is more');
select is(pg_temp.titles(public.forum_thread_list('space-fantasy-writers-circle', null, 'newest', 2)), 'Firul A zq',
  'Show more threads skips the ones already shown, in the same order');

/* ---------- 4. Sorting the forum search (user story 7.2) ---------- */

select is((public.search_forum_posts('Firul', 'space-fantasy-writers-circle', null, 0, 'ro', 'newest') -> 'results' -> 0 ->> 'thread_title'),
  'Firul C zq', 'the search sorts newest first');
select is((public.search_forum_posts('Firul', 'space-fantasy-writers-circle', null, 0, 'ro', 'replies') -> 'results' -> 0 ->> 'reply_count')::integer,
  2, 'most replies first, and each result says how many replies its thread has');
select is((public.search_forum_posts('Firul', 'space-fantasy-writers-circle') ->> 'total')::integer,
  jsonb_array_length(public.search_forum_posts('Firul', 'space-fantasy-writers-circle') -> 'results'),
  'the search says how many results it found');

/* ---------- 5. Joined and More spaces (user story 7.6) ---------- */

select ok(public.space_list(0, 50, 'latest', true)::text like '%fantasy-writers-circle%',
  'Joined lists the spaces the caller is in');
select ok(public.space_list(0, 50, 'latest', false)::text not like '%fantasy-writers-circle%',
  'More spaces leaves them out');

/* ---------- 6. The log by who acted (user story 7.12) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from jsonb_array_elements(public.space_log('fantasy-writers-circle', 0, 'teacher') -> 'entries') as entry
           where entry -> 'actor' ->> 'handle' is distinct from 'teacher'),
  0, 'Who shows only the actions of the person picked');

/* ---------- 7. The adverts the boards draw (F02, F03, F06, F08) ---------- */

select is((select string_agg(slot_key || ':' || page_key || ':' || position, ',' order by slot_key)
             from public.ad_slots
            where slot_key in ('forum_search_wide', 'forum_side', 'forum_wide', 'spaces_wide', 'space_side')),
  'forum_search_wide:forum_search:1,forum_side:forum:1,forum_wide:forum:2,space_side:space:2,spaces_wide:spaces:1',
  'the forum search, a forum, the spaces list and a space each have the slots their boards draw');
select is((select max(slot_count)::integer from (select count(*) as slot_count from public.ad_slots group by page_key) as per_page),
  2, 'no page has more than two adverts (decided 17 Oct 2026, 11:53)');

select * from finish();
rollback;
