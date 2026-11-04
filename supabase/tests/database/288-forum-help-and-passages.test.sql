-- Database tests for forum help and passages (bundle 14d IDEAS-3, part f; ideas IDEA-20261102-8 and
-- IDEA-20261102-10).
-- What it proves:
-- - idea 8: the thread's starter marks a reply "This answered it"; the list shows the thread as
--   answered and the thread links the reply at the top (criterion 1); someone else can't mark one
--   (criterion 2); the opening post and the starter's own reply can't be the answer; a deleted
--   answer stops counting; the starter can take the mark away;
-- - idea 10: a passage of a public chapter may be taken to the forums by a signed-in reader
--   (criterion 1); not by a visitor, and not from an unlisted, class-only, staff-restricted or 16+
--   story (criterion 2).
-- No new table or policy. Personas: adult_writer (…01), teacher (…07), blocker (…15). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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
-- The test thread's row in its forum's list.
create function pg_temp.list_row() returns jsonb language sql as $$
  select row_data from jsonb_array_elements(public.forum_thread_list('help-and-ideas') -> 'threads') as row_data
  where row_data ->> 'title' = 'Cum scriu un dialog?';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.settings set value = '50'::jsonb where key = 'forum_post_hourly_limit_new_account';

create temporary table kept (name text primary key, value text) on commit drop;
grant all on kept to anon, authenticated;

/* ---------- Set-up: a help thread with two replies and one by its starter ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into kept select 'thread', public.start_forum_thread('help-and-ideas', 'Cum scriu un dialog?', 'Mă încurc la linii de dialog.') ->> 'thread_number';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.reply_to_forum_thread((select value from kept where name = 'thread')::integer, 'Folosește linia de dialog și un rând nou.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.reply_to_forum_thread((select value from kept where name = 'thread')::integer, 'Citește dialogul cu voce tare.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.reply_to_forum_thread((select value from kept where name = 'thread')::integer, 'Mulțumesc!');

/* ---------- 1. Marking the answer (idea 8) ---------- */

select is((pg_temp.list_row() ->> 'is_answered')::boolean, false, 'a new thread isn''t answered');
select is(public.mark_forum_thread_answer((select value from kept where name = 'thread')::bigint, 2) ->> 'answer_post_number',
  '2', 'the starter marks reply #2 as the answer');
select is((pg_temp.list_row() ->> 'is_answered')::boolean, true, 'the list shows the thread as answered (criterion 1)');
select is(public.forum_thread((select value from kept where name = 'thread')::bigint) -> 'thread' -> 'answer' ->> 'number',
  '2', 'the thread links the answer at the top (criterion 1)');
select is((select count(*)::integer from jsonb_array_elements(
    public.forum_thread((select value from kept where name = 'thread')::bigint) -> 'posts') as post
    where (post ->> 'can_mark_answer')::boolean), 2,
  'the starter may mark either reply by someone else, not the opening post or their own reply');
select is(pg_temp.hint_of(format($$select public.mark_forum_thread_answer(%s, 1)$$, (select value from kept where name = 'thread'))),
  'answer:not_reply', 'the opening post can''t be the answer');
select is(pg_temp.hint_of(format($$select public.mark_forum_thread_answer(%s, 4)$$, (select value from kept where name = 'thread'))),
  'answer:not_reply', 'nor the starter''s own reply');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of(format($$select public.mark_forum_thread_answer(%s, 3)$$, (select value from kept where name = 'thread'))),
  'answer:not_starter', 'someone else can''t mark an answer (criterion 2)');
select is((select count(*)::integer from jsonb_array_elements(
    public.forum_thread((select value from kept where name = 'thread')::bigint) -> 'posts') as post
    where (post ->> 'can_mark_answer')::boolean), 0, 'and is offered no button');

-- The answer's writer deletes it: the mark stops counting.
select pg_temp.as_postgres();
update public.forum_posts set deleted_at = now()
where post_number = 2 and thread_id = (select id from public.forum_threads where thread_number = (select value from kept where name = 'thread')::bigint);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((pg_temp.list_row() ->> 'is_answered')::boolean, false, 'a deleted answer stops counting');
select is(public.mark_forum_thread_answer((select value from kept where name = 'thread')::bigint, null) -> 'answer_post_number',
  'null'::jsonb, 'the starter can take the mark away');

/* ---------- 2. A thread from a chapter passage (idea 10) ---------- */

select pg_temp.as_postgres();
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('28800000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-8000-000000000001', 'disc0001', 1, 'Unu', 'x', 3, 'published', 'Unu',
  E'Ploua peste oraș.\n\nFarul clipea.', 5, now() - interval '2 days');
update public.stories set first_published_at = now() - interval '2 days' where slug = 'statia-meteo-seed01';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.passage_discussion_allowed('statia-meteo-seed01', 'disc0001'), true,
  'a reader may take a passage of a public chapter to the forums (criterion 1)');
select pg_temp.sign_out();
select is(public.passage_discussion_allowed('statia-meteo-seed01', 'disc0001'), false, 'a visitor may not');

select pg_temp.as_postgres();
update public.stories set visibility = 'unlisted' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.passage_discussion_allowed('statia-meteo-seed01', 'disc0001'), false,
  'not from an unlisted story (criterion 2)');

select pg_temp.as_postgres();
update public.stories set visibility = 'public' where slug = 'statia-meteo-seed01';
insert into public.story_restrictions (user_id, story_id, restricted_by_user_id, reason)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
        '00000000-0000-4000-8000-000000000010', 'Test.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.passage_discussion_allowed('statia-meteo-seed01', 'disc0001'), false,
  'not from a story staff restricted (criterion 2)');

select pg_temp.as_postgres();
delete from public.story_restrictions where story_id = '00000000-0000-4000-9000-000000000001';
update public.stories set rating = '16_plus' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.passage_discussion_allowed('statia-meteo-seed01', 'disc0001'), false,
  'not from a 16+ story, whose passages are never shared');

select pg_temp.as_postgres();
update public.stories set rating = 'all_ages', class_only = true where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.passage_discussion_allowed('statia-meteo-seed01', 'disc0001'), false,
  'not from a story shared only with a class');

select * from finish();
rollback;
