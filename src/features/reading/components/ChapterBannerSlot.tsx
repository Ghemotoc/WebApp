/**
 * ChapterBannerSlot: the one place a banner may appear on a chapter (story S1-E4-01b; board 3.5,
 * the sponsor banner after the chapter; S1-E12-01).
 *
 * The rule (S1-E4-01 criterion; architecture 1.2): a banner sits only below the chapter, never
 * inside its text, so ChapterReaderPage renders this after the <article>. Nothing renders
 * without a banner: no empty box and no placeholder text. The slot itself is the shared AdSlot,
 * which adds the "Sponsored" or "Ad" label so a creative can never leave it out.
 * Who uses it: ChapterReaderPage. What it calls: AdSlot (src/components/ui/).
 */
import { AdSlot } from '@/components/ui/AdSlot';

import type { ChapterBanner } from '../hooks/useChapterBanner';

/**
 * Renders the banner, or nothing.
 *
 * @returns the slot below the chapter, or null
 */
export function ChapterBannerSlot({ banner }: { banner: ChapterBanner | null }) {
  if (banner === null) return null;
  return (
    <div className="mx-auto mt-10 flex w-full max-w-[760px] justify-center">
      <AdSlot format="banner" labelKind={banner.labelKind}>
        {banner.text}
      </AdSlot>
    </div>
  );
}
