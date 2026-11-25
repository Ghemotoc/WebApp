/*
 * Migration: the Writers' hub's second advert, a wide banner in the main column (user story 1.3,
 * board A03 of "Build: the full design as user stories"; Robert, 25 Nov 2026, 09:50 UTC: "ensure
 * that there are no missing widgets between the pages from the canvas versus the one on the live
 * site").
 *
 * Why: board A03 draws the hub's advert in two places. At desktop width it is a box in the right
 * column (hub_side, added in 20270205100446); below that, where the right column falls under the
 * main one and side boxes are not drawn, it is a banner between "Writing guides" and "Your first
 * chapter in 7 days" (728 × 90 on a tablet, 320 × 100 on a phone). Only the side box was built.
 * What it adds: one row in ad_slots, hub_wide (page hub, position 2, a wide banner). The hub keeps
 * at most two slots (decided 17 Oct 2026, 11:53). page_ads() fills it like every other slot: a
 * booked sponsor first, then the ad network where it is on, else a house ad; only signed-in
 * members see it (G7e), and the hub is only for members.
 * Where staff change it: Sponsors › Placements in the admin site, which lists every row of
 * ad_slots, turns a slot off and books it (S1-E12-05, admin_* functions that write the audit log).
 * Who reads it: src/features/ads/ (PageAdSlot pageKey="hub" position={2}), placed by
 * WritersHubPage, which draws it only below 1200 px, where hub_side is not drawn.
 * Tests: supabase/tests/database/270-ad-slots.test.sql and e2e/ads.spec.ts.
 */
insert into public.ad_slots (slot_key, page_key, position, format) values
  ('hub_wide', 'hub', 2, 'wide')
on conflict (slot_key) do nothing;
