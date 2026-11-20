/**
 * ShelfArrows: Previous and Next beside a row's heading (story S1-E1-03; redrawn in CALM-4).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026; Shelf/README.md):
 *   - Quiet 44 px buttons at the top right of the row, beside "View 54".
 *   - Each is named for its row ("Next in Trending"), so a screen reader that lists the buttons
 *     on a page with several rows can tell them apart.
 *   - At either end the arrow pointing that way dims and gets aria-disabled="true"; it stays
 *     focusable, so keyboard focus doesn't jump away when the row reaches its end.
 *   - Phones (under 600 px) have no arrows: a swipe moves the row, and the third cover's edge
 *     shows there is more.
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 */
import { useTranslation } from 'react-i18next';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';

import type { ScrollDirection } from './useShelfScroll';

/** What the arrows need. */
export interface ShelfArrowsProps {
  /** The row's heading, for the arrows' names. */
  rowTitle: string;
  isBackDisabled: boolean;
  isForwardDisabled: boolean;
  onScroll: (direction: ScrollDirection) => void;
}

/** The classes both arrows share: quiet, a 44 px target, dimmed at an end. */
const arrowClasses =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-heading hover:bg-tint aria-disabled:cursor-default aria-disabled:text-control-border aria-disabled:hover:bg-transparent';

/** One arrow. A press at the end does nothing, because the button says it is disabled. */
function ShelfArrow({
  label,
  isDisabled,
  onPress,
  children,
}: {
  label: string;
  isDisabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={arrowClasses}
      aria-label={label}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={() => {
        if (!isDisabled) onPress();
      }}
    >
      {children}
    </button>
  );
}

/**
 * Renders Previous and Next, hidden on phones.
 *
 * @returns the arrow group
 */
export function ShelfArrows({
  rowTitle,
  isBackDisabled,
  isForwardDisabled,
  onScroll,
}: ShelfArrowsProps) {
  const { t } = useTranslation();

  return (
    <div className="hidden gap-1 min-[600px]:flex">
      <ShelfArrow
        label={t('shelf.previousIn', { title: rowTitle })}
        isDisabled={isBackDisabled}
        onPress={() => onScroll('back')}
      >
        <ChevronLeftIcon size={18} />
      </ShelfArrow>
      <ShelfArrow
        label={t('shelf.nextIn', { title: rowTitle })}
        isDisabled={isForwardDisabled}
        onPress={() => onScroll('forward')}
      >
        <ChevronRightIcon size={18} />
      </ShelfArrow>
    </div>
  );
}
