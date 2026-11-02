/**
 * SpaceBannerBand: the band across the top of a space's header (bundle FORUMS-2, parts a and c;
 * S1-E8-06 criterion 1; design/boards/Space.dc.html's 168 px banner).
 *
 * It always paints the space's drawn colour, and lays the uploaded banner picture over it once its
 * check passed (CLAUDE.md rule 19). Until then everyone, the uploader included, sees the colour;
 * the settings page shows the uploader a preview and where the check is. The band is decoration: the
 * space's name is the heading below it, so screen readers skip it.
 * Who shows it: SpaceHeaderCard. What it calls: useSpaceBannerView → the picture's signed address.
 */
import type { Space } from '../api/spaces';
import { useSpaceBannerView } from '../hooks/useSpaceBanner';
import { bannerBackgrounds } from '../lib/spaceLook';

/**
 * Renders the band.
 *
 * @param props.space - the space
 * @returns the coloured band, with the picture over it when there is one to show
 */
export function SpaceBannerBand({ space }: { space: Space }) {
  const view = useSpaceBannerView(space).data ?? null;
  // A picture still being checked, waiting for a person or removed shows the colour instead.
  const pictureUrl = view !== null && view.state === 'visible' ? view.url : null;
  return (
    <div
      aria-hidden="true"
      data-testid="space-banner-band"
      className="relative h-[120px] md:h-[168px]"
      style={{ background: bannerBackgrounds[space.banner] }}
    >
      {pictureUrl !== null && (
        <img
          src={pictureUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          data-testid="space-banner-picture"
        />
      )}
    </div>
  );
}
