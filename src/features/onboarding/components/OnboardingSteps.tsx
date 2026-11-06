/**
 * OnboardingSteps: the two or three setup steps, one at a time (story S1-E2-06; board
 * Onboarding 2.5).
 *
 * Who shows it: OnboardingPage, while setup is due. What it shows:
 * - step 1, NameStep (username if missing, language, county);
 * - step 2, LikesStep (what they like to read and write, topics);
 * - step 3, SafetyStep for the 13-to-15 and 16-to-17 age groups (criterion 3), or TeacherStep,
 *   "Are you a teacher?", for adults (S1-E2-11; optional, and skipping it stores nothing).
 * Finishing calls finish_onboarding() and goes to Discover. When the step changes, focus moves
 * to the new step's heading, so a keyboard or screen reader user starts at its top (WCAG 2.4.3).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { TeacherStep } from '@/features/teacher-badge/components/TeacherStep';

import type { MyOnboarding } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';

import { LikesStep } from './LikesStep';
import { NameStep } from './NameStep';
import { SafetyStep } from './SafetyStep';
import { StepHeader } from './StepHeader';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** Which step 3 the person gets, by age group, or none. */
type StepThree = 'safety' | 'teacher' | null;

/** The heading key of steps 1 and 2, then of each kind of step 3. */
const stepHeadingKeys = ['onboarding.name.heading', 'onboarding.likes.heading'];
const stepThreeHeadingKeys = {
  safety: 'onboarding.safety.heading',
  teacher: 'teacherBadge.heading',
};

/**
 * Which step 3 the person gets: the safety step for under-18s (S1-E2-06 criterion 3), the
 * Teacher badge step for adults (S1-E2-11 criterion 1), none while the age group is unknown.
 *
 * @returns 'safety', 'teacher' or null
 */
function stepThreeFor(onboarding: MyOnboarding): StepThree {
  if (onboarding.ageBand === '13_to_15' || onboarding.ageBand === '16_to_17') return 'safety';
  return onboarding.ageBand === '18_plus' ? 'teacher' : null;
}

/**
 * The heading key of a step.
 *
 * @returns the key
 */
function headingKeyFor(step: number, stepThree: StepThree): string {
  if (step === 3 && stepThree !== null) return stepThreeHeadingKeys[stepThree];
  return stepHeadingKeys[step - 1] ?? '';
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
  const stepThree = stepThreeFor(props.onboarding);
  const total = stepThree === null ? 2 : 3;
  const headingId = `onboarding-step-${step}`;
  useFocusOnStepChange(step, headingId);

  /** Marks setup done, then opens Discover with the new "Picked for you" shelf. */
  async function finish() {
    await props.state.save({ kind: 'finish' });
    await navigate('/discover');
  }
  const onFinish = () => void finish().catch(errorShownByHook);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <StepHeader
        step={step}
        total={total}
        title={t(headingKeyFor(step, stepThree))}
        headingId={headingId}
        stepThree={step === 3 ? stepThree : null}
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
      {step === 3 && stepThree === 'safety' && (
        <SafetyStep onboarding={props.onboarding} state={props.state} onFinish={onFinish} />
      )}
      {step === 3 && stepThree === 'teacher' && (
        <TeacherStep onFinish={onFinish} isFinishing={props.state.isSaving} />
      )}
    </section>
  );
}
