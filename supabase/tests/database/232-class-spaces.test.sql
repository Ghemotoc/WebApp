-- Database tests for private class spaces and their invite codes (bundle CLASSES, part a;
-- story S1-E8-11).
-- What it proves:
-- - only an adult with the Teacher badge starts a class space (criterion 1);
-- - nobody outside the class finds it, opens it or its threads: not signed out, not another
--   adult, not in the list of spaces; "Join" is refused (criterion 3);
-- - the invite code: made with the teacher's period and number of places, shown once, reset
--   (the old code stops), ended, used up; anyone can see which class a working code is for
--   (criterion 4);
-- - students of any age join with the code; they read and post only once their account is fully
--   active (a 14-year-old still waiting for a parent's consent sees the card, not the threads)
--   (criterion 5);
-- - every invite change and join is in the space's log; platform moderators can act in any class
--   space, and their action is in the audit log too (criterion 7);
-- - a class space can't be opened to everybody, even by a direct update;
-- - the shared invites table: invites_select_admin still keeps class codes from everyone else
--   (denied), and admins read them (allowed).
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), kid_14_waiting (…04),
-- teacher (…07, with the badge), moderator (…10), admin (…09), blocker (…15). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
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
-- The space's log actions, oldest first, read past the policies.
create function pg_temp.log_actions() returns text language sql security definer as $$
  select string_agg(action, ' ' order by created_at, action) from public.space_moderation_log
  where space_id = (select id from public.spaces where slug = 'clasa-a-vii-a-b');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class (criterion 5), so this test runs as after March, with the age
-- gate on: adults_only off lets kid_14_ok (parent agreed) be fully active.
update public.feature_flags set is_enabled = false where key = 'adults_only';
-- The seed accounts are new, so the new-account limits apply; this test does more than they allow.
update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

-- Codes and thread numbers kept between steps (each step signs in as someone else).
create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- 1. Starting a class space (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$select public.create_class_space('Clasa lui Ion', 'Nu sunt profesor.')$$),
  'space:not_teacher', 'an adult without the Teacher badge can''t start a class space');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.hint_of($$select public.create_class_space('Clasa mea', 'Am 14 ani.')$$),
  'space:not_teacher', 'nor can a student');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.create_class_space('Clasa a VII-a B', 'Cercul de lectură al clasei.', 'Fii amabil.') ->> 'slug',
  'clasa-a-vii-a-b', 'the teacher starts a class space');
select is(public.space_page('clasa-a-vii-a-b') ->> 'kind', 'class', 'it is a class space');
select is(public.space_page('clasa-a-vii-a-b') ->> 'age_group', null, 'with no age group: it is for the people in the room');
insert into kept select 'thread', public.start_forum_thread('space-clasa-a-vii-a-b', 'Tema de vineri', 'Citiți primul capitol.') ->> 'thread_number';

/* ---------- 2. Private to the class (criterion 3) ---------- */

select pg_temp.sign_out();
select is(public.space_page('clasa-a-vii-a-b'), null, 'a signed-out visitor never sees it');
select is(public.forum_thread((select value::bigint from kept where name = 'thread')), null, 'nor its threads');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.space_page('clasa-a-vii-a-b'), null, 'another adult never sees it');
select ok(not (public.space_list(0, 50)::text ~ 'clasa-a-vii-a-b'), 'nor finds it in the list of spaces');
select is(public.forum_thread((select value::bigint from kept where name = 'thread')), null, 'nor opens its threads');
select is(pg_temp.hint_of($$select public.join_space('clasa-a-vii-a-b')$$), 'space:missing',
  '"Join" can''t even find it');
select is(pg_temp.hint_of($$select public.class_invite('clasa-a-vii-a-b')$$), 'space:missing',
  'and its invite card is closed to them');

/* ---------- 3. The invite code (criterion 4) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.make_class_invite('clasa-a-vii-a-b', 0)$$), 'invite:days',
  'a code works for at least a day');
select is(pg_temp.hint_of($$select public.make_class_invite('clasa-a-vii-a-b', 30, 500)$$), 'invite:admits',
  'and admits at most 200 people');
select is(public.class_invite('clasa-a-vii-a-b'), null, 'before any code there is nothing to show');
insert into kept select 'first', public.make_class_invite('clasa-a-vii-a-b', 7, 3) ->> 'code';
select matches((select value from kept where name = 'first'), '^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$',
  'the teacher gets a code, shown this once');
select is((public.class_invite('clasa-a-vii-a-b') - 'made_at' - 'expires_at'), '{"admits": 3, "used": 0}'::jsonb,
  'the card says how many it admits and how many used it, never the code');
select ok((public.class_invite('clasa-a-vii-a-b') ->> 'expires_at')::timestamptz
          between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour',
  'and it stops after the period the teacher set');
select is((select count(*)::integer from public.invites
           where code_hash = public.invite_code_hash((select value from kept where name = 'first'))), 0,
  'denied: invites_select_admin: the teacher can''t read the invites table');

select pg_temp.sign_out();
select is(public.class_invite_preview((select value from kept where name = 'first')),
  '{"status": "valid", "space": {"name": "Clasa a VII-a B", "slug": "clasa-a-vii-a-b"}}'::jsonb,
  'anyone with the code sees which class it is for, and nothing else');
select is(public.class_invite_preview('ZZZZ-ZZZZ-ZZZZ'), '{"status": "unknown"}'::jsonb, 'a made-up code is unknown');
select throws_ok(format($$select public.join_class_space(%L)$$, (select value from kept where name = 'first')),
  '42501', null, 'joining needs an account');

/* ---------- 4. Students of any age join (criterion 5) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.join_class_space(lower((select value from kept where name = 'first'))),
  '{"slug": "clasa-a-vii-a-b", "can_read": true}'::jsonb, 'a 14-year-old with a parent''s consent joins with the code');
select isnt(public.forum_thread((select value::bigint from kept where name = 'thread')), null, 'and reads the class''s threads');
select lives_ok(format($$select public.reply_to_forum_thread(%s, 'Am citit!')$$, (select value from kept where name = 'thread')),
  'and posts in them');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is(public.join_class_space((select value from kept where name = 'first')) ->> 'can_read', 'false',
  'a 14-year-old still waiting for a parent joins, but can''t read yet');
select is(public.space_page('clasa-a-vii-a-b') #>> '{viewer,waits_for_account}', 'true',
  'they see the card and why they wait');
select is(public.forum_thread((select value::bigint from kept where name = 'thread')), null, 'not the threads');
select is(pg_temp.hint_of(format($$select public.reply_to_forum_thread(%s, 'Eu?')$$, (select value from kept where name = 'thread'))) is not null,
  true, 'and can''t post');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.join_class_space((select value from kept where name = 'first')) ->> 'slug', 'clasa-a-vii-a-b',
  'a 17-year-old joins the same class: never split at 16');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.hint_of(format($$select public.join_class_space(%L)$$, (select value from kept where name = 'first'))),
  'invite:ended', 'the fourth person can''t: the code admitted three');

/* ---------- 5. Reset and end (criterion 4) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'second', public.make_class_invite('clasa-a-vii-a-b') ->> 'code';
select is(public.class_invite_preview((select value from kept where name = 'second')) ->> 'status', 'valid',
  'a new code works');
select is(public.end_class_invite('clasa-a-vii-a-b'), true, 'the teacher stops it');
select is(public.end_class_invite('clasa-a-vii-a-b'), false, 'stopping it again changes nothing');
select is(public.class_invite_preview((select value from kept where name = 'second')) ->> 'status', 'ended',
  'and it doesn''t work any more');
insert into kept select 'third', public.make_class_invite('clasa-a-vii-a-b') ->> 'code';
select pg_temp.as_postgres();
select is(pg_temp.log_actions(), 'invite_made member_joined member_joined member_joined invite_made invite_ended invite_made',
  'every code and every join is in the space''s log');

/* ---------- 6. Platform moderators and the rules (criterion 7) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select isnt(public.space_page('clasa-a-vii-a-b'), null, 'a platform moderator opens any class space');
select is(public.make_class_invite('clasa-a-vii-a-b', 14, 30) ->> 'admits', '30', 'and can reset its code');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'space.invite_made'), 1,
  'which the audit log records too');
select throws_ok($$update public.spaces set readers = 'everybody' where slug = 'clasa-a-vii-a-b'$$, '23514', null,
  'a class space can never be opened to everybody');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.invites where purpose = 'class_space') >= 1,
  'allowed: invites_select_admin: an admin reads the class invites (never the codes)');

select * from finish();
rollback;
