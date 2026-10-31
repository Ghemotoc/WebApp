/**
 * WritingChapterList: the story's chapters on the left of the writing view (stories S1-E17-23:
 * "the chapter list on the left, the chapter on the right"; S1-E17-26: each chapter's progress
 * shows in the chapter list).
 *
 * Each chapter is a link to its editor, the open one marked aria-current; a chapter with a target
 * shows its words against it as text and as a bar. The caller adds the new-chapter button
 * underneath (S1-E17-24: a planned chapter is an ordinary draft chapter). Hidden in focus mode.
 * Who uses it: ChapterEditorPage (src/features/writing). What it calls: useChapterProgress.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { ChapterProgress } from '../api/chapterPlans';
import { useChapterProgress } from '../hooks/useChapterProgress';
import { percentOfTarget } from '../lib/planProgress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the list needs. */
export interface WritingChapterListProps {
  slug: string;
  openChapterCode: string;
  /** The new-chapter button, from the writing feature. */
  footer: ReactNode;
}

/** One chapter's line: its name, its words against its target and the bar. */
function ChapterLine({
  slug,
  chapter,
  isOpen,
}: {
  slug: string;
  chapter: ChapterProgress;
  isOpen: boolean;
}) {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  const name = chapter.title === '' ? t('chapterPlan.untitled') : chapter.title;
  return (
    <li>
      <Link
        to={`/write/s/${slug}/c/${chapter.code}`}
        aria-current={isOpen ? 'page' : undefined}
        className={cn(
          'flex min-h-11 flex-col gap-1 rounded-xl px-2 py-2 text-heading no-underline hover:bg-tint',
          isOpen && 'bg-tint',
        )}
      >
        <span className={cn('break-words', isOpen && 'font-semibold')}>
          {t(`chapterPlan.listKinds.${chapter.kind}`, { number: chapter.position })} {name}
        </span>
        {chapter.wordTarget !== null && (
          <>
            <span className="text-xs text-meta">
              {t('chapterPlan.wordsOfTarget', {
                words: numbers.format(chapter.wordCount),
                target: numbers.format(chapter.wordTarget),
              })}
            </span>
            <progress
              className="tmc-atlas-progress h-1.5 w-full"
              max={100}
              value={percentOfTarget(chapter.wordCount, chapter.wordTarget)}
              aria-hidden="true"
            />
          </>
        )}
      </Link>
    </li>
  );
}

/**
 * Renders the list.
 *
 * @returns the labelled navigation with every chapter and the footer
 */
export function WritingChapterList({ slug, openChapterCode, footer }: WritingChapterListProps) {
  const { t } = useAtlasTranslation();
  const { chapters } = useChapterProgress(slug);
  return (
    <nav
      aria-label={t('chapterPlan.listLabel')}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-4 py-5 shadow-card"
    >
      <h2 className="m-0 px-2 font-heading text-lg font-bold text-heading">
        {t('chapterPlan.listHeading')}
      </h2>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {(chapters ?? []).map((chapter) => (
          <ChapterLine
            key={chapter.code}
            slug={slug}
            chapter={chapter}
            isOpen={chapter.code === openChapterCode}
          />
        ))}
      </ol>
      <div className="px-2">{footer}</div>
    </nav>
  );
}
