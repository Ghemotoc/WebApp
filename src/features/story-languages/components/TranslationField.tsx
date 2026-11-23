/**
 * TranslationField: one borderless, self-growing field on the translation's paper, the
 * translation of one paragraph of the original (CALM-9, board D09 "Translate a chapter").
 *
 * Why borderless: the board draws the translation as one whole reading paper, like the original
 * beside it, not as a stack of boxes. Each paragraph is still its own field, so the saved text
 * keeps the original's paragraphs in step (lib/paragraphs.ts). The paper shows the focus ring.
 * Who shows it: SideBySidePapers. What it calls: normaliseTypedText for Romanian letters.
 */
import { useLayoutEffect, useRef, type ChangeEvent } from 'react';

import { normaliseTypedText } from '@/lib/romanian-text';

/** What the field needs. */
export interface TranslationFieldProps {
  /** The paragraph's place, from 0; marked on the element so both sides can line up. */
  index: number;
  label: string;
  languageCode: string;
  value: string;
  onChange: (text: string) => void;
}

/**
 * Renders the field, as tall as its words.
 *
 * @returns the field inside its paragraph marker
 */
export function TranslationField({
  index,
  label,
  languageCode,
  value,
  onChange,
}: TranslationFieldProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  // Grows the field to its words after every change, so the paper reads as one text with no
  // inner scrollbars (and so the two sides line up paragraph by paragraph).
  useLayoutEffect(() => {
    const element = field.current;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  /** Corrects Romanian letters as they are typed, then keeps the words. */
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    normaliseTypedText(event.target);
    onChange(event.target.value);
  }

  return (
    <div data-paragraph={index} className="pb-4">
      <textarea
        ref={field}
        aria-label={label}
        placeholder={label}
        lang={languageCode}
        rows={2}
        value={value}
        className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-story text-[17px] leading-relaxed text-body outline-none placeholder:text-meta"
        onChange={handleChange}
      />
    </div>
  );
}
