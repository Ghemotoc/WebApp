/*
 * G12b: genre and tag page backgrounds (bundle G12 of the liquid glass rebuild; the canvas's
 * StaffWebsite board, "Genre and tag pages").
 *
 * The owner and admins pick the deep band at the top of a genre (category) page or a tag page, for
 * every market or for one market. The colours are the six band gradients the genre pages already
 * use (tokens.css --band-*-from/to), each checked for white text at 4.5:1 (contrast-pairs.ts), so
 * a choice can never make the heading unreadable. A genre with no choice keeps its own accent; a
 * tag with no choice keeps the plain heading on the page.
 *
 * What it adds:
 * - list_page_backgrounds: one row per genre or tag and market (no market = everywhere);
 * - admin_set_list_page_background(), admin_clear_list_page_background() and
 *   admin_list_page_backgrounds() for Staff › Website › Genre and tag pages, owner and admin only,
 *   each change in the audit log;
 * - list_page_background(): what a visitor's page shows: the market's own choice, else the one
 *   for everywhere, else nothing.
 * Who calls it: src/features/website/api/staff/listPageBackgrounds.ts (staff) and
 * src/features/discovery/api/listPageBackground.ts (the story list page).
 */

/* ---------- The table ---------- */

create table public.list_page_backgrounds (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete cascade,
  tag_id uuid references public.tags (id) on delete cascade,
  -- The market's country code, or null for every market.
  market_country text,
  palette text not null,
  -- The admin who chose it (convention: the owner column is user_id).
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint list_page_backgrounds_one_list check (num_nonnulls(category_id, tag_id) = 1),
  constraint list_page_backgrounds_palette check (palette in ('plum', 'sage', 'gold', 'sky', 'blush', 'neutral')),
  constraint list_page_backgrounds_market_shape check (market_country is null or market_country ~ '^[A-Z]{2}$'),
  constraint list_page_backgrounds_one_per_place unique nulls not distinct (category_id, tag_id, market_country)
);

comment on table public.list_page_backgrounds is
  'kind: staff; the band colour an admin chose for a genre or tag page, for every market or one (bundle G12b).';

create index list_page_backgrounds_tag_id_idx on public.list_page_backgrounds (tag_id);
create index list_page_backgrounds_user_id_idx on public.list_page_backgrounds (user_id);

alter table public.list_page_backgrounds enable row level security;

-- Owner and admins read the choices; every change goes through the admin_* functions below, and
-- visitors read only the one colour through list_page_background().
create policy list_page_backgrounds_select_website_staff on public.list_page_backgrounds
  for select to authenticated
  using ((select public.staff_may('website_cms', 'act')));

comment on policy list_page_backgrounds_select_website_staff on public.list_page_backgrounds is
  'Allows owner and admin to read the genre and tag page backgrounds; changes go only through admin_* functions (G12b).';

grant select on public.list_page_backgrounds to authenticated;

create trigger list_page_backgrounds_set_updated_at
  before update on public.list_page_backgrounds
  for each row execute function public.set_updated_at();

/* ---------- Which list a key names ---------- */

/**
 * list_page_target: the genre or tag a list kind and key name.
 * Input: list_kind ('category' or 'tag'), list_key (a category's slug, or a tag's name in any
 *   language, as the page address carries it).
 * Returns: the category's ID or the approved tag's ID (the other is null); both null when there
 *   is no such genre or approved tag.
 * Where it fits: the admin functions and list_page_background() below.
 */
create or replace function public.list_page_target(list_kind text, list_key text)
returns table (category_id uuid, tag_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when list_kind = 'category'
         then (select categories.id from public.categories where categories.slug = list_key) end,
    case when list_kind = 'tag' then public.tag_for_name(list_key) end;
$$;

comment on function public.list_page_target(text, text) is
  'Internal: the category or approved tag a list kind and key name (G12b).';

revoke execute on function public.list_page_target(text, text) from public, anon, authenticated;

/* ---------- What a visitor's page shows ---------- */

/**
 * list_page_background: the band colour of a genre or tag page.
 * Input: list_kind ('category' or 'tag'), list_key (the address's slug or tag), visitor_country
 *   (the visitor's country code, or null when unknown).
 * Returns: 'plum', 'sage', 'gold', 'sky', 'blush' or 'neutral'; null when no admin chose one,
 *   so the page keeps its default.
 * Where it fits: the story list page reads it beside the list (StoryListHeader).
 */
create or replace function public.list_page_background(list_kind text, list_key text, visitor_country text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  -- The market's own choice first, then the one for every market.
  select backgrounds.palette
  from public.list_page_target(list_kind, list_key) as target
  join public.list_page_backgrounds as backgrounds
    on backgrounds.category_id is not distinct from target.category_id
   and backgrounds.tag_id is not distinct from target.tag_id
  where (target.category_id is not null or target.tag_id is not null)
    and (backgrounds.market_country is null or backgrounds.market_country = upper(visitor_country))
  order by backgrounds.market_country is null
  limit 1;
$$;

comment on function public.list_page_background(text, text, text) is
  'The band colour a genre or tag page shows in a market, or null for the default (G12b).';

revoke execute on function public.list_page_background(text, text, text) from public;
grant execute on function public.list_page_background(text, text, text) to anon, authenticated;

/* ---------- Staff changes ---------- */

/**
 * admin_set_list_page_background: chooses the band colour of a genre or tag page.
 * Input: list_kind, list_key (as above), market (a market's country code, or null for every
 *   market), new_palette (one of the six band colours).
 * Returns: nothing.
 * Errors: insufficient_privilege for anyone but owner and admin; check_violation with a hint
 *   (no_list, no_market, bad_palette) for a genre or tag, market or colour that doesn't exist.
 * Where it fits: Staff › Website › Genre and tag pages, "Save background".
 */
create or replace function public.admin_set_list_page_background(
  list_kind text, list_key text, market text, new_palette text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  earlier_palette text;
begin
  -- Step 1: owner or admin (website content is admin-only, decided 17 Oct 2026, 19:19).
  perform public.require_website_staff();
  -- Step 2: a real genre or approved tag, a real market and one of the six colours.
  select * into target from public.list_page_target(list_kind, list_key);
  if target.category_id is null and target.tag_id is null then
    raise exception 'There is no such genre or tag.' using errcode = 'check_violation', hint = 'no_list';
  end if;
  if market is not null and not exists (select 1 from public.markets where markets.country_code = market) then
    raise exception 'There is no such market.' using errcode = 'check_violation', hint = 'no_market';
  end if;
  if new_palette is null or new_palette not in ('plum', 'sage', 'gold', 'sky', 'blush', 'neutral') then
    raise exception 'Pick one of the colours.' using errcode = 'check_violation', hint = 'bad_palette';
  end if;
  -- Step 3: the choice, replacing any earlier one for the same page and market.
  select palette into earlier_palette from public.list_page_backgrounds
  where category_id is not distinct from target.category_id and tag_id is not distinct from target.tag_id
    and market_country is not distinct from market;
  insert into public.list_page_backgrounds (category_id, tag_id, market_country, palette, user_id)
  values (target.category_id, target.tag_id, market, new_palette, (select auth.uid()))
  on conflict on constraint list_page_backgrounds_one_per_place do update
    set palette = excluded.palette, user_id = excluded.user_id, updated_at = now();
  -- Step 4: the audit log, in the same transaction (architecture 1.8.1).
  perform public.log_staff_action('website.list_background_set', 'list_page_backgrounds',
    list_kind || ':' || list_key || ':' || coalesce(market, 'everywhere'), null, null,
    jsonb_build_object('palette', earlier_palette), jsonb_build_object('palette', new_palette));
end;
$$;

comment on function public.admin_set_list_page_background(text, text, text, text) is
  'Chooses a genre or tag page''s band colour for every market or one; owner and admin only; logged (G12b).';

revoke execute on function public.admin_set_list_page_background(text, text, text, text) from public, anon;
grant execute on function public.admin_set_list_page_background(text, text, text, text) to authenticated;

/**
 * admin_clear_list_page_background: takes a genre or tag page back to its default band.
 * Input: list_kind, list_key and market, as above.
 * Returns: nothing (clearing a page with no choice is not an error).
 * Errors: insufficient_privilege for anyone but owner and admin.
 * Where it fits: Staff › Website › Genre and tag pages, "Use the default".
 */
create or replace function public.admin_clear_list_page_background(list_kind text, list_key text, market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  earlier_palette text;
begin
  perform public.require_website_staff();
  -- Step 1: the row for this page and market, if there is one.
  select * into target from public.list_page_target(list_kind, list_key);
  delete from public.list_page_backgrounds
  where category_id is not distinct from target.category_id and tag_id is not distinct from target.tag_id
    and (target.category_id is not null or target.tag_id is not null)
    and market_country is not distinct from market
  returning palette into earlier_palette;
  -- Step 2: the audit log, only when something changed.
  if earlier_palette is not null then
    perform public.log_staff_action('website.list_background_cleared', 'list_page_backgrounds',
      list_kind || ':' || list_key || ':' || coalesce(market, 'everywhere'), null, null,
      jsonb_build_object('palette', earlier_palette), jsonb_build_object('palette', null));
  end if;
end;
$$;

comment on function public.admin_clear_list_page_background(text, text, text) is
  'Takes a genre or tag page back to its default band; owner and admin only; logged (G12b).';

revoke execute on function public.admin_clear_list_page_background(text, text, text) from public, anon;
grant execute on function public.admin_clear_list_page_background(text, text, text) to authenticated;

/**
 * admin_list_page_backgrounds: every choice, for the staff page.
 * Input: none.
 * Returns: a JSON list of {kind, key, name, market, palette, set_by, updated_at}, genres first,
 *   then tags by name. key is the category slug or the tag's name; set_by is the admin's username.
 * Errors: insufficient_privilege for anyone but owner and admin.
 * Where it fits: Staff › Website › Genre and tag pages, the lists of genres and tags.
 */
create or replace function public.admin_list_page_backgrounds()
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
        'kind', case when backgrounds.category_id is not null then 'category' else 'tag' end,
        'key', coalesce(categories.slug, tags.name),
        'market', backgrounds.market_country,
        'palette', backgrounds.palette,
        'set_by', profiles.handle,
        'updated_at', backgrounds.updated_at)
      order by backgrounds.category_id is null, coalesce(categories.slug, tags.name), backgrounds.market_country nulls first)
    from public.list_page_backgrounds as backgrounds
    left join public.categories on categories.id = backgrounds.category_id
    left join public.tags on tags.id = backgrounds.tag_id
    left join public.profiles on profiles.id = backgrounds.user_id), '[]'::jsonb);
end;
$$;

comment on function public.admin_list_page_backgrounds() is
  'Staff: every genre and tag page background with who set it; owner and admin only (G12b).';

revoke execute on function public.admin_list_page_backgrounds() from public, anon;
grant execute on function public.admin_list_page_backgrounds() to authenticated;

/* ---------- Download my data: the admin who chose a background ---------- */

CREATE OR REPLACE FUNCTION "public"."data_export_held_tables"() RETURNS TABLE("table_name" "text", "is_included" boolean, "why_left_out" "text")
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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
    ('moderated_items', true, null),
    ('on_call_rota', true, null),
    ('removed_passages', false, 'the exact words staff removed, which may be someone else''s personal data removed to protect them; the removal itself is in story_revisions'),
    ('safeguarding_referrals', false, 'referrals to the police or a prosecutor; handing them out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('sanctions', true, null),
    ('sign_up_ips', true, null),
    ('staff_interns', true, null),
    ('staff_permissions', true, null),
    ('staff_roles', true, null),
    ('story_restrictions', true, null),
    ('story_revisions', true, null);
$$;
