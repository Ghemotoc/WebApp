/**
 * TeacherStep: onboarding step 3 for adults, "Are you a teacher?" (story S1-E2-11, criterion 1;
 * board Onboarding 2.5, step-3-teacher).
 *
 * Who shows it: OnboardingSteps, for the 18-and-over age group. What it shows: the intro,
 * TeacherBadgePanel (the status and the form), then "Not a teacher?
 * Skip this" and "Go to Discover", which both finish setup. Skipping stores nothing; the badge
 * can be asked for later in Settings.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useMyTeacherCheck } from '../hooks/useMyTeacherCheck';

import { TeacherBadgePanel } from './TeacherBadgePanel';

/** What the step needs. */
export interface TeacherStepProps {
  /** Finishes setup and opens Discover. */
  onFinish: () => void;
  isFinishing: boolean;
}

/**
 * Renders the step.
 *
 * @returns the intro, the form and the two buttons
 */
export function TeacherStep({ onFinish, isFinishing }: TeacherStepProps) {
  const { t } = useTranslation('account');
  const state = useMyTeacherCheck();
  const { teacherCheck } = state;
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-[680px] text-body">{t('teacherBadge.intro')}</p>
      {state.loadFailed && <Notice tone="error">{t('onboarding.loadFailed')}</Notice>}
      {teacherCheck != null && (
        <TeacherBadgePanel idPrefix="onboarding" teacherCheck={teacherCheck} state={state} />
      )}
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-border pt-5">
        <Button variant="secondary" disabled={isFinishing} onClick={onFinish}>
          {t('teacherBadge.skip')}
        </Button>
        <Button disabled={isFinishing} onClick={onFinish}>
          {t('teacherBadge.goToDiscover')}
        </Button>
      </div>
    </div>
  );
}
