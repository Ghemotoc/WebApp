/**
 * OfflineReadingNote: "Downloaded to read offline" in the Library (board New-Library, bundle
 * CALM-7c; the offline downloads themselves come with the apps, story S1-E4-08, after March).
 *
 * Until the apps exist it only explains: the state "Comes with the apps" in bold, what offline
 * reading will do (downloads locked inside the app, removed after 30 days or at log-out), and a
 * quiet line that there is nothing to download on the website. Website text that changes with
 * the product, so it reads the product's name from the brand config (CLAUDE.md, names are
 * settings).
 * Who shows it: LibraryPage. What it calls: nothing.
 */
import { MetaLine } from '@/components/ui/MetaLine';
import { brand } from '@/config/brand';

import { useLibraryTranslation } from '../registerLibraryTranslations';

/**
 * Renders the section.
 *
 * @returns the note
 */
export function OfflineReadingNote() {
  const { t } = useLibraryTranslation();
  return (
    <section aria-labelledby="library-offline-heading" className="flex min-w-0 flex-col">
      <h2 id="library-offline-heading" className="m-0 type-heading">
        {t('offline.heading')}
      </h2>
      <MetaLine className="mt-1" facts={[{ text: t('offline.state'), kind: 'state' }]} />
      <p className="m-0 mt-3 type-body text-body">
        {t('offline.body', { productName: brand.productName })}
      </p>
      <p className="m-0 mt-2 type-meta">{t('offline.website')}</p>
    </section>
  );
}
