/**
 * TimelineRow: one line of the storyline's timeline (story S1-E17-20; redrawn by user stories
 * bundle 6, story 6.10, board E29).
 *
 * A plain row between hairlines: a 96 px column with the date as the writer wrote it
 * ("October", "1974") over the number it sorts by ("sort 2026.76"), then the kind as a word
 * ("Event" or "Chapter", never a colour alone; WCAG 1.4.1), the title and one meta line, and at
 * the end whatever the row holds (an event's "…" More menu).
 * Who uses it: TimelineChapterItem and TimelineEventItem. What it calls: nothing.
 */
import type { ReactNode } from 'react';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the row needs. */
export interface TimelineRowProps {
  /** The kind, said in words on the row's first line. */
  kind: 'event' | 'chapter';
  /** The date as the writer wrote it ("Spring 2055"); may be empty. */
  date: string;
  /** The number that places it on the timeline. */
  sortValue: number | null;
  /** The title, the meta line and, while editing, the fields. */
  children: ReactNode;
  /** What sits at the end of the row, such as the More menu. */
  end?: ReactNode;
}

/**
 * Renders the row as a list item.
 *
 * @returns the <li> with the date column, the text and the end
 */
export function TimelineRow({ kind, date, sortValue, children, end }: TimelineRowProps) {
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
      className="flex items-start gap-4 border-t border-hairline py-3"
    >
      <p className="m-0 w-24 flex-none break-words">
        {date !== '' && <b className="block type-label font-semibold text-ink-heading">{date}</b>}
        {sortText !== null && (
          <span className="block type-meta text-ink-muted">
            {t('storyline.timeline.sortLine', { value: sortText })}
          </span>
        )}
      </p>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="m-0 type-meta font-semibold text-ink">{t(`storyline.timeline.${kind}`)}</p>
        {children}
      </div>
      {end}
    </li>
  );
}
