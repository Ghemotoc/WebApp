/**
 * PageAdSlot: one ad slot of a page, filled by the server (bundle SPONSORS, part a1; story
 * S1-E12-01).
 *
 * A page places one PageAdSlot for each of its slots (at most two, decided 17 Oct 2026, 11:53)
 * with its page key, the slot's position and what the page is about; a long story grid places
 * the same slot again after every 10 stories (bundle G7e). Only a signed-in reader sees an ad:
 * for a visitor usePageAds() answers with no slot and nothing is drawn (G7e).
 * While the ad loads, a wide slot keeps its height so the page doesn't jump (criterion 9). In a
 * class space or on a class-only story the server answers with no slot and nothing is drawn
 * (Q70); if the read fails, the slot quietly stays empty, because an ad is never worth an error
 * on someone's page.
 * Who shows it: the signed-in pages (the chapter's end, the story page, Discover, Library, …).
 * What it calls: usePageAds() and AdBox.
 */
import type { AdPageContext, AdPageKey } from '@/schemas/ads';

import { usePageAds } from '../hooks/usePageAds';

import { AdBox } from './AdBox';

/** What a page tells its slot. */
export interface PageAdSlotProps {
  pageKey: AdPageKey;
  /** 1 or 2: which of the page's slots this is. */
  position: 1 | 2;
  /** The page's category, tag and language, and its space or story (never the reader). */
  context?: AdPageContext;
  /** Extra classes for where the slot sits on the page (margins, alignment). */
  className?: string;
  /**
   * True (the default) to hold a wide slot's height while the ad loads. A side-column slot passes
   * false, because it is hidden on phones and tablets anyway.
   */
  isSpaceReserved?: boolean;
}

/**
 * Renders the slot.
 *
 * @returns the filled slot, a reserved space while loading, or nothing
 */
export function PageAdSlot({
  pageKey,
  position,
  context = {},
  className = '',
  isSpaceReserved = true,
}: PageAdSlotProps) {
  const ads = usePageAds(pageKey, context);
  // Step 1: while loading, keep a wide slot's height (the most common shape) so nothing jumps.
  if (ads.isPending) {
    if (!isSpaceReserved) return null;
    return (
      <div aria-hidden="true" className={`min-h-[120px] max-[700px]:min-h-[100px] ${className}`} />
    );
  }
  // Step 2: a failed read, a page without this slot or a class space: nothing at all.
  const slot = ads.data?.find((candidate) => candidate.position === position);
  if (slot === undefined || slot.ad === null) return null;
  // Step 3: the slot with its ad.
  return (
    <div className={className}>
      <AdBox slot={slot} />
    </div>
  );
}
