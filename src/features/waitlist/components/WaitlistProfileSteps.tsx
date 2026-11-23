/**
 * WaitlistProfileSteps: "Get your profile ready" on the waiting list's holding page as a
 * three-step wizard, every step optional (CALM-9, board H08 Waiting list; the rule for every page:
 * "Long forms are wizards").
 *
 * The steps: 1 What you want to do here (write, read or both), 2 Your avatar, 3 What you like.
 * Each step saves on its own, as before: the answer saves as soon as it changes, the avatar and
 * the likes have their own Save buttons. "Next" and "Skip this step" only move on; nothing is
 * lost by skipping. The last step ends with "Done", which folds every step to its summary and
 * says the profile is ready; Change opens any step again.
 * Who shows it: WaitlistHoldingPage. What it calls: StepWizard and useStepWizard, the three
 * sections (WaitlistInterestPicker, AvatarBuilderSection, LikesSettingsSection) and
 * useAvatarRecipe for the avatar step's summary.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { StepWizard, type WizardStep } from '@/components/ui/StepWizard';
import { useStepWizard } from '@/components/ui/useStepWizard';
import { AvatarBuilderSection } from '@/features/avatars/components/AvatarBuilderSection';
import { useAvatarRecipe } from '@/features/avatars/hooks/useAvatarRecipe';
import { LikesSettingsSection } from '@/features/onboarding/components/LikesSettingsSection';

import type { WaitlistInterest } from '../api/waitlist';

import { WaitlistInterestPicker } from './WaitlistInterestPicker';

/** What the steps need. */
interface WaitlistProfileStepsProps {
  /** The saved "write, read or both" answer. */
  interest: WaitlistInterest;
  /** The person's username, or null while it loads (the avatar is saved against it). */
  handle: string | null;
}

/**
 * The avatar step's one-line summary: whether a drawn avatar is saved or the initials show.
 *
 * @param handle - the person's username, or null while it loads
 * @returns the summary, in the interface language
 */
function useAvatarSummary(handle: string | null): string {
  const { t } = useTranslation('account');
  // The query waits for a username; until then (and with no saved avatar) the initials show.
  const saved = useAvatarRecipe(handle ?? '');
  const hasAvatar = handle !== null && saved.data !== undefined && saved.data !== null;
  return hasAvatar ? t('waitlist.steps.summary.avatarSaved') : t('waitlist.steps.summary.initials');
}

/**
 * The three steps, with their titles, summaries and contents.
 *
 * @param props - the saved answer and the username
 * @returns the steps for StepWizard
 */
function useProfileSteps({ interest, handle }: WaitlistProfileStepsProps): WizardStep[] {
  const { t } = useTranslation('account');
  const avatarSummary = useAvatarSummary(handle);
  return [
    {
      key: 'interest',
      title: t('waitlist.steps.interest'),
      summary: t(`waitlist.interest.${interest}`),
      isOptional: true,
      content: <WaitlistInterestPicker interest={interest} />,
    },
    {
      key: 'avatar',
      title: t('waitlist.steps.avatar'),
      summary: avatarSummary,
      isOptional: true,
      // The builder saves against the username, so it waits until the username has loaded.
      content: handle === null ? null : <AvatarBuilderSection handle={handle} isInsideStep />,
    },
    {
      key: 'likes',
      title: t('waitlist.steps.likes'),
      summary: t('waitlist.steps.summary.likes'),
      isOptional: true,
      content: <LikesSettingsSection isInsideStep />,
    },
  ];
}

/**
 * Renders the wizard and, once "Done" is pressed, the line saying the profile is ready.
 *
 * @param props - the saved answer and the username
 * @returns the profile steps
 */
export function WaitlistProfileSteps(props: WaitlistProfileStepsProps) {
  const { t } = useTranslation('account');
  const steps = useProfileSteps(props);
  const wizard = useStepWizard(steps.length);
  // The last step ends with "Done"; the page has no other button to finish with.
  const doneButton = (
    <div className="flex justify-end border-t border-hairline pt-6">
      <Button type="button" onClick={wizard.finish}>
        {t('waitlist.steps.done')}
      </Button>
    </div>
  );
  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <StepWizard
        label={t('waitlist.steps.label')}
        steps={steps}
        openIndex={wizard.openIndex}
        furthestIndex={wizard.furthestIndex}
        onOpenStep={wizard.openStep}
        onNext={wizard.goToNextStep}
        onSkip={wizard.goToNextStep}
        lastStepActions={doneButton}
      />
      {/* A polite live region, so a screen reader hears that the steps are finished. */}
      <p role="status" className="m-0 text-ink-muted">
        {wizard.isFinished ? t('waitlist.steps.finished') : null}
      </p>
    </div>
  );
}
