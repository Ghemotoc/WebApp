/**
 * ShelfArrows: the "scroll back" and "scroll forward" buttons beside a shelf heading
 * (story S1-E1-03).
 *
 * Board values: 44 px circles, #8E7B99 border, white, plum chevrons, 8 px apart. The Shelf shows
 * them only when the row overflows, and disables the one pointing at an end (DoD design rules).
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 */
import { useTranslation } from 'react-i18next';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';

import type { ScrollDirection } from './useShelfScroll';

/** What the arrows need. */
export interface ShelfArrowsProps {
  isBackDisabled: boolean;
  isForwardDisabled: boolean;
  onScroll: (direction: ScrollDirection) => void;
}

/** The classes both arrows share. */
const arrowClasses =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-control-border bg-surface text-heading hover:bg-tint';

/**
 * Renders the two arrow buttons.
 *
 * @returns the arrow group
 */
export function ShelfArrows({ isBackDisabled, isForwardDisabled, onScroll }: ShelfArrowsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={arrowClasses}
        aria-label={t('shelf.scrollBack')}
        disabled={isBackDisabled}
        onClick={() => onScroll('back')}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <button
        type="button"
        className={arrowClasses}
        aria-label={t('shelf.scrollForward')}
        disabled={isForwardDisabled}
        onClick={() => onScroll('forward')}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
