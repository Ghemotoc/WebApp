/**
 * OnboardingSteps: the two or three setup steps, one at a time (story S1-E2-06; board
 * Onboarding 2.5).
 *
 * Who shows it: OnboardingPage, while setup is due. What it shows:
 * - step 1, NameStep (username if missing, language, county);
 * - step 2, LikesStep (what they like to read and write, topics);
 * - step 3, SafetyStep, only for the 13-to-15 and 16-to-17 age groups (criterion 3). Adults
 *   finish after step 2 until the Teacher badge step arrives (S1-E2-11).
 * Finishing calls finish_onboarding() and goes to Discover. When the step changes, focus moves
 * to the new step's heading, so a keyboard or screen reader user starts at its top (WCAG 2.4.3).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import type { MyOnboarding } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';

import { LikesStep } from './LikesStep';
import { NameStep } from './NameStep';
import { SafetyStep } from './SafetyStep';
import { StepHeader } from './StepHeader';

/** The heading key of each step, in order. */
const stepHeadingKeys = [
  'onboarding.name.heading',
  'onboarding.likes.heading',
  'onboarding.safety.heading',
];

/**
 * Whether the person gets the safety step: under-18s only (criterion 3).
 *
 * @returns true for the 13-to-15 and 16-to-17 age groups
 */
function needsSafetyStep(onboarding: MyOnboarding): boolean {
  return onboarding.ageBand === '13_to_15' || onboarding.ageBand === '16_to_17';
}

/**
 * Moves focus to the step's heading whenever the step changes (not on the first render, where
 * the page's own heading comes first).
 */
function useFocusOnStepChange(step: number, headingId: string) {
  const firstStep = useRef(step);
  useEffect(() => {
    if (step === firstStep.current) return;
    document.getElementById(headingId)?.focus();
  }, [step, headingId]);
}

/**
 * Renders the current step.
 *
 * @param props.onboarding - the person's setup
 * @param props.state - useMyOnboarding's result
 * @returns the step's section
 */
export function OnboardingSteps(props: {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
}) {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const total = needsSafetyStep(props.onboarding) ? 3 : 2;
  const headingId = `onboarding-step-${step}`;
  useFocusOnStepChange(step, headingId);

  /** Marks setup done, then opens Discover with the new "Picked for you" shelf. */
  async function finish() {
    await props.state.save({ kind: 'finish' });
    await navigate('/discover');
  }
  const onFinish = () => void finish().catch(() => undefined);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <StepHeader
        step={step}
        total={total}
        title={t(stepHeadingKeys[step - 1] ?? '')}
        headingId={headingId}
        isForUnder18={step === 3}
      />
      {step === 1 && (
        <NameStep onboarding={props.onboarding} state={props.state} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <LikesStep
          onboarding={props.onboarding}
          state={props.state}
          isLast={total === 2}
          onNext={total === 2 ? onFinish : () => setStep(3)}
        />
      )}
      {step === 3 && (
        <SafetyStep onboarding={props.onboarding} state={props.state} onFinish={onFinish} />
      )}
    </section>
  );
}
