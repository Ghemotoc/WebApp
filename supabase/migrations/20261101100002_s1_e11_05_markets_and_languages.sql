/*
 * Migration: markets and languages (story S1-E11-05; architecture 1.8.2 Settings, 1.8.3 "Markets:
 * open a market" is owner-only).
 *
 * What it adds:
 *   language_status, market_status, legal_check_status   the statuses the screen shows
 *   languages            one row per language a story can be written in (BCP 47 code), with its
 *                        status and whether the interface is in it (English and Română)
 *   staff_languages      which languages each staff member reads; a language opens only when a
 *                        moderator who reads it is on the rota (criterion 2)
 *   markets.status, markets.legal_check   Open, Ready to open or Closed, and the legal check;
 *                        markets.is_open now follows status, so sign-up (S1-E2-10) is unchanged
 *   language_moderator_counts()    how many moderators read each language
 *   admin_set_language_status(), admin_set_market(), admin_set_staff_languages()
 *   open_story_languages()         now the open languages (criterion 5)
 *   story_language_choices()       every language with whether it can be chosen yet
 * Rules (the story; decided 16 Oct 2026, Q19; 17 Oct 2026, 11:48):
 *   - a language opens only when at least one moderator who reads it is on the rota;
 *   - a market is Ready to open or Open only once its legal check is done, and Open only with at
 *     least one open language; opening a market is for the owner (architecture 1.8.3);
 *   - Australia is open to people 16 and over only (markets.minimum_age, S1-E2-10).
 * "On the rota" for March means a staff member who acts on moderation (owner, admin, moderator)
 * and reads the language; the on-call rota (S1-E10-09) is for removal orders only.
 */

create type public.language_status as enum ('open', 'ready', 'closed');
create type public.market_status as enum ('open', 'ready', 'closed');
create type public.legal_check_status as enum ('not_started', 'in_progress', 'done');

comment on type public.language_status is 'Open, Ready to open or Closed (S1-E11-05).';
comment on type public.market_status is 'Open, Ready to open or Closed (S1-E11-05).';
comment on type public.legal_check_status is 'A market''s legal check: not started, in progress or done (S1-E11-05).';

/* ---------- Languages ---------- */

create table public.languages (
  id uuid primary key default gen_random_uuid(),
  -- A BCP 47 code: 'ro', 'en', later regional ones such as 'en-GB' (architecture 1.8.6).
  code text not null unique,
  status public.language_status not null default 'closed',
  -- The interface is in English and Română only; other languages are for stories (criterion 6).
  is_interface boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint languages_code_is_bcp47 check (code ~ '^[a-z]{2,3}(-[A-Z]{2})?$')
);

comment on table public.languages is
  'kind: platform
Story and interface languages with their status; a language opens only with a moderator who reads it (S1-E11-05).';

create trigger languages_set_updated_at
  before update on public.languages
  for each row execute function public.set_updated_at();

alter table public.languages enable row level security;

/**
 * Policy languages_select_public: anyone, signed out included, reads the languages.
 * Why: the new story form shows which languages can be chosen and which are coming (criterion 5).
 */
create policy languages_select_public
  on public.languages for select to anon, authenticated
  using (true);

comment on policy languages_select_public on public.languages is
  'Allows anyone to read the languages and their status; nothing in it is personal (S1-E11-05).';

-- Reads only; changes go through admin_set_language_status().
grant select on public.languages to anon, authenticated;  -- languages_select_public

insert into public.languages (code, status, is_interface) values
  ('ro', 'open', true),
  ('en', 'open', true);

/* ---------- Who reads which language ---------- */

create table public.staff_languages (
  id uuid primary key default gen_random_uuid(),
  -- The staff member who reads the language.
  user_id uuid not null references public.profiles (id) on delete cascade,
  language_code text not null references public.languages (code) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_languages_once_per_person unique (user_id, language_code)
);

comment on table public.staff_languages is
  'kind: platform
The languages each staff member reads, so a language opens only when a moderator reads it (S1-E11-05).';

create trigger staff_languages_set_updated_at
  before update on public.staff_languages
  for each row execute function public.set_updated_at();

alter table public.staff_languages enable row level security;

/**
 * Policy staff_languages_select_admin: owner and admin, in a staff session, read who reads what.
 * Why: they manage roles and open languages (architecture 1.8.3); nobody else needs the list.
 */
create policy staff_languages_select_admin
  on public.staff_languages for select to authenticated
  using ((select public.staff_may('roles', 'view')));

comment on policy staff_languages_select_admin on public.staff_languages is
  'Allows owner and admin, in a staff session, to read which languages staff read (S1-E11-05).';

grant select on public.staff_languages to authenticated;  -- staff_languages_select_admin

-- The seeded staff read both languages, so Română and English have moderators.
insert into public.staff_languages (user_id, language_code)
select staff_roles.user_id, languages.code
from public.staff_roles cross join public.languages
where staff_roles.role in ('owner', 'admin', 'moderator')
on conflict do nothing;

/* ---------- Markets ---------- */

alter table public.markets
  add column status public.market_status not null default 'closed',
  add column legal_check public.legal_check_status not null default 'not_started';

comment on column public.markets.status is 'Open, Ready to open or Closed; is_open follows it (S1-E11-05).';
comment on column public.markets.legal_check is 'The market''s legal check before it opens (S1-E11-05; research H1).';

update public.markets set status = 'open', legal_check = 'done' where is_open;

insert into public.markets (country_code, is_open, minimum_age, languages, status, legal_check) values
  ('SG', false, 13, '{en}', 'closed', 'not_started')
on conflict (country_code) do nothing;

/**
 * keep_market_is_open: keeps markets.is_open equal to status = 'open', so the sign-up rules
 * (S1-E2-10) and the metrics (S1-E15-02) that read is_open follow the screen. Trigger function.
 */
create or replace function public.keep_market_is_open()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_open := new.status = 'open';
  return new;
end;
$$;

comment on function public.keep_market_is_open() is 'Trigger: markets.is_open follows status (S1-E11-05).';

create trigger markets_keep_is_open
  before insert or update on public.markets
  for each row execute function public.keep_market_is_open();

/* ---------- Counting moderators ---------- */

/**
 * language_moderator_counts: how many moderators read each language.
 * Returns: one row per language: code, status, is_interface, moderators (staff with the owner,
 *   admin or moderator role who read it).
 * Who may call it: owner and admin in a staff session; others get no rows. Security definer so it
 *   can count roles without showing who holds them.
 */
create or replace function public.language_moderator_counts()
returns table (code text, status public.language_status, is_interface boolean, moderators integer)
language sql
stable
security definer
set search_path = ''
as $$
  select languages.code, languages.status, languages.is_interface,
    (select count(distinct staff_languages.user_id)::integer
     from public.staff_languages
     join public.staff_roles on staff_roles.user_id = staff_languages.user_id
     where staff_languages.language_code = languages.code
       and staff_roles.role in ('owner', 'admin', 'moderator'))
  from public.languages
  where public.staff_may('settings', 'view')
  order by languages.is_interface desc, languages.code;
$$;

comment on function public.language_moderator_counts() is
  'Each language with how many moderators read it; owner and admin only (S1-E11-05).';
revoke execute on function public.language_moderator_counts() from public, anon;
grant execute on function public.language_moderator_counts() to authenticated;

/* ---------- Changing a language ---------- */

/**
 * admin_set_language_status: opens, readies or closes a language (criteria 1 and 2).
 * Inputs: language_code, for example 'ro'; new_status.
 * Returns: the new status.
 * Errors: insufficient_privilege (require_settings_staff()); no_data_found for an unknown
 *   language; check_violation when opening, or readying, a language no moderator reads, or closing
 *   one the interface is in. Logged as settings.language_status.
 */
create or replace function public.admin_set_language_status(language_code text, new_status public.language_status)
returns public.language_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.languages;
  moderator_count integer;
begin
  perform public.require_settings_staff();
  select * into target from public.languages where code = language_code for update;
  if target.id is null then
    raise exception 'There is no such language.' using errcode = 'no_data_found';
  end if;
  -- Step 1: the interface languages stay open: every screen is written in them.
  if target.is_interface and new_status <> 'open' then
    raise exception 'The interface is in this language, so it stays open.' using errcode = 'check_violation', hint = 'interface_language';
  end if;
  -- Step 2: criterion 2: a language opens only with a moderator who reads it.
  select moderators into moderator_count from public.language_moderator_counts() where code = language_code;
  if new_status <> 'closed' and coalesce(moderator_count, 0) = 0 then
    raise exception 'No moderator who reads this language is on the rota yet.' using errcode = 'check_violation', hint = 'no_moderator';
  end if;
  update public.languages set status = new_status where id = target.id;
  perform public.log_staff_action('settings.language_status', 'languages', target.code, null, null,
    jsonb_build_object('status', target.status), jsonb_build_object('status', new_status));
  return new_status;
end;
$$;

comment on function public.admin_set_language_status(text, public.language_status) is
  'Opens, readies or closes a language; refused without a moderator who reads it; logged (S1-E11-05).';
revoke execute on function public.admin_set_language_status(text, public.language_status) from public, anon;
grant execute on function public.admin_set_language_status(text, public.language_status) to authenticated;

/* ---------- Changing a market ---------- */

/**
 * market_change_problem: why a market can't take this status and legal check, or null. Internal.
 * Returns: legal_check_not_done, owner_only or no_open_language; null when the change is fine.
 * Rules (criterion 3): Ready to open and Open need the legal check done; Open also needs at least
 * one of the market's languages open, and only the owner opens a market (architecture 1.8.3).
 */
create or replace function public.market_change_problem(
  target public.markets,
  new_status public.market_status,
  new_legal_check public.legal_check_status
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if new_status <> 'closed' and new_legal_check <> 'done' then
    return 'legal_check_not_done';
  end if;
  if new_status = 'open' and target.status <> 'open' and not public.staff_may('open_market', 'act') then
    return 'owner_only';
  end if;
  if new_status = 'open' and not exists (
    select 1 from public.languages where languages.code = any (target.languages) and languages.status = 'open') then
    return 'no_open_language';
  end if;
  return null;
end;
$$;

comment on function public.market_change_problem(public.markets, public.market_status, public.legal_check_status) is
  'Internal: why a market can''t take a status and legal check, or null (S1-E11-05).';
revoke execute on function public.market_change_problem(public.markets, public.market_status, public.legal_check_status)
  from public, anon, authenticated;

/**
 * admin_set_market: changes a market's status and legal check (criteria 1 and 3).
 * Inputs: market_country, for example 'GB'; new_status; new_legal_check.
 * Returns: the new status.
 * Errors: insufficient_privilege (not owner or admin; or an admin opening a market, which is the
 *   owner's); no_data_found for an unknown market; check_violation, with the reason, when the
 *   legal check isn't done or no language is open. Logged as settings.market.
 */
create or replace function public.admin_set_market(
  market_country text,
  new_status public.market_status,
  new_legal_check public.legal_check_status
)
returns public.market_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.markets;
  problem text;
begin
  perform public.require_settings_staff();
  select * into target from public.markets where country_code = upper(market_country) for update;
  if target.id is null then
    raise exception 'There is no such market.' using errcode = 'no_data_found';
  end if;
  -- Step 1: the rules; opening without the owner's right is a privilege problem, not a value one.
  problem := public.market_change_problem(target, new_status, new_legal_check);
  if problem = 'owner_only' then
    raise exception 'Only the owner opens a market.' using errcode = 'insufficient_privilege', hint = problem;
  elsif problem is not null then
    raise exception 'This market can''t take that status (%).', problem using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 2: the change (is_open follows by trigger) and its log line.
  update public.markets set status = new_status, legal_check = new_legal_check where id = target.id;
  perform public.log_staff_action('settings.market', 'markets', target.country_code, null, null,
    jsonb_build_object('status', target.status, 'legal_check', target.legal_check),
    jsonb_build_object('status', new_status, 'legal_check', new_legal_check));
  return new_status;
end;
$$;

comment on function public.admin_set_market(text, public.market_status, public.legal_check_status) is
  'Changes a market''s status and legal check; opening is the owner''s; logged (S1-E11-05).';
revoke execute on function public.admin_set_market(text, public.market_status, public.legal_check_status) from public, anon;
grant execute on function public.admin_set_market(text, public.market_status, public.legal_check_status) to authenticated;

/* ---------- Which languages a staff member reads ---------- */

/**
 * admin_set_staff_languages: records the languages a staff member reads.
 * Inputs: target_user_id, a staff member; language_codes, the full new list.
 * Returns: how many languages they now read.
 * Errors: insufficient_privilege unless the caller manages roles (owner, admin); check_violation
 *   when the person holds no staff role or a code is unknown. Logged as settings.staff_languages.
 */
create or replace function public.admin_set_staff_languages(target_user_id uuid, language_codes text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  codes_before jsonb;
begin
  if not public.staff_may('roles', 'act') then
    raise exception 'Only the owner and admins record which languages staff read.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.staff_roles where user_id = target_user_id) then
    raise exception 'This person isn''t staff.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(language_codes) as wanted where wanted not in (select code from public.languages)) then
    raise exception 'One of those languages isn''t on the list.' using errcode = 'check_violation';
  end if;
  -- Replace the whole list, logging it before and after.
  select coalesce(jsonb_agg(language_code order by language_code), '[]'::jsonb) into codes_before
  from public.staff_languages where user_id = target_user_id;
  delete from public.staff_languages where user_id = target_user_id;
  insert into public.staff_languages (user_id, language_code)
  select distinct target_user_id, wanted from unnest(language_codes) as wanted;
  perform public.log_staff_action('settings.staff_languages', 'staff_languages', target_user_id::text, target_user_id, null,
    jsonb_build_object('languages', codes_before),
    jsonb_build_object('languages', (select coalesce(jsonb_agg(distinct wanted order by wanted), '[]'::jsonb) from unnest(language_codes) as wanted)));
  return (select count(*)::integer from public.staff_languages where user_id = target_user_id);
end;
$$;

comment on function public.admin_set_staff_languages(uuid, text[]) is
  'Records the languages a staff member reads; owner and admin only; logged (S1-E11-05).';
revoke execute on function public.admin_set_staff_languages(uuid, text[]) from public, anon;
grant execute on function public.admin_set_staff_languages(uuid, text[]) to authenticated;

/* ---------- Story languages (criterion 5) ---------- */

/**
 * open_story_languages: the languages a story may be written in today.
 * Returns: the open languages, as BCP 47 codes, interface languages first.
 * Why: a language opens only when moderators who read it are on the rota (criterion 2); this used
 *   to read the open markets' languages until S1-E11-05 gave languages their own status.
 * Where it fits: create_story() refuses any other language.
 */
create or replace function public.open_story_languages()
returns setof text
language sql
stable
set search_path = ''
as $$
  select languages.code from public.languages
  where languages.status = 'open'
  order by languages.is_interface desc, languages.code;
$$;

comment on function public.open_story_languages() is
  'The open languages, the only ones a story may be written in (S1-E3-01, S1-E11-05).';

/**
 * story_language_choices: every language, with whether a writer can choose it yet.
 * Returns: code and is_open, interface languages first. The form shows closed ones as "Coming when
 *   we have moderators for it" (criterion 5). Anyone may call it.
 */
create or replace function public.story_language_choices()
returns table (code text, is_open boolean)
language sql
stable
set search_path = ''
as $$
  select languages.code, languages.status = 'open'
  from public.languages
  order by languages.is_interface desc, languages.code;
$$;

comment on function public.story_language_choices() is
  'Every language with whether a story may be written in it yet (S1-E11-05).';
grant execute on function public.story_language_choices() to anon, authenticated;
