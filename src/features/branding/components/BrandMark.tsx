/**
 * BrandMark: the emblem and the name (or logo) at the start of the top bar (bundle BRAND-1,
 * part b; Robert, 4 Nov 2026, 14:25 UTC; recoloured in bundle G2 THEMES).
 *
 * What it draws:
 *   - the emblem, decorative (hidden from screen readers), because the name beside it already
 *     says what the link is. The default curled cat is drawn as a CSS mask filled with the --logo
 *     token, so it takes the look's accent by day and soft white at night (handoff doc "Design
 *     tokens and themes": "logo and wordmark recolour to the theme accent"; Robert, 7 Nov 2026).
 *     An emblem staff uploaded is a picture with its own colours, so it stays an <img>, one per
 *     theme;
 *   - the uploaded logo, with the product name as its alt text, or the name as text in lower case
 *     and the --logo colour when there is no logo (Funnel Display 800, from the caller).
 * Light and night uploads are both in the page and CSS shows the one for the current theme
 * (.tmc-light-only and .tmc-night-only in src/styles/index.css), so a theme switch needs no new
 * read. With no logo uploaded the name is drawn once, so its link has one plain name.
 * Who shows it: TopBar, StaffBar and the two footers. What it calls: useBrandAssets().
 */
import { brand } from '@/config/brand';

import { useBrandAssets } from '../hooks/useBrandAssets';
import { defaultBrandPicture } from '../lib/brandDefaults';

/** Which theme an emblem is for; 'both' when one drawing serves light and night. */
type EmblemTheme = 'light' | 'dark' | 'both';

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
 * @returns a decorative span the size of the emblem
 */
function TintedEmblem({ source, theme }: { source: string; theme: EmblemTheme }) {
  const mask = `url(${source})`;
  return (
    <span
      aria-hidden="true"
      data-brand-emblem={theme}
      data-brand-emblem-kind="tinted"
      className={`${themeOnlyClass[theme]} inline-block h-8 w-[30px] shrink-0 bg-logo`}
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
 * @returns the emblem
 */
function Emblem({ source, theme }: { source: string; theme: EmblemTheme }) {
  const isBundledDefault =
    source === defaultBrandPicture.emblem_light || source === defaultBrandPicture.emblem_dark;
  if (isBundledDefault) return <TintedEmblem source={source} theme={theme} />;
  return (
    <img
      src={source}
      alt=""
      aria-hidden="true"
      data-brand-emblem={theme}
      className={`${themeOnlyClass[theme]} h-8 w-auto`}
    />
  );
}

/**
 * The emblems for both themes. When neither was replaced, one tinted cat serves both, because
 * the --logo token already changes with the theme.
 *
 * @returns zero, one or two emblems
 */
function Emblems({ light, dark }: { light: string | null; dark: string | null }) {
  const bothDefault =
    light === defaultBrandPicture.emblem_light && dark === defaultBrandPicture.emblem_dark;
  if (bothDefault && light !== null) return <Emblem source={light} theme="both" />;
  return (
    <>
      {light !== null && <Emblem source={light} theme="light" />}
      {dark !== null && <Emblem source={dark} theme="dark" />}
    </>
  );
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
      <Emblems light={pictures.emblem_light} dark={pictures.emblem_dark} />
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
