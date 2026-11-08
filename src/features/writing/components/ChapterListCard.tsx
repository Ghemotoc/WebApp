/**
 * ChapterListCard: the white card on Manage chapters with the summary heading, the hint and
 * the sortable list (story S1-E3-04; board 4.4).
 *
 * Board values: "Chapters" eyebrow, a 28 px heading that counts the chapters ("6 published,
 * 1 draft, 1 scheduled"), the hint "Drag the handle to reorder, or use the up and down
 * arrows.".
 * A change that didn't go through shows one plain message above the list.
 * Who uses it: ManageChaptersPage. What it calls: SortableChapterList and
 * lib/chapterListText.ts for the summary.
 */
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange, ManageProblem } from '../hooks/useManageChapters';
import { chapterSummary } from '../lib/chapterListText';

import { SortableChapterList } from './SortableChapterList';

/** What the card needs. */
export interface ChapterListCardProps {
  slug: string;
  chapters: ManagedChapter[];
  problem: ManageProblem | null;
  isBusy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onChange: (change: ChapterChange) => void;
  onAskDelete: (chapter: ManagedChapter) => void;
}

/**
 * Renders the card.
 *
 * @returns the section
 */
export function ChapterListCard({ problem, headingRef, ...listProps }: ChapterListCardProps) {
  const { t } = useTranslation('writing');
  return (
    <section
      aria-labelledby="chapter-list-heading"
      className="relative flex flex-col gap-2 rounded-card border border-border bg-surface px-[26px] py-6 shadow-card max-sm:px-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="w-fit">
            <Eyebrow>{t('manageChapters.listEyebrow')}</Eyebrow>
          </div>
          <h2
            id="chapter-list-heading"
            ref={headingRef}
            tabIndex={-1}
            className="m-0 font-heading text-[28px] font-bold text-heading"
          >
            {chapterSummary(t, listProps.chapters)}
          </h2>
        </div>
        <p className="m-0 max-w-[460px] text-sm leading-normal text-meta sm:mr-24">
          {t('manageChapters.note')}
        </p>
      </div>
      {problem !== null && (
        <Notice tone={problem === 'failed' ? 'error' : 'warning'}>
          {t(`manageChapters.problems.${problem}`)}
        </Notice>
      )}
      <SortableChapterList {...listProps} />
    </section>
  );
}
