/**
 * TranslationChapterList: the original's chapters with where each translation stands (bundle
 * TRANSLATE-1c; Robert, 16 Nov 2026).
 *
 * What it shows, per chapter: its number and the original's title, a pill (Not started, Draft,
 * Scheduled, Published), "Original not published" when the original is still a draft (the
 * translation can be written, but not published yet), and one button: "Translate" the first
 * time, "Continue" after that. The button opens the side-by-side editor.
 * Who shows it: TranslateChaptersPage. What it calls: hooks/useTranslationChapters.ts.
 * Plain rows with a 1 px line between them (DoD design rules).
 */
import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { TranslationChapter } from '../api/storyLanguages';
import type { useTranslationChapters } from '../hooks/useTranslationChapters';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** The pill tone of each status. */
const statusTones = {
  notStarted: 'neutral',
  draft: 'gold',
  scheduled: 'sky',
  published: 'sage',
} as const;

/** What one row needs. */
interface ChapterRowProps {
  chapter: TranslationChapter;
  /** The original's language, for the lang attribute of its title. */
  originalLanguageCode: string;
  isOpening: boolean;
  onOpen: () => void;
}

/** One chapter's row. */
function ChapterRow({ chapter, originalLanguageCode, isOpening, onOpen }: ChapterRowProps) {
  const { t } = useStoryLanguagesTranslation();
  const status = chapter.status ?? 'notStarted';
  const isStarted = chapter.code !== null;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-4 first:border-t-0">
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <span className="text-[13px] font-semibold text-meta">
          {t('chapters.chapterNumber', { number: chapter.number })}
        </span>
        <span lang={originalLanguageCode} className="font-semibold break-words text-heading">
          {chapter.originalTitle === '' ? t('chapters.untitled') : chapter.originalTitle}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InfoPill tone={statusTones[status]}>{t(`chapters.status.${status}`)}</InfoPill>
        {!chapter.isOriginalPublished && (
          <InfoPill tone="neutral">{t('chapters.originalNotPublished')}</InfoPill>
        )}
      </div>
      <Button
        type="button"
        variant={isStarted ? 'secondary' : 'primary'}
        disabled={isOpening}
        aria-label={t(isStarted ? 'chapters.continueLabel' : 'chapters.startLabel', {
          number: chapter.number,
        })}
        onClick={onOpen}
      >
        {isStarted ? t('chapters.continue') : t('chapters.start')}
      </Button>
    </li>
  );
}

/** What the list needs. */
export interface TranslationChapterListProps {
  list: ReturnType<typeof useTranslationChapters>;
  originalLanguageCode: string;
}

/**
 * Renders the card.
 *
 * @returns the chapters, a line when there are none, or nothing while they load
 */
export function TranslationChapterList({
  list,
  originalLanguageCode,
}: TranslationChapterListProps) {
  const { t } = useStoryLanguagesTranslation();
  if (!list.isLoaded) return null;
  if (list.loadFailed || list.chapters === null) {
    return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  }
  return (
    <section
      aria-labelledby="translation-chapters-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="translation-chapters-heading"
        className="m-0 font-heading text-lg font-bold text-heading"
      >
        {t('chapters.listHeading')}
      </h2>
      {list.startFailed && <Notice tone="error">{t('chapters.startFailed')}</Notice>}
      {list.chapters.length === 0 && <p className="m-0 text-body">{t('chapters.empty')}</p>}
      <ol className="m-0 flex list-none flex-col p-0">
        {list.chapters.map((chapter) => (
          <ChapterRow
            key={chapter.originalCode}
            chapter={chapter}
            originalLanguageCode={originalLanguageCode}
            isOpening={list.openingCode === chapter.originalCode}
            onOpen={() => list.open(chapter)}
          />
        ))}
      </ol>
    </section>
  );
}
