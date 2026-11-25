/**
 * SelectionComment: the Comment button for words a reader selects in the chapter text
 * (READER-SELECT; board B12-ReaderSelect, Robert's pick "Select any text, then Comment", 24 Nov 2026).
 *
 * - With a mouse, a pill (40 px tall, the main button colour) floats 8 px above the start of the
 *   selection, 150 ms after the mouse lets go, so it never jumps about while the reader drags.
 * - On a touch screen, where the phone's own menu sits above the words, a bar at the foot holds
 *   the chosen words in italic and a Comment button (board B12, frames 2 and 3).
 * - Over 1,000 characters the button turns grey and reads "Select less to comment" (board B14, 8).
 * The selection is cut to the chapter text and belongs to the stanza it starts in (board B14, 7;
 * lib/textParts.ts). Pressing Comment opens that stanza's panel at the words (openPanel) and
 * clears the selection. Nothing shows while the writer has comments off or paused.
 * The button is placed in the DOM right after the stanza the selection ends in (its
 * data-selection-slot), so with caret browsing it is the next Tab stop after the words (board B14).
 * Who uses it: CommentSelectionWatcher, which fetches this file on the first selection. What it
 * reads: ParagraphCommentsContext. What it calls: chosenWordsOf and openPanel.
 */
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { quoteForReading } from '@/features/comments/lib/commentParts';
import { runningPauseEnd } from '@/lib/comment-pause';
import { cn } from '@/lib/utils';

import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';
import { chosenWordsOf, longestChosenWords, type ChosenWords } from '../lib/textParts';

/** How long the pill waits after the mouse lets go (board B12: 150 ms). */
const PILL_DELAY_MS = 150;
/** The pill's height and its gap above the words (board B12: 40 px and 8 px). */
const PILL_HEIGHT = 40;
const PILL_GAP = 8;

/** What is selected, and where the pill goes. */
interface Chosen {
  words: ChosenWords;
  /** The pill's top-left corner in the window. */
  top: number;
  left: number;
}

/**
 * Reads the page's selection as chosen words, with the pill's place above where it starts.
 *
 * @returns the chosen words and the pill's place, or null when nothing in the text is selected
 */
function readSelection(): Chosen | null {
  const root = document.querySelector('.tmc-chapter-text');
  const selection = window.getSelection();
  if (root === null || selection === null) return null;
  // A selection inside an open panel is the panel's own text, not the story's.
  const anchor = selection.anchorNode?.parentElement ?? null;
  if (anchor?.closest('[data-paragraph-thread]') != null) return null;
  const words = chosenWordsOf(selection, root);
  if (words === null) return null;
  return { words, ...pillPlace(selection) };
}

/**
 * Where the pill goes: above the first line of the selection, never off the window's edges.
 *
 * @param selection - the page's selection, not empty
 * @returns the pill's top-left corner in the window
 */
function pillPlace(selection: Selection): { top: number; left: number } {
  const firstBox = selection.getRangeAt(0).getClientRects()[0];
  const highest = window.innerHeight - PILL_HEIGHT - PILL_GAP;
  const top = Math.min(highest, Math.max(PILL_GAP, (firstBox?.top ?? 0) - PILL_HEIGHT - PILL_GAP));
  const left = Math.max(PILL_GAP, firstBox?.left ?? 0);
  return { top, left };
}

/**
 * Whether the reader is on a touch screen (a coarse pointer), where the bar replaces the pill.
 *
 * @returns true on a phone or tablet
 */
function isTouchScreen(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Follows the page's selection: right away on a touch screen, 150 ms after the mouse or a key
 * lets go otherwise, and away as soon as the selection goes.
 *
 * @returns what is chosen now, or null
 */
function useChosenWords(): Chosen | null {
  const [chosen, setChosen] = useState<Chosen | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    /** Reads the selection after the short wait. */
    function readSoon() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChosen(readSelection()), PILL_DELAY_MS);
    }
    /** A selection that goes takes the button with it; a touch selection shows the bar at once. */
    function onSelectionChange() {
      const selection = window.getSelection();
      if (selection === null || selection.isCollapsed) setChosen(null);
      else if (isTouchScreen()) readSoon();
    }
    /** Scrolling moves the words, so the pill follows them. */
    function onScroll() {
      setChosen((current) => (current === null ? null : readSelection()));
    }
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', readSoon);
    document.addEventListener('keyup', readSoon);
    window.addEventListener('scroll', onScroll, { passive: true });
    // This file arrives after the first selection, often after the mouse let go: read it once now.
    readSoon();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', readSoon);
      document.removeEventListener('keyup', readSoon);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return chosen;
}

/**
 * Puts a fixed element at a place in the window. The pill sits in its stanza's slot, and an
 * element around the text may hold a transform, which makes "fixed" count from that element
 * instead of the window; so the pill is placed, measured, and moved by the difference.
 *
 * @param place - where its top-left corner should be, or undefined to leave it alone
 * @returns the ref for the element
 */
function useFixedPlace(place: { top: number; left: number } | undefined) {
  const elementRef = useRef<HTMLButtonElement>(null);
  const top = place?.top;
  const left = place?.left;
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element === null || top === undefined || left === undefined) return;
    // Step 1: place it as if "fixed" counted from the window.
    element.style.top = `${String(top)}px`;
    element.style.left = `${String(left)}px`;
    // Step 2: measure where it landed, and move it by the difference.
    const box = element.getBoundingClientRect();
    element.style.top = `${String(top + top - box.top)}px`;
    element.style.left = `${String(left + left - box.left)}px`;
  }, [top, left]);
  return elementRef;
}

/**
 * The Comment button itself, or the grey "Select less to comment" over 1,000 characters.
 *
 * @param props.words - the chosen words
 * @param props.className - the pill's or the bar's look
 * @param props.place - the pill's place in the window, when it floats
 * @param props.onComment - opens the panel at the words
 * @returns the button
 */
function CommentButton(props: {
  words: ChosenWords;
  className: string;
  place?: { top: number; left: number };
  onComment: () => void;
}) {
  const { t } = useTranslation('reading');
  const isTooLong = props.words.length > longestChosenWords;
  const buttonRef = useFixedPlace(props.place);
  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(props.className, isTooLong && 'is-off')}
      aria-disabled={isTooLong || undefined}
      title={
        isTooLong
          ? t('reader.partComments.tooLongHint', {
              limit: longestChosenWords,
              count: props.words.length,
            })
          : undefined
      }
      // Keep the selection: a press on the button must not clear what the reader chose.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!isTooLong) props.onComment();
      }}
    >
      {!isTooLong && <ActionIcon name="comment" size={16} />}
      {isTooLong ? t('reader.partComments.tooLong') : t('reader.partComments.comment')}
    </button>
  );
}

/**
 * Renders the pill or the bar while words in the chapter text are selected.
 *
 * @returns the button in its place, or nothing
 */
export function SelectionComment() {
  const { t } = useTranslation('reading');
  const comments = useContext(ParagraphCommentsContext);
  const chosen = useChosenWords();
  const isTouch = chosen !== null && isTouchScreen();
  // The share bar moves up while the comment bar sits at the foot (src/styles/index.css).
  useEffect(() => {
    if (!isTouch) return undefined;
    document.documentElement.dataset.commentBar = '';
    return () => {
      delete document.documentElement.dataset.commentBar;
    };
  }, [isTouch]);
  if (comments === null || chosen === null || !comments.counts.commentsEnabled) return null;
  if (runningPauseEnd(comments.counts.commentsPausedUntil, new Date()) !== null) return null;
  const { quote } = chosen.words;
  /** Opens the stanza's panel at the words and lets the selection go. */
  function onComment() {
    comments?.openPanel(quote.startBlock, quote);
    window.getSelection()?.removeAllRanges();
  }
  if (isTouch) {
    // On the body, so the foot of the window is the bar's place whatever holds the text.
    return createPortal(
      <div className="tmc-select-bar" role="region" aria-label={t('reader.partComments.barLabel')}>
        <span className="tmc-select-bar__words">“{quoteForReading(quote.text)}”</span>
        <CommentButton
          words={chosen.words}
          className="tmc-select-bar__button"
          onComment={onComment}
        />
      </div>,
      document.body,
    );
  }
  // After the stanza the selection ends in, so it is the next Tab stop after the words.
  const slot =
    document.querySelector(`[data-selection-slot="${String(quote.endBlock)}"]`) ?? document.body;
  return createPortal(
    <CommentButton
      words={chosen.words}
      className="tmc-select-pill"
      place={{ top: chosen.top, left: chosen.left }}
      onComment={onComment}
    />,
    slot,
  );
}
