/*
 * Migration: the short line staff write under a genre or tag page's title (BOOKS-A06 and
 * BOOKS-A09, user stories 1.6 and 1.9; boards A06-ReadGenre "Maps, magic and long journeys." and
 * A09-ReadTag "Stories where strangers become the people you'd go back for."; Robert, 25 Nov 2026,
 * 09:50 UTC: every widget the boards draw is built, with the way to edit it from the admin site).
 *
 * What it adds:
 * - list_page_lines: one line per genre or tag and language (ro, en and the other open
 *   languages), written by the owner or an admin. Website text comes only from staff, never from
 *   the locale files (decided 17 Oct 2026, 19:14).
 * - list_page_line(list_kind, list_key, page_language): what a visitor's page shows: the line in
 *   the page's language, else the English one (English is the main language, LOCALISE-1), else
 *   nothing; with the language it is written in, so the page can mark an English line as English.
 * - admin_set_list_page_line(list_kind, list_key, line_language, new_line) and
 *   admin_list_page_lines() for Staff › Website › Genre and tag pages, owner and admin only
 *   (decided 17 Oct 2026, 19:19), each change in the audit log; an empty line clears it.
 * - data_export_held_tables() gains list_page_lines (its user_id is the admin, as for
 *   list_page_backgrounds).
 * Who calls it: src/features/website (ListLinesSection, staff) and src/features/discovery
 * (StoryListHeader, through useListPageLine).
 * Tests: supabase/tests/database/408-list-page-lines.test.sql.
 */

/* ---------- 1. The table ---------- */

create table public.list_page_lines (
  id uuid primary key default gen_random_uuid(),
  -- The genre, or null for a tag.
  category_id uuid references public.categories (id) on delete cascade,
  -- The tag, or null for a genre.
  tag_id uuid references public.tags (id) on delete cascade,
  -- The language the line is written in, a code from public.languages ('ro', 'en', …).
  language text not null references public.languages (code),
  -- The line itself: one short sentence, as on the boards.
  line text not null,
  -- The admin who wrote it (convention: the owner column is user_id).
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint list_page_lines_one_list check (num_nonnulls(category_id, tag_id) = 1),
  constraint list_page_lines_length check (char_length(line) between 1 and 200),
  constraint list_page_lines_one_per_language unique nulls not distinct (category_id, tag_id, language)
);

comment on table public.list_page_lines is
  'kind: staff; the line an admin wrote under a genre or tag page''s title, per language (BOOKS-A06, BOOKS-A09).';

create index list_page_lines_tag_id_idx on public.list_page_lines (tag_id);
create index list_page_lines_user_id_idx on public.list_page_lines (user_id);
create index list_page_lines_language_idx on public.list_page_lines (language);

alter table public.list_page_lines enable row level security;

-- Owner and admins read the lines; every change goes through the admin_* functions below, and
-- visitors read only one line through list_page_line().
create policy list_page_lines_select_website_staff on public.list_page_lines
  for select to authenticated
  using ((select public.staff_may('website_cms', 'act')));

comment on policy list_page_lines_select_website_staff on public.list_page_lines is
  'Allows owner and admin to read the genre and tag page lines; changes go only through admin_* functions (BOOKS-A06).';

grant select on public.list_page_lines to authenticated;

create trigger list_page_lines_set_updated_at
  before update on public.list_page_lines
  for each row execute function public.set_updated_at();

/* ---------- 2. What a visitor's page shows ---------- */

/**
 * list_page_line: the line under a genre or tag page's title.
 * Input: list_kind ('category' or 'tag'), list_key (the address's slug or tag), page_language
 *   (the language the page is shown in, such as 'ro').
 * Returns: {line, language}: the line in that language, else the English line, else null (the
 *   page then shows no line, which is never wrong, only plainer). language lets the page put
 *   lang="en" on an English line shown on a Romanian page (WCAG 3.1.2). Never who wrote it.
 * Where it fits: StoryListHeader reads it beside the list (useListPageLine).
 */
create or replace function public.list_page_line(list_kind text, list_key text, page_language text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- The page's own language first, then English (LOCALISE-1: English is the main language).
  select jsonb_build_object('line', lines.line, 'language', lines.language)
  from public.list_page_target(list_kind, list_key) as target
  join public.list_page_lines as lines
    on lines.category_id is not distinct from target.category_id
   and lines.tag_id is not distinct from target.tag_id
  where (target.category_id is not null or target.tag_id is not null)
    and lines.language in (lower(page_language), 'en')
  order by lines.language <> lower(page_language)
  limit 1;
$$;

comment on function public.list_page_line(text, text, text) is
  'The line under a genre or tag page''s title in a language (English when that one has none), or null (BOOKS-A06).';

revoke execute on function public.list_page_line(text, text, text) from public;
grant execute on function public.list_page_line(text, text, text) to anon, authenticated;

/* ---------- 3. Staff changes ---------- */

/**
 * admin_set_list_page_line: writes, changes or clears the line under a genre or tag page's title.
 * Input: list_kind, list_key (as above), line_language (a code from public.languages), new_line
 *   (the sentence; empty or only spaces clears the line in that language).
 * Returns: nothing.
 * Errors: insufficient_privilege for anyone but owner and admin; check_violation with a hint
 *   (no_list, no_language, too_long) for a genre or tag or language that doesn't exist, or a line
 *   over 200 characters.
 * Where it fits: Staff › Website › Genre and tag pages, "Save line".
 */
create or replace function public.admin_set_list_page_line(
  list_kind text, list_key text, line_language text, new_line text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  cleaned_line text := nullif(btrim(coalesce(new_line, '')), '');
  earlier_line text;
begin
  -- Step 1: owner or admin (website content is admin-only, decided 17 Oct 2026, 19:19).
  perform public.require_website_staff();
  -- Step 2: a real genre or approved tag, a real language and a short line.
  select * into target from public.list_page_target(list_kind, list_key);
  if target.category_id is null and target.tag_id is null then
    raise exception 'There is no such genre or tag.' using errcode = 'check_violation', hint = 'no_list';
  end if;
  if not exists (select 1 from public.languages where languages.code = line_language) then
    raise exception 'There is no such language.' using errcode = 'check_violation', hint = 'no_language';
  end if;
  if char_length(cleaned_line) > 200 then
    raise exception 'The line is longer than 200 characters.' using errcode = 'check_violation', hint = 'too_long';
  end if;
  -- Step 3: the earlier line, for the audit log.
  select line into earlier_line from public.list_page_lines
  where category_id is not distinct from target.category_id and tag_id is not distinct from target.tag_id
    and language = line_language;
  -- Step 4: clear, or write over any earlier line in the same language.
  if cleaned_line is null then
    delete from public.list_page_lines
    where category_id is not distinct from target.category_id and tag_id is not distinct from target.tag_id
      and language = line_language;
  else
    insert into public.list_page_lines (category_id, tag_id, language, line, user_id)
    values (target.category_id, target.tag_id, line_language, cleaned_line, (select auth.uid()))
    on conflict on constraint list_page_lines_one_per_language do update
      set line = excluded.line, user_id = excluded.user_id, updated_at = now();
  end if;
  -- Step 5: the audit log, in the same transaction (architecture 1.8.1), only when it changed.
  if earlier_line is distinct from cleaned_line then
    perform public.log_staff_action('website.list_line_set', 'list_page_lines',
      list_kind || ':' || list_key || ':' || line_language, null, null,
      jsonb_build_object('line', earlier_line), jsonb_build_object('line', cleaned_line));
  end if;
end;
$$;

comment on function public.admin_set_list_page_line(text, text, text, text) is
  'Writes or clears the line under a genre or tag page''s title in one language; owner and admin only; logged (BOOKS-A06).';

revoke execute on function public.admin_set_list_page_line(text, text, text, text) from public, anon;
grant execute on function public.admin_set_list_page_line(text, text, text, text) to authenticated;

/**
 * admin_list_page_lines: every line, for the staff page.
 * Input: none.
 * Returns: a JSON list of {kind, key, language, line, set_by, updated_at}, genres first, then
 *   tags by name. key is the category slug or the tag's name; set_by is the admin's username.
 * Errors: insufficient_privilege for anyone but owner and admin.
 * Where it fits: Staff › Website › Genre and tag pages, "Lines under the title".
 */
create or replace function public.admin_list_page_lines()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_website_staff();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'kind', case when lines.category_id is not null then 'category' else 'tag' end,
        'key', coalesce(categories.slug, tags.name),
        'language', lines.language,
        'line', lines.line,
        'set_by', profiles.handle,
        'updated_at', lines.updated_at)
      order by lines.category_id is null, coalesce(categories.slug, tags.name), lines.language)
    from public.list_page_lines as lines
    left join public.categories on categories.id = lines.category_id
    left join public.tags on tags.id = lines.tag_id
    left join public.profiles on profiles.id = lines.user_id), '[]'::jsonb);
end;
$$;

comment on function public.admin_list_page_lines() is
  'Staff: every genre and tag page line with who wrote it; owner and admin only (BOOKS-A06).';

revoke execute on function public.admin_list_page_lines() from public, anon;
grant execute on function public.admin_list_page_lines() to authenticated;

/* ---------- 4. Download my data's register of staff tables ---------- */

/**
 * data_export_held_tables: redefined in full with list_page_lines added (its user_id is the admin
 * who wrote the line, not data about their account). Everything else is as migration 447 left it.
 */
create or replace function public.data_export_held_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('abuse_image_evidence', false, 'evidence kept for the police about a suspected child abuse image; handing it out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('account_staff_notes', false, 'staff notes can name other people (a reporter, a linked account) or a safeguarding concern, so they are not in the automatic file; when the person asks for their data, staff copy the notes in by hand after taking out other people''s details (GDPR art. 15(4) and art. 23; lawyer to check)'),
    ('audit_log', false, 'the record of what staff did; the changes it records about the person are in the groups below'),
    ('brand_assets', false, 'user_id is the staff member who chose a logo, not data about their account'),
    ('case_account_links', false, 'a moderator''s note that two accounts may be one person, kept to spot banned accounts coming back; telling the person would defeat it (GDPR art. 23; lawyer to check)'),
    ('case_actions', false, 'user_id is the staff member who decided; the decisions reach the person as statements of reasons, which are included'),
    ('cases', false, 'open moderation cases; decisions reach the person as statements of reasons, which are included, and an open case may be held back while it is looked into (GDPR art. 23; lawyer to check)'),
    ('compliance_log_entries', false, 'user_id is the staff member who logged an authority order, not data about their account'),
    ('copied_work_notes', true, null),
    ('data_requests', true, null),
    ('featured_picks', false, 'user_id is the staff member who picked a story for Featured this week, not data about their account; the writer is told by a notification, which is in their export'),
    ('interface_text_overrides', false, 'user_id is the admin who edited interface text, not data about their account'),
    ('list_page_backgrounds', false, 'user_id is the admin who chose a genre or tag page background, not data about their account'),
    ('list_page_lines', false, 'user_id is the admin who wrote the line under a genre or tag page''s title, not data about their account'),
    ('moderated_items', true, null),
    ('on_call_rota', true, null),
    ('removed_passages', false, 'the exact words staff removed, which may be someone else''s personal data removed to protect them; the removal itself is in story_revisions'),
    ('safeguarding_referrals', false, 'referrals to the police or a prosecutor; handing them out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('sanctions', true, null),
    ('sign_up_ips', true, null),
    ('staff_custom_role_areas', false, 'user_id is the admin who set an area in a custom role, not data about their account'),
    ('staff_custom_role_holders', true, null),
    ('staff_custom_roles', false, 'user_id is the admin who made the custom role; the roles someone holds are in staff_custom_role_holders'),
    ('staff_interns', true, null),
    ('staff_permissions', true, null),
    ('staff_roles', true, null),
    ('story_restrictions', true, null),
    ('story_revisions', true, null),
    ('writer_follow_picks', false, 'user_id is the admin who put a writer in To follow this week, not data about their account; the writer''s place in the list is shown publicly on the Read page');
$$;

comment on function public.data_export_held_tables() is
  'Internal: every staff table with a user_id and whether Download my data''s "held_about_you" includes it, or why not (QA-7, LOGS-1a, LOOK-4a, S1-E11-33, user stories 1.4, 1.6 and 1.9; GDPR art. 15).';
revoke execute on function public.data_export_held_tables() from public, anon, authenticated;
