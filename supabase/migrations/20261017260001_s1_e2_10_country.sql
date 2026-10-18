-- The country from the connection, and markets (story S1-E2-10; architecture B11).
--
-- What it adds:
--   markets                       one row per country: open or not, its minimum age and its
--                                 languages (BCP 47). Romania is open; the English-speaking
--                                 countries are closed until their legal check (decided 17 Oct
--                                 2026, 11:48). Changed by migration until S1-E11-05.
--   profiles.country_code         the two-letter code from the connection, never asked (Q20)
--   verified_signup_country()     checks the signed token from /api/signup-context
--   sign_up_market_outcome()      the form's question: may someone this old join from here?
--   handle_new_auth_user()        now stores the country and applies the market rules
-- Rules (story S1-E2-10; decided 16 Oct 2026, Q19 and Q20; 17 Oct 2026, 19:43, Q6):
--   - only the two-letter code is stored, never the IP address;
--   - the country comes in a token signed by our Cloudflare Pages Function (HMAC-SHA256, 10
--     minutes), so a browser can't simply claim a country; the secret is in Supabase Vault as
--     signup_context_secret (set by hand) and in Cloudflare as SIGNUP_CONTEXT_SECRET;
--   - while invite_only and adults_only are both on (the March test), a valid invite admits
--     someone from any country, unknown, VPN and Tor included (Q6b, Q6c);
--   - once sign-up opens to the public, closed markets are refused ("not open in your country
--     yet"), an unknown country counts as closed, and under-16s in Australia are refused (Q19).
-- VPNs make the country approximate, so it is never used alone for age or legal eligibility.

/* ---------- Markets ---------- */

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  is_open boolean not null default false,
  -- The youngest age that may join from this country (13 everywhere; 16 in Australia, Q19).
  minimum_age integer not null default 13,
  -- The interface and website languages of this market, as BCP 47 codes (architecture 1.8.6).
  languages text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint markets_country_code_is_alpha2 check (country_code ~ '^[A-Z]{2}$'),
  constraint markets_minimum_age_is_plausible check (minimum_age between 13 and 18)
);

comment on table public.markets is
  'kind: platform
Countries: open or not, minimum age and languages (S1-E2-10, architecture B11). Changed by migration until S1-E11-05.';

create trigger markets_set_updated_at
  before update on public.markets
  for each row execute function public.set_updated_at();

alter table public.markets enable row level security;

/**
 * Policy markets_select_public: anyone, signed out included, reads the markets.
 * Why: the sign-up form says whether someone's country is open before they type anything, and
 * the CMS and the home page pick the visitor's market (architecture 1.8.6). Nothing here is
 * personal or secret.
 */
create policy markets_select_public
  on public.markets
  for select
  to anon, authenticated
  using (true);

comment on policy markets_select_public on public.markets is
  'Allows anyone, signed out included, to read which countries are open; nothing in it is personal (S1-E2-10).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): anyone may read.
-- Markets change only by migration (S1-E11-05 adds the owner's screen; opening a market carries a
-- legal check, architecture 1.8.3), so nobody gets a write privilege.
revoke all on public.markets from anon, authenticated;
grant select on public.markets to anon, authenticated;  -- markets_select_public

insert into public.markets (country_code, is_open, minimum_age, languages) values
  ('RO', true, 13, '{ro,en}'),
  ('GB', false, 13, '{en}'),
  ('IE', false, 13, '{en}'),
  ('US', false, 13, '{en}'),
  ('CA', false, 13, '{en}'),
  ('AU', false, 16, '{en}'),
  ('NZ', false, 13, '{en}');

/* ---------- The profile's country ---------- */

alter table public.profiles
  add column country_code text,
  add constraint profiles_country_code_is_alpha2 check (country_code ~ '^[A-Z]{2}$');

comment on column public.profiles.country_code is
  'Country of the connection at sign-up, from Cloudflare, never asked and never the IP; null when unknown (S1-E2-10, Q20).';

/* ---------- The token ---------- */

/**
 * verified_signup_country: the country in a signed sign-up token, if the token is genuine.
 * Input: token, "v1.<country>.<seconds>.<signature>" from /api/signup-context.
 * Returns: the two-letter code when the signature matches signup_context_secret in Vault and the
 *   token is at most 10 minutes old; null otherwise (no token, no secret, a bad signature or an
 *   old token): the country is then unknown.
 * Internal: only the sign-up trigger calls it.
 */
create or replace function public.verified_signup_country(token text)
returns text
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
  -- Step 1: the shape: version, country, time in seconds, 64-character signature.
  if array_length(parts, 1) <> 4 or parts[1] <> 'v1' or parts[2] !~ '^[A-Z]{2}$'
    or parts[3] !~ '^\d{1,12}$' or parts[4] !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  -- Step 2: at most 10 minutes old (and not from the future, beyond a minute of clock drift).
  issued_at := parts[3]::bigint;
  if issued_at < extract(epoch from now())::bigint - 600 or issued_at > extract(epoch from now())::bigint + 60 then
    return null;
  end if;
  -- Step 3: the signature, with the secret from Vault; without the secret nothing is trusted.
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'signup_context_secret';
  if secret is null or secret = '' then
    return null;
  end if;
  if encode(extensions.hmac(parts[1] || '.' || parts[2] || '.' || parts[3], secret, 'sha256'), 'hex') <> parts[4] then
    return null;
  end if;
  return parts[2];
end;
$$;

comment on function public.verified_signup_country(text) is
  'Internal: the country in a genuine sign-up token at most 10 minutes old, else null (S1-E2-10, Q6a).';
revoke execute on function public.verified_signup_country(text) from public, anon, authenticated;

/* ---------- The market rules ---------- */

/**
 * sign_up_market_outcome: may someone this old join from this country?
 * Inputs: country_code (null when unknown); birth_year; birth_month (null when not needed).
 * Returns: 'ok'; 'market_closed' (a closed or unknown country, once sign-up is public); or
 *   'under_market_age' (younger than the market's minimum age, for example under 16 in
 *   Australia, Q19). While invite_only and adults_only are both on, always 'ok' (Q6b, Q6c).
 * Who may call it: anyone; it applies the rules to the values given and stores nothing.
 */
create or replace function public.sign_up_market_outcome(
  country_code text,
  birth_year integer,
  birth_month integer default null
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  market_row public.markets;
  youngest_age_band public.age_band;
begin
  -- Step 1: the invited test admits any country (decided 17 Oct 2026, 19:43, Q6b and Q6c).
  if public.is_feature_enabled('invite_only') and public.is_feature_enabled('adults_only') then
    return 'ok';
  end if;
  -- Step 2: once public, the country must be a known, open market.
  select * into market_row from public.markets where markets.country_code = sign_up_market_outcome.country_code;
  if not found or not market_row.is_open then
    return 'market_closed';
  end if;
  -- Step 3: the market's own minimum age, by the younger possible age (S1-E2-02).
  youngest_age_band := public.age_band_from_birth(
    birth_year::smallint, birth_month::smallint, 'pending', (now() at time zone 'Europe/Bucharest')::date
  );
  if market_row.minimum_age >= 16 and youngest_age_band in ('under_13', '13_to_15') then
    return 'under_market_age';
  end if;
  return 'ok';
end;
$$;

comment on function public.sign_up_market_outcome(text, integer, integer) is
  'What sign-up says about a country and age: ok, market_closed or under_market_age; always ok in the invited test (S1-E2-10).';
revoke execute on function public.sign_up_market_outcome(text, integer, integer) from public;
grant execute on function public.sign_up_market_outcome(text, integer, integer) to anon, authenticated;

/**
 * handle_new_auth_user: the trigger that turns a new Supabase Auth account into a member.
 * Runs: after every insert into auth.users (sign-up with a password or a magic link).
 * Steps: skip the seed personas → take an invite place while invite_only is on → check the year
 *   (and month) of birth → check the country's market (S1-E2-10) → create the profile with the
 *   country → record the two consents.
 * Errors: any refusal raises, and the whole sign-up is undone (nothing stored).
 * Seed personas: supabase/seed.sql marks its synthetic accounts with app metadata
 *   {"seed_persona": true} and creates their profiles itself; only the server can write it.
 */
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sign_up_data jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_locale text := sign_up_data ->> 'locale';
  birth_year smallint;
  birth_month smallint;
  country text;
  outcome text;
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: the March test is invite only (decided 17 Oct 2026, 12:44).
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code');
  end if;

  -- Step 3: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 4: the country from the signed token, and the market rules (S1-E2-10).
  country := public.verified_signup_country(sign_up_data ->> 'signup_context');
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 5: the profile, with the language the form was in and the country.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code)
  values (
    new.id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country
  );

  -- Step 6: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new.id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new.id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: checks a sign-up (invite, age, market) and creates the profile and consents, or refuses it all (S1-E2-01, 02, 10).';
