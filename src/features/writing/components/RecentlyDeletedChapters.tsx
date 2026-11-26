/**
 * RecentlyDeletedChapters: the story's deleted chapters, each with Restore until it is deleted
 * for good (story S1-E3-04; board D03, user story 5.3, "Recently deleted").
 *
 * Board values: no panel; the heading, the line "Deleted chapters stay here for 30 days, then
 * they are gone for good.", then one plain row per chapter under a fine line: the number it had
 * and its title ("16. Epilogue: Autumn"), a meta line ("Deleted 14 Oct · 27 days left") and a
 * quiet Restore. With nothing deleted it says so. A restored chapter comes back at the end of
 * the list.
 * Who uses it: ManageChaptersPage. What it calls: onChange → restore_chapter() through
 * useManageChapters; lib/chapterListText.ts for the line.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { MetaLine } from '@/components/ui/MetaLine';

import type { ManagedChapter } from '../api/manageChapters';
import type { ChapterChange } from '../hooks/useManageChapters';
import { deletedFacts } from '../lib/chapterListText';

/** What the section needs. */
export interface RecentlyDeletedChaptersProps {
  chapters: ManagedChapter[];
  isBusy: boolean;
  onChange: (change: ChapterChange) => void;
}

/** One deleted chapter: its old number and title, the meta line and Restore. */
function DeletedRow({
  chapter,
  isBusy,
  onChange,
}: { chapter: ManagedChapter } & Omit<RecentlyDeletedChaptersProps, 'chapters'>) {
  const { t, i18n } = useTranslation('writing');
  const title = chapter.title === '' ? t('manageChapters.untitled') : chapter.title;
  const facts = deletedFacts(t, chapter.deletedAt ?? '', {
    language: i18n.language,
    now: new Date(),
  });
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline py-3">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="type-label font-semibold break-words text-ink-heading">
          {`${chapter.position}. ${title}`}
        </span>
        <MetaLine facts={facts} />
      </span>
      <Button
        variant="secondary"
        disabled={isBusy}
        aria-label={t('manageChapters.deleted.restoreLabel', { title })}
        onClick={() => onChange({ kind: 'restore', code: chapter.code })}
      >
        {t('manageChapters.deleted.undo')}
      </Button>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @returns the section, with the rows or the empty line
 */
export function RecentlyDeletedChapters({
  chapters,
  isBusy,
  onChange,
}: RecentlyDeletedChaptersProps) {
  const { t } = useTranslation('writing');
  return (
    <section aria-labelledby="deleted-chapters-heading" className="flex flex-col gap-2">
      <h2
        id="deleted-chapters-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('manageChapters.deleted.heading')}
      </h2>
      <p className="m-0 type-meta">{t('manageChapters.deleted.intro')}</p>
      {chapters.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('manageChapters.deleted.empty')}</p>
      )}
      {chapters.length > 0 && (
        <ul className="m-0 mt-2 list-none p-0">
          {chapters.map((chapter) => (
            <DeletedRow key={chapter.code} chapter={chapter} isBusy={isBusy} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}
