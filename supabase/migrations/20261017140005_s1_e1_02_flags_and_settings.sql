-- Migration: feature_flags and settings (story S1-E1-02; architecture B12).
--
-- What it adds: switches that let a feature be merged and turned on later (architecture 1.11),
-- and named values the platform reads (limits, lengths and so on).
-- Who reads them: the account gate (adults_only, next migration), and from S1-E11-03 the app
-- through get_client_config(). Changing them: a new migration until the admin settings screen
-- (S1-E11-03) arrives (architecture 1.7.9).
-- Brand values (name, domain, addresses) are not stored here: back-end code reads them from
-- Edge Function secrets, so the brand-name check keeps them out of supabase/ (S1-E1-01).

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  is_enabled boolean not null default false,
  -- Public flags may be read by anyone, signed out included, so the app can hide a button.
  is_public boolean not null default false,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feature_flags is
  'kind: platform
Feature switches (architecture 1.11). Changed by migration until S1-E11-03.';

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  is_public boolean not null default false,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.settings is
  'kind: platform
Named platform values (architecture B12). No brand values: those live in Edge Function secrets.';

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;
alter table public.settings enable row level security;

/**
 * Policy feature_flags_select_public: anyone, signed out included, reads flags marked public.
 * Why: the app needs some switches before sign-in (for example invite_only on the sign-up page).
 */
create policy feature_flags_select_public
  on public.feature_flags
  for select
  to anon, authenticated
  using (is_public);

comment on policy feature_flags_select_public on public.feature_flags is
  'Allows anyone, signed out included, to read flags marked public; the app needs them before sign-in.';

/**
 * Policy settings_select_public: anyone, signed out included, reads settings marked public.
 * Why: the same as flags, for values such as limits the app shows.
 */
create policy settings_select_public
  on public.settings
  for select
  to anon, authenticated
  using (is_public);

comment on policy settings_select_public on public.settings is
  'Allows anyone, signed out included, to read settings marked public.';

-- The March switches (decided 17 Oct 2026, 12:44, flags themselves a proposal): the test is
-- invite-only and for adults only. social_login stays off until S1-E2-09; maintenance_mode is
-- read by S1-E1-05.
insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('invite_only', true, true,
   'Sign-up needs an invite link or code (March test, S1-E2-01, S1-E11-17).'),
  ('adults_only', true, true,
   'Only adults may sign up; adults are active without the age check (March test, S1-E2-02).'),
  ('social_login', false, true,
   'Google, Apple and Microsoft sign-in buttons (S1-E2-09).'),
  ('maintenance_mode', false, true,
   'Show the maintenance page to everyone except staff (S1-E1-05).');
