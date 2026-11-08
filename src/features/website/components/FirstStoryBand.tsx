/**
 * FirstStoryBand: the gold "Start your first story" band on the home page (bundle LOOK-3; board
 * Website-Home, the house promo; the First Chapter contest is a campaign for later, 17 Oct 2026).
 *
 * Board values: a gold band with 32 px corners, the text and two buttons (start writing, and the
 * community guidelines). The board's line about
 * under-16s needing a parent's consent stays out of the March copy, because S1-E2-03 is off for
 * the invited test and every claim must be true (Law 363/2007). The words come from the CMS.
 * Who shows it: WebsiteHomePage. What it calls: BandText, BandButtons.
 */
import { useSession } from '@/features/auth/hooks/useSession';
import type { HomeBand } from '@/schemas/websiteContent';

import { BandButtons } from './BandButtons';
import { BandText } from './BandText';

/**
 * Renders the band.
 *
 * @param props.band - the band's words
 * @param props.language - the words' language
 * @returns the band
 */
export function FirstStoryBand({ band, language }: { band: HomeBand; language: string }) {
  const { userId } = useSession();
  const writeAddress = userId === null ? '/sign-up' : '/write/new';
  return (
    <section
      id="first-story"
      aria-labelledby="first-story-band-heading"
      lang={language}
      className="scroll-mt-6 rounded-[32px] bg-gold p-[clamp(24px,4vw,56px)]"
    >
      <div className="flex flex-col gap-6">
        <BandText band={band} headingId="first-story-band-heading" tone="gold" />
        <BandButtons
          tone="gold"
          first={{ label: band.button, to: writeAddress }}
          second={{ label: band.secondaryButton, to: '/legal/guidelines' }}
        />
      </div>
    </section>
  );
}
