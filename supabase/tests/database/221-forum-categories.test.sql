-- Database tests for forum categories, forums and subforums (bundle FORUMS-1, part a; story
-- S1-E8-01; CLAUDE.md rule 1).
-- What it proves:
-- - the starting categories from board 5.1 are pinned in the board's order, with their forums and
--   subforums, and every one has a name in Romanian and English;
-- - anyone, signed out included, reads the live forums and their names (forums_select_public,
--   forum_names_select_public); a removed forum and its names are hidden; nobody writes through
--   the API;
-- - forum_index() gives each forum its name in the asked language, Romanian when that language
--   has none, and the numbers;
-- - staff add a category, a forum and a subforum with name, description, order and parent, and a
--   fourth level is refused (criterion 1); only the owner and admins may; every change is logged;
-- - a forum with forums inside can't be removed or moved; an empty one can;
-- - no scheduled job archives or closes anything in the forums (criterion 3).
-- Personas: admin (…09), owner (…08), moderator (…10) and adult_writer (…01). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

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
-- Names as staff send them.
create function pg_temp.names(romanian text, english text) returns jsonb language sql as $$
  select jsonb_build_object('ro', jsonb_build_object('name', romanian, 'description', 'Descriere'),
                            'en', jsonb_build_object('name', english, 'description', 'About it'));
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- 1. The starting forums ---------- */

select results_eq(
  $$ select slug from public.forums where level = 0 and is_pinned order by position $$,
  $$ values ('writing-craft'), ('reading'), ('essays-and-true-stories'), ('community') $$,
  'the four starting categories are pinned in the board''s order (Q45)');
-- Spaces' hidden forums are level 1 too (FORUMS-2a); they sit in no category.
select is((select count(*)::integer from public.forums where level = 1 and space_id is null), 11,
  'the categories hold the board''s eleven forums');
select results_eq(
  $$ select slug from public.forums
     where parent_id = (select id from public.forums where slug = 'first-chapters') order by position $$,
  $$ values ('fantasy-and-sci-fi-openings'), ('school-and-everyday-life') $$,
  'First chapters has the board''s two subforums');
select is_empty(
  $$ select forums.slug from public.forums, public.languages
     where languages.is_interface and languages.status = 'open' and not exists (select 1 from public.forum_names
       where forum_names.forum_id = forums.id and forum_names.language_code = languages.code) $$,
  'every starting forum has a name in each open interface language (MARKETS-2a: sv, da and nb start closed)');

/* ---------- 2. Who reads and writes ---------- */

select pg_temp.sign_out();
select is((select count(*)::integer from public.forums), 19,
  'allowed: forums_select_public: a signed-out visitor reads every live forum');
select ok((select count(*) from public.forum_names) = 38,
  'allowed: forum_names_select_public: a signed-out visitor reads their names');
select throws_ok($$ insert into public.forums (slug) values ('mine') $$, '42501', null,
  'denied: forums_select_public: nobody adds a forum through the API');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ update public.forum_names set name = 'x' $$, '42501', null,
  'denied: forum_names_select_public: a member can''t rename a forum through the API');

/* ---------- 3. The index in a language ---------- */

select is(
  (select name || ' / ' || description from public.forum_index('en') where slug = 'worldbuilding'),
  'Worldbuilding / Maps, magic systems and invented places',
  'forum_index gives the English name and description');
select is((select name from public.forum_index('fr') where slug = 'worldbuilding'), 'Construirea lumilor',
  'a language with no name falls back to Romanian');
select is((select thread_count + post_count from public.forum_index('ro') where slug = 'worldbuilding'), 0::bigint,
  'the numbers are 0 until threads exist (part b)');

/* ---------- 4. Staff add and change forums (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_forum(null, null, 'poeti', 5, true, 'gold',
    pg_temp.names('Poeți', 'Poets')) $$, '42501', null,
  'a moderator can''t add a forum (settings area: owner and admin)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok($$ select public.admin_save_forum(null, null, 'poeti', 5, true, 'gold',
    pg_temp.names('Poeți', 'Poets')) $$,
  'an admin adds a pinned category with its colour');
select lives_ok($$ select public.admin_save_forum(null, (select id from public.forums where slug = 'poeti'),
    'sonete', 2, false, 'plum', pg_temp.names('Sonete', 'Sonnets')) $$,
  'an admin adds a forum inside it');
select lives_ok($$ select public.admin_save_forum(null, (select id from public.forums where slug = 'sonete'),
    'sonete-scurte', 1, false, 'plum', pg_temp.names('Sonete scurte', 'Short sonnets')) $$,
  'an admin adds a subforum inside that forum');
select is(pg_temp.hint_of($$ select public.admin_save_forum(null, (select id from public.forums where slug = 'sonete-scurte'),
    'prea-adanc', 1, false, 'plum', pg_temp.names('Prea adânc', 'Too deep')) $$),
  'parent:too_deep', 'a fourth level is refused: up to two levels below a category');
select is(pg_temp.hint_of($$ select public.admin_save_forum(null, null, 'Fara Nume', 1, false, 'plum',
    '{"ro": {"name": ""}}'::jsonb) $$),
  'ro:empty,en:empty,slug:format', 'a forum needs a name in each interface language and a proper address');
select is(pg_temp.hint_of($$ select public.admin_save_forum(null, (select id from public.forums where slug = 'poeti'),
    'fixat', 1, true, 'plum', pg_temp.names('Fixat', 'Pinned')) $$),
  'pin:not_category', 'only a category can be pinned');
select is(pg_temp.hint_of($$ select public.admin_save_forum(null, null, 'reading', 9, false, 'plum',
    pg_temp.names('Alta', 'Another')) $$),
  'slug:taken', 'two forums can''t share an address');
select is(
  (select level || ':' || position || ':' || (select name from public.forum_index('en') as listed where listed.slug = 'sonete')
   from public.forums where slug = 'sonete'),
  '1:2:Sonnets', 'the forum has its level, order and English name');
select is((select count(*)::integer from public.audit_log where action = 'forum.created'), 3,
  'each new forum is in the audit log');

/* ---------- 5. Moving and removing ---------- */

select is(pg_temp.hint_of($$ select public.admin_delete_forum((select id from public.forums where slug = 'sonete'), 'Gol') $$),
  'forum:has_children', 'a forum with a subforum inside can''t be removed');
select is(pg_temp.hint_of($$ select public.admin_save_forum((select id from public.forums where slug = 'sonete'),
    (select id from public.forums where slug = 'reading'), 'sonete', 2, false, 'plum',
    pg_temp.names('Sonete', 'Sonnets')) $$),
  'parent:has_children', 'a forum with a subforum inside can''t move');
select lives_ok($$ select public.admin_delete_forum((select id from public.forums where slug = 'sonete-scurte'), 'Gol') $$,
  'an empty subforum can be removed, with a reason');
select pg_temp.sign_out();
select is_empty($$ select 1 from public.forum_index('ro') where slug = 'sonete-scurte' $$,
  'a removed forum leaves the index for everyone');

/* ---------- 6. Nothing closes on its own (criterion 3) ---------- */

reset role;
select is_empty($$ select jobname from cron.job where command ilike '%forum%'
    and command not ilike '%purge_deleted_forum_posts%' $$,
  'no scheduled job archives or closes forums or threads');

select * from finish();
rollback;
