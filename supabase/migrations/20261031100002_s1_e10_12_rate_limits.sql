/*
 * Migration: spam and abuse rate limits (story S1-E10-12; canvas 8.6 proposal).
 *
 * What it adds:
 *   setting rate_limits         per action, how many times an hour a new and an older account may
 *                               do it (seeded; the admin screen is S1-E11-03)
 *   setting new_account_hours   how long an account counts as new (24)
 *   setting new_account_max_links  how many links a new account's comment may hold (1)
 *   rate_limit_events           one row each time a limited action is taken; nobody reads it
 *                               through the API, and it is purged after 2 days
 *   take_rate_limit(action)     the one check every limited action calls: refuses with the minutes
 *                               to wait, or records the action
 *   wait_minutes_until_free()   the minutes until the oldest action of the last hour drops out
 *   a links check on comments   a new account's comment may hold one link (criterion 1)
 *   report_item()               the hourly report limit now says how long to wait (criterion 3)
 *   purge_rate_limit_events()   the daily clean-up, on pg_cron
 * The errors: every limit raises program_limit_exceeded (54000) with the hint "wait_minutes:<n>",
 * the convention comments already use (S1-E6-01), so every screen can say how long to wait.
 * Sign-up's accessible challenge (criterion 2) is the emailed confirmation already in place
 * (S1-E2-01): no puzzle, so WCAG 2.2, 3.3.8 holds. Nothing here stores an IP address (Q48).
 * Who calls it: appeals and moderator mail (this bundle), the picture check, comments (trigger)
 * and report_item().
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('rate_limits', '{
      "appeal": {"new_account": 3, "older_account": 5},
      "moderator_mail": {"new_account": 5, "older_account": 15},
      "picture_upload": {"new_account": 10, "older_account": 30}
    }'::jsonb, false,
   'Per action, how many times an hour a new and an older account may do it (S1-E10-12; proposal, canvas 8.6). Reports and comments keep their own settings.'),
  ('new_account_hours', '24'::jsonb, false,
   'How many hours an account counts as new for the rate limits (S1-E10-12 criterion 1).'),
  ('new_account_max_links', '1'::jsonb, false,
   'How many links a comment by a new account may hold (S1-E10-12 criterion 1).')
on conflict (key) do nothing;

/* ---------- The events ---------- */

create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  -- Whose action it was (CLAUDE.md rule 15); nothing else about them, never an IP address.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Which limit: a key of the rate_limits setting.
  action text not null,
  created_at timestamptz not null default now(),
  -- Never changed; the column is here because every table has one (CLAUDE.md conventions).
  updated_at timestamptz not null default now(),
  constraint rate_limit_events_action_is_named check (action ~ '^[a-z_]{1,40}$')
);

comment on table public.rate_limit_events is
  'kind: user_action
One row per limited action, read only by take_rate_limit() and purged after 2 days (S1-E10-12).';

create index rate_limit_events_user_action_idx on public.rate_limit_events (user_id, action, created_at desc);
create trigger rate_limit_events_refuse_user_id_change
  before update on public.rate_limit_events
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.rate_limit_events enable row level security;

/**
 * rate_limit_events_select_own: a person may read their own events, nobody else's. Why: the table
 * holds only what they did and when, which is theirs to see (GDPR art. 15); every write goes
 * through take_rate_limit(), so there is no write policy.
 */
create policy rate_limit_events_select_own
  on public.rate_limit_events for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy rate_limit_events_select_own on public.rate_limit_events is
  'Allows a person to read their own rate limit events, nobody else''s (S1-E10-12).';

grant select on public.rate_limit_events to authenticated;

/* ---------- The check ---------- */

/**
 * wait_minutes_until_free: how many whole minutes until an action from the last hour drops out
 * of the hourly window.
 * Input: oldest_in_window, the time of the oldest action still in the window.
 * Returns: at least 1. Internal: take_rate_limit() and report_item().
 */
create or replace function public.wait_minutes_until_free(oldest_in_window timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(1, ceil(extract(epoch from (oldest_in_window + interval '1 hour' - now())) / 60.0))::integer;
$$;

comment on function public.wait_minutes_until_free(timestamptz) is
  'Internal: minutes until the oldest action of the last hour leaves the window, at least 1 (S1-E10-12).';
revoke execute on function public.wait_minutes_until_free(timestamptz) from public, anon, authenticated;

/**
 * account_is_new: true while the account is younger than new_account_hours (24).
 * Input: target_user_id. Internal: take_rate_limit() and the comment links check.
 */
create or replace function public.account_is_new(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select profiles.created_at > now() - make_interval(
      hours => coalesce((public.setting_value('new_account_hours'))::text::integer, 24))
    from public.profiles where profiles.id = target_user_id), false);
$$;

comment on function public.account_is_new(uuid) is
  'Internal: true while the account is younger than new_account_hours (S1-E10-12 criterion 1).';
revoke execute on function public.account_is_new(uuid) from public, anon, authenticated;

/**
 * take_rate_limit: checks one limited action for the signed-in person and, when allowed,
 * records it.
 * Input: action, a key of the rate_limits setting (appeal, moderator_mail, picture_upload).
 * Returns: nothing.
 * Errors: program_limit_exceeded (54000) with the hint "wait_minutes:<n>" when the hourly limit
 *   is reached, so the screen can say how long to wait (criterion 3); insufficient_privilege when
 *   signed out. An action missing from the setting isn't limited.
 * Where it fits: every limited security definer function calls it before it writes. Internal.
 */
create or replace function public.take_rate_limit(action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  limits jsonb := public.setting_value('rate_limits') -> take_rate_limit.action;
  hourly_limit integer;
  used integer;
  oldest timestamptz;
begin
  -- Step 1: signed in; an action with no limit set passes.
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege';
  end if;
  if limits is null then
    return;
  end if;
  -- Step 2: the limit for this account's age (lower for a new account, criterion 1).
  hourly_limit := (limits ->> case when public.account_is_new(caller_id) then 'new_account' else 'older_account' end)::integer;
  -- Step 3: what the person did in the last hour.
  select count(*)::integer, min(rate_limit_events.created_at) into used, oldest
  from public.rate_limit_events
  where rate_limit_events.user_id = caller_id and rate_limit_events.action = take_rate_limit.action
    and rate_limit_events.created_at > now() - interval '1 hour';
  if used >= hourly_limit then
    raise exception 'You have done this a lot in the last hour. Wait % minutes.', public.wait_minutes_until_free(oldest)
      using errcode = 'program_limit_exceeded', hint = 'wait_minutes:' || public.wait_minutes_until_free(oldest);
  end if;
  -- Step 4: record this one.
  insert into public.rate_limit_events (user_id, action) values (caller_id, take_rate_limit.action);
end;
$$;

comment on function public.take_rate_limit(text) is
  'Internal: refuses a limited action with the minutes to wait, or records it (S1-E10-12).';
revoke execute on function public.take_rate_limit(text) from public, anon, authenticated;

/* ---------- Links in a new account's comments ---------- */

/**
 * count_links: how many links a piece of Markdown holds: every http, https or mailto address,
 * written as a Markdown link or bare. Input: body. Returns: the count. Internal.
 */
create or replace function public.count_links(body text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select count(*)::integer from regexp_matches(coalesce(body, ''), '(https?://|mailto:)', 'gi');
$$;

comment on function public.count_links(text) is 'Internal: how many http, https or mailto links a text holds (S1-E10-12).';
revoke execute on function public.count_links(text) from public, anon, authenticated;

/**
 * refuse_new_account_links: a comment by an account younger than new_account_hours may hold at
 * most new_account_max_links links (criterion 1). Trigger: before insert on comments.
 * Errors: check_violation with a plain message, which the comment box shows.
 */
create or replace function public.refuse_new_account_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  most_links integer := coalesce((public.setting_value('new_account_max_links'))::text::integer, 1);
begin
  if public.account_is_new(new.user_id) and public.count_links(new.body) > most_links then
    raise exception 'New accounts can add % link per comment for their first day.', most_links
      using errcode = 'check_violation', hint = 'too_many_links';
  end if;
  return new;
end;
$$;

comment on function public.refuse_new_account_links() is
  'Trigger: a new account''s comment holds at most new_account_max_links links (S1-E10-12).';
revoke execute on function public.refuse_new_account_links() from public, anon, authenticated;

create trigger comments_refuse_new_account_links
  before insert on public.comments
  for each row execute function public.refuse_new_account_links();

/* ---------- Reports say how long to wait ---------- */

/**
 * report_item: as in S1-E10-08; the hourly limit now raises with the hint "wait_minutes:<n>", so
 * the report dialog says how long to wait (S1-E10-12 criterion 3). Everything else is unchanged.
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
  sent_in_hour integer;
  oldest_in_hour timestamptz;
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
  -- Step 4: the hourly limit, with how long to wait (S1-E10-12).
  select count(*)::integer, min(reports.created_at) into sent_in_hour, oldest_in_hour
  from public.reports
  where reports.user_id = reporter_id and reports.created_at > now() - interval '1 hour';
  if sent_in_hour >= hourly_limit then
    raise exception 'Too many reports in an hour. Wait % minutes.', public.wait_minutes_until_free(oldest_in_hour)
      using errcode = 'program_limit_exceeded', hint = 'wait_minutes:' || public.wait_minutes_until_free(oldest_in_hour);
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
  'Reports an item: checks the reporter, the item, duplicates and the hourly limit (with the wait, S1-E10-12), stores the report and opens or joins its case (S1-E10-01, 03a, 06, 08).';

/* ---------- The clean-up ---------- */

/**
 * purge_rate_limit_events: deletes events older than 2 days; the limits only look back an hour,
 * so nothing older is needed (data minimisation, GDPR art. 5(1)(c)).
 * Returns: how many rows went. Called by pg_cron every night at 03:40.
 */
create or replace function public.purge_rate_limit_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.rate_limit_events where created_at < now() - interval '2 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.purge_rate_limit_events() is
  'Deletes rate limit events older than 2 days; pg_cron runs it nightly (S1-E10-12).';
revoke execute on function public.purge_rate_limit_events() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-rate-limit-events', '40 3 * * *', 'select public.purge_rate_limit_events()');
