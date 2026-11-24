/**
 * UnavailableHereNotice: "This page isn't available here", for a story hidden in the reader's
 * country (bundle COUNTRY-1; board B11, Robert, 21 Nov 2026).
 *
 * As the board draws it: a page title, one line ("Unfortunately, this page is not yet available
 * in your country."), the main action to the home page and the quiet one to search. No reason is
 * given and nothing about the story is shown (board D07: readers "aren't told why").
 * Who uses it: StoryPage and ChapterReaderPage, when useUnavailableHere says so.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/**
 * Renders the notice and the page's title.
 *
 * @returns the notice
 */
export function UnavailableHereNotice() {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col items-start gap-4">
      <title>{t('unavailableHere.title')}</title>
      {/* Board B11: the title style on phone and tablet, display from 1024 px; the line in the body colour. */}
      <h1 className="m-0 type-title lg:type-display text-ink-heading">
        {t('unavailableHere.title')}
      </h1>
      <p className="m-0 type-body text-ink">{t('unavailableHere.body')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline"
        >
          {t('unavailableHere.goHome')}
        </Link>
        <Link
          to="/search"
          className="inline-flex h-11 items-center rounded-full button-glass px-4 type-body font-semibold no-underline"
        >
          {t('unavailableHere.search')}
        </Link>
      </div>
    </div>
  );
}
