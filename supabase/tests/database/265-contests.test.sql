-- Database tests for setting up, opening and entering contests (story S1-E11-15 criteria 1 to 4;
-- bundle CONTESTS-13b1; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - only the owner and admins create, save and open contests, each logged;
-- - a contest goes only on a contest landing page, one contest per page;
-- - opening is refused until every detail is filled in, the rules help page is live in Romanian
--   and English and the live landing page links to it (criterion 2); an open contest can't be
--   saved into an incomplete state;
-- - a writer in the contest's age group and market sees "Enter" in their story's settings while
--   entries are open, enters one story once, withdraws it and may enter again (criterion 3);
-- - a contest open to 13 to 15-year-olds takes only All ages and 13+ stories (criterion 4);
-- - nothing is offered or withdrawn outside the entry window;
-- - each policy: contests_select_staff and contest_entries_select_staff (allowed for an admin,
--   denied for a moderator) and contest_entries_select_own (allowed for the writer, denied for
--   another writer); nobody writes the tables directly;
-- - entries are in Download my data and deleted with the account.
-- Personas: admin (…09), moderator (…10), adult_writer (…01), teen_17 (…02).
-- Test data: a contest page, a campaign page, a rules help page and one published chapter of the
-- seed story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(44);

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

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated;

-- The details of a complete contest for adults and 16 to 17-year-olds in Romania, in Romanian,
-- open since yesterday.
create function pg_temp.details() returns jsonb language sql as $$
  select jsonb_build_object(
    'name_ro', 'Concursul de iarnă', 'name_en', 'The winter contest',
    'entries_open_on', public.romania_today() - 1, 'entries_close_on', public.romania_today() + 10,
    'results_on', public.romania_today() + 20,
    'age_groups', '["18_plus", "16_to_17"]'::jsonb, 'market_codes', '["RO"]'::jsonb, 'language_codes', '["ro"]'::jsonb,
    'what_counts_ro', 'O povestire scurtă', 'what_counts_en', 'A short story', 'word_limit', 5000,
    'prize_ro', 'O carte', 'prize_en', 'A book', 'prize_delivered_by', 'The organiser',
    'judges', 'The editorial team', 'rules_page_key', 'regulament-iarna');
$$;
grant execute on function pg_temp.details() to authenticated;

/* ---------- 1. Who sets contests up ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values
  ('page', public.admin_create_landing_page('iarna-concurs', 'contest')),
  ('campaign', public.admin_create_landing_page('iarna-campanie', 'campaign'));

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_create_contest('iarna-concurs') $$, '42501', null,
  'a moderator can''t create a contest');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_create_contest('iarna-concurs') $$, '42501', null,
  'a member can''t create a contest');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_create_contest('iarna-campanie') $$), 'not_a_contest_page',
  'a contest goes only on a contest landing page');
insert into kept (label, id) values ('contest', public.admin_create_contest('iarna-concurs'));
select is(pg_temp.hint_of($$ select public.admin_create_contest('iarna-concurs') $$), 'already_has_contest',
  'one contest per page');
select ok(exists (select 1 from public.audit_log where action = 'contest.created'
                  and target_id = (select id::text from kept where label = 'contest')),
  'creating a contest is logged');

/* ---------- 2. Details and opening ---------- */

select ok(
  public.admin_contest_problems((select id from kept where label = 'contest'))
    @> array['name_ro', 'name_en', 'dates_missing', 'age_groups', 'markets', 'languages', 'judges', 'rules_page', 'landing_not_live'],
  'an empty contest lists every missing detail and the page that isn''t live');
select is(pg_temp.hint_of($$ select public.admin_save_contest((select id from kept where label = 'contest'),
    '{"age_groups": ["children"]}') $$), 'bad_age_group', 'age groups come from the platform''s list');
select is(pg_temp.hint_of($$ select public.admin_save_contest((select id from kept where label = 'contest'),
    '{"word_limit": 5}') $$), 'bad_word_limit', 'a word limit must be sensible');
select is(pg_temp.hint_of($$ select public.admin_save_contest((select id from kept where label = 'contest'),
    '{"market_codes": ["XX"]}') $$), 'bad_market', 'markets come from the markets list');
select is(
  public.admin_save_contest((select id from kept where label = 'contest'), pg_temp.details()),
  array['rules_not_published', 'landing_not_live'],
  'once the details are in, the rules and the landing page are still missing');
select ok(exists (select 1 from public.audit_log where action = 'contest.saved'
                  and after_values ->> 'name_en' = 'The winter contest'),
  'saving is logged with the values after');
select is(pg_temp.hint_of($$ select public.admin_open_contest((select id from kept where label = 'contest')) $$),
  'not_ready', 'opening is refused until the rules are published and linked');

-- The rules help page, published in Romanian only for now.
select public.admin_publish_cms_version(public.admin_save_cms_draft('help_page', 'regulament-iarna', 'RO', 'ro',
  '{"title": "Regulament", "section": "Concursuri", "body": "Regulile concursului.", "isLegal": false}'::jsonb,
  public.romania_today()));
-- The landing page, live today, with key dates and a Rules block linking to the help page.
select public.admin_publish_landing_page(public.admin_save_landing_page_draft((select id from kept where label = 'page'),
  jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Concursul de iarnă", "intro": ""}, "en": {"title": "The winter contest", "intro": ""}}'::jsonb,
    jsonb_build_object('id', 'd', 'kind', 'key_dates', 'ro', '{"heading": "Date", "note": ""}'::jsonb,
      'en', '{"heading": "Dates", "note": ""}'::jsonb, 'dates', jsonb_build_object(
        'entries_open', public.romania_today() - 1, 'entries_close', public.romania_today() + 10,
        'results', public.romania_today() + 20)),
    '{"id": "r", "kind": "rules", "ro": {"heading": "Regulament", "body": "", "link_label": "Citește regulamentul"},
      "en": {"heading": "Rules", "body": "", "link_label": "Read the rules"}, "link": "/help/regulament-iarna"}'::jsonb)),
  public.romania_today(), null));
select is(public.admin_contest_problems((select id from kept where label = 'contest')), array['rules_not_published'],
  'rules published in one language only aren''t enough: both languages are needed');

select public.admin_publish_cms_version(public.admin_save_cms_draft('help_page', 'regulament-iarna', 'RO', 'en',
  '{"title": "Rules", "section": "Contests", "body": "The contest rules.", "isLegal": false}'::jsonb,
  public.romania_today()));
select is(public.admin_save_contest((select id from kept where label = 'contest'), '{"rules_page_key": "getting-started"}'),
  array['rules_not_linked'], 'the landing page must link to the rules page the contest names');
select is(public.admin_save_contest((select id from kept where label = 'contest'), '{"rules_page_key": "regulament-iarna"}'),
  '{}'::text[], 'with the rules live in both languages and linked, nothing stops it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.contest_entry_options('statia-meteo-seed01'), '[]'::jsonb,
  'a contest that isn''t open yet offers nothing to writers');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_open_contest((select id from kept where label = 'contest')) $$, '42501', null,
  'a moderator can''t open a contest');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_open_contest((select id from kept where label = 'contest')) $$,
  'an admin opens the complete contest');
select is(pg_temp.hint_of($$ select public.admin_open_contest((select id from kept where label = 'contest')) $$),
  'already_open', 'it opens only once');
select ok(exists (select 1 from public.audit_log where action = 'contest.opened'
                  and target_id = (select id::text from kept where label = 'contest')),
  'opening is logged');
select is(pg_temp.hint_of($$ select public.admin_save_contest((select id from kept where label = 'contest'),
    '{"judges": ""}') $$), 'breaks_open_contest', 'an open contest can''t be saved incomplete');

/* ---------- 3. Entering ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.contest_entry_options('statia-meteo-seed01') #> '{0,problems}', '["not_readable"]'::jsonb,
  'a story readers can''t open yet can''t be entered, and the card says why');
select is(pg_temp.hint_of($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$),
  'not_readable', 'and entering it is refused');

reset role;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ct265001',
  1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1200, now());

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.contest_entry_options('statia-meteo-seed01') #>> '{0,name_en}', 'The winter contest',
  'the writer sees the contest in the story''s settings');
select is(public.contest_entry_options('statia-meteo-seed01') #> '{0,problems}', '[]'::jsonb,
  'and the story may enter');
select lives_ok($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$,
  'the writer enters the story');
select is(public.contest_entry_options('statia-meteo-seed01') #>> '{0,entry,is_this_story}', 'true',
  'the card shows the story is entered');
select is(pg_temp.hint_of($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$),
  'already_entered', 'one entry per writer');
select is((select count(*)::integer from public.contest_entries), 1,
  'allowed: contest_entries_select_own, the writer reads their entry');
select throws_ok(
  $$ insert into public.contest_entries (user_id, contest_id, story_id)
     select '00000000-0000-4000-8000-000000000001', id, '00000000-0000-4000-9000-000000000001' from kept where label = 'contest' $$,
  '42501', null, 'nobody writes entries directly');
select is((select count(*)::integer from public.contests), 0,
  'denied: contests_select_staff, a writer reads no contest rows');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.contest_entries), 0,
  'denied: contest_entries_select_own, another writer''s entry is hidden');
select is(public.contest_entry_options('statia-meteo-seed01'), '[]'::jsonb,
  'nobody sees contest options for someone else''s story');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.contest_entries where contest_id = (select id from kept where label = 'contest')), 1,
  'allowed: contest_entries_select_staff, an admin reads the entries');
select is((select count(*)::integer from public.contests where id = (select id from kept where label = 'contest')), 1,
  'allowed: contests_select_staff, an admin reads the contest');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.contest_entries), 0,
  'denied: contest_entries_select_staff, a moderator reads no entries');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.withdraw_contest_entry((select id from kept where label = 'contest')) $$,
  'the writer withdraws the entry before entries close');
select is((select status from public.contest_entries), 'withdrawn', 'the entry stays, marked Withdrawn');
select lives_ok($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$,
  'a withdrawn entry frees the place, so the writer may enter again');

/* ---------- 4. Younger writers, and the window ---------- */

reset role;
update public.contests set age_groups = array['13_to_15', '16_to_17', '18_plus']
where id = (select id from kept where label = 'contest');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.contest_entry_options('statia-meteo-seed01') #> '{0,problems}', '["rating"]'::jsonb,
  'a contest open to 13 to 15-year-olds takes only All ages and 13+ stories');

reset role;
update public.contests set entries_close_on = public.romania_today() - 1, entries_open_on = public.romania_today() - 5
where id = (select id from kept where label = 'contest');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.contest_entry_options('statia-meteo-seed01'), '[]'::jsonb, 'after entries close, nothing is offered');
select is(pg_temp.hint_of($$ select public.withdraw_contest_entry((select id from kept where label = 'contest')) $$),
  'closed', 'and an entry can''t be withdrawn any more');

/* ---------- 5. Download my data and deleting an account ---------- */

reset role;
select ok(
  exists (select 1 from public.data_export_tables() where table_name = 'contest_entries' and is_included),
  'Download my data includes contest entries');
select ok(
  exists (select 1 from public.account_deletion_rules() where table_name = 'contest_entries' and action = 'delete'),
  'deleting an account deletes contest entries');

select * from finish();
rollback;
