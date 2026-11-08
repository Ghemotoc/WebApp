/**
 * AppsBand: "Desktop and phone apps come later" on the home page (bundle LOOK-3; board
 * Website-Home, "The apps"; Robert, 17 Oct 2026: March is web only).
 *
 * Board values: a bordered box with the text on one side and the buttons on the other. It promises nothing that isn't planned: the
 * apps come after the web launch. The words come from the CMS.
 * Who shows it: WebsiteHomePage. What it calls: BandText, BandButtons.
 */
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
export function AppsBand({ band, language }: { band: HomeBand; language: string }) {
  return (
    <section
      id="apps"
      aria-labelledby="apps-band-heading"
      lang={language}
      className="relative flex scroll-mt-6 flex-wrap items-end justify-between gap-8 rounded-[32px] border border-border bg-surface p-[clamp(24px,4vw,48px)]"
    >
      <BandText band={band} headingId="apps-band-heading" tone="page" />
      <BandButtons
        tone="page"
        first={{ label: band.button, to: '/discover' }}
        second={{ label: band.secondaryButton, to: '/help' }}
      />
    </section>
  );
}
