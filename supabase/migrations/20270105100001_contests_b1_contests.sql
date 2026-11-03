/*
 * Migration: contests, part 1: setting a contest up, opening it and entering it (story
 * S1-E11-15 criteria 1 to 4; bundle CONTESTS-13b1).
 *
 * What it adds:
 *   contests                  one row per contest: its names in both languages, the dates, who
 *                             can enter, what counts, the word limit, the prize, the judges, the
 *                             contest rules (a help page) and its landing page (S1-E11-14)
 *   contest_entries           one row per story a writer entered: valid, withdrawn or
 *                             disqualified (disqualifying arrives in part 13b2)
 *   contest_problems()        what stops a contest from opening (criterion 2)
 *   admin_create_contest(), admin_save_contest(), admin_open_contest(),
 *   admin_contest_problems()  Staff › Contests; owner and admin only (area contests), each write
 *                             logged in the audit log in the same transaction
 *   contest_entry_options(), enter_contest(), withdraw_contest_entry()
 *                             "Enter <contest>" in a story's settings (criteria 3 and 4)
 *
 * How it works:
 * - A contest belongs to one landing page of type contest. It starts as a draft that nobody but
 *   staff sees. Opening it is refused until every detail is filled in, the full contest rules are
 *   published as a help page in Romanian and English in every market the contest is open to, and
 *   the landing page is live with a Rules block that links to that help page (criterion 2).
 * - Entries are accepted from the day entries open to the day they close, both included, in
 *   Romanian time. No job runs: the dates are compared with today on every call.
 * - Who can enter: an active account (is_active_member()) in one of the contest's age groups
 *   (age_band(), never the year of birth) and markets (the country stored at sign-up), with a
 *   story of their own in one of its languages that readers can open now and that isn't shared
 *   only with a class. One entry per writer per contest (proposal in the story); a withdrawn entry
 *   frees the place, so the writer may enter again while entries are open.
 * - A contest open to 13 to 15-year-olds takes only stories rated All ages or 13+ (criterion 4,
 *   proposal).
 * - The sponsor campaign field waits for sponsor campaigns (S1-E12-02, bundle 14b), like the
 *   landing page's Sponsor block.
 * Who may set contests up: the owner and admins (area contests, proposal: the same people as the
 *   landing pages, decided 17 Oct 2026, 19:19).
 */

/* ---------- The admin area ---------- */

-- Staff › Contests: owner and admin act (architecture 1.8.3 has no row yet; proposal).
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('contests', 'owner', 'act', null), ('contests', 'admin', 'act', null);

/* ---------- The contests ---------- */

create table public.contests (
  id uuid primary key default gen_random_uuid(),
  -- The landing page at /c/<slug> that presents the contest (S1-E11-14). One contest per page.
  landing_page_id uuid not null unique references public.landing_pages (id) on delete restrict,
  -- The admin who created it. Staff-written platform data, so it may outlive their account.
  user_id uuid references public.profiles (id) on delete set null,
  name_ro text not null default '',
  name_en text not null default '',
  -- The days entries open and close (both included) and the day results are due, in Romanian time.
  entries_open_on date,
  entries_close_on date,
  results_on date,
  -- Who can enter: platform age groups (age_band values), markets (country codes) and the
  -- languages a story may be written in (criterion 1).
  age_groups text[] not null default '{}',
  market_codes text[] not null default '{}',
  language_codes text[] not null default '{}',
  what_counts_ro text not null default '',
  what_counts_en text not null default '',
  -- An optional limit on the words of the published chapters.
  word_limit integer,
  prize_ro text not null default '',
  prize_en text not null default '',
  -- Who delivers the prize (criterion 1), for example "the organiser" or a partner's name.
  prize_delivered_by text not null default '',
  -- The judges: our staff plus any named partner judges; no public vote (criterion 7, proposal).
  judges text not null default '',
  -- The help page (its address after /help/) that holds the full contest rules (criterion 2).
  rules_page_key text,
  -- Set once when the contest opens; entries are accepted only after that.
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contests_age_groups_are_known
    check (age_groups <@ array['13_to_15', '16_to_17', '18_plus']::text[]),
  constraint contests_word_limit_is_sensible
    check (word_limit is null or word_limit between 100 and 500000),
  constraint contests_rules_key_is_an_address
    check (rules_page_key is null or rules_page_key ~ '^[a-z0-9][a-z0-9-]{0,59}$')
);

comment on table public.contests is
  'kind: platform
Writing contests run from the admin site (S1-E11-15). Staff-written platform data, not user content; user_id is the admin who created it.';

create trigger contests_set_updated_at
  before update on public.contests
  for each row execute function public.set_updated_at();

alter table public.contests enable row level security;

/**
 * Policy contests_select_staff: owner and admin, in a staff session, read every contest.
 * Why: Staff › Contests lists drafts and open contests. Writers see only the contests they can
 * enter, through contest_entry_options(), never this table.
 */
create policy contests_select_staff
  on public.contests for select to authenticated
  using ((select public.staff_may('contests', 'view')));

comment on policy contests_select_staff on public.contests is
  'Allows owner and admin, in a staff session, to read every contest (S1-E11-15).';

grant select on public.contests to authenticated;  -- contests_select_staff

/* ---------- The entries ---------- */

create table public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  -- The writer who entered (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  contest_id uuid not null references public.contests (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  -- valid, withdrawn (by the writer) or disqualified (by staff, part 13b2) (criterion 5).
  status text not null default 'valid',
  entered_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contest_entries_status_is_known check (status in ('valid', 'withdrawn', 'disqualified')),
  constraint contest_entries_withdrawn_has_a_time check ((status = 'withdrawn') = (withdrawn_at is not null))
);

comment on table public.contest_entries is
  'kind: user_action
A writer''s entry of one of their stories in a contest (S1-E11-15). Only the writer and contest staff read it; staff never edit the story''s words.';

-- One entry per writer per contest (proposal); a withdrawn entry frees the place.
create unique index contest_entries_one_per_writer
  on public.contest_entries (contest_id, user_id)
  where status <> 'withdrawn';

-- The writer's own entries, for the story settings card.
create index contest_entries_by_writer on public.contest_entries (user_id);
create index contest_entries_by_story on public.contest_entries (story_id);

create trigger contest_entries_set_updated_at
  before update on public.contest_entries
  for each row execute function public.set_updated_at();

-- The owner column never changes (architecture 1.6, the user ID).
create trigger contest_entries_refuse_user_id_change
  before update on public.contest_entries
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.contest_entries enable row level security;

/**
 * Policy contest_entries_select_own: a writer reads their own entries.
 * Why: Download my data and the story settings card show them. Nobody writes the table directly:
 * enter_contest() and withdraw_contest_entry() do.
 */
create policy contest_entries_select_own
  on public.contest_entries for select to authenticated
  using ((select auth.uid()) = user_id);

comment on policy contest_entries_select_own on public.contest_entries is
  'Allows a writer to read their own contest entries (S1-E11-15).';

/**
 * Policy contest_entries_select_staff: owner and admin, in a staff session, read every entry.
 * Why: judging and the entries list (part 13b2) show them by pen name and age group only.
 */
create policy contest_entries_select_staff
  on public.contest_entries for select to authenticated
  using ((select public.staff_may('contests', 'view')));

comment on policy contest_entries_select_staff on public.contest_entries is
  'Allows owner and admin, in a staff session, to read every contest entry (S1-E11-15).';

grant select on public.contest_entries to authenticated;  -- contest_entries_select_own, contest_entries_select_staff

/* ---------- Opening a contest ---------- */

/**
 * contest_rules_are_published: are the contest rules live in Romanian and English in every
 * market the contest is open to? Internal.
 * Inputs: the contest. Returns: true or false (false when no rules page is named).
 */
create or replace function public.contest_rules_are_published(target public.contests)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.rules_page_key is not null
    and cardinality(target.market_codes) > 0
    and not exists (
      -- Every market and both languages, with no gap among the live help pages.
      select 1
      from unnest(target.market_codes) as markets (market_code)
      cross join unnest(array['ro', 'en']) as languages (language_code)
      where not exists (
        select 1 from public.cms_live_versions('help_page') as live
        where live.entry_key = target.rules_page_key
          and live.market_code = markets.market_code
          and live.language_code = languages.language_code
      )
    );
$$;

comment on function public.contest_rules_are_published(public.contests) is
  'Internal: true when the contest rules help page is live in ro and en in every market of the contest (S1-E11-15).';
revoke execute on function public.contest_rules_are_published(public.contests) from public, anon, authenticated;

/**
 * contest_landing_problems: what is wrong with a contest's landing page for opening. Internal.
 * Inputs: the contest. Returns: problem codes: landing_not_contest (the page isn't a contest
 *   page), landing_not_live (archived, not published, not yet showing or taken down) and
 *   rules_not_linked (the live page has no Rules block linking to the rules help page).
 */
create or replace function public.contest_landing_problems(target public.contests)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page public.landing_pages;
  live public.landing_page_versions;
  problems text[] := '{}';
begin
  select * into page from public.landing_pages where id = target.landing_page_id;
  -- Step 1: the page must be a contest page.
  if page.page_type <> 'contest' then
    problems := problems || 'landing_not_contest'::text;
  end if;
  -- Step 2: it must be live today and not taken down or archived.
  live := public.landing_page_live_version(page.id);
  if page.archived_at is not null or live.id is null
     or (live.take_down_on is not null and live.take_down_on <= public.romania_today()) then
    return problems || 'landing_not_live'::text;
  end if;
  -- Step 3: its Rules block must link to the rules help page.
  if target.rules_page_key is null or not (live.content -> 'blocks' @> jsonb_build_array(
       jsonb_build_object('kind', 'rules', 'link', '/help/' || target.rules_page_key))) then
    problems := problems || 'rules_not_linked'::text;
  end if;
  return problems;
end;
$$;

comment on function public.contest_landing_problems(public.contests) is
  'Internal: landing page problems that stop a contest from opening (S1-E11-15 criterion 2).';
revoke execute on function public.contest_landing_problems(public.contests) from public, anon, authenticated;

/**
 * contest_detail_problems: the details a contest still needs. Internal.
 * Inputs: the contest. Returns: problem codes in the order of the form: name_ro, name_en,
 *   dates_missing, dates_order, age_groups, markets, languages, what_counts, prize,
 *   prize_delivered_by, judges, rules_page.
 */
create or replace function public.contest_detail_problems(target public.contests)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when btrim(target.name_ro) = '' then 'name_ro' end,
    case when btrim(target.name_en) = '' then 'name_en' end,
    case when target.entries_open_on is null or target.entries_close_on is null or target.results_on is null
      then 'dates_missing' end,
    -- Entries close on or after they open, and results come after entries close.
    case when target.entries_close_on < target.entries_open_on or target.results_on <= target.entries_close_on
      then 'dates_order' end,
    case when cardinality(target.age_groups) = 0 then 'age_groups' end,
    case when cardinality(target.market_codes) = 0 then 'markets' end,
    case when cardinality(target.language_codes) = 0 then 'languages' end,
    case when btrim(target.what_counts_ro) = '' or btrim(target.what_counts_en) = '' then 'what_counts' end,
    case when btrim(target.prize_ro) = '' or btrim(target.prize_en) = '' then 'prize' end,
    case when btrim(target.prize_delivered_by) = '' then 'prize_delivered_by' end,
    case when btrim(target.judges) = '' then 'judges' end,
    case when target.rules_page_key is null then 'rules_page' end
  ]::text[], null);
$$;

comment on function public.contest_detail_problems(public.contests) is
  'Internal: the contest details still missing or wrong (S1-E11-15 criterion 1).';
revoke execute on function public.contest_detail_problems(public.contests) from public, anon, authenticated;

/**
 * contest_problems: everything that stops a contest from opening, or from staying open after a
 * change (criterion 2). Internal.
 * Inputs: the contest. Returns: the detail problems, then rules_not_published, then the landing
 *   page problems. Empty when the contest may open.
 */
create or replace function public.contest_problems(target public.contests)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select public.contest_detail_problems(target)
    || case when target.rules_page_key is not null and not public.contest_rules_are_published(target)
         then array['rules_not_published'] else '{}'::text[] end
    || public.contest_landing_problems(target);
$$;

comment on function public.contest_problems(public.contests) is
  'Internal: what stops a contest from opening (S1-E11-15 criterion 2).';
revoke execute on function public.contest_problems(public.contests) from public, anon, authenticated;

/* ---------- Staff › Contests ---------- */

/**
 * require_contest_staff: refuses anyone who may not run contests. Internal.
 * Errors: insufficient_privilege for everyone but the owner and admins in a staff session.
 */
create or replace function public.require_contest_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('contests', 'act') then
    raise exception 'Only the owner and admins can run contests.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_contest_staff() is 'Internal: refuses anyone who may not run contests (S1-E11-15).';
revoke execute on function public.require_contest_staff() from public, anon, authenticated;

/**
 * admin_create_contest: starts a contest on a contest landing page (criterion 1).
 * Inputs: landing_slug, the landing page's address after /c/. Returns: the contest's id.
 * Errors: insufficient_privilege (owner and admin only); no_data_found for an unknown or archived
 *   page; check_violation with the hint not_a_contest_page or already_has_contest.
 * Logged as contest.created.
 */
create or replace function public.admin_create_contest(landing_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  page public.landing_pages;
  new_contest_id uuid;
begin
  perform public.require_contest_staff();
  -- Step 1: a contest landing page that has no contest yet.
  select * into page from public.landing_pages
  where slug = lower(btrim(coalesce(landing_slug, ''))) and archived_at is null;
  if page.id is null then
    raise exception 'No landing page has that address.' using errcode = 'no_data_found';
  end if;
  if page.page_type <> 'contest' then
    raise exception 'Pick a contest landing page.' using errcode = 'check_violation', hint = 'not_a_contest_page';
  end if;
  if exists (select 1 from public.contests where landing_page_id = page.id) then
    raise exception 'That page already has a contest.' using errcode = 'check_violation', hint = 'already_has_contest';
  end if;
  -- Step 2: the contest, empty until staff fill it in, and the audit row.
  insert into public.contests (landing_page_id, user_id)
  values (page.id, (select auth.uid()))
  returning id into new_contest_id;
  perform public.log_staff_action('contest.created', 'contests', new_contest_id::text, null, null, null,
    jsonb_build_object('landing_page', page.slug));
  return new_contest_id;
end;
$$;

comment on function public.admin_create_contest(text) is 'Starts a contest on a contest landing page; owner and admin only; logged (S1-E11-15).';
revoke execute on function public.admin_create_contest(text) from public, anon;
grant execute on function public.admin_create_contest(text) to authenticated;

/**
 * contest_details_from_json: reads the editor's fields into a contest row. Internal.
 * Inputs: the current row and the details as JSON (every field optional: a missing field keeps
 *   its value). Returns: the changed row, trimmed.
 * Errors: check_violation with the hint too_long, bad_age_group, bad_market, bad_language,
 *   bad_word_limit or bad_rules_page.
 */
create or replace function public.contest_details_from_json(current_row public.contests, details jsonb)
returns public.contests
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  changed public.contests := current_row;
begin
  -- Step 1: the words, trimmed (an empty field stays empty and opening names it).
  changed.name_ro := btrim(coalesce(details ->> 'name_ro', current_row.name_ro));
  changed.name_en := btrim(coalesce(details ->> 'name_en', current_row.name_en));
  changed.what_counts_ro := btrim(coalesce(details ->> 'what_counts_ro', current_row.what_counts_ro));
  changed.what_counts_en := btrim(coalesce(details ->> 'what_counts_en', current_row.what_counts_en));
  changed.prize_ro := btrim(coalesce(details ->> 'prize_ro', current_row.prize_ro));
  changed.prize_en := btrim(coalesce(details ->> 'prize_en', current_row.prize_en));
  changed.prize_delivered_by := btrim(coalesce(details ->> 'prize_delivered_by', current_row.prize_delivered_by));
  changed.judges := btrim(coalesce(details ->> 'judges', current_row.judges));
  if greatest(length(changed.name_ro), length(changed.name_en)) > 120
     or greatest(length(changed.what_counts_ro), length(changed.what_counts_en)) > 1000
     or greatest(length(changed.prize_ro), length(changed.prize_en), length(changed.judges)) > 500
     or length(changed.prize_delivered_by) > 200 then
    raise exception 'A field is too long.' using errcode = 'check_violation', hint = 'too_long';
  end if;
  -- Step 2: the dates (JSON null clears one).
  if details ? 'entries_open_on' then changed.entries_open_on := (details ->> 'entries_open_on')::date; end if;
  if details ? 'entries_close_on' then changed.entries_close_on := (details ->> 'entries_close_on')::date; end if;
  if details ? 'results_on' then changed.results_on := (details ->> 'results_on')::date; end if;
  -- Step 3: who can enter, each value from the lists the platform knows.
  if details ? 'age_groups' then
    changed.age_groups := array(select distinct value from jsonb_array_elements_text(details -> 'age_groups') order by 1);
  end if;
  if not changed.age_groups <@ array['13_to_15', '16_to_17', '18_plus']::text[] then
    raise exception 'Pick age groups from the list.' using errcode = 'check_violation', hint = 'bad_age_group';
  end if;
  if details ? 'market_codes' then
    changed.market_codes := array(select distinct value from jsonb_array_elements_text(details -> 'market_codes') order by 1);
  end if;
  if exists (select 1 from unnest(changed.market_codes) as code
             where not exists (select 1 from public.markets where markets.country_code = code)) then
    raise exception 'Pick markets from the list.' using errcode = 'check_violation', hint = 'bad_market';
  end if;
  if details ? 'language_codes' then
    changed.language_codes := array(select distinct value from jsonb_array_elements_text(details -> 'language_codes') order by 1);
  end if;
  if exists (select 1 from unnest(changed.language_codes) as code
             where not exists (select 1 from public.languages where languages.code = code)) then
    raise exception 'Pick languages from the list.' using errcode = 'check_violation', hint = 'bad_language';
  end if;
  -- Step 4: the word limit and the rules page.
  if details ? 'word_limit' then changed.word_limit := (details ->> 'word_limit')::integer; end if;
  if changed.word_limit is not null and changed.word_limit not between 100 and 500000 then
    raise exception 'The word limit must be between 100 and 500,000.' using errcode = 'check_violation', hint = 'bad_word_limit';
  end if;
  if details ? 'rules_page_key' then changed.rules_page_key := nullif(lower(btrim(details ->> 'rules_page_key')), ''); end if;
  if changed.rules_page_key is not null and changed.rules_page_key !~ '^[a-z0-9][a-z0-9-]{0,59}$' then
    raise exception 'That isn''t a help page address.' using errcode = 'check_violation', hint = 'bad_rules_page';
  end if;
  return changed;
end;
$$;

comment on function public.contest_details_from_json(public.contests, jsonb) is
  'Internal: reads and checks the contest editor''s fields (S1-E11-15).';
revoke execute on function public.contest_details_from_json(public.contests, jsonb) from public, anon, authenticated;

/**
 * admin_save_contest: saves a contest's details (criterion 1).
 * Inputs: target_contest_id; details, a JSON object with any of name_ro, name_en,
 *   entries_open_on, entries_close_on, results_on, age_groups, market_codes, language_codes,
 *   what_counts_ro, what_counts_en, word_limit, prize_ro, prize_en, prize_delivered_by, judges,
 *   rules_page_key. Returns: the problems still stopping it from opening (empty when ready).
 * Errors: insufficient_privilege; no_data_found; check_violation from the field checks, or the
 *   hint breaks_open_contest when a change to an open contest would leave a problem (an open
 *   contest must stay complete, criterion 2). Logged as contest.saved with before and after.
 */
create or replace function public.admin_save_contest(target_contest_id uuid, details jsonb)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.contests;
  changed public.contests;
  problems text[];
begin
  perform public.require_contest_staff();
  -- Step 1: the contest, locked so two editors can't save at once.
  select * into current_row from public.contests where id = target_contest_id for update;
  if current_row.id is null then
    raise exception 'That contest doesn''t exist.' using errcode = 'no_data_found';
  end if;
  -- Step 2: the new values, checked field by field.
  changed := public.contest_details_from_json(current_row, coalesce(details, '{}'::jsonb));
  problems := public.contest_problems(changed);
  -- Step 3: an open contest must stay ready to be open.
  if current_row.opened_at is not null and cardinality(problems) > 0 then
    raise exception 'This change would leave the open contest incomplete.'
      using errcode = 'check_violation', hint = 'breaks_open_contest', detail = array_to_string(problems, ',');
  end if;
  -- Step 4: save and log, with the values before and after.
  update public.contests set
    name_ro = changed.name_ro, name_en = changed.name_en,
    entries_open_on = changed.entries_open_on, entries_close_on = changed.entries_close_on,
    results_on = changed.results_on, age_groups = changed.age_groups,
    market_codes = changed.market_codes, language_codes = changed.language_codes,
    what_counts_ro = changed.what_counts_ro, what_counts_en = changed.what_counts_en,
    word_limit = changed.word_limit, prize_ro = changed.prize_ro, prize_en = changed.prize_en,
    prize_delivered_by = changed.prize_delivered_by, judges = changed.judges,
    rules_page_key = changed.rules_page_key
  where id = target_contest_id;
  perform public.log_staff_action('contest.saved', 'contests', target_contest_id::text, null, null,
    to_jsonb(current_row) - array['created_at', 'updated_at'], to_jsonb(changed) - array['created_at', 'updated_at']);
  return problems;
end;
$$;

comment on function public.admin_save_contest(uuid, jsonb) is 'Saves a contest''s details; owner and admin only; logged with before and after (S1-E11-15).';
revoke execute on function public.admin_save_contest(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_contest(uuid, jsonb) to authenticated;

/**
 * admin_contest_problems: what still stops a contest from opening, for the editor (criterion 2).
 * Inputs: target_contest_id. Returns: the problem codes (empty when it may open).
 * Errors: insufficient_privilege; no_data_found.
 */
create or replace function public.admin_contest_problems(target_contest_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.contests;
begin
  perform public.require_contest_staff();
  select * into target from public.contests where id = target_contest_id;
  if target.id is null then
    raise exception 'That contest doesn''t exist.' using errcode = 'no_data_found';
  end if;
  return public.contest_problems(target);
end;
$$;

comment on function public.admin_contest_problems(uuid) is 'What stops a contest from opening; owner and admin only (S1-E11-15 criterion 2).';
revoke execute on function public.admin_contest_problems(uuid) from public, anon;
grant execute on function public.admin_contest_problems(uuid) to authenticated;

/**
 * admin_open_contest: opens a contest, so writers can enter from its opening day (criterion 2).
 * Inputs: target_contest_id. Returns: nothing.
 * Errors: insufficient_privilege; no_data_found; check_violation with the hint already_open, or
 *   not_ready with the problems in the detail (comma-separated codes). Logged as contest.opened.
 */
create or replace function public.admin_open_contest(target_contest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contests;
  problems text[];
begin
  perform public.require_contest_staff();
  select * into target from public.contests where id = target_contest_id for update;
  if target.id is null then
    raise exception 'That contest doesn''t exist.' using errcode = 'no_data_found';
  end if;
  if target.opened_at is not null then
    raise exception 'That contest is already open.' using errcode = 'check_violation', hint = 'already_open';
  end if;
  -- Opening is refused until the rules are published in both languages and linked (criterion 2).
  problems := public.contest_problems(target);
  if cardinality(problems) > 0 then
    raise exception 'The contest isn''t ready to open.'
      using errcode = 'check_violation', hint = 'not_ready', detail = array_to_string(problems, ',');
  end if;
  update public.contests set opened_at = now() where id = target_contest_id;
  perform public.log_staff_action('contest.opened', 'contests', target_contest_id::text, null, null, null,
    jsonb_build_object('entries_open_on', target.entries_open_on, 'entries_close_on', target.entries_close_on));
end;
$$;

comment on function public.admin_open_contest(uuid) is 'Opens a complete contest for entries; owner and admin only; logged (S1-E11-15 criterion 2).';
revoke execute on function public.admin_open_contest(uuid) from public, anon;
grant execute on function public.admin_open_contest(uuid) to authenticated;

/* ---------- Entering ---------- */

/**
 * contest_takes_entries_today: is the contest open and today inside its entry window? Internal.
 * Inputs: the contest. Returns: true or false.
 */
create or replace function public.contest_takes_entries_today(target public.contests)
returns boolean
language sql
stable
set search_path = ''
as $$
  select target.opened_at is not null
    and public.romania_today() between target.entries_open_on and target.entries_close_on;
$$;

comment on function public.contest_takes_entries_today(public.contests) is
  'Internal: true while an open contest accepts entries (S1-E11-15 criterion 3).';
revoke execute on function public.contest_takes_entries_today(public.contests) from public, anon, authenticated;

/**
 * contest_writer_fits: is the signed-in writer in one of the contest's age groups and markets?
 * Internal. Uses age_band(), never the year of birth (criterion 5's privacy rule applies to the
 * writer too). Inputs: the contest. Returns: true or false.
 */
create or replace function public.contest_writer_fits(target public.contests)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.age_band()::text = any (target.age_groups)
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.country_code = any (target.market_codes)
    );
$$;

comment on function public.contest_writer_fits(public.contests) is
  'Internal: true when the caller''s age group and market are among the contest''s (S1-E11-15 criterion 1).';
revoke execute on function public.contest_writer_fits(public.contests) from public, anon, authenticated;

/**
 * contest_story_problems: why a story can't be entered in a contest. Internal.
 * Inputs: the contest and the story. Returns: problem codes: not_readable (no chapter readers can
 *   open, deleted, or taken down by moderators), class_only, language, rating (All ages or 13+
 *   only when 13 to 15-year-olds may enter, criterion 4), word_limit. Empty when it may enter.
 */
create or replace function public.contest_story_problems(target public.contests, story public.stories)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when story.deleted_at is not null or public.is_moderated_away('story', story.id)
           or not public.story_has_readable_chapter(story.id) then 'not_readable' end,
    case when story.class_only then 'class_only' end,
    case when not story.language_code = any (target.language_codes) then 'language' end,
    case when '13_to_15' = any (target.age_groups) and story.rating not in ('all_ages', '13_plus')
      then 'rating' end,
    case when target.word_limit is not null and (
        select coalesce(sum(chapters.published_word_count), 0) from public.chapters
        where chapters.story_id = story.id and chapters.status = 'published' and chapters.deleted_at is null
      ) > target.word_limit then 'word_limit' end
  ]::text[], null);
$$;

comment on function public.contest_story_problems(public.contests, public.stories) is
  'Internal: why a story can''t be entered in a contest (S1-E11-15 criteria 3 and 4).';
revoke execute on function public.contest_story_problems(public.contests, public.stories) from public, anon, authenticated;

/**
 * contest_entry_options: the contests the signed-in writer can enter now, as seen from one of
 * their stories (criterion 3: "Enter <contest>" in a story's settings).
 * Inputs: story_slug, the writer's own story. Returns: a JSON array, one item per open contest
 *   that takes entries today and fits the writer's age group and market: id, name_ro, name_en,
 *   page_slug, closes_on, word_limit, entry (the writer's valid entry in it, any story: story_slug,
 *   story_title, is_this_story; or null) and problems (why THIS story can't enter, or
 *   not_active when the account can't write). Empty for anyone else's story or when signed out.
 */
create or replace function public.contest_entry_options(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', contests.id,
      'name_ro', contests.name_ro,
      'name_en', contests.name_en,
      'page_slug', pages.slug,
      'closes_on', contests.entries_close_on,
      'word_limit', contests.word_limit,
      'entry', (
        select jsonb_build_object('story_slug', entered.slug, 'story_title', entered.title,
                                  'is_this_story', entered.id = story.id)
        from public.contest_entries as entries
        join public.stories as entered on entered.id = entries.story_id
        where entries.contest_id = contests.id and entries.user_id = (select auth.uid())
          and entries.status = 'valid'
      ),
      'problems', case when public.is_active_member() then to_jsonb(public.contest_story_problems(contests, story))
                       else '["not_active"]'::jsonb end
    ) order by contests.entries_close_on, contests.name_en), '[]'::jsonb)
  from public.stories as story
  cross join public.contests
  join public.landing_pages as pages on pages.id = contests.landing_page_id
  -- Only the writer's own live story, and only contests that take this writer's entry today.
  where story.slug = story_slug and story.user_id = (select auth.uid()) and story.deleted_at is null
    and public.contest_takes_entries_today(contests) and public.contest_writer_fits(contests);
$$;

comment on function public.contest_entry_options(text) is
  'The contests a writer can enter now, from one of their stories (S1-E11-15 criterion 3).';
revoke execute on function public.contest_entry_options(text) from public, anon;
grant execute on function public.contest_entry_options(text) to authenticated;

/**
 * enter_contest: enters one of the signed-in writer's stories in a contest (criteria 3 and 4).
 * Inputs: target_contest_id; story_slug, the writer's own story. Returns: nothing.
 * Errors (each with a hint the screen turns into words): insufficient_privilege (not_active);
 *   no_data_found (no_story, no_contest: unknown, not open today, or not for this writer);
 *   check_violation (already_entered, or the story's first problem: not_readable, class_only,
 *   language, rating, word_limit).
 */
create or replace function public.enter_contest(target_contest_id uuid, story_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contests;
  story public.stories;
  problems text[];
begin
  -- Step 1: an account that can write (the account gate, architecture 1.7.8).
  if not public.is_active_member() then
    raise exception 'Your account can''t enter contests yet.' using errcode = 'insufficient_privilege', hint = 'not_active';
  end if;
  -- Step 2: the writer's own story and a contest that takes their entry today.
  select * into story from public.stories
  where slug = story_slug and user_id = (select auth.uid()) and deleted_at is null;
  if story.id is null then
    raise exception 'That story isn''t yours.' using errcode = 'no_data_found', hint = 'no_story';
  end if;
  select * into target from public.contests where id = target_contest_id for share;
  if target.id is null or not public.contest_takes_entries_today(target) or not public.contest_writer_fits(target) then
    raise exception 'That contest isn''t taking your entry.' using errcode = 'no_data_found', hint = 'no_contest';
  end if;
  -- Step 3: the story itself must fit the contest.
  problems := public.contest_story_problems(target, story);
  if cardinality(problems) > 0 then
    raise exception 'This story can''t be entered.' using errcode = 'check_violation', hint = problems[1];
  end if;
  -- Step 4: one entry per writer (the unique index also guards two taps at once).
  begin
    insert into public.contest_entries (user_id, contest_id, story_id)
    values ((select auth.uid()), target.id, story.id);
  exception when unique_violation then
    raise exception 'You already have an entry in this contest.' using errcode = 'check_violation', hint = 'already_entered';
  end;
end;
$$;

comment on function public.enter_contest(uuid, text) is 'Enters one of the writer''s stories in an open contest (S1-E11-15 criteria 3 and 4).';
revoke execute on function public.enter_contest(uuid, text) from public, anon;
grant execute on function public.enter_contest(uuid, text) to authenticated;

/**
 * withdraw_contest_entry: withdraws the signed-in writer's entry before entries close
 * (criterion 3). The entry stays as Withdrawn, so staff can see it was withdrawn.
 * Inputs: target_contest_id. Returns: nothing.
 * Errors: no_data_found (no_entry: no valid entry); check_violation (closed: entries have closed).
 */
create or replace function public.withdraw_contest_entry(target_contest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contests;
  entry_id uuid;
begin
  select entries.id into entry_id from public.contest_entries as entries
  where entries.contest_id = target_contest_id and entries.user_id = (select auth.uid()) and entries.status = 'valid';
  if entry_id is null then
    raise exception 'You have no entry in this contest.' using errcode = 'no_data_found', hint = 'no_entry';
  end if;
  select * into target from public.contests where id = target_contest_id;
  if not public.contest_takes_entries_today(target) then
    raise exception 'Entries have closed.' using errcode = 'check_violation', hint = 'closed';
  end if;
  update public.contest_entries set status = 'withdrawn', withdrawn_at = now() where id = entry_id;
end;
$$;

comment on function public.withdraw_contest_entry(uuid) is 'Withdraws the writer''s contest entry before entries close (S1-E11-15 criterion 3).';
revoke execute on function public.withdraw_contest_entry(uuid) from public, anon;
grant execute on function public.withdraw_contest_entry(uuid) to authenticated;
