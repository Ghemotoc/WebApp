/*
 * Migration: landing pages for contests and campaigns, part 1: the pages, their versions, the
 * publish checks and the public read (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * What it adds:
 *   landing_pages             one row per page: its address (/c/<slug>), its type (contest,
 *                             campaign or information) and whether staff archived it
 *   landing_page_versions     every version of a page: the theme and the blocks, Romanian and
 *                             English together (a page can't go live with one language missing),
 *                             draft or published, with "show from" and "take down" dates
 *   landing_page_problems()   what stops a version from being published
 *   admin_create_landing_page(), admin_save_landing_page_draft(), admin_publish_landing_page(),
 *   admin_restore_landing_page_version(), admin_archive_landing_page()
 *                             the editors' writes; owner and admin only (area website_cms), each
 *                             logged in the audit log in the same transaction
 *   landing_page()            the public read of /c/<slug>, for anyone
 *
 * How it works, in the same way as the rest of the CMS (S1-E11-06):
 * - A page is built only from fixed blocks: hero, text, key dates, who can enter, prize, how to
 *   enter, rules and questions. There is no free HTML, no script and no colour of the admin's
 *   own: the look is one of four brand themes (criterion 2). Pictures, featured stories and
 *   Remind me arrive in part a2; the sponsor block waits for sponsor campaigns (bundle 14).
 * - A version is live when it is published, its "show from" date is today or earlier in Romanian
 *   time, and no later published version of the page has started. From its "take down" date the
 *   address says the contest or campaign has ended (criterion 11). No job runs: the dates are
 *   compared with today on every read.
 * - Archiving a page takes its address down altogether (criterion 11, "unless staff archive").
 * - Where the data lives (story proposal): in the app's database, because a landing page will
 *   show stories, entries and signed-in actions.
 * Who may edit: only the admin role and the owner (decided 17 Oct 2026, 19:19), like every
 * website page. Copy aimed at minors must not pressure them, so there are no countdown blocks
 * (story legal notes; architecture 1.1, no dark patterns).
 */

/* ---------- The pages ---------- */

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  -- The address part after /c/: lowercase letters, digits and hyphens.
  slug text not null unique,
  -- contest, campaign or information (criterion 1).
  page_type text not null,
  -- The admin who created it. Staff-written site copy, so it may outlive their account.
  user_id uuid references public.profiles (id) on delete set null,
  -- Set when staff archive the page: its address then shows nothing at all.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_pages_slug_is_an_address check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  constraint landing_pages_type_is_known check (page_type in ('contest', 'campaign', 'information'))
);

comment on table public.landing_pages is
  'kind: platform
Landing pages for contests and campaigns at /c/<slug> (S1-E11-14). Staff-written site copy, not user content; user_id is the admin who created it.';

create trigger landing_pages_set_updated_at
  before update on public.landing_pages
  for each row execute function public.set_updated_at();

alter table public.landing_pages enable row level security;

/**
 * Policy landing_pages_select_staff: owner and admin, in a staff session, read every page.
 * Why: the editor lists drafts and archived pages too. Everyone else reads a live page only
 * through landing_page(), never this table.
 */
create policy landing_pages_select_staff
  on public.landing_pages for select to authenticated
  using ((select public.staff_may('website_cms', 'view')));

comment on policy landing_pages_select_staff on public.landing_pages is
  'Allows owner and admin, in a staff session, to read every landing page (S1-E11-14).';

grant select on public.landing_pages to authenticated;  -- landing_pages_select_staff

/* ---------- The versions ---------- */

create table public.landing_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.landing_pages (id) on delete cascade,
  -- {"theme": "plum", "blocks": [{"kind": "hero", "ro": {...}, "en": {...}}, ...]}; the shape of
  -- each block is in src/schemas/landingPages.ts and is checked by landing_page_problems().
  content jsonb not null default '{"theme": "plum", "blocks": []}'::jsonb,
  -- draft: being edited, never shown; published: live from show_from (scheduled until then).
  status text not null default 'draft',
  -- The day it goes live, at 00:00 Romanian time. Null on a draft until one is chosen.
  show_from date,
  -- The day it comes down at 00:00 Romanian time; from then the address says it has ended.
  take_down_on date,
  -- The admin who saved or published it.
  user_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_page_versions_status_is_known check (status in ('draft', 'published')),
  constraint landing_page_versions_published_has_a_date
    check (status = 'draft' or (show_from is not null and published_at is not null)),
  constraint landing_page_versions_down_after_up
    check (take_down_on is null or show_from is null or take_down_on > show_from)
);

comment on table public.landing_page_versions is
  'kind: platform
Every version of a landing page: its theme and blocks in Romanian and English, draft or published, with show-from and take-down dates (S1-E11-14). user_id is the admin who saved it.';

-- One draft per page: saving again updates it.
create unique index landing_page_versions_one_draft
  on public.landing_page_versions (page_id) where status = 'draft';

-- The live lookup reads one page's published versions, newest first.
create index landing_page_versions_published_lookup
  on public.landing_page_versions (page_id, show_from desc, published_at desc)
  where status = 'published';

create trigger landing_page_versions_set_updated_at
  before update on public.landing_page_versions
  for each row execute function public.set_updated_at();

alter table public.landing_page_versions enable row level security;

/**
 * Policy landing_page_versions_select_staff: owner and admin, in a staff session, read every
 * version. Why: the editor shows the draft, scheduled versions and earlier versions to restore.
 */
create policy landing_page_versions_select_staff
  on public.landing_page_versions for select to authenticated
  using ((select public.staff_may('website_cms', 'view')));

comment on policy landing_page_versions_select_staff on public.landing_page_versions is
  'Allows owner and admin, in a staff session, to read every landing page version (S1-E11-14).';

grant select on public.landing_page_versions to authenticated;  -- landing_page_versions_select_staff

/* ---------- What is live ---------- */

/**
 * landing_page_live_version: the version of a page that is live today. Internal.
 * Input: target_page_id. Returns: the version, or null when none has started.
 * Where it fits: landing_page() and the audit log's "before" on publish.
 */
create or replace function public.landing_page_live_version(target_page_id uuid)
returns public.landing_page_versions
language sql
stable
security definer
set search_path = ''
as $$
  select versions.*
  from public.landing_page_versions as versions
  where versions.page_id = target_page_id
    and versions.status = 'published'
    and versions.show_from <= public.romania_today()
  order by versions.show_from desc, versions.published_at desc
  limit 1;
$$;

comment on function public.landing_page_live_version(uuid) is 'Internal: the live version of a landing page today (S1-E11-14).';
revoke execute on function public.landing_page_live_version(uuid) from public, anon, authenticated;

/**
 * landing_page: the public read of /c/<slug> (criterion 11), for anyone, signed in or not.
 * Input: page_slug. Returns: {slug, type, state, show_from, take_down_on, content}, where state
 *   is "live", or "ended" from the take-down date; or null when there is no such page, it is
 *   archived, or nothing is live yet (the screen then says the page can't be found).
 * Never returns a draft, a scheduled version or who wrote it.
 */
create or replace function public.landing_page(page_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', pages.slug,
    'type', pages.page_type,
    'state', case when live.take_down_on is not null and live.take_down_on <= public.romania_today()
                  then 'ended' else 'live' end,
    'show_from', live.show_from,
    'take_down_on', live.take_down_on,
    'content', live.content)
  from public.landing_pages as pages
  cross join lateral public.landing_page_live_version(pages.id) as live
  where pages.slug = lower(btrim(page_slug)) and pages.archived_at is null and live.id is not null;
$$;

comment on function public.landing_page(text) is 'The public read of a landing page at /c/<slug>: live or ended, never a draft (S1-E11-14).';
revoke execute on function public.landing_page(text) from public;
grant execute on function public.landing_page(text) to anon, authenticated;

/* ---------- The checks before publishing ---------- */

/**
 * landing_text_problem: one text field's problem, in the form "<field>:<reason>". Internal.
 * Inputs: the block (as JSON), the language code, the field name, its path for the message,
 *   the longest it may be and whether it is required. Returns: the problem or null.
 */
create or replace function public.landing_text_problem(
  block jsonb, language_code text, field_name text, field_path text, longest integer, is_required boolean
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when is_required and btrim(coalesce(block #>> array[language_code, field_name], '')) = ''
      then field_path || '.' || language_code || '.' || field_name || ':empty'
    when char_length(coalesce(block #>> array[language_code, field_name], '')) > longest
      then field_path || '.' || language_code || '.' || field_name || ':too_long'
  end;
$$;

comment on function public.landing_text_problem(jsonb, text, text, text, integer, boolean) is
  'Internal: one landing page text field''s problem, or null (S1-E11-14).';
revoke execute on function public.landing_text_problem(jsonb, text, text, text, integer, boolean) from public, anon, authenticated;

/**
 * landing_block_field_rules: the text fields of each block kind, with their limits. Internal.
 * Returns: rows of (kind, field, longest, required). The same rules are in
 *   src/schemas/landingPages.ts for the editor's counters; this is the one the server enforces.
 */
create or replace function public.landing_block_field_rules()
returns table (block_kind text, field_name text, longest integer, is_required boolean)
language sql
immutable
set search_path = ''
as $$
  values
    ('hero', 'title', 80, true), ('hero', 'intro', 300, false),
    ('text', 'heading', 80, true), ('text', 'body', 4000, true),
    ('key_dates', 'heading', 80, true), ('key_dates', 'note', 300, false),
    ('who_can_enter', 'heading', 80, true), ('who_can_enter', 'body', 1000, true),
    ('prize', 'heading', 80, true), ('prize', 'body', 1000, true),
    ('how_to_enter', 'heading', 80, true), ('how_to_enter', 'body', 2000, true),
    ('rules', 'heading', 80, true), ('rules', 'body', 1000, false), ('rules', 'link_label', 80, true),
    ('questions', 'heading', 80, true);
$$;

comment on function public.landing_block_field_rules() is 'Internal: the text fields of each landing page block, with their limits (S1-E11-14).';
revoke execute on function public.landing_block_field_rules() from public, anon, authenticated;

/**
 * landing_block_extra_problems: the problems of one block beyond its text fields. Internal.
 * Inputs: the block and its path ("blocks.3"). Returns: an array of problems.
 * Rules: key dates in order (entries open, entries close, results); who can enter names at least
 *   one age group; a rules link goes to one of our pages or an https address; questions have the
 *   same number in both languages, each with a question and an answer.
 */
create or replace function public.landing_block_extra_problems(block jsonb, block_path text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := '{}';
  open_on date;
  close_on date;
  results_on date;
  rules_link text := btrim(coalesce(block ->> 'link', ''));
  language_code text;
  item jsonb;
  item_number integer;
begin
  if block ->> 'kind' = 'key_dates' then
    -- Dates are shared by both languages; a missing or broken one stops publishing.
    begin
      open_on := nullif(block #>> '{dates,entries_open}', '')::date;
      close_on := nullif(block #>> '{dates,entries_close}', '')::date;
      results_on := nullif(block #>> '{dates,results}', '')::date;
    exception when others then
      return array[block_path || '.dates:bad_date'];
    end;
    if open_on is null or close_on is null or results_on is null then
      problems := problems || (block_path || '.dates:empty');
    elsif not (open_on < close_on and close_on <= results_on) then
      problems := problems || (block_path || '.dates:out_of_order');
    end if;
  elsif block ->> 'kind' = 'who_can_enter' then
    -- The platform age groups (S1-E11-15): 13 to 15, 16 to 17, 18 and over.
    if jsonb_typeof(block -> 'age_groups') <> 'array' or jsonb_array_length(block -> 'age_groups') = 0
       or exists (select 1 from jsonb_array_elements_text(block -> 'age_groups') as groups (value)
                  where groups.value not in ('13_to_15', '16_to_17', '18_and_over')) then
      problems := problems || (block_path || '.age_groups:empty');
    end if;
  elsif block ->> 'kind' = 'rules' then
    if rules_link = '' then
      problems := problems || (block_path || '.link:empty');
    elsif rules_link !~ '^(/[a-z0-9/_-]*|https://[^\s]+)$' then
      problems := problems || (block_path || '.link:bad_link');
    end if;
  elsif block ->> 'kind' = 'questions' then
    -- Questions are the same list in both languages.
    if jsonb_array_length(coalesce(block #> '{ro,items}', '[]')) = 0
       or jsonb_array_length(coalesce(block #> '{ro,items}', '[]')) <> jsonb_array_length(coalesce(block #> '{en,items}', '[]')) then
      problems := problems || (block_path || '.items:unequal');
    end if;
    foreach language_code in array array['ro', 'en'] loop
      item_number := 0;
      for item in select value from jsonb_array_elements(coalesce(block #> array[language_code, 'items'], '[]')) loop
        if btrim(coalesce(item ->> 'question', '')) = '' or btrim(coalesce(item ->> 'answer', '')) = ''
           or char_length(item ->> 'question') > 200 or char_length(item ->> 'answer') > 1000 then
          problems := problems || (block_path || '.' || language_code || '.items.' || item_number || ':empty');
        end if;
        item_number := item_number + 1;
      end loop;
    end loop;
  end if;
  return problems;
end;
$$;

comment on function public.landing_block_extra_problems(jsonb, text) is 'Internal: a landing page block''s problems beyond its text fields (S1-E11-14).';
revoke execute on function public.landing_block_extra_problems(jsonb, text) from public, anon, authenticated;

/**
 * landing_page_problems: what stops a version from being published (criterion 9). Callable by
 * the editors so the screen can list the fields to fix before Publish.
 * Inputs: page_type and the version's content. Returns: an array of "<path>:<reason>" (empty when
 *   it may be published).
 * Rules: one of four themes; between 2 and 30 blocks, only the known kinds; one hero, first, so
 *   the page keeps one heading order (WCAG 2.2 AA, criterion 4); every required text in both
 *   languages; a contest page has key dates and a rules link.
 */
create or replace function public.landing_page_problems(page_type text, content jsonb)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
  blocks jsonb := coalesce(content -> 'blocks', '[]'::jsonb);
  block jsonb;
  block_number integer := 0;
  rule record;
  language_code text;
  text_problem text;
begin
  -- Step 1: the page as a whole.
  if coalesce(content ->> 'theme', '') not in ('plum', 'gold', 'sage', 'sky') then
    problems := problems || 'theme:unknown'::text;
  end if;
  if jsonb_typeof(blocks) <> 'array' or jsonb_array_length(blocks) not between 2 and 30 then
    return problems || 'blocks:count'::text;
  end if;
  if blocks -> 0 ->> 'kind' is distinct from 'hero'
     or (select count(*) from jsonb_array_elements(blocks) as each_block where each_block ->> 'kind' = 'hero') <> 1 then
    problems := problems || 'blocks:hero_first'::text;
  end if;
  if page_type = 'contest' and not (blocks @> '[{"kind": "key_dates"}]' and blocks @> '[{"kind": "rules"}]') then
    problems := problems || 'blocks:contest_needs_dates_and_rules'::text;
  end if;
  -- Step 2: every block, its text in both languages and its own rules.
  for block in select value from jsonb_array_elements(blocks) loop
    if not exists (select 1 from public.landing_block_field_rules() as rules where rules.block_kind = block ->> 'kind') then
      problems := problems || ('blocks.' || block_number || ':unknown_kind');
    end if;
    for rule in select * from public.landing_block_field_rules() as rules where rules.block_kind = block ->> 'kind' loop
      foreach language_code in array array['ro', 'en'] loop
        text_problem := public.landing_text_problem(block, language_code, rule.field_name,
          'blocks.' || block_number, rule.longest, rule.is_required);
        if text_problem is not null then
          problems := problems || text_problem;
        end if;
      end loop;
    end loop;
    problems := problems || public.landing_block_extra_problems(block, 'blocks.' || block_number);
    block_number := block_number + 1;
  end loop;
  return problems;
end;
$$;

comment on function public.landing_page_problems(text, jsonb) is 'What stops a landing page version from being published (S1-E11-14 criterion 9).';
revoke execute on function public.landing_page_problems(text, jsonb) from public, anon;
grant execute on function public.landing_page_problems(text, jsonb) to authenticated;

/* ---------- The editors' writes ---------- */

/**
 * landing_page_slug_problem: why an address can't be used, or null. Internal.
 * Input: wanted_slug. Returns: bad_address, reserved (on the reserved names list, S1-E2-04) or
 *   taken (another page has it, archived ones included, so an old link never changes meaning).
 */
create or replace function public.landing_page_slug_problem(wanted_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when wanted_slug is null or wanted_slug !~ '^[a-z0-9][a-z0-9-]{1,59}$' then 'bad_address'
    when public.name_reserved_reason(wanted_slug) is not null then 'reserved'
    when exists (select 1 from public.landing_pages where slug = wanted_slug) then 'taken'
  end;
$$;

comment on function public.landing_page_slug_problem(text) is 'Internal: why a landing page address can''t be used (S1-E11-14 criterion 1).';
revoke execute on function public.landing_page_slug_problem(text) from public, anon, authenticated;

/**
 * admin_create_landing_page: starts a page with an empty draft (criterion 1).
 * Inputs: new_slug (the part after /c/), new_page_type (contest, campaign or information).
 * Returns: the page's id. Errors: insufficient_privilege (owner and admin only); check_violation
 *   with the hint bad_address, reserved, taken or bad_type. Logged as landing_page.created.
 */
create or replace function public.admin_create_landing_page(new_slug text, new_page_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_slug text := lower(btrim(coalesce(new_slug, '')));
  slug_problem text := public.landing_page_slug_problem(lower(btrim(coalesce(new_slug, ''))));
  new_page_id uuid;
begin
  perform public.require_website_staff();
  -- Step 1: a free, allowed address and a known type.
  if slug_problem is not null then
    raise exception 'That address can''t be used.' using errcode = 'check_violation', hint = slug_problem;
  end if;
  if new_page_type is null or new_page_type not in ('contest', 'campaign', 'information') then
    raise exception 'Pick contest, campaign or information.' using errcode = 'check_violation', hint = 'bad_type';
  end if;
  -- Step 2: the page and its first, empty draft.
  insert into public.landing_pages (slug, page_type, user_id)
  values (clean_slug, new_page_type, (select auth.uid()))
  returning id into new_page_id;
  insert into public.landing_page_versions (page_id, user_id) values (new_page_id, (select auth.uid()));
  perform public.log_staff_action('landing_page.created', 'landing_pages', new_page_id::text, null, null, null,
    jsonb_build_object('slug', clean_slug, 'type', new_page_type));
  return new_page_id;
end;
$$;

comment on function public.admin_create_landing_page(text, text) is 'Starts a landing page at /c/<slug>; owner and admin only; logged (S1-E11-14).';
revoke execute on function public.admin_create_landing_page(text, text) from public, anon;
grant execute on function public.admin_create_landing_page(text, text) to authenticated;

/**
 * admin_save_landing_page_draft: saves the editor's work as the page's draft (criterion 12).
 * Inputs: target_page_id, new_content ({theme, blocks}), new_show_from and new_take_down_on
 *   (both optional). Returns: the draft's id. Saving again updates the same draft; nothing on
 *   the website changes. Errors: insufficient_privilege; no_data_found for an unknown or archived
 *   page; check_violation (hint take_down_before_show_from).
 */
create or replace function public.admin_save_landing_page_draft(
  target_page_id uuid, new_content jsonb, new_show_from date default null, new_take_down_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft_id uuid;
begin
  perform public.require_website_staff();
  -- Step 1: a page that is still in use, and dates the right way round.
  if not exists (select 1 from public.landing_pages where id = target_page_id and archived_at is null) then
    raise exception 'There is no such page.' using errcode = 'no_data_found';
  end if;
  if new_take_down_on is not null and new_show_from is not null and new_take_down_on <= new_show_from then
    raise exception 'The page must come down after it goes up.' using errcode = 'check_violation', hint = 'take_down_before_show_from';
  end if;
  -- Step 2: update the page's draft, or start one.
  update public.landing_page_versions
  set content = coalesce(new_content, '{}'::jsonb), show_from = new_show_from,
    take_down_on = new_take_down_on, user_id = (select auth.uid())
  where page_id = target_page_id and status = 'draft'
  returning id into draft_id;
  if draft_id is null then
    insert into public.landing_page_versions (page_id, content, show_from, take_down_on, user_id)
    values (target_page_id, coalesce(new_content, '{}'::jsonb), new_show_from, new_take_down_on, (select auth.uid()))
    returning id into draft_id;
  end if;
  return draft_id;
end;
$$;

comment on function public.admin_save_landing_page_draft(uuid, jsonb, date, date) is 'Saves a landing page draft; owner and admin only (S1-E11-14).';
revoke execute on function public.admin_save_landing_page_draft(uuid, jsonb, date, date) from public, anon;
grant execute on function public.admin_save_landing_page_draft(uuid, jsonb, date, date) to authenticated;

/**
 * admin_publish_landing_page: publishes the draft from its "show from" date, today at the
 * earliest (criteria 9 and 11). The draft becomes a published version; the next save starts a
 * new draft, so every published version is kept.
 * Input: version_id, a draft. Returns: the day it goes live.
 * Errors: insufficient_privilege; no_data_found; check_violation with the problems as the hint
 *   (comma separated, as landing_page_problems() gives them, plus takeDown:before_show_from).
 * Logged as landing_page.published with what showed before and the new content (criterion 12).
 */
create or replace function public.admin_publish_landing_page(version_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.landing_page_versions;
  page public.landing_pages;
  problems text[];
  goes_live date;
begin
  perform public.require_website_staff();
  -- Step 1: the draft, locked so it is published once, and its page.
  select * into draft from public.landing_page_versions where id = version_id and status = 'draft' for update;
  select * into page from public.landing_pages where id = draft.page_id and archived_at is null;
  if draft.id is null or page.id is null then
    raise exception 'There is no draft with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 2: refuse while anything is missing, too long or the wrong way round.
  goes_live := greatest(coalesce(draft.show_from, public.romania_today()), public.romania_today());
  problems := public.landing_page_problems(page.page_type, draft.content);
  if draft.take_down_on is not null and draft.take_down_on <= goes_live then
    problems := problems || 'takeDown:before_show_from'::text;
  end if;
  if cardinality(problems) > 0 then
    raise exception 'Fix these fields before publishing.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 3: publish, logging what showed before and what will show.
  perform public.log_staff_action('landing_page.published', 'landing_pages', page.id::text, null, null,
    jsonb_build_object('content', (public.landing_page_live_version(page.id)).content),
    jsonb_build_object('slug', page.slug, 'show_from', goes_live, 'take_down_on', draft.take_down_on, 'content', draft.content));
  update public.landing_page_versions
  set status = 'published', show_from = goes_live, published_at = now(), user_id = (select auth.uid())
  where id = draft.id;
  return goes_live;
end;
$$;

comment on function public.admin_publish_landing_page(uuid) is 'Publishes a landing page draft from its show-from date; owner and admin only; logged (S1-E11-14).';
revoke execute on function public.admin_publish_landing_page(uuid) from public, anon;
grant execute on function public.admin_publish_landing_page(uuid) to authenticated;

/**
 * admin_restore_landing_page_version: brings an earlier version back as the page's draft
 * (criterion 12). Nothing on the website changes until it is published again.
 * Input: version_id, a published version. Returns: the draft's id.
 * Errors: insufficient_privilege; no_data_found. Logged as landing_page.restored.
 */
create or replace function public.admin_restore_landing_page_version(version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.landing_page_versions;
  draft_id uuid;
begin
  perform public.require_website_staff();
  select * into earlier from public.landing_page_versions where id = version_id and status = 'published';
  if earlier.id is null then
    raise exception 'There is no published version with that id.' using errcode = 'no_data_found';
  end if;
  draft_id := public.admin_save_landing_page_draft(earlier.page_id, earlier.content, null, earlier.take_down_on);
  perform public.log_staff_action('landing_page.restored', 'landing_pages', earlier.page_id::text, null, null, null,
    jsonb_build_object('restored_version', earlier.id, 'content', earlier.content));
  return draft_id;
end;
$$;

comment on function public.admin_restore_landing_page_version(uuid) is 'Brings an earlier landing page version back as the draft; logged (S1-E11-14).';
revoke execute on function public.admin_restore_landing_page_version(uuid) from public, anon;
grant execute on function public.admin_restore_landing_page_version(uuid) to authenticated;

/**
 * admin_archive_landing_page: takes a page's address down altogether, ended note included
 * (criterion 11). The address stays taken, so an old link never points at a new page.
 * Input: target_page_id. Returns: nothing. Errors: insufficient_privilege; no_data_found.
 * Logged as landing_page.archived.
 */
create or replace function public.admin_archive_landing_page(target_page_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_website_staff();
  update public.landing_pages set archived_at = now() where id = target_page_id and archived_at is null;
  if not found then
    raise exception 'There is no such page.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('landing_page.archived', 'landing_pages', target_page_id::text, null, null, null, null);
end;
$$;

comment on function public.admin_archive_landing_page(uuid) is 'Takes a landing page''s address down for good; owner and admin only; logged (S1-E11-14).';
revoke execute on function public.admin_archive_landing_page(uuid) from public, anon;
grant execute on function public.admin_archive_landing_page(uuid) to authenticated;

-- The address /c/ is the app's own: no one may take "c" as a username (S1-E2-04).
insert into public.reserved_names (name, reason, match_rule) values ('c', 'system', 'whole_name')
on conflict (name) do nothing;
