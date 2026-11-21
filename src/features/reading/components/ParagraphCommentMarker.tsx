/**
 * ParagraphCommentMarker: a paragraph's comment count, and its thread once open (story S1-E6-06;
 * the simplified design, bundle CALM-5, design handover Step 4, "Comments on a paragraph",
 * points 1 to 3; boards New-Reader and New-PhoneReader).
 *
 * Where it sits (index.css, .tmc-paragraph-marker):
 *   - from 1024 px in the paper's left margin, beside the paragraph's first line: the comment
 *     mark and the number in the accent colour, with no border;
 *   - below 1024 px at the paragraph's top right corner, as a small 28 px white pill with a soft
 *     shadow, as in the app today, with a 44 px touch area round it.
 * Open, it takes the tint (aria-expanded) and the paragraph is tinted too (a 9% wash of the
 * thread colour, .tmc-paragraph-row--open). On a narrow screen, opening first scrolls the
 * paragraph to just under the chapter bar, so it stays in sight above the sheet.
 * A paragraph without comments keeps a quiet plus in the same place, named "Comment on this
 * paragraph", so anyone can start a thread. While the writer has paused new comments (bundle
 * CALM-8), a count still opens its thread for reading, but a paragraph without comments has
 * nothing to open. Its name says the count ("3 comments on this paragraph").
 * Who uses it: ChapterText draws it beside each paragraph when the reader passes it in
 * (paragraphAddon). What it reads: ParagraphCommentsContext (the counts and which thread is
 * open). What it calls: LazyParagraphThread, with the paragraph's opening words for its head.
 */
import { useContext, useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { runningPauseEnd } from '@/lib/comment-pause';
import { cn } from '@/lib/utils';

import { useIsWideReader } from '../hooks/useIsWideReader';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

import { LazyParagraphThread } from './LazyParagraphThread';
import { CommentIcon } from './ReaderIcons';

/** How many words of the paragraph the thread's head shows before the ellipsis. */
const OPENING_WORD_COUNT = 14;

/** The plus on a paragraph without comments, 12 px. */
function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The paragraph's opening words (handover Step 4, point 4): the first few, ending in an ellipsis
 * when the paragraph goes on; a short paragraph shows whole.
 *
 * @param row - the paragraph's row, which holds the paragraph and the marker
 * @returns the words, or an empty line when there is no paragraph
 */
function openingWordsOf(row: Element | null): string {
  const paragraph = row?.querySelector(':scope > p') ?? null;
  const words = (paragraph?.textContent ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= OPENING_WORD_COUNT) return words.join(' ');
  return `${words.slice(0, OPENING_WORD_COUNT).join(' ')}…`;
}

/**
 * Tints the open paragraph (handover Step 4, point 3) and, while open, reads its opening words.
 * The row belongs to ChapterText, so the class is set on it here rather than through React.
 *
 * @param buttonRef - the marker, inside the row
 * @param isOpen - its thread is open
 * @returns the opening words while open
 */
function useOpenParagraph(buttonRef: RefObject<HTMLButtonElement | null>, isOpen: boolean): string {
  const [words, setWords] = useState('');
  useEffect(() => {
    const row = buttonRef.current?.parentElement ?? null;
    if (row === null) return;
    row.classList.toggle('tmc-paragraph-row--open', isOpen);
    if (isOpen) setWords(openingWordsOf(row));
    return () => row.classList.remove('tmc-paragraph-row--open');
  }, [buttonRef, isOpen]);
  return words;
}

/** What the button needs. */
interface MarkerButtonProps {
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** The paragraph's comments. */
  count: number;
  isOpen: boolean;
  /** The open thread's element ID, which aria-controls names. */
  threadId: string;
  onClick: () => void;
}

/**
 * The count, or the quiet plus on a paragraph without comments. Its name says the count.
 *
 * @returns the button
 */
function MarkerButton({ buttonRef, count, isOpen, threadId, onClick }: MarkerButtonProps) {
  const { t } = useTranslation('reading');
  const name =
    count === 0
      ? t('reader.paragraphComments.add')
      : t('reader.paragraphComments.count', { count });
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={isOpen}
      aria-controls={isOpen ? threadId : undefined}
      aria-label={name}
      onClick={onClick}
      className={cn('tmc-paragraph-marker', count === 0 && 'tmc-paragraph-marker--add')}
    >
      <CommentIcon size={14} />
      {count === 0 ? <PlusIcon /> : <span aria-hidden="true">{count}</span>}
    </button>
  );
}

/**
 * Renders the marker for one paragraph.
 *
 * @param props.block - the paragraph's number, from 1 (src/lib/chapter-blocks.ts)
 * @returns the button and, when open, the thread; nothing outside the reader
 */
export function ParagraphCommentMarker({ block }: { block: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const comments = useContext(ParagraphCommentsContext);
  const isWide = useIsWideReader();
  const isOpen = comments !== null && comments.openPlace === block;
  const openingWords = useOpenParagraph(buttonRef, isOpen);
  if (comments === null) return null;
  const count = comments.counts.byParagraph[block] ?? 0;
  const threadId = `paragraph-thread-${block}`;
  // CALM-8: during a pause there is nothing to open on a paragraph without comments.
  const isPaused = runningPauseEnd(comments.counts.commentsPausedUntil, new Date()) !== null;
  if (isPaused && count === 0 && !isOpen) return null;

  /** Shuts the thread and gives focus back to the marker. */
  function close() {
    comments?.setOpenPlace(null);
    buttonRef.current?.focus();
  }

  /** Opens or closes; on a narrow screen the paragraph first moves to just under the bar. */
  function toggle() {
    if (isOpen) {
      comments?.setOpenPlace(null);
      return;
    }
    if (!isWide) buttonRef.current?.parentElement?.scrollIntoView({ block: 'start' });
    comments?.setOpenPlace(block);
  }

  return (
    <>
      <MarkerButton
        buttonRef={buttonRef}
        count={count}
        isOpen={isOpen}
        threadId={threadId}
        onClick={toggle}
      />
      {isOpen && (
        <LazyParagraphThread
          id={threadId}
          address={comments.address}
          place={block}
          openingWords={openingWords}
          onClose={close}
        />
      )}
    </>
  );
}
