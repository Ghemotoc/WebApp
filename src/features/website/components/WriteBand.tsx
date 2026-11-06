/**
 * WriteBand: "Post your story one chapter at a time", the dark band for writers on the home page
 * (bundle LOOK-3; board Website-Home, "Write here").
 *
 * Board values: a dark plum band with 32 px corners, the text and buttons on one side and four
 * short points on the other. The board's drawn chapter with a reader's comment is left out, as
 * the hero's comment card is (D1: no made-up comments until staff can pick real ones); the four
 * points sit in its place. The words come from the CMS.
 * Who shows it: WebsiteHomePage. What it calls: BandText, BandButtons.
 */
import { useSession } from '@/features/auth/hooks/useSession';
import type { HomeBand } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

import { BandButtons } from './BandButtons';
import { BandText } from './BandText';

/**
 * Renders the band.
 *
 * @param props.band - the band's words
 * @param props.language - the words' language
 * @returns the band
 */
export function WriteBand({ band, language }: { band: HomeBand; language: string }) {
  const { userId } = useSession();
  // Writing starts with an account; a member goes straight to a new story.
  const writeAddress = userId === null ? '/sign-up' : '/write/new';
  const points = (band.points ?? []).filter((point) => point.title.trim() !== '');
  return (
    <section
      id="write"
      aria-labelledby="write-band-heading"
      lang={language}
      className="grid scroll-mt-6 gap-10 rounded-[32px] bg-primary p-[clamp(24px,4vw,56px)] lg:grid-cols-2"
    >
      <div className="flex flex-col gap-6">
        <BandText band={band} headingId="write-band-heading" tone="dark" />
        <BandButtons
          tone="dark"
          first={{ label: band.button, to: writeAddress }}
          second={{ label: band.secondaryButton, to: '/help' }}
        />
      </div>
      {points.length > 0 && (
        <dl className="m-0 grid content-start gap-4 sm:grid-cols-2">
          {points.map((point) => (
            <div key={point.title} className="rounded-[20px] border border-on-primary/25 p-5">
              <dt className="font-heading text-lg font-bold text-on-primary">
                {withBrand(point.title)}
              </dt>
              <dd className="m-0 mt-1.5 text-[15px] leading-relaxed text-on-primary">
                {withBrand(point.body)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
