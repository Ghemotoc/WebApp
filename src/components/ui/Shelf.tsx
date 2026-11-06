/**
 * Shelf: one horizontally scrolling line of stories (story S1-E1-03).
 *
 * The rules (DoD design rules; CLAUDE.md rule 20; Robert, 16 and 17 Oct 2026):
 *   - One scrollable line, never a grid; at most 20 items, then a "View more" card.
 *   - Arrows show only when the row overflows, and the one pointing at an end is disabled.
 *   - A row with arrows hides its scrollbar but stays scrollable by swipe, trackpad and keyboard
 *     (the row is a focusable, labelled region).
 *   - Each edge fades while cards are hidden past it, so in the middle of a long row both edges
 *     fade (Robert, 6 Nov 2026). The fade is a CSS mask on the row itself, so cards and shadows
 *     fade together (useShelfScroll works out which edges).
 *   - An arrow press moves by whole cards: the card a fade covered becomes fully visible
 *     (Robert, 5 Nov 2026; shelfPaging.ts). The row doesn't snap, because snapping would pull
 *     each press back to a card's edge and leave that card under the fade again.
 * Board values: heading Bricolage 30 px, 18 px below it; cards 20 px apart; a 140 px fade on
 * each faded edge (narrower on small screens, so a whole card still fits between two fades).
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

/**
 * The CSS mask that fades the row's edges: fully transparent at a faded edge, solid from one fade
 * width in (boards: 140 px). An edge that doesn't fade gets a width of 0, so it stays solid.
 *
 * @param state - which edges fade and how wide
 * @returns the mask, or undefined when neither edge fades
 */
function fadeMask(state: ShelfScrollState): string | undefined {
  const { left, right } = state.fadeEdges;
  if (!left && !right) return undefined;
  const leftWidth = left ? state.fadeWidth : 0;
  const rightWidth = right ? state.fadeWidth : 0;
  return `linear-gradient(to right, transparent 0, #000 ${leftWidth}px, #000 calc(100% - ${rightWidth}px), transparent 100%)`;
}

/**
 * The faded edges as a word list for the row's data-fade attribute ("left right", "right", or
 * "none"), so tests and the browser's inspector can read them without parsing the mask.
 *
 * @returns the word list
 */
function fadeEdgesLabel(state: ShelfScrollState): string {
  const edges = [];
  if (state.fadeEdges.left) edges.push('left');
  if (state.fadeEdges.right) edges.push('right');
  return edges.length === 0 ? 'none' : edges.join(' ');
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
  const mask = fadeMask(state);

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
        className={`-mx-1 flex scroll-px-1 scroll-smooth gap-5 overflow-x-auto px-1 pt-1 pb-4 ${state.overflows ? 'tmc-noscroll' : ''}`}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        data-fade={fadeEdgesLabel(state)}
        data-fade-width={state.fadeWidth}
      >
        {/* Each cell is "relative", so nothing absolutely positioned inside a card (a
            screen-reader-only label, a badge) can escape the row and widen the page (17 CHECK). */}
        {visibleItems.map((item) => (
          <div key={item.key} className="relative flex-none">
            {item.content}
          </div>
        ))}
        {hasMore && (
          <div className="relative flex-none">
            <ViewMoreCard href={seeAllHref} shelfTitle={title} totalCount={listSize} />
          </div>
        )}
      </div>
    </section>
  );
}
