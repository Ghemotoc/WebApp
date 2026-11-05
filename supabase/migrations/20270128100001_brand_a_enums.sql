/*
 * Migration: the enum values for brand pictures (bundle BRAND-1, part a).
 *
 * - picture_kind gains 'brand_asset': a logo or emblem an admin uploads in Staff › Website ›
 *   Branding, kept in the private `brand-assets` bucket and checked like every other upload
 *   (CLAUDE.md rule 19).
 * - brand_asset_slot: the four places a brand picture can fill: the logo and the emblem, each in
 *   a light-theme and a dark-theme version. The emblem is also the browser tab icon (Robert,
 *   4 Nov 2026, 14:25 UTC).
 * Why a separate migration: a new enum value can't be used in the transaction that adds it, so
 * the values land here and 20270128100002 uses them.
 * Who reads it: register_brand_picture(), picture_needs_person() and the brand_assets table.
 */

alter type public.picture_kind add value if not exists 'brand_asset';

/**
 * brand_asset_slot: which brand picture a row holds.
 * logo_light and logo_dark replace the text wordmark in the top bar on light and night themes;
 * emblem_light and emblem_dark sit beside the wordmark and are the browser tab icon.
 */
create type public.brand_asset_slot as enum ('logo_light', 'logo_dark', 'emblem_light', 'emblem_dark');
comment on type public.brand_asset_slot is
  'The four brand pictures: logo and emblem, each for the light and the night theme (BRAND-1a).';
