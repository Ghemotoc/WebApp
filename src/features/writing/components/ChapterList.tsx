/**
 * ChapterList: the story's chapters in reading order on the Chapters page (board D03, user story
 * 5.3; first built as a card in S1-E3-04): the note on how to move them, "Show chapters 1 to 10"
 * for a long story, then one plain row per chapter.
 *
 * Board values: no card and no eyebrow; the note in the meta style; a story with more than 10
 * chapters opens on its newest six, with a text button that shows the earlier ones. The list
 * keeps a heading for screen readers only ("15 published, 1 draft"), which also takes the focus
 * after a delete or an undo, because the row the writer was on has moved.
 * A change that didn't go through shows one plain message above the list.
 * Who uses it: ManageChaptersPage. What it calls: SortableChapterList and lib/chapterListText.ts
 * for the heading.
 */
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { DashboardChapter } from '../api/dashboard';
import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange, ManageProblem } from '../hooks/useManageChapters';
import { chapterSummary } from '../lib/chapterListText';

import { SortableChapterList } from './SortableChapterList';

/** A story longer than this opens on its newest chapters only (board D03: 16 chapters, 6 shown). */
const LONG_STORY = 10;
/** How many of the newest chapters a long story shows at first. */
const NEWEST_SHOWN = 6;

/** What the list needs. */
export interface ChapterListProps {
  slug: string;
  chapters: ManagedChapter[];
  /** The writer dashboard's chapters, for each row's likes; empty while loading. */
  dashboardChapters: DashboardChapter[];
  problem: ManageProblem | null;
  isBusy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onChange: (change: ChapterChange) => void;
  onAskDelete: (chapter: ManagedChapter) => void;
}

/**
 * Renders the list.
 *
 * @returns the section
 */
export function ChapterList({ problem, headingRef, ...listProps }: ChapterListProps) {
  const { t } = useTranslation('writing');
  const [showsEarlier, setShowsEarlier] = useState(false);
  // Step 1: a long story hides its earlier chapters until the writer asks for them.
  const total = listProps.chapters.length;
  const firstShown = !showsEarlier && total > LONG_STORY ? total - NEWEST_SHOWN : 0;
  return (
    <section aria-labelledby="chapter-list-heading" className="flex flex-col gap-2">
      <h2 id="chapter-list-heading" ref={headingRef} tabIndex={-1} className="sr-only">
        {chapterSummary(t, listProps.chapters)}
      </h2>
      <p className="m-0 max-w-none type-meta">{t('manageChapters.note')}</p>
      {problem !== null && (
        <Notice tone={problem === 'failed' ? 'error' : 'warning'}>
          {t(`manageChapters.problems.${problem}`)}
        </Notice>
      )}
      {firstShown > 0 && (
        <Button variant="text" className="self-start" onClick={() => setShowsEarlier(true)}>
          {t('manageChapters.showEarlier', { last: firstShown })}
        </Button>
      )}
      <SortableChapterList {...listProps} firstShown={firstShown} />
    </section>
  );
}
