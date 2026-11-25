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

/** How long, in milliseconds, to keep at it before giving up, whatever happens. */
const mostTimeToTry = 4000;

/**
 * How long, in milliseconds, the paragraph is held in place after it first appears. The rest of
 * the page (the comments, the bars, the parts under the text) can still be drawing and push it
 * about well after the text itself is there, above all on a slow computer.
 */
const timeToHold = 1500;

/** How many frames in a row the paragraph must stay in place, after that, before the job is done. */
const framesToSettle = 10;

/** How far, in pixels, the paragraph may sit from its place and still count as there. */
const closeEnough = 4;

/** Space left above the paragraph for the bars at the top of the screen. */
const spaceForBars = 136;

/** Where the page should be scrolled, and whether the page is tall enough to get there. */
interface Place {
  /** The page's scroll position, in pixels. */
  top: number;
  /** False while the page is still too short to put the paragraph under the bars. */
  isReachable: boolean;
}

/**
 * Works out where the page should be scrolled so the paragraph sits under the bars.
 *
 * @param paragraph - the paragraph to bring back
 * @returns the scroll position, and whether the page can reach it yet
 */
function placeFor(paragraph: HTMLElement): Place {
  const wanted = paragraph.getBoundingClientRect().top + window.scrollY - spaceForBars;
  // While the rest of the page is still drawing, it can be too short to scroll that far: the
  // last screen is the closest for now (and at the end of a chapter it stays the closest).
  const furthest = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return {
    top: Math.max(0, Math.min(wanted, furthest)),
    isReachable: wanted <= furthest + closeEnough,
  };
}

/** What a reader does to scroll the page themselves. */
const readerScrollEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Scrolls to the paragraph once it is drawn, then keeps it there while the page settles.
 *
 * The scroll is instant, not smooth: this puts the reader back where they were, like the
 * browser's own back button, and a smooth scroll can be cut short by anything else that moves
 * the page in the first moments (the rest of the chapter, the comments and the bars still
 * drawing). For a second and a half afterwards (timeToHold) the paragraph is checked on every
 * frame and put back if the page moved under it (CI, 24 Nov 2026: the reader sometimes stayed
 * near the top of the chapter).
 * The moment the reader scrolls, taps or presses a key, the page is theirs and this stops.
 *
 * @param block - the paragraph's number, or null to stay at the top
 */
function useBackToParagraph(block: number | null) {
  useEffect(() => {
    if (block === null) return undefined;
    const startedAt = performance.now();
    let foundAt: number | null = null;
    let framesInPlace = 0;
    let frame = 0;
    /** One frame of the job: finds the paragraph, puts it back if it moved, and goes on or stops. */
    function keepParagraphInPlace() {
      if (block === null) return;
      const now = performance.now();
      const paragraph = blockAtOrBefore(block);
      // Step 1: the new text may still be drawing, so wait for it.
      if (paragraph === null) {
        if (now - startedAt < mostTimeToTry) frame = requestAnimationFrame(keepParagraphInPlace);
        return;
      }
      foundAt ??= now;
      // Step 2: put the paragraph under the bars, unless it is already there. While the page is
      // still too short to reach it, it doesn't count as in place: what is drawn below makes room.
      const place = placeFor(paragraph);
      if (Math.abs(window.scrollY - place.top) > closeEnough) {
        window.scrollTo({ top: place.top, behavior: 'instant' });
        framesInPlace = 0;
      } else if (place.isReachable) {
        framesInPlace += 1;
      }
      // Step 3: done once it has been held for a while and has then stayed put for a few frames
      // (CI, 24 Nov 2026: the rest of the page moved the reader after an earlier, shorter job).
      const isSettled = now - foundAt >= timeToHold && framesInPlace >= framesToSettle;
      if (!isSettled && now - startedAt < mostTimeToTry) {
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
