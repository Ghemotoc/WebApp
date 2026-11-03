-- Database tests for comment lengths and the kind-words nudge list (bundle ADMIN-2, part d3;
-- Robert, 2 Nov 2026, 22:09 to 22:11; CLAUDE.md rules 1 and 19).
-- What it proves:
-- - a comment on the whole chapter, and a reply to one, may be 3,000 characters, not more;
-- - a comment on one paragraph, and every reply in its thread, may be 500 characters, not more,
--   and the refusal's hint carries the limit for the screen;
-- - the nudge list: policy comment_nudge_words_select_signed_in lets anyone signed in read it
--   (allowed) and nobody signed out (denied); nobody writes it directly;
-- - only the owner and admins add or remove a phrase, each change in the audit log; an empty,
--   over-long or repeated phrase is refused.
-- Nothing here records whether the nudge showed: the check runs in the browser (rule 19).
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) seed story gets a published chapter of two paragraphs.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'leng0001', 1, 'Unu',
  'x', 6, 'published', 'Unu', E'Primul paragraf.\n\nAl doilea paragraf.', 6, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

-- IDs the test names later, kept where every role can read them.
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. The settings ---------- */

select is((select value from public.settings where key = 'comment_max_characters'), '3000'::jsonb,
  'a comment on the whole chapter may be 3,000 characters');
select is((select value::text || '/' || is_public from public.settings where key = 'paragraph_comment_max_characters'),
  '500/true', 'a paragraph comment may be 500 characters, and the screen can read that number');

/* ---------- 2. The whole chapter: 3,000 ---------- */

-- teacher (…07) is an active adult.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'whole', (public.post_comment('statia-meteo-seed01', 'leng0001',
  repeat('a', 3000), false, null) ->> 'id')::uuid;
select is((select char_length(body) from public.comments where id = (select id from named where label = 'whole')),
  3000, 'a 3,000-character comment on the chapter is posted');
select throws_ok($$ select public.post_comment('statia-meteo-seed01', 'leng0001', repeat('a', 3001), false, null) $$,
  '23514', null, 'a 3,001-character comment on the chapter is refused');
select ok((public.post_comment('statia-meteo-seed01', 'leng0001', repeat('b', 2500), false,
  (select id from named where label = 'whole')) ? 'id'), 'a 2,500-character reply to a chapter comment is posted');

/* ---------- 3. One paragraph: 500 ---------- */

insert into named select 'on_two', (public.post_paragraph_comment('statia-meteo-seed01', 'leng0001', 2,
  repeat('c', 500), false) ->> 'id')::uuid;
select isnt((select id from named where label = 'on_two'), null, 'a 500-character comment on a paragraph is posted');
select is(pg_temp.error_hint($$ select public.post_paragraph_comment('statia-meteo-seed01', 'leng0001', 2,
  repeat('c', 501), false) $$), 'paragraph_too_long:500',
  'a 501-character comment on a paragraph is refused, with the limit in the hint');
select throws_ok($$ select public.post_paragraph_comment('statia-meteo-seed01', 'leng0001', 1, repeat('c', 501), false) $$,
  '23514', null, 'and the refusal is a check_violation');
select ok((public.post_comment('statia-meteo-seed01', 'leng0001', repeat('d', 500), false,
  (select id from named where label = 'on_two')) ? 'id'), 'a 500-character reply in a paragraph''s thread is posted');
select is(pg_temp.error_hint(format($$ select public.post_comment('statia-meteo-seed01', 'leng0001',
  repeat('d', 501), false, %L) $$, (select id from named where label = 'on_two'))), 'paragraph_too_long:500',
  'a 501-character reply in a paragraph''s thread is refused: it takes its comment''s paragraph first');

/* ---------- 4. Reading the nudge list ---------- */

select ok((select count(*) from public.comment_nudge_words where language = 'en') > 0
  and (select count(*) from public.comment_nudge_words where language = 'ro') > 0,
  'allowed: anyone signed in reads both lists (comment_nudge_words_select_signed_in)');
select throws_ok($$ insert into public.comment_nudge_words (language, phrase) values ('en', 'meanie') $$,
  '42501', null, 'a member can''t add to the list directly');
select throws_ok($$ select public.admin_add_nudge_word('en', 'meanie') $$,
  '42501', null, 'nor through the staff function');

select pg_temp.sign_out();
select throws_ok($$ select count(*) from public.comment_nudge_words $$,
  '42501', null, 'denied: a signed-out visitor can''t read the list');

/* ---------- 5. Staff edit the list ---------- */

-- moderator (…10) may not change settings; admin (…09) may.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_add_nudge_word('en', 'meanie') $$,
  '42501', null, 'a moderator can''t add a phrase');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into named select 'meanie', public.admin_add_nudge_word('en', '  Meanie  ');
select is((select phrase from public.comment_nudge_words where id = (select id from named where label = 'meanie')),
  'Meanie', 'an admin adds a phrase, trimmed');
select throws_ok($$ select public.admin_add_nudge_word('en', 'meanie') $$,
  '23505', null, 'the same phrase again, in any case, is refused');
select throws_ok($$ select public.admin_add_nudge_word('en', '   ') $$,
  '23514', null, 'an empty phrase is refused');
select throws_ok($$ select public.admin_add_nudge_word('fr', 'méchant') $$,
  '23514', null, 'a third language is refused');
select ok(public.admin_remove_nudge_word((select id from named where label = 'meanie')),
  'an admin removes a phrase');

select pg_temp.sign_out();
reset role;
select is((select string_agg(action, ',' order by created_at, action) from public.audit_log
           where target_type = 'comment_nudge_words' and target_id = (select id::text from named where label = 'meanie')),
  'settings.nudge_word_added,settings.nudge_word_removed', 'both changes are in the audit log');
select throws_ok($$ select public.admin_remove_nudge_word(gen_random_uuid()) $$,
  '42501', null, 'outside a staff session nobody removes a phrase');

select * from finish();
rollback;
