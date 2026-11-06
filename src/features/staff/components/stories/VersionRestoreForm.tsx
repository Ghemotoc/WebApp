/**
 * VersionRestoreForm: "Restore what this replaced" on one version in a story's history (bundle
 * ADMIN-2, part b2; story S1-E11-08 criterion "Restore").
 *
 * Restore brings back the values from before that change, as a new version with its own reason:
 * earlier settings, how visible the story or a chapter was, or a removed passage's words in place
 * of the marker. The writer is told, with a statement of reasons when Restore restricts content
 * and a notification otherwise; the server decides which.
 * Who shows it: StoryVersionItem, for staff who may change stories. What it calls: the changer
 * from useChangeStaffStory.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { StaffStoryChange, StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { completeReason, emptyReason } from '../../lib/staffStorySettingsDiff';

import { StoryChangeFeedback } from './StoryChangeFeedback';
import { StoryChangeReasonFields } from './StoryChangeReasonFields';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface VersionRestoreFormProps {
  versionId: string;
  changer: StaffStoryChanger;
}

/**
 * Renders the button and, once pressed, the reason and Restore.
 *
 * @returns the button or the small form
 */
export function VersionRestoreForm({ versionId, changer }: VersionRestoreFormProps) {
  const { t } = useTranslation('staff');
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(emptyReason);
  const [problem, setProblem] = useState<string | null>(null);
  const isMine = (last: StaffStoryChange) =>
    last.kind === 'restore' && last.versionId === versionId;

  /** Needs a complete reason, then asks the database. */
  async function confirm(event: FormEvent) {
    event.preventDefault();
    const complete = completeReason(reason);
    if (complete === null) return setProblem(t('stories.change.reasonMissing'));
    setProblem(null);
    await changer
      .change({ kind: 'restore', versionId, reason: complete })
      .then(() => setIsOpen(false))
      .catch(errorShownByHook);
  }

  if (!isOpen) {
    return (
      <div className="flex flex-col gap-1">
        <div>
          <Button variant="secondary" onClick={() => setIsOpen(true)}>
            {t('stories.history.restore')}
          </Button>
        </div>
        <StoryChangeFeedback changer={changer} isMine={isMine} />
      </div>
    );
  }
  return (
    <form noValidate onSubmit={(event) => void confirm(event)} className="flex flex-col gap-3">
      <p className="m-0 text-body">{t('stories.history.restoreExplain')}</p>
      <StoryChangeReasonFields
        idPrefix={`restore-${versionId}`}
        reason={reason}
        onChange={setReason}
        problem={problem}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={changer.isBusy}>
          {t('stories.history.confirmRestore')}
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('stories.change.cancel')}
        </Button>
      </div>
      <StoryChangeFeedback changer={changer} isMine={isMine} />
    </form>
  );
}
