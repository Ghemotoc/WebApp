/**
 * Shelf: one horizontally scrolling line of stories (story S1-E1-03).
 *
 * The rules (DoD design rules; CLAUDE.md rule 20; Robert, 16 and 17 Oct 2026):
 *   - One scrollable line, never a grid; at most 20 items, then a "View more" card.
 *   - Arrows show only when the row overflows, and the one pointing at an end is disabled.
 *   - A row with arrows hides its scrollbar but stays scrollable by swipe, trackpad and keyboard
 *     (the row is a focusable, labelled region).
 *   - The row fades on one side at a time with a CSS mask on the row itself, so cards and shadows
 *     fade together (useShelfScroll works out which side).
 * Board values: heading Bricolage 30 px, 18 px below it; cards 20 px apart; a 140 px fade.
 * Who uses it: Discover (S1-E5-01), Classics, Library, the website home page and /design.
 */
import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from './Eyebrow';
import { ShelfArrows } from './ShelfArrows';
import { useShelfScroll, type ShelfScrollState } from './useShelfScroll';
import { ViewMoreCard } from './ViewMoreCard';

/** A shelf never shows more than this many items (CLAUDE.md rule 20). */
export const MAXIMUM_SHELF_ITEMS = 20;

/** One item in the shelf: a stable key and what to draw (usually a StoryCard). */
export interface ShelfItem {
  key: string;
  content: ReactNode;
}

/** What a Shelf needs. */
export interface ShelfProps {
  title: string;
  eyebrow?: string;
  items: ShelfItem[];
  /** The See all page for this shelf (S1-E5-09). */
  seeAllHref: string;
  /**
   * How many the whole list holds, when the caller has only its first page (S1-E5-01's shelves
   * load 21); defaults to the number of items.
   */
  totalCount?: number;
}

/** The CSS mask that fades one edge: 140 px wide, fully transparent at the edge (boards). */
function fadeMask(fadeSide: ShelfScrollState['fadeSide']): string | undefined {
  if (fadeSide === 'none') return undefined;
  const towards = fadeSide === 'right' ? 'to right' : 'to left';
  return `linear-gradient(${towards}, #000 0, #000 calc(100% - 140px), transparent 100%)`;
}

/**
 * Renders the heading, the arrows and the row.
 *
 * @returns the shelf section
 */
export function Shelf({ title, eyebrow, items, seeAllHref, totalCount }: ShelfProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const { state, scrollByPage } = useShelfScroll(rowRef);
  const mask = fadeMask(state.fadeSide);

  // Show the first 20; the rest are reached through the "View more" card.
  const visibleItems = items.slice(0, MAXIMUM_SHELF_ITEMS);
  const listSize = totalCount ?? items.length;
  const hasMore = listSize > MAXIMUM_SHELF_ITEMS;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-[18px] flex items-end justify-between gap-4">
        <div>
          {eyebrow !== undefined && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 id={headingId} className="m-0 text-[30px] font-bold tracking-[-0.01em]">
            {title}
          </h2>
        </div>
        {state.overflows && (
          <ShelfArrows
            isBackDisabled={state.atStart}
            isForwardDisabled={state.atEnd}
            onScroll={scrollByPage}
          />
        )}
      </div>
      <div
        ref={rowRef}
        role="region"
        tabIndex={0}
        aria-label={t('shelf.regionLabel', { title })}
        className={`-mx-1 flex snap-x snap-mandatory scroll-px-1 scroll-smooth gap-5 overflow-x-auto px-1 pt-1 pb-4 ${state.overflows ? 'tmc-noscroll' : ''}`}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {visibleItems.map((item) => (
          <div key={item.key} className="flex-none snap-start">
            {item.content}
          </div>
        ))}
        {hasMore && (
          <div className="flex-none snap-start">
            <ViewMoreCard href={seeAllHref} shelfTitle={title} totalCount={listSize} />
          </div>
        )}
      </div>
    </section>
  );
}
