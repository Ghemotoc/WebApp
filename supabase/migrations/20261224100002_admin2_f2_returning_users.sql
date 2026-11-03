/*
 * Migration: possible returning users (bundle ADMIN-2, part f2; Robert's brief of 2 Nov 2026,
 * section 6, from his 08:20 and 08:21 messages).
 *
 * The rule: "When a new sign-up shares a scrambled IP with an account banned in the last 30 days,
 * flag it for moderator review. Never block it automatically: schools share IPs. Add a 'Possible
 * returning user' action for moderators that links the two accounts in the case. Don't collect
 * phone numbers and don't use a device marker."
 *
 * What it does:
 *   1. sign_up_ips: the scrambled IP address a sign-up came from (never the address itself),
 *      under this month's key and last month's, from the signed token /api/signup-context makes
 *      (server/signup-ip.ts). Kept 30 days (Q48), then deleted by blank_old_scrambled_ips().
 *   2. case_account_links: a moderator's note, inside a case, that two accounts may be the same
 *      person. Made automatically by a matching sign-up (source 'sign_up_ip') or by a moderator
 *      on any case about a profile (source 'moderator'), and removable with a reason. Logged.
 *   3. The sign-up (create_profile_from_sign_up) keeps the scrambled IP and, when it matches a
 *      sign-up or picture upload of an account under a ban made in the last 30 days, opens a
 *      'returning_user' case on the new profile with the link. The sign-up always goes ahead.
 *   4. A statement of reasons from such a case says automated means found it (DSA art. 17(3)(c)).
 *   5. admin_case_account_links(), admin_link_returning_user(), admin_unlink_returning_user()
 *      for the case page.
 *
 * Who calls it: Supabase applies it in order. What reads it: the sign-up trigger and
 *   finish_social_sign_up() through create_profile_from_sign_up(), the nightly
 *   run-retention-jobs, and the case page (src/features/moderation/components/CaseAccountLinks.tsx).
 */

/* ---------- 1. The scrambled IP of each sign-up ---------- */

create table public.sign_up_ips (
  id uuid primary key default gen_random_uuid(),
  -- The new account (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The address scrambled with the key of one month (server/scrambled-ip.ts), and that month.
  ip_scrambled text not null,
  ip_period text not null,
  created_at timestamptz not null default now(),
  constraint sign_up_ips_shape check (ip_scrambled ~ '^[0-9a-f]{64}$' and ip_period ~ '^\d{4}-\d{2}$'),
  constraint sign_up_ips_one_per_month unique (user_id, ip_period)
);

comment on table public.sign_up_ips is
  'kind: staff
The scrambled IP address of a sign-up, under this month''s and last month''s key, never the address; kept 30 days to spot an account banned in that time coming back (bundle ADMIN-2, part f2; Q48).';

create index sign_up_ips_by_value on public.sign_up_ips (ip_scrambled, ip_period);

create trigger sign_up_ips_refuse_user_id_change
  before update on public.sign_up_ips
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.sign_up_ips enable row level security;

/**
 * Policy sign_up_ips_select_moderation: moderation staff may read the rows, which say nothing
 * readable (a scrambled value and a month); the case page shows matches, never the values.
 */
create policy sign_up_ips_select_moderation
  on public.sign_up_ips
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));
comment on policy sign_up_ips_select_moderation on public.sign_up_ips is
  'Allows moderation staff to read the scrambled sign-up IPs; nobody else, the person included (part f2).';

revoke all on public.sign_up_ips from anon, authenticated;
grant select on public.sign_up_ips to authenticated;

/* ---------- 2. Links between two accounts in a case ---------- */

create table public.case_account_links (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  -- The case's account, the one that may be a returning user (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The other account: usually one closed for good.
  linked_user_id uuid not null references public.profiles (id),
  -- 'sign_up_ip' when a matching sign-up made it, 'moderator' when a moderator did.
  source text not null,
  reason text not null,
  -- The moderator who linked it; null when the sign-up check did.
  linked_by_user_id uuid references public.profiles (id),
  removed_at timestamptz,
  removed_by_user_id uuid references public.profiles (id),
  remove_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_account_links_source check (source in ('sign_up_ip', 'moderator')),
  constraint case_account_links_two_accounts check (user_id <> linked_user_id),
  constraint case_account_links_reason_is_written check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint case_account_links_remove_fields_go_together
    check ((removed_at is null) = (removed_by_user_id is null) and (removed_at is null) = (remove_reason is null))
);

comment on table public.case_account_links is
  'kind: staff
"Possible returning user": two accounts a case says may be the same person, from a matching sign-up IP or a moderator, with the reason; staff only (bundle ADMIN-2, part f2).';

create unique index case_account_links_one_live on public.case_account_links (case_id, linked_user_id)
  where removed_at is null;

create trigger case_account_links_set_updated_at
  before update on public.case_account_links
  for each row execute function public.set_updated_at();

create trigger case_account_links_refuse_user_id_change
  before update on public.case_account_links
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.case_account_links enable row level security;

/**
 * Policy case_account_links_select_moderation: moderation staff who may see the case read its
 * links (a safeguarding case's links only with the safeguarding permission, like the case).
 */
create policy case_account_links_select_moderation
  on public.case_account_links
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view'))
    and exists (select 1 from public.cases where cases.id = case_account_links.case_id
                and public.may_see_case(cases.is_safeguarding)));
comment on policy case_account_links_select_moderation on public.case_account_links is
  'Allows moderation staff who may see the case to read its account links; nobody else (part f2).';

revoke all on public.case_account_links from anon, authenticated;
grant select on public.case_account_links to authenticated;

insert into public.settings (key, value, is_public, description) values
  ('returning_user_window_days', '30'::jsonb, false,
   'Days after a ban in which a new sign-up from the same scrambled IP is flagged for a moderator (bundle ADMIN-2, part f2).')
on conflict (key) do nothing;

/* ---------- 3. The sign-up keeps the scrambled IP and flags a match ---------- */

/**
 * verified_signup_ips: the scrambled IP values in a signed token, if the token is genuine.
 * Input: token, "ip1.<value>.<month>.<value>.<month>.<seconds>.<signature>" from
 *   /api/signup-context (server/signup-ip.ts).
 * Returns: one row per month (ip_scrambled, ip_period) when the signature matches
 *   signup_context_secret in Vault and the token is at most 10 minutes old; no rows otherwise.
 * Internal: record_sign_up_ips().
 */
create or replace function public.verified_signup_ips(token text)
returns table (ip_scrambled text, ip_period text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(coalesce(token, ''), '.');
  secret text;
  issued_at bigint;
begin
  -- Step 1: the shape: version, two values with their months, the time, the signature.
  if array_length(parts, 1) is distinct from 7 or parts[1] <> 'ip1'
    or parts[2] !~ '^[0-9a-f]{64}$' or parts[3] !~ '^\d{4}-\d{2}$'
    or parts[4] !~ '^[0-9a-f]{64}$' or parts[5] !~ '^\d{4}-\d{2}$'
    or parts[6] !~ '^\d{1,12}$' or parts[7] !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  -- Step 2: at most 10 minutes old, like the country token (S1-E2-10).
  issued_at := parts[6]::bigint;
  if issued_at < extract(epoch from now())::bigint - 600 or issued_at > extract(epoch from now())::bigint + 60 then
    return;
  end if;
  -- Step 3: the signature, with the secret from Vault; without it nothing is trusted.
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'signup_context_secret';
  if secret is null or secret = '' then
    return;
  end if;
  if encode(extensions.hmac(array_to_string(parts[1:6], '.'), secret, 'sha256'), 'hex') <> parts[7] then
    return;
  end if;
  return query values (parts[2], parts[3]), (parts[4], parts[5]);
end;
$$;
comment on function public.verified_signup_ips(text) is
  'Internal: the scrambled IP values in a genuine sign-up IP token at most 10 minutes old (part f2).';
revoke execute on function public.verified_signup_ips(text) from public, anon, authenticated;

/**
 * recently_banned_ip_matches: accounts under a ban made in the last returning_user_window_days
 * whose sign-up or picture upload came from the same scrambled IP, under the same month's key.
 * Input: the new account. Returns: the banned accounts' IDs, each once.
 * Internal: flag_possible_returning_user().
 */
create or replace function public.recently_banned_ip_matches(new_user_id uuid)
returns table (banned_user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select sign_up_ips.ip_scrambled, sign_up_ips.ip_period from public.sign_up_ips
    where sign_up_ips.user_id = new_user_id
  ),
  banned as (
    select distinct sanctions.user_id from public.sanctions
    where sanctions.kind = 'ban' and sanctions.lifted_at is null and sanctions.user_id <> new_user_id
      and sanctions.created_at > now() - make_interval(days => public.keep_setting('returning_user_window_days', 30))
  )
  select banned.user_id from banned
  where exists (select 1 from public.sign_up_ips join mine using (ip_scrambled, ip_period)
                where sign_up_ips.user_id = banned.user_id)
     or exists (select 1 from public.picture_checks
                join mine on mine.ip_scrambled = picture_checks.uploader_ip_scrambled
                         and mine.ip_period = picture_checks.uploader_ip_period
                where picture_checks.user_id = banned.user_id);
$$;
comment on function public.recently_banned_ip_matches(uuid) is
  'Internal: recently banned accounts that share a scrambled IP with a new sign-up (part f2).';
revoke execute on function public.recently_banned_ip_matches(uuid) from public, anon, authenticated;

create sequence public.returning_user_case_reference_seq;

/**
 * flag_possible_returning_user: opens a case for a moderator when a new account shares a
 * scrambled IP with a recently banned one, and links the two. Never blocks anything.
 * Input: the new account. Returns: the case's ID, or null when nothing matched.
 * An open case on the profile already (a report, say) gets the link instead of a second case.
 * Internal: record_sign_up_ips().
 */
create or replace function public.flag_possible_returning_user(new_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched uuid[] := array(select banned_user_id from public.recently_banned_ip_matches(new_user_id));
  flagged_case_id uuid;
begin
  -- Step 1: nothing matched, nothing to do.
  if cardinality(matched) = 0 then
    return null;
  end if;
  -- Step 2: the profile's open case, or a new one (48 hours: a person should look soon).
  select cases.id into flagged_case_id from public.cases
  where cases.item_type = 'profile' and cases.item_id = new_user_id and cases.status = 'open';
  if flagged_case_id is null then
    insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
    values ('U-' || lpad(nextval('public.returning_user_case_reference_seq')::text, 6, '0'), new_user_id,
            'profile', new_user_id, 'returning_user', 'two_days',
            now() + make_interval(hours => public.tier_hours('two_days')))
    returning id into flagged_case_id;
  end if;
  -- Step 3: one link per banned account.
  insert into public.case_account_links (case_id, user_id, linked_user_id, source, reason)
  select flagged_case_id, new_user_id, banned_id, 'sign_up_ip',
         'Signed up from the same scrambled IP address as this account, banned in the last 30 days.'
  from unnest(matched) as banned_id
  on conflict (case_id, linked_user_id) where removed_at is null do nothing;
  return flagged_case_id;
end;
$$;
comment on function public.flag_possible_returning_user(uuid) is
  'Internal: a case and a link when a new sign-up shares a scrambled IP with a recently banned account; never a block (part f2).';
revoke execute on function public.flag_possible_returning_user(uuid) from public, anon, authenticated;

/**
 * record_sign_up_ips: keeps a new account's scrambled IP and asks whether it matches a recently
 * banned account.
 * Inputs: the new account; the token from the sign-up data (may be null or wrong: then nothing is
 *   kept and nothing is flagged; the sign-up goes on either way).
 * Internal: create_profile_from_sign_up().
 */
create or replace function public.record_sign_up_ips(new_user_id uuid, token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.sign_up_ips (user_id, ip_scrambled, ip_period)
  select new_user_id, verified.ip_scrambled, verified.ip_period
  from public.verified_signup_ips(token) as verified
  on conflict (user_id, ip_period) do nothing;
  if found then
    perform public.flag_possible_returning_user(new_user_id);
  end if;
end;
$$;
comment on function public.record_sign_up_ips(uuid, text) is
  'Internal: keeps a sign-up''s scrambled IP for 30 days and flags a possible returning user (part f2).';
revoke execute on function public.record_sign_up_ips(uuid, text) from public, anon, authenticated;

/**
 * create_profile_from_sign_up: as in S1-E2-09, plus step 7: the scrambled IP and the
 * returning-user check (part f2). A failure there never refuses the sign-up.
 */
create or replace function public.create_profile_from_sign_up(new_user_id uuid, sign_up_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_locale text := sign_up_data ->> 'locale';
  birth_year smallint;
  birth_month smallint;
  country text;
  chosen_handle text;
  outcome text;
begin
  -- Step 1: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 2: the country from the signed token, and the market rules (S1-E2-10).
  country := public.verified_signup_country(sign_up_data ->> 'signup_context');
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 3: the username chosen on the form, checked by the same rules as setup (S1-E2-04).
  chosen_handle := public.sign_up_handle(sign_up_data);

  -- Step 4: the profile, with the form's language, the country and the username.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code, handle)
  values (
    new_user_id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country,
    chosen_handle
  );

  -- Step 5: the invite, while the test is invite only (S1-E11-17), after the profile so the
  -- invite's audit row can name the new account.
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code', new_user_id);
  end if;

  -- Step 6: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new_user_id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new_user_id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  -- Step 7: the scrambled IP, and a moderator's case if it matches an account banned in the
  -- last 30 days (part f2). Never a refusal: schools share addresses, so a person decides.
  perform public.record_sign_up_ips(new_user_id, sign_up_data ->> 'signup_ip');
end;
$$;
comment on function public.create_profile_from_sign_up(uuid, jsonb) is
  'Internal: the sign-up rules and the new profile and consents, then the scrambled IP and the returning-user check (S1-E2-01, 02, 04, 10, S1-E11-17; shared since S1-E2-09; ADMIN-2 part f2).';
revoke execute on function public.create_profile_from_sign_up(uuid, jsonb) from public, anon, authenticated;

/**
 * blank_old_scrambled_ips: as in part e2b, and the sign-up IPs older than scrambled_ip_keep_days
 * are deleted too (Q48). Returns: how many pictures and sign-up rows it changed. Run each night.
 */
create or replace function public.blank_old_scrambled_ips()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep_days integer := public.keep_setting('scrambled_ip_keep_days', 30);
  picture_count integer;
  sign_up_count integer;
begin
  update public.picture_checks set uploader_ip_scrambled = null, uploader_ip_period = null
    where uploader_ip_scrambled is not null
      and created_at < now() - make_interval(days => keep_days);
  get diagnostics picture_count = row_count;
  delete from public.sign_up_ips where sign_up_ips.created_at < now() - make_interval(days => keep_days);
  get diagnostics sign_up_count = row_count;
  return picture_count + sign_up_count;
end;
$$;
comment on function public.blank_old_scrambled_ips() is
  'Job: blanks scrambled IP addresses on pictures and deletes sign-up IPs after 30 days (Q48, ADMIN-2 parts e2b and f2).';
revoke execute on function public.blank_old_scrambled_ips() from public, anon, authenticated;

/* ---------- 4. Statements of reasons say automated means found it ---------- */

/**
 * statements_mark_returning_user_detection: a statement of reasons from a 'returning_user' case
 * says automated means found the account (the IP match), as DSA art. 17(3)(c) asks; a person
 * still made the decision. Trigger, before insert on statements_of_reasons.
 */
create or replace function public.statements_mark_returning_user_detection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.case_id is not null
    and exists (select 1 from public.cases where cases.id = new.case_id and cases.source = 'returning_user') then
    new.automated_detection := true;
  end if;
  return new;
end;
$$;
comment on function public.statements_mark_returning_user_detection() is
  'Trigger: a statement from a possible returning user case says automated means found it (DSA art. 17(3)(c); part f2).';
revoke execute on function public.statements_mark_returning_user_detection() from public, anon, authenticated;

create trigger statements_mark_returning_user_detection
  before insert on public.statements_of_reasons
  for each row execute function public.statements_mark_returning_user_detection();

/* ---------- 5. The case page ---------- */

/**
 * case_for_links: the case, if the caller may see it (and act on it, when asked).
 * Inputs: the case; must_act, true for a change. Returns: the case.
 * Errors: insufficient_privilege when the caller may not.
 * Internal: the three functions below.
 */
create or replace function public.case_for_links(target_case_id uuid, must_act boolean)
returns public.cases
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  select * into target from public.cases where cases.id = target_case_id;
  if target.id is null or not public.staff_may('moderation', case when must_act then 'act' else 'view' end)
    or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  return target;
end;
$$;
comment on function public.case_for_links(uuid, boolean) is
  'Internal: the case behind a link, for moderation staff who may see it (part f2).';
revoke execute on function public.case_for_links(uuid, boolean) from public, anon, authenticated;

/**
 * admin_case_account_links: the "Possible returning user" panel of a case.
 * Input: the case. Returns: jsonb array of {id, user_id, handle, is_banned, banned_at, source,
 *   reason, linked_by, created_at}, newest first; removed links are left out. user_id is for the
 *   link to the account's staff page (staff see user IDs, architecture 1.6).
 * Errors: insufficient_privilege for anyone outside moderation staff.
 * Where it fits: src/features/moderation/api/caseAccountLinks.ts.
 */
create or replace function public.admin_case_account_links(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.cases := public.case_for_links(target_case_id, false);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', links.id,
        'user_id', links.linked_user_id,
        'handle', linked.handle,
        'is_banned', (public.active_sanction(links.linked_user_id, 'ban')).id is not null,
        'banned_at', (public.active_sanction(links.linked_user_id, 'ban')).created_at,
        'source', links.source,
        'reason', links.reason,
        'linked_by', linker.handle,
        'created_at', links.created_at) order by links.created_at desc)
    from public.case_account_links as links
    join public.profiles as linked on linked.id = links.linked_user_id
    left join public.profiles as linker on linker.id = links.linked_by_user_id
    where links.case_id = target.id and links.removed_at is null), '[]'::jsonb);
end;
$$;
comment on function public.admin_case_account_links(uuid) is
  'Moderation staff: the accounts a case links as a possible returning user (part f2).';
revoke execute on function public.admin_case_account_links(uuid) from public, anon;
grant execute on function public.admin_case_account_links(uuid) to authenticated;

/**
 * admin_link_returning_user: "Possible returning user": a moderator links another account to the
 * case's account, with a reason.
 * Inputs: the case (about a profile); the other account's username; the reason.
 * Returns: the link's ID.
 * Errors: insufficient_privilege outside moderation staff who may act; check_violation (hint
 *   not_a_profile_case, no_such_account, same_account, reason_missing, already_linked).
 * Logged as moderation.returning_user_linked.
 */
create or replace function public.admin_link_returning_user(target_case_id uuid, other_handle text, reason_given text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases := public.case_for_links(target_case_id, true);
  other_id uuid;
  new_link_id uuid;
begin
  -- Step 1: a case about an account, another account that exists, and a reason.
  if target.item_type <> 'profile' then
    raise exception 'Only a case about an account can link accounts.' using errcode = 'check_violation', hint = 'not_a_profile_case';
  end if;
  select profiles.id into other_id from public.profiles
  where profiles.handle_skeleton = public.username_skeleton(btrim(coalesce(other_handle, ''), ' @'));
  if other_id is null then
    raise exception 'There is no account with that username.' using errcode = 'check_violation', hint = 'no_such_account';
  end if;
  if other_id = target.user_id then
    raise exception 'Choose another account.' using errcode = 'check_violation', hint = 'same_account';
  end if;
  if btrim(coalesce(reason_given, '')) = '' or char_length(reason_given) > 1000 then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  if exists (select 1 from public.case_account_links where case_id = target.id
             and linked_user_id = other_id and removed_at is null) then
    raise exception 'These accounts are already linked in this case.' using errcode = 'check_violation', hint = 'already_linked';
  end if;
  -- Step 2: the link and its audit row, in one transaction.
  insert into public.case_account_links (case_id, user_id, linked_user_id, source, reason, linked_by_user_id)
  values (target.id, target.user_id, other_id, 'moderator', btrim(reason_given), (select auth.uid()))
  returning id into new_link_id;
  perform public.log_staff_action('moderation.returning_user_linked', 'case_account_links', new_link_id::text,
    target.user_id, btrim(reason_given), null,
    jsonb_build_object('case_id', target.id, 'linked_user_id', other_id));
  return new_link_id;
end;
$$;
comment on function public.admin_link_returning_user(uuid, text, text) is
  'Moderation staff: links another account to a case''s account as a possible returning user, with a reason, logged (part f2).';
revoke execute on function public.admin_link_returning_user(uuid, text, text) from public, anon;
grant execute on function public.admin_link_returning_user(uuid, text, text) to authenticated;

/**
 * admin_unlink_returning_user: removes a link that turned out wrong (a shared school address,
 * say), with a reason. The row stays, marked removed, for the record.
 * Inputs: the link; the reason. Returns: true.
 * Errors: insufficient_privilege outside moderation staff who may act; check_violation (hint
 *   reason_missing, not_found).
 * Logged as moderation.returning_user_unlinked.
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
comment on function public.admin_unlink_returning_user(uuid, text) is
  'Moderation staff: removes a possible returning user link, with a reason, logged (part f2).';
revoke execute on function public.admin_unlink_returning_user(uuid, text) from public, anon;
grant execute on function public.admin_unlink_returning_user(uuid, text) to authenticated;
