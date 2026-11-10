-- Database tests for a space's moderators hiding and moving posts (bundle GAPS-10, part b; story
-- S1-E8-07; architecture 1.8.1: the server decides, not the menu).
-- What it proves:
-- - the owner and a moderator with the posts power hide a reply in their space with a reason: it
--   disappears for members and visitors, its writer still sees it marked as hidden by the space,
--   the moderators still see it and can show it again; every step is in the space's log;
-- - nobody else can: a member, a moderator without the posts power, anyone in the main forums;
-- - a moderator can't act on the owner's posts, and a thread's first post is never hidden or moved;
-- - our moderation team's decision replaces a space's hide, and the space can't undo the team's;
-- - a reply moves to another thread of the same space, takes the next number there, is marked as
--   moved, stops being the old thread's answer, and a quote of it still links to it; it can't
--   move to a thread outside the space, a locked thread or its own thread;
-- - a thread our team hid takes no moved replies and its replies can't be changed by the space,
--   and a suspended moderator can do none of it.
-- No new table or policy: one column on moderated_items (read only by moderation staff, as
-- before) and one on forum_posts (read only through the forum functions).
-- Personas: adult_writer (…01, owns the seed's 16+ space), teacher (…07, made a moderator here),
-- moderator (…10, our team), blocker (…15, a plain member). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The hint a statement raises, 'ok' when it runs, or the SQLSTATE when it raises without a hint.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return coalesce(nullif(raised_hint, ''), sqlstate);
end;
$$;
-- Thread numbers the test names later, kept where every role can read them.
create temporary table named (label text primary key, value text) on commit drop;
grant all on named to anon, authenticated;
create function pg_temp.named(wanted text) returns bigint language sql as $$
  select value::bigint from named where label = wanted;
$$;
-- A post's ID by its words, read past the policies.
create function pg_temp.post_id(words text) returns uuid language sql security definer as $$
  select id from public.forum_posts where body = words;
$$;
-- One post of a thread as the caller gets it, by its words; null when the caller doesn't get it.
create function pg_temp.post(label text, words text) returns jsonb language sql as $$
  select post from jsonb_array_elements((public.forum_thread(pg_temp.named(label))) -> 'posts') as post
  where post ->> 'id' = pg_temp.post_id(words)::text;
$$;
-- The newest action in the seed space's log, read past the policies.
create function pg_temp.last_log() returns text language sql security definer as $$
  select log.action || ' ' || coalesce(log.note, '') from public.space_moderation_log as log
  where log.space_id = '00000000-0000-4000-a000-000000000a01' order by log.created_at desc, log.id desc limit 1;
$$;
-- Puts a persona into the 16+ space as a plain member, as approving them would.
create function pg_temp.add_member(persona_id text) returns void language sql as $$
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values (persona_id::uuid, '00000000-0000-4000-a000-000000000a01', 'member', 'active', now())
  on conflict do nothing;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';
-- The March flag keeps under-18s read-only (adults_only); this test is about the full app.
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
select pg_temp.add_member('00000000-0000-4000-8000-000000000007');
select pg_temp.add_member('00000000-0000-4000-8000-000000000015');

-- Two threads in the space and one in the main forums, with replies.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'one', (public.start_forum_thread('space-fantasy-writers-circle', 'Fir unu zq', 'Primul unu.')) ->> 'thread_number';
insert into named select 'two', (public.start_forum_thread('space-fantasy-writers-circle', 'Fir doi zq', 'Primul doi.')) ->> 'thread_number';
insert into named select 'main', (public.start_forum_thread('first-chapters', 'Fir principal zq', 'Primul principal.')) ->> 'thread_number';
select public.reply_to_forum_thread(pg_temp.named('one'), 'Răspunsul proprietarului.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.reply_to_forum_thread(pg_temp.named('one'), 'Pe lângă subiect.');
select public.reply_to_forum_thread(pg_temp.named('one'), 'Răspuns bun.');
select public.reply_to_forum_thread(pg_temp.named('main'), 'În forumul mare.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.named('one'), 'Citez.', array[pg_temp.post_id('Pe lângă subiect.')]);

/* ---------- 1. Who may hide ---------- */

select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'Nu e aici') $$, pg_temp.post_id('Pe lângă subiect.'))),
  '42501', 'a member can''t hide a post');
select is((pg_temp.post('one', 'Pe lângă subiect.') ->> 'can_space_moderate')::boolean, false, 'and is offered no tools');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_space_moderator('fantasy-writers-circle', '@teacher', array['members']::public.space_power[]);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'Nu e aici') $$, pg_temp.post_id('Pe lângă subiect.'))),
  '42501', 'a moderator without the posts power can''t hide a post');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_space_moderator('fantasy-writers-circle', '@teacher', array['posts']::public.space_power[]);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((pg_temp.post('one', 'Pe lângă subiect.') ->> 'can_space_moderate')::boolean, true,
  'a moderator with the posts power is offered the tools on a member''s reply');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, ' ') $$, pg_temp.post_id('Pe lângă subiect.'))),
  'reason:empty', 'they must say why');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'x') $$, pg_temp.post_id('Răspunsul proprietarului.'))),
  'post:owner', 'a moderator can''t hide the owner''s post');
select is((pg_temp.post('one', 'Răspunsul proprietarului.') ->> 'can_space_moderate')::boolean, false, 'and is offered no tools on it');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'x') $$, pg_temp.post_id('Primul unu.'))),
  'post:owner', 'the owner''s first post is refused the same way');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'x') $$, pg_temp.post_id('În forumul mare.'))),
  '42501', 'a space moderator can''t hide a post in the main forums');
select is(pg_temp.hint_of($$ select public.space_hide_forum_post(gen_random_uuid(), 'x') $$),
  '42501', 'and a post that doesn''t exist reads the same as one that isn''t theirs');

/* ---------- 2. Hide, and show again ---------- */

select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'Nu ține de subiect') $$, pg_temp.post_id('Pe lângă subiect.'))),
  'ok', 'a moderator with the posts power hides a reply');
select is(pg_temp.last_log(), 'post_hidden Nu ține de subiect', 'and it is in the space''s log with the reason');
select is(pg_temp.post('one', 'Pe lângă subiect.') ->> 'hidden_by', 'space', 'the moderator still sees it, marked as hidden by the space');
select is(pg_temp.post('one', 'Citez.') #>> '{quotes,0,state}', 'unavailable', 'a quote of it shows no words');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'încă o dată') $$, pg_temp.post_id('Pe lângă subiect.'))),
  'post:already', 'it can''t be hidden twice');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.post('one', 'Pe lângă subiect.') ->> 'state', 'hidden', 'its writer still sees it');
select is((pg_temp.post('one', 'Pe lângă subiect.') ->> 'can_space_moderate')::boolean, false, 'but can''t show it again');
select pg_temp.sign_out();
select is(pg_temp.post('one', 'Pe lângă subiect.'), null, 'a visitor no longer gets it');
select is((public.forum_thread(pg_temp.named('one')) #>> '{thread,reply_count}')::integer, 3, 'and the thread counts one reply fewer');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$ select public.space_show_forum_post(%L, 'Am greșit') $$, pg_temp.post_id('Pe lângă subiect.'))),
  'ok', 'the owner shows it again');
select is(pg_temp.last_log(), 'post_shown Am greșit', 'and that is in the log too');
select pg_temp.sign_out();
select is(pg_temp.post('one', 'Pe lângă subiect.') ->> 'state', 'live', 'everyone gets it again');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$ select public.space_show_forum_post(%L, 'x') $$, pg_temp.post_id('Pe lângă subiect.'))),
  'post:not_hidden', 'a post that isn''t hidden can''t be shown again');

/* ---------- 3. Our team's decision wins ---------- */

select public.space_hide_forum_post(pg_temp.post_id('Pe lângă subiect.'), 'Ascuns de spațiu');
-- moderate_item() is internal (a case decision calls it), so the test runs it as the database
-- owner while the moderator stays the signed-in person.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select set_config('role', 'postgres', true);
select lives_ok(format($$ select public.moderate_item('forum_post', %L, '00000000-0000-4000-8000-000000000015', 'removed', null, 'Încalcă regulile') $$,
  pg_temp.post_id('Pe lângă subiect.')), 'our team removes a post the space had hidden');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$ select public.space_show_forum_post(%L, 'x') $$, pg_temp.post_id('Pe lângă subiect.'))),
  'post:by_team', 'and the space can''t undo the team''s decision');
select is(pg_temp.hint_of(format($$ select public.space_move_forum_post(%L, %s, 'x') $$, pg_temp.post_id('Pe lângă subiect.'), pg_temp.named('two'))),
  'post:by_team', 'or move the post');

/* ---------- 4. Move ---------- */

-- The thread's starter marks "Răspuns bun." as the answer, and teacher quotes it.
select public.mark_forum_thread_answer(pg_temp.named('one'), (select post_number from public.forum_posts where id = pg_temp.post_id('Răspuns bun.')));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread(pg_temp.named('one'), 'Citez răspunsul.', array[pg_temp.post_id('Răspuns bun.')]);
select is(pg_temp.hint_of(format($$ select public.space_move_forum_post(%L, %s, 'x') $$, pg_temp.post_id('Răspuns bun.'), pg_temp.named('main'))),
  'target:missing', 'a reply can''t move to a thread outside the space');
select is(pg_temp.hint_of(format($$ select public.space_move_forum_post(%L, %s, 'x') $$, pg_temp.post_id('Răspuns bun.'), pg_temp.named('one'))),
  'target:same', 'or to the thread it is in');
select is(pg_temp.hint_of(format($$ select public.space_move_forum_post(%L, %s, 'x') $$, pg_temp.post_id('Primul doi.'), pg_temp.named('one'))),
  'post:owner', 'a thread''s first post never moves');
select is(public.space_move_forum_post(pg_temp.post_id('Răspuns bun.'), pg_temp.named('two'), 'Ține de celălalt fir'),
  jsonb_build_object('thread_number', pg_temp.named('two'), 'post_number', 2),
  'a moderator moves a reply; it takes the next number in the other thread');
select is(pg_temp.last_log(), 'post_moved Ține de celălalt fir', 'and it is in the space''s log');
select is((pg_temp.post('two', 'Răspuns bun.') ->> 'was_moved')::boolean, true, 'the reply is marked as moved');
select is(public.forum_thread(pg_temp.named('one')) #> '{thread,answer}', 'null'::jsonb, 'the old thread no longer has it as its answer');
select is((pg_temp.post('one', 'Citez răspunsul.') #> '{quotes,0}') - 'author' - 'body',
  jsonb_build_object('number', 2, 'state', 'live', 'thread_number', pg_temp.named('two'), 'forum_slug', 'space-fantasy-writers-circle'),
  'a quote of the moved reply says where it is now');

-- A reply its writer deleted is gone for the moderators too, and our own team can act in a space.
reset role;
update public.forum_posts set deleted_at = now() where id = pg_temp.post_id('Citez răspunsul.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'x') $$, pg_temp.post_id('Citez răspunsul.'))),
  'post:missing', 'a deleted reply reads as gone, not as someone else''s');
reset role;
update public.forum_posts set deleted_at = null where id = pg_temp.post_id('Citez răspunsul.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'Ascuns de echipă, în spațiu') $$, pg_temp.post_id('Răspunsul proprietarului.'))),
  'ok', 'our moderation team can hide a reply in a space, the owner''s too');

/* ---------- 5. Threads our team took away, and a suspended moderator ---------- */

-- Our team hides thread two (moderate_item() is internal, so the database owner runs it).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select set_config('role', 'postgres', true);
select public.moderate_item('forum_thread', (select id from public.forum_threads where thread_number = pg_temp.named('two')),
  '00000000-0000-4000-8000-000000000001', 'hidden', null, 'Ascuns de echipă');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$ select public.space_move_forum_post(%L, %s, 'x') $$, pg_temp.post_id('Citez răspunsul.'), pg_temp.named('two'))),
  'target:missing', 'a reply can''t move into a thread our team hid');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'x') $$, pg_temp.post_id('Răspuns bun.'))),
  'post:missing', 'and a reply inside it is the team''s to deal with');

-- A suspended moderator moderates nothing.
reset role;
insert into public.sanctions (user_id, kind, applied_by_user_id, note, starts_at, ends_at)
values ('00000000-0000-4000-8000-000000000007', 'suspension', '00000000-0000-4000-8000-000000000010',
  'Test suspension.', now(), now() + interval '7 days');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$ select public.space_hide_forum_post(%L, 'x') $$, pg_temp.post_id('Pe lângă subiect.'))),
  '42501', 'a suspended moderator can''t hide a post');
select is(pg_temp.hint_of(format($$ select public.space_move_forum_post(%L, %s, 'x') $$, pg_temp.post_id('Citez răspunsul.'), pg_temp.named('one'))),
  '42501', 'or move one');

select * from finish();
rollback;
