/*
 * Migration: PDF downloads beside Word (bundle ADMIN-2, part d; story S1-E11-09b, "PDF later" for
 * story exports, Q29; Robert, 2 Nov 2026: a PDF wherever a Word file is offered, for stories and
 * for every download that includes the plan from Story Atlas).
 *
 * The PDF files are built in the person's (or staff member's) own browser with the shared PDF
 * builder (src/lib/pdf/), exactly as the Word files are (ADR 0012). The database only has to:
 * - remember the format a writer chose for Download my stories (Word, PDF or both) in the new
 *   exports.document_format, so an unchanged copy is only offered again for the same format;
 * - name the file after it: one PDF for one story is a .pdf, Word and PDF together are a ZIP
 *   (export_file_extension() now counts the files);
 * - accept .pdf files in the exports bucket and for staff copies sent file by file.
 * Download my data and staff copies hold both formats for every story and plan; they need no new
 * column. Q49 (which PDF tool) is OPEN: the builder is pdfmake as a proposal, and nothing here
 * depends on that choice.
 * Who calls it: src/features/data-export/ (Download my stories) and src/features/data-requests/
 * (staff copies). Tests: supabase/tests/database/245-pdf-downloads.test.sql.
 */

/* ---------- The format a writer chose ---------- */

alter table public.exports
  add column document_format text not null default 'word'
    constraint exports_document_format_known check (document_format in ('word', 'pdf', 'both'));

comment on column public.exports.document_format is
  'For my_stories: the chapters and plan as Word files, PDF files or both (ADMIN-2d; S1-E11-09b). Other kinds keep word and hold both formats inside their ZIP.';

/**
 * export_file_extension: the kind of file an export is saved as, now with the document format.
 * Download my data is always a ZIP; Download my stories is the one file chosen for one story
 * (.docx or .pdf for its chapters or its plan, .json for the machine-readable copy) and a ZIP for
 * anything more, for Word and PDF together, or for all stories.
 * Inputs: the export's kind, story, three choices (chapters, plan, data) and the format ('word',
 *   'pdf' or 'both'). Returns: 'zip', 'docx', 'pdf' or 'json'.
 * Internal: the file name check below and request_stories_export().
 */
create or replace function public.export_file_extension(
  kind public.export_kind, story_id uuid, choices boolean[], document_format text)
returns text
language sql
immutable
set search_path = ''
as $$
  with counted as (
    -- How many files the choices make: the chapters and the plan once per format, the JSON once.
    select (case when choices[1] then 1 else 0 end + case when choices[2] then 1 else 0 end)
             * case when document_format = 'both' then 2 else 1 end
           + case when choices[3] then 1 else 0 end as file_count
  )
  select case
    when kind = 'all_my_data' or story_id is null then 'zip'
    when (select file_count from counted) > 1 then 'zip'
    when (choices[1] or choices[2]) and document_format = 'pdf' then 'pdf'
    when choices[1] or choices[2] then 'docx'
    else 'json'
  end;
$$;

comment on function public.export_file_extension(public.export_kind, uuid, boolean[], text) is
  'Internal: zip, docx, pdf or json for an export, its choices (chapters, plan, data) and format (ADMIN-2d).';
revoke execute on function public.export_file_extension(public.export_kind, uuid, boolean[], text)
  from public, anon, authenticated;

-- The file is a ZIP, a Word file, a PDF, a JSON file or, for a staff copy sent file by file, the
-- library spreadsheet; a staff copy is saved with the same ending as the name the person sees.
alter table public.exports drop constraint exports_file_name_shape;
alter table public.exports add constraint exports_file_name_shape check (
  file_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(zip|docx|pdf|json|csv)$'
  and (
    (kind = 'data_request'
      and substring(file_name from '\.([a-z]+)$') = substring(display_name from '\.([a-z]+)$'))
    or (kind <> 'data_request'
      and file_name like '%.' || public.export_file_extension(
        kind, story_id, array[include_chapters, include_plan, include_data], document_format))));

alter table public.exports drop constraint exports_display_name_shape;
alter table public.exports add constraint exports_display_name_shape check (
  display_name is null or display_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(zip|docx|pdf|json|csv)$');

-- The three-choice version is replaced by the one above.
drop function public.export_file_extension(public.export_kind, uuid, boolean[]);

comment on table public.exports is
  'kind: user_action
A copy of someone''s data: all_my_data is one ZIP they asked for (S1-E13-02; GDPR art. 15 and 20), with every story and plan as Word and PDF files; my_stories is the stories they chose, as Word files, PDF files or both (S1-E13-05, ADMIN-2d); data_request is a file staff built for their data request (S1-E11-09). Each sits in the private exports bucket, readable only by them while ready and for seven days. Purged by S1-E13-04.';

-- The bucket also takes PDF files.
update storage.buckets
set allowed_mime_types = array[
  'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf', 'application/json', 'text/csv']
where id = 'exports';

/* ---------- Asking ---------- */

/**
 * reusable_stories_export: as in S1-E13-05, and the earlier copy must be in the same format, so a
 * writer who asks for a PDF never gets the Word file back.
 * Inputs: the writer, the new export as it would be (story, chapters, choices and format) and the
 * current fingerprint. Returns: the export, or null.
 * Internal: request_stories_export().
 */
create or replace function public.reusable_stories_export(
  owner_id uuid, wanted public.exports, current_fingerprint text)
returns public.exports
language sql
stable
security definer
set search_path = ''
as $$
  select exports.* from public.exports
  where exports.user_id = owner_id and exports.kind = 'my_stories' and exports.state = 'ready'
    and exports.ready_at > now() - interval '24 hours'
    and exports.expires_at > now()
    and exports.story_id is not distinct from wanted.story_id
    and exports.chapter_ids is not distinct from wanted.chapter_ids
    and exports.include_chapters = wanted.include_chapters
    and exports.include_plan = wanted.include_plan
    and exports.include_data = wanted.include_data
    and exports.document_format = wanted.document_format
    and exports.content_fingerprint = current_fingerprint
  order by exports.ready_at desc
  limit 1;
$$;

comment on function public.reusable_stories_export(uuid, public.exports, text) is
  'Internal: the writer''s unchanged copy of the same choices and format from the last 24 hours (S1-E13-05, ADMIN-2d).';
revoke execute on function public.reusable_stories_export(uuid, public.exports, text)
  from public, anon, authenticated;

drop function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean);

/**
 * request_stories_export: "Get my files" (S1-E13-05), now with the format (ADMIN-2d).
 * Opens a copy of the writer's one story, or all of them, with what they ticked, unless the same
 * files in the same format from the last 24 hours can be offered.
 * Inputs: chosen_story_id (null for all the writer's stories); chosen_chapter_ids (one story's
 *   chapters, or null for every chapter); include_chapters; include_plan; include_data (the JSON
 *   copy); document_format: 'word', 'pdf' or 'both' (for the chapters and the plan).
 * Returns: { outcome: 'reused', export_id } for the earlier files, or { outcome: 'new',
 *   export_id, file_name } with the name to upload under (.docx, .pdf, .json or .zip).
 * Errors: insufficient_privilege (hint signed_out); check_violation with hint nothing_chosen,
 *   not_found, no_stories, no_chapters or bad_format; the rate limit's error after ten new copies
 *   in an hour. A suspended writer may ask (criterion 3).
 * Where it fits: makeStoriesExport() calls it first, then my_data_export().
 */
create function public.request_stories_export(
  chosen_story_id uuid default null,
  chosen_chapter_ids uuid[] default null,
  include_chapters boolean default true,
  include_plan boolean default true,
  include_data boolean default false,
  document_format text default 'word')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  problem text;
  wanted public.exports;
  fingerprint text;
  earlier public.exports;
begin
  -- Step 1: the choices make sense (chosen chapters only with one story's chapters ticked) and
  -- the format is one we make.
  if document_format is null or document_format not in ('word', 'pdf', 'both') then
    raise exception 'Choose Word, PDF or both.' using errcode = 'check_violation', hint = 'bad_format';
  end if;
  if chosen_story_id is null or not include_chapters then
    chosen_chapter_ids := null;
  elsif chosen_chapter_ids is not null then
    -- In one order and once each, so the same choice is always the same list.
    chosen_chapter_ids := array(select distinct unnest(chosen_chapter_ids) order by 1);
  end if;
  problem := public.stories_export_choice_problem(caller_id, chosen_story_id, chosen_chapter_ids,
    include_chapters or include_plan or include_data);
  if problem is not null then
    raise exception 'Those files can''t be made.' using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 2: the same files from the last 24 hours, if nothing changed since (criterion 4).
  wanted.story_id := chosen_story_id;
  wanted.chapter_ids := chosen_chapter_ids;
  wanted.include_chapters := include_chapters;
  wanted.include_plan := include_plan;
  wanted.include_data := include_data;
  wanted.document_format := document_format;
  fingerprint := public.stories_fingerprint(caller_id, chosen_story_id);
  earlier := public.reusable_stories_export(caller_id, wanted, fingerprint);
  if earlier.id is not null then
    return jsonb_build_object('outcome', 'reused', 'export_id', earlier.id);
  end if;
  -- Step 3: at most ten new copies an hour; an unfinished one goes.
  perform public.take_rate_limit('stories_export');
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = 'my_stories' and exports.state = 'building';
  -- Step 4: the new one, under a random name of the right kind of file.
  insert into public.exports (user_id, kind, story_id, chapter_ids, include_chapters, include_plan,
    include_data, document_format, content_fingerprint, file_name)
  values (caller_id, 'my_stories', chosen_story_id, chosen_chapter_ids, include_chapters,
    include_plan, include_data, document_format, fingerprint,
    gen_random_uuid()::text || '.' || public.export_file_extension('my_stories', chosen_story_id,
      array[include_chapters, include_plan, include_data], document_format))
  returning * into wanted;
  return jsonb_build_object('outcome', 'new', 'export_id', wanted.id, 'file_name', wanted.file_name);
end;
$$;

comment on function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean, text) is
  'Opens a Download my stories copy of the chosen stories, chapters, plan and JSON as Word, PDF or both, or offers the unchanged one from the last 24 hours (S1-E13-05, ADMIN-2d).';
revoke execute on function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean, text)
  from public, anon;
grant execute on function public.request_stories_export(uuid, uuid[], boolean, boolean, boolean, text)
  to authenticated;

/* ---------- Staff copies ---------- */

/**
 * admin_open_data_request_copy: as in ADMIN-2c2 (S1-E11-09), and a file sent on its own may now
 * be a PDF (ADMIN-2d: every story and plan as Word and PDF).
 * Inputs: target_request_id; files, a JSON array of {"display_name": "rain.pdf"} (1 to 500, each
 *   name unique, ending .zip, .docx, .pdf, .json or .csv).
 * Returns: a JSON array of {export_id, file_name, display_name}: the names to upload under.
 * Errors: as admin_data_request_copy_target(); check_violation with hint bad_files.
 * Where it fits: makeDataRequestCopy(), after the files are built and before they are uploaded.
 */
create or replace function public.admin_open_data_request_copy(target_request_id uuid, files jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_copy_target(target_request_id);
  names text[];
  opened jsonb;
begin
  -- Step 1: the names, checked: a list of 1 to 500 unique names of the allowed kinds.
  if jsonb_typeof(files) <> 'array' then
    raise exception 'Send the list of files.' using errcode = 'check_violation', hint = 'bad_files';
  end if;
  select array_agg(file ->> 'display_name') into names from jsonb_array_elements(files) as file;
  if coalesce(array_length(names, 1), 0) not between 1 and 500
     or (select count(distinct name) from unnest(names) as name) <> array_length(names, 1)
     or exists (select 1 from unnest(names) as name
                where name is null or name !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(zip|docx|pdf|json|csv)$') then
    raise exception 'The list of files isn''t right.' using errcode = 'check_violation', hint = 'bad_files';
  end if;
  -- Step 2: an unfinished copy for this request goes; nobody could read its files.
  delete from public.exports
  where exports.data_request_id = request.id and exports.state = 'building';
  -- Step 3: one export per file, owned by the person, under a random name with the same ending.
  with inserted as (
    insert into public.exports (user_id, kind, data_request_id, display_name, file_name)
    select request.user_id, 'data_request', request.id, name,
      gen_random_uuid()::text || '.' || substring(name from '\.([a-z]+)$')
    from unnest(names) as name
    returning exports.id, exports.file_name, exports.display_name
  )
  select jsonb_agg(jsonb_build_object('export_id', inserted.id, 'file_name', inserted.file_name,
      'display_name', inserted.display_name) order by inserted.display_name)
    into opened from inserted;
  return opened;
end;
$$;
comment on function public.admin_open_data_request_copy(uuid, jsonb) is
  'Staff open the files of a data request copy (Word, PDF, JSON, CSV or a ZIP), under random names, before uploading them (S1-E11-09, ADMIN-2d).';
