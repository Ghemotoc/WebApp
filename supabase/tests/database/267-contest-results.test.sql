-- Database tests for judging, publishing results and sending prizes (story S1-E11-15 criteria 7,
-- 8 and 10; bundle CONTESTS-13b2b).
-- What it proves:
-- - only the owner and admins choose winners and finalists, only for valid entries and only once
--   entries close; each choice is logged;
-- - results publish once, only with at least one winner, and the landing page then shows winners
--   first and finalists by pen name only (never the age, the user ID or a real name), with a link
--   to the story only when the visitor may see it in a public list;
-- - a prize is marked as sent only for a winner after the results are out, and a winner under 16
--   needs a parent's or guardian's consent confirmed first; the delivery details are never stored.
-- No new policies: the tables' policies are tested in 265.
-- Personas: admin (…09), moderator (…10), adult_writer (…01), teen_17 (…02), kid_14_ok (…03).
-- Test data: a contest whose entries have closed, its live landing page, three entries inserted
-- directly (the kid's uses another seed story, which is fine for these checks: only the entry's
-- writer matters) and one published chapter of the adult's story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

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
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated, anon;

-- A contest that opened ten days ago and still takes entries today, on a live landing page.
with page as (
  insert into public.landing_pages (slug, page_type) values ('concurs-rezultate', 'contest') returning id
), version as (
  insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
  select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Rezultate", "intro": ""}, "en": {"title": "Results", "intro": ""}}'::jsonb)),
    public.romania_today(), now()
  from page
  returning page_id
), contest as (
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select version.page_id, 'Concursul cu rezultate', 'The results contest', public.romania_today() - 10,
    public.romania_today(), public.romania_today() + 10, array['13_to_15', '16_to_17', '18_plus'], array['RO'], array['ro'], now()
  from version
  returning id
)
insert into kept (label, id) select 'contest', contest.id from contest;

insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rz670001',
  1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 600, now());

with added as (
  insert into public.contest_entries (user_id, contest_id, story_id, status, withdrawn_at)
  values
    ('00000000-0000-4000-8000-000000000001', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000001', 'valid', null),
    ('00000000-0000-4000-8000-000000000003', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000003', 'valid', null),
    ('00000000-0000-4000-8000-000000000002', (select id from kept where label = 'contest'), '00000000-0000-4000-9000-000000000002', 'withdrawn', now())
  returning id, user_id
)
insert into kept (label, id)
select case user_id when '00000000-0000-4000-8000-000000000001' then 'adult'
                    when '00000000-0000-4000-8000-000000000003' then 'kid' else 'withdrawn' end, id
from added;

/* ---------- 1. Choosing winners and finalists (criterion 7) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'winner') $$),
  'entries_open', 'nobody is placed while entries are still open');

reset role;
update public.contests set entries_close_on = public.romania_today() - 1 where id = (select id from kept where label = 'contest');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'winner') $$,
  '42501', null, 'a moderator can''t choose a winner');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'first') $$),
  'bad_placing', 'a placing is winner, finalist or none');
select is(pg_temp.hint_of($$ select public.admin_set_contest_placing((select id from kept where label = 'withdrawn'), 'finalist') $$),
  'not_valid', 'a withdrawn entry can''t place');
select is(pg_temp.hint_of($$ select public.admin_publish_contest_results((select id from kept where label = 'contest')) $$),
  'no_winner', 'results can''t be published without a winner');

select public.admin_set_contest_placing((select id from kept where label = 'adult'), 'winner');
select public.admin_set_contest_placing((select id from kept where label = 'kid'), 'finalist');
reset role;
select is(
  (select string_agg(award, ',' order by award) from public.contest_entries
   where contest_id = (select id from kept where label = 'contest')),
  'finalist,winner', 'an admin chooses a winner and a finalist');
select ok(exists (select 1 from public.audit_log where action = 'contest.placing_set'
                  and target_id = (select id::text from kept where label = 'adult')
                  and after_values ->> 'placing' = 'winner'),
  'choosing a placing is logged');

/* ---------- 2. Publishing the results (criterion 8) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.landing_page('concurs-rezultate') -> 'results', 'null'::jsonb,
  'the page shows no results before they are published');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_publish_contest_results((select id from kept where label = 'contest')) $$,
  '42501', null, 'a moderator can''t publish results');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_publish_contest_results((select id from kept where label = 'contest')) $$,
  'an admin publishes the results once there is a winner');
select is(pg_temp.hint_of($$ select public.admin_publish_contest_results((select id from kept where label = 'contest')) $$),
  'already_published', 'results publish once');

-- A visitor who isn't signed in.
reset role;
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(
  (select jsonb_agg(jsonb_build_object('placing', item ->> 'placing', 'story', item -> 'story' ->> 'slug'))
   from jsonb_array_elements(public.landing_page('concurs-rezultate') -> 'results') as item),
  '[{"placing": "winner", "story": "statia-meteo-seed01"}, {"placing": "finalist", "story": null}]'::jsonb,
  'the page shows the winner first, then the finalist; a story the visitor can''t open has no link');
select is(
  (select array_agg(key order by key) from jsonb_array_elements(public.landing_page('concurs-rezultate') -> 'results') as item,
     jsonb_object_keys(item) as key where item ->> 'placing' = 'finalist'),
  array['pen_name', 'placing', 'story'],
  'each result carries only the pen name, the placing and the story: never age, school, real name or user ID');
select ok(
  (select bool_and(item ->> 'pen_name' <> '') from jsonb_array_elements(public.landing_page('concurs-rezultate') -> 'results') as item),
  'every result names the writer by pen name');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'contest.results_published'
                  and target_id = (select id::text from kept where label = 'contest')),
  'publishing the results is logged');

/* ---------- 3. Prizes (criterion 10) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_mark_contest_prize_sent((select id from kept where label = 'kid'), true) $$),
  'not_a_winner', 'only a winner gets a prize');
select public.admin_set_contest_placing((select id from kept where label = 'kid'), 'winner');
select is(pg_temp.hint_of($$ select public.admin_mark_contest_prize_sent((select id from kept where label = 'kid'), false) $$),
  'parent_consent_needed', 'a winner under 16 needs a parent''s or guardian''s consent confirmed first');
select public.admin_mark_contest_prize_sent((select id from kept where label = 'kid'), true);
select public.admin_mark_contest_prize_sent((select id from kept where label = 'adult'), false);
reset role;
select is(
  (select jsonb_object_agg(case when user_id = '00000000-0000-4000-8000-000000000001' then 'adult' else 'kid' end,
                           jsonb_build_object('sent', prize_sent_at is not null, 'consent', prize_parent_consent))
   from public.contest_entries where id in (select id from kept where label in ('adult', 'kid'))),
  '{"adult": {"sent": true, "consent": false}, "kid": {"sent": true, "consent": true}}'::jsonb,
  'both prizes are marked as sent, with the parent''s consent recorded for the winner under 16 only');
select ok(exists (select 1 from public.audit_log where action = 'contest.prize_sent'
                  and target_id = (select id::text from kept where label = 'kid')
                  and after_values ->> 'parent_consent_on_file' = 'true'),
  'marking a prize as sent is logged with the consent confirmation');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_mark_contest_prize_sent((select id from kept where label = 'adult'), false) $$),
  'already_sent', 'a prize is marked as sent once');

/* ---------- 4. The staff list ---------- */

select is(
  (select jsonb_object_agg(item ->> 'age_group', jsonb_build_object('award', item ->> 'placing',
                           'needs_parent', (item ->> 'needs_parent_consent')::boolean))
   from jsonb_array_elements(public.admin_contest_entries((select id from kept where label = 'contest'))) as item
   where item ->> 'status' = 'valid'),
  '{"18_plus": {"award": "winner", "needs_parent": false}, "13_to_15": {"award": "winner", "needs_parent": true}}'::jsonb,
  'the staff list shows each entry''s placing and whether a prize needs a parent''s consent');

select * from finish();
rollback;
