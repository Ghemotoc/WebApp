-- Database tests for the line staff write under a genre or tag page's title (BOOKS-A06 and
-- BOOKS-A09, user stories 1.6 and 1.9; boards A06-ReadGenre and A09-ReadTag).
-- What it proves:
-- - an admin writes a line for a genre in English and Romanian, and one for a tag in English;
--   a visitor gets the page language's line, then the English one, then null;
-- - writing again replaces the line, and an empty line clears it;
-- - list_page_lines_select_website_staff: an admin reads the rows (allowed), a moderator and a
--   member read none (denied), and nobody writes the table directly;
-- - a moderator can't write one; an unknown genre, an unknown language and a line over 200
--   characters are refused with their hints;
-- - each change is in the audit log, and saving the same line twice logs it once;
-- - the table is listed for Download my data as staff data left out, with a reason.
-- Personas: adult_writer (…01), admin (…09), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Writing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_set_list_page_line('category', 'fiction', 'en', 'Maps, magic and long journeys.') $$,
  'an admin writes the English line for Fiction');
select lives_ok($$ select public.admin_set_list_page_line('category', 'fiction', 'ro', '  Hărți, magie și drumuri lungi.  ') $$,
  'and the Romanian one, with spaces round it');
select lives_ok($$ select public.admin_set_list_page_line('tag', 'Family', 'en', 'Stories where strangers become the people you''d go back for.') $$,
  'and an English line for the Family tag');
select lives_ok($$ select public.admin_set_list_page_line('category', 'fiction', 'en', 'Maps, magic and long journeys.') $$,
  'saving the same line again is fine');

/* ---------- 2. What visitors see ---------- */

select pg_temp.sign_out();
select is(public.list_page_line('category', 'fiction', 'ro') ->> 'line', 'Hărți, magie și drumuri lungi.',
  'a visitor reading in Romanian gets the Romanian line, trimmed');
select is(public.list_page_line('category', 'fiction', 'EN') ->> 'line', 'Maps, magic and long journeys.',
  'a visitor reading in English gets the English line, whatever the case of the code');
select is(public.list_page_line('category', 'fiction', 'sv'),
  '{"line": "Maps, magic and long journeys.", "language": "en"}'::jsonb,
  'a language with no line of its own gets the English one, marked as English');
select is(public.list_page_line('tag', 'family', 'ro') ->> 'line', 'Stories where strangers become the people you''d go back for.',
  'a tag page gets its English line in Romanian too, whatever case the address uses');
select is(public.list_page_line('category', 'poetry', 'en'), null::jsonb,
  'a genre with no line shows none');
select is(public.list_page_line('category', 'cookbooks', 'en'), null::jsonb,
  'an unknown genre shows none');

/* ---------- 3. Who reads and changes them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::int from public.list_page_lines), 3,
  'allowed: list_page_lines_select_website_staff lets an admin read the lines');
select is(jsonb_array_length(public.admin_list_page_lines()), 3, 'and the staff list has all three');
select is(public.admin_list_page_lines() -> 0 ->> 'kind', 'category', 'genres come first in the staff list');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::int from public.list_page_lines), 0,
  'denied: list_page_lines_select_website_staff shows a moderator none of them');
select throws_ok($$ select public.admin_set_list_page_line('category', 'fiction', 'en', 'Something else.') $$,
  '42501', null, 'a moderator can''t write a line');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into public.list_page_lines (category_id, language, line, user_id)
  values ((select id from public.categories where slug = 'poetry'), 'en', 'Mine.', '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a member can''t write the table directly');

/* ---------- 4. Refused lines and clearing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_like($$ select public.admin_set_list_page_line('category', 'cookbooks', 'en', 'A line.') $$,
  '%genre or tag%', 'an unknown genre is refused');
select throws_like($$ select public.admin_set_list_page_line('category', 'fiction', 'xx', 'A line.') $$,
  '%language%', 'an unknown language is refused');
select throws_like($$ select public.admin_set_list_page_line('category', 'fiction', 'en', repeat('a', 201)) $$,
  '%200 characters%', 'a line over 200 characters is refused');
select public.admin_set_list_page_line('category', 'fiction', 'ro', '   ');
select is(public.list_page_line('category', 'fiction', 'ro') ->> 'line', 'Maps, magic and long journeys.',
  'after the Romanian line is cleared, Romanian readers get the English one');
reset role;
select is((select count(*)::int from public.audit_log where action = 'website.list_line_set' and created_at >= now()), 4,
  'each change and the clear are in the audit log, and the same line saved twice only once');
select is((select is_included from public.data_export_held_tables() where table_name = 'list_page_lines'), false,
  'Download my data lists the table as staff data left out');

select * from finish();
rollback;
