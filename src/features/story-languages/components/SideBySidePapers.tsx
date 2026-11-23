/**
 * SideBySidePapers: the whole original chapter on the left and the whole translation on the
 * right, each as its own reading paper (CALM-9, board D09 "Translate a chapter"; replaces the
 * paragraph-by-paragraph boxes of TRANSLATE-1c).
 *
 * What it shows: a head on each paper ("Original English · 64 words", "Translation Română ·
 * 41 words"), the original's paragraphs, and on the right one borderless field per paragraph
 * (TranslationField). The translation's paper gets a 2 px main-colour ring while a field has
 * focus. Under the papers: the checkbox "Scroll both sides together" (on by default,
 * hooks/useScrollTogether.ts) and the progress line "41 of 64 words so far".
 * Who shows it: TranslationEditorPage, from tablet width up; phones get PhoneTranslateNotice.
 * It only draws; the page's hook keeps the words.
 */
import { useRef, useState, type ReactNode, type RefObject } from 'react';

import { cn } from '@/lib/utils';

import { useScrollTogether } from '../hooks/useScrollTogether';
import { countWords } from '../lib/paragraphs';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

import { TranslationField } from './TranslationField';

/** What the papers need. */
export interface SideBySidePapersProps {
  original: { languageCode: string; languageName: string; paragraphs: string[] };
  translation: { languageCode: string; languageName: string; fields: string[] };
  onChange: (index: number, text: string) => void;
}

/** What one paper needs. */
interface PaperProps {
  /** "Original English" or "Translation Română", already put together. */
  heading: string;
  wordCount: number;
  scrollBox: RefObject<HTMLDivElement | null>;
  /** True for the translation: the paper shows the focus ring. */
  isEditable: boolean;
  children: ReactNode;
}

/** One paper: its head, then its own scroll box. */
function Paper({ heading, wordCount, scrollBox, isEditable, children }: PaperProps) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <section
      aria-label={heading}
      className={cn(
        'flex min-w-0 flex-col rounded-card border border-border bg-story-paper',
        // CALM-9, D09: "2 px main-colour ring when focused" on the editable side only.
        isEditable && 'focus-within:ring-2 focus-within:ring-primary',
      )}
    >
      <p className="m-0 border-b border-border px-6 py-3 type-meta text-ink-muted">
        <span className="font-semibold text-ink-heading">{heading}</span>
        {' · '}
        {t('editor.wordCount', { count: wordCount })}
      </p>
      {/* relative: the paragraphs measure their offsetTop from this box (useScrollTogether). */}
      <div ref={scrollBox} className="relative max-h-[70vh] overflow-y-auto px-6 pt-4 pb-1">
        {children}
      </div>
    </section>
  );
}

/** The original's paragraphs, each marked so the other side can line up with it. */
function OriginalText({
  languageCode,
  paragraphs,
}: {
  languageCode: string;
  paragraphs: string[];
}) {
  return paragraphs.map((text, index) => (
    <p
      // The original's paragraphs never change while the page is open, so the place is a key.
      key={index}
      data-paragraph={index}
      lang={languageCode}
      className="m-0 pb-4 font-story type-long leading-relaxed break-words whitespace-pre-line text-ink-muted"
    >
      {text}
    </p>
  ));
}

/**
 * Renders the two papers, the checkbox and the progress line.
 *
 * @returns the side-by-side editor
 */
export function SideBySidePapers({ original, translation, onChange }: SideBySidePapersProps) {
  const { t } = useStoryLanguagesTranslation();
  const leftBox = useRef<HTMLDivElement>(null);
  const rightBox = useRef<HTMLDivElement>(null);
  const [isScrollingTogether, setScrollingTogether] = useState(true);
  useScrollTogether(leftBox, rightBox, isScrollingTogether);

  // The word counts for the heads and the progress line.
  const originalWords = countWords(original.paragraphs.join(' '));
  const translatedWords = countWords(translation.fields.join(' '));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <Paper
          heading={t('editor.originalHead', { language: original.languageName })}
          wordCount={originalWords}
          scrollBox={leftBox}
          isEditable={false}
        >
          <OriginalText languageCode={original.languageCode} paragraphs={original.paragraphs} />
        </Paper>
        <Paper
          heading={t('editor.translationHead', { language: translation.languageName })}
          wordCount={translatedWords}
          scrollBox={rightBox}
          isEditable
        >
          {original.paragraphs.map((_paragraph, index) => (
            <TranslationField
              key={index}
              index={index}
              label={t('editor.translateParagraph', { number: index + 1 })}
              languageCode={translation.languageCode}
              value={translation.fields[index] ?? ''}
              onChange={(typed) => onChange(index, typed)}
            />
          ))}
        </Paper>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 type-meta">
        <label className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink-heading">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={isScrollingTogether}
            onChange={(event) => setScrollingTogether(event.target.checked)}
          />
          {t('editor.scrollTogether')}
        </label>
        <p role="status" className="m-0 font-semibold text-ink-muted">
          {t('editor.progress', { count: translatedWords, total: originalWords })}
        </p>
      </div>
    </div>
  );
}
