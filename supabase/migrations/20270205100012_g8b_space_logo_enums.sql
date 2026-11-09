/*
 * Migration: the enum values a space's logo and the board's banner colours need (bundle G8b of the
 * liquid glass redesign; stories S1-E8-06 and S1-E8-07; design/boards/SpaceSettings.dc.html and
 * SpaceNew.dc.html). An enum value must be committed before a later migration can use it, so they
 * have their own file; the rest is in …_g8b_space_logo_and_banners.sql.
 *
 * What it adds:
 * - picture_kind 'space_logo': a space's square logo. Like every picture it goes through the
 *   picture check before anyone else sees it (CLAUDE.md rule 19).
 * - space_banner: the twelve colours the boards add to plum and forest: six deep ones (cobalt,
 *   ember, rose, teal, berry, ink) and six pastels (lilac, sky_mist, peach, mint, butter, blush).
 *   The old 'night' and 'gold' stay in the type, because Postgres can't drop an enum value, but
 *   the next migration moves every space off them and the screens no longer offer them.
 * Who calls it: the next migration. What it calls: nothing.
 */

alter type public.picture_kind add value if not exists 'space_logo';

alter type public.space_banner add value if not exists 'cobalt';
alter type public.space_banner add value if not exists 'ember';
alter type public.space_banner add value if not exists 'rose';
alter type public.space_banner add value if not exists 'teal';
alter type public.space_banner add value if not exists 'berry';
alter type public.space_banner add value if not exists 'ink';
alter type public.space_banner add value if not exists 'lilac';
alter type public.space_banner add value if not exists 'sky_mist';
alter type public.space_banner add value if not exists 'peach';
alter type public.space_banner add value if not exists 'mint';
alter type public.space_banner add value if not exists 'butter';
alter type public.space_banner add value if not exists 'blush';

comment on type public.space_banner is
  'A space''s banner colour (boards SpaceSettings and SpaceNew, G8b): deep plum, cobalt, forest, ember, rose, teal, berry and ink, or pastel lilac, sky_mist, peach, mint, butter and blush. night and gold are retired (G8b moved them to ink and ember).';
