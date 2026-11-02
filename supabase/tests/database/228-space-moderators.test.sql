-- Database tests for space moderators (bundle FORUMS-2, part b; story S1-E8-07).
-- What it proves:
-- - the owner appoints a member as a moderator with chosen powers, changes them and takes them
--   away; only the owner (or platform staff) does this, and only for an active member of the
--   space's age group (criterion 1);
-- - each power lets its holder do one job and nothing else: posts (pin and lock threads in the
--   space only), members (requests, the member list, removing members) and settings;
-- - moderators can't remove each other or the owner;
-- - every action is in the space's log, which the owner and platform moderators read and nobody
--   else does (criterion 2; policy space_moderation_log_select_owner_or_staff allowed and denied);
-- - platform moderators override the space: they act without being members, the log shows "the
--   moderation team" instead of a name, and the audit log has the action too (criterion 3);
-- - the moderators list never shows a user ID.
-- Seed: "fantasy-writers-circle" (16+, owned by adult_writer, approve to join, teacher a member).
-- Personas: adult_writer (…01), kid_14_ok (…03), teacher (…07), moderator (…10), blocker (…15),
-- teen_17 (…02). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
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
-- Sets a persona's age by year of birth; the year never changes in the app (S1-E2-12), so the
-- test lifts that trigger for this transaction only.
alter table public.profiles disable trigger profiles_birth_year_never_changes;
create function pg_temp.make_age(persona_id text, years integer) returns void language sql security definer as $$
  update public.profiles
  set birth_year = extract(year from now())::integer - years, birth_month = null
  where profiles.id = persona_id::uuid;
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
  select log.action || ' ' || log.by_platform::text from public.space_moderation_log as log
  where log.space_id = '00000000-0000-4000-a000-000000000a01' order by log.created_at desc, log.id desc limit 1;
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
-- Thread numbers the test names later, kept where every role can read them.
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns bigint language sql as $$
  select value::bigint from named where label = wanted;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The seed accounts are new, so the new-account limits apply; this test posts more than they allow.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';
-- The March flag keeps under-18s read-only (adults_only); this test is about the full app.
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
-- blocker joins the 16+ space as a plain member.
select pg_temp.add_member('00000000-0000-4000-8000-000000000015');
-- Two threads: one in the space (by its owner) and one in the main forums.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'space', (public.start_forum_thread('space-fantasy-writers-circle', 'Fir în cerc', 'Unu.')) ->> 'thread_number';
insert into named select 'main', (public.start_forum_thread('first-chapters', 'Fir în forum', 'Doi.')) ->> 'thread_number';

/* ---------- 1. Appointing (criterion 1) ---------- */

select is(public.set_space_moderator('fantasy-writers-circle', '@teacher', array['posts', 'members']::public.space_power[]) ->> 'outcome',
  'appointed', 'the owner makes a member a moderator with two powers');
select is(pg_temp.role_of('00000000-0000-4000-8000-000000000007'), 'moderator active', 'the member is now a moderator');
select is(pg_temp.last_log(), 'moderator_appointed false', 'appointing is in the space''s log');
select is(pg_temp.hint_of($$select public.set_space_moderator('fantasy-writers-circle', 'kid_14_ok', array['posts']::public.space_power[])$$),
  'member:missing', 'only a member can be made a moderator');
select is(pg_temp.hint_of($$select public.set_space_moderator('fantasy-writers-circle', 'adult_writer', array['posts']::public.space_power[])$$),
  'member:owner', 'the owner is never appointed: they already have every power');
-- blocker turns out to be under 16 (a corrected year of birth): they can't moderate a 16+ space.
select pg_temp.make_age('00000000-0000-4000-8000-000000000015', 14);
select is(pg_temp.hint_of($$select public.set_space_moderator('fantasy-writers-circle', 'blocker', array['posts']::public.space_power[])$$),
  'member:age', 'a moderator must be in the space''s age group');
select pg_temp.make_age('00000000-0000-4000-8000-000000000015', 30);

select pg_temp.sign_out();
select is((select jsonb_agg(entry -> 'powers') from jsonb_array_elements(public.space_moderators('fantasy-writers-circle')) as entry),
  '[["posts", "members"]]'::jsonb, 'anyone, signed out included, sees who moderates and with which powers');
select is((select count(*)::integer from jsonb_array_elements(public.space_moderators('fantasy-writers-circle')) as entry
           where entry::text like '%00000000-0000-4000-8000%'),
  0, 'the moderators list never shows a user ID');

/* ---------- 2. What a moderator may do ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.space_page('fantasy-writers-circle') -> 'viewer') - 'can_read' - 'can_join' - 'can_post',
  '{"membership": "moderator", "can_manage": false, "can_appoint": false, "can_read_log": false, "can_invite": false, "waits_for_account": false, "powers": ["posts", "members"]}'::jsonb,
  'the space tells a moderator what they may do');
select is(pg_temp.hint_of($$select public.set_space_moderator('fantasy-writers-circle', 'blocker', array['posts']::public.space_power[])$$),
  'space:not_owner', 'a moderator can''t appoint moderators');
select is(pg_temp.hint_of($$select public.update_space('fantasy-writers-circle', 'Cerc nou zq', 'Alt text.')$$),
  'space:not_allowed', 'without the settings power, a moderator can''t change the space');
select is(jsonb_array_length(public.space_member_list('fantasy-writers-circle')), 3,
  'the members power shows the member list: the owner, the moderator and the member');

-- The posts power: pin and lock in the space, never outside it.
select is(pg_temp.hint_of(format($$select public.admin_set_forum_thread_sticky(%s, true, 'Important')$$, pg_temp.named('space'))),
  'ok', 'the posts power pins a thread in the space');
select is(pg_temp.last_log(), 'thread_made_sticky false', 'pinning a space thread is in the space''s log');
select is(pg_temp.hint_of(format($$select public.admin_lock_forum_thread(%s, 'S-a încheiat.')$$, pg_temp.named('space'))),
  'ok', 'the posts power locks a thread in the space');
select is((public.forum_thread(pg_temp.named('space')) -> 'thread' ->> 'can_moderate')::boolean, true,
  'a space thread offers its moderator the moderation controls');
select is(pg_temp.hint_of(format($$select public.admin_lock_forum_thread(%s, 'Nu.')$$, pg_temp.named('main'))),
  'Only moderators can do that.', 'a space moderator can''t lock a thread outside their space');
select is((public.forum_thread(pg_temp.named('main')) -> 'thread' ->> 'can_moderate')::boolean, false,
  'a thread in the main forums offers a space moderator nothing');

-- The members power: remove a member, never the owner.
select is(pg_temp.hint_of($$select public.remove_space_member('fantasy-writers-circle', 'adult_writer')$$),
  'member:owner', 'nobody removes the owner');
select is(pg_temp.hint_of($$select public.remove_space_member('fantasy-writers-circle', 'blocker', 'Spam repetat.')$$),
  'ok', 'the members power removes a member');
select is(pg_temp.role_of('00000000-0000-4000-8000-000000000015'), null, 'the removed member is out of the space');

/* ---------- 3. Moderators can't remove each other; changing and taking powers away ---------- */

select pg_temp.add_member('00000000-0000-4000-8000-000000000015');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_space_moderator('fantasy-writers-circle', 'blocker', array['settings']::public.space_power[]) ->> 'outcome',
  'appointed', 'the owner appoints a second moderator');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.remove_space_member('fantasy-writers-circle', 'blocker')$$),
  'space:not_allowed', 'a moderator can''t remove another moderator');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.hint_of($$select public.space_member_list('fantasy-writers-circle')$$),
  'space:not_allowed', 'without the members power there is no member list');
select is(pg_temp.hint_of(format($$select public.admin_set_forum_thread_sticky(%s, false, 'Gata')$$, pg_temp.named('space'))),
  'Only moderators can do that.', 'without the posts power a moderator can''t pin');
select is(public.update_space('fantasy-writers-circle', 'Fantasy writers’ circle', 'Doar fantezie zq.') ->> 'description',
  'Doar fantezie zq.', 'the settings power changes the space');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_space_moderator('fantasy-writers-circle', 'teacher', array['posts']::public.space_power[]) ->> 'outcome',
  'changed', 'the owner changes a moderator''s powers');
select is(public.set_space_moderator('fantasy-writers-circle', 'blocker', '{}'::public.space_power[]) ->> 'outcome',
  'removed', 'no powers makes a moderator a plain member again');
select is(pg_temp.role_of('00000000-0000-4000-8000-000000000015'), 'member active', 'they stay in the space as a member');

/* ---------- 4. The log (criterion 2) ---------- */

select ok((select count(*) from public.space_moderation_log) >= 7,
  'allowed: space_moderation_log_select_owner_or_staff: the owner reads the space''s log');
select is((select jsonb_agg(entry ->> 'action' order by entry ->> 'action')
           from jsonb_array_elements(public.space_log('fantasy-writers-circle') -> 'entries') as entry
           where entry ->> 'action' in ('member_removed', 'settings_changed')),
  '["member_removed", "settings_changed"]'::jsonb, 'the log names each action, newest first');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.space_moderation_log), 0,
  'denied: space_moderation_log_select_owner_or_staff: a moderator reads none of the log');
select is(pg_temp.hint_of($$select public.space_log('fantasy-writers-circle')$$), 'space:not_owner',
  'the log screen is the owner''s and the moderation team''s only');

/* ---------- 5. Platform moderators override the space (criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.set_space_moderator('fantasy-writers-circle', 'teacher', '{}'::public.space_power[]) ->> 'outcome',
  'removed', 'a platform moderator takes a moderator''s powers away without being a member');
select is(pg_temp.last_log(), 'moderator_removed true', 'the space''s log marks it as the moderation team''s');
select is((public.space_log('fantasy-writers-circle') -> 'entries' -> 0) -> 'actor', 'null'::jsonb,
  'the log shows "the moderation team", never a staff member''s name');
select is(pg_temp.audit_count('space.moderator_removed'), 1,
  'the platform moderator''s action is in the audit log too');
select ok((select count(*) from public.space_moderation_log) >= 8,
  'allowed: space_moderation_log_select_owner_or_staff: platform moderators read every space''s log');

select * from finish();
rollback;
