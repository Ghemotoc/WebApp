-- Migration: the journey of an account nobody logs in to: yearly nudges, quarterly ones in the
-- last year, a notice at 5 years, closing 30 days later and a way to download the data after
-- (bundle INACTIVE-2; replaces the two notices of INACTIVE-1).
--
-- Decisions (Robert, 11 Nov 2026, Builder thread):
--   19:40 UTC: the notice says the account closes within 30 days and that the data will be
--     offered then; nudges before it.
--   19:42 UTC (decision card): at closing, an email with a link; the person logs in to download.
--     No personal data travels by email.
--   19:43 UTC: logging in through that link only to download does not keep the account: it is
--     deleted for good after account_deletion_days (14, "the 15th day"). Going on to use the site
--     keeps it (the app calls cancel_account_deletion() then; see AccountClosingGate).
--   19:44 UTC: "let's do it after 5 calendar years and on the 4th year we start the quarterly
--     notices. Otherwise only yearly notices" (replaces the 1 year and 90 days of 19:40).
-- GDPR art. 5(1)(e) (storage limitation) and art. 15 and 20 (a copy of one's data).
--
-- The journey, counted in calendar time since the account was last used (account_last_used_on()):
--   1, 2, 3 years               a yearly nudge ('account_unused_nudge')
--   4 years, then every 3       a quarterly nudge (4y, 4y 3m, 4y 6m, 4y 9m), from
--   months                      unused_account_quarterly_from_years
--   5 years                     the notice ('account_unused_month'): closes in 30 days unless
--                               someone logs in (unused_account_years)
--   5 years + 30 days           the account closes like "Delete my account" (reason 'unused') and
--                               the closing email goes ('account_unused_closed')
--   14 days later               purge-closed-accounts deletes it for good (account_deletion_days)
-- The account never closes sooner than unused_account_close_days after its notice was really
-- sent, even when the job missed nights.
--
-- What it changes:
--   1. Settings: unused_account_quarterly_from_years (4) and unused_account_close_days (30)
--      replace the two notice settings; unused_account_years (5) stays.
--   2. account_last_used: closing_notice_at (was month_notice_at) and nudges_sent; week_notice_at
--      goes.
--   3. unused_account_nudges_due(), unused_account_step(), send_unused_account_notice(),
--      close_unused_account() and the nightly close_unused_accounts() follow the journey above.
--   4. The nudge and the closing email are always emailed and filed under notices from the team.
--   5. The closing email reaches a closed account (email_worker_claim()).
--   6. A closing account can still make and download its copy (require_export_caller() in
--      request_data_export(), my_data_export() and finish_data_export()).
--   7. my_account_deletion() says why the account is closing, so the app can tell the two apart.
--
-- Who calls it: pg_cron (the job, 02:35 UTC as before), the app (the export functions and
-- my_account_deletion()), the email worker (email_worker_claim()).
-- What it calls next: notifications (which queue the emails), account_deletions (which the
-- existing purge-closed-accounts job carries out).

/* ---------- 1. Settings ---------- */

delete from public.settings
where key in ('unused_account_month_notice_days', 'unused_account_week_notice_days');

update public.settings
set description = 'An account nobody has used for this many years gets the closing notice, and closes unused_account_close_days later (INACTIVE-1, INACTIVE-2; Robert, 11 Nov 2026). The emails say "5 years": change their words with it.'
where key = 'unused_account_years';

insert into public.settings (key, value, is_public, description) values
  ('unused_account_quarterly_from_years', '4'::jsonb, false,
   'Nudges to an unused account are yearly before this many years and every 3 months from it until the closing notice (INACTIVE-2; Robert, 11 Nov 2026).'),
  ('unused_account_close_days', '30'::jsonb, false,
   'Days after the closing notice that an unused account closes; it never closes sooner (INACTIVE-2). The emails say "30 days": change their words with it.')
on conflict (key) do nothing;

/* ---------- 2. The notices row ---------- */

alter table public.account_last_used rename column month_notice_at to closing_notice_at;
alter table public.account_last_used drop column week_notice_at;
alter table public.account_last_used add column nudges_sent integer not null default 0;

comment on column public.account_last_used.closing_notice_at is
  'When the closing notice (30 days before) was sent for the day of use in notices_for (INACTIVE-2).';
comment on column public.account_last_used.nudges_sent is
  'How many nudges were due and covered for the day of use in notices_for (INACTIVE-2).';
comment on table public.account_last_used is
  'kind: user
The last day each account was used and which unused-account emails went out for it (INACTIVE-1, INACTIVE-2). One row per account, overwritten: no history of log-ins is kept.';
comment on column public.account_deletions.reason is
  'requested: the person chose "Delete my account" (S1-E13-03); unused: nobody used it for unused_account_years and 30 days more (INACTIVE-1, INACTIVE-2).';

/* ---------- 3. The journey ---------- */

drop function public.unused_account_step(date, date, timestamptz, timestamptz);
drop function public.send_unused_account_notice(uuid, date, text);

/**
 * unused_account_nudges_due: how many nudges an account last used on a day should have had by
 * today: one for each full year before unused_account_quarterly_from_years, then one every 3
 * months from that year until (not counting) the day of the closing notice.
 * Input: the day of last use. Returns the count (0 on the first day and before the first year).
 * Internal: unused_account_step() and send_unused_account_notice().
 */
create function public.unused_account_nudges_due(last_used date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with numbers as (
    select public.unused_account_setting('unused_account_years', 5) as closing_years,
           least(public.unused_account_setting('unused_account_quarterly_from_years', 4),
                 public.unused_account_setting('unused_account_years', 5)) as quarterly_from
  ),
  nudge_days as (
    -- The yearly nudges: 1 year, 2 years, up to the year before the quarterly ones start.
    select (last_used + make_interval(years => year_number))::date as due_on
    from numbers, generate_series(1, numbers.quarterly_from - 1) as year_number
    union all
    -- The quarterly nudges: from that year, every 3 months, stopping before the notice.
    select (last_used + make_interval(years => numbers.quarterly_from, months => 3 * quarter_number))::date
    from numbers, generate_series(0, (numbers.closing_years - numbers.quarterly_from) * 4 - 1) as quarter_number
  )
  select count(*)::integer from nudge_days
  where nudge_days.due_on <= (now() at time zone 'Europe/Bucharest')::date;
$$;

comment on function public.unused_account_nudges_due(date) is
  'Internal: how many yearly and quarterly nudges an account last used on that day should have had by today (INACTIVE-2).';
revoke execute on function public.unused_account_nudges_due(date) from public, anon, authenticated;

/**
 * unused_account_step: what tonight's job does for one account: nothing, a nudge, the closing
 * notice or closing it. One step a night.
 * Rules (INACTIVE-2; Robert, 11 Nov 2026): the notice goes once the account reaches
 * unused_account_years without use; the account closes unused_account_close_days after the
 * notice was really sent, never sooner; before the notice, a nudge is due each time another
 * nudge day has passed (unused_account_nudges_due()). Emails sent for an older day of use don't
 * count: the person used the account since, so everything starts again.
 * Input: the day of last use and the account's notices row (nulls and 0 when it has none).
 * Returns 'none', 'nudge', 'notice' or 'close'. Internal: close_unused_accounts().
 */
create function public.unused_account_step(
  last_used date,
  notices_for date,
  closing_notice_at timestamptz,
  nudges_sent integer
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Bucharest')::date;
  notice_on date := last_used + make_interval(years => public.unused_account_setting('unused_account_years', 5));
  close_days integer := public.unused_account_setting('unused_account_close_days', 30);
begin
  -- Step 1: emails sent for an older day of use don't count.
  if notices_for is distinct from last_used then
    closing_notice_at := null;
    nudges_sent := 0;
  end if;
  -- Step 2: after the notice, the only step left is closing, once the notice is old enough.
  if closing_notice_at is not null then
    if closing_notice_at <= now() - make_interval(days => close_days) then
      return 'close';
    end if;
    return 'none';
  end if;
  -- Step 3: the notice, from the day the account reaches 5 years without use.
  if today >= notice_on then
    return 'notice';
  end if;
  -- Step 4: a nudge, when another nudge day has passed.
  if public.unused_account_nudges_due(last_used) > coalesce(nudges_sent, 0) then
    return 'nudge';
  end if;
  return 'none';
end;
$$;

comment on function public.unused_account_step(date, date, timestamptz, integer) is
  'Internal: tonight''s step for one unused account: none, nudge, notice or close (INACTIVE-2).';
revoke execute on function public.unused_account_step(date, date, timestamptz, integer) from public, anon, authenticated;

/**
 * send_unused_account_notice: remembers and sends a nudge or the closing notice. The notification
 * queues its email at once, because both kinds are always emailed (email_delivery_for below).
 * Input: the account, the day of last use the email counts from, and 'nudge' or 'notice'.
 * A nudge covers every nudge day that has passed, so nights the job missed don't send several.
 * Internal: close_unused_accounts().
 */
create function public.send_unused_account_notice(
  target_user_id uuid,
  last_used date,
  which_notice text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  nudges_due integer := public.unused_account_nudges_due(last_used);
begin
  -- Step 1: the row remembers the email, counted from this day of last use. A row kept for an
  -- older day of use starts again first.
  insert into public.account_last_used (user_id, notices_for, closing_notice_at, nudges_sent)
  values (target_user_id, last_used,
          case when which_notice = 'notice' then now() end,
          case when which_notice = 'nudge' then nudges_due else 0 end)
  on conflict (user_id) do update set
    notices_for = excluded.notices_for,
    closing_notice_at = case
      when which_notice = 'notice' then excluded.closing_notice_at
      when account_last_used.notices_for is distinct from excluded.notices_for then null
      else account_last_used.closing_notice_at end,
    nudges_sent = case
      when which_notice = 'nudge' then excluded.nudges_sent
      when account_last_used.notices_for is distinct from excluded.notices_for then 0
      else account_last_used.nudges_sent end;
  -- Step 2: the email itself goes out with the next run of the email worker.
  insert into public.notifications (user_id, kind, is_required)
  values (target_user_id,
          case which_notice when 'notice' then 'account_unused_month'
                            else 'account_unused_nudge' end::public.notification_kind,
          true);
end;
$$;

comment on function public.send_unused_account_notice(uuid, date, text) is
  'Internal: sends a nudge or the closing notice for an unused account and remembers it (INACTIVE-2).';
revoke execute on function public.send_unused_account_notice(uuid, date, text) from public, anon, authenticated;

/**
 * close_unused_account: closes one account nobody used, the same way as "Delete my account",
 * sends the closing email (how to download the data or keep the account) and leaves the rest to
 * the purge-closed-accounts job, which deletes it for good after account_deletion_days unless the
 * person comes back.
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
  -- Step 1: hidden everywhere, and due to be deleted for good.
  perform public.hide_closing_account(target_user_id);
  insert into public.account_deletions (user_id, delete_after, reason)
  values (target_user_id, now() + make_interval(days => deletion_days), 'unused');
  -- Step 2: the closing email (Robert, 11 Nov 2026, 19:42 UTC: a link, never the data itself).
  insert into public.notifications (user_id, kind, is_required)
  values (target_user_id, 'account_unused_closed', true);
end;
$$;

comment on function public.close_unused_account(uuid) is
  'Internal: closes an account nobody used, emails how to download its data, to be deleted after account_deletion_days (INACTIVE-2).';

/**
 * close_unused_accounts: the nightly job. For every live account that isn't staff, the classics
 * account, banned, under an abuse image evidence hold or already closing, it sends the email that
 * is due or closes the account (unused_account_step()).
 * Returns: { nudges, notices, closed }. Runs nightly at 02:35 UTC (job close-unused-accounts),
 * before purge-closed-accounts at 03:05.
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
  nudges integer := 0;
  notices integer := 0;
  closed integer := 0;
begin
  -- Step 1: the accounts unused for a year or more: nothing is due sooner (a cheap first cut;
  -- with quarterly nudges set to start before the first year, those start at a year too).
  for account in
    select candidates.user_id, candidates.last_used, last_use_rows.notices_for,
           last_use_rows.closing_notice_at, last_use_rows.nudges_sent
    from (
      select profiles.id as user_id, public.account_last_used_on(profiles.id) as last_used
      from public.profiles
      where profiles.deleted_at is null
        and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id)
        and not public.is_classics_account(profiles.id)
        -- A banned account is closed, never deleted (Robert, 2 Nov 2026; ADMIN-2 part f1), and an
        -- account with child abuse image evidence stays under that evidence's 5-year hold
        -- (ADMIN-2e2b): purge_closed_accounts() would skip both, so they get no email either.
        and (public.active_sanction(profiles.id, 'ban')).id is null
        and not exists (select 1 from public.abuse_image_evidence
                        where abuse_image_evidence.user_id = profiles.id)
        and not exists (select 1 from public.account_deletions
                        where account_deletions.user_id = profiles.id
                          and account_deletions.cancelled_at is null
                          and account_deletions.completed_at is null)
    ) as candidates
    left join public.account_last_used as last_use_rows on last_use_rows.user_id = candidates.user_id
    where candidates.last_used + interval '1 year' <= (now() at time zone 'Europe/Bucharest')::date
  loop
    -- Step 2: what is due for this account tonight.
    step := public.unused_account_step(account.last_used, account.notices_for,
                                       account.closing_notice_at, coalesce(account.nudges_sent, 0));
    -- Step 3: do it, and count it.
    if step in ('nudge', 'notice') then
      perform public.send_unused_account_notice(account.user_id, account.last_used, step);
      if step = 'nudge' then nudges := nudges + 1; else notices := notices + 1; end if;
    elsif step = 'close' then
      perform public.close_unused_account(account.user_id);
      closed := closed + 1;
    end if;
  end loop;
  return jsonb_build_object('nudges', nudges, 'notices', notices, 'closed', closed);
end;
$$;

comment on function public.close_unused_accounts() is
  'Nightly: emails yearly then quarterly nudges and a notice at unused_account_years to accounts nobody uses, and closes them 30 days after the notice (INACTIVE-2).';

/* ---------- 4. The nudge and the closing email are always emailed ---------- */

/**
 * email_delivery_for: as in INACTIVE-1, and the nudge and the closing email are always sent too:
 * an email is the only way to reach someone who doesn't open the app (INACTIVE-2).
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
                  'account_unused_month', 'account_unused_week',
                  'account_unused_nudge', 'account_unused_closed') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;

comment on function public.email_delivery_for(uuid, public.notification_kind) is
  'Internal: one person''s email delivery for one notification kind (S1-E7-02).';

/**
 * notification_category: as before, and the nudge and the closing email are filed with the other
 * notices from the team ('staff') (INACTIVE-2).
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
    when 'account_unused_nudge' then 'staff'
    when 'account_unused_closed' then 'staff'
    else 'replies'
  end;
$$;

comment on function public.notification_category(public.notification_kind) is
  'Internal: the filter chip a notification kind sits under (S1-E7-01).';

/* ---------- 5. The closing email reaches a closed account ---------- */

/**
 * email_worker_claim: as in IDEAS-2 idea 6, with one more recipient: a closed account still gets
 * the email that tells it the account closed (INACTIVE-2). Every other email to a closed account
 * is still dropped.
 * Input: the worker's key and how many to claim. Returns the claimed emails.
 * Errors: insufficient_privilege without the key.
 */
create or replace function public.email_worker_claim(worker_key text, batch_size integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued public.email_outbox;
  recipient record;
  items jsonb;
  claimed jsonb := '[]'::jsonb;
  saved_claims text := current_setting('request.jwt.claims', true);
begin
  -- Step 1: only our worker may ask.
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the oldest due emails nobody else is sending; a held one waits for its time.
  for queued in
    select * from public.email_outbox
    where email_outbox.sent_at is null and email_outbox.attempts < 5
      and (email_outbox.send_after is null or email_outbox.send_after <= now())
      and (email_outbox.claimed_at is null or email_outbox.claimed_at < now() - interval '15 minutes')
    order by coalesce(email_outbox.send_after, email_outbox.created_at)
    limit least(greatest(coalesce(batch_size, 50), 1), 100)
    for update skip locked
  loop
    -- A live account, or a closed one being told that it closed (INACTIVE-2).
    select users.email, profiles.locale into recipient
    from public.profiles join auth.users on users.id = profiles.id
    where profiles.id = queued.user_id
      and (profiles.deleted_at is null or public.is_account_closed_email(queued))
      and users.email_confirmed_at is not null;
    -- The recipient's own view: blocks, ratings and moderation as on their Notifications page.
    perform public.email_worker_act_as(queued.user_id);
    if queued.delivery = 'message' then
      items := public.message_email_items(queued);
    else
      items := public.email_worker_items(queued);
    end if;
    -- Step 3: nothing to tell, or nobody to tell it to: close it without sending.
    if recipient.email is null or jsonb_array_length(items) = 0 then
      update public.email_outbox set sent_at = now() where email_outbox.id = queued.id;
      continue;
    end if;
    update public.email_outbox set claimed_at = now(), attempts = queued.attempts + 1
    where email_outbox.id = queued.id;
    claimed := claimed || jsonb_build_object(
      'outbox_id', queued.id, 'to', recipient.email, 'language', coalesce(recipient.locale, 'ro'),
      'delivery', queued.delivery, 'items', items,
      'unsubscribe_key', case when queued.delivery = 'required' then null
                              else public.email_worker_unsubscribe_key(queued.user_id) end);
  end loop;
  perform public.email_worker_act_as(null, saved_claims);
  return claimed;
end;
$$;

comment on function public.email_worker_claim(text, integer) is
  'The email worker''s due emails, claimed for 15 minutes; needs the Vault key (S1-E7-02, IDEAS-2 idea 6, INACTIVE-2).';

/**
 * is_account_closed_email: whether a queued email is the one that tells an unused account it
 * closed (INACTIVE-2), the only email a closed account still gets.
 * Input: the queued email. Returns true or false. Internal: email_worker_claim().
 */
create function public.is_account_closed_email(queued public.email_outbox)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select queued.delivery = 'required' and exists (
    select 1 from public.notifications
    where notifications.id = any (queued.notification_ids)
      and notifications.user_id = queued.user_id
      and notifications.kind = 'account_unused_closed');
$$;

comment on function public.is_account_closed_email(public.email_outbox) is
  'Internal: whether a queued email tells an unused account that it closed (INACTIVE-2).';
revoke execute on function public.is_account_closed_email(public.email_outbox) from public, anon, authenticated;

/* ---------- 6. A closing account can still download its data ---------- */

/**
 * require_export_caller: the caller's user ID when they may make a copy of their data: a live
 * account, or one that is closing and not yet deleted for good (GDPR art. 15 and 20: the person
 * can still ask for their data while we hold it; Robert, 11 Nov 2026, 19:42 UTC).
 * Returns the user ID. Errors: insufficient_privilege (hint signed_out) for anyone else.
 * Internal: request_data_export(), my_data_export() and finish_data_export().
 */
create function public.require_export_caller()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is not null and exists (
    select 1 from public.profiles
    where profiles.id = caller_id
      and (profiles.deleted_at is null
           or exists (select 1 from public.account_deletions
                      where account_deletions.user_id = profiles.id
                        and account_deletions.cancelled_at is null
                        and account_deletions.completed_at is null))
  ) then
    return caller_id;
  end if;
  raise exception 'Sign in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
end;
$$;

comment on function public.require_export_caller() is
  'Internal: the caller''s user ID if their account is live or still closing, for Download my data (INACTIVE-2).';
revoke execute on function public.require_export_caller() from public, anon, authenticated;

/**
 * request_data_export: as in S1-E13-02, and a closing account may ask too (INACTIVE-2).
 * Returns: { export_id, file_name }.
 * Errors: insufficient_privilege (hint signed_out); the rate limit's error after three an hour.
 */
create or replace function public.request_data_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_export_caller();
  new_export public.exports;
begin
  -- Step 1: at most three an hour.
  perform public.take_rate_limit('data_export');
  -- Step 2: an unfinished one goes; it never had a file anyone could read.
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = 'all_my_data' and exports.state = 'building';
  -- Step 3: the new one, under a random file name.
  insert into public.exports (user_id, kind, file_name)
  values (caller_id, 'all_my_data', gen_random_uuid()::text || '.zip')
  returning * into new_export;
  return jsonb_build_object('export_id', new_export.id, 'file_name', new_export.file_name);
end;
$$;

/**
 * export_stories_as_before_closing: a closing account's stories as they were before it closed.
 * Closing hides the live stories by setting deleted_at to the closing time
 * (hide_closing_account()), and the Word and PDF files in the copy leave deleted stories out, so
 * without this a closing account's copy would hold no story files (INACTIVE-2).
 * Input: the copy's tables and the closing time. Returns the tables, with deleted_at empty again
 * on the stories hidden at that time; stories the person deleted earlier stay deleted.
 * Internal: my_data_export().
 */
create function public.export_stories_as_before_closing(tables jsonb, closed_at timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when tables -> 'stories' is null then tables
    else jsonb_set(tables, '{stories}', coalesce((
      select jsonb_agg(
        case when (story ->> 'deleted_at')::timestamptz = closed_at
             then jsonb_set(story, '{deleted_at}', 'null'::jsonb)
             else story end
        order by position)
      from jsonb_array_elements(tables -> 'stories') with ordinality as stories (story, position)
    ), '[]'::jsonb))
  end;
$$;

comment on function public.export_stories_as_before_closing(jsonb, timestamptz) is
  'Internal: shows a closing account''s stories in its copy as they were before the account closed (INACTIVE-2).';
revoke execute on function public.export_stories_as_before_closing(jsonb, timestamptz) from public, anon, authenticated;

/**
 * my_data_export: as in IDEAS-1 part f, and a closing account may read its data too, with its
 * stories as they were before it closed (INACTIVE-2).
 * Returns the data file: format, made_at, user_id, account, library and tables.
 * Errors: insufficient_privilege (hint signed_out).
 */
create or replace function public.my_data_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_export_caller();
  tables jsonb := public.export_tables_of(caller_id);
  closed_at timestamptz;
begin
  -- Step 1: when the account is closing, the stories hidden by the closing count as live.
  select account_deletions.requested_at into closed_at from public.account_deletions
  where account_deletions.user_id = caller_id
    and account_deletions.cancelled_at is null and account_deletions.completed_at is null;
  if closed_at is not null then
    tables := public.export_stories_as_before_closing(tables, closed_at);
  end if;
  -- Step 2: the data file.
  return jsonb_build_object(
    'format', 'data-export/1',
    'made_at', now(),
    'user_id', caller_id,
    'account', public.export_account_of(caller_id),
    'library', public.export_library_of(caller_id),
    'tables', tables);
end;
$$;

/**
 * finish_data_export: as in ADMIN-2 part c2, and a closing account may finish its copy too
 * (INACTIVE-2).
 * Input: the export and how many stories it holds. Returns: { expires_at }.
 * Errors: insufficient_privilege (hint signed_out); check_violation with hint not_found when the
 *   export isn't the caller's open one, or no_file when the ZIP hasn't arrived.
 */
create or replace function public.finish_data_export(export_id uuid, story_count integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_export_caller();
  open_export public.exports;
  stored_size bigint;
begin
  -- Step 1: the caller's own export, still being built, and not a staff copy.
  select * into open_export from public.exports
  where exports.id = finish_data_export.export_id and exports.user_id = caller_id
    and exports.state = 'building' and exports.kind <> 'data_request';
  if open_export.id is null then
    raise exception 'That export isn''t open.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  -- Step 2: the file is really there; its size comes from storage, not from the browser.
  select (objects.metadata ->> 'size')::bigint into stored_size from storage.objects
  where objects.bucket_id = 'exports' and objects.name = open_export.file_name;
  if stored_size is null then
    raise exception 'The file hasn''t arrived.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 3: older copies of the same kind go; their files go with the nightly sweep (S1-E13-04)
  -- if the browser couldn't delete them.
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = open_export.kind and exports.id <> open_export.id;
  -- Step 4: ready for seven days, and the in-app notice for its kind.
  update public.exports
  set state = 'ready', file_size = stored_size, ready_at = now(), expires_at = now() + interval '7 days',
      story_count = greatest(coalesce(finish_data_export.story_count, 0), 0)
  where exports.id = open_export.id
  returning * into open_export;
  if open_export.kind = 'my_stories' then
    perform public.notify(caller_id, 'stories_export_ready', null, '{}'::jsonb);
  else
    perform public.notify(caller_id, 'data_export_ready', null, '{}'::jsonb);
  end if;
  return jsonb_build_object('expires_at', open_export.expires_at);
end;
$$;

/* ---------- 7. Why the account is closing ---------- */

/**
 * my_account_deletion: as in S1-E13-03, and a closing account's answer says why it is closing:
 * 'requested' (the person chose "Delete my account") or 'unused' (nobody used it for 5 years).
 * The app keeps an 'unused' account as soon as the person goes on to use the site, and leaves a
 * 'requested' one closing until they choose "Keep account" (Robert, 11 Nov 2026, 19:43 UTC).
 * Returns: { state: 'closing', requested_at, delete_after, reason } or
 *   { state: 'open', signed_in_recently, deletion_days }.
 * Errors: insufficient_privilege (hint signed_out) when signed out.
 */
create or replace function public.my_account_deletion()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request public.account_deletions;
begin
  if caller_id is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  -- Step 1: an open request means the account is closing.
  select * into request from public.account_deletions
  where account_deletions.user_id = caller_id
    and account_deletions.cancelled_at is null and account_deletions.completed_at is null;
  if found then
    return jsonb_build_object('state', 'closing', 'requested_at', request.requested_at,
      'delete_after', request.delete_after, 'reason', request.reason);
  end if;
  -- Step 2: otherwise the account is open; say whether the log-in is fresh enough to confirm.
  return jsonb_build_object('state', 'open',
    'signed_in_recently', public.account_signed_in_recently(),
    'deletion_days', coalesce((public.setting_value('account_deletion_days'))::integer, 14));
end;
$$;

comment on function public.my_account_deletion() is
  'The caller''s account deletion state: closing with its date and reason, or open with whether they may confirm now (S1-E13-03, INACTIVE-2).';
