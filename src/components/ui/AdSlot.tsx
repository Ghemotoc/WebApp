/**
 * AdSlot: the four places an ad or a sponsor's message can appear (story S1-E1-03).
 *
 * Formats (AdFormats board, 17 Oct 2026):
 *   banner    full width up to 970 × 120 px (100 px tall on screens 700 px or narrower)
 *   portrait  300 × 600 px, only on screens 1200 px and wider
 *   side      300 × 250 px, only on screens 1200 px and wider
 *   card      196 × 264 px, the same size as a story card, in a shelf
 * Labels (decided 16 Oct 2026): "Ad" marks ad-network ads and "Sponsored" marks direct sponsors.
 * The label is added here, so a creative can never leave it out.
 * In this story the slots are specimens with placeholder text, shown on /design. Real ads, the
 * per-page limits and "Why this ad?" come with S1-E12 (no ad code before S1-E12-04, rule 7).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** The four slot formats. */
export type AdFormat = 'banner' | 'portrait' | 'side' | 'card';

/** The classes for each format, written out in full so Tailwind can find them. */
const formatClasses: Record<AdFormat, string> = {
  banner: 'h-[120px] w-full max-w-[970px] max-[700px]:h-[100px]',
  portrait: 'hidden h-[600px] w-[300px] min-[1200px]:flex',
  side: 'hidden h-[250px] w-[300px] max-w-full min-[1200px]:flex',
  card: 'h-[264px] w-[196px] rounded-cover',
};

/** What an AdSlot needs. */
export interface AdSlotProps {
  format: AdFormat;
  /** 'ad' for the ad network, 'sponsored' for a direct sponsor. */
  labelKind: 'ad' | 'sponsored';
  /** The placeholder or the creative. */
  children: ReactNode;
}

/**
 * Renders the slot with its label and the "Why this ad?" link.
 *
 * @returns the slot, marked as an advertisement for screen readers
 */
export function AdSlot({ format, labelKind, children }: AdSlotProps) {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t('ads.regionLabel')}
      data-ad={format}
      className={`relative box-border flex items-center justify-center rounded-ad border border-dashed border-dashed-border bg-panel px-4 text-sm font-medium text-meta ${formatClasses[format]}`}
    >
      <span className="absolute top-3 left-3.5 inline-flex h-6 items-center rounded-full border border-meta px-2.5 text-[11px] font-bold tracking-[0.12em] text-body uppercase">
        {labelKind === 'ad' ? t('ads.labelAd') : t('ads.labelSponsored')}
      </span>
      <span className="text-center">{children}</span>
      <a
        href="#ad-formats"
        className="absolute right-2 bottom-0 inline-flex min-h-11 items-center px-2 text-[13px] font-medium"
      >
        {t('ads.whyThisAd')}
      </a>
    </aside>
  );
}
