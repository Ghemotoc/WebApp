-- Database tests for Remind me on landing pages (story S1-E11-14 criterion 8; bundle
-- CONTESTS-13a2b; CLAUDE.md rules 1 and 15).
-- What it proves:
-- - publishing is refused for a Remind me block without a Key dates block, and for two of them;
-- - a visitor who isn't signed in is asked to sign in; a signed-in reader sets the reminder once
--   (asking twice changes nothing) and cancels it; nobody can ask once entries are open, or on a
--   page without the block;
-- - landing_page() tells each reader whether they asked, and when entries open;
-- - landing_page_reminders_select_own: a reader reads their own reminder (allowed), not someone
--   else's (denied); nobody writes the table directly;
-- - the hourly job sends nothing before entries open, then exactly one 'landing_entries_open'
--   notification per reader, which names the page, no email, and never a second one;
-- - the reminders are in Download my data and deleted with the account (the lists cover them).
-- Personas: admin (…09) builds the page; adult_writer (…01) and teen_17 (…02) ask.
-- Test data: one campaign page; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- A visitor who isn't signed in: the anon role and no user in the claims.
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
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
-- A page's content: a hero, key dates opening on the given day, and a Remind me block.
create function pg_temp.content_opening(opens_on date, with_dates boolean default true) returns jsonb
language sql as $$
  select jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Concursul de iarnă"}, "en": {"title": "The winter contest"}}'::jsonb)
    || case when with_dates then jsonb_build_array(jsonb_build_object('id', 'd', 'kind', 'key_dates',
         'ro', jsonb_build_object('heading', 'Date'), 'en', jsonb_build_object('heading', 'Dates'),
         'dates', jsonb_build_object('entries_open', opens_on::text, 'entries_close', (opens_on + 30)::text,
                                     'results', (opens_on + 40)::text)))
       else '[]'::jsonb end
    || jsonb_build_array('{"id": "r", "kind": "remind_me", "ro": {"heading": "Amintește-mi"}, "en": {"heading": "Remind me"}}'::jsonb));
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated, anon;

/* ---------- 1. Publishing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('page', public.admin_create_landing_page('iarna-test', 'campaign'));

select ok(
  'blocks:remind_me_needs_dates' = any (public.landing_page_problems('campaign',
    pg_temp.content_opening(public.romania_today() + 3, false))),
  'a Remind me block needs a Key dates block on the page');
select ok(
  'blocks:one_remind_me' = any (public.landing_page_problems('campaign',
    jsonb_set(pg_temp.content_opening(public.romania_today() + 3), '{blocks}',
      pg_temp.content_opening(public.romania_today() + 3) -> 'blocks'
      || '[{"id": "r2", "kind": "remind_me", "ro": {"heading": "Încă"}, "en": {"heading": "Again"}}]'))),
  'a page has at most one Remind me block');
select is(
  public.landing_page_problems('campaign', pg_temp.content_opening(public.romania_today() + 3)), '{}'::text[],
  'a Remind me block with key dates may be published');

-- Entries open in three days.
insert into kept (label, id)
select 'draft', public.admin_save_landing_page_draft(id, pg_temp.content_opening(public.romania_today() + 3), null, null)
from kept where label = 'page';
select public.admin_publish_landing_page(id) from kept where label = 'draft';

/* ---------- 2. Asking ---------- */

select pg_temp.as_visitor();
select is(pg_temp.hint_of($$ select public.set_landing_reminder('iarna-test', true) $$), 'sign_in',
  'a visitor who isn''t signed in is asked to sign in');
select is(public.landing_page('iarna-test') #>> '{reminder,is_set}', 'false',
  'a visitor sees the reminder as not set');
select is(public.landing_page('iarna-test') #>> '{reminder,opens_on}', (public.romania_today() + 3)::text,
  'the page says when entries open');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_landing_reminder('iarna-test', true) ->> 'is_set', 'true', 'a reader sets the reminder');
select is(public.set_landing_reminder('IARNA-test', true) ->> 'is_set', 'true',
  'asking again, in any letter case, keeps it set');
select is((select count(*)::integer from public.landing_page_reminders), 1,
  'landing_page_reminders_select_own allows: the reader reads their one reminder');
select is(public.landing_page('iarna-test') #>> '{reminder,is_set}', 'true', 'the page shows it is set');
select throws_ok(
  $$ insert into public.landing_page_reminders (user_id, page_id)
     select '00000000-0000-4000-8000-000000000001', id from kept where label = 'page' $$,
  '42501', null, 'nobody writes the reminders directly');
select is(pg_temp.hint_of($$ select public.set_landing_reminder('nothing-here', true) $$), 'no_reminder',
  'a page that doesn''t exist has no reminder');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.set_landing_reminder('iarna-test', true);
select is((select count(*)::integer from public.landing_page_reminders
           where user_id = '00000000-0000-4000-8000-000000000001'), 0,
  'landing_page_reminders_select_own denies: another reader''s reminder is hidden');
select is(public.set_landing_reminder('iarna-test', false) ->> 'is_set', 'false', 'a reader cancels the reminder');
select public.set_landing_reminder('iarna-test', true);

/* ---------- 3. The job ---------- */

reset role;
select is(public.send_landing_reminders(), 0, 'nothing is sent before entries open');

-- Entries open today.
update public.landing_page_versions
set content = pg_temp.content_opening(public.romania_today())
where status = 'published' and page_id = (select id from kept where label = 'page');
select is(public.send_landing_reminders(), 2, 'on the day entries open, each reader gets one notification');
select is(public.send_landing_reminders(), 0, 'and never a second one');
select is(
  (select count(*)::integer from public.notifications
   where kind = 'landing_entries_open' and landing_page_id = (select id from kept where label = 'page')),
  2, 'the notifications name the page');
select is(
  (select count(*)::integer from public.email_outbox
   where user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002')
     and created_at >= now()),
  0, 'and nothing else: no email');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select item ->> 'landing_page' from jsonb_array_elements(public.my_notifications() -> 'notifications') as item
   where item ->> 'kind' = 'landing_entries_open'),
  jsonb_build_object('slug', 'iarna-test', 'title_ro', 'Concursul de iarnă', 'title_en', 'The winter contest')::text,
  'the reader''s notification links to the page, with its title in both languages');
select is(pg_temp.hint_of($$ select public.set_landing_reminder('iarna-test', true) $$), 'already_open',
  'nobody can ask once entries are open');

/* ---------- 4. Download my data and deleting an account ---------- */

reset role;
select ok(
  exists (select 1 from public.data_export_tables() where table_name = 'landing_page_reminders' and is_included),
  'Download my data includes the reminders');
select ok(
  exists (select 1 from public.account_deletion_rules() where table_name = 'landing_page_reminders' and action = 'delete'),
  'deleting an account deletes the reminders');

select * from finish();
rollback;
