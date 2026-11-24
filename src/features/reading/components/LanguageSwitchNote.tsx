/**
 * LanguageSwitchNote: "You stay on chapter 1. Your choice is remembered for this story.", shown
 * above the paper right after a reader changed language with "Read in" (BOOKS B07, user story
 * 2.7; board B07).
 *
 * It also brings back the paragraph the reader was on (lib/languageSwitchPlace.ts): once the new
 * text is drawn, that paragraph is scrolled to the top of the screen, under the bars. The note is
 * an information note (role="status", the info tint), so a screen reader hears it without losing its place.
 * It is fetched only after a change of language, so its text (the editions namespace) never
 * weighs on the reader's first download (S1-E4-01b).
 * Who uses it: ChapterReading, lazily, when languageSwitchFrom() finds a change in the
 * navigation's state.
 */
import { useEffect, type CSSProperties } from 'react';

import { wantsLessMotion } from '@/lib/motion';

import { blockAtOrBefore } from '../lib/languageSwitchPlace';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/** How many animation frames to wait for the text before giving up (about two seconds). */
const mostFramesToWait = 120;

/** Space left above the paragraph for the bars at the top of the screen. */
const spaceForBars = 136;

/**
 * Scrolls to the paragraph once it is drawn, one time.
 *
 * @param block - the paragraph's number, or null to stay at the top
 */
function useBackToParagraph(block: number | null) {
  useEffect(() => {
    if (block === null) return undefined;
    let framesLeft = mostFramesToWait;
    let frame = 0;
    function goToParagraph() {
      if (block === null) return;
      const paragraph = blockAtOrBefore(block);
      if (paragraph !== null) {
        const top = paragraph.getBoundingClientRect().top + window.scrollY - spaceForBars;
        window.scrollTo({ top, behavior: wantsLessMotion() ? 'auto' : 'smooth' });
        return;
      }
      // The new text may still be drawing; try again on the next frame, for a while.
      framesLeft -= 1;
      if (framesLeft > 0) frame = requestAnimationFrame(goToParagraph);
    }
    frame = requestAnimationFrame(goToParagraph);
    return () => cancelAnimationFrame(frame);
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
