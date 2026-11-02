-- Database tests for the staff pilot set-up and archiving (bundle CLASSES, part d; story S1-E8-11).
-- What it proves:
-- - staff with Schools access set up a class for a named teacher, with the school's name, and the
--   teacher owns it (criterion 10); support staff and members are refused; an account without the
--   Teacher badge can't be named; a class without a school is refused; it is in the audit log;
-- - staff list every class and correct its school, logged; the teacher's own class has no school
--   until staff add one;
-- - staff make the class's code for the teacher to print (make_class_invite(), criterion 10);
-- - the teacher archives the class: it locks now, members still read it, nobody posts or joins,
--   it can't be unlocked or archived twice, and a plain member can't archive it (criterion 8);
-- - an open space is never archived.
-- Personas: adult_writer (…01), pending_check (…05), teacher (…07), moderator (…10, with the
-- Schools permission), support (…11). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
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
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';
create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- 1. Staff set up a pilot class ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(pg_temp.hint_of($$select public.admin_create_class_space('teacher', 'Clasa a V-a pilot', 'Școala Gimnazială nr. 1', 'Cercul de scriere.')$$),
  'not_allowed', 'support staff can''t set up a class');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$select public.admin_class_spaces()$$), 'not_allowed', 'nor can a member list them');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of($$select public.admin_create_class_space('adult_writer', 'Clasa a V-a pilot', 'Școala Gimnazială nr. 1', 'Cercul de scriere.')$$),
  'not_a_teacher', 'staff can only name an account with the Teacher badge');
select is(pg_temp.hint_of($$select public.admin_create_class_space('teacher', 'Clasa a V-a pilot', '  ', 'Cercul de scriere.')$$),
  'school:needed', 'and a pilot class always names its school');
select is(public.admin_create_class_space('teacher', 'Clasa a V-a pilot', 'Școala Gimnazială nr. 1', 'Cercul de scriere.') ->> 'slug',
  'clasa-a-v-a-pilot', 'staff with Schools access set up the class');

select pg_temp.as_postgres();
select is((select profiles.handle from public.spaces join public.profiles on profiles.id = spaces.user_id
           where spaces.slug = 'clasa-a-v-a-pilot'), 'teacher', 'the named teacher owns it');
select is((select count(*)::integer from public.audit_log where action = 'class_space.created'
           and target_user_id = '00000000-0000-4000-8000-000000000007'), 1, 'and it is in the audit log');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select element ->> 'school_name' from jsonb_array_elements(public.admin_class_spaces()) as element
           where element ->> 'slug' = 'clasa-a-v-a-pilot'), 'Școala Gimnazială nr. 1', 'staff see it with its school');
insert into kept select 'code', public.make_class_invite('clasa-a-v-a-pilot', 30, 30) ->> 'code';
select isnt((select value from kept where name = 'code'), null, 'staff make the code for the teacher to print');

/* ---------- 2. The school on a teacher's own class ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa proprie', 'A teacher''s own class.');
select is(public.space_page('clasa-proprie') ->> 'school_name', null, 'a teacher''s own class has no school yet');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_set_class_school('clasa-proprie', 'Liceul Teoretic') ->> 'school_name', 'Liceul Teoretic',
  'staff add it');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'class_space.school_changed'), 1,
  'and the change is logged');

/* ---------- 3. Archiving ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select public.join_class_space((select value from kept where name = 'code'));
select is(pg_temp.hint_of($$select public.archive_class_space('clasa-a-v-a-pilot')$$), 'space:not_allowed',
  'a plain member can''t archive the class');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'thread', public.start_forum_thread('space-clasa-a-v-a-pilot', 'Tema', 'Scrieți o poveste.') ->> 'thread_number';
select is(public.archive_class_space('clasa-a-v-a-pilot') ->> 'is_locked', 'true', 'the teacher archives it and it locks now');
select is(public.space_page('clasa-a-v-a-pilot') ->> 'is_archived', 'true', 'the page says it is archived');
select is(pg_temp.hint_of($$select public.set_class_lock('clasa-a-v-a-pilot', null)$$), 'space:archived',
  'nobody unlocks an archived class');
select is(pg_temp.hint_of($$select public.archive_class_space('clasa-a-v-a-pilot')$$), 'space:archived',
  'or archives it twice');
select is(pg_temp.hint_of($$select public.make_class_invite('clasa-a-v-a-pilot')$$), 'space:locked',
  'and it makes no codes');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select isnt(public.forum_thread((select value::bigint from kept where name = 'thread')), null,
  'a member still reads its threads');
select is(pg_temp.hint_of(format($$select public.reply_to_forum_thread(%s, 'Încă ceva')$$, (select value from kept where name = 'thread'))),
  'space:locked', 'but nobody posts');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.space_moderation_log where action = 'class_archived'), 1,
  'archiving is in the space''s log');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$select public.archive_class_space('fantasy-writers-circle')$$), 'space:not_class',
  'an open space is never archived');

select * from finish();
rollback;
