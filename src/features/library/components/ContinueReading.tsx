/**
 * ContinueReading: the "Continue reading" cards at the top of the Library (story S1-E4-03,
 * first criterion; board 3.7 Library).
 *
 * Up to four stories from the Reading shelf, the most recently read first, two to a row on wide
 * screens and one on phones. With nothing to continue, one line says how stories get here.
 * Who uses it: LibraryPage, with the overview from my_library().
 */
import type { ContinueReadingItem } from '../api/library';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ContinueReadingCard } from './ContinueReadingCard';

/**
 * Renders the section.
 *
 * @param props.items - the stories to continue, with their places
 * @returns the section
 */
export function ContinueReading({ items }: { items: ContinueReadingItem[] }) {
  const { t } = useLibraryTranslation();
  return (
    <section aria-labelledby="library-continue-heading" className="flex flex-col gap-4">
      <h2
        id="library-continue-heading"
        className="m-0 font-heading text-[28px] font-bold text-heading"
      >
        {t('continue.heading')}
      </h2>
      {items.length === 0 ? (
        <p className="m-0 text-[15px] text-body">{t('continue.empty')}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <ContinueReadingCard key={item.story.slug} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
