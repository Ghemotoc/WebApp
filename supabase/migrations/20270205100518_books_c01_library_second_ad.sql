/*
 * Migration: the Library's second advert, a wide banner between "What you follow" and "Written
 * by you" (bundle 3 of "Build: the full design as user stories", board C01; Robert, 25 Nov 2026,
 * 09:50 UTC: "ensure that there are no missing widgets between the pages from the canvas versus
 * the one on the live site ... And also how they could be editable from the backend").
 *
 * Why: the Library had one slot, library_wide (S1-E12-01). Board C01 draws three banners down
 * the page; the decision that a page never carries more than two slots (docs/decisions.md,
 * S1-E12-01; enforced by ad_slots' position check) wins, so the Library gets a second banner
 * lower down and the third is left out (docs/board-fixes.md).
 * What it changes:
 *   - one new slot, library_lower_wide: page 'library', position 2, format 'wide';
 *   - sponsor_placement_slots: the 'list_banner' placement fills it as it fills library_wide, so
 *     a campaign booked for story lists shows in both Library banners.
 * How staff change it: Sponsors › Placements turns the slot on or off and books a campaign or a
 * house ad into it, like every other slot; nothing here needs a release to change later.
 * Who reads it: page_ads('library', …) through src/features/ads (PageAdSlot); LibraryPage puts
 * position 2 after "What you follow".
 * Tests: supabase/tests/database/413-library-second-ad.test.sql and e2e/library.spec.ts.
 */

insert into public.ad_slots (slot_key, page_key, position, format)
values ('library_lower_wide', 'library', 2, 'wide')
on conflict (slot_key) do nothing;

/**
 * sponsor_placement_slots: the ad slots a banner placement may fill. Internal.
 * Input: the placement. Returns: slot keys. Below the chapter: the chapter's end; in story
 *   lists: the cards and banners on Discover's list card, See all, Classics, Search and both of
 *   the Library's banners (library_lower_wide added for board C01); between shelves on Discover:
 *   Discover's wide banner. "Sponsored by" credits and featured slots fill no ad slot. Staff can
 *   still book a campaign into any slot instead (Sponsors part e).
 */
create or replace function public.sponsor_placement_slots(placement public.sponsor_placement)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case placement
    when 'chapter_banner' then array['chapter_end']
    when 'list_banner' then array['discover_card', 'see_all_card', 'classics_wide', 'search_wide', 'library_wide', 'library_lower_wide']
    when 'discover_banner' then array['discover_wide']
    else '{}'::text[]
  end;
$$;
comment on function public.sponsor_placement_slots(public.sponsor_placement) is
  'Internal: which ad slots each banner placement fills (S1-E12-02; library_lower_wide for board C01).';
