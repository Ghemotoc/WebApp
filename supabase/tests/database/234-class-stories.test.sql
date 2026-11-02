-- Database tests for stories shared only with a class (bundle CLASSES, part c; story S1-E8-11).
-- What it proves:
-- - a student shares their own story with a class they are in; a class they aren't in is refused,
--   and the teacher can never change it (criterion: only the writer makes it public);
-- - while shared, only the writer, the class's fully active members and our moderation team read
--   it: an adult outside the class and a signed-out visitor get nothing, not its page, a chapter,
--   its place in a list or on the writer's profile;
-- - even classmates find it only on the class's page, never in a public list;
-- - a new chapter tells only followers who are in the class;
-- - made public again, everyone may read it under the usual rating rules;
-- - a locked class is no longer offered to share with.
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), teacher (…07), moderator
-- (…10, staff). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
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
-- The story's address and its first chapter's code, read past the policies.
create function pg_temp.slug() returns text language sql security definer as $$
  select slug from public.stories where id = '00000000-0000-4000-9000-0000000c1a55' $$;
create function pg_temp.first_code() returns text language sql security definer as $$
  select code from public.chapters where story_id = '00000000-0000-4000-9000-0000000c1a55'
    and deleted_at is null order by position limit 1 $$;
-- How many of the writer's stories a public list shows the caller.
create function pg_temp.writer_list_total() returns integer language sql as $$
  select (public.browse_stories('writer', 'kid_14_ok') ->> 'total')::integer $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Minors take part in a class, so this test runs with the age gate on (as in tests 232 and 233).
update public.feature_flags set is_enabled = false where key = 'adults_only';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- 1. A class, a student's story and sharing it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.create_class_space('Clasa a X-a', 'Cercul de lectură.');
insert into kept select 'code', public.make_class_invite('clasa-a-x-a', 30, 10) ->> 'code';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.join_class_space((select value from kept where name = 'code'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.join_class_space((select value from kept where name = 'code'));

-- kid_14_ok writes a 13+ story with one published chapter.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select public.create_story('Caietul verde', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
  '{"kind": "automatic"}', '00000000-0000-4000-9000-0000000c1a55',
  '{"rating": "13_plus", "ai_disclosure": "no_ai"}');
select public.create_chapter(pg_temp.slug());
select public.save_chapter_draft(pg_temp.first_code(), 'Începutul', 'Prima zi de școală.', 1);
select public.publish_chapter(pg_temp.first_code());

select is(public.story_class_share(pg_temp.slug()) -> 'choices',
  '[{"name": "Clasa a X-a", "slug": "clasa-a-x-a"}]'::jsonb,
  'the writer may share with the class they are in');
select is(pg_temp.hint_of($$select public.set_story_class(pg_temp.slug(), 'fantasy-writers-circle')$$),
  'class:not_yours', 'but not with a space that isn''t one of their classes');
select is(public.set_story_class(pg_temp.slug(), 'clasa-a-x-a') -> 'class',
  '{"name": "Clasa a X-a", "slug": "clasa-a-x-a"}'::jsonb, 'they share it only with the class');

-- allowed: the teacher holds every power in the class, yet can't touch a student's story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.set_story_class(pg_temp.slug(), null)$$),
  'story:missing', 'the teacher can never make a student''s story public');

/* ---------- 2. Who reads a class-only story ---------- */

select isnt(public.get_story_page(pg_temp.slug()), null, 'the teacher reads it, as a member of the class');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select isnt(public.get_story_page(pg_temp.slug()), null, 'a classmate reads its page');
select isnt(public.get_chapter(pg_temp.slug(), pg_temp.first_code()), null, 'and its chapter');
select is(jsonb_array_length(public.class_space_stories('clasa-a-x-a')), 1,
  'and finds it on the class''s page');
select is(pg_temp.writer_list_total(), 0, 'but never in a public list, even as a classmate');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.get_story_page(pg_temp.slug()), null, 'an adult outside the class gets no page');
select is(public.get_chapter(pg_temp.slug(), pg_temp.first_code()), null, 'and no chapter');
select is(pg_temp.writer_list_total(), 0, 'and no place in a list');
select is(jsonb_array_length(public.class_space_stories('clasa-a-x-a')), 0,
  'and the class''s stories are an empty list');
select is(coalesce(jsonb_array_length(public.get_writer_profile('kid_14_ok') -> 'stories'), 0), 0,
  'and the writer''s profile doesn''t show it');

select pg_temp.sign_out();
select is(public.get_story_page(pg_temp.slug()), null, 'a signed-out visitor gets nothing either');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select isnt(public.get_story_page(pg_temp.slug()), null, 'our moderation team can open it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select isnt(public.get_story_page(pg_temp.slug()), null, 'the writer always reads it');

/* ---------- 3. A new chapter tells only followers in the class ---------- */

reset role;
insert into public.follows_users (user_id, followed_user_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003')
on conflict do nothing;
delete from public.notifications where kind = 'new_chapter'
  and user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
select public.notify_chapter_published(jsonb_build_object(
  'story_id', '00000000-0000-4000-9000-0000000c1a55',
  'chapter_id', (select id from public.chapters where code = pg_temp.first_code())));
select is((select count(*)::integer from public.notifications
  where kind = 'new_chapter' and user_id = '00000000-0000-4000-8000-000000000002'), 1,
  'a follower in the class is told about a new chapter');
select is((select count(*)::integer from public.notifications
  where kind = 'new_chapter' and user_id = '00000000-0000-4000-8000-000000000001'), 0,
  'a follower outside the class isn''t, so they never learn its title');

/* ---------- 4. Public again, and a locked class ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.set_story_class(pg_temp.slug(), null) -> 'class_only', 'false'::jsonb,
  'the writer makes it public again');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select isnt(public.get_story_page(pg_temp.slug()), null, 'and the adult outside the class reads it now');
select is(pg_temp.writer_list_total(), 1, 'and finds it in the writer''s list');

reset role;
update public.spaces set locks_at = now() - interval '1 minute' where slug = 'clasa-a-x-a';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.story_class_share(pg_temp.slug()) -> 'choices', '[]'::jsonb,
  'a locked class is no longer offered to share with');
select is(pg_temp.hint_of($$select public.set_story_class(pg_temp.slug(), 'clasa-a-x-a')$$),
  'class:not_yours', 'and sharing with it is refused');

/* ---------- 5. The gate is internal ---------- */

select ok(not has_function_privilege('authenticated', 'public.story_class_allows(boolean, uuid, uuid)', 'execute'),
  'the reading gate can''t be called from the app');

select * from finish();
rollback;
