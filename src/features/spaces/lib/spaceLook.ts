/**
 * How a space looks: its fourteen banner colours and the text colour that reads on each (bundle
 * FORUMS-2, part a, redrawn in G8b of the liquid glass redesign; story S1-E8-06;
 * design/boards/Space.dc.html's header and SpaceSettings.dc.html's "Banner (optional)").
 *
 * The boards offer eight deep colours and six pastels, each drawn as a two-stop gradient; since the
 * flat themes bundle (Robert, 23 Nov 2026: no gradients anywhere) a banner is one flat colour, the
 * first stop. The space's name, description and notes sit on the banner, so every colour names
 * the text that reads on it: white on the deep ones and dark plum on the pastels, each at least
 * 4.5:1 on both stops (WCAG 2.2 AA; spaceLook.test.ts), so the flat colour reads too. The colours are fixed, not light and night tokens, because they are the space's
 * own choice and look the same in both modes; an uploaded banner picture gets a dark wash
 * (pictureScrim) so white text reads on any picture.
 * Who calls it: SpaceBannerBand, SpaceHeaderCard and SpaceBannerChoice.
 */
import { deepSpaceBanners, type SpaceBanner } from '../api/spaces';

/** The two stops of each banner's colour on the boards' swatches; the flat banner uses the first
 * (spaceLook.test.ts checks the text on both). */
export const bannerStops: Record<SpaceBanner, [string, string]> = {
  plum: ['#672786', '#2A0E33'],
  cobalt: ['#0047AB', '#2A0E33'],
  forest: ['#005C42', '#2A0E33'],
  ember: ['#883500', '#2A0E33'],
  rose: ['#702963', '#2A0E33'],
  teal: ['#00606B', '#00353B'],
  berry: ['#8A1538', '#4A0B1E'],
  ink: ['#1E2A78', '#0E1440'],
  lilac: ['#E6DAFA', '#CDBCF0'],
  sky_mist: ['#DCE7FB', '#BFD3F5'],
  peach: ['#FCE3D8', '#F6C9B6'],
  mint: ['#DDF3E8', '#BCE5D0'],
  butter: ['#FBF0CF', '#F3DE9F'],
  blush: ['#FBE0EA', '#F1C2D4'],
};

/** White text, on the deep colours and on a washed picture. */
export const textOnDeepBanner = '#FFFFFF';
/** Dark plum text, on the pastels. */
export const textOnPastelBanner = '#2A0E33';

/**
 * A dark wash over an uploaded banner picture, so the white text on it reads whatever the picture.
 * One even wash at the strength the darkest part of the old gradient had (no gradients, Robert,
 * 23 Nov 2026), so the text reads as well everywhere on the banner.
 */
export const pictureScrim = 'linear-gradient(rgba(20,8,28,0.82), rgba(20,8,28,0.82))';

/**
 * Is this one of the deep colours, whose text is white?
 *
 * @param banner - the banner colour
 * @returns true for the eight deep colours, false for the six pastels
 */
export function isDeepBanner(banner: SpaceBanner): boolean {
  return deepSpaceBanners.includes(banner);
}

/**
 * The swatch a banner colour shows in the picker: its flat colour.
 *
 * @param banner - the banner colour
 * @returns a CSS background
 */
export function bannerSwatch(banner: SpaceBanner): string {
  const [first] = bannerStops[banner];
  return first;
}

/**
 * The banner band's background: its one flat colour, with no soft light and no gradient (Robert,
 * 23 Nov 2026: no gradients anywhere).
 *
 * @param banner - the banner colour
 * @returns a CSS background
 */
export function bannerBackground(banner: SpaceBanner): string {
  const [first] = bannerStops[banner];
  return first;
}

/**
 * The colour every text on a space's banner takes (the header points the text tokens at it
 * through the shared `genre-band` utility, so links, notes and the focus ring follow).
 *
 * @param banner - the banner colour
 * @param hasPicture - true when an uploaded picture (with its dark wash) covers the colour
 * @returns white on deep colours and pictures, dark plum on pastels
 */
export function bannerTextColour(banner: SpaceBanner, hasPicture: boolean): string {
  // A picture always sits under the dark wash, so its text is white.
  if (hasPicture || isDeepBanner(banner)) return textOnDeepBanner;
  return textOnPastelBanner;
}
