/**
 * The colours of the link preview pictures: one plain square per cover colour (story S1-E4-04).
 *
 * These are the cover palette's colours (src/components/covers/coverDesigns.ts, S1-E3-01), kept
 * here as well because this folder runs on Cloudflare and inside vite.config.ts, where the app's
 * "@" paths don't exist. src/components/covers/linkPreviewPalette.test.ts fails if the two ever
 * differ, so a palette change can't be forgotten here.
 * Who uses it: server/link-preview.ts (which picture a story gets) and
 * scripts/make-link-preview-images.ts (which writes public/link-previews/<colour>.png).
 */
export const linkPreviewPalette = {
  plum: '#481C5F',
  ink: '#26142E',
  violet: '#672786',
  gold: '#E6C24C',
  lilac: '#E9DDF0',
  blush: '#F6D3DC',
  sky: '#D7E6F2',
  sage: '#C9D8BF',
  paper: '#FAF8F5',
} as const;
