/*
 * Migration: ad-network ads that are never personalised (story S1-E12-04; bundle SPONSORS-d;
 * ADR 0014).
 *
 * Decided by Robert on 2 Nov 2026: Google AdSense, in limited-ads mode, for every reader. It stays
 * off until the company exists and the AdSense account gives a publisher ID (a GO-LIVE step):
 * - the flag `ad_network` (off) switches it on;
 * - the settings `ad_network_publisher_id` ("ca-pub-…") and `ad_network_slot_id` (the ad unit)
 *   say which account and unit to load; both start empty, and an empty one keeps it off.
 * When on, page_ads() fills a wide banner slot in this order (S1-E12-05, which part e books into):
 * a matching sponsor, a house ad for one of our landing pages, then the network, then our other
 * house ads, so no slot is ever blank. At most one network ad per page, only in a wide banner
 * slot (never a card, a side box or a portrait, never inside chapter text), never in a class space
 * or a class-only story (Q70, unchanged), labelled "Ad".
 * Who calls it: usePageAds() through page_ads(); the network's own script loads in the browser
 * only when that slot comes into view (src/features/ads/components/NetworkAdCreative.tsx).
 */

/* ---------- 1. The switch and the account ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('ad_network', false, true,
   'Fill unsold wide banner slots with Google AdSense ads in limited-ads mode, never personalised (S1-E12-04; ADR 0014). Off until the publisher ID exists (GO-LIVE).')
on conflict (key) do nothing;

insert into public.settings (key, value, is_public, description) values
  ('ad_network_publisher_id', '""'::jsonb, true,
   'The AdSense publisher ID ("ca-pub-" and 16 digits) the ad network loads with; empty keeps the network off (S1-E12-04).'),
  ('ad_network_slot_id', '""'::jsonb, true,
   'The AdSense ad unit (digits) for the wide banner; empty keeps the network off (S1-E12-04).')
on conflict (key) do nothing;

/* ---------- 2. Choosing a network ad ---------- */

/**
 * network_ad_for_slot: the network's ad for one slot, when the network may fill it. Internal.
 * Inputs: slot_format (the slot's ad_format) and used_keys (the ads already on the page).
 * Returns: {key 'network', label 'ad', kind 'network', publisher_id, slot_id} or null when the
 *   flag is off, either setting is empty or malformed, the slot isn't a wide banner, or the page
 *   already has a network ad.
 * Errors: none. Where it fits: page_ads(), after sponsors and our landing pages.
 */
create or replace function public.network_ad_for_slot(slot_format public.ad_format, used_keys text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  publisher_id text := coalesce(public.setting_value('ad_network_publisher_id') #>> '{}', '');
  slot_id text := coalesce(public.setting_value('ad_network_slot_id') #>> '{}', '');
begin
  -- Step 1: off unless the flag is on and the account's two values look right (ADR 0014).
  if not public.is_feature_enabled('ad_network')
     or publisher_id !~ '^ca-pub-[0-9]{16}$' or slot_id !~ '^[0-9]{6,12}$' then
    return null;
  end if;
  -- Step 2: only the wide banner, and only once per page (S1-E12-04 criterion 2).
  if slot_format <> 'wide' or 'network' = any (coalesce(used_keys, '{}')) then
    return null;
  end if;
  return jsonb_build_object('key', 'network', 'label', 'ad', 'kind', 'network',
    'page_slug', null, 'title_ro', null, 'title_en', null,
    'publisher_id', publisher_id, 'slot_id', slot_id);
end;
$$;
comment on function public.network_ad_for_slot(public.ad_format, text[]) is
  'Internal: the ad network''s ad for a wide slot when it is switched on and set up (S1-E12-04).';
revoke execute on function public.network_ad_for_slot(public.ad_format, text[]) from public, anon, authenticated;

/**
 * landing_house_ad_for_slot: the next house ad for one of our landing pages (a contest or a
 * campaign) not yet on the page. Internal.
 * Inputs: wanted_page_key, used_keys. Returns: the house ad, or null when there is none.
 * Where it fits: page_ads(), so our own contests come before the network (S1-E12-05).
 */
create or replace function public.landing_house_ad_for_slot(wanted_page_key text, used_keys text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('key', candidates.ad_key, 'label', 'house', 'kind', candidates.kind,
      'page_slug', candidates.page_slug, 'title_ro', candidates.title_ro, 'title_en', candidates.title_en)
  from public.house_ad_candidates(wanted_page_key) as candidates
  where candidates.kind = 'landing' and not candidates.ad_key = any (coalesce(used_keys, '{}'))
  order by candidates.ad_rank
  limit 1;
$$;
comment on function public.landing_house_ad_for_slot(text, text[]) is
  'Internal: the next house ad for one of our landing pages not yet on the page (S1-E12-04, S1-E12-05).';
revoke execute on function public.landing_house_ad_for_slot(text, text[]) from public, anon, authenticated;

/* ---------- 3. The fill order ---------- */

/**
 * page_ads: every slot of one public page with the ad that fills it (S1-E12-01, S1-E12-02,
 * S1-E12-04).
 * Inputs: page_key and context, as before (category, tag and language choose; space_slug and
 *   story_slug only keep class spaces and class-only stories free of ads). Nothing about the
 *   reader is read.
 * Returns: a JSON array in slot order of {slot_key, position, format, matched, ad}. Each slot takes
 *   a live matching sponsor (label 'sponsored'), else a house ad for one of our landing pages,
 *   else the network when it is on (label 'ad', part d), else our other house ads; never the same
 *   ad twice on a page. Empty for a page with no slots, a class space or a class-only story (Q70).
 * Errors: none. Where it fits: usePageAds() on every public page; part e adds staff bookings.
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
  slot record;
  chosen jsonb;
  used_keys text[] := '{}';
  filled jsonb := '[]'::jsonb;
begin
  -- Step 1: class spaces and class-only stories show no ad at all, of any kind (Q70).
  if public.ads_are_barred(clean_context) then
    return '[]'::jsonb;
  end if;
  -- Step 2: only the page's own context explains the choice; nothing else is kept or returned.
  matched := jsonb_strip_nulls(jsonb_build_object('category', clean_context ->> 'category',
    'tag', clean_context ->> 'tag', 'language', clean_context ->> 'language'));
  -- Step 3: each slot in order, in the fill order above.
  for slot in
    select ad_slots.slot_key, ad_slots.position, ad_slots.format from public.ad_slots
    where ad_slots.page_key = page_ads.page_key and ad_slots.is_on
    order by ad_slots.position
  loop
    chosen := coalesce(public.sponsor_ad_for_slot(slot.slot_key, page_ads.page_key, clean_context, used_keys),
                       public.landing_house_ad_for_slot(page_ads.page_key, used_keys),
                       public.network_ad_for_slot(slot.format, used_keys),
                       public.house_ad_for_slot(page_ads.page_key, used_keys));
    if chosen is not null then
      used_keys := used_keys || (chosen ->> 'key');
    end if;
    filled := filled || jsonb_build_array(jsonb_build_object('slot_key', slot.slot_key, 'position', slot.position,
      'format', slot.format, 'matched', matched, 'ad', chosen));
  end loop;
  return filled;
end;
$$;
