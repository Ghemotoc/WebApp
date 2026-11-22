/**
 * ContinueReading: "Continue reading", the glass hero at the top of the Library (story S1-E4-03,
 * first criterion; board New-Library, bundle CALM-7c).
 *
 * Up to four stories from the Reading shelf, the most recently read first, two to a row from
 * 900 px and one on narrower screens, 40 px apart. It is the page's one Hero (handover Step 2:
 * only the hero is glass). Only the first story's Continue is the main button; the others are
 * quiet, so the page keeps one main action (DoD: one main button a screen). With nothing to
 * continue, one line says how stories get here.
 * Who uses it: LibraryPage, with the overview from my_library(). What it calls: Hero and
 * ContinueReadingCard.
 */
import { Hero } from '@/components/ui/Hero';

import type { ContinueReadingItem } from '../api/library';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ContinueReadingCard } from './ContinueReadingCard';

/**
 * Renders the section.
 *
 * @param props.items - the stories to continue, with their places
 * @returns the hero
 */
export function ContinueReading({ items }: { items: ContinueReadingItem[] }) {
  const { t } = useLibraryTranslation();
  return (
    <Hero labelledBy="library-continue-heading">
      <h2 id="library-continue-heading" className="m-0 type-heading text-heading">
        {t('continue.heading')}
      </h2>
      {items.length === 0 ? (
        <p className="m-0 type-body text-body">{t('continue.empty')}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-10 p-0 min-[900px]:grid-cols-2">
          {items.map((item, index) => (
            <ContinueReadingCard key={item.story.slug} item={item} isFirst={index === 0} />
          ))}
        </ul>
      )}
    </Hero>
  );
}
