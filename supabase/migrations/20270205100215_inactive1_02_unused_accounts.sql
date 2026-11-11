-- Migration: an account nobody has used for 5 years deletes itself, after two emailed notices
-- (bundle INACTIVE-1).
--
-- Decision: Robert, 11 Nov 2026, 17:08 UTC: "add a 5 year no utilisation self deletion of account
-- automation". GDPR art. 5(1)(e) (storage limitation): personal data is kept no longer than it is
-- needed, and an account nobody has used for years no longer needs it. The builder's choices,
-- all settings so they can change without a release (Robert to confirm, INACTIVE-1 notes):
--   * "used" means the person had the app open while logged in on that day, logged in, or kept a
--     closing account; any of these starts the 5 years again;
--   * two notices, always emailed: about a month before and about a week before;
--   * at the end, the account closes the same way as "Delete my account" (S1-E13-03): hidden at
--     once, and deleted for good after account_deletion_days (14), so logging in during those
--     days and choosing "Keep my account" still brings it back;
--   * never staff accounts or the classics account; never a banned account (closed, never deleted:
--     Robert, 2 Nov 2026) or one with child abuse image evidence under its 5-year hold.
--
-- What it adds:
--   1. Settings: unused_account_years (5), unused_account_month_notice_days (30),
--      unused_account_week_notice_days (7).
--   2. account_last_used: the last day each account was used and which notices went out for it.
--      One row per account, overwritten each time: no history.
--   3. account_deletions.reason: 'requested' (the person) or 'unused' (this job).
--   4. note_active_minute(): the app's once-a-minute "here" now also notes the day of use.
--   5. hide_closing_account(): the closing steps of request_account_deletion(), shared with the job.
--   6. account_last_used_on(): the day an account was last used, from every signal above.
--   7. close_unused_accounts(): the nightly job (02:35 UTC) that sends the notices and closes.
--   8. The two notices are always emailed (email_delivery_for) and filed under notices from the
--      team (notification_category).
--   9. The deletion and export lists name the new table (database tests 211 and 212).
--
-- Who calls it: the app (note_active_minute, every minute while open), pg_cron (the job).
-- What it calls next: notifications (which queue the email), account_deletions (which the existing
-- purge-closed-accounts job carries out).

/* ---------- 1. Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('unused_account_years', '5'::jsonb, false,
   'An account nobody has used for this many years is deleted, after two emailed notices (INACTIVE-1; Robert, 11 Nov 2026).'),
  ('unused_account_month_notice_days', '30'::jsonb, false,
   'Days before an unused account is closed that the first notice is emailed (INACTIVE-1).'),
  ('unused_account_week_notice_days', '7'::jsonb, false,
   'Days before an unused account is closed that the last notice is emailed; the account never closes sooner than this after it (INACTIVE-1).')
on conflict (key) do nothing;

/* ---------- 2. The last day of use ---------- */

create table public.account_last_used (
  -- The account (CLAUDE.md rule 15). The row goes with the account.
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- The last day the person had the app open while logged in (Romanian time); null until then.
  used_on date,
  -- The day of last use the notices below were counted from; a newer use starts them again.
  notices_for date,
  -- When the first ("about a month") and last ("about a week") notices were sent.
  month_notice_at timestamptz,
  week_notice_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_last_used is
  'kind: user_action. The last day each account was used and the unused-account notices sent for it; overwritten each time, no history (INACTIVE-1).';

alter table public.account_last_used enable row level security;

-- Who: the person, for their own row only. Why: it is their data (GDPR art. 15). Nobody else,
-- staff included, reads it. Writes go only through note_active_minute() and the nightly job.
create policy account_last_used_select_own on public.account_last_used
  for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy account_last_used_select_own on public.account_last_used is
  'Allows a signed-in person to read only their own last day of use (INACTIVE-1).';

grant select on public.account_last_used to authenticated;

create trigger account_last_used_set_updated_at
  before update on public.account_last_used
  for each row execute function public.set_updated_at();

/* ---------- 3. Why an account is being deleted ---------- */

alter table public.account_deletions
  add column reason text not null default 'requested',
  add constraint account_deletions_reason_is_known check (reason in ('requested', 'unused'));

comment on column public.account_deletions.reason is
  'requested: the person chose "Delete my account" (S1-E13-03); unused: nobody used it for unused_account_years (INACTIVE-1).';

/* ---------- 4. Noting the day of use ---------- */

/**
 * note_active_minute: as in S1-E15-04, and first it notes today as the account's last day of use
 * (INACTIVE-1), for every signed-in account: staff and the classics account too, although the
 * unused-account job never closes them. It writes at most once a day per account.
 * Input: whether the person is reading. Returns { counted }.
 * Errors: 42501 when signed out.
 */
create or replace function public.note_active_minute(is_reading boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  today date := (now() at time zone 'Europe/Bucharest')::date;
  previous public.member_last_active;
  is_new_today boolean;
  counts_minute boolean;
begin
  -- Step 1: a signed-in person.
  if caller_id is null then
    raise exception 'Log in first.' using errcode = '42501';
  end if;
  -- Step 2: today is the account's last day of use (INACTIVE-1); the "where" keeps it to one
  -- write a day.
  insert into public.account_last_used (user_id, used_on) values (caller_id, today)
  on conflict (user_id) do update set used_on = excluded.used_on
  where account_last_used.used_on is null or account_last_used.used_on < excluded.used_on;
  -- Step 3: only members who count go on (staff and the classics account don't, S1-E15-04).
  if not public.counts_for_metrics(caller_id) then
    return jsonb_build_object('counted', false);
  end if;
  -- Step 4: the member's last day, locked so two tabs can't both count the same minute.
  select * into previous from public.member_last_active
  where member_last_active.user_id = caller_id for update;
  is_new_today := previous.user_id is null or previous.active_on < today;
  counts_minute := previous.minute_noted_at is null
    or previous.minute_noted_at < now() - interval '45 seconds';
  if not is_new_today and not counts_minute then
    return jsonb_build_object('counted', false);
  end if;
  -- Step 5: overwrite the one row: today, and now when a minute counts. No history is kept.
  insert into public.member_last_active (user_id, active_on, minute_noted_at)
  values (caller_id, today, now())
  on conflict (user_id) do update set
    active_on = excluded.active_on,
    minute_noted_at = case when counts_minute then excluded.minute_noted_at
                           else member_last_active.minute_noted_at end;
  -- Step 6: the day's totals, which carry no name.
  perform public.add_to_activity_totals(today, is_new_today::integer, counts_minute::integer,
    (counts_minute and coalesce(is_reading, false))::integer);
  return jsonb_build_object('counted', counts_minute);
end;
$$;

comment on function public.note_active_minute(boolean) is
  'The app''s once-a-minute "here": notes the day of use (INACTIVE-1), counts the member active today and adds a minute in the app and reading (S1-E15-04).';

/* ---------- 5. Closing an account ---------- */

/**
 * hide_closing_account: the closing steps of "Delete my account" (S1-E13-03), shared with the
 * unused-account job so both close an account the same way.
 * Steps: the profile is marked deleted (hidden everywhere, nothing can be written, online status
 * forgotten), and the live stories, comments, forum posts and the threads only the person posted
 * in go out of sight with the same time, so "Keep my account" brings back exactly these.
 * Input: the account. Internal: request_account_deletion() and close_unused_accounts().
 */
create or replace function public.hide_closing_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the account closes: hidden everywhere, and online status forgotten.
  update public.profiles set deleted_at = now(), last_active_at = null where profiles.id = target_user_id;
  -- Step 2: the live stories and comments (chapters follow their story).
  update public.stories set deleted_at = now()
  where stories.user_id = target_user_id and stories.deleted_at is null;
  update public.comments set deleted_at = now(), deleted_by = 'author'
  where comments.user_id = target_user_id and comments.deleted_at is null;
  -- Step 3: the forums (S1-E8-02): the person's posts become "Post deleted" markers, and a thread
  -- nobody else has a live post in goes with them.
  update public.forum_posts set deleted_at = now()
  where forum_posts.user_id = target_user_id and forum_posts.deleted_at is null;
  update public.forum_threads set deleted_at = now()
  where forum_threads.user_id = target_user_id and forum_threads.deleted_at is null
    and not exists (select 1 from public.forum_posts
                    where forum_posts.thread_id = forum_threads.id
                      and forum_posts.user_id <> target_user_id
                      and forum_posts.deleted_at is null);
end;
$$;

comment on function public.hide_closing_account(uuid) is
  'Internal: hides a closing account and what it published, with one time so a cancel brings back exactly that (S1-E13-03, INACTIVE-1).';
revoke execute on function public.hide_closing_account(uuid) from public, anon, authenticated;

/**
 * request_account_deletion: as in S1-E13-03 and S1-E8-02, with the closing steps moved to
 * hide_closing_account() (INACTIVE-1). Closes the caller's account now and deletes it for good
 * after account_deletion_days.
 * Returns: { delete_after }.
 * Errors: insufficient_privilege (hint signed_out) when signed out or already closed;
 *   check_violation with hint sign_in_again when the last log-in is older than
 *   account_deletion_fresh_sign_in_minutes; hint staff_account for a staff account.
 */
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  deletion_days integer := coalesce((public.setting_value('account_deletion_days'))::integer, 14);
  closes_on timestamptz := now() + make_interval(days => deletion_days);
begin
  -- Step 1: the board's "Log in again to confirm".
  if not public.account_signed_in_recently() then
    raise exception 'Log in again to confirm.' using errcode = 'check_violation', hint = 'sign_in_again';
  end if;
  -- Step 2: a staff account keeps its staff powers off a closing account (architecture 1.8.1).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = caller_id) then
    raise exception 'A staff account can''t be deleted here.' using errcode = 'check_violation', hint = 'staff_account';
  end if;
  -- Step 3: the account and what it published go out of sight.
  perform public.hide_closing_account(caller_id);
  -- Step 4: the request, for the closing page and the nightly job.
  insert into public.account_deletions (user_id, delete_after, reason)
  values (caller_id, closes_on, 'requested');
  return jsonb_build_object('delete_after', closes_on);
end;
$$;

comment on function public.request_account_deletion() is
  'Closes the caller''s account now and deletes it for good after account_deletion_days; needs a fresh log-in (S1-E13-03).';

/* ---------- 6. When an account was last used ---------- */

/**
 * account_last_used_on: the last day anyone used an account, from every signal there is: the day
 * it was made, the last log-in, the last day the app was open (account_last_used) and the last
 * time a closing account was kept ("Keep my account"). An account made or used today gives today.
 * Input: the account. Returns the day (Romanian time), or null for an account that doesn't exist.
 * Internal: close_unused_accounts() and its tests.
 */
create or replace function public.account_last_used_on(target_user_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    (profiles.created_at at time zone 'Europe/Bucharest')::date,
    (users.last_sign_in_at at time zone 'Europe/Bucharest')::date,
    (select account_last_used.used_on from public.account_last_used
     where account_last_used.user_id = profiles.id),
    (select (max(account_deletions.cancelled_at) at time zone 'Europe/Bucharest')::date
     from public.account_deletions where account_deletions.user_id = profiles.id))
  from public.profiles
  left join auth.users on users.id = profiles.id
  where profiles.id = target_user_id;
$$;

comment on function public.account_last_used_on(uuid) is
  'Internal: the last day an account was made, logged in to, open in the app or kept from closing (INACTIVE-1).';
revoke execute on function public.account_last_used_on(uuid) from public, anon, authenticated;

/* ---------- 7. The nightly job ---------- */

/**
 * unused_account_setting: one of the three INACTIVE-1 settings as a whole number.
 * Input: the key and the number to use when the setting is missing. Internal.
 */
create or replace function public.unused_account_setting(setting_key text, fallback integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.setting_value(setting_key) #>> '{}')::integer, fallback);
$$;

comment on function public.unused_account_setting(text, integer) is
  'Internal: an unused-account setting as a number, with its default (INACTIVE-1).';
revoke execute on function public.unused_account_setting(text, integer) from public, anon, authenticated;

/**
 * send_unused_account_notice: notes and sends one of the two notices. The notification queues its
 * email at once, because both kinds are always emailed (email_delivery_for below).
 * Input: the account, the day of last use the notice counts from, and 'month' or 'week'.
 * Internal: close_unused_accounts().
 */
create or replace function public.send_unused_account_notice(
  target_user_id uuid,
  last_used date,
  which_notice text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the row remembers the notice, counted from this day of last use.
  insert into public.account_last_used (user_id, notices_for, month_notice_at, week_notice_at)
  values (target_user_id, last_used,
          case when which_notice = 'month' then now() end,
          case when which_notice = 'week' then now() end)
  on conflict (user_id) do update set
    notices_for = excluded.notices_for,
    month_notice_at = coalesce(excluded.month_notice_at, account_last_used.month_notice_at),
    week_notice_at = coalesce(excluded.week_notice_at, account_last_used.week_notice_at);
  -- Step 2: the notice itself; the email goes out with the next run of the email worker.
  insert into public.notifications (user_id, kind, is_required)
  values (target_user_id,
          case which_notice when 'month' then 'account_unused_month'
                            else 'account_unused_week' end::public.notification_kind,
          true);
end;
$$;

comment on function public.send_unused_account_notice(uuid, date, text) is
  'Internal: sends the "about a month" or "about a week" unused-account notice and remembers it (INACTIVE-1).';
revoke execute on function public.send_unused_account_notice(uuid, date, text) from public, anon, authenticated;

/**
 * close_unused_account: closes one account nobody used, the same way as "Delete my account", and
 * leaves it to the purge-closed-accounts job, which deletes it for good after
 * account_deletion_days unless someone logs in and keeps it.
 * Input: the account. Internal: close_unused_accounts().
 */
create or replace function public.close_unused_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_days integer := public.unused_account_setting('account_deletion_days', 14);
begin
  perform public.hide_closing_account(target_user_id);
  insert into public.account_deletions (user_id, delete_after, reason)
  values (target_user_id, now() + make_interval(days => deletion_days), 'unused');
end;
$$;

comment on function public.close_unused_account(uuid) is
  'Internal: closes an account nobody used, to be deleted after account_deletion_days (INACTIVE-1).';
revoke execute on function public.close_unused_account(uuid) from public, anon, authenticated;

/**
 * unused_account_step: what tonight's job does for one account: nothing, a notice or closing it.
 * Rules (INACTIVE-1): the account closes on the day it reaches unused_account_years without use,
 * but never sooner than unused_account_week_notice_days after the last notice, so nobody is closed
 * without a week's warning. The first notice goes about a month before; when that window was
 * missed (the job didn't run), only the last notice goes. One step a night.
 * Input: the account, its day of last use and its notices row (nulls when it has none).
 * Returns 'none', 'month', 'week' or 'close'. Internal: close_unused_accounts().
 */
create or replace function public.unused_account_step(
  last_used date,
  notices_for date,
  month_notice_at timestamptz,
  week_notice_at timestamptz
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Bucharest')::date;
  closes_on date := last_used + make_interval(years => public.unused_account_setting('unused_account_years', 5));
  month_days integer := public.unused_account_setting('unused_account_month_notice_days', 30);
  week_days integer := public.unused_account_setting('unused_account_week_notice_days', 7);
  is_same_count boolean := notices_for is not distinct from last_used;
begin
  -- Step 1: notices sent for an older day of use don't count: the person used it since.
  if not is_same_count then
    month_notice_at := null;
    week_notice_at := null;
  end if;
  -- Step 2: nothing before the month window.
  if today < closes_on - month_days then
    return 'none';
  end if;
  -- Step 3: the last notice, from the week window on (or the first night after a missed month).
  if today >= closes_on - week_days and week_notice_at is null then
    return 'week';
  end if;
  -- Step 4: the first notice, inside the month window.
  if today < closes_on - week_days then
    return case when month_notice_at is null then 'month' else 'none' end;
  end if;
  -- Step 5: closing, once the day has come and the last notice is a week old.
  if today >= closes_on and week_notice_at <= now() - make_interval(days => week_days) then
    return 'close';
  end if;
  return 'none';
end;
$$;

comment on function public.unused_account_step(date, date, timestamptz, timestamptz) is
  'Internal: tonight''s step for one unused account: none, month notice, week notice or close (INACTIVE-1).';
revoke execute on function public.unused_account_step(date, date, timestamptz, timestamptz) from public, anon, authenticated;

/**
 * close_unused_accounts: the nightly job. For every live account that isn't staff, the classics
 * account, banned, under an abuse image evidence hold or already closing, it sends the notice that is due or closes the
 * account (unused_account_step()).
 * Returns: { month_notices, week_notices, closed }. Runs nightly at 02:35 UTC
 * (job close-unused-accounts), before purge-closed-accounts at 03:05.
 */
create or replace function public.close_unused_accounts()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account record;
  step text;
  month_notices integer := 0;
  week_notices integer := 0;
  closed integer := 0;
  month_days integer := public.unused_account_setting('unused_account_month_notice_days', 30);
  years integer := public.unused_account_setting('unused_account_years', 5);
begin
  -- Step 1: the accounts whose month window has started (a cheap first cut in SQL).
  for account in
    select candidates.user_id, candidates.last_used, last_use_rows.notices_for,
           last_use_rows.month_notice_at, last_use_rows.week_notice_at
    from (
      select profiles.id as user_id, public.account_last_used_on(profiles.id) as last_used
      from public.profiles
      where profiles.deleted_at is null
        and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id)
        and not public.is_classics_account(profiles.id)
        -- A banned account is closed, never deleted (Robert, 2 Nov 2026; ADMIN-2 part f1), and an
        -- account with child abuse image evidence stays under that evidence's 5-year hold
        -- (ADMIN-2e2b): purge_closed_accounts() would skip both, so they get no notice either.
        and (public.active_sanction(profiles.id, 'ban')).id is null
        and not exists (select 1 from public.abuse_image_evidence
                        where abuse_image_evidence.user_id = profiles.id)
        and not exists (select 1 from public.account_deletions
                        where account_deletions.user_id = profiles.id
                          and account_deletions.cancelled_at is null
                          and account_deletions.completed_at is null)
    ) as candidates
    left join public.account_last_used as last_use_rows on last_use_rows.user_id = candidates.user_id
    where candidates.last_used + make_interval(years => years) - make_interval(days => month_days)
          <= (now() at time zone 'Europe/Bucharest')::date
  loop
    -- Step 2: what is due for this account tonight.
    step := public.unused_account_step(account.last_used, account.notices_for,
                                       account.month_notice_at, account.week_notice_at);
    -- Step 3: do it, and count it.
    if step in ('month', 'week') then
      perform public.send_unused_account_notice(account.user_id, account.last_used, step);
      if step = 'month' then month_notices := month_notices + 1; else week_notices := week_notices + 1; end if;
    elsif step = 'close' then
      perform public.close_unused_account(account.user_id);
      closed := closed + 1;
    end if;
  end loop;
  return jsonb_build_object('month_notices', month_notices, 'week_notices', week_notices, 'closed', closed);
end;
$$;

comment on function public.close_unused_accounts() is
  'Nightly: emails the notices to accounts nobody used for almost unused_account_years and closes them after (INACTIVE-1).';
revoke execute on function public.close_unused_accounts() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('close-unused-accounts', '35 2 * * *', 'select public.close_unused_accounts()');

/* ---------- 8. The notices are always emailed ---------- */

/**
 * email_delivery_for: as in WAITLIST-1, and both unused-account notices are always sent: an email
 * is the only way to reach someone who doesn't open the app (INACTIVE-1).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended', 'data_request_copy_ready',
                  'picture_opened_by_staff', 'waitlist_admitted',
                  'account_unused_month', 'account_unused_week') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;

comment on function public.email_delivery_for(uuid, public.notification_kind) is
  'Internal: one person''s email delivery for one notification kind (S1-E7-02).';

/**
 * notification_category: as before, and the two unused-account notices are filed with the other
 * notices from the team ('staff') (INACTIVE-1).
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'live_session_soon' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    when 'waitlist_admitted' then 'staff'
    when 'home_comment_invited' then 'staff'
    when 'account_unused_month' then 'staff'
    when 'account_unused_week' then 'staff'
    else 'replies'
  end;
$$;

comment on function public.notification_category(public.notification_kind) is
  'Internal: the filter chip a notification kind sits under (S1-E7-01).';

/* ---------- 9. The deletion and export lists ---------- */

/**
 * data_export_tables: as before, and the last day of use goes in the person's copy (INACTIVE-1).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('account_last_used', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_moves', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_post_votes', true, null),
    ('forum_thread_follows', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('member_last_active', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_list_stories', true, null),
    ('reading_lists', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before, and the last day of use is deleted with the account
 * (INACTIVE-1).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('account_last_used', 'delete', 1, null),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_moves', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('contest_entries', 'delete', 1, null),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_post_votes', 'delete', 1, null),
    ('forum_thread_follows', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('member_last_active', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_list_stories', 'delete', 1, null),
    ('reading_lists', 'delete', 2, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;

