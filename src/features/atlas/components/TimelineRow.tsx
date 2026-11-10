/**
 * TimelineRow: one line of the storyline's timeline (story S1-E17-20; bundle G10 ATLAS, part c1,
 * board AtlasTimeline): the date as the writer shows it and the number it sorts by, a dot on the
 * timeline's rail, then a glass card with whatever the event or chapter shows.
 *
 * On a phone the date sits above the card and the rail is left out, so nothing is squeezed
 * (rule 21). The dot is decoration: the card's pill says "Event" or "Chapter" in words, so the
 * kind is never told by colour alone (WCAG 1.4.1).
 * Who uses it: TimelineView (chapters) and TimelineEventItem (events). What it calls: nothing.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the row needs. */
export interface TimelineRowProps {
  /** Which kind of line it is; only the dot's colour follows it. */
  kind: 'event' | 'chapter';
  /** The date as the writer wrote it ("Spring 2055"); may be empty. */
  date: string;
  /** The number that places it on the timeline. */
  sortValue: number | null;
  /** The card's content. */
  children: ReactNode;
}

/**
 * Renders the row as a list item.
 *
 * @returns the <li> with the date, the dot and the glass card
 */
export function TimelineRow({ kind, date, sortValue, children }: TimelineRowProps) {
  const { t, i18n } = useAtlasTranslation();
  // The number in the reader's own format, without rounding what the writer typed.
  const sortText =
    sortValue === null
      ? null
      : new Intl.NumberFormat(i18n.language, {
          maximumFractionDigits: 6,
          useGrouping: false,
        }).format(sortValue);
  return (
    <li
      data-testid="atlas-timeline-item"
      className="relative flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-[18px]"
    >
      <p className="m-0 text-sm break-words text-meta sm:w-[120px] sm:shrink-0 sm:pt-3.5 sm:text-right">
        {date !== '' && <b className="font-bold text-heading">{date}</b>}
        {date !== '' && sortText !== null && <span className="sm:hidden"> · </span>}
        {sortText !== null && (
          <span className="sm:block">{t('storyline.timeline.sortLine', { value: sortText })}</span>
        )}
      </p>
      <span
        aria-hidden="true"
        className={cn(
          'relative z-[1] mt-4 hidden size-[18px] shrink-0 rounded-full ring-4 ring-surface-solid sm:block',
          kind === 'event' ? 'bg-gold' : 'bg-primary',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-3xl border border-border bg-surface px-[18px] py-3.5 shadow-card">
        {children}
      </div>
    </li>
  );
}
