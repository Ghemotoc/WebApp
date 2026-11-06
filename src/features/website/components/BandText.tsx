/**
 * BandText: the small label, heading and paragraph that open each band lower down the home page
 * (bundle LOOK-3; board Website-Home). The words come only from the CMS (CLAUDE.md rule 4), with
 * {{productName}} filled in from the brand config.
 * Who uses it: WriteBand, CommunityBand, FirstStoryBand and AppsBand.
 */
import type { HomeBand } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

/** What the text needs. */
interface BandTextProps {
  band: HomeBand;
  /** The heading's id, so the section is named by it. */
  headingId: string;
  /** Text colours for the band's background: the plain page, the dark band or the gold band. */
  tone: 'page' | 'dark' | 'gold';
}

/** The classes for each tone: label, heading and paragraph. */
const toneClasses = {
  page: { eyebrow: 'eyebrow', heading: 'text-heading', lede: 'text-body' },
  dark: {
    eyebrow: 'eyebrow-type text-on-primary',
    heading: 'text-on-primary',
    lede: 'text-on-primary',
  },
  gold: { eyebrow: 'eyebrow-type text-on-gold', heading: 'text-on-gold', lede: 'text-on-gold' },
} as const;

/**
 * Renders the label, heading and paragraph.
 *
 * @returns the text block
 */
export function BandText({ band, headingId, tone }: BandTextProps) {
  const classes = toneClasses[tone];
  return (
    <div className="flex flex-col gap-3">
      <p className={`m-0 ${classes.eyebrow}`}>{withBrand(band.eyebrow)}</p>
      <h2
        id={headingId}
        className={`m-0 font-heading text-[clamp(30px,3.6vw,48px)] leading-[1.05] font-extrabold tracking-[-0.02em] ${classes.heading}`}
      >
        {withBrand(band.heading)}
      </h2>
      <p className={`m-0 max-w-[560px] text-[17px] leading-relaxed ${classes.lede}`}>
        {withBrand(band.lede)}
      </p>
    </div>
  );
}
