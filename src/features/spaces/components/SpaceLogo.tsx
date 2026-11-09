/**
 * SpaceLogo: a space's square logo, once its check passed (bundle G8b; story S1-E8-06; boards
 * Space and Spaces: "No logo? The space shows no picture at all.").
 *
 * It draws nothing for a space without a logo, and nothing while the logo is being checked, is
 * waiting for a moderator or was removed (CLAUDE.md rule 19); the uploader follows the check on
 * the settings page. The space's name always sits right beside it, so the picture is decoration
 * for screen readers. Sizes from the boards: 96 px with 25 px corners and a soft white ring in the
 * header (64 px on a phone), 48 px with 14 px corners on a space's card.
 * Who shows it: SpaceHeaderCard and SpaceRow. What it calls: useSpaceLogoView → the signed address.
 */
import { cn } from '@/lib/utils';

import type { Space } from '../api/spaces';
import { useSpaceLogoView } from '../hooks/useSpaceLogo';

/** The classes for each size. */
const sizeClasses = {
  large:
    'size-16 rounded-[18px] shadow-[0_0_0_4px_rgba(255,255,255,0.25)] md:size-24 md:rounded-[25px]',
  small: 'size-12 rounded-[14px] border border-border',
};

/**
 * Renders the logo.
 *
 * @param props.space - the space
 * @param props.size - 'large' in the header, 'small' on a card
 * @returns the picture, or nothing when there is none to show
 */
export function SpaceLogo({ space, size }: { space: Space; size: 'large' | 'small' }) {
  const view = useSpaceLogoView(space).data ?? null;
  if (view === null || view.state !== 'visible' || view.url === null) return null;
  return (
    <img
      src={view.url}
      alt=""
      data-testid="space-logo"
      className={cn('flex-none bg-surface-solid object-cover', sizeClasses[size])}
    />
  );
}
