-- Migration: an easier page builder (story S1-E11-34, bundle CMS-2b).
--
-- What it does:
-- 1. A new staff area, landing_pages, for the owner, admins and moderators (Change), so the people
--    who run contests and campaigns build their pages; a custom role can hold it too (S1-E11-33).
--    The home page, notices, help and interface text stay in website_cms (owner and admin,
--    decided 17 Oct 2026, 19:19).
-- 2. require_landing_page_staff(), and the eight landing page staff functions recreated to call it
--    (or staff_may('landing_pages', 'act')) instead of the website area. Each body is otherwise
--    unchanged, copied from supabase/schema.sql.
-- 3. The staff read policies on landing_pages and landing_page_versions follow the new area.
-- 4. Five new blocks: picture and text, cards (2 to 4), steps (2 to 6), a quote and a call to
--    action, with their text limits in landing_block_field_rules() and their own checks in
--    landing_block_extra_problems() and landing_picture_problems().
-- Who calls it: the landing page editor (src/features/landing-pages/components/staff/) through
-- src/features/landing-pages/api/landingPages.ts; the public page /c/<slug> reads the blocks.
-- Privacy: no new personal data.

/* ---------- 1. The area ---------- */

insert into public.staff_role_areas (role, area, access)
values ('owner', 'landing_pages', 'act'), ('admin', 'landing_pages', 'act'), ('moderator', 'landing_pages', 'act')
on conflict do nothing;

/* ---------- 2. Who may build landing pages ---------- */

/**
 * require_landing_page_staff: refuses anyone who may not build landing pages.
 * Errors: insufficient_privilege. Where it fits: every landing page staff function below.
 */
create or replace function public.require_landing_page_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('landing_pages', 'act') then
    raise exception 'Only staff with the landing pages area can build landing pages.'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_landing_page_staff() is
  'Internal: refuses anyone who may not build landing pages (S1-E11-34).';

revoke execute on function public.require_landing_page_staff() from public, anon, authenticated;

-- The eight staff functions, each now asking for the landing pages area (copied unchanged
-- otherwise; their grants and comments stay as they were).
CREATE OR REPLACE FUNCTION "public"."landing_picture_upload_allowed"("object_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select public.is_feature_enabled('picture_uploads')
    and public.staff_may('landing_pages', 'act')
    and coalesce(object_name, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$'
    and exists (
      select 1 from public.landing_pages
      where landing_pages.id = split_part(object_name, '/', 1)::uuid and landing_pages.archived_at is null);
$_$;


ALTER FUNCTION "public"."landing_picture_upload_allowed"("object_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."landing_picture_upload_allowed"("object_name" "text") IS 'True for owner and admin, a random file name under a live landing page''s ID and picture_uploads on (CONTESTS-13a2a).';



CREATE OR REPLACE FUNCTION "public"."landing_reminder_json"("target_page_id" "uuid", "content" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case when coalesce(content -> 'blocks', '[]') @> '[{"kind": "remind_me"}]' then
    jsonb_build_object(
      'opens_on', public.landing_entries_open_on(content),
      'is_open', coalesce(public.landing_entries_open_on(content) <= public.romania_today(), false),
      'is_set', exists (select 1 from public.landing_page_reminders as reminders
                        where reminders.page_id = target_page_id
                          and reminders.user_id = (select auth.uid())))
  end;
$$;

CREATE OR REPLACE FUNCTION "public"."register_landing_picture"("target_path" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: owner or admin, while uploads are on.
  perform public.require_landing_page_staff();
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there, the caller uploaded it, under a live page.
  if not public.landing_picture_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'landing-pictures'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to a landing page.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'landing-pictures', target_path, 'landing_picture')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."admin_create_landing_page"("new_slug" "text", "new_page_type" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  clean_slug text := lower(btrim(coalesce(new_slug, '')));
  slug_problem text := public.landing_page_slug_problem(lower(btrim(coalesce(new_slug, ''))));
  new_page_id uuid;
begin
  perform public.require_landing_page_staff();
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

CREATE OR REPLACE FUNCTION "public"."admin_save_landing_page_draft"("target_page_id" "uuid", "new_content" "jsonb", "new_show_from" "date" DEFAULT NULL::"date", "new_take_down_on" "date" DEFAULT NULL::"date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  draft_id uuid;
begin
  perform public.require_landing_page_staff();
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

CREATE OR REPLACE FUNCTION "public"."admin_publish_landing_page"("version_id" "uuid") RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  draft public.landing_page_versions;
  page public.landing_pages;
  problems text[];
  goes_live date;
begin
  perform public.require_landing_page_staff();
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

CREATE OR REPLACE FUNCTION "public"."admin_restore_landing_page_version"("version_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  earlier public.landing_page_versions;
  draft_id uuid;
begin
  perform public.require_landing_page_staff();
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

CREATE OR REPLACE FUNCTION "public"."admin_archive_landing_page"("target_page_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.require_landing_page_staff();
  update public.landing_pages set archived_at = now() where id = target_page_id and archived_at is null;
  if not found then
    raise exception 'There is no such page.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('landing_page.archived', 'landing_pages', target_page_id::text, null, null, null, null);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."admin_landing_picture_states"("target_page_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.require_landing_page_staff();
  return (
    select coalesce(jsonb_object_agg(picture_checks.id, public.picture_state_json(picture_checks)), '{}'::jsonb)
    from public.picture_checks
    where picture_checks.kind = 'landing_picture' and picture_checks.deleted_at is null
      and split_part(picture_checks.path, '/', 1) = target_page_id::text);
end;
$$;

comment on function public.landing_picture_upload_allowed(text) is
  'True for staff with the landing pages area, a random file name under a live landing page''s ID and picture_uploads on (CONTESTS-13a2a, S1-E11-34).';

/* ---------- 3. The staff read policies ---------- */

/** Policy landing_pages_select_staff: staff with the landing pages area read every page. */
drop policy landing_pages_select_staff on public.landing_pages;
create policy landing_pages_select_staff
  on public.landing_pages for select to authenticated
  using ((select public.staff_may('landing_pages', 'view')));
comment on policy landing_pages_select_staff on public.landing_pages is
  'Allows staff with the landing pages area (owner, admin, moderator, or a custom role) to read every page, for the editor (S1-E11-14, S1-E11-34).';

/** Policy landing_page_versions_select_staff: the same staff read every version. */
drop policy landing_page_versions_select_staff on public.landing_page_versions;
create policy landing_page_versions_select_staff
  on public.landing_page_versions for select to authenticated
  using ((select public.staff_may('landing_pages', 'view')));
comment on policy landing_page_versions_select_staff on public.landing_page_versions is
  'Allows staff with the landing pages area to read every version, drafts included, for the editor (S1-E11-14, S1-E11-34).';

comment on policy landing_pictures_insert_website_staff on storage.objects is
  'Allows staff with the landing pages area to add a picture under a landing page''s folder while picture_uploads is on (CONTESTS-13a2a, S1-E11-34).';

/* ---------- 4. The new blocks ---------- */

-- The text fields of every block kind, now with the page builder's five new blocks.
CREATE OR REPLACE FUNCTION "public"."landing_block_field_rules"() RETURNS TABLE("block_kind" "text", "field_name" "text", "longest" integer, "is_required" boolean)
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  values
    ('hero', 'title', 80, true), ('hero', 'intro', 300, false),
    ('text', 'heading', 80, true), ('text', 'body', 4000, true),
    ('key_dates', 'heading', 80, true), ('key_dates', 'note', 300, false),
    ('who_can_enter', 'heading', 80, true), ('who_can_enter', 'body', 1000, true),
    ('prize', 'heading', 80, true), ('prize', 'body', 1000, true),
    ('how_to_enter', 'heading', 80, true), ('how_to_enter', 'body', 2000, true),
    ('rules', 'heading', 80, true), ('rules', 'body', 1000, false), ('rules', 'link_label', 80, true),
    ('questions', 'heading', 80, true),
    ('featured', 'heading', 80, true), ('featured', 'intro', 300, false),
    ('remind_me', 'heading', 80, true), ('remind_me', 'intro', 300, false),
    -- S1-E11-34: the page builder's new blocks.
    ('picture_text', 'heading', 80, true), ('picture_text', 'body', 2000, true),
    ('cards', 'heading', 80, true),
    ('steps', 'heading', 80, true),
    ('quote', 'quote', 300, true), ('quote', 'source', 80, false),
    ('call_to_action', 'heading', 80, true), ('call_to_action', 'body', 300, false),
    ('call_to_action', 'button_label', 40, true);
$$;

-- A block's own checks: links for a call to action, a picture for picture and text, and the
-- cards and steps lists.
CREATE OR REPLACE FUNCTION "public"."landing_block_extra_problems"("block" "jsonb", "block_path" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
declare
  problems text[] := '{}';
  open_on date;
  close_on date;
  results_on date;
  rules_link text := btrim(coalesce(block ->> 'link', ''));
  entry_counts int4range;
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
  elsif block ->> 'kind' in ('rules', 'call_to_action') then
    -- A link is one of our pages ("/help/contest-rules") or an https address (S1-E11-34).
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
  elsif block ->> 'kind' = 'picture_text' then
    -- Picture and text needs its picture; landing_picture_problems() checks it and its alt text.
    if btrim(coalesce(block ->> 'picture_id', '')) = '' then
      problems := problems || (block_path || '.picture:empty');
    end if;
  elsif block ->> 'kind' in ('cards', 'steps') then
    -- 2 to 4 cards or 2 to 6 steps, the same number in both languages, each with a title of up to
    -- 80 characters and words of up to 300 (S1-E11-34).
    entry_counts := case when block ->> 'kind' = 'cards' then int4range(2, 4, '[]') else int4range(2, 6, '[]') end;
    if not (jsonb_array_length(coalesce(block #> '{ro,entries}', '[]')) <@ entry_counts)
       or jsonb_array_length(coalesce(block #> '{ro,entries}', '[]')) <> jsonb_array_length(coalesce(block #> '{en,entries}', '[]')) then
      problems := problems || (block_path || '.entries:wrong_number');
    end if;
    foreach language_code in array array['ro', 'en'] loop
      item_number := 0;
      for item in select value from jsonb_array_elements(coalesce(block #> array[language_code, 'entries'], '[]')) loop
        if btrim(coalesce(item ->> 'title', '')) = '' or btrim(coalesce(item ->> 'body', '')) = ''
           or char_length(item ->> 'title') > 80 or char_length(item ->> 'body') > 300 then
          problems := problems || (block_path || '.' || language_code || '.entries.' || item_number || ':empty');
        end if;
        item_number := item_number + 1;
      end loop;
    end loop;
  end if;
  return problems;
end;
$_$;

-- Which blocks may carry a picture.
CREATE OR REPLACE FUNCTION "public"."landing_picture_problems"("block" "jsonb", "block_path" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  problems text[] := '{}';
  picture_id_text text := nullif(btrim(coalesce(block ->> 'picture_id', '')), '');
  picture public.picture_checks;
  language_code text;
  alt_text text;
begin
  if picture_id_text is null then
    return problems;
  end if;
  -- Picture and text joins Hero and Text (S1-E11-34).
  if block ->> 'kind' not in ('hero', 'text', 'picture_text') then
    return array[block_path || '.picture:not_allowed'];
  end if;
  -- Step 1: alt text in both languages.
  foreach language_code in array array['ro', 'en'] loop
    alt_text := btrim(coalesce(block #>> array[language_code, 'alt'], ''));
    if alt_text = '' then
      problems := problems || (block_path || '.' || language_code || '.alt:empty');
    elsif char_length(alt_text) > 200 then
      problems := problems || (block_path || '.' || language_code || '.alt:too_long');
    end if;
  end loop;
  -- Step 2: the picture itself, visible to everyone.
  if picture_id_text !~ '^[0-9a-f-]{36}$' then
    return problems || (block_path || '.picture:unknown');
  end if;
  select * into picture from public.picture_checks
  where id = picture_id_text::uuid and kind = 'landing_picture' and deleted_at is null;
  if picture.id is null then
    problems := problems || (block_path || '.picture:unknown');
  elsif picture.status not in ('passed', 'approved') or public.is_moderated_away('picture', picture.id) then
    problems := problems || (block_path || '.picture:not_checked');
  end if;
  return problems;
end;
$_$;
