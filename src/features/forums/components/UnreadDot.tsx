/**
 * UnreadDot: board 5.1's marker for new posts (bundle FORUMS-1, part d; story S1-E8-04).
 *
 * Board values: a 12 px circle, filled plum (the link colour) for "New posts since your last
 * visit", a hollow 2 px ring for "No new posts". The ring uses the control border colour
 * (#8E7B99) rather than the board's paler #CBBBD3, so it keeps 3:1 against the card (WCAG 1.4.11;
 * docs/board-fixes.md). The circle is hidden from screen readers and the words are said instead,
 * so the state never rests on colour alone.
 * Who uses it: ForumRow, ThreadRow and the legend on the forum index.
 */
import { cn } from '@/lib/utils';

import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * The circle alone, for the legend where the words sit beside it.
 *
 * @param props.isNew - filled when true, a ring when false
 * @returns the circle, hidden from screen readers
 */
export function UnreadCircle({ isNew }: { isNew: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-3 shrink-0 rounded-full',
        isNew ? 'bg-link' : 'border-2 border-control-border bg-transparent',
      )}
    />
  );
}

/**
 * Renders the marker.
 *
 * @param props.isNew - whether there are new posts; null for a visitor, who gets no marker
 * @returns the circle with its words for screen readers, or nothing
 */
export function UnreadDot({ isNew }: { isNew: boolean | null }) {
  const { t } = useForumsTranslation();
  if (isNew === null) return null;
  return (
    <span className="inline-flex items-center">
      <UnreadCircle isNew={isNew} />
      <span className="sr-only">{t(isNew ? 'unread.new' : 'unread.none')}</span>
    </span>
  );
}
