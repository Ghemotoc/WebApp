/*
 * Migration: the advert slots of Home and the Writers' hub (boards A01 and A03; Robert's review of
 * 25 Nov 2026: "it still lacks a lot of the widgets").
 *
 * What it adds: two rows in ad_slots. home_wide (page home, position 1, a wide banner), which the
 * Home page draws after "Open for entries now"; hub_side (page hub, position 1, a side box), which
 * the Writers' hub draws in its right column under the writer of the week (desktop only, as every
 * side box). Still at most two slots a page (decided 17 Oct
 * 2026, 11:53). page_ads() fills it like every other slot: a booked sponsor first, then the ad
 * network where it is on, else a house ad; only signed-in members see it (G7e), and Home is only
 * for members.
 * Where staff change it: Sponsors › Placements in the admin site, which lists every row of
 * ad_slots, turns a slot off and books it (S1-E12-05, admin_* functions that write the audit log).
 * Who reads it: src/features/ads/ (PageAdSlot pageKey="home" and pageKey="hub").
 */
insert into public.ad_slots (slot_key, page_key, position, format) values
  ('home_wide', 'home', 1, 'wide'),
  ('hub_side', 'hub', 1, 'side_box')
on conflict (slot_key) do nothing;
