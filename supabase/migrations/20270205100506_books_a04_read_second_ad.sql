/*
 * Migration: the Read page's second advert becomes a wide banner between the rows (user story
 * 1.4, board A04 of "Build: the full design as user stories"; Robert, 25 Nov 2026, 09:50 UTC:
 * "ensure that there are no missing widgets between the pages from the canvas versus the one on
 * the live site").
 *
 * Why: the Read page (page key 'discover') always had two slots: discover_wide after the first
 * row, and discover_card, a card meant to sit inside a grid of stories (S1-E12-01). Read has no
 * grid any more, only rows (CALM-7c), so the card was never drawn. Board A04 draws the second
 * advert as a 728 × 90 banner between two rows, so the slot keeps its key, its position and its
 * bookings and only changes its shape to 'wide'.
 * What it changes: ad_slots.format of discover_card, from 'list_card' to 'wide'. Nothing else:
 * the 'list_banner' placement (sponsors_b1_campaigns) already books it together with wide slots
 * such as classics_wide, so a creative booked there already draws as a banner; staff turn the
 * slot on or off and book it in Sponsors › Placements as before.
 * Who reads it: page_ads('discover', …) through src/features/ads (PageAdSlot, AdBox draws the
 * slot by its format); the Read page puts position 2 between the rows (DiscoverPage.tsx).
 * Tests: supabase/tests/database/270-ad-slots.test.sql ("Read's second slot is a wide banner")
 * and e2e/ads.spec.ts.
 */

update public.ad_slots
set format = 'wide'
where slot_key = 'discover_card';
