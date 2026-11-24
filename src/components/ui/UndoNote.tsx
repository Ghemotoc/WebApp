/**
 * UndoNote: the small note at the bottom of the screen that says what was just removed, with an
 * Undo button (design books item 14, "Undo").
 *
 * Look: the one box surface (box-surface, 16 px corners, the drop shadow), one line of 16 px text
 * and a quiet Undo button, centred at the bottom; on a phone it sits above the tab bar. Its
 * aria-live="polite" holder is always in the page (drawn straight into <body> through a portal,
 * so it never sits inside another screen's box), so a screen reader hears each new message.
 * Timing: it goes after `seconds`, but waits while the pointer is over it or the focus is in it,
 * so nobody loses Undo while reaching for it (WCAG 2.2.1). After a failed Undo it stays for the
 * same time with the failure line and no button.
 * Who uses it: UndoProvider (src/lib/undo/UndoProvider.tsx). What it calls: nothing.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Button } from './Button';

/** What the note needs. */
export interface UndoNoteProps {
  /** What just happened, or null when there is no note. */
  message: string | null;
  state: 'offering' | 'undoing' | 'failed';
  seconds: number;
  onUndo: () => void;
  /** The time ran out. */
  onDone: () => void;
}

/**
 * Counts the note's time down, holding while it is paused.
 *
 * @param isRunning - false while hovered or focused, or when there is no note
 * @param seconds - the time it shows
 * @param onDone - called once the time ran out
 */
function useCountdown(isRunning: boolean, seconds: number, onDone: () => void) {
  const [millisecondsLeft, setMillisecondsLeft] = useState(seconds * 1000);
  useEffect(() => {
    if (!isRunning) return undefined;
    // Tick every quarter second; the time left survives a pause.
    const startedAt = Date.now();
    const leftAtStart = millisecondsLeft;
    const timer = window.setInterval(() => {
      const left = leftAtStart - (Date.now() - startedAt);
      setMillisecondsLeft(left);
      if (left <= 0) onDone();
    }, 250);
    return () => window.clearInterval(timer);
    // Restart only when the note is paused or resumed, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);
}

/**
 * Pauses the countdown while the pointer is over the box or the focus is inside it.
 *
 * @param box - the note's box
 * @param setIsPaused - turns the pause on and off
 * @param isShown - the listeners are added again whenever a new note shows
 */
function usePauseWhileReached(
  box: RefObject<HTMLDivElement | null>,
  setIsPaused: (isPaused: boolean) => void,
  isShown: boolean,
) {
  useEffect(() => {
    const element = box.current;
    if (element === null) return undefined;
    // Plain DOM listeners: the box itself is not a control, only a place to rest the pointer.
    const pause = () => setIsPaused(true);
    const resume = () => setIsPaused(false);
    element.addEventListener('mouseenter', pause);
    element.addEventListener('mouseleave', resume);
    element.addEventListener('focusin', pause);
    element.addEventListener('focusout', resume);
    return () => {
      element.removeEventListener('mouseenter', pause);
      element.removeEventListener('mouseleave', resume);
      element.removeEventListener('focusin', pause);
      element.removeEventListener('focusout', resume);
    };
  }, [box, setIsPaused, isShown]);
}

/**
 * Renders the note (an empty status region while there is none).
 *
 * @returns the bottom note
 */
export function UndoNote({ message, state, seconds, onUndo, onDone }: UndoNoteProps) {
  const { t } = useTranslation('common');
  const [isPaused, setIsPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  usePauseWhileReached(box, setIsPaused, message !== null);
  useCountdown(message !== null && !isPaused && state !== 'undoing', seconds, onDone);
  // A live region rather than role="status": the page's own status lines keep that role.
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(112px+env(safe-area-inset-bottom))] z-50 flex justify-center md:bottom-6"
    >
      {message !== null && (
        <div
          ref={box}
          className="box-surface pointer-events-auto flex max-w-[560px] flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-surface px-4 py-2 type-body text-ink shadow-lg"
        >
          <span>{state === 'failed' ? t('undo.failed') : message}</span>
          {state !== 'failed' && (
            <Button variant="secondary" disabled={state === 'undoing'} onClick={onUndo}>
              {t('undo.undo')}
            </Button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
