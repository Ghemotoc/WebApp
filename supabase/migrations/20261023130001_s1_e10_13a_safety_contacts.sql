-- Safety contacts by country (story S1-E10-13a; split decided 17 Oct 2026, 12:44: 13a seeds the
-- researched defaults and shows the block; 13b, after March, adds the editing screen and the
-- monthly check).
--
-- What it adds:
--   safety_contact_kind      emergency, child_helpline, csam_hotline, crisis_youth,
--                            police_online_child, regulator
--   safety_contacts          one row per contact per country, with its official link, the source's
--                            check date and the research's confidence; read by everyone, written
--                            only by migrations until 13b. The next migration seeds it from
--                            content/safety-contacts.json through
--                            scripts/build-safety-contacts-migration.ts (never typed from memory).
--                            Country code 'ZZ' (ISO 3166's "unknown") holds the international
--                            fallback links (Child Helpline International's and INHOPE's
--                            directories, decided 23 Oct 2026, Q9c), checked online by the CTO on
--                            24 Oct 2026 and seeded with the rest; a country with no row shows
--                            "Call your local emergency number" and these two directories.
--   safety_contact_gaps      which countries were asked for and had no row, so staff see the gap
--                            (the story: "the gap is logged for staff"); no user is recorded
--   note_safety_contact_gap()  the app calls it when it shows the fallback
-- Rules (the story's legal note): numbers are safety-critical, so every row keeps where it came
-- from and when it was checked; links to helplines carry no tracking (CLAUDE.md rule 7).

/** safety_contact_kind: what a contact is for, in the order the block shows them. */
create type public.safety_contact_kind as enum (
  'emergency',
  'child_helpline',
  'csam_hotline',
  'crisis_youth',
  'police_online_child',
  'regulator'
);

comment on type public.safety_contact_kind is
  'What a safety contact is for: emergency number, children''s helpline, CSAM reporting, youth crisis line, police, regulator (S1-E10-13a).';

create table public.safety_contacts (
  id uuid primary key default gen_random_uuid(),
  -- ISO 3166-1 alpha-2, upper case; 'ZZ' for the international fallback rows.
  country_code text not null,
  kind public.safety_contact_kind not null,
  -- The order inside a kind, from 1.
  position integer not null,
  -- The official name, as the research has it (a proper noun, shown in every language).
  label text not null,
  phone_number text,
  -- The official site, opened in a new tab without tracking.
  link text,
  opening_hours text,
  note text,
  -- The research's confidence in the row (High, Medium, Low), kept for the monthly check (13b).
  confidence text not null,
  last_checked_on date not null,
  -- Who checked it: 'research G4' for the seed; a staff username from 13b.
  checked_by text not null default 'research G4',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_contacts_country_code_is_iso check (country_code ~ '^[A-Z]{2}$'),
  constraint safety_contacts_position_from_one check (position >= 1),
  constraint safety_contacts_has_number_or_link check (phone_number is not null or link is not null),
  constraint safety_contacts_one_position_per_kind unique (country_code, kind, position)
);

comment on table public.safety_contacts is
  'kind: platform
Emergency numbers, helplines and reporting links per country, with their source and check date; seeded by migration, edited from S1-E10-13b (S1-E10-13a).';
comment on column public.safety_contacts.country_code is 'ISO 3166-1 alpha-2; ZZ holds the international fallback links.';

create trigger safety_contacts_set_updated_at
  before update on public.safety_contacts
  for each row execute function public.set_updated_at();

alter table public.safety_contacts enable row level security;

/**
 * Policy safety_contacts_select_public: everyone reads the contacts, signed out included.
 * Why: the block shows on the report form, the public contact page and later the public report
 * form (S1-E10-02); a person in danger must never need an account to see a number.
 */
create policy safety_contacts_select_public
  on public.safety_contacts
  for select
  to anon, authenticated
  using (true);

comment on policy safety_contacts_select_public on public.safety_contacts is
  'Allows anyone, signed out included, to read the safety contacts (S1-E10-13a).';

-- Reads for everyone; no writes from the app until the editing screen (S1-E10-13b).
revoke all on public.safety_contacts from anon, authenticated;
grant select on public.safety_contacts to anon, authenticated;

create table public.safety_contact_gaps (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  times_seen integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint safety_contact_gaps_country_code_is_iso check (country_code ~ '^[A-Z]{2}$')
);

comment on table public.safety_contact_gaps is
  'kind: platform
Countries asked for safety contacts that had no row: a counter per country for staff, never who asked (S1-E10-13a).';

alter table public.safety_contact_gaps enable row level security;

/**
 * Policy safety_contact_gaps_select_moderation: moderation staff see which countries lack rows.
 * Why: "the gap is logged for staff" (the story); the counter holds no personal data, but it is
 * staff information, not public.
 */
create policy safety_contact_gaps_select_moderation
  on public.safety_contact_gaps
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy safety_contact_gaps_select_moderation on public.safety_contact_gaps is
  'Allows owner, admin and moderator, in a staff session, to see the countries with no safety contacts (S1-E10-13a).';

revoke all on public.safety_contact_gaps from anon, authenticated;
grant select on public.safety_contact_gaps to authenticated;

/**
 * note_safety_contact_gap: counts that a country with no contacts was asked for.
 * Input: wanted_country_code (two letters). Returns: nothing. Errors: check_violation for
 *   anything that isn't a two-letter code, so the table can't fill with rubbish.
 * Who may call it: anyone, signed out included: the block calls it when it shows the fallback.
 *   It records the country and a count only, never who asked.
 */
create or replace function public.note_safety_contact_gap(wanted_country_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := upper(btrim(coalesce(wanted_country_code, '')));
begin
  if code !~ '^[A-Z]{2}$' then
    raise exception 'A country code has two letters.' using errcode = 'check_violation';
  end if;
  insert into public.safety_contact_gaps (country_code)
  values (code)
  on conflict (country_code) do update
    set times_seen = public.safety_contact_gaps.times_seen + 1, last_seen_at = now();
end;
$$;

comment on function public.note_safety_contact_gap(text) is
  'Counts a request for a country with no safety contacts, for staff; never who asked (S1-E10-13a).';
revoke execute on function public.note_safety_contact_gap(text) from public;
grant execute on function public.note_safety_contact_gap(text) to anon, authenticated;
