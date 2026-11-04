/**
 * AdBox: one filled ad slot, as on the board AdFormats (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * What it shows: the label pill ("Ad", "Sponsored" or "From us"), which the slot adds so no
 * creative can leave it out (criterion 3; Q7), the creative, and "Why this ad?" below the box,
 * which opens a short explanation: what about the page the ad matches, and that nothing about the
 * reader was used. The box keeps its format's size (a wide banner at least 120 px tall, 100 px on
 * phones; a portrait or side box only from 1200 px wide; a card the size of a story card), so
 * the page doesn't jump when the ad arrives (criterion 9).
 * Who shows it: PageAdSlot. What it calls: HouseAdCreative or, for a sponsor's ad (part b3),
 * SponsorAdCreative, and lib/whyThisAd.ts.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PageAdSlot } from '@/schemas/ads';

import { whyThisAd } from '../lib/whyThisAd';
import { useAdsTranslation } from '../registerAdsTranslations';

import { HouseAdCreative } from './HouseAdCreative';
import { SponsorAdCreative } from './SponsorAdCreative';

/** The size and layout of each format, written out in full so Tailwind can find them. */
const formatClasses: Record<PageAdSlot['format'], string> = {
  wide: 'w-full max-w-[970px] min-h-[120px] max-[700px]:min-h-[100px] flex-row flex-wrap items-center',
  portrait: 'w-[300px] h-[600px] flex-col items-start',
  side_box: 'w-[300px] min-h-[250px] flex-col items-start',
  list_card: 'w-[196px] min-h-[264px] flex-col items-start',
};

/** Portraits and side boxes live in the desktop side column only (1200 px and wider). */
const wrapperClasses: Record<PageAdSlot['format'], string> = {
  wide: 'flex w-full flex-col items-center',
  portrait: 'hidden flex-col min-[1200px]:flex',
  side_box: 'hidden flex-col min-[1200px]:flex',
  list_card: 'flex flex-col',
};

/** The label pill's words, by who placed the ad (common.json, shared with /design). */
const labelKeys = {
  ad: 'ads.labelAd',
  sponsored: 'ads.labelSponsored',
  house: 'ads.labelHouse',
} as const;

/**
 * "Why this ad?" and its explanation, which opens and closes in place.
 *
 * @param props.slot - the slot, with what it matched
 * @returns the button and, when open, the explanation
 */
function WhyThisAd({ slot }: { slot: PageAdSlot }) {
  const { t, i18n } = useAdsTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const explanationId = useId();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={explanationId}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-11 items-center gap-1.5 self-start border-0 bg-transparent p-0 text-sm font-semibold text-link"
      >
        {t('why.button')}
      </button>
      <p
        id={explanationId}
        hidden={!isOpen}
        className="m-0 max-w-[60ch] rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink"
      >
        {whyThisAd(t, slot, i18n.language)}
      </p>
    </div>
  );
}

/**
 * Renders a filled slot.
 *
 * @param props.slot - the slot and its ad (ad is never null here)
 * @returns the slot, marked as an advertisement for screen readers
 */
export function AdBox({ slot }: { slot: PageAdSlot }) {
  const { t } = useTranslation();
  const ad = slot.ad;
  if (ad === null) return null;
  const isStacked = slot.format !== 'wide';
  return (
    <aside
      aria-label={t('ads.regionLabel')}
      data-ad={slot.format}
      className={`gap-1 ${wrapperClasses[slot.format]}`}
    >
      <div
        className={`box-border flex gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 ${formatClasses[slot.format]}`}
      >
        <span className="inline-flex h-6 flex-none items-center justify-center rounded-full border border-(--pill-neutral-border) bg-(--pill-neutral-bg) px-2.5 text-xs leading-none font-bold tracking-[0.12em] text-(--pill-neutral-text) uppercase">
          {t(labelKeys[ad.label])}
        </span>
        {ad.kind === 'sponsor' ? (
          <SponsorAdCreative ad={ad} isStacked={isStacked} />
        ) : (
          <HouseAdCreative ad={ad} isStacked={isStacked} />
        )}
      </div>
      <WhyThisAd slot={slot} />
    </aside>
  );
}
