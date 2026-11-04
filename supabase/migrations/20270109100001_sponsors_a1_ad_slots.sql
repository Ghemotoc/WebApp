/*
 * Migration: the ad slots on public pages and how the server fills them (bundle SPONSORS, part a1;
 * story S1-E12-01; board AdFormats).
 *
 * What it adds:
 * - ad_format and ad_label enums: the four slot shapes (wide banner, portrait, side box, card in a
 *   list) and the three labels (Sponsored for our sponsors, Ad for the network, and our own
 *   house ads);
 * - ad_slots: the catalogue of slots, one row per slot on a public page, at most two per page
 *   (decided 17 Oct 2026, 11:53: the unique (page_key, position) with position 1 or 2 enforces
 *   it). Seeded here; staff turn slots off and book them in part e (S1-E12-05);
 * - page_ads(): the one call a page makes. It fills every slot of the page from the page's context
 *   only (category, tag, language), never from anything about the reader, and never shows the
 *   same ad twice on a page. Until sponsors (part b) and the ad network (part d) exist, every slot
 *   gets a house ad: one of our live landing pages, or one of three built-in house ads (start
 *   writing, the classics, the forums), so a slot is never blank;
 * - class spaces and stories shared only with a class get no slot at all (Q70).
 * Who calls it: src/features/ads/ (the AdSlot component on every public page).
 * What comes next: sponsor campaigns (part b) fill slots first, then the network (part d).
 */

/* ---------- 1. Formats and labels ---------- */

-- The four shapes a slot can take (S1-E12-01 criterion 9; board AdFormats).
create type public.ad_format as enum ('wide', 'portrait', 'side_box', 'list_card');
comment on type public.ad_format is
  'A slot''s shape: wide banner (up to 970 × 120, 100 tall on phones), portrait (300 × 600, 1200 px and wider), side box (300 × 250, desktop side column) or a card in a list (S1-E12-01).';

-- What the label on an ad says (Q7, decided 16 Oct 2026, late evening).
create type public.ad_label as enum ('sponsored', 'ad', 'house');
comment on type public.ad_label is
  'Sponsored (our sponsors), Ad (the ad network) or house (our own pages) (S1-E12-01, Q7).';

/* ---------- 2. The slot catalogue ---------- */

create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  -- The slot's name, for example chapter_end; the screens ask for slots by page, not by name.
  slot_key text not null unique
    constraint ad_slots_key_shape check (slot_key ~ '^[a-z][a-z_]{2,40}$'),
  -- The public page it sits on, for example discover or thread.
  page_key text not null
    constraint ad_slots_page_shape check (page_key ~ '^[a-z][a-z_]{2,40}$'),
  -- 1 or 2: at most two slots on any page (decided 17 Oct 2026, 11:53).
  position smallint not null
    constraint ad_slots_two_per_page check (position in (1, 2)),
  format public.ad_format not null,
  -- Staff can switch a slot off (part e); a switched-off slot is never drawn.
  is_on boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_slots_one_per_position unique (page_key, position)
);
comment on table public.ad_slots is
  'kind: platform
Every ad slot on a public page, at most two per page (S1-E12-01).';
create trigger ad_slots_set_updated_at
  before update on public.ad_slots
  for each row execute function public.set_updated_at();
alter table public.ad_slots enable row level security;
grant select on public.ad_slots to anon, authenticated;

/**
 * Policy ad_slots_select_all: anyone may read which slots exist, because they say nothing about
 * anyone; it lets the screens reserve each slot's space before its ad arrives. Nobody writes
 * directly: the rows come from migrations, and staff change them through admin_* functions (part e).
 */
create policy ad_slots_select_all
  on public.ad_slots for select to anon, authenticated
  using (true);
comment on policy ad_slots_select_all on public.ad_slots is
  'Allows everyone to read the slot catalogue; it holds no personal data (S1-E12-01).';

-- The public pages and their slots (S1-E12-01 criterion 5; board AdFormats "Where you might see
-- them"). Pages that aren't public (sign-up, writing tools, messages, settings, help, staff) have
-- none, and class spaces never get one.
insert into public.ad_slots (slot_key, page_key, position, format) values
  ('chapter_end', 'chapter', 1, 'wide'),
  ('story_wide', 'story', 1, 'wide'),
  ('discover_wide', 'discover', 1, 'wide'),
  ('discover_card', 'discover', 2, 'list_card'),
  ('search_wide', 'search', 1, 'wide'),
  ('search_portrait', 'search', 2, 'portrait'),
  ('classics_wide', 'classics', 1, 'wide'),
  ('see_all_card', 'see_all', 1, 'list_card'),
  ('teaser_wide', 'teaser', 1, 'wide'),
  ('forums_wide', 'forums', 1, 'wide'),
  ('forums_side', 'forums', 2, 'side_box'),
  ('thread_wide', 'thread', 1, 'wide'),
  ('thread_side', 'thread', 2, 'side_box'),
  ('space_wide', 'space', 1, 'wide'),
  ('profile_wide', 'profile', 1, 'wide'),
  ('library_wide', 'library', 1, 'wide');

/* ---------- 3. Where ads are never shown ---------- */

/**
 * ads_are_barred: true when the page belongs to a class space, or is a story shared only with a
 * class: no slot is drawn there (S1-E12-01 criterion 4; Q70).
 * Inputs: context, the page's context as the screen sent it (space_slug, story_slug).
 * Returns: true when the page must show no ad. Internal: page_ads().
 */
create or replace function public.ads_are_barred(context jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.spaces
                 where spaces.slug = context ->> 'space_slug' and spaces.kind = 'class')
      or exists (select 1 from public.stories
                 where stories.slug = context ->> 'story_slug' and stories.class_only);
$$;
comment on function public.ads_are_barred(jsonb) is
  'Internal: no ads in a class space or on a class-only story (S1-E12-01, Q70).';
revoke execute on function public.ads_are_barred(jsonb) from public, anon, authenticated;

/* ---------- 4. The house ads ---------- */

/**
 * house_ad_candidates: our own ads that can fill a slot, in a fixed order for today and this page.
 * The order is a hash of the ad's key, the page and the Romanian date, so it changes each day and
 * from page to page but never depends on who is looking.
 * Inputs: page_key. Returns: rows of (ad_key, kind, page_slug, title_ro, title_en, ad_rank, 1 for
 *   the first choice): first our live
 *   landing pages (kind landing, with the page's title in both languages), then the three built-in
 *   ones (kind write, classics or forums: their words are in the locale files). The built-in ad for
 *   the page itself is left out (no "Read the classics" on the classics page).
 * Internal: page_ads().
 */
create or replace function public.house_ad_candidates(page_key text)
returns table (ad_key text, kind text, page_slug text, title_ro text, title_en text, ad_rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with landing as (
    -- Our live landing pages, with the hero block's title in each language (S1-E11-14).
    select 'landing:' || pages.slug as ad_key, 'landing' as kind, pages.slug as page_slug,
      live.content #>> '{blocks,0,ro,title}' as title_ro, live.content #>> '{blocks,0,en,title}' as title_en,
      0 as tier
    from public.landing_pages as pages
    cross join lateral public.landing_page_live_version(pages.id) as live
    where pages.archived_at is null and live.id is not null
  ), built_in as (
    -- The three built-in house ads; their words live in the ads locale files.
    select 'house:' || built.kind, built.kind, null::text, null::text, null::text, 1
    from (values ('write'), ('classics'), ('forums')) as built (kind)
    where built.kind <> house_ad_candidates.page_key
      and not (built.kind = 'forums' and house_ad_candidates.page_key = 'thread')
  )
  select every_ad.ad_key, every_ad.kind, every_ad.page_slug, every_ad.title_ro, every_ad.title_en,
    row_number() over (order by every_ad.tier,
      md5(every_ad.ad_key || house_ad_candidates.page_key || public.romania_today()::text))
  from (select * from landing union all select * from built_in) as every_ad;
$$;
comment on function public.house_ad_candidates(text) is
  'Internal: our own ads for a page, ordered by day and page, never by reader (S1-E12-01).';
revoke execute on function public.house_ad_candidates(text) from public, anon, authenticated;

/* ---------- 5. Filling a page's slots ---------- */

/**
 * page_ads: every slot of one public page with the ad that fills it (S1-E12-01).
 * Inputs: page_key (chapter, story, discover, search, classics, see_all, teaser, forums, thread,
 *   space, profile or library); context, what the page is about, as the screen knows it:
 *   category, tag and language (used to choose), space_slug and story_slug (used only to keep
 *   class spaces and class-only stories free of ads). Nothing about the reader is read: not their
 *   account, age, history, cookies or device (criterion 2).
 * Returns: a JSON array in slot order of {slot_key, position, format, ad}, where ad is {key,
 *   label, kind, page_slug, title_ro, title_en} and is never the same for two slots of the page
 *   (decided 17 Oct 2026, 12:44); plus matched {category, tag, language}, the context the choice
 *   could use, for "Why this ad?". An empty array for a page with no slots, a class space or a
 *   class-only story.
 * Errors: none; an unknown page has no slots.
 * Where it fits: usePageAds() on every public page; parts b and d add sponsors and the network
 *   ahead of house ads.
 */
create or replace function public.page_ads(page_key text, context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_context jsonb := coalesce(context, '{}'::jsonb);
  matched jsonb;
begin
  -- Step 1: class spaces and class-only stories show no ad at all (Q70).
  if public.ads_are_barred(clean_context) then
    return '[]'::jsonb;
  end if;
  -- Step 2: only the page's own context explains the choice; nothing else is kept or returned.
  matched := jsonb_strip_nulls(jsonb_build_object('category', clean_context ->> 'category',
    'tag', clean_context ->> 'tag', 'language', clean_context ->> 'language'));
  -- Step 3: the page's slots in order; slot n gets the n-th house ad, so no two slots share one.
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'slot_key', slots.slot_key, 'position', slots.position, 'format', slots.format,
        'matched', matched,
        'ad', case when candidates.ad_key is null then null else jsonb_build_object(
                'key', candidates.ad_key, 'label', 'house', 'kind', candidates.kind,
                'page_slug', candidates.page_slug, 'title_ro', candidates.title_ro,
                'title_en', candidates.title_en) end
      ) order by slots.position)
    from (select ad_slots.slot_key, ad_slots.position, ad_slots.format,
            row_number() over (order by ad_slots.position) as slot_number
          from public.ad_slots
          where ad_slots.page_key = page_ads.page_key and ad_slots.is_on) as slots
    left join public.house_ad_candidates(page_ads.page_key) as candidates
      on candidates.ad_rank = slots.slot_number
  ), '[]'::jsonb);
end;
$$;
comment on function public.page_ads(text, jsonb) is
  'Public: a page''s ad slots, filled from the page''s context only, never the same ad twice (S1-E12-01).';
revoke execute on function public.page_ads(text, jsonb) from public;
grant execute on function public.page_ads(text, jsonb) to anon, authenticated;
