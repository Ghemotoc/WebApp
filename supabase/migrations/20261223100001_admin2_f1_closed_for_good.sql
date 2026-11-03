/*
 * Migration: closed for good, emails normalised before they are banned, disposable email domains
 * refused (bundle ADMIN-2, part f1; Robert's brief of 2 Nov 2026, section 6, from his 08:20 and
 * 08:21 messages).
 *
 * What it does:
 *   1. normalised_email(): the form of an email that is hashed for the banned list: lower case,
 *      trimmed, without a +tag, and for Gmail without dots (googlemail.com becomes gmail.com), so
 *      "Ana.Pop+2@googlemail.com" and "anapop@gmail.com" are the same address. banned_email_hash()
 *      now hashes that form.
 *   2. disposable_email_domains: the public list of throwaway email domains (CC0, kept in
 *      content/disposable-email-domains/, loaded by the next migration), the setting
 *      disposable_email_allow for domains to let through anyway, email_domain_allowed() for the
 *      sign-up form, and the sign-up trigger refusing such a domain.
 *   3. Closed for good: when a ban starts, the account's profile, stories, comments, forum posts
 *      and the forum threads only it posted in are hidden from everyone but staff, as moderated
 *      items linked to the ban (moderated_items.sanction_id). Nothing is deleted: the data stays
 *      under the retention schedule as evidence, and the nightly account purge skips a banned
 *      account. If the ban is lifted (on appeal, for example), exactly those items come back.
 *
 * Who calls it: Supabase applies it in order. What reads it: the sign-up trigger
 *   (handle_new_auth_user), admin_apply_sanction() and admin_lift_sanction() through the sanctions
 *   trigger, the sign-up form (src/features/auth/api/signUp.ts) and every public read that asks
 *   is_moderated_away().
 */

/* ---------- 1. Normalised emails ---------- */

/**
 * normalised_email: the form of an email that counts as "the same address" for the banned list.
 * Input: email. Returns: lower case and trimmed, without a +tag; for gmail.com and googlemail.com
 *   also without dots, on gmail.com (Gmail ignores both). Null for an empty email.
 * Why: a banned person must not come back by adding "+1" or a dot (brief section 6). Other
 *   providers treat dots as real characters, so only Gmail's are dropped.
 * Where it fits: banned_email_hash(), on every ban and every sign-up.
 */
create or replace function public.normalised_email(email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text := lower(btrim(coalesce(email, '')));
  local_part text;
  domain_part text;
begin
  -- Step 1: nothing to normalise, or not an address at all: keep what was given.
  if cleaned = '' then
    return null;
  end if;
  if position('@' in cleaned) = 0 then
    return cleaned;
  end if;
  -- Step 2: split at the last @ (the part after it is the domain).
  domain_part := substring(cleaned from '@([^@]*)$');
  local_part := left(cleaned, char_length(cleaned) - char_length(domain_part) - 1);
  -- Step 3: drop a +tag ("ana+2" is "ana").
  local_part := split_part(local_part, '+', 1);
  -- Step 4: Gmail ignores dots, and googlemail.com is the same mailbox as gmail.com.
  if domain_part in ('gmail.com', 'googlemail.com') then
    local_part := replace(local_part, '.', '');
    domain_part := 'gmail.com';
  end if;
  return local_part || '@' || domain_part;
end;
$$;
comment on function public.normalised_email(text) is
  'Internal: lower case, no +tag, no Gmail dots; the form hashed for the banned list (bundle ADMIN-2, part f1; brief section 6).';
revoke execute on function public.normalised_email(text) from public, anon, authenticated;

/**
 * banned_email_hash: as in S1-E10-06, but of the normalised email (part f1).
 * Input: email. Returns: 64 hex characters, or null when the secret isn't set or the email is
 *   empty.
 * Note: a hash made before this migration from an email with a +tag, capitals or Gmail dots no
 *   longer matches; the email itself is never kept, so those can't be made again (PR by-hand note).
 */
create or replace function public.banned_email_hash(email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
  normalised text := public.normalised_email(email);
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'banned_email_secret';
  if secret is null or secret = '' or normalised is null then
    return null;
  end if;
  return encode(extensions.hmac(normalised, secret, 'sha256'), 'hex');
end;
$$;
comment on function public.banned_email_hash(text) is
  'Internal: HMAC-SHA256 of the normalised email with the Vault secret banned_email_secret, or null without the secret (S1-E10-06, Q8; normalised since ADMIN-2 part f1).';
revoke execute on function public.banned_email_hash(text) from public, anon, authenticated;

/* ---------- 2. Disposable email domains ---------- */

create table public.disposable_email_domains (
  -- A domain on the public list, lower case (for example "mailinator.com"). Its subdomains count too.
  domain text primary key,
  created_at timestamptz not null default now(),
  constraint disposable_email_domains_shape check (domain ~ '^[a-z0-9.-]+$')
);

comment on table public.disposable_email_domains is
  'kind: platform
Throwaway email domains a new account can''t use, from the public CC0 list in content/disposable-email-domains/ (bundle ADMIN-2, part f1; brief section 6). Read only through email_domain_allowed() and the sign-up trigger.';

alter table public.disposable_email_domains enable row level security;

/**
 * Policy disposable_email_domains_select_settings: staff who may view the settings read the list,
 * so they can answer "why can't I sign up with this address?". Nobody else reads it; the sign-up
 * form asks email_domain_allowed() instead.
 */
create policy disposable_email_domains_select_settings
  on public.disposable_email_domains
  for select
  to authenticated
  using ((select public.staff_may('settings', 'view')));
comment on policy disposable_email_domains_select_settings on public.disposable_email_domains is
  'Allows staff who may view the settings to read the list of throwaway email domains (part f1).';

revoke all on public.disposable_email_domains from anon, authenticated;
grant select on public.disposable_email_domains to authenticated;

insert into public.settings (key, value, is_public, description) values
  ('disposable_email_allow', '[]'::jsonb, false,
   'Email domains to let through even though they are on the list of throwaway domains (bundle ADMIN-2, part f1).')
on conflict (key) do nothing;

/**
 * email_domain_allowed: can a new account use this email address's domain?
 * Input: email. Returns: false when the domain, or a domain it belongs to ("x.mailinator.com"
 *   belongs to "mailinator.com"), is on the throwaway list and not in the disposable_email_allow
 *   setting; true otherwise, also for something that isn't an address (the form checks that).
 * Where it fits: the sign-up form asks before it sends, so it can say so in plain words; the
 *   sign-up trigger asks again, so the rule holds whatever sends the sign-up.
 */
create or replace function public.email_domain_allowed(email text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  email_domain text := substring(lower(btrim(coalesce(email, ''))) from '@([^@]+)$');
  parts text[];
  candidates text[] := '{}';
  allowed jsonb := coalesce(public.setting_value('disposable_email_allow'), '[]'::jsonb);
begin
  -- Step 1: no domain, nothing to refuse.
  if email_domain is null then
    return true;
  end if;
  -- Step 2: a domain the team let through.
  if allowed ? email_domain then
    return true;
  end if;
  -- Step 3: the domain and every domain it belongs to ("a.b.c", "b.c"), never the bare ending.
  parts := string_to_array(email_domain, '.');
  for position_in_parts in 1 .. greatest(array_length(parts, 1) - 1, 1) loop
    candidates := candidates || array_to_string(parts[position_in_parts:], '.');
  end loop;
  return not exists (
    select 1 from public.disposable_email_domains
    where disposable_email_domains.domain = any (candidates)
  );
end;
$$;
comment on function public.email_domain_allowed(text) is
  'False for an email on a throwaway domain (or one of its subdomains) not let through by disposable_email_allow (bundle ADMIN-2, part f1).';
revoke execute on function public.email_domain_allowed(text) from public;
grant execute on function public.email_domain_allowed(text) to anon, authenticated;

/**
 * handle_new_auth_user: as in S1-E2-09, plus step 2b: a throwaway email domain can't sign up
 * (part f1). The whole sign-up is undone, nothing is stored.
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

  -- Step 2: a banned account's email can't come back (S1-E10-06; DSA art. 23), whatever +tag or
  -- Gmail dots it is written with (part f1).
  if public.is_email_banned(new.email) then
    raise exception 'This email address can''t be used to sign up.' using errcode = 'check_violation';
  end if;

  -- Step 2b: nor can a throwaway address (part f1; brief section 6).
  if not public.email_domain_allowed(new.email) then
    raise exception 'This email address can''t be used to sign up: it is a throwaway address.'
      using errcode = 'check_violation', hint = 'disposable_email';
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
  'Trigger on auth.users: refuses a banned email or a throwaway domain, then checks a sign-up and creates the profile, or leaves a provider account for finish_social_sign_up() (S1-E2-01, 02, 04, 09, 10, S1-E11-17, S1-E10-06, ADMIN-2 part f1).';

/* ---------- 3. Closed for good ---------- */

alter table public.moderated_items
  -- Cascade: these rows belong to the ban. Sanctions are never deleted in the app (no policy or
  -- function does it); only a test's clean-up removes one, and then its hiding goes with it.
  add column sanction_id uuid references public.sanctions (id) on delete cascade;
comment on column public.moderated_items.sanction_id is
  'The ban that hid this item when the account was closed for good; lifting the ban restores exactly these (part f1).';
create index moderated_items_by_sanction on public.moderated_items (sanction_id) where sanction_id is not null;

/**
 * banned_account_items: what a closed account shows to others, to be hidden.
 * Input: the account. Returns: item_type and item_id for its profile, its stories, its live
 *   comments and forum posts, and the forum threads nobody else has a live post in (a thread with
 *   other people's replies stays; only the account's own posts in it go).
 * Internal: hide_banned_account().
 */
create or replace function public.banned_account_items(target_user_id uuid)
returns table (item_type public.reportable_type, item_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select 'profile'::public.reportable_type, target_user_id
  union all
  select 'story'::public.reportable_type, stories.id from public.stories
  where stories.user_id = target_user_id and stories.deleted_at is null
  union all
  select 'comment'::public.reportable_type, comments.id from public.comments
  where comments.user_id = target_user_id and comments.deleted_at is null
  union all
  select 'forum_post'::public.reportable_type, forum_posts.id from public.forum_posts
  where forum_posts.user_id = target_user_id and forum_posts.deleted_at is null
  union all
  select 'forum_thread'::public.reportable_type, forum_threads.id from public.forum_threads
  where forum_threads.user_id = target_user_id and forum_threads.deleted_at is null
    and not exists (select 1 from public.forum_posts
                    where forum_posts.thread_id = forum_threads.id and forum_posts.user_id <> target_user_id
                      and forum_posts.deleted_at is null);
$$;
comment on function public.banned_account_items(uuid) is
  'Internal: the profile, stories, comments, forum posts and own-only threads of an account closed for good (part f1).';
revoke execute on function public.banned_account_items(uuid) from public, anon, authenticated;

/**
 * hide_banned_account: hides what a banned account shows to others, linked to the ban.
 * Input: the ban. Returns: how many items it hid. An item a moderator already hid or removed keeps
 *   its own row (and stays hidden if the ban is lifted).
 * Internal: the sanctions trigger, when a ban starts.
 */
create or replace function public.hide_banned_account(ban public.sanctions)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  hidden_count integer;
begin
  insert into public.moderated_items
    (user_id, item_type, item_id, state, case_id, moderated_by_user_id, note, sanction_id)
  select ban.user_id, items.item_type, items.item_id, 'hidden', ban.case_id, ban.applied_by_user_id,
         'Hidden because the account is closed for good.', ban.id
  from public.banned_account_items(ban.user_id) as items
  on conflict (item_type, item_id) where restored_at is null do nothing;
  get diagnostics hidden_count = row_count;
  return hidden_count;
end;
$$;
comment on function public.hide_banned_account(public.sanctions) is
  'Internal: hides a banned account''s profile and content, linked to the ban (part f1; brief section 6).';
revoke execute on function public.hide_banned_account(public.sanctions) from public, anon, authenticated;

/**
 * sanctions_close_for_good: the trigger behind "closed for good".
 * When a ban is added: its account's profile and content are hidden. When a ban is lifted:
 * exactly the items it hid come back, with the lift's reason. Other sanctions are left alone.
 * Where it fits: after insert or update on sanctions, whichever function applied or lifted it
 *   (admin_apply_sanction, admin_lift_sanction, an appeal decision).
 */
create or replace function public.sanctions_close_for_good()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'ban' then
    return null;
  end if;
  -- Step 1: a new ban hides the account.
  if tg_op = 'INSERT' and new.lifted_at is null then
    perform public.hide_banned_account(new);
  end if;
  -- Step 2: a lifted ban brings back what it hid.
  if tg_op = 'UPDATE' and old.lifted_at is null and new.lifted_at is not null then
    update public.moderated_items
    set restored_at = new.lifted_at, restored_by_user_id = new.lifted_by_user_id,
        restore_reason = coalesce(nullif(btrim(coalesce(new.lift_reason, '')), ''), 'The ban was lifted.')
    where moderated_items.sanction_id = new.id and moderated_items.restored_at is null;
  end if;
  return null;
end;
$$;
comment on function public.sanctions_close_for_good() is
  'Trigger: a ban hides the account''s profile and content; lifting it restores exactly those (part f1).';
revoke execute on function public.sanctions_close_for_good() from public, anon, authenticated;

create trigger sanctions_close_for_good
  after insert or update of lifted_at on public.sanctions
  for each row execute function public.sanctions_close_for_good();

/* Accounts banned before this migration are closed for good too. */
do $$
declare
  ban public.sanctions;
begin
  for ban in select * from public.sanctions where sanctions.kind = 'ban' and sanctions.lifted_at is null loop
    perform public.hide_banned_account(ban);
  end loop;
end;
$$;

/**
 * purge_closed_accounts: as in part e2b, and an account under a live ban is never deleted
 * (closed, never deleted: brief section 6). Its request stays open, so it is deleted on its date
 * if the ban is lifted.
 * Returns: how many accounts it deleted. Internal: run_retention_jobs().
 */
create or replace function public.purge_closed_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request record;
  deleted_count integer := 0;
begin
  for request in
    select account_deletions.id, account_deletions.user_id from public.account_deletions
    where account_deletions.delete_after <= now()
      and account_deletions.cancelled_at is null and account_deletions.completed_at is null
      -- Evidence about a child abuse image keeps the account (part e2b).
      and not exists (select 1 from public.abuse_image_evidence
                      where abuse_image_evidence.user_id = account_deletions.user_id)
      -- A banned account is closed, never deleted (part f1).
      and (public.active_sanction(account_deletions.user_id, 'ban')).id is null
    order by account_deletions.delete_after
  loop
    perform public.delete_account_data(request.user_id);
    update public.account_deletions set completed_at = now() where account_deletions.id = request.id;
    deleted_count := deleted_count + 1;
  end loop;
  return deleted_count;
end;
$$;
comment on function public.purge_closed_accounts() is
  'Nightly: deletes accounts whose 14 days have passed, except those with child abuse image evidence or a live ban (S1-E13-03, ADMIN-2 parts e2b and f1).';
revoke execute on function public.purge_closed_accounts() from public, anon, authenticated;
