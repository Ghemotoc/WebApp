-- The moderation queue, part a: one queue with tiers, deadlines and a decision with a note
-- (story S1-E10-03a; architecture B26; grouping decided 23 Oct 2026, Q4; claiming and visible
-- timers are part b, after March).
--
-- What it adds:
--   case_tier, case_source, case_status, moderation_action     the enums
--   report_reason_tiers       which tier each report reason opens (seeded; a proposal apart from
--                             the one-hour rule, changeable without a release: architecture 1.1,
--                             principle 12; the hours live in settings)
--   cases                     one case per reported item while it is open; every case comes from a
--                             report, an authority order or a flagged picture, never from text
--                             screening (Q42, Q43). Safeguarding cases are visible only to staff
--                             with the safeguarding permission (decided 23 Oct 2026, Q6; S1-E10-10)
--   case_actions              the decisions, append-only: action plus a required note
--   reports.case_id           every report belongs to a case; report_item() opens or joins one
--   may_see_case()            the one visibility rule: moderation staff, and the safeguarding
--                             permission for safeguarding cases
--   admin_moderation_queue()  the queue, most urgent first, with filters
--   admin_case_reports(), admin_case_actions()   what a case page shows
--   admin_decide_case()       the decision: an action and a note, audited, with the hooks for the
--                             statement of reasons (S1-E10-04) and sanctions (S1-E10-06)
-- Tiers (decided 23 Oct 2026, Q5): authority removal order 1 hour, the legal rule (Regulation (EU)
-- 2021/784, art. 3(3)), for authority orders only; child sexual content, self-harm and terrorism
-- from a member the same day (24 hours from the first report); other illegal content, copyright
-- and copied work 48 hours; everything else 7 days. Several reports of one item are one case; the
-- more urgent reason sets the tier and the earliest deadline wins.

/* ---------- Enums ---------- */

/** case_tier: how fast a case must be handled (board 8.2; Q62). */
create type public.case_tier as enum ('one_hour', 'same_day', 'two_days', 'seven_days');
comment on type public.case_tier is
  'How fast a case must be handled: 1 hour (authority orders, the legal rule), same day, 48 hours, 7 days (S1-E10-03a).';

/** case_source: where a case came from; there is no automated text screening (Q42, Q43). */
create type public.case_source as enum ('report', 'authority_order', 'picture_check');
comment on type public.case_source is
  'Where a case came from: a report, an authority order (S1-E10-02/09) or a flagged picture (S1-E10-05); never text screening.';

/** case_status: open until a decision is saved. */
create type public.case_status as enum ('open', 'decided');
comment on type public.case_status is 'Open until a moderator saves a decision (S1-E10-03a).';

/** moderation_action: what a decision does (the story''s list). */
create type public.moderation_action as enum ('no_action', 'remove', 'restrict', 'warn', 'suspend', 'ban');
comment on type public.moderation_action is
  'A decision''s action: no action, remove, restrict, warn, suspend, ban (S1-E10-03a; carried out by S1-E10-06).';

/* ---------- Tiers and deadlines ---------- */

insert into public.settings (key, value, is_public, description) values
  ('moderation_hours_one_hour', '1'::jsonb, false,
   'Hours to act on an authority removal order: the legal rule (Regulation (EU) 2021/784, art. 3(3)), not a proposal (S1-E10-03a).'),
  ('moderation_hours_same_day', '24'::jsonb, false,
   'Hours to act on a same-day case, from the first report (proposal, decided 23 Oct 2026, Q5; S1-E10-03a).'),
  ('moderation_hours_two_days', '48'::jsonb, false,
   'Hours to act on other illegal content (proposal; S1-E10-03a).'),
  ('moderation_hours_seven_days', '168'::jsonb, false,
   'Hours to act on everything else (proposal; S1-E10-03a).');

create table public.report_reason_tiers (
  id uuid primary key default gen_random_uuid(),
  reason public.report_reason not null unique,
  tier public.case_tier not null,
  -- Safeguarding: a child in danger; only staff with the permission see these cases (S1-E10-10).
  is_safeguarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The one-hour tier is for authority orders only (decided 23 Oct 2026, Q5).
  constraint report_reason_tiers_one_hour_is_for_orders check (tier <> 'one_hour')
);

comment on table public.report_reason_tiers is
  'kind: platform
Which tier each report reason opens, and whether it is a safeguarding case (S1-E10-03a; a proposal, changed by migration until S1-E11-03).';

create trigger report_reason_tiers_set_updated_at
  before update on public.report_reason_tiers
  for each row execute function public.set_updated_at();

-- Decided 23 Oct 2026, Q5 (a proposal apart from the legal one-hour rule). The CTO added two on
-- 24 Oct 2026: a threat to a minor is a same-day safeguarding case (hidden from moderators without
-- the permission), insults sit with harassment on the 7-day tier.
insert into public.report_reason_tiers (reason, tier, is_safeguarding) values
  ('child_sexual_content', 'same_day', true),
  ('threat_to_minor', 'same_day', true),
  ('self_harm', 'same_day', true),
  ('terrorism', 'same_day', false),
  ('illegal_content', 'two_days', false),
  ('copyright', 'two_days', false),
  ('copied_published_work', 'two_days', false),
  ('harassment', 'seven_days', false),
  ('insults', 'seven_days', false),
  ('hate', 'seven_days', false),
  ('spam', 'seven_days', false),
  ('undisclosed_ai', 'seven_days', false),
  ('other', 'seven_days', false);

alter table public.report_reason_tiers enable row level security;

/**
 * Policy report_reason_tiers_select_moderation: moderation staff read the tier map.
 * Why: the queue explains each tier; members don't need the map.
 */
create policy report_reason_tiers_select_moderation
  on public.report_reason_tiers
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy report_reason_tiers_select_moderation on public.report_reason_tiers is
  'Allows owner, admin and moderator, in a staff session, to read which reason opens which tier (S1-E10-03a).';

revoke all on public.report_reason_tiers from anon, authenticated;
grant select on public.report_reason_tiers to authenticated;

/**
 * tier_hours: how many hours a tier gives, from the settings.
 * Input: a tier. Returns: the hours (1, 24, 48 or 168 by default).
 */
create or replace function public.tier_hours(target_tier public.case_tier)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.setting_value('moderation_hours_' || target_tier::text), '168')::text::integer;
$$;

comment on function public.tier_hours(public.case_tier) is 'Internal: a tier''s hours, from the settings (S1-E10-03a).';
revoke execute on function public.tier_hours(public.case_tier) from public, anon, authenticated;

/**
 * tier_rank: the order of urgency, so "the more urgent reason wins" is a comparison.
 * Input: a tier. Returns: 1 for one_hour up to 4 for seven_days.
 */
create or replace function public.tier_rank(target_tier public.case_tier)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case target_tier
    when 'one_hour' then 1 when 'same_day' then 2 when 'two_days' then 3 else 4 end;
$$;

comment on function public.tier_rank(public.case_tier) is 'Internal: 1 (most urgent) to 4 (S1-E10-03a).';
revoke execute on function public.tier_rank(public.case_tier) from public, anon, authenticated;

/* ---------- Cases ---------- */

create sequence public.case_reference_seq;

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  -- The reference staff and the reporter share: a report case takes its first report's reference
  -- (R-000123); an authority order TCO-0001; a picture check P-0001.
  reference text not null unique,
  -- The account whose item is in the case (the "owner" of what was reported; CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  item_type public.reportable_type not null,
  item_id uuid not null,
  source public.case_source not null,
  tier public.case_tier not null,
  -- The first report, order or picture flag; the deadline counts from it.
  received_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  -- The most urgent reason among the reports; null for an order or a picture check.
  top_reason public.report_reason,
  report_count integer not null default 0,
  -- Whether any reporter was under 18 (the queue flags it, board 8.2); never which one.
  reporter_under_18 boolean not null default false,
  -- A child in danger: only staff with the safeguarding permission see it (S1-E10-10).
  is_safeguarding boolean not null default false,
  status public.case_status not null default 'open',
  decision public.moderation_action,
  decided_at timestamptz,
  decided_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_decided_fields_go_together
    check ((status = 'decided') = (decision is not null and decided_at is not null and decided_by_user_id is not null))
);

comment on table public.cases is
  'kind: staff
One moderation case per reported item while it is open: from a report, an authority order or a flagged picture, never text screening; user_id is the account whose item it is (S1-E10-03a).';
comment on column public.cases.user_id is 'The account whose item is in the case; never shown publicly (rule 15).';

-- Grouping (Q4): one open case per item.
create unique index cases_one_open_case_per_item on public.cases (item_type, item_id) where status = 'open';
create index cases_deadline_idx on public.cases (status, deadline_at);
create index cases_user_id_idx on public.cases (user_id);

create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();
create trigger cases_refuse_user_id_change
  before update on public.cases
  for each row execute function public.refuse_user_id_change('user_id');

create table public.case_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  -- The staff member who decided.
  user_id uuid not null references public.profiles (id),
  action public.moderation_action not null,
  -- The note is required: a decision without one is refused (the story's criterion).
  note text not null,
  created_at timestamptz not null default now(),
  constraint case_actions_note_is_written check (btrim(note) <> '' and char_length(note) <= 4000)
);

comment on table public.case_actions is
  'kind: staff
Decisions on cases: the action and the required note, by which staff member; append-only (S1-E10-03a).';

create index case_actions_case_id_idx on public.case_actions (case_id);

alter table public.reports add column case_id uuid references public.cases (id);
comment on column public.reports.case_id is 'The case this report belongs to (S1-E10-03a).';
create index reports_case_id_idx on public.reports (case_id);

/**
 * may_see_case: the one visibility rule for cases, their reports and their actions.
 * Input: whether the case is a safeguarding case. Returns: true for moderation staff (owner, admin,
 *   moderator, in a staff session), and for a safeguarding case only with the safeguarding
 *   permission too (architecture 1.8.3; decided 23 Oct 2026, Q6).
 * Where it fits: the three policies below and every admin_* function here.
 */
create or replace function public.may_see_case(case_is_safeguarding boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_may('moderation', 'view')
    and (not case_is_safeguarding or public.staff_may('safeguarding', 'view'));
$$;

comment on function public.may_see_case(boolean) is
  'True for moderation staff; a safeguarding case needs the safeguarding permission too (S1-E10-03a, Q6).';
revoke execute on function public.may_see_case(boolean) from public, anon;
grant execute on function public.may_see_case(boolean) to authenticated;

alter table public.cases enable row level security;
alter table public.case_actions enable row level security;

/**
 * Policy cases_select_moderation: moderation staff read cases; safeguarding cases only with the
 * permission. Why: the queue (architecture 1.8.3, Moderation: owner, admin and moderator act;
 * safeguarding "with the permission").
 */
create policy cases_select_moderation
  on public.cases
  for select
  to authenticated
  using ((select public.may_see_case(is_safeguarding)));

comment on policy cases_select_moderation on public.cases is
  'Allows owner, admin and moderator, in a staff session, to read cases; safeguarding cases only with the safeguarding permission (S1-E10-03a).';

/**
 * Policy case_actions_select_moderation: the same rule, through the case.
 */
create policy case_actions_select_moderation
  on public.case_actions
  for select
  to authenticated
  using (exists (
    select 1 from public.cases
    where cases.id = case_actions.case_id and public.may_see_case(cases.is_safeguarding)
  ));

comment on policy case_actions_select_moderation on public.case_actions is
  'Allows the staff who may see a case to read its decisions (S1-E10-03a).';

-- Reports of a safeguarding case follow the same rule (S1-E10-01's policy, tightened).
alter policy reports_select_moderation on public.reports
  using (
    (select public.staff_may('moderation', 'view'))
    and (
      reports.case_id is null
      or exists (
        select 1 from public.cases
        where cases.id = reports.case_id and public.may_see_case(cases.is_safeguarding)
      )
    )
  );
comment on policy reports_select_moderation on public.reports is
  'Allows owner, admin and moderator, in a staff session, to read reports; a safeguarding case''s reports only with the permission (S1-E10-01, S1-E10-03a).';

-- Reads for moderation staff; every write goes through the functions below.
revoke all on public.cases, public.case_actions from anon, authenticated;
grant select on public.cases to authenticated;
grant select on public.case_actions to authenticated;

/* ---------- Opening and joining a case ---------- */

/**
 * attach_report_to_case: puts a new report into its item's open case, or opens one.
 * Input: the report row just made. Returns: the case's ID.
 * Rules (decided 23 Oct 2026, Q4 and Q5): one open case per item; the report count grows; the
 *   more urgent reason sets the tier; the deadline counts from the first report and the earliest
 *   deadline wins; a report by an under-18 flags the case; a safeguarding reason makes the case a
 *   safeguarding case. Internal: report_item() calls it in the same transaction.
 */
create or replace function public.attach_report_to_case(new_report public.reports)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reason_tier public.report_reason_tiers;
  open_case public.cases;
  new_deadline timestamptz;
begin
  select * into reason_tier from public.report_reason_tiers where reason = new_report.reason;
  select * into open_case from public.cases
    where item_type = new_report.item_type and item_id = new_report.item_id and status = 'open'
    for update;
  if open_case.id is null then
    -- Step 1: a new case, referenced like its first report.
    insert into public.cases (reference, user_id, item_type, item_id, source, tier, received_at,
                              deadline_at, top_reason, report_count, reporter_under_18, is_safeguarding)
    values (new_report.reference, new_report.reported_user_id, new_report.item_type, new_report.item_id,
            'report', reason_tier.tier, new_report.created_at,
            new_report.created_at + make_interval(hours => public.tier_hours(reason_tier.tier)),
            new_report.reason, 1, new_report.reporter_age_band in ('under_13', '13_to_15', '16_to_17'),
            reason_tier.is_safeguarding)
    returning * into open_case;
    return open_case.id;
  end if;
  -- Step 2: join the open case; the more urgent tier and the earliest deadline win.
  new_deadline := open_case.received_at + make_interval(hours => public.tier_hours(reason_tier.tier));
  update public.cases set
    report_count = report_count + 1,
    reporter_under_18 = reporter_under_18 or new_report.reporter_age_band in ('under_13', '13_to_15', '16_to_17'),
    is_safeguarding = is_safeguarding or reason_tier.is_safeguarding,
    tier = case when public.tier_rank(reason_tier.tier) < public.tier_rank(tier) then reason_tier.tier else tier end,
    top_reason = case when public.tier_rank(reason_tier.tier) < public.tier_rank(tier) then new_report.reason else top_reason end,
    deadline_at = least(deadline_at, new_deadline)
  where id = open_case.id;
  return open_case.id;
end;
$$;

comment on function public.attach_report_to_case(public.reports) is
  'Internal: opens or joins the item''s open case for a new report (S1-E10-03a).';
revoke execute on function public.attach_report_to_case(public.reports) from public, anon, authenticated;

/**
 * report_item: as in S1-E10-01, now also opening or joining the item's case (S1-E10-03a).
 * Inputs, returns and errors: see S1-E10-01's migration; unchanged.
 */
create or replace function public.report_item(
  item_type public.reportable_type,
  item_reference text,
  reason public.report_reason,
  details text default null
)
returns table (report_reference text, received_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid := (select auth.uid());
  item record;
  existing public.reports;
  new_report public.reports;
  hourly_limit integer := coalesce(public.setting_value('report_hourly_limit'), '20')::text::integer;
begin
  -- Step 1: signed in, whatever the account's state.
  if reporter_id is null then
    raise exception 'Log in to report something.' using errcode = 'insufficient_privilege';
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
  -- Step 5: the row, with the reporter's age group and a reference to quote.
  insert into public.reports (user_id, item_type, item_id, reported_user_id, reason, details,
                              reporter_age_band, reference)
  values (reporter_id, item_type, item.item_id, item.owner_user_id, reason, nullif(btrim(details), ''),
          public.age_band(), 'R-' || lpad(nextval('public.report_reference_seq')::text, 6, '0'))
  returning * into new_report;
  -- Step 6: the case: opened, or joined when the item already has one (S1-E10-03a).
  update public.reports set case_id = public.attach_report_to_case(new_report)
    where reports.id = new_report.id;
  return query select new_report.reference, new_report.created_at;
end;
$$;

/* ---------- The queue ---------- */

/** moderation_queue_row: one case as the queue and the case page show it. */
create type public.moderation_queue_row as (
  id uuid,
  reference text,
  source public.case_source,
  tier public.case_tier,
  status public.case_status,
  item_type public.reportable_type,
  item_id uuid,
  item_summary text,
  reported_handle text,
  reported_age_band public.age_band,
  top_reason public.report_reason,
  report_count integer,
  reporter_under_18 boolean,
  is_safeguarding boolean,
  received_at timestamptz,
  deadline_at timestamptz,
  decision public.moderation_action,
  decided_at timestamptz,
  decided_by_handle text
);

comment on type public.moderation_queue_row is 'One case as the moderation queue shows it (S1-E10-03a).';

/**
 * admin_moderation_queue: the cases, most urgent first.
 * Inputs (all optional, null meaning every value): tier_filter, status_filter (the screen asks
 *   for open cases by default), under_18_filter (true: only cases with a reporter under 18),
 *   source_filter, case_id (one case, for its page, whatever its status).
 * Returns: the cases the caller may see (may_see_case()), open ones by deadline, decided ones
 *   newest first, with what was reported (reportable_item_summary()), the reported account's
 *   username and age group (staff see the group, never the year: architecture 1.8.3).
 * Errors: insufficient_privilege unless the caller may view moderation.
 */
create or replace function public.admin_moderation_queue(
  tier_filter public.case_tier default null,
  status_filter public.case_status default null,
  under_18_filter boolean default null,
  source_filter public.case_source default null,
  case_id uuid default null
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
  return query
    select
      cases.id, cases.reference, cases.source, cases.tier, cases.status, cases.item_type, cases.item_id,
      public.reportable_item_summary(cases.item_type, cases.item_id),
      reported.handle,
      public.age_band_from_birth(reported.birth_year::integer, reported.birth_month::integer, reported.age_check_result, current_date),
      cases.top_reason, cases.report_count, cases.reporter_under_18, cases.is_safeguarding,
      cases.received_at, cases.deadline_at, cases.decision, cases.decided_at, decider.handle
    from public.cases
    join public.profiles as reported on reported.id = cases.user_id
    left join public.profiles as decider on decider.id = cases.decided_by_user_id
    where public.may_see_case(cases.is_safeguarding)
      and (admin_moderation_queue.case_id is null or cases.id = admin_moderation_queue.case_id)
      and (tier_filter is null or cases.tier = tier_filter)
      and (status_filter is null or cases.status = status_filter)
      and (under_18_filter is null or cases.reporter_under_18 = under_18_filter)
      and (source_filter is null or cases.source = source_filter)
    order by cases.status, cases.deadline_at, cases.decided_at desc;
end;
$$;

comment on function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid) is
  'The moderation queue, most urgent first, for the staff who may see each case (S1-E10-03a).';

/**
 * admin_case_reports: the reports of one case, for its page.
 * Input: target_case_id. Returns: each report's reference, reason, details (what the reporter
 *   wrote, for the moderator to read), the reporter's username and age group, and the time.
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_reports(target_case_id uuid)
returns table (
  reference text, reason public.report_reason, details text, reporter_handle text,
  reporter_age_band public.age_band, created_at timestamptz
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
           reports.reporter_age_band, reports.created_at
    from public.reports
    join public.profiles as reporter on reporter.id = reports.user_id
    where reports.case_id = target_case_id
    order by reports.created_at, reports.reference;
end;
$$;

comment on function public.admin_case_reports(uuid) is 'The reports of one case, for its page (S1-E10-03a).';

/**
 * admin_case_actions: the decisions of one case, for its page.
 * Input: target_case_id. Returns: each action, its note, who decided and when.
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_actions(target_case_id uuid)
returns table (action public.moderation_action, note text, staff_handle text, created_at timestamptz)
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
    select case_actions.action, case_actions.note, staff.handle, case_actions.created_at
    from public.case_actions
    join public.profiles as staff on staff.id = case_actions.user_id
    where case_actions.case_id = target_case_id
    order by case_actions.created_at;
end;
$$;

comment on function public.admin_case_actions(uuid) is 'The decisions of one case, for its page (S1-E10-03a).';

/**
 * admin_decide_case: saves a decision on an open case.
 * Inputs: target_case_id; chosen_action (no_action, remove, restrict, warn, suspend, ban);
 *   note_text (required, at most 4,000 characters).
 * Returns: true. Errors: insufficient_privilege unless the caller may act on moderation and see
 *   the case; check_violation for a blank note or a case already decided.
 * What it does, in one transaction: the case_actions row, the case closed with the decision, its
 *   reports closed, and the audit row case.decided with the values before and after.
 * Hooks: S1-E10-06 carries the action out (hide or remove the item, warn, suspend or ban the
 *   account) right after the case closes; S1-E10-04 sends the statement of reasons to the account
 *   and tells the reporters the outcome. Both hook in here, in the same transaction.
 */
create or replace function public.admin_decide_case(
  target_case_id uuid,
  chosen_action public.moderation_action,
  note_text text
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
  -- Step 2: a note is required; a decided case stays decided.
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  if target.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
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
    jsonb_build_object('status', 'decided', 'action', chosen_action)
  );
  -- S1-E10-06 carries the action out here (hide or remove the item; warn, suspend or ban).
  -- S1-E10-04 sends the statement of reasons here, and tells the reporters the outcome.
  return true;
end;
$$;

comment on function public.admin_decide_case(uuid, public.moderation_action, text) is
  'Saves a decision (an action and a required note) on an open case, closes its reports and logs it (S1-E10-03a).';

revoke execute on function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid) from public, anon;
revoke execute on function public.admin_case_reports(uuid) from public, anon;
revoke execute on function public.admin_case_actions(uuid) from public, anon;
revoke execute on function public.admin_decide_case(uuid, public.moderation_action, text) from public, anon;
grant execute on function public.admin_moderation_queue(public.case_tier, public.case_status, boolean, public.case_source, uuid) to authenticated;
grant execute on function public.admin_case_reports(uuid) to authenticated;
grant execute on function public.admin_case_actions(uuid) to authenticated;
grant execute on function public.admin_decide_case(uuid, public.moderation_action, text) to authenticated;

/* ---------- Keeping reported content for the moderators (Lane A's stand-in, filled in) ---------- */

/**
 * content_is_held_for_moderation: is this item under an open moderation case, so the nightly
 *   purge must keep it for the moderators even past its purge date? (Lane A's stand-in from
 *   S1-E3-05, which the S1-E10 stories fill in, docs/mocks.md; Lane A merged first, so Lane C
 *   fills it in on rebase, architecture 1.7.11.)
 * Inputs: item_type, item_id. Returns: true while a case about the item is open; false once it
 *   is decided (S1-E10-04's appeals may widen this to "decided less than six months ago").
 * Who calls it: Lane A's purge jobs for stories and chapters (S1-E3-05, S1-E3-04).
 */
create or replace function public.content_is_held_for_moderation(item_type public.reportable_type, item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cases
    where cases.item_type = content_is_held_for_moderation.item_type
      and cases.item_id = content_is_held_for_moderation.item_id
      and cases.status = 'open'
  );
$$;

comment on function public.content_is_held_for_moderation(public.reportable_type, uuid) is
  'True while an open moderation case is about the item, so the purge keeps it (S1-E3-05 stand-in, filled in by S1-E10-03a).';
revoke execute on function public.content_is_held_for_moderation(public.reportable_type, uuid) from public, anon, authenticated;
