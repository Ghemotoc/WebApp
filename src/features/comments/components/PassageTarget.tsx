/**
 * PassageTarget: the line above a stanza panel's field that says what a new comment will be on
 * (READER-SELECT; boards B13 and B14).
 *
 * Three states:
 * - the whole stanza: a "Choose lines" text button ("Choose sentences" in prose), the keyboard
 *   and screen reader way to comment on part of it (board B14, frame 9);
 * - chosen words: "Commenting on “the knife coming towards…”" and "Whole stanza instead" (board
 *   B13, frame 4);
 * - while lines are being ticked: the hint "Tab to a stanza's count, Enter, then Choose lines.
 *   Space ticks a line." and "Whole stanza instead".
 * Who uses it: ParagraphThread's foot. What it reads: ParagraphCommentsContext (poem or prose).
 * What it calls: onPicking, which turns Choose lines on, or off and back to the whole stanza.
 */
import { useContext } from 'react';

import { ParagraphCommentsContext } from '@/features/reading/lib/paragraphCommentsContext';

import type { CommentQuote } from '../api/comments';
import { shortQuote } from '../lib/commentParts';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the line needs. */
interface PassageTargetProps {
  block: number;
  quote: CommentQuote | null;
  isPicking: boolean;
  onPicking: (isPicking: boolean) => void;
}

/** The underlined text button the boards use (gh-btn--text). */
const textButton =
  'hit-target min-h-11 cursor-pointer border-0 bg-transparent p-0 type-body font-semibold text-ink underline underline-offset-4';

/**
 * Renders the line.
 *
 * @returns the button, or the words and the way back to the whole stanza
 */
export function PassageTarget({ quote, isPicking, onPicking }: PassageTargetProps) {
  const { t } = useCommentsTranslation();
  const isPoem = useContext(ParagraphCommentsContext)?.isPoem ?? false;
  const whole = t(isPoem ? 'part.wholeStanza' : 'part.wholeParagraph');
  if (!isPicking && quote === null) {
    return (
      <p className="m-0 mb-2">
        <button type="button" className={textButton} onClick={() => onPicking(true)}>
          {t(isPoem ? 'part.chooseLines' : 'part.chooseSentences')}
        </button>
      </p>
    );
  }
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <p className="m-0 type-meta text-ink-muted">
        {isPicking || quote === null
          ? t(isPoem ? 'part.pickHint' : 'part.pickHintProse')
          : t('part.commentingOn', { words: shortQuote(quote.text) })}
      </p>
      <button type="button" className={textButton} onClick={() => onPicking(false)}>
        {whole}
      </button>
    </div>
  );
}
