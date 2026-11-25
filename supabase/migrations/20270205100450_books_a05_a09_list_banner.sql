/*
 * Migration: the See all lists' ad becomes a wide banner (user stories 1.5, 1.6 and 1.9; boards
 * A05-ReadList, A06-ReadGenre and A09-ReadTag, which draw a 728 × 90 banner across the grid
 * between rows; Robert, 20 Nov 2026: "a banner every two rows").
 *
 * Until now the slot on the See all, genre, tag and search lists (`see_all_card`, page see_all)
 * was a card the size of a story card, sitting in one cell of the grid. The boards draw a banner
 * across the whole row instead, so the slot's format becomes `wide`. The slot keeps its key, so
 * campaigns already booked on it (placement `list_banner`, which already mixes card and wide
 * slots) keep running; their creatives are drawn in the wide box from now on.
 *
 * Who reads it: page_ads() hands the format to the screens; AdBox draws a `wide` slot as a banner,
 * and StoryGrid puts it across a row after every two rows of cards. Nothing else changes: the
 * slot stays on, at position 1, for signed-in readers only.
 */
update public.ad_slots
   set format = 'wide'
 where slot_key = 'see_all_card'
   and format = 'list_card';
