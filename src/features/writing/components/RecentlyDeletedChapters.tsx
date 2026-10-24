/**
 * RecentlyDeletedChapters: the story's deleted chapters, each with Undo until it is deleted for
 * good (story S1-E3-04; board 4.4, "Recently deleted").
 *
 * Board values: a panel on the sand background with the autumn-leaf doodle on its top edge
 * (hidden under 1000 px), the heading, the line "Deleted chapters are hidden straight away and
 * deleted for good after 30 days. Until then you can undo.", one white row per chapter
 * ("Deleted 14 Oct · gone for good on 13 November 2026" and an outlined Undo), or "Nothing
 * deleted in the last 30 days.". An undone chapter comes back at the end of the list.
 * Who uses it: ManageChaptersPage. What it calls: onChange → restore_chapter() through
 * useManageChapters; lib/chapterListText.ts for the line.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Doodle } from '@/components/ui/Doodle';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';
import { deletedMeta } from '../lib/chapterListText';

/** What the panel needs. */
export interface RecentlyDeletedChaptersProps {
  chapters: ManagedChapter[];
  isBusy: boolean;
  onChange: (change: ChapterChange) => void;
}

/**
 * Renders the panel.
 *
 * @returns the section, with the rows or the empty line
 */
export function RecentlyDeletedChapters({
  chapters,
  isBusy,
  onChange,
}: RecentlyDeletedChaptersProps) {
  const { t, i18n } = useTranslation('writing');
  return (
    <section
      aria-labelledby="deleted-chapters-heading"
      className="relative flex flex-col gap-2.5 rounded-card bg-panel px-[26px] py-[22px] max-sm:px-4"
    >
      <Doodle
        name="autumn-leaf"
        kind="background"
        hideBelow="wide"
        className="absolute -top-5 right-[150px] w-[52px] -rotate-12"
      />
      <div className="flex flex-col gap-1">
        <h2
          id="deleted-chapters-heading"
          className="m-0 w-fit font-heading text-[22px] font-bold text-heading"
        >
          {t('manageChapters.deleted.heading')}
        </h2>
        <p className="m-0 text-sm text-body">{t('manageChapters.deleted.intro')}</p>
      </div>
      {chapters.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('manageChapters.deleted.empty')}</p>
      )}
      {chapters.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {chapters.map((chapter) => (
            <li
              key={chapter.code}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-semibold break-words text-ink">
                  {chapter.title === '' ? t('manageChapters.untitled') : chapter.title}
                </span>
                <span className="text-sm text-meta">
                  {deletedMeta(t, chapter.deletedAt ?? '', i18n.language)}
                </span>
              </span>
              <Button
                variant="secondary"
                className="border-link text-link"
                disabled={isBusy}
                onClick={() => onChange({ kind: 'restore', code: chapter.code })}
              >
                {t('manageChapters.deleted.undo')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
