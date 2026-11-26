/**
 * LinePicker: "Choose lines" (or "Choose sentences" in prose) in a stanza's panel, the keyboard
 * and screen reader way to comment on part of a stanza (READER-SELECT; board B14, frame 9).
 *
 * The stanza's lines become tick boxes; Space ticks one. The comment is then on the lines from
 * the first ticked to the last ticked (a line between two ticked ones is included, since a
 * comment is on one run of words). Ticking nothing means the whole stanza again.
 * Who uses it: ParagraphThread, while Choose lines is on. What it reads: the stanza's lines from
 * the page (linesOf in src/features/reading/lib/textParts.ts). What it calls: onChange with the
 * chosen words, which opens the panel at them (openPanel).
 */
import { useMemo, useState } from 'react';

import { linesOf, paragraphOf, type TextLine } from '@/features/reading/lib/textParts';

import type { CommentQuote } from '../api/comments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the picker needs. */
interface LinePickerProps {
  block: number;
  isPoem: boolean;
  /** The story's language, for the sentence rules. */
  language: string;
  /** Called with the chosen words, or null when nothing is ticked. */
  onChange: (quote: CommentQuote | null) => void;
}

/**
 * The words from the first ticked line to the last.
 *
 * @param lines - the stanza's lines
 * @param ticked - which are ticked, by position
 * @param block - the stanza's number
 * @param isPoem - lines end in a new line in a poem, sentences in a space in prose
 * @returns the quote, or null when nothing is ticked
 */
function quoteOfTicked(
  lines: TextLine[],
  ticked: ReadonlySet<number>,
  block: number,
  isPoem: boolean,
): CommentQuote | null {
  const positions = [...ticked].sort((first, second) => first - second);
  const first = positions[0];
  const last = positions[positions.length - 1];
  if (first === undefined || last === undefined) return null;
  const chosen = lines.slice(first, last + 1);
  const firstLine = chosen[0];
  const lastLine = chosen[chosen.length - 1];
  if (firstLine === undefined || lastLine === undefined) return null;
  return {
    text: chosen.map((line) => line.text).join(isPoem ? '\n' : ' '),
    startBlock: block,
    startOffset: firstLine.startOffset,
    endBlock: block,
    endOffset: lastLine.endOffset,
  };
}

/**
 * Renders the tick boxes.
 *
 * @returns the list, under its label
 */
export function LinePicker({ block, isPoem, language, onChange }: LinePickerProps) {
  const { t } = useCommentsTranslation();
  // The stanza's lines, read from the page once as the picker opens.
  const lines = useMemo(() => {
    const paragraph = paragraphOf(document, block);
    return paragraph === null ? [] : linesOf(paragraph, isPoem, language);
  }, [block, isPoem, language]);
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());

  /** Ticks or unticks one line and passes the new words on. */
  function toggle(position: number) {
    const next = new Set(ticked);
    if (next.has(position)) next.delete(position);
    else next.add(position);
    setTicked(next);
    onChange(quoteOfTicked(lines, next, block, isPoem));
  }

  return (
    <fieldset className="m-0 mt-3 border-0 p-0">
      <legend className="eyebrow mb-2">
        {t(isPoem ? 'part.pickLines' : 'part.pickSentences')}
      </legend>
      <ul className="tmc-line-picker">
        {lines.map((line, position) => (
          <li key={line.startOffset}>
            <label className="tmc-line-picker__line">
              <input
                type="checkbox"
                checked={ticked.has(position)}
                onChange={() => toggle(position)}
              />
              <span className="font-story">{line.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
