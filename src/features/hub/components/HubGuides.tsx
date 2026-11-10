/**
 * HubGuides: the how-to guides on the Writers' hub, two at a time with arrows (bundle G9 WRITING,
 * part a; board WritersHub, "Writing guides" with "All 48 guides" and two arrows).
 *
 * Robert, 9 Nov 2026, 12:11 UTC: the guides are about using the platform, not how to write, so
 * the row shows the CMS's how-to guides (lib/howToGuides.ts) and "See every guide" opens
 * Resources. Design rulebook: a sideways row shows only whole items (two here), with no fading,
 * and an arrow moves a full page; the arrow pointing at an end is disabled (DoD design rules).
 * Paging swaps the two cards rather than scrolling, so nothing is ever cut off at any width; a
 * status line tells screen readers which guides show.
 * Who shows it: WritersHubPage. What it calls: useWebsiteContent (the CMS help pages),
 * lib/howToGuides.ts and ShelfArrows-style buttons.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { InfoPill } from '@/components/ui/InfoPill';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { withBrand } from '@/features/website/lib/brandText';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { guidePageCount, guidesOnPage, guidesPerPage, howToGuides } from '../lib/howToGuides';
import { useHubTranslation } from '../registerHubTranslations';

/** The round arrow buttons, as the shelves draw them (44 px, a 3:1 border). */
const arrowClasses =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-control-border bg-surface text-heading hover:bg-tint disabled:opacity-40';

/**
 * The heading row: the eyebrow, "See every guide" and the two arrows.
 *
 * @returns the row
 */
function GuidesHeader({
  pageIndex,
  pageCount,
  onMove,
}: {
  pageIndex: number;
  pageCount: number;
  onMove: (step: number) => void;
}) {
  const { t } = useHubTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* The section's name, drawn as an eyebrow (board: the eyebrow is the row's title). */}
      <h2 id="hub-guides" className="eyebrow m-0">
        {t('hub.guides.eyebrow')}
      </h2>
      <div className="flex items-center gap-3">
        <Link
          to="/resources"
          className="inline-flex min-h-6 items-center text-sm text-link underline"
        >
          {t('hub.guides.seeEvery')}
        </Link>
        {/* The arrows show only when there is more than one page (DoD design rules). */}
        {pageCount > 1 && (
          <div className="flex gap-2">
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
        )}
      </div>
    </div>
  );
}

/**
 * Renders the row of guides.
 *
 * @returns the section, or nothing until the help pages have loaded
 */
export function HubGuides() {
  const { t } = useHubTranslation();
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  const [requestedPage, setRequestedPage] = useState(0);
  if (!pages.isLoaded && !pages.readFailed) return null;
  // Step 1: the guides, and the two on the page the arrows reached.
  const guides = howToGuides(pages.entries);
  const pageCount = guidePageCount(guides.length);
  const { shown, pageIndex } = guidesOnPage(guides, requestedPage);
  const first = pageIndex * guidesPerPage + 1;
  return (
    <section
      aria-labelledby="hub-guides"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,3vw,32px)] shadow-card"
    >
      <GuidesHeader
        pageIndex={pageIndex}
        pageCount={pageCount}
        onMove={(step) => setRequestedPage(pageIndex + step)}
      />
      {guides.length === 0 && <p className="m-0 text-body">{t('hub.guides.none')}</p>}
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
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {shown.map((guide) => (
          <li key={guide.entryKey} lang={guide.languageCode}>
            <Link
              to={`/help/${guide.entryKey}`}
              className="flex h-full min-h-32 flex-col gap-3 rounded-[20px] border border-hairline bg-tint p-5 text-ink no-underline hover:border-control-border"
            >
              <span className="self-start">
                <InfoPill tone="sage">{t('hub.guides.steps')}</InfoPill>
              </span>
              <span className="font-heading text-[19px] font-bold text-heading">
                {withBrand(guide.content.title)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
