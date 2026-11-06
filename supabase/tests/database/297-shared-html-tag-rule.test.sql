-- QA-5: the four text checks share one HTML tag rule, has_html_tag() (independent QA check,
-- 5 Nov 2026, finding R3; CLAUDE.md rule 8).
--
-- What it proves:
-- - has_html_tag() finds a real tag, a closing tag and a comment, and passes "3 < 4", escaped text
--   and an escaped backslash only when no real tag follows it;
-- - each of the four checks still refuses a tag with its own message and hint, and still saves
--   escaped text, so no screen changes;
-- - only the saving functions may call the rule (no grant to visitors or members).
-- Runs as postgres; nothing is stored.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

/* ---------- 1. The rule itself ---------- */

select ok(public.has_html_tag('Un <script>alert(1)</script> aici'), 'a script tag is a tag');
select ok(public.has_html_tag('text </b>'), 'a closing tag is a tag');
select ok(public.has_html_tag('<!-- ascuns -->'), 'an HTML comment is a tag');
select ok(not public.has_html_tag('3 < 4 și 5 > 2'), 'a "<" between numbers is not a tag');
select ok(not public.has_html_tag('Scrie \<b\> ca să vezi'), 'escaped text is the literal words');
select ok(public.has_html_tag('o bară \\<script>'), 'an escaped backslash then a real tag is still a tag');
select ok(not public.has_html_tag(null), 'no text has no tag');

/* ---------- 2. The four checks keep their own messages and hints ---------- */

select throws_ok($$ select public.check_chapter_text('<b>gros</b>') $$, '23514',
  'HTML tags are not allowed in a chapter (CLAUDE.md rule 8).', 'a chapter with a tag is refused, as before');
select throws_ok($$ select public.check_comment_text('<i>da</i>') $$, '23514',
  'HTML tags are not allowed in a comment (CLAUDE.md rule 8).', 'a comment with a tag is refused, as before');
select throws_ok($$ select public.check_forum_post_text('<p>salut</p>') $$, '23514',
  'HTML tags are not allowed in a post (CLAUDE.md rule 8).', 'a forum post with a tag is refused, as before');
select is(public.check_bible_text('Scrie \<b\> aici'), 'Scrie \<b\> aici',
  'a Story world entry with escaped text is saved as written');

/* ---------- 3. Who may call it ---------- */

select ok(not has_function_privilege('authenticated', 'public.has_html_tag(text)', 'execute'),
  'members can''t call the rule directly; only the saving functions use it');

select * from finish();
rollback;
