-- Database tests for joining spaces (bundle 14d IDEAS-3, part d; ideas IDEA-20261102-6 and
-- IDEA-20261102-9).
-- What it proves:
-- - idea 6: the owner saves a welcome note; a new member sees it until "Got it", then never again;
--   the owner and someone outside the space don't get it to show (criterion 1); a note with HTML
--   or over 500 characters is refused (criterion 2); someone without the settings power can't
--   save one;
-- - idea 9: a request to an approving space carries an optional note of at most 200 characters
--   (criterion 1); the owner reads it with the request, and it can be reported by them but not by
--   anyone else, and a hidden note leaves the list (criterion 2);
-- - space_join_notes_select_own: allowed for the writer, denied for anyone else.
-- Personas: adult_writer (…01, the owner), teacher (…07, asks to join), blocker (…15, outside).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
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
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.settings set value = value || '{"space_create": {"new_account": 20, "older_account": 20}}'::jsonb
where key = 'rate_limits';

/* ---------- Set-up: an open space and one that approves each request ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_space('Cercul bun venit zq', 'Un spațiu deschis.', '', 'members', 'open', 'members', 'plum');
select public.create_space('Cercul cu cerere zq', 'Un spațiu cu cereri.', '', 'members', 'approve', 'members', 'plum');

/* ---------- 1. The welcome note (idea 6) ---------- */

select is(public.set_space_welcome_note('cercul-bun-venit-zq', '  Bine ai venit! Citește regulile.  ') -> 'viewer' ->> 'welcome_note',
  'Bine ai venit! Citește regulile.', 'the owner saves a welcome note, trimmed');
select is(pg_temp.hint_of($$select public.set_space_welcome_note('cercul-bun-venit-zq', '<b>Salut</b>')$$),
  'welcome:html', 'a note with HTML is refused (criterion 2)');
select is(pg_temp.hint_of($$select public.set_space_welcome_note('cercul-bun-venit-zq', repeat('a', 501))$$),
  'welcome:too_long', 'a note over 500 characters is refused (criterion 2)');
select is((public.space_page('cercul-bun-venit-zq') -> 'viewer' ->> 'show_welcome')::boolean, false,
  'the owner, who wrote it, isn''t shown it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.space_page('cercul-bun-venit-zq') -> 'viewer' -> 'welcome_note', 'null'::jsonb,
  'someone outside the space doesn''t get the note');
select throws_ok($$select public.set_space_welcome_note('cercul-bun-venit-zq', 'Al meu.')$$, '42501', null,
  'someone without the settings power can''t save one');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.join_space('cercul-bun-venit-zq');
select is((public.space_page('cercul-bun-venit-zq') -> 'viewer' ->> 'show_welcome')::boolean, true,
  'a new member is shown the note (criterion 1)');
select lives_ok($$select public.dismiss_space_welcome('cercul-bun-venit-zq')$$, '"Got it" works');
select is((public.space_page('cercul-bun-venit-zq') -> 'viewer' ->> 'show_welcome')::boolean, false,
  'after "Got it" it doesn''t show again (once)');

/* ---------- 2. A note with a request to join (idea 9) ---------- */

select is(pg_temp.hint_of($$select public.join_space('cercul-cu-cerere-zq', repeat('b', 201))$$),
  'join_note:too_long', 'a note over 200 characters is refused (criterion 1)');
select is(public.join_space('cercul-cu-cerere-zq', 'Scriu poezie și vreau păreri.') ->> 'status', 'pending',
  'a request goes with its note');
select is((select count(*)::integer from public.space_join_notes), 1,
  'allowed: space_join_notes_select_own: the writer reads their own note');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.space_join_notes), 0,
  'denied: space_join_notes_select_own: nobody else reads it from the table');
select throws_ok($$select * from public.report_item('space_join_note',
    (select id::text from public.space_join_notes limit 1), 'spam')$$, '23514', null,
  'someone outside can''t report a note they can''t see');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.space_join_requests('cercul-cu-cerere-zq') -> 0 -> 'note' ->> 'text', 'Scriu poezie și vreau păreri.',
  'the owner reads the note with the request (criterion 2)');
select lives_ok(format($$select * from public.report_item('space_join_note', %L, 'harassment')$$,
    public.space_join_requests('cercul-cu-cerere-zq') -> 0 -> 'note' ->> 'id'),
  'the owner can report the note like any other text (criterion 2)');
select pg_temp.as_postgres();
select is(public.reportable_item_summary('space_join_note', (select id from public.space_join_notes limit 1)),
  'Note asking to join "Cercul cu cerere zq": Scriu poezie și vreau păreri.', 'the moderation queue says what was reported');

-- Our moderators hide it: the request stays, without its note.
insert into public.moderated_items (item_type, item_id, state, user_id, moderated_by_user_id, note)
select 'space_join_note', id, 'hidden', user_id, '00000000-0000-4000-8000-000000000010', 'Test.'
from public.space_join_notes limit 1;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.space_join_requests('cercul-cu-cerere-zq') -> 0 -> 'note', 'null'::jsonb,
  'a hidden note leaves the list, and the request stays');

select * from finish();
rollback;
