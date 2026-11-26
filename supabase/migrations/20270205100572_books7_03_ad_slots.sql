/*
 * Migration: the adverts boards F02, F03, F06 and F08 draw on the forum search, a forum's page,
 * the spaces list and a space's page (bundle BOOKS-7, "Together and spaces"; Robert, 25 Nov 2026,
 * 09:50 UTC: "ensure that there are no missing widgets between the pages from the canvas versus
 * the one on the live site").
 *
 * Why: only the forum index (forums_wide, forums_side), a thread (thread_wide, thread_side) and a
 * space (space_wide) had slots. Board F02 draws a 728 × 90 banner under the search results, F03 a
 * box filling the side column of a forum's page, F06 a banner under the spaces list and F08 a box
 * in a space's side column. A side box is drawn only from 1200 px (AdSlot), so the forum's page
 * also gets a banner for narrower screens, as the Writers' hub does (hub_wide).
 * What it adds: five rows in ad_slots: forum_search_wide (page forum_search, position 1),
 * forum_side and forum_wide (page forum, positions 1 and 2), spaces_wide (page spaces, position 1)
 * and space_side (page space, position 2). Every page keeps at most two slots (decided 17 Oct
 * 2026, 11:53). page_ads() fills them like every other slot: a booked sponsor first, then the ad
 * network where it is on, else a house ad; only signed-in members see one (G7e), and a class
 * space never has one (Q70: ads_are_barred()).
 * Where staff change them: Sponsors › Placements in the admin site, which lists every row of
 * ad_slots, turns a slot off and books it (S1-E12-05, admin_* functions that write the audit log).
 * Who reads it: src/features/ads (PageAdSlot) on ForumSearchPage, ForumPage, SpacesPage and
 * SpacePage.
 * Tests: supabase/tests/database/420-together-and-spaces.test.sql.
 */
insert into public.ad_slots (slot_key, page_key, position, format) values
  ('forum_search_wide', 'forum_search', 1, 'wide'),
  ('forum_side', 'forum', 1, 'side_box'),
  ('forum_wide', 'forum', 2, 'wide'),
  ('spaces_wide', 'spaces', 1, 'wide'),
  ('space_side', 'space', 2, 'side_box')
on conflict (slot_key) do nothing;
