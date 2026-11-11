/**
 * PostFormatToolbar: the formatting buttons above a forum post's text box (bundle GAPS-16, part b;
 * story S1-E8-02; board 5.2, "Formatting": Bold, Italic, Add a link, Quote, List).
 *
 * Board values: a white strip with a fine line under it, inside the box's 20 px-rounded frame;
 * round 44 px buttons in plum with no fill, "B" in heavy type, "I" in italic and line icons for
 * the rest. Each button has its name for screen readers and as a tooltip on hover.
 * Keyboard: Ctrl+B and Ctrl+I (Cmd on a Mac) in the box are Bold and Italic (aria-keyshortcuts
 * says so). The toolbar is one Tab stop and the arrow keys, Home and End move between its
 * buttons (WAI-ARIA toolbar pattern); a press changes the text and puts the focus back in the box.
 * Who uses it: PostEditor. What it calls: lib/postFormatting.ts through the onFormat it is given.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import type { PostFormat } from '../lib/postFormatting';
import { useForumsTranslation } from '../registerForumsTranslations';

/** The buttons in board order, each with its picture. */
const buttons: { format: PostFormat; picture: ReactNode; shortcut?: string }[] = [
  {
    format: 'bold',
    picture: <span className="text-base font-extrabold">B</span>,
    shortcut: 'Control+B Meta+B',
  },
  {
    format: 'italic',
    picture: <span className="font-serif text-[17px] italic">I</span>,
    shortcut: 'Control+I Meta+I',
  },
  { format: 'link', picture: <ActionIcon name="link" size={18} /> },
  { format: 'quote', picture: <ActionIcon name="quote" size={18} /> },
  { format: 'list', picture: <ActionIcon name="list" size={18} /> },
];

/** What the toolbar needs. */
export interface PostFormatToolbarProps {
  /** The text box's id, so the toolbar says which box it formats. */
  controls: string;
  onFormat: (format: PostFormat) => void;
}

/**
 * The button the arrow key moves to.
 *
 * @param key - the key pressed
 * @param current - the button that has the focus now
 * @returns the next button's place, or null for any other key
 */
function nextPlace(key: string, current: number): number | null {
  const last = buttons.length - 1;
  if (key === 'ArrowRight') return current === last ? 0 : current + 1;
  if (key === 'ArrowLeft') return current === 0 ? last : current - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  return null;
}

/**
 * Renders the toolbar.
 *
 * @returns the strip of five buttons
 */
export function PostFormatToolbar({ controls, onFormat }: PostFormatToolbarProps) {
  const { t } = useForumsTranslation();
  // Which button the Tab key reaches (roving tabindex).
  const [focusPlace, setFocusPlace] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Moves the focus with the arrow keys, Home and End. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const place = nextPlace(event.key, focusPlace);
    if (place === null) return;
    event.preventDefault();
    setFocusPlace(place);
    buttonRefs.current[place]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label={t('editor.format.label')}
      aria-controls={controls}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-0.5 rounded-t-[20px] border-b border-control-border bg-surface px-2 py-1"
    >
      {buttons.map((button, place) => (
        <button
          key={button.format}
          ref={(element) => {
            buttonRefs.current[place] = element;
          }}
          type="button"
          tabIndex={place === focusPlace ? 0 : -1}
          aria-label={t(`editor.format.${button.format}`)}
          title={t(`editor.format.${button.format}`)}
          aria-keyshortcuts={button.shortcut}
          onFocus={() => setFocusPlace(place)}
          onClick={() => onFormat(button.format)}
          className="inline-flex size-11 items-center justify-center rounded-full text-heading hover:bg-panel"
        >
          {button.picture}
        </button>
      ))}
    </div>
  );
}
