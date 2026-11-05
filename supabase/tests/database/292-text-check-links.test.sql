-- QA-1a: the four text checks refuse unsafe link addresses but let ordinary words through
-- (independent QA check, 5 Nov 2026, finding A1; CLAUDE.md rule 8).
--
-- What it proves:
-- - "Data: 12 martie", "Metadata: none" and "javascript: a language" are ordinary sentences: a
--   chapter, a comment, a Story world entry and a forum post can all hold them.
-- - A link or picture whose address is javascript:, data: or vbscript: is still refused, in any
--   case, with spaces or tabs hidden inside, in angle brackets, as a reference definition or behind
--   an HTML character code.
-- - http, https and mailto links still pass.
-- Personas: none; the checks are plain functions, called as the owner. Nothing is written.

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

/* ---------- Ordinary words pass in every kind of text ---------- */

select lives_ok($$ select public.check_chapter_text('Data: 12 martie. Metadata: none.') $$,
  'a chapter can say "Data: 12 martie" and "Metadata: none"');
select lives_ok($$ select public.check_comment_text('Data: 12 martie, la ora 8.') $$,
  'a comment can say "Data: 12 martie"');
select lives_ok($$ select public.check_bible_text('Data: the day the war began.') $$,
  'a Story world entry can say "Data: ..."');
select lives_ok($$ select public.check_forum_post_text('Data: vineri. Am învățat javascript: e greu.') $$,
  'a forum post can talk about "Data:" and "javascript:" in a sentence');
select is(public.check_chapter_text('Data: 12 martie'), 'Data: 12 martie',
  'the checked chapter text comes back unchanged');

/* ---------- Safe links pass ---------- */

select lives_ok($$ select public.check_chapter_text('[site](https://example.org) and [mail](mailto:a@example.org)') $$,
  'https and mailto links still pass');
select is(public.has_unsafe_link('[old](http://example.org/data:1)'), false,
  'an http address that holds "data:" later on is not refused');
select is(public.has_unsafe_link(null), false, 'empty text has no unsafe link');

/* ---------- Unsafe addresses are refused by the shared rule ---------- */

select is(public.has_unsafe_link('[click](javascript:alert(1))'), true, 'a javascript: link is unsafe');
select is(public.has_unsafe_link('[click](JavaScript:alert(1))'), true, 'the scheme is read in any case');
select is(public.has_unsafe_link('[click](  java	script:alert(1))'), true,
  'a tab hidden inside the scheme is still caught');
select is(public.has_unsafe_link('[click](<javascript:alert(1)>)'), true,
  'an address in angle brackets is still read');
select is(public.has_unsafe_link('![pic](data:image/svg+xml;base64,AAAA)'), true,
  'a picture with a data: address is unsafe');
select is(public.has_unsafe_link('[x](vbscript:msgbox)'), true, 'a vbscript: link is unsafe');
select is(public.has_unsafe_link(E'See [here][1].\n\n[1]: javascript:alert(1)'), true,
  'a reference definition with a javascript: address is unsafe');
select is(public.has_unsafe_link('[x](&#106;avascript:alert(1))'), true,
  'an address hidden behind an HTML character code is unsafe');

/* ---------- Every check refuses them, with its usual message and hint ---------- */

select throws_ok($$ select public.check_chapter_text('[click](javascript:alert(1))') $$,
  '23514', 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).',
  'a chapter with a javascript: link is refused');
select throws_ok($$ select public.check_comment_text('![pic](data:text/html,hi)') $$,
  '23514', 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).',
  'a comment with a data: picture is refused');
select throws_ok($$ select public.check_bible_text('[x](vbscript:msgbox)') $$,
  '23514', 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).',
  'a Story world entry with a vbscript: link is refused');
select throws_ok($$ select public.check_forum_post_text('[x](javascript:void(0))') $$,
  '23514', 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).',
  'a forum post with a javascript: link is refused');

-- The screens map the hint to a message, so the hints must not change.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when check_violation then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
select is(pg_temp.hint_of($$ select public.check_bible_text('[x](javascript:a)') $$), 'script_link',
  'a Story world entry keeps the script_link hint');
select is(pg_temp.hint_of($$ select public.check_forum_post_text('[x](javascript:a)') $$), 'body:link',
  'a forum post keeps the body:link hint');

/* ---------- The other rules are unchanged ---------- */

select throws_ok($$ select public.check_comment_text('<b>bold</b>') $$, '23514',
  'HTML tags are not allowed in a comment (CLAUDE.md rule 8).', 'raw HTML is still refused');
select lives_ok($$ select public.check_comment_text(repeat('a', 3000)) $$,
  'a comment of 3,000 characters passes (the decided length)');
select throws_ok($$ select public.check_comment_text(repeat('a', 3001)) $$, '23514',
  'A comment can have at most 3000 characters.', 'a comment of 3,001 characters is refused');

select * from finish();
rollback;
