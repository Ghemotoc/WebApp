-- Reports: the Report button on everything (story S1-E10-01; architecture B04; CLAUDE.md rule 6).
--
-- What it adds:
--   report_reason                 the story's eleven reasons, plus "Threat to a minor" and
--                                 "Insults" from the Moderation board (CTO, 24 Oct 2026)
--   reports                       one row per report: who reported what, why, and a reference
--   reportable_item_owner()       whose item this is, one branch per reportable_type value
--   reportable_item_summary()     "what was reported" in a few words, one branch per value
--   report_item()                 the one way a report is made: any signed-in account, read-only
--                                 ones included (architecture 1.7.8: reporting is the one action
--                                 the account gate always allows)
--   report_hourly_limit           a setting (20 an hour, proposal) against report floods
-- Shared contract between lanes (decided 23 Oct 2026; docs/architecture.md 1.7.11): every story
-- that adds a user-content table adds its value to reportable_type AND its branch to the two
-- functions here; database test 042 fails the build when a value has no branch.
-- Privacy: a report names the reporter (user_id, needed for the hourly limit, the duplicate check
-- and the reporting pause of S1-E10-06) and the reported account. Nobody but moderation staff
-- reads reports: a reporter's own row would show the owner's user ID, and for a profile report
-- the item IS a user ID (rule 15), so there is no "select own" policy; "My reports" (board 6.5)
-- gets its own view without IDs (S1-E10-04). Reports are kept 3 years after they close, then
-- deleted (canvas comment, 17 Oct 2026; the purge job is S1-E13-04).
-- Never logged: the details text (rule 12).

/* ---------- Reasons ---------- */

/**
 * report_reason: the story's list, in its order (S1-E10-01), with the board's two extra reasons
 * next to their closest neighbours (CTO, 24 Oct 2026): threat_to_minor after child sexual content
 * (same-day tier, safeguarding) and insults after harassment (7-day tier), tiers in S1-E10-03a.
 */
create type public.report_reason as enum (
  'illegal_content',
  'harassment',
  'insults',
  'self_harm',
  'child_sexual_content',
  'threat_to_minor',
  'terrorism',
  'hate',
  'spam',
  'copyright',
  'copied_published_work',
  'undisclosed_ai',
  'other'
);

comment on type public.report_reason is
  'Why something was reported: the eleven reasons of S1-E10-01 plus threat_to_minor and insults (CTO, 24 Oct 2026).';

insert into public.settings (key, value, is_public, description) values
  ('report_hourly_limit', '20'::jsonb, false,
   'How many reports one account may send in an hour (proposal, S1-E10-01).');

/* ---------- The table ---------- */

create sequence public.report_reference_seq;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- The reporter.
  user_id uuid not null references public.profiles (id),
  item_type public.reportable_type not null,
  item_id uuid not null,
  -- Whose item it is, so moderators see the account's history (S1-E10-03a).
  reported_user_id uuid not null references public.profiles (id),
  reason public.report_reason not null,
  details text,
  -- The reporter's age group at the time: the queue flags reports by under-18s (board 8.2).
  reporter_age_band public.age_band not null,
  -- in_app (the Report button) or web_form (the public form, S1-E10-02).
  source text not null default 'in_app',
  -- The reference the reporter sees ("R-000123") and quotes.
  reference text not null unique,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_details_length check (details is null or char_length(details) <= 2000),
  constraint reports_source_is_known check (source in ('in_app', 'web_form')),
  constraint reports_not_on_own_item check (user_id <> reported_user_id)
);

comment on table public.reports is
  'kind: user_action
Reports of user content; user_id is the reporter. Read by moderation staff only; made only through report_item() (S1-E10-01).';
comment on column public.reports.details is 'What the reporter wrote, at most 2,000 characters; never logged (rule 12).';
comment on column public.reports.reference is 'The reference the reporter sees and quotes, R- plus six digits.';

create index reports_item_idx on public.reports (item_type, item_id);
create index reports_user_id_created_at_idx on public.reports (user_id, created_at desc);
create index reports_reported_user_id_idx on public.reports (reported_user_id);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();
create trigger reports_refuse_user_id_change
  before update on public.reports
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.reports enable row level security;

/**
 * Policy reports_select_moderation: moderation staff read every report.
 * Why: the queue is built from reports (S1-E10-03a); owner, admin and moderator act on moderation
 * (architecture 1.8.3), support and the content editor see none. Reporters don't read their own
 * rows here (see the header): their confirmation comes back from report_item() itself.
 */
create policy reports_select_moderation
  on public.reports
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy reports_select_moderation on public.reports is
  'Allows owner, admin and moderator, in a staff session, to read every report; nobody else (S1-E10-01).';

-- Exactly what the policy needs: reads for moderation staff; every write goes through report_item().
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

/* ---------- Which item, whose item ---------- */

/**
 * reportable_item_owner: whose item is being reported, and does it exist?
 * Inputs: item_type (a reportable_type value); item_reference, the item as the screen knows it:
 *   for a profile its username (never a user ID in a screen, architecture 1.6), for other types
 *   their row ID as text.
 * Returns: (item_id, owner_user_id). Errors: check_violation when there is no such item or the
 *   type has no branch yet.
 * Shared contract (23 Oct 2026): each user-content story adds one `when` branch for its type.
 *   Database test 042 fails when a reportable_type value has no branch here.
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- Lane A adds: when 'story' then … ; when 'chapter' then … (S1-E3-01, S1-E3-02).
    -- S1-E6-01 adds: when 'comment' then … .
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01).';
revoke execute on function public.reportable_item_owner(public.reportable_type, text) from public, anon, authenticated;

/**
 * reportable_item_summary: "what was reported", in a few words, for the moderation queue.
 * Inputs: item_type; item_id. Returns: for a profile "@username"; other types add their own
 *   line (a story's title, a chapter's story and number, a comment's first words).
 * Shared contract (23 Oct 2026): one branch per reportable_type value; test 042 checks it.
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    -- Lane A adds: when 'story' then … ; when 'chapter' then … .
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

comment on function public.reportable_item_summary(public.reportable_type, uuid) is
  'A few words saying what was reported, one branch per reportable_type (shared contract, S1-E10-01).';
revoke execute on function public.reportable_item_summary(public.reportable_type, uuid) from public, anon, authenticated;

/* ---------- Making a report ---------- */

/**
 * report_item: makes a report. The one way a report is created.
 * Inputs: item_type; item_reference (as reportable_item_owner() takes it); reason; details
 *   (optional, at most 2,000 characters).
 * Returns: (report_reference, received_at): the confirmation the reporter sees (DSA art. 16(4),
 *   confirmation of receipt). A second report of the same item by the same person within 24
 *   hours returns the first one's reference instead of a new row.
 * Errors: insufficient_privilege (42501) when signed out; check_violation (23514) for one's own
 *   item, a missing item or details too long; program_limit_exceeded (54000) past the hourly
 *   limit (setting report_hourly_limit).
 * Who may call it: any signed-in account, whatever its state: reporting is the one action the
 *   account gate always allows (architecture 1.7.8). S1-E10-06 adds the reporting pause.
 * Where it fits: ReportDialog → useReportItem → api/reports.ts → here; S1-E10-03a opens a
 *   moderation case from the new row.
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
  return query select new_report.reference, new_report.created_at;
end;
$$;

comment on function public.report_item(public.reportable_type, text, public.report_reason, text) is
  'Makes a report (any signed-in account, read-only ones included) and returns its reference (S1-E10-01).';
revoke execute on function public.report_item(public.reportable_type, text, public.report_reason, text) from public, anon;
grant execute on function public.report_item(public.reportable_type, text, public.report_reason, text) to authenticated;
