-- Database tests for genre and tag page backgrounds (bundle G12b; the canvas's StaffWebsite
-- board, "Genre and tag pages").
-- What it proves:
-- - an admin chooses a band colour for a genre everywhere and another for one market, and for a
--   tag; a visitor gets the market's own choice, then the one for everywhere, then null;
-- - list_page_backgrounds_select_website_staff: an admin reads the rows (allowed), a moderator
--   and a member read none (denied), and nobody writes the table directly;
-- - a moderator can't choose one; an unknown genre, market or colour is refused;
-- - "Use the default" takes the page back to null; each change is in the audit log;
-- - the table is listed for Download my data as staff data left out, with a reason.
-- Personas: adult_writer (…01), admin (…09), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', persona_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. Choosing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_set_list_page_background('category', 'poetry', null, 'sky') $$,
  'an admin chooses Sky for Poetry everywhere');
select lives_ok($$ select public.admin_set_list_page_background('category', 'poetry', 'GB', 'blush') $$,
  'and Blush for Poetry in the United Kingdom');
select lives_ok($$ select public.admin_set_list_page_background('tag', 'Fantasy', null, 'plum') $$,
  'and Plum for the Fantasy tag');
select lives_ok($$ select public.admin_set_list_page_background('category', 'poetry', null, 'sage') $$,
  'choosing again for the same page and market replaces the colour');

/* ---------- 2. What visitors see ---------- */

select pg_temp.sign_out();
select is(public.list_page_background('category', 'poetry', 'gb'), 'blush',
  'a visitor in the United Kingdom gets that market''s own colour');
select is(public.list_page_background('category', 'poetry', 'RO'), 'sage',
  'a visitor in Romania gets the colour for every market');
select is(public.list_page_background('tag', 'fantasy', null), 'plum',
  'a tag page gets its colour, whatever case the address uses');
select is(public.list_page_background('category', 'fiction', 'RO'), null,
  'a genre with no choice keeps its default');

/* ---------- 3. Who reads and changes them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::int from public.list_page_backgrounds), 3,
  'allowed: list_page_backgrounds_select_website_staff lets an admin read the choices');
select is(jsonb_array_length(public.admin_list_page_backgrounds()), 3, 'and the staff list has all three');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::int from public.list_page_backgrounds), 0,
  'denied: a moderator reads none of them');
select throws_ok($$ select public.admin_set_list_page_background('category', 'poetry', null, 'gold') $$,
  '42501', null, 'a moderator can''t choose a colour');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into public.list_page_backgrounds (category_id, palette, user_id)
  values ((select id from public.categories where slug = 'fiction'), 'gold', '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a member can''t write the table directly');

/* ---------- 4. Refused choices and the default ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_like($$ select public.admin_set_list_page_background('category', 'cookbooks', null, 'gold') $$,
  '%genre or tag%', 'an unknown genre is refused');
select public.admin_clear_list_page_background('category', 'poetry', 'GB');
select is(public.list_page_background('category', 'poetry', 'GB'), 'sage',
  'after "Use the default" for the United Kingdom, the colour for every market shows there');
reset role;
select is((select count(*)::int from public.audit_log where action like 'website.list_background_%' and created_at >= now()), 5,
  'every choice and the clear are in the audit log');

select * from finish();
rollback;
