-- Migration: profiles, the anchor for every user ID (story S1-E1-02, minimal version).
--
-- What it adds: one row per account. profiles.id is the user ID: the same random UUID Supabase
-- Auth gives the account (architecture 1.6). Every user-owned table points its user_id here.
-- Why minimal: S1-E1-02 needs it for the account gate and the seed personas (Robert, 17 Oct 2026:
-- minimal tables now). S1-E2-01 adds the sign-up trigger that creates the row; S1-E2-04 the
-- handle and pen name; S1-E1-04 the interface language.
-- Personal data: year of birth (and the month only when the year leaves the age unclear at 13
-- or 16) plus the Yoti result, its date and method. Never a full date of birth, a legal name, a
-- selfie, an ID image or an estimated age (CLAUDE.md rule 5; GDPR Art 5(1)(c)).

create table public.profiles (
  -- The user ID: never changes, never reused, never shown publicly (architecture 1.6).
  id uuid primary key references auth.users (id),
  birth_year smallint not null,
  -- Only when the year leaves the age unclear at 13 or 16 (decided 16 Oct 2026, Q16; S1-E2-02).
  birth_month smallint,
  age_check_result public.age_check_result not null default 'pending',
  age_checked_at timestamptz,
  age_check_method public.age_check_method,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete (CLAUDE.md conventions); the purge job comes with the data rights stories.
  deleted_at timestamptz,
  constraint profiles_birth_year_is_plausible check (birth_year between 1900 and 2100),
  constraint profiles_birth_month_is_a_month check (birth_month between 1 and 12)
);

comment on table public.profiles is
  'kind: identity; reportable: profile
One row per account; id is the user ID from Supabase Auth (architecture 1.6). Minimal in S1-E1-02.';

comment on column public.profiles.birth_year is
  'Year of birth only, never a full date (rule 5). Never shown to other users or most staff.';
comment on column public.profiles.birth_month is
  'Month of birth, only when the year leaves the age unclear at 13 or 16 (S1-E2-02).';

-- Keep updated_at current, and refuse any change to the user ID.
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profiles_refuse_id_change
  before update on public.profiles
  for each row execute function public.refuse_user_id_change('id');

-- Deny by default: with RLS on and no write policies, nobody can insert, change or delete rows
-- through the API. Rows are created by Supabase Auth's sign-up trigger (S1-E2-01) or the seed.
alter table public.profiles enable row level security;

/**
 * Policy profiles_select_own: a signed-in user reads only their own profile.
 * Who: the account's owner. Why: age data is private; other people see a public profile view
 * without the user ID or age (S1-E5-05), never this table (architecture 1.6).
 */
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

comment on policy profiles_select_own on public.profiles is
  'Allows a signed-in user to read only their own profile; age data is private (architecture 1.6).';
