/**
 * ChapterPassageForm: "Remove a passage from chapter N" under a published chapter (bundle ADMIN-2,
 * part b2; story S1-E11-08 criteria "remove the exact passage" and "staff can't type in the text";
 * board AdminStory 8.11's chapter list).
 *
 * The chapter's words load only once staff open the form, and only published words: what readers
 * already see, never a draft. The rest is in PassageRemovalFields.
 * Who shows it: StaffStoryChapters, for staff who may change stories. What it calls:
 * useStaffChapterText for the words; the changer from useChangeStaffStory for the removal.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { StaffStoryChapter } from '../../api/staffStories';
import type { StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { useStaffChapterText } from '../../hooks/useStaffChapterText';

import { PassageRemovalFields } from './PassageRemovalFields';

/** What the form needs. */
export interface ChapterPassageFormProps {
  chapter: StaffStoryChapter;
  storyLanguage: string;
  changer: StaffStoryChanger;
}

/**
 * Renders the button and, once pressed, the chapter's words and the form.
 *
 * @returns the button or the section
 */
export function ChapterPassageForm({ chapter, storyLanguage, changer }: ChapterPassageFormProps) {
  const { t } = useTranslation('staff');
  const [isOpen, setIsOpen] = useState(false);
  const loaded = useStaffChapterText(chapter.id, isOpen);
  if (!isOpen) {
    return (
      <div className="w-full">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          {t('stories.passage.open', { number: chapter.number })}
        </Button>
      </div>
    );
  }
  const headingId = `passage-heading-${chapter.id}`;
  return (
    <section aria-labelledby={headingId} className="flex w-full flex-col gap-3 pt-2">
      <h3 id={headingId} className="m-0 font-heading text-[20px] font-bold text-heading">
        {t('stories.passage.heading', { number: chapter.number })}
      </h3>
      {loaded.hasFailed && <Notice tone="error">{t('stories.passage.loadFailed')}</Notice>}
      {loaded.isLoading && !loaded.hasFailed && (
        <p role="status" className="m-0 text-meta">
          {t('stories.passage.loading')}
        </p>
      )}
      {loaded.chapter !== null && (
        <PassageRemovalFields
          chapter={loaded.chapter}
          storyLanguage={storyLanguage}
          changer={changer}
          onCancel={() => setIsOpen(false)}
        />
      )}
    </section>
  );
}
