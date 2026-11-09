/**
 * SpaceBannerBand: the coloured background at the top of a space's header (bundle FORUMS-2,
 * parts a and c, redrawn in G8b; S1-E8-06 criterion 1; design/boards/Space.dc.html's banner).
 *
 * It fills the header's banner area behind the space's name and buttons. It always paints the
 * space's colour, and lays the uploaded banner picture over it, under a dark wash so white text
 * reads on any picture, once the picture's check passed (CLAUDE.md rule 19). Until then everyone,
 * the uploader included, sees the colour; the settings page shows the uploader a preview and where
 * the check is. The band is decoration: the space's name is the heading on it, so screen readers
 * skip it.
 * Who shows it: SpaceHeaderCard, which also decides the text colour on it (lib/spaceLook.ts).
 */
import type { SpaceBanner } from '../api/spaces';
import { bannerBackground, pictureScrim } from '../lib/spaceLook';

/**
 * Renders the band.
 *
 * @param props.banner - the space's colour
 * @param props.pictureUrl - the uploaded picture's signed address once it passed, or null
 * @returns the band, filling its positioned parent
 */
export function SpaceBannerBand({
  banner,
  pictureUrl,
}: {
  banner: SpaceBanner;
  pictureUrl: string | null;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid="space-banner-band"
      data-banner={banner}
      className="absolute inset-0"
      style={{ background: bannerBackground(banner) }}
    >
      {pictureUrl !== null && (
        <>
          <img
            src={pictureUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            data-testid="space-banner-picture"
          />
          <div className="absolute inset-0" style={{ background: pictureScrim }} />
        </>
      )}
    </div>
  );
}
