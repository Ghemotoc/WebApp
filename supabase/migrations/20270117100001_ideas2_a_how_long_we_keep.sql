/*
 * Migration: "How long we keep things" in Settings › Privacy (bundle IDEAS-2, part a; idea
 * IDEA-20261101-5; GDPR art. 13(2)(a): the period for which personal data will be stored).
 *
 * Why: the clean-up jobs (S1-E13-04) read their periods from settings, but members only saw them
 * in the legal text. retention_periods() hands the signed-in member the periods behind their own
 * data, read from the same settings the jobs use, so a staff change shows at once and the screen
 * can never disagree with the jobs. Only the listed settings are read: most settings stay private
 * to staff (settings_select_admin), so the function picks them out itself rather than opening
 * the table.
 * Who calls it: Settings › Privacy (src/features/privacy, HowLongWeKeep). What it calls: the
 * settings table.
 */

/**
 * retention_periods: the retention period of each kind of a member's own data, from settings.
 * Inputs: none; the caller must be signed in.
 * Returns: one row per kind, in the screen's order: kind (the screen's key), amount (a whole
 *   number) and unit ('days' or 'years'). A setting that is missing or not a number is left out,
 *   so the screen never shows a made-up period.
 * Errors: none; anon can't call it (no grant).
 * Fits in the flow: read once by the Privacy settings screen's "How long we keep things".
 */
create or replace function public.retention_periods()
returns table (kind text, amount integer, unit text)
language sql
stable
security definer
set search_path = ''
as $$
  -- Step 1: the kinds the screen lists, the setting behind each and its unit, in order.
  with listed (position, kind, setting_key, unit) as (
    values
      (1, 'notifications', 'notifications_keep_days', 'days'),
      (2, 'deleted_content', 'content_purge_days', 'days'),
      (3, 'reported_messages', 'reported_messages_keep_days', 'days'),
      (4, 'moderator_mail', 'moderator_mail_keep_days', 'days'),
      (5, 'support_tickets', 'support_ticket_keep_years', 'years'),
      (6, 'reading_minutes', 'reading_minutes_keep_days', 'days'),
      (7, 'scrambled_ip', 'scrambled_ip_keep_days', 'days'),
      (8, 'invites', 'invites_keep_days', 'days'),
      (9, 'account_deletion', 'account_deletion_days', 'days')
  )
  -- Step 2: each one's current value; only whole numbers count.
  select listed.kind, (settings.value #>> '{}')::integer, listed.unit
  from listed
  join public.settings on settings.key = listed.setting_key
  where auth.uid() is not null
    and jsonb_typeof(settings.value) = 'number'
    and (settings.value #>> '{}') ~ '^[0-9]+$'
  order by listed.position;
$$;

revoke all on function public.retention_periods() from public, anon;
grant execute on function public.retention_periods() to authenticated;
