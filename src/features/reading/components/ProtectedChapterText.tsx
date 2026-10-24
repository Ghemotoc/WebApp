/**
 * ProtectedChapterText: the chapter text with right-click, copy, cut and dragging turned off
 * (story S1-E4-06a; decided 16 Oct 2026, late evening, Q35: right-click and copy off on the web).
 *
 * What it does: on the chapter text only, the browser's context menu, copying, cutting and
 * dragging text out are prevented. Everything else on the page (the title, the bar, the notice)
 * copies as usual.
 * What it deliberately doesn't do: it doesn't set `user-select: none`. Readers can still select
 * text (to keep their place, or to use the browser's find), screen readers still read and move
 * through it, and zoom and text size are untouched (S1-E4-06 criterion; WCAG 2.2). This makes
 * copying harder; it can't stop screenshots, and the notice under the chapter says so (Q9: never
 * promise "can't be copied").
 * Who uses it: ChapterReaderPage. What it calls: ChapterText.
 */
import { useEffect, useRef } from 'react';

import { ChapterText } from './ChapterText';

/** The browser events this turns off on the chapter text. */
const blockedEvents = ['contextmenu', 'copy', 'cut', 'dragstart'] as const;

/** What the wrapper needs: the same as ChapterText. */
export interface ProtectedChapterTextProps {
  markdown: string;
  language: string;
  className?: string;
}

/** Stops the browser's own handling of the event (the menu, the copy, the cut or the drag). */
function preventDefault(event: Event) {
  event.preventDefault();
}

/**
 * Renders the protected text.
 *
 * @returns the chapter text inside an element that stops the four events
 */
export function ProtectedChapterText({ markdown, language, className }: ProtectedChapterTextProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Native listeners rather than JSX handlers: they only cancel the browser's defaults and add
  // nothing to click or focus, so the wrapper stays a plain, non-interactive element.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper === null) return;
    for (const eventName of blockedEvents) wrapper.addEventListener(eventName, preventDefault);
    return () => {
      for (const eventName of blockedEvents) wrapper.removeEventListener(eventName, preventDefault);
    };
  }, []);

  return (
    <div ref={wrapperRef} data-protected-text="">
      <ChapterText markdown={markdown} language={language} className={className} />
    </div>
  );
}
