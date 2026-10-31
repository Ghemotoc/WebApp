/**
 * EarlierVersionComments: "3 comments on an earlier version" under the chapter text, for
 * comments left on paragraphs the writer has since changed or taken out (story S1-E6-06,
 * criterion 2). It opens their thread in the same place.
 *
 * Who uses it: ChapterReaderPage, after the text. What it reads: ParagraphCommentsContext.
 * What it calls: LazyParagraphThread with the place 'earlier'.
 */
import { useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

import { LazyParagraphThread } from './LazyParagraphThread';

/** The thread's element ID, which the button's aria-controls names. */
const threadId = 'paragraph-thread-earlier';

/**
 * Renders the button and, when open, the thread.
 *
 * @returns them, or nothing when no comment is on an earlier version
 */
export function EarlierVersionComments() {
  const { t } = useTranslation('reading');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const comments = useContext(ParagraphCommentsContext);
  if (comments === null || comments.counts.earlier === 0) return null;
  const isOpen = comments.openPlace === 'earlier';

  /** Shuts the thread and gives focus back to the button. */
  function close() {
    comments?.setOpenPlace(null);
    buttonRef.current?.focus();
  }

  return (
    <div className="mt-6 grid">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? threadId : undefined}
        onClick={() => comments.setOpenPlace(isOpen ? null : 'earlier')}
        className="inline-flex h-11 items-center self-start justify-self-start rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading hover:bg-tint"
      >
        {t('reader.paragraphComments.earlier', { count: comments.counts.earlier })}
      </button>
      {isOpen && (
        <LazyParagraphThread
          id={threadId}
          address={comments.address}
          place="earlier"
          onClose={close}
        />
      )}
    </div>
  );
}
