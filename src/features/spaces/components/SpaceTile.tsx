/**
 * SpaceTile: the 64 px square that starts each row on the Spaces page (CALM-9, board F06, 23 Nov
 * 2026): the space's logo once its check passed (CLAUDE.md rule 19), or its banner colour as a
 * blob when it has none. Never initials or a face (board F06).
 *
 * The space's name sits right beside it, so the tile is decoration for screen readers.
 * Who shows it: SpaceCard. What it calls: useSpaceLogoView (the logo's signed address) and
 * lib/spaceLook.ts's bannerSwatch (the colour).
 */
import type { Space } from '../api/spaces';
import { useSpaceLogoView } from '../hooks/useSpaceLogo';
import { bannerSwatch } from '../lib/spaceLook';

/**
 * Renders the tile.
 *
 * @param props.space - the space
 * @returns the logo, or the colour blob
 */
export function SpaceTile({ space }: { space: Space }) {
  const view = useSpaceLogoView(space).data ?? null;
  // A logo shows only once it passed its check; until then (or without one) the colour shows.
  const logoUrl = view !== null && view.state === 'visible' ? view.url : null;
  if (logoUrl !== null) {
    return (
      <img
        src={logoUrl}
        alt=""
        data-testid="space-logo"
        className="size-16 flex-none rounded-card border border-border bg-surface-solid object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      data-testid="space-tile-colour"
      className="size-16 flex-none rounded-card"
      style={{ background: bannerSwatch(space.banner) }}
    />
  );
}
