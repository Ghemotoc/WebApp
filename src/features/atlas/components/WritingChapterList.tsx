/**
 * WritingChapterList: the story's chapters on the left of the writing view (stories S1-E17-23:
 * "the chapter list on the left, the chapter on the right"; S1-E17-26: each chapter's progress
 * shows in the chapter list; board D05, user story 5.5).
 *
 * As board D05 draws it: "Chapters" in the label type, then one row a chapter, "16. Epilogue:
 * Spring" over its layout and state ("Play · Draft", "Prose · Published"; LAYOUTS-1, board D14), the open one tinted and marked aria-current,
 * each row a link to its editor. A chapter with a target adds its words against it to the state
 * line ("Draft · 240 of 1,500 words", S1-E17-26). The caller adds the way out underneath
 * ("Manage chapters"). No card around it: the list sits on the page. Hidden in focus mode and
 * below 1024 px.
 * Who uses it: ChapterEditorPage (src/features/writing). What it calls: useChapterProgress.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { ChapterProgress } from '../api/chapterPlans';
import { useChapterProgress } from '../hooks/useChapterProgress';
import { chapterNumbers } from '../lib/boardColumns';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the list needs. */
export interface WritingChapterListProps {
  slug: string;
  openChapterCode: string;
  /** The way out under the list ("Manage chapters"), from the writing feature. */
  footer: ReactNode;
}

/** One chapter's line: its name, its words against its target and the bar. */
function ChapterLine({
  slug,
  chapter,
  number,
  isOpen,
}: {
  slug: string;
  chapter: ChapterProgress;
  /** Its number among the story's chapters of the type "chapter" (lib/boardColumns.ts). */
  number: number | undefined;
  isOpen: boolean;
}) {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  const name = chapter.title === '' ? t('chapterPlan.untitled') : chapter.title;
  // The state line: the chapter's layout and state, then its words against its target. Each
  // part is its own span, so the state reads on its own ("Published") as it did before LAYOUTS-1.
  const layoutWord = t(`chapterPlan.layouts.${chapter.layout}`, { defaultValue: chapter.layout });
  const status = t(`chapterPlan.chapterStates.${chapter.status}`, { defaultValue: chapter.status });
  const wordsLine =
    chapter.wordTarget === null
      ? null
      : t('chapterPlan.wordsOfTarget', {
          words: numbers.format(chapter.wordCount),
          target: numbers.format(chapter.wordTarget),
        });
  return (
    <li>
      <Link
        to={`/write/s/${slug}/c/${chapter.code}`}
        aria-current={isOpen ? 'page' : undefined}
        className={cn(
          'flex min-h-11 flex-col rounded-field px-3 py-2 type-label text-ink no-underline hover:bg-tint',
          isOpen && 'bg-tint font-semibold text-ink-heading',
        )}
      >
        <span className="break-words">
          {t(`chapterPlan.listKinds.${chapter.kind}`, { number: number ?? chapter.position })}{' '}
          {name}
        </span>
        <span className="type-meta font-normal text-ink-muted">
          <span>{layoutWord}</span> · <span>{status}</span>
          {wordsLine !== null && <> · {wordsLine}</>}
        </span>
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
  // Only chapters of the type "chapter" are numbered, as on the storyline board (S1-E17-19).
  const numbers = chapterNumbers(chapters ?? []);
  return (
    <nav aria-label={t('chapterPlan.listLabel')} className="flex min-w-0 flex-col">
      <h2 className="m-0 mb-2 type-label font-semibold text-ink-muted">
        {t('chapterPlan.listHeading')}
      </h2>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {(chapters ?? []).map((chapter) => (
          <ChapterLine
            key={chapter.code}
            slug={slug}
            chapter={chapter}
            number={numbers.get(chapter.code)}
            isOpen={chapter.code === openChapterCode}
          />
        ))}
      </ol>
      <div className="mt-2">{footer}</div>
    </nav>
  );
}
