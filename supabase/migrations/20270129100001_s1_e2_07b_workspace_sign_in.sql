-- S1-E2-07b: staff powers only after a Google Workspace sign-in on the staff domain (bundle 17
-- CHECK, part b; architecture 1.8.1 and 1.8.3; decided 17 Oct 2026, 11:53 and 12:47).
--
-- What it does:
-- - Reads the staff email domain from the Vault secret staff_email_domain (STAFF_EMAIL_DOMAIN in
--   the architecture; never written in code, CLAUDE.md "Names and domains are settings"). Robert
--   sets it at GO-LIVE (by-hand list, step 7.2). While it is missing, staff sign in as in March
--   (S1-E2-07a), so nothing changes until then.
-- - Once it is set, is_staff_session() is true only for a session that came from Google sign-in
--   (the token's "amr" lists "oauth") on an account linked to a Google Workspace account of that
--   domain: Google puts the Workspace domain in the "hd" claim, which a personal Google account
--   never has, even one made with a work address. Google's own 2-Step Verification, enforced in
--   the Workspace admin console, is the second factor (decided 17 Oct 2026, 11:53).
-- - admin_grant_role() then refuses an account without such a Google account, so a personal
--   writer account never holds a staff role (criterion 3).
-- - my_staff_sign_in() tells the admin shell when a staff member has to sign in with Google.
-- Every staff rule reaches is_staff_session() through staff_may() (S1-E2-07a), so this is the one
-- place the check changes.
-- Who calls it: staff_may() (every staff policy and admin_* function), the admin shell
-- (src/features/staff/api/staffAccess.ts) and the Roles page (admin_grant_role()).
-- Recovery: if the staff can't sign in after the secret is set, an owner deletes the secret in
-- Supabase's SQL editor (docs/runbooks/staff-sign-in.md); staff then sign in as in March.

/* ---------- The staff domain ---------- */

/**
 * staff_email_domain: the Google Workspace domain staff sign in with.
 * Returns: the Vault secret staff_email_domain, trimmed, in lower case and without a leading "@";
 *   null when it isn't set (the March behaviour, S1-E2-07a).
 * Where it fits: workspace_sign_in_holds() and the admin shell. Internal: only security definer
 *   functions call it.
 */
create or replace function public.staff_email_domain()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(ltrim(lower(trim(decrypted_secret)), '@'), '')
  from vault.decrypted_secrets
  where name = 'staff_email_domain'
  limit 1;
$$;

comment on function public.staff_email_domain() is
  'Internal: the staff Google Workspace domain from the Vault secret staff_email_domain, or null while it isn''t set (S1-E2-07b).';
revoke execute on function public.staff_email_domain() from public, anon, authenticated;

/**
 * has_workspace_account: is an account linked to a Google Workspace account of the staff domain?
 * Inputs: account_id, the account to look at; domain, the staff domain.
 * Returns: true when auth.identities holds a Google identity for the account whose "hd" claim
 *   (Google's Workspace domain; Supabase keeps it at the top level or under custom_claims) is the
 *   domain, and whose email is verified and on that domain.
 * Why "hd": anyone can make a personal Google account with a work address; only a Workspace
 *   account carries hd, so the check can't be met from outside the company's Workspace.
 * Internal.
 */
create or replace function public.has_workspace_account(account_id uuid, domain text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.identities
    where identities.user_id = account_id
      and identities.provider = 'google'
      and lower(coalesce(identities.identity_data ->> 'hd',
                         identities.identity_data -> 'custom_claims' ->> 'hd', '')) = domain
      and right(lower(coalesce(identities.identity_data ->> 'email', '')), length(domain) + 1) = '@' || domain
      and coalesce(identities.identity_data ->> 'email_verified', 'false') = 'true'
  );
$$;

comment on function public.has_workspace_account(uuid, text) is
  'Internal: true when the account has a verified Google Workspace identity on the domain (the hd claim; S1-E2-07b).';
revoke execute on function public.has_workspace_account(uuid, text) from public, anon, authenticated;

/**
 * workspace_sign_in_holds: does this session meet the Google Workspace rule?
 * Returns: true while the staff domain isn't set (March, S1-E2-07a); once it is, true only when
 *   this session signed in through a provider ("oauth" in the token's amr list) and the account
 *   has a Google Workspace identity on the domain (has_workspace_account()).
 * Where it fits: is_staff_session() and my_staff_sign_in(). Internal.
 */
create or replace function public.workspace_sign_in_holds()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  domain text := public.staff_email_domain();
begin
  -- Step 1: no domain yet means the March rule: any staff session counts.
  if domain is null then
    return true;
  end if;
  -- Step 2: this session must come from a provider sign-in, not a password or a link.
  if not coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method": "oauth"}]'::jsonb then
    return false;
  end if;
  -- Step 3: and the account must be linked to a Workspace account of the staff domain.
  return public.has_workspace_account((select auth.uid()), domain);
end;
$$;

comment on function public.workspace_sign_in_holds() is
  'Internal: true while no staff domain is set; then only for a provider sign-in on an account with a Google Workspace identity on the domain (S1-E2-07b).';
revoke execute on function public.workspace_sign_in_holds() from public, anon, authenticated;

/* ---------- The staff session ---------- */

/**
 * is_staff_session: true when this session may use staff powers.
 * Rules, all of them:
 * - the account holds a staff role (is_staff());
 * - the session is younger than the setting staff_session_hours (12, a proposal; S1-E11-01). A
 *   token without a session_id claim (only the forged claims of database tests) isn't
 *   time-limited; every real token has one;
 * - once the Vault secret staff_email_domain is set, the session came from Google sign-in on a
 *   Google Workspace account of that domain (workspace_sign_in_holds(); S1-E2-07b).
 * Where it fits: every staff rule reaches it through staff_may() (S1-E2-07a), so this is the one
 *   place the staff session is decided (architecture 1.8.3).
 */
create or replace function public.is_staff_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff()
    and coalesce(
      public.staff_session_started_at()
        > now() - make_interval(hours => coalesce(public.setting_value('staff_session_hours'), '12')::text::integer),
      true
    )
    and public.workspace_sign_in_holds();
$$;

comment on function public.is_staff_session() is
  'True when the session may use staff powers: a staff role, a session younger than staff_session_hours (S1-E11-01) and, once the Vault secret staff_email_domain is set, a Google Workspace sign-in on that domain (S1-E2-07b). Every staff rule reaches it through staff_may().';

/**
 * my_staff_sign_in: what the admin shell needs to ask a staff member to sign in with Google.
 * Returns: {"needs_workspace": true, "domain": "<domain>", "connected": <bool>} for a staff
 *   member whose session doesn't meet the Google Workspace rule, where connected says whether the
 *   account is already linked to a Workspace account (then they only need to sign in with
 *   Google); {"needs_workspace": false, "domain": null, "connected": false} for everyone else
 *   (members, and staff who already signed in with Google). The domain is only ever given to
 *   someone who holds a staff role.
 * Where it fits: src/features/staff/api/staffAccess.ts, read with my_staff_areas().
 */
create or replace function public.my_staff_sign_in()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_staff() and not public.workspace_sign_in_holds()
      then jsonb_build_object('needs_workspace', true, 'domain', public.staff_email_domain(),
        'connected', public.has_workspace_account((select auth.uid()), public.staff_email_domain()))
    else jsonb_build_object('needs_workspace', false, 'domain', null, 'connected', false)
  end;
$$;

comment on function public.my_staff_sign_in() is
  'For the admin shell: whether this staff member must sign in with their Google Workspace account, and on which domain (S1-E2-07b).';
revoke execute on function public.my_staff_sign_in() from public, anon;
grant execute on function public.my_staff_sign_in() to authenticated;

/* ---------- Granting a role ---------- */

/**
 * admin_grant_role: gives someone a staff role.
 * Inputs: target_user_id; granted_role; reason_given. Returns: true when granted, false when they
 *   already held it (nothing changes, nothing is logged).
 * Errors: see require_role_change_allowed() and require_role_in_reach(); check_violation once the
 *   staff domain is set and the account has no Google Workspace account on it (S1-E2-07b: a
 *   personal writer account never holds a staff role).
 * Where it fits: Staff › Roles (S1-E2-07a; moved into the admin shell by S1-E11-01).
 */
create or replace function public.admin_grant_role(
  target_user_id uuid,
  granted_role public.staff_role,
  reason_given text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
  domain text := public.staff_email_domain();
begin
  -- Step 1: who may do this, and to whom.
  perform public.require_role_change_allowed(target_user_id, reason_given);
  perform public.require_role_in_reach(granted_role);
  -- Step 2: once staff sign in through Google Workspace, only a Workspace account can be staff.
  if domain is not null and not public.has_workspace_account(target_user_id, domain) then
    -- The hint lets the Roles page name the problem (S1-E11-01b's one-reason-each rule).
    raise exception 'This account has not signed in with a Google Workspace account on the staff domain.'
      using errcode = 'check_violation', hint = 'no_workspace_account';
  end if;
  -- Step 3: grant it, once.
  insert into public.staff_roles (user_id, role, granted_by_user_id)
  values (target_user_id, granted_role, (select auth.uid()))
  on conflict (user_id, role) do nothing
  returning id into new_row_id;
  if new_row_id is null then
    return false;
  end if;
  -- Step 4: the audit log, in the same transaction.
  perform public.log_staff_action('staff.role_granted', 'staff_roles', new_row_id::text, target_user_id,
    reason_given, null, jsonb_build_object('role', granted_role));
  return true;
end;
$$;

comment on function public.admin_grant_role(uuid, public.staff_role, text) is
  'Gives someone a staff role, within the caller''s reach, with a reason; once the staff domain is set, only to an account with a Google Workspace identity on it; logged (S1-E2-07a, S1-E2-07b).';
