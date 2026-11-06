/**
 * LikesStep: step 2, "What do you like?" (story S1-E2-06, criterion 2; board Onboarding 2.5).
 *
 * Who shows it: OnboardingPage. What it calls: useMyOnboarding.save({ kind: 'preferences' }),
 * which stores the picks as explicit choices (save_my_preferences()); they fill Discover's
 * "Picked for you". "Skip" moves on without saving. When this is the last step (only while the
 * age group is unknown: under-18s get the safety step and adults the Teacher badge step,
 * S1-E2-11), the buttons finish setup instead.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MyOnboarding, Preferences } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';

import { LikesFields } from './LikesFields';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the step needs. */
export interface LikesStepProps {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
  /** Goes to the next step, or finishes setup when isLast. */
  onNext: () => void;
  isLast: boolean;
}

/**
 * Renders the step.
 *
 * @returns the intro, the chips and the buttons
 */
export function LikesStep({ onboarding, state, onNext, isLast }: LikesStepProps) {
  const { t } = useTranslation('account');
  const [preferences, setPreferences] = useState<Preferences>({
    readCategories: onboarding.readCategories,
    writeCategories: onboarding.writeCategories,
    topicTagIds: onboarding.topicTagIds,
  });

  /** Saves the picks, then moves on. */
  async function next() {
    await state.save({ kind: 'preferences', preferences });
    onNext();
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-body">{t('onboarding.likes.intro')}</p>
      <LikesFields value={preferences} onChange={setPreferences} />
      {state.saveFailed && <Notice tone="error">{t('onboarding.saveFailed')}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={state.isSaving} onClick={onNext}>
          {t('onboarding.skip')}
        </Button>
        <Button disabled={state.isSaving} onClick={() => void next().catch(errorShownByHook)}>
          {isLast ? t('onboarding.goToDiscover') : t('onboarding.next')}
        </Button>
      </div>
    </div>
  );
}
