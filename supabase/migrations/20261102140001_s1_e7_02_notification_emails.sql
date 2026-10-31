-- Migration: email notifications and daily digests (story S1-E7-02; board Settings 6.3,
-- "Notifications").
--
-- What it adds:
-- - email_delivery ('instant', 'daily', 'off') and notification_email_settings: each person's
--   choice per notification kind (criterion 1). Moderation decisions are "account, safety and
--   legal" emails: always sent at once and not in the table (criterion 1, DSA art. 17);
-- - email_unsubscribe_keys: one random key per person for the one-click unsubscribe link and
--   header (criterion 2; RFC 8058). unsubscribe_from_emails(key) turns every optional email off;
-- - email_outbox: the emails waiting to leave. A trigger on notifications queues an instant email;
--   queue_daily_digests() (pg_cron, 06:00 UTC, 08:00 or 09:00 in Romania) queues one digest per
--   person of the day's unread notifications set to "Daily digest";
-- - the worker: email_worker_claim() and email_worker_mark_sent(), called by /api/notification-
--   emails on Cloudflare with the Vault secret email_worker_key (the same value as
--   EMAIL_WORKER_KEY there); run_email_worker() (pg_cron, every 5 minutes) wakes it through
--   pg_net when the Vault holds email_worker_url and email_worker_key, and does nothing until then;
-- - profiles.marketing_email_opt_in and marketing_email_allowed(): no marketing email exists yet,
--   and this is the gate the first one must use: never to anyone under 18 (decided 16 Oct 2026,
--   Q50; criterion 3) and only with the adult's own opt-in (Romanian Law 506/2004, art. 12).
-- Who calls it: src/features/notifications/ (the settings), server/notification-emails.ts (the
-- worker) and server/unsubscribe.ts (the one-click link).
-- Never logged: addresses, keys or the words of an email (CLAUDE.md rule 12).

create extension if not exists pg_net with schema extensions;

/* ---------- The choices ---------- */

create type public.email_delivery as enum ('instant', 'daily', 'off');
comment on type public.email_delivery is
  'How a kind of notification is emailed: at once, in the daily digest, or not at all (S1-E7-02).';

create table public.notification_email_settings (
  id uuid primary key default gen_random_uuid(),
  -- The person whose choice it is (CLAUDE.md rule 15). The choices go with the account.
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  delivery public.email_delivery not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_email_settings_one_per_kind unique (user_id, kind),
  -- Account, safety and legal emails can't be switched off (criterion 1).
  constraint notification_email_settings_not_required check (kind <> 'moderation_decision')
);
comment on table public.notification_email_settings is
  'kind: user_action
Each person''s email choice per notification kind; a missing row means the default (S1-E7-02).';
create trigger notification_email_settings_set_updated_at
  before update on public.notification_email_settings
  for each row execute function public.set_updated_at();
alter table public.notification_email_settings enable row level security;

-- Who: the person. Why: their own choices on Settings > Notifications; nobody else's. Writes go
-- only through set_notification_email().
create policy notification_email_settings_select_own on public.notification_email_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.notification_email_settings to authenticated;

create table public.email_unsubscribe_keys (
  id uuid primary key default gen_random_uuid(),
  -- Whose emails the key stops (CLAUDE.md rule 15). The key goes with the account.
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  -- 48 random hexadecimal characters: the link can't be guessed.
  unsubscribe_key text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.email_unsubscribe_keys is
  'kind: user_action
The key in each person''s one-click unsubscribe link (S1-E7-02; RFC 8058).';
create trigger email_unsubscribe_keys_set_updated_at
  before update on public.email_unsubscribe_keys
  for each row execute function public.set_updated_at();
alter table public.email_unsubscribe_keys enable row level security;

-- Who: the person. Why: it is their own link; nobody else may read it. Written only by
-- email_worker_claim(), the first time an email goes to them.
create policy email_unsubscribe_keys_select_own on public.email_unsubscribe_keys
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.email_unsubscribe_keys to authenticated;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  -- Who the email goes to (CLAUDE.md rule 15). Nothing is sent to a deleted account, so its
  -- rows go with it.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'instant' and 'daily' carry an unsubscribe link; 'required' (a moderation decision) doesn't.
  delivery text not null,
  notification_ids uuid[] not null,
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_outbox_delivery_is_known check (delivery in ('instant', 'daily', 'required'))
);
comment on table public.email_outbox is
  'kind: user_action
Notification emails waiting to leave and those that left (S1-E7-02). Never holds an address or words.';
create index email_outbox_due on public.email_outbox (created_at) where sent_at is null;
create index email_outbox_user_id on public.email_outbox (user_id);
create trigger email_outbox_set_updated_at
  before update on public.email_outbox
  for each row execute function public.set_updated_at();
alter table public.email_outbox enable row level security;

-- Who: the person. Why: which of their notifications were emailed is their own business; the
-- worker reads the queue through email_worker_claim(), never through the table.
create policy email_outbox_select_own on public.email_outbox
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.email_outbox to authenticated;

alter table public.profiles
  add column marketing_email_opt_in boolean not null default false;
comment on column public.profiles.marketing_email_opt_in is
  'The adult''s own opt-in to marketing email; refused under 18 (S1-E7-02; Law 506/2004; Q50).';

/* ---------- Defaults and the person's choices ---------- */

/**
 * default_email_delivery: what a kind of notification does by email until the person chooses.
 * Input: kind. Returns: 'instant' for replies to one's comments (a conversation), 'daily' for new
 *   chapters, comments on one's chapters and new followers (a calm inbox, story goal), 'off' for
 *   reactions (too many to email); null for a moderation decision, which is always sent.
 * Internal: email_delivery_for() and my_notification_email_settings().
 */
create or replace function public.default_email_delivery(kind public.notification_kind)
returns public.email_delivery
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'comment_reply' then 'instant'
    when 'new_chapter' then 'daily'
    when 'comment_on_chapter' then 'daily'
    when 'new_follower' then 'daily'
    when 'comment_reactions' then 'off'
  end::public.email_delivery;
$$;
comment on function public.default_email_delivery(public.notification_kind) is
  'Internal: the email default per notification kind (S1-E7-02).';
revoke execute on function public.default_email_delivery(public.notification_kind) from public, anon, authenticated;

/**
 * email_delivery_for: how one person gets one kind of notification by email.
 * Inputs: target_user_id, kind. Returns: 'required' for a moderation decision (always sent),
 *   otherwise the person's choice or the default, as text.
 * Internal: the notifications trigger, queue_daily_digests() and email_worker_claim().
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind = 'moderation_decision' then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;
comment on function public.email_delivery_for(uuid, public.notification_kind) is
  'Internal: one person''s email delivery for one notification kind (S1-E7-02).';
revoke execute on function public.email_delivery_for(uuid, public.notification_kind) from public, anon, authenticated;

/**
 * my_notification_email_settings: the signed-in person's email choices, for Settings.
 * Returns: JSON array, in the screen's order, of {kind, delivery} for the kinds a person can
 *   choose: replies to my comments, new chapters, comments on my chapters, new followers.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: src/features/notifications/hooks/useEmailSettings.ts.
 */
create or replace function public.my_notification_email_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to choose your emails.' using errcode = 'insufficient_privilege';
  end if;
  return (
    select jsonb_agg(jsonb_build_object('kind', listed.kind,
      'delivery', public.email_delivery_for(caller_id, listed.kind)) order by listed.position)
    from unnest(array['comment_reply', 'new_chapter', 'comment_on_chapter', 'new_follower']::public.notification_kind[])
      with ordinality as listed (kind, position));
end;
$$;
comment on function public.my_notification_email_settings() is
  'The caller''s email choice for each kind they can choose (S1-E7-02).';
revoke execute on function public.my_notification_email_settings() from public, anon;
grant execute on function public.my_notification_email_settings() to authenticated;

/**
 * set_notification_email: saves how the signed-in person gets one kind by email.
 * Inputs: kind, delivery. Returns: nothing.
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for a kind that can't
 *   be chosen (a moderation decision is always sent; reactions are never emailed).
 * Where it fits: Settings > Notifications, each drop-down.
 */
create or replace function public.set_notification_email(kind public.notification_kind, delivery public.email_delivery)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to choose your emails.' using errcode = 'insufficient_privilege';
  end if;
  if kind is null or delivery is null
     or kind not in ('comment_reply', 'new_chapter', 'comment_on_chapter', 'new_follower') then
    raise exception 'This kind of email can''t be changed.' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.notification_email_settings (user_id, kind, delivery)
  values (caller_id, set_notification_email.kind, set_notification_email.delivery)
  on conflict on constraint notification_email_settings_one_per_kind
  do update set delivery = excluded.delivery;
end;
$$;
comment on function public.set_notification_email(public.notification_kind, public.email_delivery) is
  'Saves the caller''s email choice for one notification kind (S1-E7-02).';
revoke execute on function public.set_notification_email(public.notification_kind, public.email_delivery) from public, anon;
grant execute on function public.set_notification_email(public.notification_kind, public.email_delivery) to authenticated;

/**
 * unsubscribe_from_emails: the one-click unsubscribe (criterion 2; RFC 8058). Turns every
 *   optional notification email off for the key's owner; account, safety and legal emails stay.
 * Input: the key from the link. Returns: true when the key was found.
 * Who may call it: anyone, signed out included (the link works from any inbox); the key is 48
 *   random characters, so it can't be guessed.
 * Where it fits: /unsubscribe (the page's button) and POST /api/unsubscribe (the email header).
 */
create or replace function public.unsubscribe_from_emails(unsubscribe_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select keys.user_id into owner_id from public.email_unsubscribe_keys as keys
  where keys.unsubscribe_key = lower(btrim(coalesce(unsubscribe_from_emails.unsubscribe_key, '')));
  if owner_id is null then
    return false;
  end if;
  insert into public.notification_email_settings (user_id, kind, delivery)
  select owner_id, listed.kind, 'off'
  from unnest(array['comment_reply', 'new_chapter', 'comment_on_chapter', 'new_follower']::public.notification_kind[])
    as listed (kind)
  on conflict on constraint notification_email_settings_one_per_kind do update set delivery = 'off';
  -- Emails already waiting stop too, except the required ones.
  update public.email_outbox set sent_at = now()
  where email_outbox.user_id = owner_id and email_outbox.sent_at is null and email_outbox.delivery <> 'required';
  return true;
end;
$$;
comment on function public.unsubscribe_from_emails(text) is
  'One-click unsubscribe: every optional notification email off for the key''s owner (S1-E7-02).';
grant execute on function public.unsubscribe_from_emails(text) to anon, authenticated;

/* ---------- Marketing: the gate (criterion 3) ---------- */

/**
 * marketing_email_allowed: whether a marketing or promotional email may go to a person.
 * Input: target_user_id. Returns: true only for an adult (18_plus, from the year of birth and the
 *   age check) who opted in themselves; never for anyone under 18 or of unknown age (Q50).
 * Internal: no marketing email exists yet; the first sender must ask this before every email.
 */
create or replace function public.marketing_email_allowed(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select profiles.marketing_email_opt_in
      and public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
        profiles.age_check_result, (now() at time zone 'Europe/Bucharest')::date) = '18_plus'
    from public.profiles
    where profiles.id = target_user_id and profiles.deleted_at is null), false);
$$;
comment on function public.marketing_email_allowed(uuid) is
  'Internal: marketing email only to an adult who opted in; never under 18 (S1-E7-02; Q50).';
revoke execute on function public.marketing_email_allowed(uuid) from public, anon, authenticated;

/**
 * set_marketing_email_opt_in: the signed-in adult's own choice about marketing email.
 * Input: wanted. Errors: insufficient_privilege when signed out; check_violation when someone
 *   under 18 (or of unknown age) tries to opt in (Q50).
 * Where it fits: a Settings switch once marketing email exists; the rule is in place first.
 */
create or replace function public.set_marketing_email_opt_in(wanted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Log in to choose your emails.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(wanted, false) and public.age_band() <> '18_plus' then
    raise exception 'Marketing emails are only for people 18 or over.' using errcode = 'check_violation';
  end if;
  update public.profiles set marketing_email_opt_in = coalesce(wanted, false)
  where profiles.id = (select auth.uid());
end;
$$;
comment on function public.set_marketing_email_opt_in(boolean) is
  'The caller''s marketing email opt-in; refused under 18 (S1-E7-02; Q50).';
revoke execute on function public.set_marketing_email_opt_in(boolean) from public, anon;
grant execute on function public.set_marketing_email_opt_in(boolean) to authenticated;

/* ---------- Filling the outbox ---------- */

/**
 * queue_instant_email: after a new notification, queues its email when the person wants it at
 *   once, or when it is a moderation decision (always sent). Grouped updates add no email.
 * Trigger: after insert on notifications.
 */
create or replace function public.queue_instant_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery text := public.email_delivery_for(new.user_id, new.kind);
begin
  if delivery in ('instant', 'required') then
    insert into public.email_outbox (user_id, delivery, notification_ids)
    values (new.user_id, delivery, array[new.id]);
  end if;
  return new;
end;
$$;
comment on function public.queue_instant_email() is
  'Internal trigger: queues an instant or required email for a new notification (S1-E7-02).';
revoke execute on function public.queue_instant_email() from public, anon, authenticated;
create trigger notifications_queue_instant_email
  after insert on public.notifications
  for each row execute function public.queue_instant_email();

/**
 * queue_daily_digests: one digest per person of the last day's unread notifications whose kind
 *   they set to "Daily digest" and that no email carried yet.
 * Returns: how many digests were queued. Internal: pg_cron, every day at 06:00 UTC.
 */
create or replace function public.queue_daily_digests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued integer;
begin
  insert into public.email_outbox (user_id, delivery, notification_ids)
  select notifications.user_id, 'daily', array_agg(notifications.id order by notifications.updated_at desc)
  from public.notifications
  where notifications.read_at is null
    and notifications.updated_at > now() - interval '1 day'
    and public.email_delivery_for(notifications.user_id, notifications.kind) = 'daily'
    and not exists (select 1 from public.email_outbox
                    where notifications.id = any (email_outbox.notification_ids))
  group by notifications.user_id;
  get diagnostics queued = row_count;
  return queued;
end;
$$;
comment on function public.queue_daily_digests() is
  'Internal: queues one daily digest per person (S1-E7-02); pg_cron at 06:00 UTC.';
revoke execute on function public.queue_daily_digests() from public, anon, authenticated;

select cron.schedule('queue-daily-email-digests', '0 6 * * *', 'select public.queue_daily_digests()');

/* ---------- The worker ---------- */

/**
 * email_worker_key_matches: true when the key is the Vault secret email_worker_key (the same
 *   value as EMAIL_WORKER_KEY on Cloudflare); always false while the secret isn't set.
 * Internal: email_worker_claim() and email_worker_mark_sent().
 */
create or replace function public.email_worker_key_matches(worker_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'email_worker_key';
  return secret is not null and secret <> '' and worker_key is not null and worker_key = secret;
end;
$$;
comment on function public.email_worker_key_matches(text) is
  'Internal: checks the email worker''s key against the Vault secret email_worker_key (S1-E7-02).';
revoke execute on function public.email_worker_key_matches(text) from public, anon, authenticated;

/**
 * email_worker_items: what one queued email tells, as notification_json() draws it (handles and
 *   titles, never a user ID), leaving out notifications that are gone, that the person wouldn't
 *   see on the Notifications page now (a block, a rating, a removed chapter:
 *   notification_is_shown()) and, for an optional email, kinds the person has since switched off.
 * Input: the outbox row. Returns: a JSON array.
 * Internal: email_worker_claim(), after email_worker_act_as() made the recipient the caller, so the
 *   same checks as the page apply.
 */
create or replace function public.email_worker_items(queued public.email_outbox)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.notification_json(notifications) order by notifications.updated_at desc), '[]'::jsonb)
  from public.notifications
  where notifications.id = any (queued.notification_ids)
    and public.notification_is_shown(notifications)
    and (queued.delivery = 'required'
         or public.email_delivery_for(notifications.user_id, notifications.kind) = queued.delivery);
$$;
comment on function public.email_worker_items(public.email_outbox) is
  'Internal: the notifications one queued email tells about (S1-E7-02).';
revoke execute on function public.email_worker_items(public.email_outbox) from public, anon, authenticated;

/**
 * email_worker_act_as: makes one person the caller for the rest of the transaction, so
 *   notification_is_shown() and notification_json() check blocks, ratings and moderation for the
 *   recipient exactly as the Notifications page does. Passing null puts the claims back.
 * Inputs: target_user_id, or null with the saved claims. Internal: email_worker_claim() only.
 */
create or replace function public.email_worker_act_as(target_user_id uuid, saved_claims text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    perform set_config('request.jwt.claims', coalesce(saved_claims, ''), true);
    perform set_config('request.jwt.claim.sub', '', true);
  else
    perform set_config('request.jwt.claims', jsonb_build_object('sub', target_user_id)::text, true);
    perform set_config('request.jwt.claim.sub', target_user_id::text, true);
  end if;
end;
$$;
comment on function public.email_worker_act_as(uuid, text) is
  'Internal: the email worker reads one recipient''s notifications as that recipient (S1-E7-02).';
revoke execute on function public.email_worker_act_as(uuid, text) from public, anon, authenticated;

/**
 * email_worker_unsubscribe_key: a person's unsubscribe key, made the first time it is needed.
 * Input: target_user_id. Returns: the key. Internal: email_worker_claim().
 */
create or replace function public.email_worker_unsubscribe_key(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_key text;
begin
  insert into public.email_unsubscribe_keys (user_id) values (target_user_id)
  on conflict (user_id) do nothing;
  select keys.unsubscribe_key into found_key from public.email_unsubscribe_keys as keys
  where keys.user_id = target_user_id;
  return found_key;
end;
$$;
comment on function public.email_worker_unsubscribe_key(uuid) is
  'Internal: a person''s one-click unsubscribe key, made on first use (S1-E7-02).';
revoke execute on function public.email_worker_unsubscribe_key(uuid) from public, anon, authenticated;

/**
 * email_worker_claim: hands the worker the emails that are due, at most batch_size, and marks
 *   them claimed for 15 minutes so two runs never send the same one. Each is tried at most 5
 *   times. An email with nothing left to tell, or to a person without a confirmed address or a
 *   deleted account, is closed without sending.
 * Inputs: worker_key (EMAIL_WORKER_KEY); batch_size (1 to 100, 50 by default).
 * Returns: JSON array of {outbox_id, to, language, delivery, unsubscribe_key (null for a required
 *   email), items}. This is the one place an address leaves the database for an email.
 * Errors: insufficient_privilege for a wrong or missing key.
 * Where it fits: server/notification-emails.ts, step 1.
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
  -- Step 2: the oldest due emails nobody else is sending.
  for queued in
    select * from public.email_outbox
    where email_outbox.sent_at is null and email_outbox.attempts < 5
      and (email_outbox.claimed_at is null or email_outbox.claimed_at < now() - interval '15 minutes')
    order by email_outbox.created_at
    limit least(greatest(coalesce(batch_size, 50), 1), 100)
    for update skip locked
  loop
    select users.email, profiles.locale into recipient
    from public.profiles join auth.users on users.id = profiles.id
    where profiles.id = queued.user_id and profiles.deleted_at is null
      and users.email_confirmed_at is not null;
    -- The recipient's own view: blocks, ratings and moderation as on their Notifications page.
    perform public.email_worker_act_as(queued.user_id);
    items := public.email_worker_items(queued);
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
  'The email worker''s due emails, claimed for 15 minutes; needs the Vault key (S1-E7-02).';
revoke execute on function public.email_worker_claim(text, integer) from public;
grant execute on function public.email_worker_claim(text, integer) to anon, authenticated;

/**
 * email_worker_mark_sent: records the emails that left, so they never go again; one that failed
 *   isn't listed and is tried again after its claim runs out.
 * Inputs: worker_key; outbox_ids. Returns: how many were marked.
 * Errors: insufficient_privilege for a wrong or missing key.
 * Where it fits: server/notification-emails.ts, step 3.
 */
create or replace function public.email_worker_mark_sent(worker_key text, outbox_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked integer;
begin
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.email_outbox set sent_at = now()
  where email_outbox.id = any (coalesce(outbox_ids, '{}')) and email_outbox.sent_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;
comment on function public.email_worker_mark_sent(text, uuid[]) is
  'Marks the email worker''s sent emails; needs the Vault key (S1-E7-02).';
revoke execute on function public.email_worker_mark_sent(text, uuid[]) from public;
grant execute on function public.email_worker_mark_sent(text, uuid[]) to anon, authenticated;

/**
 * run_email_worker: wakes /api/notification-emails when emails are due. Cloudflare Pages has no
 *   scheduler, so the database calls it through pg_net with the worker key. Does nothing while
 *   the Vault lacks email_worker_url or email_worker_key (local development, and staging until
 *   it is set up: GO-LIVE list).
 * Returns: true when it called the worker. Internal: pg_cron, every 5 minutes.
 */
create or replace function public.run_email_worker()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  worker_key text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'email_worker_url';
  select decrypted_secret into worker_key from vault.decrypted_secrets where name = 'email_worker_key';
  if coalesce(worker_url, '') = '' or coalesce(worker_key, '') = ''
     or not exists (select 1 from public.email_outbox where email_outbox.sent_at is null) then
    return false;
  end if;
  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;
comment on function public.run_email_worker() is
  'Internal: calls the email worker through pg_net when emails are due (S1-E7-02); pg_cron every 5 minutes.';
revoke execute on function public.run_email_worker() from public, anon, authenticated;

select cron.schedule('run-email-worker', '*/5 * * * *', 'select public.run_email_worker()');

/**
 * purge_sent_emails: deletes outbox rows 30 days after they left (docs/retention.md).
 * Internal: pg_cron, every day at 03:52.
 */
create or replace function public.purge_sent_emails()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  delete from public.email_outbox where email_outbox.sent_at < now() - interval '30 days';
  get diagnostics purged = row_count;
  return purged;
end;
$$;
comment on function public.purge_sent_emails() is
  'Internal: deletes sent outbox rows after 30 days (S1-E7-02; docs/retention.md).';
revoke execute on function public.purge_sent_emails() from public, anon, authenticated;

select cron.schedule('purge-sent-emails', '52 3 * * *', 'select public.purge_sent_emails()');
