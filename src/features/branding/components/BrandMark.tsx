/**
 * BrandMark: the emblem and the name (or logo) at the start of the top bar (bundle BRAND-1,
 * part b; Robert, 4 Nov 2026, 14:25 UTC).
 *
 * What it draws, for each theme:
 *   - the emblem, decorative (alt="", hidden from screen readers), because the name beside it
 *     already says what the link is;
 *   - the uploaded logo, with the product name as its alt text, or the name as text when there is
 *     no logo, as before (Bricolage 800, 22 px; TopBar).
 * Light and night versions are both in the page and CSS shows the one for the current theme
 * (.tmc-light-only and .tmc-night-only in src/styles/index.css), so a theme switch needs no new
 * read. With no logo uploaded the name is drawn once, so its link has one plain name.
 * Who shows it: TopBar, inside the link to the home page. What it calls: useBrandAssets().
 */
import { brand } from '@/config/brand';

import { useBrandAssets } from '../hooks/useBrandAssets';

/**
 * The name for one theme: the uploaded logo, or the name as text.
 *
 * @returns the logo picture or the text
 */
function NameOrLogo({ logo }: { logo: string | null }) {
  if (logo === null) return <span>{brand.productName}</span>;
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
      {/* The emblem, one per theme; decorative, the name says what the link is. */}
      {pictures.emblem_light !== null && (
        <img
          src={pictures.emblem_light}
          alt=""
          aria-hidden="true"
          data-brand-emblem="light"
          className="tmc-light-only h-8 w-auto"
        />
      )}
      {pictures.emblem_dark !== null && (
        <img
          src={pictures.emblem_dark}
          alt=""
          aria-hidden="true"
          data-brand-emblem="dark"
          className="tmc-night-only h-8 w-auto"
        />
      )}
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
        brand.productName
      )}
    </span>
  );
}
