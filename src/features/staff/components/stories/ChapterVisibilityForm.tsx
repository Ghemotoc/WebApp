/**
 * ChapterVisibilityForm: hide one chapter, or show it again, with a reason (bundle ADMIN-2, part
 * b1; story S1-E11-08 criteria 2 and 3; board AdminStory 8.11's chapter list).
 *
 * Hiding a chapter leaves the rest of the story as it is; only the writer and staff see the hidden
 * chapter, and the writer gets a statement of reasons (DSA art. 17). Showing it again sends a
 * notification. A chapter a moderation case removed has no button here: the case or an appeal
 * brings it back (S1-E10-07).
 * Who shows it: StaffStoryChapters, under the chapter's line. What it calls: the changer from
 * useChangeStaffStory.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { StaffStoryChapter } from '../../api/staffStories';
import type { StaffStoryChange, StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { completeReason, emptyReason } from '../../lib/staffStorySettingsDiff';

import { StoryChangeFeedback } from './StoryChangeFeedback';
import { StoryChangeReasonFields } from './StoryChangeReasonFields';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface ChapterVisibilityFormProps {
  chapter: StaffStoryChapter;
  changer: StaffStoryChanger;
}

/**
 * Renders the button and, once pressed, the reason and Confirm.
 *
 * @returns the button or the small form
 */
export function ChapterVisibilityForm({ chapter, changer }: ChapterVisibilityFormProps) {
  const { t } = useTranslation('staff');
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(emptyReason);
  const [problem, setProblem] = useState<string | null>(null);
  const wanted = chapter.moderatedState === 'hidden' ? 'shown' : 'hidden';
  const idPrefix = `chapter-${chapter.id}`;

  /** Needs a complete reason, then asks the database. */
  async function confirm(event: FormEvent) {
    event.preventDefault();
    const complete = completeReason(reason);
    if (complete === null) return setProblem(t('stories.change.reasonMissing'));
    setProblem(null);
    await changer
      .change({ kind: 'chapter', chapterId: chapter.id, visibility: wanted, reason: complete })
      .then(() => setIsOpen(false))
      .catch(errorShownByHook);
  }

  const isMine = (last: StaffStoryChange) =>
    last.kind === 'chapter' && last.chapterId === chapter.id;
  if (!isOpen) {
    return (
      <div className="flex w-full flex-col gap-1">
        <div>
          <Button variant="secondary" onClick={() => setIsOpen(true)}>
            {t(`stories.change.chapter.${wanted}`, { number: chapter.number })}
          </Button>
        </div>
        <StoryChangeFeedback changer={changer} isMine={isMine} />
      </div>
    );
  }
  return (
    <form
      noValidate
      onSubmit={(event) => void confirm(event)}
      className="flex w-full flex-col gap-3 pt-2"
    >
      <StoryChangeReasonFields
        idPrefix={idPrefix}
        reason={reason}
        onChange={setReason}
        problem={problem}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant={wanted === 'hidden' ? 'destructive' : 'primary'}
          disabled={changer.isBusy}
        >
          {t(`stories.change.chapter.confirm_${wanted}`, { number: chapter.number })}
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('stories.change.cancel')}
        </Button>
      </div>
      <StoryChangeFeedback changer={changer} isMine={isMine} />
    </form>
  );
}
