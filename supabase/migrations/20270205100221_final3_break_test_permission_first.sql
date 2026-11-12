/**
 * Final check, part 3 (platform-wide break test): four staff functions looked their target up
 * before checking who was asking (bundle FINAL-3; unattended run, 11 Nov 2026).
 *
 * The break test called every admin_* and staff_* function as a visitor and as an ordinary member.
 * All refused or answered nothing, but these four answered "there is no such thing" before
 * "you may not". That let any signed-in member tell a real target from a made-up one: with
 * report references, which count upwards (R-000123), how many reports exist. Nothing else about
 * a report, a case or a person could be read.
 * What changes: each function now checks the caller's right first. The rest of each function is
 * as it was (the bodies below are the live ones, with the one check added at the top).
 */

/**
 * admin_pause_reporting: pauses a person's reporting (S1-E10-11), found by username.
 *
 * @param reporter_handle - the person's username
 * @param source_case_id - the case this comes from, or null
 * @param note_text - the reason, for the audit log
 * @returns what admin_apply_sanction() returns
 * Errors: insufficient_privilege for anyone without the right to sanction, checked before the
 * username is looked up (FINAL-3); check_violation when no account has that username.
 */
create or replace function public.admin_pause_reporting(reporter_handle text, source_case_id uuid DEFAULT NULL::uuid, note_text text DEFAULT NULL::text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid;
begin
  -- Who is asking comes first, so a refusal says nothing about whether the target exists (FINAL-3).
  if not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only moderation staff can pause reporting.' using errcode = 'insufficient_privilege';
  end if;
  select id into reporter_id from public.profiles
    where profiles.handle = reporter_handle and profiles.deleted_at is null;
  if reporter_id is null then
    raise exception 'No account has the username %.', reporter_handle using errcode = 'check_violation';
  end if;
  return public.admin_apply_sanction(reporter_id, 'reporting_pause', null, source_case_id, note_text);
end;
$$;

/**
 * admin_unlink_returning_user: removes a "same person as" link from a case.
 *
 * @param link_id - the link
 * @param reason_given - why, up to 1000 characters
 * @returns true
 * Errors: insufficient_privilege for anyone who can't act on moderation cases, checked before
 * the link is looked up (FINAL-3); check_violation when the link is gone or no reason is given.
 */
create or replace function public.admin_unlink_returning_user(link_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.case_account_links;
begin
  -- Who is asking comes first, so a refusal says nothing about whether the target exists (FINAL-3).
  if not public.staff_may('moderation', 'act') then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  select * into link from public.case_account_links where id = link_id and removed_at is null;
  if link.id is null then
    raise exception 'This link is already gone.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  perform public.case_for_links(link.case_id, true);
  if btrim(coalesce(reason_given, '')) = '' or char_length(reason_given) > 1000 then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  update public.case_account_links
  set removed_at = now(), removed_by_user_id = (select auth.uid()), remove_reason = btrim(reason_given)
  where id = link.id;
  perform public.log_staff_action('moderation.returning_user_unlinked', 'case_account_links', link.id::text,
    link.user_id, btrim(reason_given), jsonb_build_object('linked_user_id', link.linked_user_id), null);
  return true;
end;
$$;

/**
 * admin_close_unmatched_notice: closes a public notice that matched no content (S1-E10-02).
 *
 * @param target_notice_id - the notice
 * @param note - what the moderator found
 * Errors: insufficient_privilege for anyone who can't act on moderation cases, checked before
 * the notice is looked up (FINAL-3), and for a notice the caller may not see; no_data_found when
 * there is no open unmatched notice like that; check_violation without a note.
 */
create or replace function public.admin_close_unmatched_notice(target_notice_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  notice public.public_notices;
begin
  -- Who is asking comes first, so a refusal says nothing about whether the target exists (FINAL-3).
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderators close notices.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: who may act, and on which notice.
  select * into notice from public.public_notices
    where id = target_notice_id and case_id is null and closed_at is null for update;
  if notice.id is null then
    raise exception 'There is no open unmatched notice like that.' using errcode = 'no_data_found';
  end if;
  if not public.staff_may('moderation', 'act')
     or not public.may_see_case(notice.reason in ('child_sexual_content', 'threat_to_minor')) then
    raise exception 'Only moderators close notices.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_staff_session() then
    raise exception 'Sign in again as staff to do this.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(note, '')) = '' then
    raise exception 'Write a note saying what you found.' using errcode = 'check_violation';
  end if;
  -- Step 2: closed and decided, so the decision email goes out (S1-E10-04), and audited.
  update public.public_notices set decided_at = now(), closed_at = now() where id = notice.id;
  perform public.log_staff_action('notice.closed_unmatched', 'public_notices', notice.id::text, null,
    btrim(note), null, jsonb_build_object('reference', notice.reference));
end;
$$;

/**
 * admin_request_report_details: asks a reporter one question about their report (S1-E10-04).
 *
 * @param report_reference - the report's reference ("R-000123")
 * @param question - the question
 * Errors: insufficient_privilege for anyone who can't act on moderation cases, checked before
 * the report is looked up (FINAL-3: references count upwards, so "no report like that" told any
 * member how many reports exist), and for a case the caller may not see; no_data_found;
 * check_violation.
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
  -- Who is asking comes first, so a refusal says nothing about whether the target exists (FINAL-3).
  if not public.staff_may('moderation', 'act') then
    raise exception 'You can''t ask about this report.' using errcode = 'insufficient_privilege';
  end if;
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
