-- Database tests for the staff entries list and disqualifying an entry (story S1-E11-15
-- criteria 5 and 6; bundle CONTESTS-13b2a).
-- What it proves:
-- - only the owner and admins read a contest's entries, by pen name and age group only (never
--   the user ID or the year of birth), with the story's rating, the date and the status;
-- - disqualifying needs the owner or an admin and a reason, and only a valid entry can be
--   disqualified;
-- - the writer gets a statement of reasons resting on the contest's rules and a notification, the
--   audit log keeps it, and their story card says the entry was disqualified (no second entry);
-- - an appeal names the admin as the decider, and a moderator who overturns it makes the entry
--   valid again.
-- No new policies: the tables' policies are tested in 265.
-- Personas: admin (…09), moderator (…10), adult_writer (…01).
-- Test data: an open contest on its own landing page and one published chapter of the seed story,
-- inserted directly; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
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
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid, words text) on commit drop;
grant all on kept to authenticated;

-- An open contest for adults in Romania, in Romanian, taking entries today.
with page as (
  insert into public.landing_pages (slug, page_type) values ('concurs-descalificare', 'contest') returning id
), contest as (
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select page.id, 'Concursul de test', 'The test contest', public.romania_today() - 1, public.romania_today() + 5,
    public.romania_today() + 10, array['18_plus'], array['RO'], array['ro'], now()
  from page
  returning id
)
insert into kept (label, id) select 'contest', contest.id from contest;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'dq660001',
  1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());

-- The writer enters the seed story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01');
reset role;
insert into kept (label, id)
select 'entry', id from public.contest_entries where contest_id = (select id from kept where label = 'contest');

/* ---------- 1. The entries list (criterion 5) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_contest_entries((select id from kept where label = 'contest')) $$,
  '42501', null, 'a moderator can''t read a contest''s entries');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_contest_entries((select id from kept where label = 'contest')) $$,
  '42501', null, 'a writer can''t read a contest''s entries');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(
  (select jsonb_build_object('age_group', item ->> 'age_group', 'rating', item ->> 'rating',
                             'status', item ->> 'status', 'words', (item ->> 'words')::int,
                             'has_pen_name', item ->> 'pen_name' <> '')
   from jsonb_array_elements(public.admin_contest_entries((select id from kept where label = 'contest'))) as item),
  '{"age_group": "18_plus", "rating": "all_ages", "status": "valid", "words": 800, "has_pen_name": true}'::jsonb,
  'an admin sees the entry by pen name and age group, with the rating, words and status');
select ok(
  not exists (select 1 from jsonb_array_elements(public.admin_contest_entries((select id from kept where label = 'contest'))) as item
              where item ? 'user_id' or item ? 'birth_year' or item::text like '%00000000-0000-4000-8000-000000000001%'),
  'the list never shows the writer''s user ID or year of birth');

/* ---------- 2. Disqualifying (criterion 6) ---------- */

select is(pg_temp.hint_of($$ select public.admin_disqualify_contest_entry((select id from kept where label = 'entry'), '  ') $$),
  'reason_needed', 'disqualifying needs a reason');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_disqualify_contest_entry((select id from kept where label = 'entry'), 'Copied.') $$,
  '42501', null, 'a moderator can''t disqualify an entry');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
update kept set words = public.admin_disqualify_contest_entry((select id from kept where label = 'entry'),
  'The story was published before the contest opened.') where label = 'entry';
select matches((select words from kept where label = 'entry'), '^S-[0-9]{6}$',
  'disqualifying returns the statement''s reference');
reset role;
select is(
  (select jsonb_build_object('status', entries.status, 'by', entries.disqualified_by_user_id,
                             'has_time', entries.disqualified_at is not null)
   from public.contest_entries as entries where entries.id = (select id from kept where label = 'entry')),
  '{"status": "disqualified", "by": "00000000-0000-4000-8000-000000000009", "has_time": true}'::jsonb,
  'the entry is disqualified, with who and when');
select is(
  (select jsonb_build_object('user', statements.user_id, 'action', statements.action, 'ground', statements.ground,
                             'key', statements.ground_key, 'facts', statements.facts)
   from public.statements_of_reasons as statements
   where statements.reference = (select words from kept where label = 'entry')),
  '{"user": "00000000-0000-4000-8000-000000000001", "action": "contest_disqualified", "ground": "terms",
    "key": "contest_rules", "facts": "The story was published before the contest opened."}'::jsonb,
  'the writer gets a statement of reasons resting on the contest''s rules, in staff''s words');
select ok(exists (
    select 1 from public.notifications
    join public.statements_of_reasons as statements on statements.id = notifications.statement_id
    where notifications.user_id = '00000000-0000-4000-8000-000000000001' and notifications.kind = 'moderation_decision'
      and statements.reference = (select words from kept where label = 'entry')),
  'the writer is notified, with a link to the statement');
select ok(exists (select 1 from public.audit_log where action = 'contest.entry_disqualified'
                  and target_id = (select id::text from kept where label = 'entry')
                  and reason = 'The story was published before the contest opened.'),
  'disqualifying is logged with the reason');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_disqualify_contest_entry((select id from kept where label = 'entry'), 'Again.') $$),
  'not_valid', 'only a valid entry can be disqualified');

/* ---------- 3. What the writer sees ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select item -> 'entry' ->> 'status' || ' ' || (item -> 'entry' ->> 'statement_reference')
   from jsonb_array_elements(public.contest_entry_options('statia-meteo-seed01')) as item),
  'disqualified ' || (select words from kept where label = 'entry'),
  'the writer''s story card shows the entry as disqualified, with the decision''s reference');
select is(pg_temp.hint_of($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$),
  'already_entered', 'a disqualified entry still holds the writer''s one place');

/* ---------- 4. The appeal ---------- */

select public.submit_appeal((select words from kept where label = 'entry'), 'It was a draft, never published.');
reset role;
select is(
  (select appeals.original_decider_user_id from public.appeals
   join public.statements_of_reasons as statements on statements.id = appeals.statement_id
   where statements.reference = (select words from kept where label = 'entry')),
  '00000000-0000-4000-8000-000000000009'::uuid,
  'the appeal names the admin who disqualified the entry as the decider');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_decide_appeal(
  (select appeals.id from public.appeals join public.statements_of_reasons as statements on statements.id = appeals.statement_id
   where statements.reference = (select words from kept where label = 'entry')),
  'overturned', 'The writer is right.', 'Your entry is back in the contest.');
reset role;
select is(
  (select entries.status || ' ' || (entries.disqualified_at is null)::text
   from public.contest_entries as entries where entries.id = (select id from kept where label = 'entry')),
  'valid true', 'a moderator who overturns the appeal makes the entry valid again');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select item -> 'entry' ->> 'status' from jsonb_array_elements(public.contest_entry_options('statia-meteo-seed01')) as item),
  'valid', 'the writer''s card shows the entry as entered again');

select * from finish();
rollback;
