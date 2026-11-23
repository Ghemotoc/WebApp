/**
 * BrandMark: the emblem and the name (or logo) at the start of the top bar (bundle BRAND-1,
 * part b; Robert, 4 Nov 2026, 14:25 UTC; recoloured in bundle G2 THEMES).
 *
 * What it draws:
 *   - the emblem, decorative (hidden from screen readers), because the name beside it already
 *     says what the link is. The default sleeping cat is drawn as a CSS mask filled with the --logo
 *     token, so it takes the look's accent by day and soft white at night (handoff doc "Design
 *     tokens and themes": "logo and wordmark recolour to the theme accent"; Robert, 7 Nov 2026).
 *     An emblem staff uploaded is a picture with its own colours, so it stays an <img>, one per
 *     theme;
 *   - the uploaded logo, with the product name as its alt text, or the name as text in lower case
 *     and the --logo colour when there is no logo (Funnel Display 800, from the caller).
 * Light and night uploads are both in the page and CSS shows the one for the current theme
 * (.tmc-light-only and .tmc-night-only in src/styles/index.css), so a theme switch needs no new
 * read. With no logo uploaded the name is drawn once, so its link has one plain name.
 * BrandEmblem draws the emblem alone, larger, for the top of the member footer (Robert, 23 Nov
 * 2026: "just the emblem ... above the SEO text", left-aligned and following the theme).
 * Who shows it: TopBar, StaffBar and the two footers. What it calls: useBrandAssets().
 */
import { brand } from '@/config/brand';

import { useBrandAssets } from '../hooks/useBrandAssets';
import { defaultBrandPicture } from '../lib/brandDefaults';

/** Which theme an emblem is for; 'both' when one drawing serves light and night. */
type EmblemTheme = 'light' | 'dark' | 'both';

/** What one emblem needs: its address, its theme and its size. */
interface EmblemProps {
  source: string;
  theme: EmblemTheme;
  size: EmblemSize;
}

/** What the pair of emblems needs. */
interface EmblemsProps {
  light: string | null;
  dark: string | null;
  size: EmblemSize;
}

/** How big an emblem is drawn: in a bar beside the name, or alone at the top of the footer. */
export type EmblemSize = 'bar' | 'footer';

/**
 * The size classes for the tinted cat (kept at its 30:32 shape) and for an uploaded picture.
 * Footer: 120 px tall on phones and tablets, 160 px from 1024 px (Robert asked about 300 px; the
 * builder's reading, 23 Nov 2026: big enough to read as the brand without outweighing the links).
 */
const emblemSizeClass: Record<EmblemSize, { tinted: string; picture: string }> = {
  bar: { tinted: 'h-8 w-[30px]', picture: 'h-8 w-auto' },
  footer: {
    tinted: 'h-[120px] w-[113px] lg:h-[160px] lg:w-[150px]',
    picture: 'h-[120px] w-auto lg:h-[160px]',
  },
};

/** The CSS class that shows an emblem only in its theme. */
const themeOnlyClass: Record<EmblemTheme, string> = {
  light: 'tmc-light-only',
  dark: 'tmc-night-only',
  both: '',
};

/**
 * The default cat, drawn as a mask over the --logo colour so it follows the look and the theme.
 * The style attribute is allowed by the Content Security Policy (style-src 'unsafe-inline').
 *
 * @param source - the bundled SVG used as the mask's shape
 * @param theme - which theme it is shown in
 * @param size - how big it is drawn
 * @returns a decorative span the size of the emblem
 */
function TintedEmblem({ source, theme, size }: EmblemProps) {
  const mask = `url(${source})`;
  return (
    <span
      aria-hidden="true"
      data-brand-emblem={theme}
      data-brand-emblem-kind="tinted"
      className={`${themeOnlyClass[theme]} inline-block ${emblemSizeClass[size].tinted} shrink-0 bg-logo`}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

/**
 * One emblem: the tinted cat for the bundled file, or the uploaded picture as it is.
 *
 * @param source - the emblem's address (bundled default or approved upload)
 * @param theme - which theme it is shown in
 * @param size - how big it is drawn
 * @returns the emblem
 */
function Emblem({ source, theme, size }: EmblemProps) {
  const isBundledDefault =
    source === defaultBrandPicture.emblem_light || source === defaultBrandPicture.emblem_dark;
  if (isBundledDefault) return <TintedEmblem source={source} theme={theme} size={size} />;
  return (
    <img
      src={source}
      alt=""
      aria-hidden="true"
      data-brand-emblem={theme}
      className={`${themeOnlyClass[theme]} ${emblemSizeClass[size].picture}`}
    />
  );
}

/**
 * The emblems for both themes. When neither was replaced, one tinted cat serves both, because
 * the --logo token already changes with the theme.
 *
 * @param props.light - the light emblem's address, or null
 * @param props.dark - the night emblem's address, or null
 * @param props.size - how big they are drawn
 * @returns zero, one or two emblems
 */
function Emblems({ light, dark, size }: EmblemsProps) {
  const bothDefault =
    light === defaultBrandPicture.emblem_light && dark === defaultBrandPicture.emblem_dark;
  if (bothDefault && light !== null) return <Emblem source={light} theme="both" size={size} />;
  return (
    <>
      {light !== null && <Emblem source={light} theme="light" size={size} />}
      {dark !== null && <Emblem source={dark} theme="dark" size={size} />}
    </>
  );
}

/**
 * The emblem alone, at the top of the member footer. Decorative: the footer's words say what the
 * site is. It follows the look and night mode like the top bar's emblem.
 *
 * @returns the emblem for the current theme, footer-sized
 */
export function BrandEmblem() {
  const pictures = useBrandAssets();
  return <Emblems light={pictures.emblem_light} dark={pictures.emblem_dark} size="footer" />;
}

/**
 * The name as text: lower case and in the logo colour, as the handoff's wordmark. Screen readers
 * still read the product name as written in the brand config.
 *
 * @returns the wordmark
 */
function Wordmark() {
  return <span className="lowercase text-logo">{brand.productName}</span>;
}

/**
 * The name for one theme: the uploaded logo, or the wordmark.
 *
 * @returns the logo picture or the wordmark
 */
function NameOrLogo({ logo }: { logo: string | null }) {
  if (logo === null) return <Wordmark />;
  return <img src={logo} alt={brand.productName} className="h-8 w-auto max-w-[200px]" />;
}

/**
 * Renders the mark.
 *
 * @returns the emblem and the name or logo
 */
export function BrandMark() {
  const pictures = useBrandAssets();
  const hasAnyLogo = pictures.logo_light !== null || pictures.logo_dark !== null;
  return (
    <span className="inline-flex items-center gap-2">
      <Emblems light={pictures.emblem_light} dark={pictures.emblem_dark} size="bar" />
      {/* The name: once as text by default; per theme once a logo is uploaded. */}
      {hasAnyLogo ? (
        <>
          <span className="tmc-light-only inline-flex">
            <NameOrLogo logo={pictures.logo_light} />
          </span>
          <span className="tmc-night-only inline-flex">
            <NameOrLogo logo={pictures.logo_dark} />
          </span>
        </>
      ) : (
        <Wordmark />
      )}
    </span>
  );
}
