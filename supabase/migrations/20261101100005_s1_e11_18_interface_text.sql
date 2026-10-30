/*
 * Migration: interface text overrides (stories S1-E11-18 and S1-E11-19; architecture 1.8.6, B34).
 *
 * What it adds:
 *   interface_text_overrides         admin edits of the app's interface text and email text, laid
 *                                    over the ro and en locale files. One version per key and
 *                                    locale (BCP 47), never per country (decided 17 Oct 2026, 19:19)
 *   published_interface_text()       the public read: the live override of every key in a locale
 *   interface_text_problems()        what stops a save (empty, a placeholder changed, the literal
 *                                    product name)
 *   admin_save_interface_text(), admin_publish_interface_text(), admin_restore_interface_text(),
 *   admin_reset_interface_text()     the editor's writes; owner and admin only (area website_cms),
 *                                    each logged in the audit log in the same transaction
 *
 * Where the default text lives: the locale files in src/locales/<lang>/ stay the default and what
 * CI checks; keys exist only there, so an override for a key the files no longer have is ignored
 * by the app (decided 17 Oct 2026, 19:16). The database can't read the files, so the editor sends
 * the file text's placeholders and the brand names with every save, and the save refuses a text
 * whose placeholders differ (S1-E11-18 criterion 8; S1-E11-19 criterion 2).
 *
 * How "live" works: as for the website CMS (…_s1_e11_06_website_cms.sql): the latest published
 * version whose "show from" date has come, in Romanian time. A reset is a published version that
 * says "show the file text again".
 */

/* ---------- The table ---------- */

create table public.interface_text_overrides (
  id uuid primary key default gen_random_uuid(),
  -- The locale file key with its namespace: "common:nav.help", "email:confirmation.body".
  text_key text not null,
  -- A BCP 47 locale code ("ro", "en"; later "en-GB"), one of the languages table.
  locale text not null references public.languages (code) on delete cascade,
  -- The text; empty only on a reset version.
  text text not null default '',
  -- draft: being edited, never shown; published: live from show_from (scheduled until then).
  status text not null default 'draft',
  -- True for a published version that brings the file text back (S1-E11-18 "Reset to default").
  is_reset boolean not null default false,
  -- The day it goes live, at 00:00 Romanian time. Null on a draft until one is chosen.
  show_from date,
  -- The admin who saved it (S1-E11-18 data).
  user_id uuid not null references public.profiles (id),
  -- clock_timestamp(), not now(): two publishes in one transaction still keep their order.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interface_text_overrides_status_is_known check (status in ('draft', 'published')),
  constraint interface_text_overrides_key_shape
    check (text_key ~ '^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$' and length(text_key) <= 200),
  constraint interface_text_overrides_text_length check (length(text) <= 5000),
  constraint interface_text_overrides_published_has_a_date
    check (status = 'draft' or (show_from is not null and published_at is not null))
);

comment on table public.interface_text_overrides is
  'kind: staff
Admin overrides of the app''s interface and email text, by key and BCP 47 locale, laid over the locale files (S1-E11-18, S1-E11-19). user_id is the admin who saved it.';

-- One draft per key and locale: saving again updates it.
create unique index interface_text_overrides_one_draft
  on public.interface_text_overrides (text_key, locale) where status = 'draft';

-- The live lookup reads the published versions of one locale, newest first.
create index interface_text_overrides_published_lookup
  on public.interface_text_overrides (locale, text_key, show_from desc, published_at desc)
  where status = 'published';

create trigger interface_text_overrides_set_updated_at
  before update on public.interface_text_overrides
  for each row execute function public.set_updated_at();

alter table public.interface_text_overrides enable row level security;

/**
 * Policy interface_text_overrides_select_admin: owner and admin, in a staff session, read every
 * version. Why: the editor shows drafts, scheduled and earlier versions (S1-E11-18). Everyone else
 * reads only the live text, through published_interface_text(), never this table.
 */
create policy interface_text_overrides_select_admin
  on public.interface_text_overrides for select to authenticated
  using ((select public.staff_may('website_cms', 'view')));

comment on policy interface_text_overrides_select_admin on public.interface_text_overrides is
  'Allows owner and admin, in a staff session, to read every interface text version (S1-E11-18).';

grant select on public.interface_text_overrides to authenticated;  -- interface_text_overrides_select_admin

/* ---------- What is live ---------- */

/**
 * interface_text_live: the live version of every key in one locale, resets included. Internal.
 * Inputs: wanted_locale. Returns: one row per key that has a live published version.
 * Where it fits: published_interface_text(), the publish log's "before" text and the tests.
 */
create or replace function public.interface_text_live(wanted_locale text)
returns setof public.interface_text_overrides
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (version.text_key) version.*
  from public.interface_text_overrides as version
  where version.locale = wanted_locale
    and version.status = 'published'
    and version.show_from <= public.romania_today()
  order by version.text_key, version.show_from desc, version.published_at desc;
$$;

comment on function public.interface_text_live(text) is 'Internal: the live interface text version of each key in a locale (S1-E11-18).';
revoke execute on function public.interface_text_live(text) from public, anon, authenticated;

/**
 * published_interface_text: the overrides the app lays over its locale files (S1-E11-18
 * criterion 9). Anyone may call it, signed in or not: every screen needs its text.
 * Inputs: wanted_locale ("ro", "en"). A regional code ("en-GB") with nothing of its own falls
 *   back to its base language (proposal in the story).
 * Returns: text_key and text of every live override; resets are left out, so the file text shows.
 * Where it fits: src/lib/interface-text-overrides.ts and server/send-email.ts.
 */
create or replace function public.published_interface_text(wanted_locale text)
returns table (text_key text, text text)
language sql
stable
security definer
set search_path = ''
as $$
  -- The locale's own overrides first, then its base language's for keys it doesn't override.
  with own as (
    select live.text_key, live.text, live.is_reset from public.interface_text_live(wanted_locale) as live
  ),
  base as (
    select live.text_key, live.text, live.is_reset
    from public.interface_text_live(split_part(wanted_locale, '-', 1)) as live
    where wanted_locale like '%-%'
      and not exists (select 1 from own where own.text_key = live.text_key)
  )
  select chosen.text_key, chosen.text
  from (select * from own union all select * from base) as chosen
  where not chosen.is_reset;
$$;

comment on function public.published_interface_text(text) is
  'The live interface text overrides of a locale, for the app and the email sender (S1-E11-18, S1-E11-19).';
revoke execute on function public.published_interface_text(text) from public;
grant execute on function public.published_interface_text(text) to anon, authenticated;

/* ---------- Checks ---------- */

/**
 * text_placeholders: the {{placeholders}} in a text, sorted and without repeats. Internal.
 * Inputs: value. Returns: the names, for example {count,productName}.
 */
create or replace function public.text_placeholders(value text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct found[1] order by found[1]), '{}')
  from regexp_matches(value, '\{\{\s*([a-zA-Z0-9_.]+)[^}]*\}\}', 'g') as found;
$$;

comment on function public.text_placeholders(text) is 'Internal: the sorted {{placeholders}} in a text (S1-E11-18).';

/**
 * interface_text_problems: what stops a text from being saved (S1-E11-18 criteria 8 and 14).
 * Inputs: the text, the placeholders of the file text it replaces, and the brand names that must
 *   be written as {{productName}} or {{companyName}} instead.
 * Returns: problem words: text:empty, text:placeholders_changed, text:brand_name. Empty when fine.
 */
create or replace function public.interface_text_problems(
  new_text text, file_placeholders text[], brand_names text[]
)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := '{}';
  wanted text[];
  brand_name text;
begin
  -- Step 1: a language may not be left empty.
  if btrim(coalesce(new_text, '')) = '' then
    return array['text:empty'];
  end if;
  -- Step 2: the same placeholders as the file text, no more and no fewer.
  select coalesce(array_agg(distinct name order by name), '{}') into wanted from unnest(file_placeholders) as name;
  if public.text_placeholders(new_text) <> wanted then
    problems := problems || 'text:placeholders_changed'::text;
  end if;
  -- Step 3: never the literal product or company name, so a rename stays one change (decided
  -- 17 Oct 2026, 12:47).
  foreach brand_name in array coalesce(brand_names, '{}') loop
    if btrim(brand_name) <> '' and position(lower(brand_name) in lower(new_text)) > 0 then
      problems := problems || 'text:brand_name'::text;
      exit;
    end if;
  end loop;
  return problems;
end;
$$;

comment on function public.interface_text_problems(text, text[], text[]) is
  'What stops an interface text from being saved: empty, placeholders changed, a brand name (S1-E11-18).';

/**
 * with_comma_below: changes ş and ţ (cedilla) into ș and ț (comma below), as Romanian is written
 * (CLAUDE.md rule 4; S1-E11-18 criterion 8). Inputs: value. Returns: the fixed text.
 */
create or replace function public.with_comma_below(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(value, 'şţŞŢ', 'șțȘȚ');
$$;

comment on function public.with_comma_below(text) is 'Turns Romanian cedilla letters into comma-below ones (S1-E11-18).';

/* ---------- The editor's writes ---------- */

/**
 * admin_save_interface_text: saves the draft of one key in one locale (S1-E11-18 criteria 2
 * and 8). Nothing in the app changes until it is published.
 * Inputs: text_key ("common:nav.help"), locale, new_text, file_placeholders (the placeholders of
 *   the file text, from the editor), brand_names, new_show_from (optional).
 * Returns: the draft's id. Cedilla letters are fixed before saving.
 * Errors: insufficient_privilege; check_violation with the problems as the hint
 *   ("text:placeholders_changed"), or hint unknown_language / bad_key.
 * Where it fits: Staff › Website › Interface text and Email templates.
 */
create or replace function public.admin_save_interface_text(
  text_key text, locale text, new_text text, file_placeholders text[], brand_names text[],
  new_show_from date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  problems text[];
  draft_id uuid;
  fixed_text text := public.with_comma_below(coalesce(new_text, ''));
begin
  perform public.require_website_staff();
  -- Step 1: the place: a known language and a key shaped like a locale file key.
  if not exists (select 1 from public.languages where code = locale) then
    raise exception 'That language doesn''t exist.' using errcode = 'check_violation', hint = 'unknown_language';
  end if;
  if text_key !~ '^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$' then
    raise exception 'That isn''t a text key.' using errcode = 'check_violation', hint = 'bad_key';
  end if;
  -- Step 2: the text itself.
  problems := public.interface_text_problems(fixed_text, file_placeholders, brand_names);
  if cardinality(problems) > 0 then
    raise exception 'Fix this text before saving.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 3: one draft per key and locale; saving again updates it.
  update public.interface_text_overrides as draft
  set text = fixed_text, show_from = new_show_from, user_id = (select auth.uid())
  where draft.text_key = admin_save_interface_text.text_key and draft.locale = admin_save_interface_text.locale
    and draft.status = 'draft'
  returning draft.id into draft_id;
  if draft_id is null then
    insert into public.interface_text_overrides (text_key, locale, text, show_from, user_id)
    values (text_key, locale, fixed_text, new_show_from, (select auth.uid()))
    returning id into draft_id;
  end if;
  return draft_id;
end;
$$;

comment on function public.admin_save_interface_text(text, text, text, text[], text[], date) is
  'Saves the draft of one interface text key in one locale; owner and admin only (S1-E11-18).';
revoke execute on function public.admin_save_interface_text(text, text, text, text[], text[], date) from public, anon;
grant execute on function public.admin_save_interface_text(text, text, text, text[], text[], date) to authenticated;

/**
 * interface_text_live_text: the live override text of a key, or null when the file text shows.
 * Internal. Inputs: the key and locale. Where it fits: the "before" text in the audit log.
 */
create or replace function public.interface_text_live_text(wanted_key text, wanted_locale text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when live.is_reset then null else live.text end
  from public.interface_text_live(wanted_locale) as live
  where live.text_key = wanted_key;
$$;

comment on function public.interface_text_live_text(text, text) is 'Internal: the live override of a key, null for the file text (S1-E11-18).';
revoke execute on function public.interface_text_live_text(text, text) from public, anon, authenticated;

/**
 * admin_publish_interface_text: publishes a draft (S1-E11-18 criteria 5 and 13).
 * Inputs: version_id, the draft. Returns: the day it goes live (today when the date is missing
 *   or past; a future date schedules it and the current text stays until then).
 * Errors: insufficient_privilege; no_data_found when there is no such draft.
 * Logged as interface_text.published with the key, locale, go-live date and before and after text.
 */
create or replace function public.admin_publish_interface_text(version_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.interface_text_overrides;
  goes_live date;
begin
  perform public.require_website_staff();
  -- Step 1: the draft, locked so it is published once.
  select * into draft from public.interface_text_overrides where id = version_id and status = 'draft' for update;
  if draft.id is null then
    raise exception 'There is no draft with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 2: publish, logging what showed before (null: the file text) and what will show.
  goes_live := greatest(coalesce(draft.show_from, public.romania_today()), public.romania_today());
  perform public.log_staff_action('interface_text.published', 'interface_text_overrides', draft.id::text, null, null,
    jsonb_build_object('text', public.interface_text_live_text(draft.text_key, draft.locale)),
    jsonb_build_object('key', draft.text_key, 'locale', draft.locale, 'show_from', goes_live, 'text', draft.text));
  update public.interface_text_overrides
  set status = 'published', show_from = goes_live, published_at = clock_timestamp(), user_id = (select auth.uid())
  where id = draft.id;
  return goes_live;
end;
$$;

comment on function public.admin_publish_interface_text(uuid) is
  'Publishes an interface text draft from its show-from date; owner and admin only; logged (S1-E11-18).';
revoke execute on function public.admin_publish_interface_text(uuid) from public, anon;
grant execute on function public.admin_publish_interface_text(uuid) to authenticated;

/**
 * admin_restore_interface_text: brings an earlier text back as the key's draft (S1-E11-18
 * criterion 6). Nothing changes in the app until it is published again.
 * Inputs: version_id, a published version that isn't a reset. Returns: the draft's id.
 * Errors: insufficient_privilege; no_data_found. Logged as interface_text.restored.
 */
create or replace function public.admin_restore_interface_text(version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.interface_text_overrides;
  draft_id uuid;
begin
  perform public.require_website_staff();
  -- Step 1: the earlier version (a reset has no text to restore).
  select * into earlier from public.interface_text_overrides
  where id = version_id and status = 'published' and not is_reset;
  if earlier.id is null then
    raise exception 'There is no earlier version with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 2: its text becomes the draft. It was checked when it was saved, so the checks are
  -- passed its own placeholders.
  draft_id := public.admin_save_interface_text(earlier.text_key, earlier.locale, earlier.text,
    public.text_placeholders(earlier.text), '{}', null);
  perform public.log_staff_action('interface_text.restored', 'interface_text_overrides', draft_id::text, null, null,
    jsonb_build_object('restored_from', earlier.id, 'published_at', earlier.published_at),
    jsonb_build_object('key', earlier.text_key, 'locale', earlier.locale, 'text', earlier.text));
  return draft_id;
end;
$$;

comment on function public.admin_restore_interface_text(uuid) is
  'Restores an earlier interface text as a draft; owner and admin only; logged (S1-E11-18).';
revoke execute on function public.admin_restore_interface_text(uuid) from public, anon;
grant execute on function public.admin_restore_interface_text(uuid) to authenticated;

/**
 * admin_reset_interface_text: brings the file text back from today (S1-E11-18 criterion 7).
 * Inputs: text_key, locale. Returns: nothing.
 * Errors: insufficient_privilege; no_data_found when the file text already shows.
 * Logged as interface_text.reset with the text that came down.
 */
create or replace function public.admin_reset_interface_text(text_key text, locale text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  live_text text := public.interface_text_live_text(text_key, locale);
  reset_id uuid;
begin
  perform public.require_website_staff();
  if live_text is null then
    raise exception 'This text already shows the default.' using errcode = 'no_data_found';
  end if;
  -- A published reset from today; earlier versions stay for Restore.
  insert into public.interface_text_overrides (text_key, locale, status, is_reset, show_from, user_id, published_at)
  values (text_key, locale, 'published', true, public.romania_today(), (select auth.uid()), clock_timestamp())
  returning id into reset_id;
  perform public.log_staff_action('interface_text.reset', 'interface_text_overrides', reset_id::text, null, null,
    jsonb_build_object('text', live_text), jsonb_build_object('key', text_key, 'locale', locale, 'text', null));
end;
$$;

comment on function public.admin_reset_interface_text(text, text) is
  'Brings the locale file text of a key back from today; owner and admin only; logged (S1-E11-18).';
revoke execute on function public.admin_reset_interface_text(text, text) from public, anon;
grant execute on function public.admin_reset_interface_text(text, text) to authenticated;
