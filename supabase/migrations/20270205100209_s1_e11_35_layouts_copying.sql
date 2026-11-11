/**
 * Migration: ready-made layouts and copying for landing pages (story S1-E11-35, bundle CMS-2c).
 *
 * What it does:
 * - admin_create_landing_page() takes an optional starting content and layout name, so "New page"
 *   can start from a ready-made layout (contest, call for submissions, event, plain page) in one
 *   step. The starter words come from the ro and en locale files in the editor; the database
 *   checks only that the layout is a known one and that the content isn't too big, then logs the
 *   layout with the new page.
 * - admin_copy_landing_page() makes a new page with its own address from an existing one: the
 *   same type and a draft holding the source's newest words. Nothing goes live until it is
 *   published. The copy is in the audit log with the page it came from.
 * Copy block happens inside the editor and is saved with the draft; publishing it is audited as
 * every publish is.
 * Who calls it: the staff landing page editor (src/features/landing-pages/api/staff).
 */

-- Step 1: replace the two-argument create with one that may carry a layout. The old signature is
-- dropped so PostgREST never has to choose between two functions of the same name.
drop function if exists public.admin_create_landing_page(text, text);

/**
 * admin_create_landing_page: starts a landing page at /c/<slug>, empty or from a layout.
 * Inputs: new_slug (lowercase letters, numbers and hyphens), new_page_type (contest, campaign or
 *   information), starting_content (the layout's blocks with starter words, or null for an
 *   empty draft), layout_name (contest, call_for_submissions, event or plain, or null).
 * Returns: the new page's id.
 * Errors: insufficient_privilege (no landing pages area), check_violation (the slug's problem,
 *   bad_type, bad_layout or too_big).
 * Where it fits: Staff › Page builder › New landing page (S1-E11-14, S1-E11-34, S1-E11-35).
 */
create or replace function public.admin_create_landing_page(
  new_slug text,
  new_page_type text,
  starting_content jsonb default null,
  layout_name text default null
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  clean_slug text := lower(btrim(coalesce(new_slug, '')));
  slug_problem text := public.landing_page_slug_problem(lower(btrim(coalesce(new_slug, ''))));
  new_page_id uuid;
begin
  perform public.require_landing_page_staff();
  -- Step 1: a free, allowed address, a known type and, when given, a known layout.
  if slug_problem is not null then
    raise exception 'That address can''t be used.' using errcode = 'check_violation', hint = slug_problem;
  end if;
  if new_page_type is null or new_page_type not in ('contest', 'campaign', 'information') then
    raise exception 'Pick contest, campaign or information.' using errcode = 'check_violation', hint = 'bad_type';
  end if;
  if layout_name is not null and layout_name not in ('contest', 'call_for_submissions', 'event', 'plain') then
    raise exception 'Pick a layout from the list.' using errcode = 'check_violation', hint = 'bad_layout';
  end if;
  -- The same size limit as a saved draft (S1-E11-34 break test).
  if octet_length(coalesce(starting_content, '{}'::jsonb)::text) > 500000 then
    raise exception 'This page is too big to save.' using errcode = 'check_violation', hint = 'too_big';
  end if;
  -- Step 2: the page and its first draft, empty (the column's own default) or with the layout's
  -- blocks.
  insert into public.landing_pages (slug, page_type, user_id)
  values (clean_slug, new_page_type, (select auth.uid()))
  returning id into new_page_id;
  insert into public.landing_page_versions (page_id, content, user_id)
  values (new_page_id, coalesce(starting_content, '{"theme": "plum", "blocks": []}'::jsonb), (select auth.uid()));
  -- Step 3: the audit log names the layout, so a page's starting point can be traced.
  perform public.log_staff_action('landing_page.created', 'landing_pages', new_page_id::text, null, null, null,
    jsonb_strip_nulls(jsonb_build_object('slug', clean_slug, 'type', new_page_type, 'layout', layout_name)));
  return new_page_id;
end;
$$;

comment on function public.admin_create_landing_page(text, text, jsonb, text) is
  'Starts a landing page at /c/<slug>, empty or from a ready-made layout; staff with the landing pages area; logged (S1-E11-14, S1-E11-34, S1-E11-35).';
revoke all on function public.admin_create_landing_page(text, text, jsonb, text) from public;
grant execute on function public.admin_create_landing_page(text, text, jsonb, text) to authenticated;

/**
 * admin_copy_landing_page: makes a new page from an existing one, as a draft.
 * Inputs: source_page_id (the page to copy, archived or not), new_slug (the copy's own address).
 * Returns: the new page's id.
 * Errors: insufficient_privilege (no landing pages area), no_data_found (no such page),
 *   check_violation (the slug's problem).
 * The copy takes the source's type and its newest words: its draft when it has one, otherwise
 * its newest version. Pictures stay linked to their checked files, so they need no new check.
 * Where it fits: Staff › Page builder › a page › Copy page (S1-E11-35).
 */
create or replace function public.admin_copy_landing_page(source_page_id uuid, new_slug text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  clean_slug text := lower(btrim(coalesce(new_slug, '')));
  slug_problem text := public.landing_page_slug_problem(lower(btrim(coalesce(new_slug, ''))));
  source_page public.landing_pages;
  source_content jsonb;
  new_page_id uuid;
begin
  perform public.require_landing_page_staff();
  -- Step 1: the page to copy and a free, allowed address for the copy.
  select * into source_page from public.landing_pages where id = source_page_id;
  if not found then
    raise exception 'There is no such page.' using errcode = 'no_data_found';
  end if;
  if slug_problem is not null then
    raise exception 'That address can''t be used.' using errcode = 'check_violation', hint = slug_problem;
  end if;
  -- Step 2: the newest words: the draft first, otherwise the newest version of any kind.
  select content into source_content
  from public.landing_page_versions
  where page_id = source_page_id
  order by (status = 'draft') desc, created_at desc
  limit 1;
  -- Step 3: the new page, with those words as its draft; nothing goes live until published.
  insert into public.landing_pages (slug, page_type, user_id)
  values (clean_slug, source_page.page_type, (select auth.uid()))
  returning id into new_page_id;
  insert into public.landing_page_versions (page_id, content, user_id)
  values (new_page_id, coalesce(source_content, '{"theme": "plum", "blocks": []}'::jsonb), (select auth.uid()));
  -- Step 4: the audit log says which page it came from.
  perform public.log_staff_action('landing_page.copied', 'landing_pages', new_page_id::text, null, null, null,
    jsonb_build_object('slug', clean_slug, 'type', source_page.page_type,
      'copied_from', source_page.id, 'copied_from_slug', source_page.slug));
  return new_page_id;
end;
$$;

comment on function public.admin_copy_landing_page(uuid, text) is
  'Copies a landing page to a new address as a draft; staff with the landing pages area; logged (S1-E11-35).';
revoke all on function public.admin_copy_landing_page(uuid, text) from public;
grant execute on function public.admin_copy_landing_page(uuid, text) to authenticated;
