/**
 * ChapterContentsControl: Contents, the chapter bar's list button (user story 2.2, board B02:
 * "Kept from today's reader: Contents in the bar (the chapter list in a panel, the current
 * chapter marked)").
 *
 * A round 44 px quiet button with the line list icon, named "Contents". Like Aa it only reports
 * presses: the reader page keeps whether the list is open, so one panel is open at a time
 * (Contents, Reading settings or a paragraph's comments; useReaderTools). aria-expanded says
 * whether it is open and aria-controls names the panel while it is. The fixed id lets the panel
 * give focus back when it closes (WCAG 2.4.3).
 * Who uses it: ChapterBar. What it calls: nothing; it reports presses upwards.
 */
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { cn } from '@/lib/utils';

/** The button's id, which ChapterContentsPlace gives focus back to when the panel closes. */
export const chapterContentsButtonId = 'chapter-contents-button';

/** The panel's id, which aria-controls names while it is open. */
export const chapterContentsPanelId = 'chapter-contents-panel';

/** What the button needs. */
export interface ChapterContentsControlProps {
  /** True while the chapter list is open. */
  isOpen: boolean;
  /** Opens the list, or closes it when it is open. */
  onToggle: () => void;
}

/**
 * Renders the button.
 *
 * @returns the Contents button
 */
export function ChapterContentsControl({ isOpen, onToggle }: ChapterContentsControlProps) {
  const { t } = useTranslation('reading');
  return (
    <button
      id={chapterContentsButtonId}
      type="button"
      aria-label={t('contents.button')}
      aria-expanded={isOpen}
      aria-controls={isOpen ? chapterContentsPanelId : undefined}
      onClick={onToggle}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading',
        isOpen ? 'bg-tint' : 'hover:bg-tint',
      )}
    >
      <ActionIcon name="list" size={20} />
    </button>
  );
}
