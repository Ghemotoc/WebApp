/**
 * PartButtons: the underlined parts of one stanza (or paragraph) as buttons, for keyboards and
 * screen readers (READER-SELECT; board B14, How it acts: "Screen readers hear an underlined part
 * as a button: 4 comments on: the knife coming towards her heart…").
 *
 * The underline itself is painted by the browser over the words (PartHighlights), which a screen
 * reader can't see and Tab can't reach, so each part that starts in this stanza also gets a real
 * button right after it. It is visually hidden until it has focus (then it shows as a small pill
 * under the stanza), so the page looks as drawn. Pressing it opens the stanza's panel at that
 * part's group, as clicking the words does.
 * Who uses it: ParagraphCommentMarker, inside each stanza's row. What it reads:
 * ParagraphCommentsContext (the parts, and openPanel). What it calls: nothing else.
 */
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { quoteOfPart, shortQuote } from '@/features/comments/lib/commentParts';

import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

/**
 * Renders the buttons for the parts that start in one stanza.
 *
 * @param props.block - the stanza's number, from 1
 * @returns the buttons, or nothing when the stanza has no underlined parts
 */
export function PartButtons({ block }: { block: number }) {
  const { t } = useTranslation('reading');
  const comments = useContext(ParagraphCommentsContext);
  const parts = (comments?.counts.parts ?? []).filter((part) => part.block === block);
  if (comments === null || parts.length === 0) return null;
  return (
    <span className="tmc-part-buttons">
      {parts.map((part) => {
        const quote = quoteOfPart(part);
        return (
          <button
            key={`${String(part.startOffset)}-${String(part.endBlock)}-${String(part.endOffset)}`}
            type="button"
            className="tmc-part-button"
            onClick={() => comments.openPanel(block, quote)}
          >
            {t('reader.partComments.button', { count: part.count, words: shortQuote(part.quote) })}
          </button>
        );
      })}
    </span>
  );
}
