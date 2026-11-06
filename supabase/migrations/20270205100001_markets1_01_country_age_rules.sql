-- Migration: one table of age rules by country, which staff can change without a release
-- (bundle MARKETS-1, story S1-E2-21).
--
-- Why: on 6 Nov 2026 Robert decided the first launch is in Romanian and English together, for
-- Romanian speakers everywhere and every English-speaking country (go-ahead for this bundle, 6 Nov
-- 2026, 10:19 UTC: "Yes, they should know the country"). Until now the app used Romania's 16 as
-- the age of digital consent everywhere. Other countries differ (13 in the UK and US, 14 in
-- Quebec, 18 in India), and some limit social media for the young.
--
-- What it adds:
--   country_age_rules           one row per country, or per region where a region has its own law
--                               (Quebec, some US states): the minimum age to join, the age below
--                               which a parent must consent (GDPR art. 8 and local equivalents),
--                               the age below which sign-up is refused (blank = never), the source,
--                               the date it was checked, a confidence and a status. Row "ZZ" is the
--                               default for any country not listed: 13 to join, a parent's consent
--                               below 16 (the strictest GDPR setting; brief MARKETS-1).
--   age_rule_for()              the row that applies to a country and region: the region's row,
--                               else the country's, else the default
--   youngest_age()              the youngest age someone born in a year (and month) can be today
--   age_rule_outcome()          what the rule means for one person: ok, consent_needed,
--                               under_minimum or blocked
--   age_rule_needs_review()     a row checked over six months ago, or with low confidence
--   admin_save_age_rule()       staff with Settings (owner, admin) add or change a row; audited
--                               with the values before and after (criterion 2)
--
-- Who calls it: sign-up and Settings (S1-E2-20), the account gate (S1-E2-22, next migration),
-- Staff › Settings › Age rules by country and the Legal centre's "Ages by country" table
-- (S1-E2-23).
-- Ground rules (brief MARKETS-1): the safety rules (the 16 split for spaces, messages with adults,
-- picture review, ratings) are product policy and stay the same everywhere. Only these three ages
-- vary by country. Every value is seed data "to verify" until a lawyer confirms it.

/* ---------- Table ---------- */

create table public.country_age_rules (
  id uuid primary key default gen_random_uuid(),
  -- ISO 3166-1 alpha-2; "ZZ" (the code ISO leaves for "unknown") is the default row.
  country_code text not null,
  -- A region with its own law (ISO 3166-2 subdivision without the country, for example "QC"),
  -- or '' for the whole country.
  region_code text not null default '',
  -- The name staff see, in English (the app shows country names from the browser's own list).
  name text not null,
  -- The region's own name, shown when someone picks their region ('' for a whole country).
  region_name text not null default '',
  -- The youngest age that may join (13 everywhere today; the platform never admits under-13s).
  minimum_age smallint not null default 13,
  -- A parent or guardian must consent below this age (GDPR art. 8 and local equivalents).
  parental_consent_below smallint not null default 16,
  -- Sign-up is refused below this age; null means never (for example Australia's 16, Q19).
  signup_blocked_below smallint,
  -- The law or rule the values come from, and where we read it.
  legal_basis text not null default '',
  source text not null default '',
  -- When someone last checked the values against the law.
  date_checked date not null,
  confidence text not null default 'medium',
  -- to_verify until a lawyer confirms the row; verified after.
  status text not null default 'to_verify',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint country_age_rules_country_shape check (country_code ~ '^[A-Z]{2}$'),
  constraint country_age_rules_region_shape check (region_code ~ '^([A-Z0-9]{1,3})?$'),
  constraint country_age_rules_one_row unique (country_code, region_code),
  constraint country_age_rules_name_size check (char_length(btrim(name)) between 1 and 100),
  constraint country_age_rules_region_name check (
    (region_code = '' and region_name = '') or (region_code <> '' and char_length(btrim(region_name)) between 1 and 60)
  ),
  constraint country_age_rules_ages check (
    minimum_age between 13 and 18
    and parental_consent_below between 13 and 18
    and parental_consent_below >= minimum_age
    and (signup_blocked_below is null or signup_blocked_below between 13 and 18)
  ),
  constraint country_age_rules_confidence_known check (confidence in ('high', 'medium', 'low')),
  constraint country_age_rules_status_known check (status in ('to_verify', 'verified')),
  constraint country_age_rules_texts_size check (
    char_length(legal_basis) <= 300 and char_length(source) <= 500 and char_length(notes) <= 1000
  ),
  constraint country_age_rules_default_is_whole check (country_code <> 'ZZ' or region_code = '')
);

comment on table public.country_age_rules is
  'kind: platform
Age rules by country or region: minimum age, parental consent below, sign-up blocked below, with source, date checked, confidence and status; "ZZ" is the default (MARKETS-1, S1-E2-21).';

create trigger country_age_rules_set_updated_at
  before update on public.country_age_rules
  for each row execute function public.set_updated_at();

alter table public.country_age_rules enable row level security;

/**
 * Policy country_age_rules_select_public: anyone, signed out included, reads the age rules.
 * Why: the sign-up form says what applies before anyone types their age, and the Legal centre
 * shows every country's ages (S1-E2-23). Nothing here is personal or secret.
 */
create policy country_age_rules_select_public
  on public.country_age_rules
  for select
  to anon, authenticated
  using (true);

comment on policy country_age_rules_select_public on public.country_age_rules is
  'Allows anyone, signed out included, to read the age rules by country; nothing in it is personal (MARKETS-1).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): anyone may read.
-- Rows change only through admin_save_age_rule() (audited), so nobody gets a write privilege.
revoke all on public.country_age_rules from anon, authenticated;
grant select on public.country_age_rules to anon, authenticated;  -- country_age_rules_select_public

/* ---------- Reading the rules ---------- */

/**
 * age_rule_for: the rule that applies to someone who lives in a country (and region).
 * Inputs: country_code (ISO alpha-2, or null when unknown); region_code (or null/'').
 * Returns: the region's row when there is one, else the country's, else the default row "ZZ".
 */
create or replace function public.age_rule_for(country_code text, region_code text default '')
returns public.country_age_rules
language sql
stable
security definer
set search_path = ''
as $$
  select rules.*
  from public.country_age_rules as rules
  where (rules.country_code = upper(coalesce(age_rule_for.country_code, ''))
         and rules.region_code in ('', upper(coalesce(age_rule_for.region_code, ''))))
     or rules.country_code = 'ZZ'
  -- The most specific row first: the region, then the country, then the default.
  order by (rules.country_code = 'ZZ'), (rules.region_code = '')
  limit 1;
$$;

comment on function public.age_rule_for(text, text) is
  'The age rule for a country and region: the region''s row, else the country''s, else the default "ZZ" (MARKETS-1).';

/**
 * youngest_age: the youngest age someone can be today, from their year (and month) of birth.
 * Inputs: birth_year; birth_month (null when it wasn't needed, CLAUDE.md rule 5); on_date.
 * Returns: the age in whole years, assuming the latest birthday the answers allow; null without
 *   a year. Why the youngest: a rule that protects children must not be skipped by a guess.
 */
create or replace function public.youngest_age(birth_year integer, birth_month integer, on_date date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when birth_year is null then null
    when birth_month is null or extract(month from on_date)::integer <= birth_month
      then extract(year from on_date)::integer - birth_year - 1
    else extract(year from on_date)::integer - birth_year
  end;
$$;

comment on function public.youngest_age(integer, integer, date) is
  'The youngest age someone born in a year (and month) can be on a date (MARKETS-1).';

/**
 * age_rule_outcome: what a country's rule means for one person.
 * Inputs: birth_year, birth_month (as stored), country_code, region_code.
 * Returns: 'blocked' (under the age below which sign-up is refused), 'under_minimum' (under the
 *   minimum age to join), 'consent_needed' (a parent must consent) or 'ok'; 'unknown' without a
 *   year of birth.
 */
create or replace function public.age_rule_outcome(
  birth_year integer,
  birth_month integer,
  country_code text,
  region_code text default ''
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rule public.country_age_rules := public.age_rule_for(country_code, region_code);
  age integer := public.youngest_age(birth_year, birth_month, (now() at time zone 'Europe/Bucharest')::date);
begin
  if age is null then
    return 'unknown';
  end if;
  if rule.signup_blocked_below is not null and age < rule.signup_blocked_below then
    return 'blocked';
  end if;
  if age < rule.minimum_age then
    return 'under_minimum';
  end if;
  if age < rule.parental_consent_below then
    return 'consent_needed';
  end if;
  return 'ok';
end;
$$;

comment on function public.age_rule_outcome(integer, integer, text, text) is
  'What a country''s age rule means for someone: blocked, under_minimum, consent_needed or ok (MARKETS-1).';

/**
 * age_rule_needs_review: whether staff should look at a row again (criterion 3).
 * Input: one row. Returns: true when its confidence is low or it was checked over six months ago.
 */
create or replace function public.age_rule_needs_review(rule public.country_age_rules)
returns boolean
language sql
stable
set search_path = ''
as $$
  select rule.confidence = 'low' or rule.date_checked < (now() - interval '6 months')::date;
$$;

comment on function public.age_rule_needs_review(public.country_age_rules) is
  'True when an age rule has low confidence or was checked more than six months ago (MARKETS-1).';

/* ---------- Changing the rules ---------- */

/**
 * admin_save_age_rule: adds a row or changes one, for owner and admin (the Settings area).
 * Input: rule, a JSON object with country_code, region_code, name, region_name, minimum_age,
 *   parental_consent_below, signup_blocked_below (null for never), legal_basis, source,
 *   date_checked, confidence, status and notes; and reason, why it changed (required).
 * Returns: the row's ID.
 * Errors: insufficient_privilege unless the caller may act on Settings in a staff session;
 *   check_violation (with the constraint's name) when a value is out of range; the default row
 *   can be changed but never moved to another code.
 * Audit (criterion 2): who, when, the values before and after, in the same transaction.
 * Where it fits: Staff › Settings › Age rules by country. The change applies to new sign-ups at
 *   once; members it newly asks for a parent's consent get a grace period (next migration).
 */
create or replace function public.admin_save_age_rule(rule jsonb, reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted_country text := upper(btrim(coalesce(rule ->> 'country_code', '')));
  wanted_region text := upper(btrim(coalesce(rule ->> 'region_code', '')));
  before_row public.country_age_rules;
  after_row public.country_age_rules;
begin
  -- Step 1: owner and admin only, in a staff session, with a reason.
  if not public.staff_may('settings', 'act') then
    raise exception 'Only an owner or admin can change the age rules.' using errcode = 'insufficient_privilege';
  end if;
  if char_length(btrim(coalesce(reason, ''))) = 0 then
    raise exception 'Say why the rule changes.' using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 2: the row as it was, if any.
  select * into before_row from public.country_age_rules
  where country_age_rules.country_code = wanted_country and country_age_rules.region_code = wanted_region
  for update;
  -- Step 3: write it; the table's checks refuse values out of range.
  insert into public.country_age_rules as rules (country_code, region_code, name, region_name,
    minimum_age, parental_consent_below, signup_blocked_below, legal_basis, source, date_checked,
    confidence, status, notes)
  values (wanted_country, wanted_region, btrim(coalesce(rule ->> 'name', '')),
    btrim(coalesce(rule ->> 'region_name', '')),
    (rule ->> 'minimum_age')::smallint, (rule ->> 'parental_consent_below')::smallint,
    nullif(rule ->> 'signup_blocked_below', '')::smallint,
    btrim(coalesce(rule ->> 'legal_basis', '')), btrim(coalesce(rule ->> 'source', '')),
    coalesce((rule ->> 'date_checked')::date, current_date),
    coalesce(rule ->> 'confidence', 'medium'), coalesce(rule ->> 'status', 'to_verify'),
    btrim(coalesce(rule ->> 'notes', '')))
  on conflict (country_code, region_code) do update set
    name = excluded.name, region_name = excluded.region_name, minimum_age = excluded.minimum_age,
    parental_consent_below = excluded.parental_consent_below,
    signup_blocked_below = excluded.signup_blocked_below, legal_basis = excluded.legal_basis,
    source = excluded.source, date_checked = excluded.date_checked,
    confidence = excluded.confidence, status = excluded.status, notes = excluded.notes
  returning * into after_row;
  -- Step 4: the audit row, with the values before and after.
  perform public.log_staff_action('age_rule.saved', 'country_age_rules', after_row.id::text, null,
    btrim(reason),
    case when before_row.id is null then null else to_jsonb(before_row) - 'created_at' - 'updated_at' end,
    to_jsonb(after_row) - 'created_at' - 'updated_at');
  return after_row.id;
end;
$$;

comment on function public.admin_save_age_rule(jsonb, text) is
  'Owner and admin add or change an age rule by country; audited with before and after (MARKETS-1, S1-E2-21).';

/* ---------- Function privileges ---------- */

revoke execute on function public.age_rule_for(text, text) from public;
revoke execute on function public.youngest_age(integer, integer, date) from public;
revoke execute on function public.age_rule_outcome(integer, integer, text, text) from public;
revoke execute on function public.age_rule_needs_review(public.country_age_rules) from public;
revoke execute on function public.admin_save_age_rule(jsonb, text) from public, anon;
-- The sign-up form asks what a year of birth means where someone lives, before they have an
-- account, so the three readers are open to everyone; they say nothing about anyone.
grant execute on function public.age_rule_for(text, text) to anon, authenticated;
grant execute on function public.youngest_age(integer, integer, date) to anon, authenticated;
grant execute on function public.age_rule_outcome(integer, integer, text, text) to anon, authenticated;
grant execute on function public.age_rule_needs_review(public.country_age_rules) to anon, authenticated;
grant execute on function public.admin_save_age_rule(jsonb, text) to authenticated;
