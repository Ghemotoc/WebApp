/**
 * ChapterReaderHeader: the top of a chapter (story S1-E4-01a; board 3.5).
 *
 * Board values: the eyebrow "Chapter 14 of 15" (the eyebrow style), the chapter title as the page's
 * H1 (Bricolage Grotesque 800, 36 to 64 px), and the meta line "by <pen name> · 9 Oct 2026 ·
 * 3 min read" in 14 px. An edited chapter adds "edited <date>" (S1-E3-03, Q10). The pen name
 * links to the writer's profile once profiles exist (S1-E5-05); until then it is plain text.
 * Who uses it: ChapterReaderPage.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { formatRomaniaShortDate } from '@/lib/romania-time';

import type { ReaderChapter } from '../api/chapter';

/** The meta line's parts after "by <name>". */
function metaParts(chapter: ReaderChapter, language: string, t: TFunction<'reading'>) {
  const parts: string[] = [];
  if (chapter.publishedAt !== null) {
    parts.push(formatRomaniaShortDate(new Date(chapter.publishedAt), language));
  }
  if (chapter.editedAt !== null) {
    parts.push(
      t('reader.edited', { date: formatRomaniaShortDate(new Date(chapter.editedAt), language) }),
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
    <header className="flex flex-col gap-3.5 pb-9 lg:pr-20">
      <Eyebrow>{t('reader.kicker', { number: chapter.number, total: chapter.total })}</Eyebrow>
      <h1
        id="chapter-title"
        lang={chapter.story.languageCode}
        className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words"
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
