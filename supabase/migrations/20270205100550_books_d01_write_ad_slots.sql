/*
 * Migration: the two advert slots of the Write page (board D01, user story 5.1; Robert's ask of
 * 25 Nov 2026 that every widget a board draws is built and can be changed from the admin site).
 *
 * What it adds: two rows in ad_slots for page write. write_wide (position 1, a wide banner), which
 * the Write page draws after the followers chart and "Not published yet"; write_lower (position 2,
 * a wide banner), drawn after "Lines and stops" and "Latest comments". Still at most two slots a
 * page (decided 17 Oct 2026, 11:53). page_ads() fills them like every other slot: a booked sponsor
 * first, then the ad network where it is on, else a house ad (never the "Start writing" house ad,
 * because house_ad_candidates() leaves out the ad named after the page); only signed-in members
 * see an ad (G7e), and Write is only for members.
 * Where staff change it: Sponsors › Placements in the admin site, which lists every row of
 * ad_slots, turns a slot off and books it (S1-E12-05, admin_* functions that write the audit log).
 * Who reads it: src/features/writing/components/YourWritingPage.tsx (PageAdSlot pageKey="write").
 */
insert into public.ad_slots (slot_key, page_key, position, format) values
  ('write_wide', 'write', 1, 'wide'),
  ('write_lower', 'write', 2, 'wide')
on conflict (slot_key) do nothing;
