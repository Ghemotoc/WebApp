/**
 * LanguageSwitchNote: "You stay on chapter 1. Your choice is remembered for this story.", shown
 * above the paper right after a reader changed language with "Read in" (BOOKS B07, user story
 * 2.7; board B07).
 *
 * It also brings back the paragraph the reader was on (lib/languageSwitchPlace.ts): once the new
 * text is drawn, that paragraph is put at the top of the screen, under the bars, at once. The note is
 * an information note (role="status", the info tint), so a screen reader hears it without losing its place.
 * It is fetched only after a change of language, so its text (the editions namespace) never
 * weighs on the reader's first download (S1-E4-01b).
 * Who uses it: ChapterReading, lazily, when languageSwitchFrom() finds a change in the
 * navigation's state.
 */
import { useEffect, type CSSProperties } from 'react';

import { blockAtOrBefore } from '../lib/languageSwitchPlace';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/** How many animation frames to wait for the text before giving up (about two seconds). */
const mostFramesToWait = 120;

/** How many frames in a row the paragraph must stay in place before the job is done. */
const framesToSettle = 10;

/** How far, in pixels, the paragraph may sit from its place and still count as there. */
const closeEnough = 4;

/** Space left above the paragraph for the bars at the top of the screen. */
const spaceForBars = 136;

/**
 * Works out where the page should be scrolled so the paragraph sits under the bars.
 *
 * @param paragraph - the paragraph to bring back
 * @returns the page's scroll position, in pixels
 */
function placeFor(paragraph: HTMLElement): number {
  const wanted = paragraph.getBoundingClientRect().top + window.scrollY - spaceForBars;
  // Near the end of a chapter the page can't scroll that far: its last screen is the closest.
  const furthest = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(wanted, furthest));
}

/** What a reader does to scroll the page themselves. */
const readerScrollEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Scrolls to the paragraph once it is drawn, then keeps it there while the page settles.
 *
 * The scroll is instant, not smooth: this puts the reader back where they were, like the
 * browser's own back button, and a smooth scroll can be cut short by anything else that moves
 * the page in the first moments (the rest of the chapter, the comments and the bars still
 * drawing). For a few frames afterwards the paragraph is checked again and put back if the
 * page moved under it (CI, 24 Nov 2026: the reader sometimes stayed at the top of the chapter).
 * The moment the reader scrolls, taps or presses a key, the page is theirs and this stops.
 *
 * @param block - the paragraph's number, or null to stay at the top
 */
function useBackToParagraph(block: number | null) {
  useEffect(() => {
    if (block === null) return undefined;
    let framesLeft = mostFramesToWait;
    let framesInPlace = 0;
    let frame = 0;
    function keepParagraphInPlace() {
      if (block === null) return;
      framesLeft -= 1;
      const paragraph = blockAtOrBefore(block);
      // The new text may still be drawing: wait for it.
      if (paragraph === null) {
        if (framesLeft > 0) frame = requestAnimationFrame(keepParagraphInPlace);
        return;
      }
      // Put the paragraph under the bars, unless it is already there.
      const target = placeFor(paragraph);
      if (Math.abs(window.scrollY - target) > closeEnough) {
        window.scrollTo({ top: target, behavior: 'instant' });
        framesInPlace = 0;
      } else {
        framesInPlace += 1;
      }
      // Done once it has stayed put for a few frames, or the page can't scroll that far.
      if (framesInPlace < framesToSettle && framesLeft > 0) {
        frame = requestAnimationFrame(keepParagraphInPlace);
      }
    }
    // The reader takes over as soon as they move the page themselves.
    function stop() {
      cancelAnimationFrame(frame);
    }
    for (const eventName of readerScrollEvents) {
      window.addEventListener(eventName, stop, { once: true, passive: true });
    }
    frame = requestAnimationFrame(keepParagraphInPlace);
    return () => {
      stop();
      for (const eventName of readerScrollEvents) window.removeEventListener(eventName, stop);
    };
  }, [block]);
}

/** What the note needs. */
export interface LanguageSwitchNoteProps {
  /** The chapter's number, for "You stay on chapter n." */
  chapterNumber: number;
  /** The paragraph to go back to, or null for the top of the chapter. */
  block: number | null;
  /** The paper's width, so the note lines up with it. */
  style: CSSProperties;
}

/**
 * Renders the note and takes the reader back to their paragraph.
 *
 * @returns the information notice
 */
export function LanguageSwitchNote({ chapterNumber, block, style }: LanguageSwitchNoteProps) {
  const { t } = useEditionsTranslation();
  useBackToParagraph(block);
  return (
    <div className="tmc-reading-width mx-auto mb-6 w-full" style={style}>
      {/* Board B07: the information tint with the field corner (12 px), not the card's. */}
      <div
        role="status"
        className="rounded-field border border-(--info-border) bg-(--info-bg) p-4 type-body text-(--info-text)"
      >
        {t('staysOnChapter', { number: chapterNumber })}
      </div>
    </div>
  );
}

export default LanguageSwitchNote;
