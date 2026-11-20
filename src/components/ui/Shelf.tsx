/**
 * Shelf: one sideways row of covers (story S1-E1-03; redrawn in bundle CALM-4).
 *
 * The rules (CLAUDE.md rule 20; the simplified design, Robert, 20 Nov 2026, 10:18 UTC;
 * design/simplified-system/components/Shelf/README.md):
 *   - One row, never a grid: at most 20 covers, then a View more card to the See all page.
 *   - Whole covers only: 5 in view from 1024 px, 4 from 600 px, and on phones 2 and the edge of a
 *     third. Each cover takes its width from the row (a fifth of the column less the gaps); gaps
 *     are 24 px, 16 px on phones.
 *   - No fade at the edges and no scroll bar (the fade was visual overload). The row snaps to a
 *     cover, scrolls smoothly only without reduced motion and never turns by itself.
 *   - Previous and Next sit at the top right beside "View 54", from 600 px; each press moves one
 *     screenful (useShelfScroll). Phones swipe.
 *   - The row is a list: each cover is one link in a list item. The row itself is a labelled,
 *     focusable region, so a keyboard can scroll it with the arrow keys.
 *   - In the interface these are rows with plain headings ("Trending"), never "shelves", so
 *     "bookshelf" means one thing (Bookshelf, the collections members make).
 * Who uses it: Discover, Classics, Library, profiles, search, the website home page and /design.
 */
import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from './Eyebrow';
import { ShelfArrows } from './ShelfArrows';
import { useShelfScroll } from './useShelfScroll';
import { ViewMoreCard } from './ViewMoreCard';

/** A row never shows more than this many items (CLAUDE.md rule 20). */
export const MAXIMUM_SHELF_ITEMS = 20;

/** One item in the row: a stable key and what to draw (usually a StoryCard). */
export interface ShelfItem {
  key: string;
  content: ReactNode;
}

/** What a Shelf needs. */
export interface ShelfProps {
  title: string;
  eyebrow?: string;
  items: ShelfItem[];
  /** The See all page for this row (S1-E5-09); left out for a row that never holds more than 20. */
  seeAllHref?: string;
  /** How many the whole list holds, when the caller has only its first page; defaults to the items. */
  totalCount?: number;
  /** Controls between the heading and the row, such as the home page's genre chips (LOOK-3). */
  toolbar?: ReactNode;
  /** The section's id, for links to it from elsewhere on the page ("#trending"). */
  anchorId?: string;
}

/**
 * The row's grid: one column per cover, sized so 5, 4 or 2.3 covers fill the row. The variables
 * are the design system's (.gh-shelf__row in bundle.css); Tailwind's arbitrary properties set them.
 */
const listClasses = [
  '[--per-page:2.3] [--gap:16px] min-[600px]:[--per-page:4] min-[600px]:[--gap:24px] min-[1024px]:[--per-page:5]',
  'grid auto-cols-[calc((100%-(var(--per-page)-1)*var(--gap))/var(--per-page))] grid-flow-col gap-(--gap)',
  'm-0 list-none p-0',
].join(' ');

/** The scrolling region around the list: no scroll bar, snapping to covers, smooth only with motion. */
const regionClasses =
  'overflow-x-auto overscroll-x-contain tmc-noscroll snap-x snap-mandatory motion-safe:scroll-smooth';

/** The "View 54" link beside the arrows; its full name says which row it opens. */
function SeeAllLink({ href, count, title }: { href: string; count: number; title: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-link"
    >
      {t('shelf.viewCount', { count })}{' '}
      <span className="sr-only">{t('shelf.inRow', { title })}</span>
    </a>
  );
}

/**
 * Renders the heading, View and the arrows, then the row.
 *
 * @returns the row's section
 */
export function Shelf({
  title,
  eyebrow,
  items,
  seeAllHref,
  totalCount,
  toolbar,
  anchorId,
}: ShelfProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const { state, scrollByPage } = useShelfScroll(rowRef);

  // Show the first 20; the rest are reached through the View more card and the View link.
  const visibleItems = items.slice(0, MAXIMUM_SHELF_ITEMS);
  const listSize = totalCount ?? items.length;
  const hasMore = listSize > MAXIMUM_SHELF_ITEMS && seeAllHref !== undefined;

  return (
    <section id={anchorId} aria-labelledby={headingId} className="scroll-mt-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {eyebrow !== undefined && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2
            id={headingId}
            className="m-0 type-heading"
          >
            {title}
          </h2>
        </div>
        <div className="flex flex-none items-center gap-1">
          {hasMore && <SeeAllLink href={seeAllHref} count={listSize} title={title} />}
          {state.overflows && (
            <ShelfArrows
              rowTitle={title}
              isBackDisabled={state.atStart}
              isForwardDisabled={state.atEnd}
              onScroll={scrollByPage}
            />
          )}
        </div>
      </div>
      {toolbar !== undefined && <div className="mb-4">{toolbar}</div>}
      <div
        ref={rowRef}
        role="region"
        tabIndex={0}
        aria-label={t('shelf.regionLabel', { title })}
        className={regionClasses}
      >
        <ul role="list" className={listClasses}>
          {/* Each item is "relative", so nothing absolutely positioned inside a card (a
            screen-reader-only label, a badge) can escape the row and widen the page (17 CHECK). */}
          {visibleItems.map((item) => (
            <li key={item.key} className="relative min-w-0 snap-start">
              {item.content}
            </li>
          ))}
          {hasMore && (
            <li className="relative min-w-0 snap-start">
              <ViewMoreCard href={seeAllHref} shelfTitle={title} totalCount={listSize} />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
