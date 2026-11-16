/**
 * ParagraphPairs: the original's paragraphs on the left, one field per paragraph on the right
 * (bundle TRANSLATE-1c; board TrEditor; Robert, 16 Nov 2026).
 *
 * What it shows: the two column headings ("Original · English", "Translation · Română · 2 of 4
 * paragraphs"), then one row per paragraph: its number and the original's words, and the field
 * "Translate paragraph n". On a phone the field sits under its paragraph. A fine line separates
 * the rows (DoD design rules).
 * Who shows it: TranslationEditorPage. It only draws; the page's hook keeps the words.
 */
import type { ChangeEvent } from 'react';

import { normaliseTypedText } from '@/lib/romanian-text';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the pairs need. */
export interface ParagraphPairsProps {
  original: { languageCode: string; languageName: string; paragraphs: string[] };
  translation: { languageCode: string; languageName: string; fields: string[] };
  /** How many fields have words in them. */
  translatedCount: number;
  onChange: (index: number, text: string) => void;
}

/** The two column headings; on a phone only the translation's, with the progress. */
function ColumnHeadings({ original, translation, translatedCount }: ParagraphPairsProps) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <div className="grid gap-x-6 gap-y-3 border-b border-border pb-3 md:grid-cols-2">
      <div className="flex flex-col gap-0.5">
        <span className="eyebrow-type text-heading">{t('editor.original')}</span>
        <span lang={original.languageCode} className="text-[15px] font-bold text-heading">
          {original.languageName}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="eyebrow-type text-heading">{t('editor.translation')}</span>
        <span role="status" className="text-[15px] font-bold text-heading">
          {t('editor.progress', {
            language: translation.languageName,
            count: translatedCount,
            total: translation.fields.length,
          })}
        </span>
      </div>
    </div>
  );
}

/** What one row needs. */
interface PairRowProps {
  number: number;
  original: { languageCode: string; text: string };
  translation: { languageCode: string; text: string };
  onChange: (text: string) => void;
}

/** One paragraph and its field. */
function PairRow({ number, original, translation, onChange }: PairRowProps) {
  const { t } = useStoryLanguagesTranslation();
  const label = t('editor.translateParagraph', { number });

  /** Corrects Romanian letters as they are typed, then keeps the words. */
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    normaliseTypedText(event.target);
    onChange(event.target.value);
  }

  return (
    <li className="grid gap-x-6 gap-y-3 border-t border-border py-4 first:border-t-0 md:grid-cols-2">
      <p
        lang={original.languageCode}
        className="m-0 font-story text-[17px] leading-relaxed break-words whitespace-pre-line text-body"
      >
        <span className="mr-1.5 font-body text-[13px] text-meta">
          <span className="sr-only">{t('editor.paragraphNumber', { number })}</span>
          <span aria-hidden="true">{number} ·</span>
        </span>
        {original.text}
      </p>
      <textarea
        aria-label={label}
        placeholder={label}
        lang={translation.languageCode}
        rows={3}
        value={translation.text}
        className="field-box min-h-24 w-full resize-y px-4 py-3 font-story text-[17px] leading-relaxed"
        onChange={handleChange}
      />
    </li>
  );
}

/**
 * Renders the headings and the rows.
 *
 * @returns the side-by-side paragraphs
 */
export function ParagraphPairs(props: ParagraphPairsProps) {
  const { original, translation, onChange } = props;
  return (
    <div className="flex flex-col">
      <ColumnHeadings {...props} />
      <ol className="m-0 flex list-none flex-col p-0">
        {original.paragraphs.map((text, index) => (
          <PairRow
            // The original's paragraphs never change while the page is open, so the position is
            // a stable key.
            key={index}
            number={index + 1}
            original={{ languageCode: original.languageCode, text }}
            translation={{
              languageCode: translation.languageCode,
              text: translation.fields[index] ?? '',
            }}
            onChange={(typed) => onChange(index, typed)}
          />
        ))}
      </ol>
    </div>
  );
}
