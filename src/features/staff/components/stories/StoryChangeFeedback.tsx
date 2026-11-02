/**
 * StoryChangeFeedback: what happened to the last change staff made to a story (bundle ADMIN-2,
 * part b1; story S1-E11-08): "Saved, and the writer was told" as a status line, or why the server
 * refused it as an alert, in plain words.
 *
 * Who shows it: StaffStorySettingsForm, StaffStoryVisibilityForm and ChapterVisibilityForm.
 * What it reads: the last change from useChangeStaffStory; each form shows only its own.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { StaffStoryChange, StaffStoryChanger } from '../../hooks/useChangeStaffStory';

/** What it needs. */
export interface StoryChangeFeedbackProps {
  changer: StaffStoryChanger;
  /** True when the last change asked for came from this form. */
  isMine: (last: StaffStoryChange) => boolean;
}

/**
 * Renders the line.
 *
 * @returns the status line, the alert, or nothing
 */
export function StoryChangeFeedback({ changer, isMine }: StoryChangeFeedbackProps) {
  const { t } = useTranslation('staff');
  const isThisForm = changer.last !== null && isMine(changer.last);
  if (isThisForm && changer.failure !== null) {
    return <Notice tone="error">{t(`stories.change.failures.${changer.failure}`)}</Notice>;
  }
  return (
    <p role="status" className="m-0 min-h-6 text-sm text-meta">
      {isThisForm && changer.isDone ? t('stories.change.saved') : ''}
    </p>
  );
}
