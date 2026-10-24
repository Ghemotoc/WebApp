-- The public report form and the removal-order contact point (story S1-E10-02; architecture B26;
-- decided 16 Oct 2026, 22:59: one web form for every report and the TCO contact point).
--
-- What it adds:
--   public_notices              one row per notice or authority order sent through /report by
--                               anyone, with or without an account
--   on_call_alerts              the on-call alert for an authority order, logged: the stub of
--                               architecture B26 until S1-E10-09 adds the phone alert
--   public_notice_payload_is_signed()   the check that a notice came through our server
--   item_for_public_address()   which story, chapter or profile an address on our site points to
--   attach_notice_to_case()     opens or joins the item's case, as attach_report_to_case() does
--   submit_public_notice()      the one way a notice is saved; only the Pages Function can call it
--   admin_case_notices()        a case's notices, for the case page
--   admin_unmatched_notices()   notices whose address points to nothing we host, orders first
--   admin_on_call_alerts()      the logged alerts, newest first
--   a trigger on cases          marks a case's notices decided when the case is decided, so the
--                               decision email can go out (sent by S1-E10-04)
-- Legal: DSA art. 11, 12 and 16(2) to (5) (paragraph numbers to verify); Regulation (EU)
-- 2021/784 art. 3(3) (one hour), 15(1) (contact point) and 15(2) (English and Romanian).
-- Privacy: a notifier's name and email are kept 3 years after the notice is closed, then deleted
-- (canvas comment, 17 Oct 2026; the purge job is S1-E13-04). Only moderation staff read them, and
-- a notice about a child only with the safeguarding permission. Nothing here is logged (rule 12).
-- No user_id column: the sender may have no account (rule 15 covers members' content and
-- actions; a member's own report goes through the Report button and public.reports).

/* ---------- The table ---------- */

create sequence public.notice_reference_seq;
create sequence public.removal_order_reference_seq;

create table public.public_notices (
  id uuid primary key default gen_random_uuid(),
  -- A notice about content, or an authority's removal order (Regulation (EU) 2021/784).
  kind text not null,
  -- Why the content is reported; null for an order, which carries its own legal ground.
  reason public.report_reason,
  -- The exact address the notifier gave (DSA art. 16(2)(b)).
  content_url text not null,
  -- What the address points to on our site; null when it points to nothing we host.
  item_type public.reportable_type,
  item_id uuid,
  -- The account whose item it is (rule 15: staff may see it; never shown publicly).
  owner_user_id uuid references public.profiles (id),
  -- Why the content is illegal, in the notifier's words (DSA art. 16(2)(a)).
  explanation text not null,
  notifier_name text,
  notifier_email text,
  good_faith_confirmed boolean not null default false,
  -- An order's issuing authority and its own reference.
  authority_name text,
  order_reference text,
  -- The language of the acknowledgement and the decision email.
  language text not null default 'ro',
  -- The reference the notifier quotes: N-000123 for a notice, TCO-0001 for an order.
  reference text not null unique,
  case_id uuid references public.cases (id),
  received_at timestamptz not null default now(),
  -- Set when the case is decided; S1-E10-04 sends the decision email from it.
  decided_at timestamptz,
  decision_emailed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_notices_kind_is_known check (kind in ('notice', 'removal_order')),
  constraint public_notices_language_is_known check (language in ('ro', 'en')),
  constraint public_notices_notice_has_reason check ((kind = 'notice') = (reason is not null)),
  constraint public_notices_url_length check (char_length(content_url) between 1 and 2000),
  constraint public_notices_explanation_length check (char_length(explanation) between 1 and 2000),
  constraint public_notices_name_length check (notifier_name is null or char_length(notifier_name) <= 120),
  constraint public_notices_email_shape check (
    notifier_email is null or (char_length(notifier_email) <= 254 and notifier_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  -- DSA art. 16(2)(c): name and email are required, except for child sexual abuse reports.
  constraint public_notices_notifier_given check (
    kind = 'removal_order' or reason = 'child_sexual_content'
    or (notifier_name is not null and notifier_email is not null)),
  -- DSA art. 16(2)(d): the good-faith statement, for every notice.
  constraint public_notices_good_faith check (kind = 'removal_order' or good_faith_confirmed),
  -- An order names its authority and an email to send the acknowledgement to.
  constraint public_notices_order_fields check (
    kind = 'notice' or (authority_name is not null and notifier_email is not null)),
  constraint public_notices_authority_length check (authority_name is null or char_length(authority_name) <= 200),
  constraint public_notices_order_reference_length check (order_reference is null or char_length(order_reference) <= 120),
  constraint public_notices_item_fields_go_together check (
    (item_type is null) = (item_id is null) and (item_id is null) = (owner_user_id is null))
);

comment on table public.public_notices is
  'kind: staff
Notices and authority removal orders sent through the public form /report, by anyone (S1-E10-02; DSA art. 16; Regulation (EU) 2021/784 art. 15). Kept 3 years after closing.';
comment on column public.public_notices.owner_user_id is 'The account whose item the address points to; never shown publicly (rule 15).';
comment on column public.public_notices.notifier_email is 'Personal data: only moderation staff read it; never logged (rule 12).';

create index public_notices_case_id_idx on public.public_notices (case_id);
create index public_notices_unmatched_idx on public.public_notices (received_at) where case_id is null and closed_at is null;

create trigger public_notices_set_updated_at
  before update on public.public_notices
  for each row execute function public.set_updated_at();

/* ---------- The logged on-call alert ---------- */

create table public.on_call_alerts (
  id uuid primary key default gen_random_uuid(),
  -- What the alert is about; today only an authority order.
  kind text not null,
  case_id uuid references public.cases (id),
  notice_id uuid references public.public_notices (id),
  -- When a person on call says they have it (S1-E10-09 adds the button).
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint on_call_alerts_kind_is_known check (kind in ('removal_order'))
);

comment on table public.on_call_alerts is
  'kind: staff
The on-call alert for an authority removal order, logged (S1-E10-02); the phone alert comes with S1-E10-09. No personal data.';

create index on_call_alerts_created_at_idx on public.on_call_alerts (created_at desc);

/* ---------- Row-level security ---------- */

alter table public.public_notices enable row level security;
alter table public.on_call_alerts enable row level security;

/**
 * public_notices_select_moderation: who reads a notice.
 * Allows moderation staff, and for a notice in a safeguarding case only staff with the
 * safeguarding permission too (decided 23 Oct 2026, Q6). A notice not matched to any case is a
 * plain moderation item. Nobody else, the notifier included, reads the table: the notifier gets
 * emails, and a member's own reports are in "My reports" (S1-E10-04).
 */
create policy public_notices_select_moderation
  on public.public_notices for select to authenticated
  using (
    public.may_see_case(coalesce(
      (select cases.is_safeguarding from public.cases where cases.id = public_notices.case_id),
      public_notices.reason in ('child_sexual_content', 'threat_to_minor')))
  );

/**
 * on_call_alerts_select_moderation: moderation staff see the alerts, so whoever is on the queue
 * knows an order arrived. Nothing personal is in a row.
 */
create policy on_call_alerts_select_moderation
  on public.on_call_alerts for select to authenticated
  using (public.staff_may('moderation', 'view'));

-- Reads only, through the policies; every write goes through the functions below.
grant select on public.public_notices to authenticated;
grant select on public.on_call_alerts to authenticated;

/* ---------- The signature ---------- */

/**
 * public_notice_payload_is_signed: true when the payload was signed by our server.
 * Inputs: the payload exactly as sent (text) and its signature (hex HMAC-SHA256).
 * Returns: true when the signature matches the Vault secret public_notice_secret (set by hand,
 *   the same value as NOTICE_SECRET in Cloudflare); false otherwise, and always false when the
 *   secret isn't set. Why: the form's bot check runs on the server (functions/api/notice.ts), so
 *   only a payload that went through it may be saved; a script calling the database directly
 *   can't sign. Internal.
 */
create or replace function public.public_notice_payload_is_signed(payload text, signature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'public_notice_secret';
  if secret is null or secret = '' or signature is null then
    return false;
  end if;
  return encode(extensions.hmac(payload, secret, 'sha256'), 'hex') = lower(signature);
end;
$$;

comment on function public.public_notice_payload_is_signed(text, text) is
  'Internal: checks a public notice''s signature against the Vault secret public_notice_secret (S1-E10-02).';
revoke execute on function public.public_notice_payload_is_signed(text, text) from public, anon, authenticated;

/* ---------- Which item an address points to ---------- */

/**
 * item_for_public_address: the story, chapter or profile an address on our site points to.
 * Input: what the notifier pasted: a full address on any of our hosts, or a path
 *   ("/s/<story>", "/s/<story>/<chapter>", "/u/<username>"); a query or a fragment is ignored.
 * Returns: one row (item_type, item_id, owner_user_id), or no row when it points to nothing we
 *   host, or to a story or chapter readers can't see (a draft's existence never leaks).
 * Internal: submit_public_notice() calls it.
 */
create or replace function public.item_for_public_address(address text)
returns table (item_type public.reportable_type, item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- Step 1: just the path: drop the scheme and host, then any query or fragment.
  path text := regexp_replace(regexp_replace(btrim(address), '^[a-z]+://[^/]+', '', 'i'), '[?#].*$', '');
  parts text[];
begin
  -- Step 2: a chapter, /s/<story>/<chapter>.
  parts := regexp_match(path, '^/s/([a-z0-9-]+)/([a-z0-9]{8})/?$');
  if parts is not null then
    return query
      select 'chapter'::public.reportable_type, chapters.id, chapters.user_id
      from public.chapters join public.stories on stories.id = chapters.story_id
      where stories.slug = parts[1] and chapters.code = parts[2]
        and chapters.status = 'published' and chapters.deleted_at is null and stories.deleted_at is null;
    return;
  end if;
  -- Step 3: a story, /s/<story>.
  parts := regexp_match(path, '^/s/([a-z0-9-]+)/?$');
  if parts is not null then
    return query
      select 'story'::public.reportable_type, stories.id, stories.user_id
      from public.stories
      where stories.slug = parts[1] and stories.first_published_at is not null and stories.deleted_at is null;
    return;
  end if;
  -- Step 4: a profile, /u/<username> (the "@" and the letter case don't matter).
  parts := regexp_match(path, '^/u/@?([^/]+)/?$');
  if parts is not null then
    return query
      select 'profile'::public.reportable_type, profiles.id, profiles.id
      from public.profiles
      where profiles.handle_skeleton = public.username_skeleton(parts[1]) and profiles.deleted_at is null;
  end if;
end;
$$;

comment on function public.item_for_public_address(text) is
  'Internal: the story, chapter or profile an address on our site points to, or nothing (S1-E10-02).';
revoke execute on function public.item_for_public_address(text) from public, anon, authenticated;

/* ---------- Opening or joining a case ---------- */

/**
 * attach_notice_to_case: puts a matched notice into its item's open case, or opens one.
 * Input: the notice row just saved (item matched). Returns: the case's ID.
 * Rules: a notice follows the reason's tier, like a member's report (S1-E10-03a); an authority
 *   order is always the one-hour tier from the time it was received (Regulation (EU) 2021/784,
 *   art. 3(3)), and an order joining an open case makes it an order case. One open case per item.
 * Internal: submit_public_notice() calls it in the same transaction.
 */
create or replace function public.attach_notice_to_case(new_notice public.public_notices)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_order boolean := new_notice.kind = 'removal_order';
  notice_tier public.case_tier;
  notice_is_safeguarding boolean := false;
  open_case public.cases;
begin
  -- Step 1: the tier: one hour for an order, the reason's tier for a notice.
  if is_order then
    notice_tier := 'one_hour';
  else
    select tier, is_safeguarding into notice_tier, notice_is_safeguarding
      from public.report_reason_tiers where reason = new_notice.reason;
  end if;
  select * into open_case from public.cases
    where item_type = new_notice.item_type and item_id = new_notice.item_id and status = 'open'
    for update;
  -- Step 2: a new case, referenced like the notice.
  if open_case.id is null then
    insert into public.cases (reference, user_id, item_type, item_id, source, tier, received_at,
                              deadline_at, top_reason, report_count, is_safeguarding)
    values (new_notice.reference, new_notice.owner_user_id, new_notice.item_type, new_notice.item_id,
            case when is_order then 'authority_order' else 'report' end::public.case_source,
            notice_tier, new_notice.received_at,
            new_notice.received_at + make_interval(hours => public.tier_hours(notice_tier)),
            new_notice.reason, case when is_order then 0 else 1 end, notice_is_safeguarding)
    returning * into open_case;
    return open_case.id;
  end if;
  -- Step 3: join the open case; the more urgent tier and the earliest deadline win.
  update public.cases set
    report_count = report_count + case when is_order then 0 else 1 end,
    is_safeguarding = is_safeguarding or notice_is_safeguarding,
    source = case when is_order then 'authority_order'::public.case_source else source end,
    top_reason = case when public.tier_rank(notice_tier) < public.tier_rank(tier) then new_notice.reason else top_reason end,
    tier = case when public.tier_rank(notice_tier) < public.tier_rank(tier) then notice_tier else tier end,
    deadline_at = least(deadline_at,
      case when is_order then new_notice.received_at else received_at end
        + make_interval(hours => public.tier_hours(notice_tier)))
  where id = open_case.id;
  return open_case.id;
end;
$$;

comment on function public.attach_notice_to_case(public.public_notices) is
  'Internal: opens or joins the item''s open case for a matched public notice; an order is the one-hour tier (S1-E10-02).';
revoke execute on function public.attach_notice_to_case(public.public_notices) from public, anon, authenticated;

/* ---------- References ---------- */

/**
 * next_notice_reference: the next free reference for a notice (N-000123) or an order (TCO-0001).
 * Input: the kind. Returns: a reference no case or notice uses yet; a case takes its first
 *   notice's reference, and an older order case (the seed's TCO-0001, S1-E10-03a) may already
 *   hold the next number, so taken numbers are skipped. Internal.
 */
create or replace function public.next_notice_reference(notice_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := case when notice_kind = 'removal_order'
      then 'TCO-' || lpad(nextval('public.removal_order_reference_seq')::text, 4, '0')
      else 'N-' || lpad(nextval('public.notice_reference_seq')::text, 6, '0') end;
    exit when not exists (select 1 from public.cases where cases.reference = candidate)
      and not exists (select 1 from public.public_notices where public_notices.reference = candidate);
  end loop;
  return candidate;
end;
$$;

comment on function public.next_notice_reference(text) is
  'Internal: the next free N- or TCO- reference for a public notice (S1-E10-02).';
revoke execute on function public.next_notice_reference(text) from public, anon, authenticated;

/* ---------- Saving a notice ---------- */

/**
 * submit_public_notice: saves a notice or an authority order from the public form.
 * Inputs: payload, the JSON text the server checked and signed: kind, reason, contentUrl,
 *   explanation, notifierName, notifierEmail, goodFaith, authorityName, orderReference, language;
 *   signature, its HMAC (see public_notice_payload_is_signed()).
 * Returns: the reference to quote and the time of receipt (Regulation (EU) 2021/784 asks for the
 *   time an order was received in the acknowledgement).
 * Errors: insufficient_privilege when the signature is wrong (it didn't come through our server);
 *   check_violation when a required field is missing (the table's constraints name which).
 * Flow: the Pages Function /api/notice calls it, then sends the acknowledgement email. A matched
 *   address opens or joins the item's case; an order also logs the on-call alert. Granted to
 *   anon and authenticated because the sender may have no account; the signature is the guard.
 */
create or replace function public.submit_public_notice(payload text, signature text)
returns table (notice_reference text, received_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  fields jsonb;
  notice_kind text;
  matched record;
  new_notice public.public_notices;
  new_case_id uuid;
begin
  -- Step 1: only a payload our server signed.
  if not public.public_notice_payload_is_signed(payload, signature) then
    raise exception 'This notice didn''t come through the form.' using errcode = 'insufficient_privilege';
  end if;
  fields := payload::jsonb;
  notice_kind := fields ->> 'kind';
  -- Step 2: what the address points to, if anything.
  select * into matched from public.item_for_public_address(fields ->> 'contentUrl') limit 1;
  -- Step 3: the row; the table's constraints refuse a notice missing what DSA art. 16 asks for.
  insert into public.public_notices (kind, reason, content_url, item_type, item_id, owner_user_id,
    explanation, notifier_name, notifier_email, good_faith_confirmed, authority_name, order_reference,
    language, reference)
  values (
    notice_kind,
    case when notice_kind = 'notice' then (fields ->> 'reason')::public.report_reason end,
    btrim(fields ->> 'contentUrl'),
    matched.item_type, matched.item_id, matched.owner_user_id,
    btrim(fields ->> 'explanation'),
    nullif(btrim(fields ->> 'notifierName'), ''),
    nullif(lower(btrim(fields ->> 'notifierEmail')), ''),
    coalesce((fields ->> 'goodFaith')::boolean, false),
    nullif(btrim(fields ->> 'authorityName'), ''),
    nullif(btrim(fields ->> 'orderReference'), ''),
    coalesce(fields ->> 'language', 'ro'),
    public.next_notice_reference(notice_kind))
  returning * into new_notice;
  -- Step 4: the case, when the address matched something we host.
  if new_notice.item_id is not null then
    new_case_id := public.attach_notice_to_case(new_notice);
    update public.public_notices set case_id = new_case_id where id = new_notice.id;
  end if;
  -- Step 5: an order alerts whoever is on call at once (logged; the phone comes with S1-E10-09).
  if notice_kind = 'removal_order' then
    insert into public.on_call_alerts (kind, case_id, notice_id) values ('removal_order', new_case_id, new_notice.id);
  end if;
  return query select new_notice.reference, new_notice.received_at;
end;
$$;

comment on function public.submit_public_notice(text, text) is
  'Saves a notice or an authority removal order from the public form; only a payload signed by our server (S1-E10-02).';
revoke execute on function public.submit_public_notice(text, text) from public;
grant execute on function public.submit_public_notice(text, text) to anon, authenticated;

/* ---------- Marking notices decided ---------- */

/**
 * mark_case_notices_decided: when a case is decided, its notices are decided and closed too, so
 * the decision email can go to each notifier (DSA art. 16(5); sent by S1-E10-04). Trigger function.
 */
create or replace function public.mark_case_notices_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'decided' and old.status is distinct from 'decided' then
    update public.public_notices set decided_at = new.decided_at, closed_at = new.decided_at
      where case_id = new.id and decided_at is null;
  end if;
  return new;
end;
$$;

comment on function public.mark_case_notices_decided() is
  'Trigger: a decided case decides and closes its public notices (S1-E10-02).';
revoke execute on function public.mark_case_notices_decided() from public, anon, authenticated;

create trigger cases_mark_notices_decided
  after update of status on public.cases
  for each row execute function public.mark_case_notices_decided();

/* ---------- What staff read ---------- */

/**
 * admin_case_notices: the public notices in a case, for the case page.
 * Input: the case's ID. Returns: the notices, oldest first, with the notifier's name and email
 *   (moderation staff may read them, architecture 1.8.3) and when the on-call alert went out.
 * Errors: insufficient_privilege for anyone who may not see the case.
 */
create or replace function public.admin_case_notices(target_case_id uuid)
returns table (
  notice_id uuid,
  reference text,
  kind text,
  reason public.report_reason,
  content_url text,
  explanation text,
  notifier_name text,
  notifier_email text,
  authority_name text,
  order_reference text,
  language text,
  received_at timestamptz,
  alerted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: only staff who may see this case.
  if not exists (select 1 from public.cases where cases.id = target_case_id and public.may_see_case(cases.is_safeguarding)) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: its notices, with the alert time for an order.
  return query
    select public_notices.id, public_notices.reference, public_notices.kind, public_notices.reason,
           public_notices.content_url, public_notices.explanation, public_notices.notifier_name,
           public_notices.notifier_email, public_notices.authority_name, public_notices.order_reference,
           public_notices.language, public_notices.received_at,
           (select min(on_call_alerts.created_at) from public.on_call_alerts where on_call_alerts.notice_id = public_notices.id)
    from public.public_notices
    where public_notices.case_id = target_case_id
    order by public_notices.received_at;
end;
$$;

comment on function public.admin_case_notices(uuid) is 'Staff: a case''s public notices, for the case page (S1-E10-02).';
revoke execute on function public.admin_case_notices(uuid) from public, anon;
grant execute on function public.admin_case_notices(uuid) to authenticated;

/**
 * admin_unmatched_notices: open notices whose address points to nothing we host, so a person
 * checks them by hand (an order first, with its one-hour deadline from receipt).
 * Returns: the notices with the address and the explanation (what a person checks), orders first
 *   and then oldest first. Child-safety notices only for staff
 *   with the safeguarding permission (the select policy).
 * Errors: insufficient_privilege for anyone outside moderation.
 */
create or replace function public.admin_unmatched_notices()
returns table (
  notice_id uuid,
  reference text,
  kind text,
  reason public.report_reason,
  content_url text,
  explanation text,
  authority_name text,
  received_at timestamptz,
  deadline_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff see notices.' using errcode = 'insufficient_privilege';
  end if;
  -- Security invoker: the select policy decides which notices the caller sees. The order's hour is
  -- written out (Regulation (EU) 2021/784 art. 3(3)): tier_hours() is internal, not for callers.
  return query
    select public_notices.id, public_notices.reference, public_notices.kind, public_notices.reason,
           public_notices.content_url, public_notices.explanation, public_notices.authority_name,
           public_notices.received_at,
           case when public_notices.kind = 'removal_order'
             then public_notices.received_at + interval '1 hour' end
    from public.public_notices
    where public_notices.case_id is null and public_notices.closed_at is null
    order by (public_notices.kind = 'removal_order') desc, public_notices.received_at;
end;
$$;

comment on function public.admin_unmatched_notices() is
  'Staff: open public notices whose address points to nothing we host, orders first (S1-E10-02).';
revoke execute on function public.admin_unmatched_notices() from public, anon;
grant execute on function public.admin_unmatched_notices() to authenticated;

/**
 * admin_close_unmatched_notice: a moderator closes an unmatched notice after checking it by hand,
 * with a note, written to the audit log in the same transaction.
 * Inputs: the notice's ID and the note. Errors: insufficient_privilege outside moderation (or a
 *   child-safety notice without the safeguarding permission); check_violation without a note;
 *   no_data_found for a notice that is matched, closed or unknown.
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

comment on function public.admin_close_unmatched_notice(uuid, text) is
  'Staff: closes an unmatched public notice with a note, audited (S1-E10-02).';
revoke execute on function public.admin_close_unmatched_notice(uuid, text) from public, anon;
grant execute on function public.admin_close_unmatched_notice(uuid, text) to authenticated;

/**
 * admin_on_call_alerts: the logged on-call alerts, newest first, for the queue page.
 * Returns: when, the case and its reference. Errors: insufficient_privilege outside moderation.
 */
create or replace function public.admin_on_call_alerts()
returns table (alert_id uuid, kind text, case_id uuid, case_reference text, notice_reference text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff see on-call alerts.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select on_call_alerts.id, on_call_alerts.kind, on_call_alerts.case_id, cases.reference,
           public_notices.reference, on_call_alerts.created_at
    from public.on_call_alerts
    left join public.cases on cases.id = on_call_alerts.case_id
    left join public.public_notices on public_notices.id = on_call_alerts.notice_id
    order by on_call_alerts.created_at desc
    limit 20;
end;
$$;

comment on function public.admin_on_call_alerts() is 'Staff: the latest logged on-call alerts (S1-E10-02; the phone alert is S1-E10-09).';
revoke execute on function public.admin_on_call_alerts() from public, anon;
grant execute on function public.admin_on_call_alerts() to authenticated;
