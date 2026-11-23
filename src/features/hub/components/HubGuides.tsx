/**
 * HubGuides: the how-to guides on the Home page, the Writers' hub (bundle G9 WRITING, part a;
 * since CALM-7c the right of "Tools for the next chapter" on the simplified board New-Home: rows
 * split by the hairline, each "Guide" as a meta line over the guide's title).
 *
 * Robert, 9 Nov 2026, 12:11 UTC: the guides are about using the platform, not how to write, so
 * the rows show the CMS's how-to guides (lib/howToGuides.ts); the section's "Guides" link opens
 * Resources with every guide. Three show at a time; with more, Previous and Next swap the rows
 * (the arrow pointing at an end is disabled, DoD design rules) and a status line tells screen
 * readers which guides show.
 * Who shows it: HubToolsSection. What it calls: useWebsiteContent (the CMS help pages) and
 * lib/howToGuides.ts.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { withBrand } from '@/features/website/lib/brandText';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { guidePageCount, guidesOnPage, guidesPerPage, howToGuides } from '../lib/howToGuides';
import { useHubTranslation } from '../registerHubTranslations';

/** The round arrow buttons, as the shelves draw them (44 px, quiet). */
const arrowClasses =
  'inline-flex h-11 w-11 items-center justify-center rounded-full button-glass text-ink-heading disabled:opacity-40';

/**
 * Previous and Next, shown only when there is more than one page.
 *
 * @returns the two buttons
 */
function GuideArrows({
  pageIndex,
  pageCount,
  onMove,
}: {
  pageIndex: number;
  pageCount: number;
  onMove: (step: number) => void;
}) {
  const { t } = useHubTranslation();
  if (pageCount <= 1) return null;
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        type="button"
        className={arrowClasses}
        aria-label={t('hub.guides.previous')}
        disabled={pageIndex === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <button
        type="button"
        className={arrowClasses}
        aria-label={t('hub.guides.next')}
        disabled={pageIndex === pageCount - 1}
        onClick={() => onMove(1)}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}

/**
 * Renders the guides.
 *
 * @returns the section, or nothing until the help pages have loaded
 */
export function HubGuides() {
  const { t } = useHubTranslation();
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  const [requestedPage, setRequestedPage] = useState(0);
  if (!pages.isLoaded && !pages.readFailed) return null;
  // Step 1: the guides, and the three on the page the arrows reached.
  const guides = howToGuides(pages.entries);
  const pageCount = guidePageCount(guides.length);
  const { shown, pageIndex } = guidesOnPage(guides, requestedPage);
  const first = pageIndex * guidesPerPage + 1;
  return (
    <section aria-labelledby="hub-guides" className="flex flex-col">
      {/* The section's name for screen readers; the visible heading is the tools section's. */}
      <h3 id="hub-guides" className="sr-only">
        {t('hub.guides.eyebrow')}
      </h3>
      {guides.length === 0 && <p className="m-0 text-ink-muted">{t('hub.guides.none')}</p>}
      {/* Step 2: say which guides show, for screen readers, each time the arrows move. */}
      {guides.length > 0 && (
        <p role="status" className="sr-only">
          {t('hub.guides.position', {
            first,
            last: first + shown.length - 1,
            total: guides.length,
          })}
        </p>
      )}
      <ul className="m-0 list-none p-0">
        {shown.map((guide) => (
          <li
            key={guide.entryKey}
            lang={guide.languageCode}
            className="border-b border-hairline last:border-b-0"
          >
            <Link
              to={`/help/${guide.entryKey}`}
              className="flex flex-col gap-1 py-3 text-ink no-underline hover:underline"
            >
              <span className="type-meta">{t('hub.guides.kind')}</span>
              <span className="font-semibold text-ink-heading">
                {withBrand(guide.content.title)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <GuideArrows
        pageIndex={pageIndex}
        pageCount={pageCount}
        onMove={(step) => setRequestedPage(pageIndex + step)}
      />
    </section>
  );
}
