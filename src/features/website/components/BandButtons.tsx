/**
 * BandButtons: the one or two buttons at the end of a home page band (bundle LOOK-3; board
 * Website-Home). The words come from the CMS; where each leads is fixed in the code, because an
 * address is not copy. The second button shows only when staff gave it words.
 * Who uses it: WriteBand, CommunityBand, FirstStoryBand and AppsBand.
 */
import { Link } from 'react-router';

import { withBrand } from '../lib/brandText';

/** The look of the buttons on each background. */
const buttonClasses = {
  page: {
    first: 'bg-primary text-on-primary',
    second: 'border border-control-border bg-surface text-heading',
  },
  dark: {
    first: 'bg-gold text-on-gold',
    second: 'border border-on-primary text-on-primary',
  },
  gold: {
    first: 'bg-primary text-on-primary',
    second: 'border border-on-gold text-on-gold',
  },
} as const;

/** What the buttons need. */
interface BandButtonsProps {
  tone: keyof typeof buttonClasses;
  first: { label: string; to: string };
  second: { label: string; to: string };
}

/**
 * Renders the buttons.
 *
 * @returns the buttons
 */
export function BandButtons({ tone, first, second }: BandButtonsProps) {
  const pill =
    'inline-flex min-h-12 items-center rounded-full px-6 text-[15px] font-semibold no-underline hover:opacity-90';
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link to={first.to} className={`${pill} ${buttonClasses[tone].first}`}>
        {withBrand(first.label)}
      </Link>
      {second.label.trim() !== '' && (
        <Link to={second.to} className={`${pill} ${buttonClasses[tone].second}`}>
          {withBrand(second.label)}
        </Link>
      )}
    </div>
  );
}
