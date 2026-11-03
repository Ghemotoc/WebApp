-- Database tests for PDF downloads beside Word (bundle ADMIN-2, part d; story S1-E11-09b; Robert,
-- 2 Nov 2026: a PDF wherever a Word file is offered).
-- What it proves:
-- - Download my stories takes a format: Word, PDF or both; one story's chapters as PDF is a
--   single .pdf, Word and PDF together are a ZIP, all stories are a ZIP, and the JSON copy alone
--   stays a .json whatever the format; an unknown format is refused;
-- - the same choices in another format never reuse the earlier files; the same format does;
-- - the exports bucket takes PDF files, and staff can send a PDF on its own in a data request
--   copy (and still not other kinds of file).
-- Personas: adult_writer (…01, owns seed story …9000…0001), support (…11). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', '00000000-0000-4000-8000-0000000000' || persona_suffix, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
create temp table answers (label text primary key, answer jsonb);
create temp table test_request (id uuid, reference text);
grant all on answers, test_request to authenticated;

/* ---------- The format a writer chooses ---------- */

select pg_temp.sign_in('01');
select ok(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false, 'pdf')
  ->> 'file_name' like '%.pdf', 'one story''s chapters as PDF is a single PDF file');
select ok(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, false, true, false, 'pdf')
  ->> 'file_name' like '%.pdf', 'the plan alone as PDF is a single PDF file');
select ok(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false, 'both')
  ->> 'file_name' like '%.zip', 'Word and PDF together come in one ZIP');
select ok(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false)
  ->> 'file_name' like '%.docx', 'leaving the format out still gives a Word file, as before');
select ok(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, false, false, true, 'pdf')
  ->> 'file_name' like '%.json', 'the JSON copy alone stays a JSON file whatever the format');
select ok(public.request_stories_export(null, null, true, false, false, 'pdf')
  ->> 'file_name' like '%.zip', 'all the writer''s stories as PDF come in one ZIP');
select throws_ok(
  $$ select public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false, 'epub') $$,
  '23514', null, 'a format we don''t make is refused');
select is((select document_format from public.exports where kind = 'my_stories' and state = 'building'), 'pdf',
  'the export remembers the format chosen');

/* ---------- Offering the same files again ---------- */

-- The PDF of one story was made and finished a minute ago.
insert into answers values
  ('pdf', public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false, 'pdf'));
select pg_temp.as_owner();
insert into storage.objects (bucket_id, name, owner, metadata)
values ('exports', (select answer ->> 'file_name' from answers where label = 'pdf'),
        '00000000-0000-4000-8000-000000000001', '{"size": 4096}'::jsonb);
select pg_temp.sign_in('01');
select public.finish_data_export((select (answer ->> 'export_id')::uuid from answers where label = 'pdf'), 1);

select is(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false, 'pdf')
  ->> 'outcome', 'reused', 'the same choices in the same format offer the PDF already made');
select is(public.request_stories_export('00000000-0000-4000-9000-000000000001', null, true, false, false, 'word')
  ->> 'outcome', 'new', 'the same choices as Word make a new copy, never the PDF');

/* ---------- The bucket and staff copies ---------- */

select pg_temp.as_owner();
select ok((select 'application/pdf' = any (allowed_mime_types) from storage.buckets where id = 'exports'),
  'the exports bucket takes PDF files');

-- A copy request support logged and the person confirmed.
select pg_temp.sign_in('11');
insert into test_request
select (opened ->> 'id')::uuid, opened ->> 'reference'
from (select public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'copy', 'email',
        current_date, '') as opened) as made;
select public.admin_ask_data_request_confirmation(id) from test_request;
select pg_temp.sign_in('01');
select public.answer_data_request((select reference from test_request), true);
select pg_temp.sign_in('11');
select is(jsonb_array_length(public.admin_open_data_request_copy((select id from test_request),
  '[{"display_name": "rain.docx"}, {"display_name": "rain.pdf"}, {"display_name": "rain-plan.pdf"}]')), 3,
  'staff can send a story''s PDF on its own beside its Word file');
select throws_ok($$ select public.admin_open_data_request_copy((select id from test_request),
  '[{"display_name": "rain.exe"}]') $$, '23514', null, 'still only ZIP, Word, PDF, JSON and CSV files');

select * from finish();
rollback;
