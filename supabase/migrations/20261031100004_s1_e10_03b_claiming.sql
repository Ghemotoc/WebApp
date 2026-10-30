/*
 * Migration: claiming cases, and the queue's filters and search (story S1-E10-03, part b; canvas
 * 8.2; criterion 4: "when a moderator claims it, then others see it is claimed, and the SLA timer
 * is visible").
 *
 * What it adds:
 *   cases.claimed_by_user_id, cases.claimed_at   who is working on a case, since when
 *   setting case_claim_minutes                    a claim older than this (60) can be taken over,
 *                                                 so a case is never stuck behind someone gone home
 *   admin_claim_case(), admin_release_case()       claim and release, each in the audit log
 *   admin_moderation_queue()                       now with who claimed each case, and filters for
 *                                                 the reason, who claimed it (mine, anyone,
 *                                                 nobody) and a search by reference or username
 * Grouping several reports into one case and the deadlines already exist (S1-E10-03a).
 * Who calls it: the queue and the case page (src/features/moderation/).
 */

insert into public.settings (key, value, is_public, description) values
  ('case_claim_minutes', '60'::jsonb, false,
   'After how many minutes another moderator may take over a claimed case (S1-E10-03b; proposal).')
on conflict (key) do nothing;

alter table public.cases
  add column claimed_by_user_id uuid references public.profiles (id),
  add column claimed_at timestamptz,
  add constraint cases_claim_fields_go_together check ((claimed_by_user_id is null) = (claimed_at is null));

comment on column public.cases.claimed_by_user_id is 'The moderator working on the case, or null (S1-E10-03b).';
comment on column public.cases.claimed_at is 'When the case was claimed (S1-E10-03b).';

/* ---------- Claiming ---------- */

/**
 * require_case_for_acting: the open case a moderator acts on, locked.
 * Input: target_case_id. Returns: the case.
 * Errors: insufficient_privilege unless the caller may act on moderation and see the case;
 *   check_violation when the case is already decided. Internal: claim and release.
 */
create or replace function public.require_case_for_acting(target_case_id uuid)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  select * into target from public.cases where id = target_case_id for update;
  if target.id is null or not public.staff_may('moderation', 'act') or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t work on this case.' using errcode = 'insufficient_privilege';
  end if;
  if target.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
  end if;
  return target;
end;
$$;

comment on function public.require_case_for_acting(uuid) is
  'Internal: the open case a moderator may act on, locked (S1-E10-03b).';
revoke execute on function public.require_case_for_acting(uuid) from public, anon, authenticated;

/**
 * admin_claim_case: the signed-in moderator claims an open case, so others see someone is on it.
 * Input: target_case_id. Returns: true.
 * Errors: as require_case_for_acting(); check_violation when another moderator claimed it less
 *   than case_claim_minutes ago (the message names them).
 * Logged as case.claimed (with whom it was taken from, if anyone).
 */
create or replace function public.admin_claim_case(target_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases := public.require_case_for_acting(target_case_id);
  claim_minutes integer := coalesce((public.setting_value('case_claim_minutes'))::text::integer, 60);
begin
  -- Step 1: someone else's fresh claim stands.
  if target.claimed_by_user_id is not null and target.claimed_by_user_id <> (select auth.uid())
     and target.claimed_at > now() - make_interval(mins => claim_minutes) then
    raise exception 'Claimed by @% already.', (select profiles.handle from public.profiles where profiles.id = target.claimed_by_user_id)
      using errcode = 'check_violation';
  end if;
  -- Step 2: claim it and log it.
  update public.cases set claimed_by_user_id = (select auth.uid()), claimed_at = now() where id = target.id;
  perform public.log_staff_action('case.claimed', 'cases', target.id::text, target.user_id, null,
    jsonb_build_object('claimed_by_user_id', target.claimed_by_user_id),
    jsonb_build_object('claimed_by_user_id', (select auth.uid())));
  return true;
end;
$$;

comment on function public.admin_claim_case(uuid) is
  'A moderator claims an open case; a claim older than case_claim_minutes can be taken over; logged (S1-E10-03b).';
revoke execute on function public.admin_claim_case(uuid) from public, anon;
grant execute on function public.admin_claim_case(uuid) to authenticated;

/**
 * admin_release_case: gives a claimed case back to the queue.
 * Input: target_case_id. Returns: true.
 * Errors: as require_case_for_acting(); check_violation when someone else holds a fresh claim
 *   (only they can release it until it goes stale). Logged as case.released.
 */
create or replace function public.admin_release_case(target_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases := public.require_case_for_acting(target_case_id);
  claim_minutes integer := coalesce((public.setting_value('case_claim_minutes'))::text::integer, 60);
begin
  if target.claimed_by_user_id is null then
    return true;
  end if;
  if target.claimed_by_user_id <> (select auth.uid()) and target.claimed_at > now() - make_interval(mins => claim_minutes) then
    raise exception 'Only the moderator who claimed this case can release it now.' using errcode = 'check_violation';
  end if;
  update public.cases set claimed_by_user_id = null, claimed_at = null where id = target.id;
  perform public.log_staff_action('case.released', 'cases', target.id::text, target.user_id, null,
    jsonb_build_object('claimed_by_user_id', target.claimed_by_user_id), jsonb_build_object('claimed_by_user_id', null));
  return true;
end;
$$;

comment on function public.admin_release_case(uuid) is
  'A moderator gives a claimed case back to the queue; logged (S1-E10-03b).';
revoke execute on function public.admin_release_case(uuid) from public, anon;
grant execute on function public.admin_release_case(uuid) to authenticated;

/* ---------- The queue ---------- */

-- The row grows by who claimed the case and when (a composite type grows by attributes; the
-- function that fills it is recreated with the new columns and filters).
alter type public.moderation_queue_row add attribute claimed_by_handle text;
alter type public.moderation_queue_row add attribute claimed_at timestamptz;
alter type public.moderation_queue_row add attribute claimed_by_me boolean;

drop function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid);

/**
 * case_matches_queue_filters: whether a case passes the queue's optional filters.
 * Inputs: the case, the reported username, and the filters (null means any): reason, claimed
 *   ('mine', 'anyone', 'nobody') and search (a case or report reference, or a username, with or
 *   without @; case-insensitive). Internal: admin_moderation_queue().
 */
create or replace function public.case_matches_queue_filters(
  target public.cases,
  reported_handle text,
  reason_filter public.report_reason,
  claimed_filter text,
  search_text text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (reason_filter is null or target.top_reason = reason_filter
          or exists (select 1 from public.reports where reports.case_id = target.id and reports.reason = reason_filter))
    and (claimed_filter is null
         or (claimed_filter = 'mine' and target.claimed_by_user_id = (select auth.uid()))
         or (claimed_filter = 'anyone' and target.claimed_by_user_id is not null)
         or (claimed_filter = 'nobody' and target.claimed_by_user_id is null))
    and (nullif(btrim(search_text), '') is null
         or lower(target.reference) = lower(btrim(search_text))
         or lower(reported_handle) = lower(btrim(btrim(search_text), '@'))
         or exists (select 1 from public.reports where reports.case_id = target.id
                    and lower(reports.reference) = lower(btrim(search_text))));
$$;

comment on function public.case_matches_queue_filters(public.cases, text, public.report_reason, text, text) is
  'Internal: the queue''s reason, claimed and search filters (S1-E10-03b).';
revoke execute on function public.case_matches_queue_filters(public.cases, text, public.report_reason, text, text)
  from public, anon, authenticated;

/**
 * admin_moderation_queue: as in S1-E10-06, plus who claimed each case and three more filters.
 * Inputs (all optional, null meaning every value): tier_filter, status_filter, under_18_filter,
 *   source_filter, case_id (one case, for its page), reason_filter, claimed_filter ('mine',
 *   'anyone', 'nobody') and search_text (a reference or a username).
 * Returns: the cases the caller may see, open ones by deadline, decided ones newest first.
 * Errors: insufficient_privilege unless the caller may view moderation; check_violation for an
 *   unknown claimed_filter.
 */
create or replace function public.admin_moderation_queue(
  tier_filter public.case_tier default null,
  status_filter public.case_status default null,
  under_18_filter boolean default null,
  source_filter public.case_source default null,
  case_id uuid default null,
  reason_filter public.report_reason default null,
  claimed_filter text default null,
  search_text text default null
)
returns setof public.moderation_queue_row
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff can see the queue.' using errcode = 'insufficient_privilege';
  end if;
  if claimed_filter is not null and claimed_filter not in ('mine', 'anyone', 'nobody') then
    raise exception 'Unknown claimed filter "%".', claimed_filter using errcode = 'check_violation';
  end if;
  return query
    select
      cases.id, cases.reference, cases.source, cases.tier, cases.status, cases.item_type, cases.item_id,
      public.reportable_item_summary(cases.item_type, cases.item_id),
      reported.handle,
      public.age_band_from_birth(reported.birth_year::integer, reported.birth_month::integer, reported.age_check_result, current_date),
      cases.top_reason, cases.report_count, cases.reporter_under_18, cases.is_safeguarding,
      cases.received_at, cases.deadline_at, cases.decision, cases.decided_at, decider.handle,
      cases.user_id, claimer.handle, cases.claimed_at, cases.claimed_by_user_id = (select auth.uid())
    from public.cases
    join public.profiles as reported on reported.id = cases.user_id
    left join public.profiles as decider on decider.id = cases.decided_by_user_id
    left join public.profiles as claimer on claimer.id = cases.claimed_by_user_id
    where public.may_see_case(cases.is_safeguarding)
      and (admin_moderation_queue.case_id is null or cases.id = admin_moderation_queue.case_id)
      and (tier_filter is null or cases.tier = tier_filter)
      and (status_filter is null or cases.status = status_filter)
      and (under_18_filter is null or cases.reporter_under_18 = under_18_filter)
      and (source_filter is null or cases.source = source_filter)
      and public.case_matches_queue_filters(cases, reported.handle, reason_filter, claimed_filter, search_text)
    order by cases.status, cases.deadline_at, cases.decided_at desc;
end;
$$;

comment on function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid, public.report_reason, text, text) is
  'The moderation queue, most urgent first, with who claimed each case and filters for reason, claim and search (S1-E10-03a, 06, 03b).';
revoke execute on function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid, public.report_reason, text, text) from public, anon;
grant execute on function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid, public.report_reason, text, text) to authenticated;
