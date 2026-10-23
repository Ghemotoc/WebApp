-- Database tests for the autosave (story S1-E3-02a; CLAUDE.md rules 4 and 8; ADR 0005).
-- What it proves:
-- - save_chapter_draft() saves the title and body, moves the version on, stamps the time and
--   counts the words;
-- - a stale version is a conflict that changes nothing (the warning S1-E3-02b shows);
-- - the server refuses raw HTML tags, javascript:/data: links, an over-long body and an
--   over-long title, so a script can never be stored (rule 8);
-- - ş and ţ with a cedilla are saved as ș and ț (rule 4);
-- - the account gate: kid_14_waiting, teen_17 (read-only while adults_only is on) and a
--   visitor can't save; another writer gets not_found.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- A chapter to work on, made the way the app makes it.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table the_chapter as
  select (public.create_chapter('statia-meteo-seed01')) ->> 'code' as code;
create function pg_temp.code() returns text language sql as $$ select code from the_chapter $$;

-- 1. A normal save.
select results_eq(
  $$ select answer ->> 'status', (answer ->> 'version')::integer, (answer ->> 'word_count')::integer
     from public.save_chapter_draft(pg_temp.code(), '  Capitolul   unu ', E'Bunica mea **notează** vremea.\n\n* * *\n\nÎn fiecare dimineață.', 1) as answer $$,
  $$ values ('saved', 2, 7) $$,
  'the first save answers saved, version 2 and the word count (Markdown marks not counted)'
);
select results_eq(
  $$ select draft_title, draft_version, draft_saved_at is not null, word_count from public.chapters where code = pg_temp.code() $$,
  $$ values ('Capitolul unu', 2, true, 7) $$,
  'the title is trimmed and stored, the version moved on, the time stamped'
);

-- 2. A stale version is a conflict that changes nothing.
select is((public.save_chapter_draft(pg_temp.code(), 'Other device', 'Other text', 1)) ->> 'status', 'conflict',
  'a save from the version before answers conflict');
select is((select draft_title from public.chapters where code = pg_temp.code()), 'Capitolul unu',
  'the conflicting save changed nothing');
select is((public.save_chapter_draft(pg_temp.code(), 'Capitolul unu', 'Text nou.', 2)) ->> 'status', 'saved',
  'a save with the current version goes through');

-- 3. The sanitising rules (rule 8).
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 't', 'Hello <script>alert(1)</script>', 3) $$,
  '23514', null, 'a <script> tag is refused');
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 't', 'Hello <img src=x onerror=alert(1)>', 3) $$,
  '23514', null, 'an <img onerror> tag is refused');
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 't', 'See [here](javascript:alert(1))', 3) $$,
  '23514', null, 'a javascript: link is refused');
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 't', 'See [here](data:text/html;base64,AAAA)', 3) $$,
  '23514', null, 'a data: link is refused');
select is((public.save_chapter_draft(pg_temp.code(), 't', 'Three < four and [site](https://example.org) and [mail](mailto:a@b.ro).', 3)) ->> 'status', 'saved',
  'a plain < between words and http/mailto links are fine');
select is((public.save_chapter_draft(pg_temp.code(), 't', E'Escaped words: \\<script\\> stay words', 4)) ->> 'status', 'saved',
  'backslash-escaped text (what the editor writes for a typed "<script>") is literal text and saves');
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 't', E'Sneaky \\\\<script>alert(1)</script>', 5) $$,
  '23514', null, 'an escaped backslash followed by a real tag is still refused');
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 't', repeat('a', 100001), 5) $$,
  '23514', null, 'a body over chapter_max_characters (100,000) is refused');
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), repeat('t', 121), 'ok', 5) $$,
  '23514', null, 'a title over 120 characters is refused');

-- 4. ş and ţ (cedilla) become ș and ț (comma below) on the server (rule 4).
select is((public.save_chapter_draft(pg_temp.code(), 'Poveşti', 'Aşa şi ţie, Ştefan.', 5)) ->> 'status', 'saved',
  'a body with cedilla letters saves');
select results_eq(
  $$ select draft_title, draft_body from public.chapters where code = pg_temp.code() $$,
  $$ values ('Povești', 'Așa și ție, Ștefan.') $$,
  'the saved text uses ș and ț with a comma below'
);

-- 5. Other people and read-only accounts.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.save_chapter_draft(pg_temp.code(), 'x', 'x', 6)) ->> 'status', 'not_found',
  'another writer can''t save someone else''s chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.save_chapter_draft(pg_temp.code(), 'x', 'x', 6)) ->> 'status', 'not_active',
  'kid_14_waiting can''t save a chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.save_chapter_draft(pg_temp.code(), 'x', 'x', 6)) ->> 'status', 'not_active',
  'teen_17 can''t save while the test is for invited adults only');
select pg_temp.sign_out();
select throws_ok($$ select public.save_chapter_draft(pg_temp.code(), 'x', 'x', 6) $$, '42501', null,
  'a signed-out visitor can''t call save_chapter_draft()');
reset role;
select is((select draft_body from public.chapters where code = pg_temp.code()), 'Așa și ție, Ștefan.',
  'none of those attempts changed the chapter');

select * from finish();

rollback;
