/**
 * ShelfSection: a short shelf that fits (no arrows) and a long one with 25 stories (arrows, a
 * one-side fade and a "View more" card after 20) on /design (story S1-E1-03).
 * Who uses it: DesignPage. The e2e test checks the arrows and the 20-item limit here.
 */
import { useTranslation } from 'react-i18next';

import { Shelf, type ShelfItem } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
import type { CoverTone } from '@/lib/cover-colours';

import { DesignSection } from './DesignSection';

/** Cover tones to cycle through, so the samples show each one. */
const tones: CoverTone[] = [
  'plum',
  'gold',
  'lilac',
  'ink',
  'sky',
  'blush',
  'sage',
  'violet',
  'paper',
];

/**
 * Builds sample shelf items from the sample titles.
 *
 * @param count - how many stories
 * @param titles - the sample titles, reused in turn
 * @param metaLine - the meta line for every card
 * @returns the shelf items
 */
function sampleItems(count: number, titles: string[], metaLine: string): ShelfItem[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `sample-${index}`,
    content: (
      <StoryCard
        title={titles[index % titles.length] ?? ''}
        metaLine={metaLine}
        coverTone={tones[index % tones.length] ?? 'plum'}
        href="/design#shelves"
      />
    ),
  }));
}

/**
 * Renders the two shelves.
 *
 * @returns the section
 */
export function ShelfSection() {
  const { t } = useTranslation('design');
  const titles = t('shelves.sampleTitles', { returnObjects: true }) as string[];
  const metaLine = t('shelves.metaLine', { author: t('shelves.sampleAuthor'), reads: '3.4k' });

  return (
    <DesignSection id="shelves" title={t('sections.shelves')}>
      <div data-testid="short-shelf">
        <Shelf
          title={t('shelves.shortTitle')}
          items={sampleItems(3, titles, metaLine)}
          seeAllHref="/design#shelves"
        />
      </div>
      <div data-testid="long-shelf">
        <Shelf
          eyebrow={t('shelves.eyebrow')}
          title={t('shelves.longTitle')}
          items={sampleItems(25, titles, metaLine)}
          seeAllHref="/design#shelves"
        />
      </div>
    </DesignSection>
  );
}
