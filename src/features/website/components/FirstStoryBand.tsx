/**
 * FirstStoryBand: the gold "Start your first story" band on the home page (bundle LOOK-3; board
 * Website-Home, the house promo; the First Chapter contest is a campaign for later, 17 Oct 2026).
 *
 * Board values: a gold band with 32 px corners, the text and two buttons (start writing, and the
 * community guidelines). The board's line about
 * under-16s needing a parent's consent stays out of the March copy, because S1-E2-03 is off for
 * the invited test and every claim must be true (Law 363/2007). The words come from the CMS.
 * "New and rising writers" sits on the band's right in a box (board A02, Robert, 20 Nov 2026,
 * 17:33; it left the rows on 23 Nov 2026), so the band has no empty half; for a visitor, Follow
 * asks them to get in first. A member's own home (/hub) lists them in its Tools band (board A01).
 * Who shows it: WebsiteHomePage. What it calls: BandText, BandButtons, RisingWritersList.
 */
import { useSession } from '@/features/auth/hooks/useSession';
import { RisingWritersList } from '@/features/discovery/components/RisingWritersList';
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
      className="grid scroll-mt-6 gap-8 rounded-card bg-gold glass-band-tint p-6 lg:p-12 lg:grid-cols-2"
    >
      <div className="flex flex-col gap-6">
        <BandText band={band} headingId="first-story-band-heading" tone="gold" />
        <BandButtons
          tone="gold"
          first={{ label: band.button, to: writeAddress }}
          second={{ label: band.secondaryButton, to: '/legal/guidelines' }}
        />
      </div>
      {/* The writers in a box on the right, under the words on tablets and phones. */}
      <div
        id="writers"
        className="box-surface scroll-mt-6 self-start rounded-card p-4 empty:hidden"
      >
        <RisingWritersList headingId="first-story-writers-heading" />
      </div>
    </section>
  );
}
