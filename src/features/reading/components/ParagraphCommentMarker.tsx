/**
 * ParagraphCommentMarker: the speech-bubble button beside a paragraph, and its thread once open
 * (story S1-E6-06; board 3.5).
 *
 * Board values: a 44 px tall pill (at least 44 px wide) in the column beside the paragraph, with
 * a speech-bubble icon and the count. With comments: a #8E7B99 border on white, plum text. With
 * none: a dashed border, no fill and a plus, named "Comment on this paragraph". Open: filled
 * plum with light text. Its name says the count ("3 comments on this paragraph") and
 * aria-expanded says whether the thread is open; the thread spans the row under the paragraph.
 * Plain SVG icons (under 18 px; DoD: no doodles on the chapter reader).
 * Who uses it: ChapterText draws it beside each paragraph when the reader passes it in
 * (paragraphAddon). What it reads: ParagraphCommentsContext (the counts and which thread is
 * open). What it calls: LazyParagraphThread.
 */
import { useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

import { LazyParagraphThread } from './LazyParagraphThread';

/** The speech bubble, 16 px, in the text colour. */
function SpeechBubbleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path
        d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The plus on a paragraph without comments, 12 px. */
function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The marker's look for its state (board 3.5).
 *
 * @param isOpen - its thread is open
 * @param count - its comments
 * @returns the classes
 */
function markerLook(isOpen: boolean, count: number): string {
  if (isOpen) return 'border-solid border-heading bg-heading text-on-primary';
  if (count > 0) return 'border-solid border-control-border bg-surface text-heading hover:bg-tint';
  return 'border-dashed border-control-border bg-transparent text-body hover:bg-tint';
}

/**
 * Renders the marker for one paragraph.
 *
 * @param props.block - the paragraph's number, from 1 (src/lib/chapter-blocks.ts)
 * @returns the button and, when open, the thread; nothing outside the reader
 */
export function ParagraphCommentMarker({ block }: { block: number }) {
  const { t } = useTranslation('reading');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const comments = useContext(ParagraphCommentsContext);
  if (comments === null) return null;
  const count = comments.counts.byParagraph[block] ?? 0;
  const isOpen = comments.openPlace === block;
  const threadId = `paragraph-thread-${block}`;

  /** Shuts the thread and gives focus back to the marker. */
  function close() {
    comments?.setOpenPlace(null);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? threadId : undefined}
        aria-label={
          count === 0
            ? t('reader.paragraphComments.add')
            : t('reader.paragraphComments.count', { count })
        }
        onClick={() => comments.setOpenPlace(isOpen ? null : block)}
        className={cn(
          'tmc-paragraph-marker inline-flex h-11 min-w-11 items-center justify-center gap-1.5 justify-self-end rounded-full border px-2.5 font-body text-sm leading-none font-semibold',
          markerLook(isOpen, count),
        )}
      >
        <SpeechBubbleIcon />
        {count === 0 ? <PlusIcon /> : <span aria-hidden="true">{count}</span>}
      </button>
      {isOpen && (
        <LazyParagraphThread
          id={threadId}
          address={comments.address}
          place={block}
          onClose={close}
        />
      )}
    </>
  );
}
