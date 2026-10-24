-- Story S1-E10-08: "Copied from a published work" report.
-- What this migration does:
-- - reports get the source fields (title, author, ISBN or address, the source's passage) and the
--   passage the reader selected; all optional, only with the reason copied_published_work
--   (Robert, canvas comment, 16 Oct 2026: even just a title helps);
-- - report_item() takes them as an optional copy_details; earlier calls keep working;
-- - report_detail_requests: "Ask for more details", a moderator's question to a reporter and the
--   reporter's answer, read by moderation staff and by that reporter only;
-- - copied_work_notes: the public note on a story whose copying a moderator confirmed with the
--   decision public_note; before a decision nothing public changes;
-- - admin_case_reports() returns the source and the reported passage, so the case page shows
--   them side by side, with any question and answer.
-- No plagiarism scanning (decided: only for works the imprint acquires, Stage 5); no similarity
-- percentage is a safe harbour (Infopaq). Needs the lawyer's review before launch.
-- Who runs it: Supabase's GitHub integration when main changes (never from a session).

/* ---------- The source fields on reports ---------- */

alter table public.reports
  add column copy_source_title text,
  add column copy_source_author text,
  add column copy_source_reference text,
  add column copy_source_passage text,
  add column reported_passage text,
  -- Only a copied-work report carries them; each within its length.
  add constraint reports_copy_fields_only_for_copies check (
    reason = 'copied_published_work'
    or (copy_source_title is null and copy_source_author is null and copy_source_reference is null
        and copy_source_passage is null and reported_passage is null)),
  add constraint reports_copy_field_lengths check (
    coalesce(char_length(copy_source_title), 0) <= 300
    and coalesce(char_length(copy_source_author), 0) <= 200
    and coalesce(char_length(copy_source_reference), 0) <= 2000
    and coalesce(char_length(copy_source_passage), 0) <= 4000
    and coalesce(char_length(reported_passage), 0) <= 4000);

comment on column public.reports.copy_source_title is 'Copied-work report: the published work''s title, optional (S1-E10-08).';
comment on column public.reports.reported_passage is 'Copied-work report: the passage the reader selected in the story, attached automatically (S1-E10-08).';

/* ---------- report_item() with the source ---------- */

-- The old four-argument function goes, so a call with four arguments isn't ambiguous.
drop function public.report_item(public.reportable_type, text, public.report_reason, text);

/**
 * report_item: as in S1-E10-06, plus copy_details for a copied-work report (S1-E10-08).
 * Inputs: item_type, item_reference, reason, details (optional) and copy_details (optional JSON:
 *   sourceTitle, sourceAuthor, sourceReference, sourcePassage, reportedPassage; ignored for any
 *   other reason).
 * Returns: the reference and the time. Errors: as before; check_violation when a source field is
 *   too long.
 */
create or replace function public.report_item(
  item_type public.reportable_type,
  item_reference text,
  reason public.report_reason,
  details text default null,
  copy_details jsonb default null
)
returns table (report_reference text, received_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid := (select auth.uid());
  pause public.sanctions;
  item record;
  existing public.reports;
  new_report public.reports;
  hourly_limit integer := coalesce(public.setting_value('report_hourly_limit'), '20')::text::integer;
  -- The source fields count only for a copied-work report.
  copy jsonb := case when reason = 'copied_published_work' then coalesce(copy_details, '{}'::jsonb) else '{}'::jsonb end;
begin
  -- Step 1: signed in, whatever the account's state.
  if reporter_id is null then
    raise exception 'Log in to report something.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1b: a paused reporter waits (S1-E10-06, Q83).
  pause := public.active_sanction(reporter_id, 'reporting_pause');
  if pause.id is not null then
    raise exception 'Your reporting is paused until %.', pause.ends_at using errcode = 'object_not_in_prerequisite_state';
  end if;
  -- Step 2: the item, and whose it is; never one's own.
  select * into item from public.reportable_item_owner(item_type, item_reference);
  if item.owner_user_id = reporter_id then
    raise exception 'You can''t report your own %.', item_type using errcode = 'check_violation';
  end if;
  -- Step 3: the same report twice within a day gives the same reference.
  select * into existing from public.reports
    where reports.user_id = reporter_id and reports.item_type = report_item.item_type
      and reports.item_id = item.item_id and reports.created_at > now() - interval '24 hours'
    order by reports.created_at desc limit 1;
  if existing.id is not null then
    return query select existing.reference, existing.created_at;
    return;
  end if;
  -- Step 4: the hourly limit (proposal), so one account can't flood the queue.
  if (select count(*) from public.reports
      where reports.user_id = reporter_id and reports.created_at > now() - interval '1 hour') >= hourly_limit then
    raise exception 'Too many reports in an hour; try again later.' using errcode = 'program_limit_exceeded';
  end if;
  -- Step 5: the row, with the reporter's age group, a reference and the source (S1-E10-08).
  insert into public.reports (user_id, item_type, item_id, reported_user_id, reason, details,
                              reporter_age_band, reference, copy_source_title, copy_source_author,
                              copy_source_reference, copy_source_passage, reported_passage)
  values (reporter_id, item_type, item.item_id, item.owner_user_id, reason, nullif(btrim(details), ''),
          public.age_band(), 'R-' || lpad(nextval('public.report_reference_seq')::text, 6, '0'),
          nullif(btrim(copy ->> 'sourceTitle'), ''), nullif(btrim(copy ->> 'sourceAuthor'), ''),
          nullif(btrim(copy ->> 'sourceReference'), ''), nullif(btrim(copy ->> 'sourcePassage'), ''),
          nullif(btrim(copy ->> 'reportedPassage'), ''))
  returning * into new_report;
  -- Step 6: the case: opened, or joined when the item already has one (S1-E10-03a).
  update public.reports set case_id = public.attach_report_to_case(new_report)
    where reports.id = new_report.id;
  return query select new_report.reference, new_report.created_at;
end;
$$;

comment on function public.report_item(public.reportable_type, text, public.report_reason, text, jsonb) is
  'Reports an item: checks the reporter, the item, duplicates and the hourly limit, stores the report (with a copied-work source, S1-E10-08) and opens or joins its case (S1-E10-01, S1-E10-03a, S1-E10-06).';
revoke execute on function public.report_item(public.reportable_type, text, public.report_reason, text, jsonb) from public, anon;
grant execute on function public.report_item(public.reportable_type, text, public.report_reason, text, jsonb) to authenticated;

/* ---------- Ask for more details ---------- */

create table public.report_detail_requests (
  id uuid primary key default gen_random_uuid(),
  -- The reporter: the person asked, and the owner of the answer (rule 15).
  user_id uuid not null references public.profiles (id),
  report_id uuid not null references public.reports (id),
  case_id uuid not null references public.cases (id),
  -- The moderator who asked.
  requested_by_user_id uuid not null references public.profiles (id),
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_detail_requests_question_length check (char_length(question) between 1 and 1000),
  constraint report_detail_requests_answer_length check (answer is null or char_length(answer) between 1 and 4000),
  constraint report_detail_requests_answer_has_time check ((answer is null) = (answered_at is null))
);

comment on table public.report_detail_requests is
  'kind: user_action
"Ask for more details": a moderator''s question to a reporter and the reporter''s answer; user_id is the reporter (S1-E10-08). Made only through admin_request_report_details() and answer_report_detail_request(). Kept with the report.';
comment on column public.report_detail_requests.answer is 'What the reporter wrote back; read by moderation staff and the reporter; never logged (rule 12).';

create index report_detail_requests_report_id_idx on public.report_detail_requests (report_id);
create index report_detail_requests_user_id_idx on public.report_detail_requests (user_id) where answered_at is null;

create trigger report_detail_requests_set_updated_at
  before update on public.report_detail_requests
  for each row execute function public.set_updated_at();

alter table public.report_detail_requests enable row level security;

/**
 * Policy report_detail_requests_select_moderation: moderation staff read the questions and
 * answers on cases they may see (a safeguarding case needs the permission). Why: the case page
 * shows them next to the report.
 */
create policy report_detail_requests_select_moderation
  on public.report_detail_requests
  for select
  to authenticated
  using (exists (select 1 from public.cases
                 where cases.id = report_detail_requests.case_id
                   and (select public.may_see_case(cases.is_safeguarding))));

comment on policy report_detail_requests_select_moderation on public.report_detail_requests is
  'Allows moderation staff who may see the case to read its detail requests (S1-E10-08).';

/**
 * Policy report_detail_requests_select_own: a reporter reads the questions asked about their own
 * reports. Why: they answer them in Settings; nobody else's.
 */
create policy report_detail_requests_select_own
  on public.report_detail_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy report_detail_requests_select_own on public.report_detail_requests is
  'Allows a reporter to read the questions about their own reports (S1-E10-08).';

-- Reads only; writes go through the two functions below.
grant select on public.report_detail_requests to authenticated;

/**
 * admin_request_report_details: a moderator asks a reporter for more details about one report.
 * Inputs: the report's reference (R-000123) and the question. Returns: nothing.
 * Errors: insufficient_privilege unless the caller may act on the case; check_violation without
 *   a question, or when the report's case is decided or a question is still unanswered;
 *   no_data_found for an unknown reference. Audited in the same transaction.
 */
create or replace function public.admin_request_report_details(report_reference text, question text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.reports;
  target_case public.cases;
begin
  -- Step 1: the report and its case, and whether the caller may act on it.
  select * into target from public.reports where reports.reference = report_reference;
  if target.id is null then
    raise exception 'There is no report like that.' using errcode = 'no_data_found';
  end if;
  select * into target_case from public.cases where cases.id = target.case_id;
  if not public.staff_may('moderation', 'act') or not public.may_see_case(target_case.is_safeguarding) then
    raise exception 'You can''t ask about this report.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a question, on an open case, one at a time.
  if btrim(coalesce(question, '')) = '' then
    raise exception 'Write the question.' using errcode = 'check_violation';
  end if;
  if target_case.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.report_detail_requests
             where report_id = target.id and answered_at is null) then
    raise exception 'A question about this report is still waiting for an answer.' using errcode = 'check_violation';
  end if;
  -- Step 3: the request and the audit row.
  insert into public.report_detail_requests (user_id, report_id, case_id, requested_by_user_id, question)
  values (target.user_id, target.id, target.case_id, (select auth.uid()), btrim(question));
  perform public.log_staff_action('report.details_requested', 'reports', target.id::text, target.user_id,
    null, null, jsonb_build_object('reference', target.reference));
end;
$$;

comment on function public.admin_request_report_details(text, text) is
  'Staff: asks a reporter for more details about one report, audited (S1-E10-08).';
revoke execute on function public.admin_request_report_details(text, text) from public, anon;
grant execute on function public.admin_request_report_details(text, text) to authenticated;

/**
 * my_report_detail_requests: the caller's open questions from the moderation team, for Settings.
 * Returns: each question with its ID (to answer it), the report's reference and reason, the
 *   question and when it was asked; never the moderator. Errors: none; signed out, nothing.
 */
create or replace function public.my_report_detail_requests()
returns table (request_id uuid, report_reference text, reason public.report_reason, question text, asked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  -- Security definer, because a reporter can't read the reports table itself; the where clause
  -- keeps it to the caller's own questions, as report_detail_requests_select_own does.
  select requests.id, reports.reference, reports.reason, requests.question, requests.created_at
  from public.report_detail_requests as requests
  join public.reports on reports.id = requests.report_id
  where requests.user_id = (select auth.uid()) and requests.answered_at is null
  order by requests.created_at;
$$;

comment on function public.my_report_detail_requests() is
  'The signed-in reporter''s unanswered questions from moderators (S1-E10-08).';
revoke execute on function public.my_report_detail_requests() from public, anon;
grant execute on function public.my_report_detail_requests() to authenticated;

/**
 * answer_report_detail_request: the reporter answers a moderator's question, once.
 * Inputs: the request's ID and the answer. Errors: no_data_found unless it is the caller's own
 *   unanswered question; check_violation for an empty or too long answer.
 */
create or replace function public.answer_report_detail_request(target_request_id uuid, answer_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: an answer within the length.
  if btrim(coalesce(answer_text, '')) = '' or char_length(btrim(answer_text)) > 4000 then
    raise exception 'Write an answer of at most 4,000 characters.' using errcode = 'check_violation';
  end if;
  -- Step 2: only the caller's own question, and only once.
  update public.report_detail_requests
    set answer = btrim(answer_text), answered_at = now()
    where id = target_request_id and user_id = (select auth.uid()) and answered_at is null;
  if not found then
    raise exception 'There is no open question like that.' using errcode = 'no_data_found';
  end if;
end;
$$;

comment on function public.answer_report_detail_request(uuid, text) is
  'A reporter answers a moderator''s question about their report, once (S1-E10-08).';
revoke execute on function public.answer_report_detail_request(uuid, text) from public, anon;
grant execute on function public.answer_report_detail_request(uuid, text) to authenticated;

/* ---------- The public note ---------- */

create table public.copied_work_notes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id),
  -- The story's writer (rule 15); never shown publicly.
  user_id uuid not null references public.profiles (id),
  case_id uuid not null references public.cases (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copied_work_notes_one_per_story unique (story_id)
);

comment on table public.copied_work_notes is
  'kind: staff
The public note "Moderators found that parts of this story copy a published work", added by the decision public_note (S1-E10-08). Read publicly only through story_has_copied_work_note().';

create trigger copied_work_notes_set_updated_at
  before update on public.copied_work_notes
  for each row execute function public.set_updated_at();

alter table public.copied_work_notes enable row level security;

/**
 * Policy copied_work_notes_select_moderation: moderation staff read every note. Why: the case
 * page and later appeals (S1-E10-07).
 */
create policy copied_work_notes_select_moderation
  on public.copied_work_notes
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy copied_work_notes_select_moderation on public.copied_work_notes is
  'Allows moderation staff to read public notes on copied stories (S1-E10-08).';

/**
 * Policy copied_work_notes_select_own: a writer reads the note on their own story. Why: they see
 * what readers see and can appeal it.
 */
create policy copied_work_notes_select_own
  on public.copied_work_notes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy copied_work_notes_select_own on public.copied_work_notes is
  'Allows a writer to read the note on their own story (S1-E10-08).';

grant select on public.copied_work_notes to authenticated;

/**
 * story_has_copied_work_note: whether a story carries the public copied-work note, for the story
 * page. Input: the story's ID. Returns: true or false; nothing else about the case.
 * Errors: none. Open to everyone, because the note is public.
 */
create or replace function public.story_has_copied_work_note(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.copied_work_notes where story_id = target_story_id);
$$;

comment on function public.story_has_copied_work_note(uuid) is
  'Public: whether a story carries the copied-work note (S1-E10-08).';
revoke execute on function public.story_has_copied_work_note(uuid) from public;
grant execute on function public.story_has_copied_work_note(uuid) to anon, authenticated;

/**
 * add_copied_work_note: puts the note on the case's story (a chapter's case notes its story).
 * Input: the case. Errors: check_violation when the case is not about a story or a chapter.
 * Internal: admin_decide_case() calls it.
 */
create or replace function public.add_copied_work_note(target public.cases)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  -- Step 1: the story the case is about.
  if target.item_type = 'story' then
    target_story_id := target.item_id;
  elsif target.item_type = 'chapter' then
    select chapters.story_id into target_story_id from public.chapters where chapters.id = target.item_id;
  end if;
  if target_story_id is null then
    raise exception 'A public note goes on a story or a chapter only.' using errcode = 'check_violation';
  end if;
  -- Step 2: one note per story; a later case keeps the first.
  insert into public.copied_work_notes (story_id, user_id, case_id)
  values (target_story_id, target.user_id, target.id)
  on conflict (story_id) do nothing;
end;
$$;

comment on function public.add_copied_work_note(public.cases) is
  'Internal: puts the copied-work note on a case''s story (S1-E10-08).';
revoke execute on function public.add_copied_work_note(public.cases) from public, anon, authenticated;

/* ---------- The decision public_note ---------- */

/**
 * admin_decide_case: as in S1-E10-06, plus the action public_note, which only a story or chapter
 * case may take and which puts the copied-work note on the story (S1-E10-08).
 */
create or replace function public.admin_decide_case(
  target_case_id uuid,
  chosen_action public.moderation_action,
  note_text text,
  suspension_days integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  -- Step 1: may act, and may see this case.
  select * into target from public.cases where id = target_case_id for update;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('moderation', 'act') then
    raise exception 'You can''t decide this case.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a note is required; a decided case stays decided; restrict isn't built yet; a public
  -- note goes on a story or a chapter only.
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  if target.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
  end if;
  if chosen_action = 'restrict' then
    raise exception 'Restricting an item comes with S1-E11-08.' using errcode = 'feature_not_supported';
  end if;
  if chosen_action = 'public_note' and target.item_type not in ('story', 'chapter') then
    raise exception 'A public note goes on a story or a chapter only.' using errcode = 'check_violation';
  end if;
  -- Step 3: the decision, the case and its reports.
  insert into public.case_actions (case_id, user_id, action, note)
  values (target.id, (select auth.uid()), chosen_action, btrim(note_text));
  update public.cases set status = 'decided', decision = chosen_action, decided_at = now(),
    decided_by_user_id = (select auth.uid())
  where id = target.id;
  update public.reports set closed_at = now() where case_id = target.id and closed_at is null;
  -- Step 4: the audit row, in the same transaction.
  perform public.log_staff_action(
    'case.decided', 'cases', target.id::text, target.user_id, btrim(note_text),
    jsonb_build_object('status', 'open', 'tier', target.tier, 'top_reason', target.top_reason),
    jsonb_build_object('status', 'decided', 'action', chosen_action, 'suspension_days', suspension_days)
  );
  -- Step 5: carry the action out (S1-E10-06, S1-E10-08).
  if chosen_action = 'warn' then
    perform public.admin_apply_sanction(target.user_id, 'warning', null, target.id, note_text);
  elsif chosen_action = 'suspend' then
    perform public.admin_apply_sanction(target.user_id, 'suspension', suspension_days, target.id, note_text);
  elsif chosen_action = 'ban' then
    perform public.admin_apply_sanction(target.user_id, 'ban', null, target.id, note_text);
  elsif chosen_action = 'hide' then
    perform public.moderate_item(target.item_type, target.item_id, target.user_id, 'hidden', target.id, note_text);
  elsif chosen_action = 'remove' then
    perform public.moderate_item(target.item_type, target.item_id, target.user_id, 'removed', target.id, note_text);
  elsif chosen_action = 'public_note' then
    perform public.add_copied_work_note(target);
  end if;
  -- S1-E10-04 sends the statement of reasons here, and tells the reporters the outcome.
  return true;
end;
$$;

/* ---------- The case page: source and passage side by side ---------- */

-- The returned columns change, so the function is dropped and made again.
drop function public.admin_case_reports(uuid);

/**
 * admin_case_reports: the reports of one case, for its page (S1-E10-03a), plus a copied-work
 * report's source and passage and the latest question to the reporter with its answer (S1-E10-08).
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_reports(target_case_id uuid)
returns table (
  reference text, reason public.report_reason, details text, reporter_handle text,
  reporter_age_band public.age_band, created_at timestamptz,
  copy_source_title text, copy_source_author text, copy_source_reference text,
  copy_source_passage text, reported_passage text,
  detail_question text, detail_answer text, detail_asked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cases where id = target_case_id and public.may_see_case(is_safeguarding)) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select reports.reference, reports.reason, reports.details, reporter.handle,
           reports.reporter_age_band, reports.created_at,
           reports.copy_source_title, reports.copy_source_author, reports.copy_source_reference,
           reports.copy_source_passage, reports.reported_passage,
           latest.question, latest.answer, latest.created_at
    from public.reports
    join public.profiles as reporter on reporter.id = reports.user_id
    left join lateral (
      select requests.question, requests.answer, requests.created_at
      from public.report_detail_requests as requests
      where requests.report_id = reports.id
      order by requests.created_at desc limit 1
    ) as latest on true
    where reports.case_id = target_case_id
    order by reports.created_at, reports.reference;
end;
$$;

comment on function public.admin_case_reports(uuid) is
  'The reports of one case with any copied-work source and the latest question to the reporter, for its page (S1-E10-03a, S1-E10-08).';
revoke execute on function public.admin_case_reports(uuid) from public, anon;
grant execute on function public.admin_case_reports(uuid) to authenticated;
