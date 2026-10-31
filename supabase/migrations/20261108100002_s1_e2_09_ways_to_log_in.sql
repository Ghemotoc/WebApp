/*
 * Migration: sign up and log in with Google, Apple, Microsoft or a passkey, and Settings › Ways to
 * log in (story S1-E2-09; bundle ACCOUNTS-2, part e; boards SignUp 2.1, SignIn 2.2, Settings 6.3).
 *
 * Why it is built like this:
 * - Supabase Auth makes the account the moment a provider says yes, before our sign-up form's
 *   answers can travel with it (a provider sign-in carries no sign-up data). So a provider account
 *   starts with no profile, and the browser finishes it straight away with
 *   finish_social_sign_up(), which runs exactly the rules a password sign-up runs in the trigger
 *   (age, market, username, invite, the accepted legal versions; criterion 2: "the person still
 *   gives their year of birth"). An account with no profile can't read or write anything
 *   (account_state() says deleted), and one never finished is removed after a day.
 * - Supabase Auth links a provider to an existing account with the same email by itself. The story
 *   says never merged silently (criterion 5), so a new provider identity on an account that is
 *   already set up is refused unless the account asked for it from Settings in the last ten
 *   minutes (expect_identity_link(), then Supabase's linkIdentity()).
 * - Every way to log in that is connected or disconnected later is notified in the app and always
 *   emailed (criterion 4), from the database, so no path around the screen misses it.
 *
 * What it adds:
 *   flag      passkey_login (off): "Use a passkey" and passkeys in Settings. social_login (off,
 *             S1-E1-02) stays the switch for the three provider buttons. Both wait for the keys and
 *             the relying party set-up on the hosted projects (GO-LIVE).
 *   function  create_profile_from_sign_up(): the sign-up rules, shared by the trigger and finishing;
 *   function  handle_new_auth_user(): as in S1-E2-04, but a provider account waits for finishing;
 *   function  finish_social_sign_up(), cancel_social_sign_up(), purge_unfinished_social_sign_ups()
 *             with its pg_cron job;
 *   table     identity_link_requests and expect_identity_link(); the guard trigger on
 *             auth.identities;
 *   triggers  login method notices on auth.identities and auth.webauthn_credentials;
 *   function  my_login_methods(): what Settings › Ways to log in lists;
 *   function  email_delivery_for(), notification_category(): the two new kinds.
 * Who calls it: src/features/auth/ (sign-up, log-in and the return page) and
 * src/features/login-methods/ (Settings). Tests: supabase/tests/database/203-ways-to-log-in.test.sql.
 */

/* ---------- The flag ---------- */

-- Off until passkeys are set up on the hosted projects (GO-LIVE). Public, so the log-in page can
-- read it signed out.
insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('passkey_login', false, true,
   'Log in with a passkey, and add passkeys in Settings › Ways to log in (S1-E2-09).')
on conflict (key) do nothing;

/* ---------- Which providers ---------- */

/**
 * is_social_provider: true for the three sign-in providers the story names. Microsoft is "azure"
 * in Supabase Auth.
 * Input: a provider name. Returns: boolean. Internal.
 */
create or replace function public.is_social_provider(provider text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select provider in ('google', 'apple', 'azure');
$$;
comment on function public.is_social_provider(text) is
  'Internal: Google, Apple or Microsoft ("azure"), the providers of S1-E2-09.';
revoke execute on function public.is_social_provider(text) from public, anon, authenticated;

/* ---------- The sign-up rules, shared ---------- */

/**
 * create_profile_from_sign_up: checks one sign-up's answers and creates the profile and consents,
 * exactly as the sign-up trigger did since S1-E2-04 (its steps 3 to 8, moved here unchanged).
 * Inputs: new_user_id; sign_up_data, the form's answers (birth_year, birth_month, locale,
 *   signup_context, handle, invite_code, accepted_terms_version_id, accepted_privacy_version_id).
 * Returns: nothing.
 * Errors: raises check_violation for every refusal (age, market, username, invite, legal version),
 *   which undoes everything around it.
 * Where it fits: handle_new_auth_user() for a password or link sign-up, finish_social_sign_up()
 *   for a provider sign-up.
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
end;
$$;
comment on function public.create_profile_from_sign_up(uuid, jsonb) is
  'Internal: the sign-up rules and the new profile and consents (S1-E2-01, 02, 04, 10, S1-E11-17; shared since S1-E2-09).';
revoke execute on function public.create_profile_from_sign_up(uuid, jsonb) from public, anon, authenticated;

/**
 * handle_new_auth_user: as in S1-E2-04, with its rules moved into create_profile_from_sign_up().
 * A Google, Apple or Microsoft account carries no sign-up answers, so it gets no profile here: the
 * browser finishes it at once with finish_social_sign_up() (S1-E2-09). A banned email is still
 * refused first, whichever way the person signs up (S1-E10-06).
 */
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: a banned account's email can't come back (S1-E10-06; DSA art. 23).
  if public.is_email_banned(new.email) then
    raise exception 'This email address can''t be used to sign up.' using errcode = 'check_violation';
  end if;

  -- Step 3: a provider account waits for its answers (finish_social_sign_up()).
  if public.is_social_provider(new.raw_app_meta_data ->> 'provider') then
    return new;
  end if;

  -- Step 4: a password or link sign-up is checked now, and refused as a whole if a rule says no.
  perform public.create_profile_from_sign_up(new.id, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;
comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: refuses a banned email, then checks a sign-up and creates the profile, or leaves a provider account for finish_social_sign_up() (S1-E2-01, 02, 04, 09, 10, S1-E11-17, S1-E10-06).';

/* ---------- Finishing a provider sign-up ---------- */

/**
 * unfinished_social_account: true when the signed-in account came from a provider and has no
 * profile yet. Input: the account. Internal.
 */
create or replace function public.unfinished_social_account(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from auth.identities
      where identities.user_id = target_user_id and public.is_social_provider(identities.provider))
    and not exists (select 1 from public.profiles where profiles.id = target_user_id);
$$;
comment on function public.unfinished_social_account(uuid) is
  'Internal: a Google, Apple or Microsoft account still waiting for its sign-up answers (S1-E2-09).';
revoke execute on function public.unfinished_social_account(uuid) from public, anon, authenticated;

/**
 * finish_social_sign_up: gives a new Google, Apple or Microsoft account its profile, with the
 * answers the sign-up form kept while the person was at the provider (criterion 2).
 * Input: sign_up_data, the same answers a password sign-up sends (no email or password).
 * Returns: jsonb {outcome}: 'ok'; 'finished' when the account already has its profile (a page
 *   opened twice); 'refused' with {rule} (age, market, username, invite or terms) when a
 *   rule says no, in which case nothing is kept and the page offers to start again.
 * Errors: insufficient_privilege when signed out; feature_not_supported while social_login is off;
 *   check_violation when the account isn't a provider account.
 * Where it fits: src/features/auth/api/socialSignIn.ts, from /auth/social-return.
 */
create or replace function public.finish_social_sign_up(sign_up_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  -- Step 1: a signed-in provider account, with the buttons switched on.
  if caller is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('social_login') then
    raise exception 'Sign-in with Google, Apple or Microsoft is off.' using errcode = 'feature_not_supported';
  end if;
  if exists (select 1 from public.profiles where profiles.id = caller) then
    return jsonb_build_object('outcome', 'finished');
  end if;
  if not public.unfinished_social_account(caller) then
    raise exception 'This account didn''t come from Google, Apple or Microsoft.' using errcode = 'check_violation';
  end if;

  -- Step 2: the same rules as a password sign-up; a refusal undoes everything this block did.
  begin
    perform public.create_profile_from_sign_up(caller, coalesce(sign_up_data, '{}'::jsonb));
  exception when check_violation or unique_violation then
    return jsonb_build_object('outcome', 'refused', 'rule', public.sign_up_rule_of(sqlerrm));
  end;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

/**
 * sign_up_rule_of: which rule a sign-up refusal came from, read from its message, so the page can
 * say what to change. Input: the error message. Returns: age, market, username, invite or terms.
 * Internal: finish_social_sign_up().
 */
create or replace function public.sign_up_rule_of(message text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when message like '%age rules%' then 'age'
    when message like '%market rules%' then 'market'
    when message like '%username%' or message like '%profiles_handle%' then 'username'
    when message like '%invit%' then 'invite'
    else 'terms'
  end;
$$;
comment on function public.sign_up_rule_of(text) is
  'Internal: names the rule behind a sign-up refusal (S1-E2-09).';
revoke execute on function public.sign_up_rule_of(text) from public, anon, authenticated;

comment on function public.finish_social_sign_up(jsonb) is
  'Gives a new Google, Apple or Microsoft account its profile after the sign-up rules (S1-E2-09).';
revoke execute on function public.finish_social_sign_up(jsonb) from public, anon;
grant execute on function public.finish_social_sign_up(jsonb) to authenticated;

/**
 * cancel_social_sign_up: removes the signed-in provider account that has no profile yet: the
 * person pressed "Start again", a rule refused them, or they came to log in without an account.
 * Returns: nothing. Errors: insufficient_privilege when signed out; check_violation for an account
 *   that is already set up (that is account deletion, S1-E13-05).
 * Where it fits: src/features/auth/api/socialSignIn.ts.
 */
create or replace function public.cancel_social_sign_up()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;
  if not public.unfinished_social_account(caller) then
    raise exception 'Only an unfinished sign-up can be cancelled here.' using errcode = 'check_violation';
  end if;
  -- Nothing else points to an account without a profile; its identities and sessions go with it.
  delete from auth.users where users.id = caller;
end;
$$;
comment on function public.cancel_social_sign_up() is
  'Removes the caller''s unfinished Google, Apple or Microsoft sign-up (S1-E2-09).';
revoke execute on function public.cancel_social_sign_up() from public, anon;
grant execute on function public.cancel_social_sign_up() to authenticated;

/**
 * purge_unfinished_social_sign_ups: removes provider accounts that never got a profile, a day after
 * they were made (the browser closed at the provider, for example), so no email is kept without a
 * sign-up (GDPR art. 5(1)(e)). Returns: how many went. Internal: pg_cron, every hour.
 */
create or replace function public.purge_unfinished_social_sign_ups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from auth.users
  where users.created_at < now() - interval '1 day'
    and public.is_social_provider(users.raw_app_meta_data ->> 'provider')
    and not exists (select 1 from public.profiles where profiles.id = users.id);
  get diagnostics removed = row_count;
  return removed;
end;
$$;
comment on function public.purge_unfinished_social_sign_ups() is
  'Internal: removes provider accounts never finished after a day (S1-E2-09); pg_cron hourly.';
revoke execute on function public.purge_unfinished_social_sign_ups() from public, anon, authenticated;

select cron.schedule('purge-unfinished-social-sign-ups', '17 * * * *',
  'select public.purge_unfinished_social_sign_ups()');

/* ---------- Connecting a provider on purpose ---------- */

create table public.identity_link_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (public.is_social_provider(provider)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
comment on table public.identity_link_requests is
  'kind: user_action. A person''s "Connect Google, Apple or Microsoft" from Settings, valid for ten minutes; without one, a provider can''t join an account that is already set up (S1-E2-09, criterion 5).';
create unique index identity_link_requests_one_per_provider
  on public.identity_link_requests (user_id, provider);

alter table public.identity_link_requests enable row level security;

create policy identity_link_requests_select_own on public.identity_link_requests
  for select
  to authenticated
  using (user_id = auth.uid());
comment on policy identity_link_requests_select_own on public.identity_link_requests is
  'Allows a person to read only their own connect requests; nobody writes them directly (expect_identity_link()).';

grant select on public.identity_link_requests to authenticated;

/**
 * expect_identity_link: records that the signed-in person is about to connect a provider from
 * Settings, so the guard on auth.identities lets that one link through in the next ten minutes.
 * Input: wanted_provider ('google', 'apple' or 'azure'). Returns: nothing.
 * Errors: insufficient_privilege when signed out or without a profile; feature_not_supported while
 *   social_login is off; check_violation for another provider.
 * Where it fits: src/features/login-methods/api/loginMethods.ts, just before linkIdentity().
 */
create or replace function public.expect_identity_link(wanted_provider text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not exists (select 1 from public.profiles where profiles.id = caller) then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('social_login') then
    raise exception 'Sign-in with Google, Apple or Microsoft is off.' using errcode = 'feature_not_supported';
  end if;
  if not public.is_social_provider(wanted_provider) then
    raise exception 'Unknown provider.' using errcode = 'check_violation';
  end if;
  insert into public.identity_link_requests (user_id, provider)
  values (caller, wanted_provider)
  on conflict (user_id, provider) do update
    set updated_at = now(), expires_at = now() + interval '10 minutes';
end;
$$;
comment on function public.expect_identity_link(text) is
  'Lets the caller connect one provider from Settings in the next ten minutes (S1-E2-09).';
revoke execute on function public.expect_identity_link(text) from public, anon;
grant execute on function public.expect_identity_link(text) to authenticated;

/**
 * account_set_up_before_now: true when the account has a profile made before this transaction.
 * A password sign-up makes the profile and its email identity in one transaction, so that first
 * identity is part of the sign-up, not a later change. Input: the account. Internal.
 */
create or replace function public.account_set_up_before_now(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles
                 where profiles.id = target_user_id and profiles.created_at < now());
$$;
comment on function public.account_set_up_before_now(uuid) is
  'Internal: the account was set up in an earlier transaction (S1-E2-09).';
revoke execute on function public.account_set_up_before_now(uuid) from public, anon, authenticated;

/**
 * guard_identity_link: before Supabase Auth adds a Google, Apple or Microsoft identity to an
 * account that is already set up, it must have been asked for from Settings in the last ten
 * minutes; otherwise it is refused and the person is told to log in the usual way and connect it
 * (criterion 5: never merged silently). The request is used up. A new account's first identity,
 * and email identities, pass.
 * Trigger: before insert on auth.identities.
 */
create or replace function public.guard_identity_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used_request uuid;
begin
  if not public.is_social_provider(new.provider) or not public.account_set_up_before_now(new.user_id) then
    return new;
  end if;
  delete from public.identity_link_requests
  where identity_link_requests.user_id = new.user_id
    and identity_link_requests.provider = new.provider
    and identity_link_requests.expires_at > now()
  returning identity_link_requests.id into used_request;
  if used_request is null then
    raise exception 'identity_link_not_requested: log in the usual way and connect % in Settings.', new.provider
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
comment on function public.guard_identity_link() is
  'Trigger on auth.identities: a provider joins an existing account only when asked for from Settings (S1-E2-09).';
revoke execute on function public.guard_identity_link() from public, anon, authenticated;

create trigger guard_identity_link
  before insert on auth.identities
  for each row execute function public.guard_identity_link();

/* ---------- Telling the person ---------- */

/**
 * notify_login_method_change: tells the person in the app, and always by email, that a way to log
 * in was connected or disconnected (criterion 4). A new account's first way in, and an account
 * that is being deleted, are not news.
 * Trigger: after insert or delete on auth.identities and auth.webauthn_credentials.
 */
create or replace function public.notify_login_method_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_user uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
begin
  if not public.account_set_up_before_now(changed_user)
     or exists (select 1 from public.profiles where profiles.id = changed_user and profiles.deleted_at is not null) then
    return null;
  end if;
  perform public.notify(changed_user,
    case when tg_op = 'DELETE' then 'login_method_removed' else 'login_method_added' end::public.notification_kind,
    null, '{}'::jsonb);
  return null;
end;
$$;
comment on function public.notify_login_method_change() is
  'Trigger: notifies and emails a person when a way to log in is connected or disconnected (S1-E2-09).';
revoke execute on function public.notify_login_method_change() from public, anon, authenticated;

create trigger notify_login_method_change
  after insert or delete on auth.identities
  for each row execute function public.notify_login_method_change();
create trigger notify_passkey_change
  after insert or delete on auth.webauthn_credentials
  for each row execute function public.notify_login_method_change();

/**
 * email_delivery_for: as in S1-E7-02, plus the two login method kinds, which are always sent
 * (account and safety emails, like a moderation decision).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;

/**
 * notification_category: as in S1-E2-03, with the login method kinds under the team's chip
 * ("staff"): they are account notices from us, not from another member. Internal.
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
    else 'replies'
  end;
$$;

/* ---------- What Settings lists ---------- */

/**
 * my_login_methods: the signed-in person's ways to log in, for Settings › Ways to log in.
 * Returns: jsonb {outcome ok|signed_out, has_password, providers: ['google', …], passkeys: [{id,
 *   name, created_at, last_used_at}]}. Never the provider's email or user ID: the screen says only
 *   "Connected".
 * Where it fits: src/features/login-methods/api/loginMethods.ts.
 */
create or replace function public.my_login_methods()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not exists (select 1 from public.profiles where profiles.id = caller) then
    return jsonb_build_object('outcome', 'signed_out');
  end if;
  return jsonb_build_object(
    'outcome', 'ok',
    'has_password', (select coalesce(users.encrypted_password, '') <> '' from auth.users where users.id = caller),
    'providers', coalesce((select jsonb_agg(identities.provider order by identities.provider)
                           from auth.identities
                           where identities.user_id = caller and public.is_social_provider(identities.provider)),
                          '[]'::jsonb),
    'passkeys', coalesce((select jsonb_agg(jsonb_build_object('id', credentials.id,
                            'name', credentials.friendly_name, 'created_at', credentials.created_at,
                            'last_used_at', credentials.last_used_at) order by credentials.created_at)
                          from auth.webauthn_credentials as credentials
                          where credentials.user_id = caller), '[]'::jsonb));
end;
$$;
comment on function public.my_login_methods() is
  'The caller''s ways to log in, for Settings (S1-E2-09).';
revoke execute on function public.my_login_methods() from public;
grant execute on function public.my_login_methods() to anon, authenticated;
