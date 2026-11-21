/**
 * ChapterReaderHeader: the top of a chapter (story S1-E4-01a; board 3.5).
 *
 * The simplified design (bundle CALM-5; design handover Step 3; boards New-Reader and
 * New-PhoneReader): the eyebrow "Chapter 14 of 15" (the eyebrow style; "of N" and the last
 * chapter's mark wait for CALM-6), the chapter title as the page's H1 in the story's own type,
 * Literata 600 at 32/38 px (28/34 px on phones), and the meta line "by <pen name> · 9 Oct 2026 ·
 * 3 min read" in 14 px, 32 px above the text. An edited chapter adds "edited <date>" (S1-E3-03, Q10). The pen name
 * links to the writer's profile once profiles exist (S1-E5-05); until then it is plain text.
 * A translated classic in a story with several languages adds "Translated from <language> by
 * <name>" after the author (TRANSLATE-1b; board TrReader).
 * Who uses it: ChapterReaderPage.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { languageNameIn } from '@/lib/language-names';
import { formatLocalShortDate } from '@/lib/local-time';

import type { ReaderChapter } from '../api/chapter';

/** The meta line's parts after "by <name>". */
function metaParts(chapter: ReaderChapter, language: string, t: TFunction<'reading'>) {
  const parts: string[] = [];
  // TRANSLATE-1b: the translator of a classic, named with the language it was translated from.
  const facts = chapter.edition;
  if (facts !== null && !facts.isOriginal && facts.translatorName !== null) {
    parts.push(
      t('editions.translatedFromBy', {
        language: languageNameIn(facts.originalLanguage, language),
        name: facts.translatorName,
      }),
    );
  }
  if (chapter.publishedAt !== null) {
    parts.push(formatLocalShortDate(new Date(chapter.publishedAt), language));
  }
  if (chapter.editedAt !== null) {
    parts.push(
      t('reader.edited', { date: formatLocalShortDate(new Date(chapter.editedAt), language) }),
    );
  }
  parts.push(t('reader.minutes', { count: chapter.minutesToRead }));
  return parts;
}

/**
 * Renders the header.
 *
 * @returns the header with the H1
 */
export function ChapterReaderHeader({ chapter }: { chapter: ReaderChapter }) {
  const { t, i18n } = useTranslation('reading');
  const parts = metaParts(chapter, i18n.language, t);
  return (
    <header className="flex flex-col gap-2 pb-8">
      <Eyebrow>{t('reader.kicker', { number: chapter.number, total: chapter.total })}</Eyebrow>
      <h1
        id="chapter-title"
        lang={chapter.story.languageCode}
        className="m-0 font-story text-[28px] leading-[34px] font-semibold tracking-normal break-words text-heading min-[600px]:text-[32px] min-[600px]:leading-[38px]"
      >
        {chapter.title === '' ? t('reader.untitled') : chapter.title}
      </h1>
      <p className="m-0 text-sm text-meta">
        {t('reader.by')}{' '}
        <span className="font-semibold text-heading">{chapter.story.writer.displayName}</span>
        {parts.map((part) => ` · ${part}`).join('')}
      </p>
    </header>
  );
}
