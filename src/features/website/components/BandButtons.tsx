/**
 * BandButtons: the one or two buttons at the end of a home page band (bundle LOOK-3; board
 * Website-Home). The words come from the CMS; where each leads is fixed in the code, because an
 * address is not copy. The second button shows only when staff gave it words.
 * Who uses it: WriteBand, CommunityBand, FirstStoryBand and AppsBand.
 */

import { withBrand } from '../lib/brandText';
import { WebsiteLink } from './WebsiteLink';

/** The look of the buttons on each background. */
const buttonClasses = {
  // The first button is the main action (button-main: the website's deep plum by day, with the
  // lighter plum on hover and press, GLASS-2). On the deep band it stays gold by day, and turns
  // into the main button at night, when the band itself is white (band-first-on-dark, index.css).
  page: {
    first: 'button-main',
    second: 'border border-control-border bg-surface text-heading hover:opacity-90',
  },
  dark: {
    first: 'bg-gold text-on-gold band-first-on-dark hover:opacity-90',
    second: 'border border-on-primary text-on-primary hover:opacity-90',
  },
  gold: {
    first: 'button-main',
    second: 'border border-on-gold text-on-gold hover:opacity-90',
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
    'inline-flex min-h-12 items-center rounded-full px-6 text-[15px] font-semibold no-underline';
  return (
    <div className="flex flex-wrap items-center gap-3">
      <WebsiteLink to={first.to} className={`${pill} ${buttonClasses[tone].first}`}>
        {withBrand(first.label)}
      </WebsiteLink>
      {second.label.trim() !== '' && (
        <WebsiteLink to={second.to} className={`${pill} ${buttonClasses[tone].second}`}>
          {withBrand(second.label)}
        </WebsiteLink>
      )}
    </div>
  );
}
