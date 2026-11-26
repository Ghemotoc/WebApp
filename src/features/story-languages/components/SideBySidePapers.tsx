/**
 * SideBySidePapers: the whole original chapter on the left and the whole translation on the
 * right, each as its own reading paper (CALM-9, board D09 "Translate a chapter"; replaces the
 * paragraph-by-paragraph boxes of TRANSLATE-1c).
 *
 * What it shows: above each paper its name and language on the left and its words on the right
 * ("Original English … 64 words"; board D09, user story 5.9), the original's paragraphs, and on
 * the right one borderless field per paragraph (TranslationField). The translation's paper gets
 * a 2 px main-colour ring while a field has focus. Under the papers: the checkbox "Scroll both
 * sides together" (on by default, hooks/useScrollTogether.ts) and the board's line "Translate
 * in your own words…". The progress, "41 of 64 words so far", sits in the page's header.
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
  /** "Original" or "Translation". */
  heading: string;
  /** The side's language in its own name ("English", "Română"). */
  languageName: string;
  languageCode: string;
  wordCount: number;
  scrollBox: RefObject<HTMLDivElement | null>;
  /** True for the translation: the paper shows the focus ring. */
  isEditable: boolean;
  children: ReactNode;
}

/** One paper: its head, then its own scroll box. */
function Paper(props: PaperProps) {
  const { heading, languageName, languageCode, wordCount, scrollBox, isEditable, children } = props;
  const { t } = useStoryLanguagesTranslation();
  return (
    // Board D09: the side's name and language above its paper, its words on the right.
    <section aria-label={`${heading} ${languageName}`} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 type-label font-semibold text-ink-heading">
          {heading}{' '}
          <span lang={languageCode} className="type-meta font-normal text-ink-muted">
            {languageName}
          </span>
        </h2>
        <span className="type-meta text-ink-muted">
          {t('editor.wordCount', { count: wordCount })}
        </span>
      </div>
      {/* relative: the paragraphs measure their offsetTop from this box (useScrollTogether). */}
      <div
        ref={scrollBox}
        className={cn(
          'relative min-h-[32rem] max-h-[70vh] overflow-y-auto rounded-card border border-border bg-story-paper px-6 pt-4 pb-1',
          // CALM-9, D09: "2 px main-colour ring when focused" on the editable side only.
          isEditable && 'focus-within:ring-2 focus-within:ring-primary',
        )}
      >
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
          heading={t('editor.originalHead')}
          languageName={original.languageName}
          languageCode={original.languageCode}
          wordCount={originalWords}
          scrollBox={leftBox}
          isEditable={false}
        >
          <OriginalText languageCode={original.languageCode} paragraphs={original.paragraphs} />
        </Paper>
        <Paper
          heading={t('editor.translationHead')}
          languageName={translation.languageName}
          languageCode={translation.languageCode}
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
        <p className="m-0 text-ink-muted">{t('editor.tip')}</p>
      </div>
    </div>
  );
}
