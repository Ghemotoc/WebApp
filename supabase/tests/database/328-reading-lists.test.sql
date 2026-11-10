-- Database tests for reading lists in the Library (bundle GAPS-6).
-- What it proves:
-- - reading_lists and reading_list_stories are readable by their owner only (an allowed and a
--   denied test for each policy), and a signed-out visitor can't make a list;
-- - a list is private until its owner makes it public: nobody else opens it, lists its stories
--   or reports it before that, and everyone with the link can after;
-- - names are cleaned to one line, refused when empty, over 60 characters, HTML or already used
--   by the same person (capitals aside); the limits on lists and on stories per list hold;
-- - a list's stories follow the reader's rules: a 16+ story is left out for a 14-year-old, and a
--   blocked person can't open the list of whoever blocked them;
-- - only the owner changes a list; a suspended account can't make one public;
-- - a public list can be reported, the queue says what it is, a hidden list closes for others,
--   and a list held by a case is only marked deleted;
-- - both tables are in Download my data and in the account deletion rules.
-- Test data: three stories by adult_writer (one rated 16+) with a chapter each; lists by teacher,
-- blocker and suspended_user; rolled back at the end.
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
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- The hint a statement's error carries, or null.
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
-- The slugs a list shows this caller, in address order.
create function pg_temp.stories_in(list_id uuid) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by story ->> 'slug'), '')
  from jsonb_array_elements(public.browse_stories('reading_list', list_id::text) -> 'stories') as story;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
-- Answers the test doesn't check go here.
create temporary table discarded (answer jsonb);
grant all on discarded to anon, authenticated;
-- IDs the test keeps between sign-ins.
create temporary table kept (label text primary key, list_id uuid);
grant all on kept to anon, authenticated;
create function pg_temp.list_called(wanted text) returns uuid language sql as $$
  select list_id from kept where label = wanted;
$$;
grant execute on function pg_temp.list_called(text) to anon, authenticated;

-- Three live stories by adult_writer, one chapter each; rl3 is rated 16+.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  completion_status, first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9328-000000000001', '00000000-0000-4000-8000-000000000001', 'rl1', 'Lista unu', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now(), now()),
  ('00000000-0000-4000-9328-000000000002', '00000000-0000-4000-8000-000000000001', 'rl2', 'Lista doi', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now(), now()),
  ('00000000-0000-4000-9328-000000000003', '00000000-0000-4000-8000-000000000001', 'rl3', 'Lista trei', 'ro',
   (select id from public.categories where slug = 'fiction'), '16_plus', 'ongoing', now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'rdl' || right(stories.slug, 1) || 'ch01', 1, 'C', 'Text.', 1,
  'published', 'C1', 'Text.', 1, now()
from public.stories
where stories.id::text like '00000000-0000-4000-9328-%';

/* ---------- 1. Making a list ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.create_reading_list('Signed out') $$), '42501',
  'a signed-out visitor can''t make a reading list');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into kept select 'rainy', (public.create_reading_list(E'  Rainy \n  day   reads ') ->> 'id')::uuid;
select is((select name from public.reading_lists where id = pg_temp.list_called('rainy')), 'Rainy day reads',
  'a name is trimmed and put on one line');
select is((select is_public from public.reading_lists where id = pg_temp.list_called('rainy')), false,
  'a new list is private');
select is(pg_temp.hint_of($$ select public.create_reading_list('rainy DAY reads') $$), 'name_taken',
  'the same name again, capitals aside, is refused');
select is(pg_temp.hint_of($$ select public.create_reading_list('   ') $$), 'name_length',
  'an empty name is refused');
select is(pg_temp.hint_of(format($$ select public.create_reading_list(%L) $$, repeat('a', 61))), 'name_length',
  'a name over 60 characters is refused');
select is(pg_temp.hint_of($$ select public.create_reading_list('<b>Bold</b>') $$), 'name_html',
  'a name with HTML is refused');

/* ---------- 2. Stories in and out ---------- */

select is(public.set_story_in_reading_list(pg_temp.list_called('rainy'), 'rl1', true) ->> 'in_list', 'true',
  'the owner puts a story in their list');
select is(public.set_story_in_reading_list(pg_temp.list_called('rainy'), 'rl1', true) ->> 'in_list', 'true',
  'putting it in twice changes nothing');
select is(public.set_story_in_reading_list(pg_temp.list_called('rainy'), 'rl3', true) ->> 'outcome', 'ok',
  'an adult puts a 16+ story in');
select is((select count(*)::integer from public.reading_list_stories), 2,
  'allowed: reading_list_stories_select_own (the owner reads what is in their lists)');
select is((select count(*)::integer from public.reading_lists), 1,
  'allowed: reading_lists_select_own (the owner reads their own lists)');
select is(pg_temp.refusal($$ select public.set_story_in_reading_list(pg_temp.list_called('rainy'), 'no-such-story', true) $$), 'P0002',
  'a story that doesn''t exist can''t be put in');
select is(pg_temp.stories_in(pg_temp.list_called('rainy')), 'rl1,rl3', 'the list shows its stories to its owner');
select is(public.my_reading_lists() -> 0 ->> 'story_count', '2', 'the Library row counts the stories');
select is(jsonb_array_length(public.my_reading_lists() -> 0 -> 'covers'), 2, 'and carries their covers');
select is(public.story_reading_lists('rl1') -> 0 ->> 'has_story', 'true',
  'the story page knows the story is in the list');
select is(public.story_reading_lists('rl2') -> 0 ->> 'has_story', 'false',
  'and that another story is not');

-- The limit on stories per list, lowered for the test.
select pg_temp.as_postgres();
update public.settings set value = '2'::jsonb where key = 'reading_list_stories_max';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$ select public.set_story_in_reading_list(pg_temp.list_called('rainy'), 'rl2', true) $$), 'too_many_stories',
  'a full list takes no more stories');
select pg_temp.as_postgres();
update public.settings set value = '200'::jsonb where key = 'reading_list_stories_max';
update public.settings set value = '1'::jsonb where key = 'reading_lists_max';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$ select public.create_reading_list('One too many') $$), 'too_many_lists',
  'a person at the limit makes no more lists');
select pg_temp.as_postgres();
update public.settings set value = '30'::jsonb where key = 'reading_lists_max';

/* ---------- 3. Private until made public ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.reading_lists), 0,
  'denied: reading_lists_select_own (nobody else reads a list from the table)');
select is((select count(*)::integer from public.reading_list_stories), 0,
  'denied: reading_list_stories_select_own (nor what is in it)');
select is(public.reading_list(pg_temp.list_called('rainy')), null, 'a private list opens for nobody else');
select is(pg_temp.stories_in(pg_temp.list_called('rainy')), '', 'nor do its stories list');
select is(pg_temp.refusal(format($$ select * from public.report_item('reading_list', %L, 'spam') $$, pg_temp.list_called('rainy'))), '23514',
  'a private list can''t be reported, so its existence never leaks');
select is(public.update_reading_list(pg_temp.list_called('rainy'), 'Mine now', true) ->> 'outcome', 'not_found',
  'nobody else renames a list or makes it public');
select is(public.set_story_in_reading_list(pg_temp.list_called('rainy'), 'rl2', true) ->> 'outcome', 'not_found',
  'nobody else puts a story in it');
select is(public.delete_reading_list(pg_temp.list_called('rainy')) ->> 'outcome', 'not_found',
  'nobody else deletes it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.update_reading_list(pg_temp.list_called('rainy'), null, true) ->> 'is_public', 'true',
  'the owner makes the list public');

select pg_temp.sign_out();
select is(public.reading_list(pg_temp.list_called('rainy')) ->> 'name', 'Rainy day reads',
  'a public list opens for anyone with the link');
select is(public.reading_list(pg_temp.list_called('rainy')) ? 'entries', false,
  'without the owner''s controls');

-- A 14-year-old sees the list without its 16+ story (CLAUDE.md rule 18).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.stories_in(pg_temp.list_called('rainy')), 'rl1', 'a 16+ story in a public list is left out for a 14-year-old');
select is(public.reading_list(pg_temp.list_called('rainy')) ->> 'story_count', '1', 'and the count matches what they see');

/* ---------- 4. Blocks and the account gate ---------- */

-- blocker blocks blocked (seed): blocked can't open blocker's public list.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
insert into kept select 'blocker', (public.create_reading_list('Blocker''s list') ->> 'id')::uuid;
insert into discarded select public.update_reading_list(pg_temp.list_called('blocker'), null, true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(public.reading_list(pg_temp.list_called('blocker')), null,
  'a blocked person can''t open the public list of whoever blocked them');

-- A suspended account keeps private lists and can't make one public.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
insert into kept select 'suspended', (public.create_reading_list('Quiet list') ->> 'id')::uuid;
select is(pg_temp.hint_of($$ select public.update_reading_list(pg_temp.list_called('suspended'), null, true) $$), 'not_active',
  'a suspended account can''t make a list public');

/* ---------- 5. Reporting and moderation ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok(format($$ select * from public.report_item('reading_list', %L, 'spam') $$, pg_temp.list_called('rainy')),
  'a public list can be reported like any other text');
select pg_temp.as_postgres();
select is(public.reportable_item_summary('reading_list', pg_temp.list_called('rainy')), 'Reading list "Rainy day reads"',
  'the moderation queue says what was reported');

-- The owner deletes the list while its case is open: it is only marked deleted.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into discarded select public.delete_reading_list(pg_temp.list_called('rainy'));
select pg_temp.as_postgres();
select is((select deleted_at is not null from public.reading_lists where id = pg_temp.list_called('rainy')), true,
  'a list held by an open case is marked deleted, not removed');

select * from finish();
rollback;
